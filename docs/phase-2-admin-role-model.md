# Phase 2 — Admin role model (P2-02)

> Ngày: 2026-05-31
> Trạng thái: 🟡 Schema + hook in place — chưa wire vào UI
> Phụ thuộc: [P2-01 Supabase Auth foundation](phase-2-supabase-auth-plan.md)

## 1. Mục tiêu P2-02

Tạo nền tảng role-based access (admin / staff / viewer) qua bảng Supabase `user_roles`. Cung cấp helper `getUserRole()` và React hook `useUserRole()` để frontend đọc role.

**Phạm vi P2-02:** chỉ tạo schema + hook đọc. KHÔNG thay `TEMP_ADMIN_PASSWORD_PLACEHOLDER`, KHÔNG wire vào UI — đó là P2-03.

## 2. Bảng `user_roles`

| Column | Type | Note |
|---|---|---|
| `user_id` | `uuid` PK, FK → `auth.users(id)` ON DELETE CASCADE | 1 user = 1 role. Xoá user → xoá role tự động. |
| `role` | `text` NOT NULL, CHECK ∈ `('admin', 'staff', 'viewer')` | 3 role được hỗ trợ. |
| `created_at` | `timestamptz` default `now()` | |
| `updated_at` | `timestamptz` default `now()` | Auto-update qua trigger `trg_user_roles_touch`. |

File SQL: [docs/database/supabase-user-roles.sql](database/supabase-user-roles.sql) — idempotent, có thể chạy lại nhiều lần không phá data.

## 3. Định nghĩa 3 role

| Role | Quyền dự kiến (Phase 2 target) |
|---|---|
| `admin` | Edit pricing config cho 4 module (decal, small-print, uvdtf, large-print). Lưu lên cloud. Xem history (P2-05+). Rollback (P2-08). |
| `staff` | Mở app, tính giá, in báo giá khách. KHÔNG vào Settings Panel. |
| `viewer` | Read-only. (Reserved cho tương lai — chưa enforce trong UI Phase 2.) |

**Hiện tại P2-02:** chỉ định nghĩa role + cung cấp hook đọc. UI 4 SettingsPanel **chưa** check role — vẫn dùng password TEMP cũ. P2-03 sẽ enforce.

## 4. Row Level Security (RLS)

| Policy | Áp dụng cho | Cho phép |
|---|---|---|
| `user_roles_self_read` | `authenticated` | `SELECT` row mà `user_id = auth.uid()` |
| _(không có policy insert/update/delete)_ | `authenticated`, `anon` | ❌ Tất cả bị chặn |

**Hệ quả:**
- User đã login chỉ thấy role của chính mình → KHÔNG enumerate được admin khác.
- Anonymous user không đọc gì được → `getUserRole()` từ frontend khi chưa login trả `null`.
- Frontend KHÔNG gán role cho mình được → chống privilege escalation.
- Admin tạo/sửa role mới qua Supabase Dashboard với Service Role Key (không expose ra `.env`/frontend).

## 5. Cách chạy SQL (manual, 1 lần)

1. Mở Supabase Dashboard → **SQL Editor**.
2. Copy toàn bộ [docs/database/supabase-user-roles.sql](database/supabase-user-roles.sql).
3. Paste → **Run**.
4. Verify trong Table Editor → `public.user_roles` (trống ban đầu).

Có thể chạy lại bất cứ lúc nào (idempotent) — không mất data đã insert.

## 6. Cách tạo admin đầu tiên (manual, KHÔNG hardcode)

1. Dashboard → **Authentication** → **Users** → **Add user**.
   - Email + password.
   - **Mật khẩu lưu chỗ an toàn (1Password, Bitwarden, …) — KHÔNG commit, KHÔNG đưa vào `.env.example`.**
2. Copy `user_id` (uuid) của user vừa tạo.
3. SQL Editor:
   ```sql
   insert into public.user_roles (user_id, role)
   values ('<paste-uuid-here>', 'admin');
   ```
4. Verify:
   ```sql
   select * from public.user_roles;
   ```

## 7. Frontend usage (sẽ wire ở P2-03)

```jsx
import { useAuth } from './auth/useAuth';
import { useUserRole } from './auth/useUserRole';

function App() {
    const { user } = useAuth();
    const { isAdmin, loading, role } = useUserRole(user);

    if (loading) return <div>Đang kiểm tra quyền…</div>;
    if (!isAdmin) return <div>Cần quyền admin để vào Settings.</div>;

    return <SettingsPanel />;
}
```

## 8. File đã tạo (P2-02)

| File | Vai trò |
|---|---|
| [docs/database/supabase-user-roles.sql](database/supabase-user-roles.sql) | SQL schema + RLS — chạy thủ công trong Dashboard. |
| [docs/phase-2-admin-role-model.md](phase-2-admin-role-model.md) | File này. |
| [src/auth/roleService.js](../src/auth/roleService.js) | `getUserRole(userId)`, `isAdminRole(role)`, `isValidRole(role)`, `VALID_ROLES`. |
| [src/auth/useUserRole.js](../src/auth/useUserRole.js) | Hook `useUserRole(user)` → `{role, isAdmin, loading, error, refreshRole}`. |
| [tests/auth/roleService.test.js](../tests/auth/roleService.test.js) | Smoke tests cho roleService (16 tests). |
| [tests/auth/useUserRole.test.js](../tests/auth/useUserRole.test.js) | Smoke export test (1 test). |

## 9. Việc CHƯA làm ở P2-02

- ❌ **CHƯA wire `useUserRole` vào App.jsx / 4 SettingsPanel** — chờ P2-03.
- ❌ **CHƯA xoá `TEMP_ADMIN_PASSWORD_PLACEHOLDER`** khỏi 9 vị trí trong `src/`.
- ❌ **CHƯA test UI** với role-based check (cần jsdom + integration test — để P2-03 khi wire xong).
- ❌ **CHƯA tạo migration tool tự động** — vẫn chạy SQL thủ công trong Dashboard.
- ❌ **CHƯA tạo admin UI** để quản lý role (add/remove user) — Phase 3 hoặc dùng Dashboard.

## 10. Task tiếp theo: P2-03

**P2-03: Wire admin role vào 4 SettingsPanel + remove TEMP password**

1. Thay `if (password === 'TEMP_ADMIN_PASSWORD_PLACEHOLDER')` ở 4 SettingsPanel bằng `const { isAdmin } = useUserRole(useAuth().user)`.
2. Render `<LoginPage />` thay password input khi chưa login.
3. Logout button trong header.
4. Xoá hết `TEMP_ADMIN_PASSWORD_PLACEHOLDER` khỏi 9 vị trí trong `src/`.
5. Update `docs/security/SECURITY_NOTES.md` đánh dấu mục 4 (TEMP password) → resolved.
6. Test E2E pseudo (mock supabase) cho ít nhất 1 SettingsPanel.

Sau P2-03, app sẽ hoàn toàn dùng Supabase Auth + role admin → không còn password hardcoded nào trong frontend.

## 11. Rủi ro / lưu ý

- **`getUserRole()` gọi mỗi mount component** → có thể tối ưu cache về sau (P2-03 hoặc Phase 3) nếu có nhiều component cùng cần role.
- **RLS phải enable** trước khi insert admin đầu tiên. Nếu quên enable RLS, frontend vẫn đọc được role nhưng cũng đọc được role người khác (privacy leak).
- **Test env không có Supabase** → `getUserRole()` trả `null` → `isAdmin = false`. Hook không crash, không gọi network.
- **Race condition:** nếu user login rồi logout nhanh, `fetchRole()` đang chạy có thể setState sau khi component unmount. Đã có flag `mounted` (chưa enforce strict — React warn nhẹ trong dev, không phá production).
