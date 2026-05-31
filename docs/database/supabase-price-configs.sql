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

-- ============================================================================
-- 9. Rollback (neu can xoa hoan toan — DESTRUCTIVE)
-- ============================================================================
-- drop trigger if exists trg_price_configs_touch on public.price_configs;
-- drop table if exists public.price_change_logs;
-- drop table if exists public.price_config_versions;
-- drop table if exists public.price_configs;
-- drop function if exists public.is_admin();
