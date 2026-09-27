// Isolated PostgreSQL test; never connects to the live server.
// npm install --prefix tmp/calendar-db-check --no-save --ignore-scripts @electric-sql/pglite
// node scripts/check-calendar-migration.cjs
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { PGlite } = require(path.resolve('tmp/calendar-db-check/node_modules/@electric-sql/pglite'));
(async () => {
    const db = new PGlite();
    try {
        await db.exec(`
            create role anon; create role authenticated; create role service_role;
            create schema auth; create table auth.users(id uuid primary key);
            create function auth.uid() returns uuid language sql stable as $$
              select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
            $$;
            grant usage on schema auth to public;
        `);
        await db.exec(fs.readFileSync('docs/database/supabase-user-roles.sql', 'utf8'));
        await db.exec(fs.readFileSync('docs/database/supabase-price-configs.sql', 'utf8'));
        await db.exec(`
            insert into auth.users values ('00000000-0000-0000-0000-000000000001'), ('00000000-0000-0000-0000-000000000002');
            insert into public.user_roles(user_id,role) values ('00000000-0000-0000-0000-000000000001','admin'), ('00000000-0000-0000-0000-000000000002','staff');
            select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
            set role authenticated;
            select public.save_price_config('small-print','{"existing":true}'::jsonb,'1.0.0');
            reset role;
        `);
        const before = await db.query(
            "select to_jsonb(p) as row from public.price_configs p where module='small-print'"
        );
        const migration = fs.readFileSync('docs/database/migration-calendar-module.sql', 'utf8');
        await db.exec(migration);
        await db.exec(migration);
        await db.exec('set role authenticated');
        const save = (value, version) =>
            db.query("select public.save_calendar_price_config($1::jsonb,'1.0.0',$2) as result", [
                JSON.stringify(value),
                version,
            ]);
        assert.equal((await save({ price: 100 }, 0)).rows[0].result.new_version, 1);
        assert.equal((await save({ price: 100 }, 0)).rows[0].result.new_version, 1);
        await assert.rejects(save({ price: 200 }, 0), /calendar_version_conflict/);
        assert.equal((await save({ price: 200 }, 1)).rows[0].result.new_version, 2);
        const counts = await db.query(
            "select (select count(*) from public.price_config_versions where module='calendar')::int as versions, (select count(*) from public.price_change_logs where module='calendar')::int as logs"
        );
        assert.deepEqual(counts.rows[0], { versions: 2, logs: 2 });
        const after = await db.query(
            "select to_jsonb(p) as row from public.price_configs p where module='small-print'"
        );
        assert.deepEqual(after.rows, before.rows);
        await db.exec(
            "select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false)"
        );
        await assert.rejects(save({ price: 300 }, 2), /forbidden/);
        await db.exec('reset role; set role anon;');
        await assert.rejects(save({ price: 300 }, 2), /permission denied/);
        await db.exec(
            "reset role; select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false); set role authenticated;"
        );
        await assert.rejects(
            db.query("select public.save_price_config('invalid-module','{}'::jsonb,'1.0.0')"),
            /invalid module/
        );
        assert.equal(
            (
                await db.query(
                    "select public.save_price_config('small-print','{\"existing\":true}'::jsonb,'1.0.0') as result"
                )
            ).rows[0].result.new_version,
            2
        );
        console.log(
            'PASS: migration twice; admin create/update; identical retry; stale version rejected; audit counts; staff/anon denied; old module unchanged and still saves.'
        );
    } finally {
        await db.close();
    }
})().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
