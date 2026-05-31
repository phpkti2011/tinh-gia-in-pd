-- P2-05.1: Supabase price config database schema (3 tables + RLS)
--
-- 3 bang:
--   1. price_configs        — current config cho 4 module (1 row / module).
--   2. price_config_versions — snapshot lich su moi lan luu (1 row / save).
--   3. price_change_logs    — audit log moi thao tac admin (1 row / action).
--
-- Cach chay: copy toan bo file -> paste vao Supabase Dashboard -> SQL Editor -> Run.
-- Idempotent: chay lai nhieu lan khong pha data.
--
-- Phu thuoc:
--   - Da chay docs/database/supabase-user-roles.sql (P2-02) truoc — file nay
--     dung function public.touch_updated_at() va bang user_roles cua P2-02.
--
-- KHONG seed bang gia thuc vao file nay. Bang gia se duoc admin save tu UI
-- (P2-05.4) hoac bootstrap qua script rieng (P2-05.2/03). Lay defaultConfig
-- tu src/modules/<module>/config/defaultConfig.js.

-- ============================================================================
-- 0. Helper function: is_admin() — check current auth user co role admin
--    Stable + security definer de RLS policy dung duoc tu auth.uid().
-- ============================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select exists (
        select 1 from public.user_roles
        where user_id = auth.uid()
          and role = 'admin'
    );
$$;

comment on function public.is_admin() is
    'Tra true neu auth.uid() hien tai co row trong user_roles voi role = admin. Dung trong RLS policy.';

-- ============================================================================
-- 1. price_configs — current config (1 row / module)
-- ============================================================================
create table if not exists public.price_configs (
    id              uuid        primary key default gen_random_uuid(),
    module          text        unique not null
                                check (module in ('decal','small-print','large-print','uvdtf')),
    current_version integer     not null default 1 check (current_version > 0),
    schema_version  text,
    data            jsonb       not null,
    updated_by      uuid        references auth.users(id) on delete set null,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

comment on table public.price_configs is
    'Current price config cho moi module. 1 row / module (unique constraint tren cot module).';
comment on column public.price_configs.module is
    'Module key: decal | small-print | large-print | uvdtf.';
comment on column public.price_configs.current_version is
    'Tro toi version moi nhat trong price_config_versions.';
comment on column public.price_configs.schema_version is
    'Schema version cua data jsonb (vd: "1.0.0") — phai match XXX_CONFIG_SCHEMA_VERSION trong src/modules/<module>/config/version.js.';
comment on column public.price_configs.data is
    'Toan bo config (cost_tiers, customer_tiers, FINISHING_PRICES, …). Khong index — JSON path query khi can.';
comment on column public.price_configs.updated_by is
    'auth.users.id cua admin lan luu cuoi. set null khi user bi delete.';

-- Trigger auto-update updated_at (reuse function tu P2-02)
drop trigger if exists trg_price_configs_touch on public.price_configs;
create trigger trg_price_configs_touch
    before update on public.price_configs
    for each row
    execute function public.touch_updated_at();

-- ============================================================================
-- 2. price_config_versions — snapshot lich su (1 row / save admin)
-- ============================================================================
create table if not exists public.price_config_versions (
    id             uuid        primary key default gen_random_uuid(),
    module         text        not null
                               check (module in ('decal','small-print','large-print','uvdtf')),
    version        integer     not null check (version > 0),
    schema_version text,
    data           jsonb       not null,
    note           text,
    created_by     uuid        references auth.users(id) on delete set null,
    created_at     timestamptz not null default now(),
    unique (module, version)
);

comment on table public.price_config_versions is
    'Snapshot config moi lan admin save. Append-only — KHONG cho update/delete tu frontend (rollback bang cach INSERT bang version cu).';
comment on column public.price_config_versions.version is
    'So thu tu monotonic per module. Tang theo moi save (price_configs.current_version + 1).';
comment on column public.price_config_versions.note is
    'Ghi chu cua admin (vd: "tang gia decal nhua 5%", "rollback ve v3").';

-- Index ho tro query history sorted theo time
create index if not exists idx_price_config_versions_module_created
    on public.price_config_versions (module, created_at desc);

-- ============================================================================
-- 3. price_change_logs — audit log (action history)
-- ============================================================================
create table if not exists public.price_change_logs (
    id          uuid        primary key default gen_random_uuid(),
    module      text        not null
                            check (module in ('decal','small-print','large-print','uvdtf')),
    action      text        not null
                            check (action in ('create','update','rollback')),
    old_version integer,
    new_version integer,
    note        text,
    changed_by  uuid        references auth.users(id) on delete set null,
    created_at  timestamptz not null default now()
);

comment on table public.price_change_logs is
    'Audit log moi thao tac admin tren price_configs. Append-only.';
comment on column public.price_change_logs.action is
    'create | update | rollback. create chi xay ra 1 lan / module (bootstrap).';
comment on column public.price_change_logs.old_version is
    'Version truoc thao tac. null neu action = create.';
comment on column public.price_change_logs.new_version is
    'Version sau thao tac. Null khi xoa (chua co use case).';

create index if not exists idx_price_change_logs_module_created
    on public.price_change_logs (module, created_at desc);
create index if not exists idx_price_change_logs_changed_by
    on public.price_change_logs (changed_by, created_at desc);

-- ============================================================================
-- 4. Enable RLS
-- ============================================================================
alter table public.price_configs         enable row level security;
alter table public.price_config_versions enable row level security;
alter table public.price_change_logs     enable row level security;

-- ============================================================================
-- 5. RLS Policies — price_configs
--    SELECT: anon + authenticated → cho public calculator hoat dong.
--    INSERT/UPDATE: admin only.
--    DELETE: KHONG cho (khong co policy = chan).
-- ============================================================================

drop policy if exists "price_configs_public_read" on public.price_configs;
create policy "price_configs_public_read"
    on public.price_configs
    for select
    to anon, authenticated
    using (true);

drop policy if exists "price_configs_admin_insert" on public.price_configs;
create policy "price_configs_admin_insert"
    on public.price_configs
    for insert
    to authenticated
    with check (public.is_admin());

drop policy if exists "price_configs_admin_update" on public.price_configs;
create policy "price_configs_admin_update"
    on public.price_configs
    for update
    to authenticated
    using (public.is_admin())
    with check (public.is_admin());

-- KHONG co policy DELETE → mac dinh sau enable RLS la chan tat ca.

-- ============================================================================
-- 6. RLS Policies — price_config_versions
--    SELECT: admin only (history la noi bo, khong public).
--    INSERT: admin only.
--    UPDATE/DELETE: KHONG cho (append-only history).
-- ============================================================================

drop policy if exists "price_config_versions_admin_read" on public.price_config_versions;
create policy "price_config_versions_admin_read"
    on public.price_config_versions
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists "price_config_versions_admin_insert" on public.price_config_versions;
create policy "price_config_versions_admin_insert"
    on public.price_config_versions
    for insert
    to authenticated
    with check (public.is_admin());

-- KHONG co policy UPDATE/DELETE → chan tu frontend. Service Role can sua thi
-- vao Dashboard truc tiep.

-- ============================================================================
-- 7. RLS Policies — price_change_logs
--    SELECT: admin only (audit log noi bo).
--    INSERT: admin only.
--    UPDATE/DELETE: KHONG cho (audit log append-only).
-- ============================================================================

drop policy if exists "price_change_logs_admin_read" on public.price_change_logs;
create policy "price_change_logs_admin_read"
    on public.price_change_logs
    for select
    to authenticated
    using (public.is_admin());

drop policy if exists "price_change_logs_admin_insert" on public.price_change_logs;
create policy "price_change_logs_admin_insert"
    on public.price_change_logs
    for insert
    to authenticated
    with check (public.is_admin());

-- KHONG co policy UPDATE/DELETE.

-- ============================================================================
-- 7bis. RPC function save_price_config(p_module, p_data, p_schema_version, p_note)
--       Transactional save: insert version + upsert config + insert log.
--       Goi tu frontend qua supabase.rpc('save_price_config', {...}).
--       Added in P2-05.2.
-- ============================================================================

create or replace function public.save_price_config(
    p_module         text,
    p_data           jsonb,
    p_schema_version text,
    p_note           text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
    v_current_version integer;
    v_new_version     integer;
    v_action          text;
    v_user_id         uuid;
begin
    -- 1. Auth check: chi admin (re-use is_admin() helper)
    if not public.is_admin() then
        raise exception 'forbidden: admin role required to save price config'
            using errcode = '42501';  -- insufficient_privilege
    end if;

    v_user_id := auth.uid();

    -- 2. Validate module enum (CHECK constraint cua bang cung enforce, day la safety net)
    if p_module not in ('decal','small-print','large-print','uvdtf') then
        raise exception 'invalid module: %', p_module
            using errcode = '22023';  -- invalid_parameter_value
    end if;

    -- 3. Lookup current version (null neu chua co)
    select current_version into v_current_version
    from public.price_configs
    where module = p_module
    for update;  -- lock row de tranh race condition multi admin

    if v_current_version is null then
        v_new_version := 1;
        v_action      := 'create';
    else
        v_new_version := v_current_version + 1;
        v_action      := 'update';
    end if;

    -- 4. Insert version snapshot (UNIQUE(module, version) chong duplicate)
    insert into public.price_config_versions (
        module, version, schema_version, data, note, created_by
    ) values (
        p_module, v_new_version, p_schema_version, p_data, p_note, v_user_id
    );

    -- 5. Upsert current config (PK = module via UNIQUE)
    insert into public.price_configs (
        module, current_version, schema_version, data, updated_by
    ) values (
        p_module, v_new_version, p_schema_version, p_data, v_user_id
    )
    on conflict (module) do update set
        current_version = excluded.current_version,
        schema_version  = excluded.schema_version,
        data            = excluded.data,
        updated_by      = excluded.updated_by;
        -- updated_at auto-set boi trigger trg_price_configs_touch

    -- 6. Audit log
    insert into public.price_change_logs (
        module, action, old_version, new_version, note, changed_by
    ) values (
        p_module, v_action, v_current_version, v_new_version, p_note, v_user_id
    );

    return jsonb_build_object(
        'ok',          true,
        'module',      p_module,
        'new_version', v_new_version,
        'action',      v_action
    );
end;
$$;

comment on function public.save_price_config(text, jsonb, text, text) is
    'Transactional save price config: insert version snapshot + upsert current + audit log. Security definer + is_admin() check de bypass RLS an toan.';

-- Grant execute: chi authenticated (admin check trong function body)
revoke all on function public.save_price_config(text, jsonb, text, text) from public;
grant execute on function public.save_price_config(text, jsonb, text, text) to authenticated;

-- ============================================================================
-- 8. Verify (chay sau khi setup xong)
-- ============================================================================
-- select count(*) from public.price_configs;          -- expect: 0 (chua seed)
-- select count(*) from public.price_config_versions;  -- expect: 0
-- select count(*) from public.price_change_logs;      -- expect: 0
-- select public.is_admin();                           -- expect: true neu login admin
--
-- Test RLS:
--   - Login user khong phai admin → INSERT price_configs phai bi tu choi.
--   - Anon (logout) → SELECT price_configs van OK (de calculator chay).
--   - Anon → SELECT price_config_versions / price_change_logs phai bi tu choi.
--
-- Test RPC save_price_config (login admin):
--   select public.save_price_config(
--       'decal'::text,
--       '{"test": 1}'::jsonb,
--       '1.0.0'::text,
--       'test save'::text
--   );
--   -- Expect: {"ok": true, "module": "decal", "new_version": 1, "action": "create"}
--
--   -- Goi lai voi data khac:
--   select public.save_price_config('decal', '{"test": 2}'::jsonb, '1.0.0', 'test 2');
--   -- Expect: {"ok": true, "module": "decal", "new_version": 2, "action": "update"}
--
--   -- Verify:
--   select * from public.price_configs;          -- 1 row, current_version = 2
--   select * from public.price_config_versions order by version;  -- 2 rows
--   select * from public.price_change_logs;      -- 2 rows (create + update)
--
-- Test khi user khong phai admin goi RPC:
--   select public.save_price_config('decal', '{}'::jsonb, '1.0.0', null);
--   -- Expect: ERROR — forbidden (errcode 42501)

-- ============================================================================
-- 9. Rollback (neu can xoa hoan toan — DESTRUCTIVE)
-- ============================================================================
-- drop function if exists public.save_price_config(text, jsonb, text, text);
-- drop trigger if exists trg_price_configs_touch on public.price_configs;
-- drop table if exists public.price_change_logs;
-- drop table if exists public.price_config_versions;
-- drop table if exists public.price_configs;
-- drop function if exists public.is_admin();
