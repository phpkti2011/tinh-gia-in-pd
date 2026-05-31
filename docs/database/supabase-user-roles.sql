-- P2-02: Supabase user_roles schema + RLS policies
--
-- Cách chạy: copy toàn bộ file này → paste vào Supabase Dashboard → SQL Editor → Run.
-- Idempotent: chạy lại nhiều lần không phá data (create if not exists, drop policy if exists, …).
--
-- An toàn:
--   - RLS enabled → user chỉ select được row của chính mình.
--   - KHÔNG có insert/update/delete policy cho authenticated → mọi thay đổi role
--     chỉ làm thủ công trong Dashboard (Service Role Key, không expose frontend).
--
-- LƯU Ý: KHÔNG hardcode admin user_id hoặc email trong file này. Cách tạo admin
-- đầu tiên xem mục 6 (chạy thủ công sau khi tạo user qua Auth UI).

-- ============================================================================
-- 1. Bảng user_roles
-- ============================================================================
create table if not exists public.user_roles (
    user_id    uuid primary key references auth.users(id) on delete cascade,
    role       text not null check (role in ('admin', 'staff', 'viewer')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

comment on table public.user_roles is
    'Phan quyen user — tham chieu auth.users(id). Khong dung de luu profile.';
comment on column public.user_roles.role is
    'Role enum: admin | staff | viewer (enforce qua CHECK constraint).';

-- ============================================================================
-- 2. Trigger auto-update updated_at
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_user_roles_touch on public.user_roles;
create trigger trg_user_roles_touch
    before update on public.user_roles
    for each row
    execute function public.touch_updated_at();

-- ============================================================================
-- 3. Enable Row Level Security
-- ============================================================================
alter table public.user_roles enable row level security;

-- ============================================================================
-- 4. Policy: authenticated user chi doc duoc role cua chinh minh
-- ============================================================================
drop policy if exists "user_roles_self_read" on public.user_roles;
create policy "user_roles_self_read"
    on public.user_roles
    for select
    to authenticated
    using (user_id = auth.uid());

-- LUU Y: KHONG tao policy insert/update/delete cho `authenticated` hay `anon`.
-- Mac dinh sau khi enable RLS, khong co policy = chan tat ca cac thao tac do.
-- Frontend KHONG the gan role admin cho minh — chi Service Role moi sua duoc.

-- ============================================================================
-- 5. (Optional) Index — user_id da la PK nen khong can them
-- ============================================================================
-- Khong can them index nao khac vi:
--   - user_id la PK → da co B-tree index
--   - mot user chi co 1 role → khong query phuc tap

-- ============================================================================
-- 6. Cach tao admin dau tien (CHAY THU CONG, KHONG commit vao SQL nay)
-- ============================================================================
--
-- a. Dashboard → Authentication → Users → "Add user" (email + password).
-- b. Copy user_id (uuid) vua tao.
-- c. Mo SQL Editor moi, chay:
--
--      insert into public.user_roles (user_id, role)
--      values ('<paste-uuid-here>', 'admin');
--
-- d. Verify:
--      select * from public.user_roles;
--      -- Expect: 1 row, role = 'admin'.
--
-- e. (Optional) Test RLS:
--      -- Sau khi login app voi user nay, useUserRole() phai return {role: 'admin'}.
--      -- Neu login bang user khac → return {role: null}.

-- ============================================================================
-- 7. Rollback (neu can phai xoa hoan toan)
-- ============================================================================
-- drop trigger if exists trg_user_roles_touch on public.user_roles;
-- drop function if exists public.touch_updated_at();
-- drop table if exists public.user_roles;
