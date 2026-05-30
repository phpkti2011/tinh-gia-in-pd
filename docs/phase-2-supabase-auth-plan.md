# Phase 2 — Supabase Auth plan

> Ngày: 2026-05-31 (P2-01)
> Trạng thái: 🟡 Foundation done — chưa wire vào UI

## 1. Mục tiêu auth (Phase 2 — group Auth & Admin)

Thay `TEMP_ADMIN_PASSWORD_PLACEHOLDER` (hardcoded 9 vị trí trong `src/`) bằng auth thật qua Supabase Auth, hỗ trợ role-based access control:
- Admin có thể edit pricing config + xem history.
- Staff chỉ xem báo giá (không thấy Settings Panel).
- Anonymous user vẫn dùng được công cụ tính giá (read-only).

## 2. Env variables

Cần đặt trong `.env.local` (KHÔNG commit):

| Var | Nguồn | Bắt buộc? |
|---|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Project Settings → API → Project URL | ✅ Cần để auth hoạt động |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API → anon/public key | ✅ Cần để auth hoạt động |

Nếu thiếu: app vẫn chạy (`npm run dev` / `npm run build` pass), nhưng auth disabled + console.warn. Dev không setup Supabase vẫn dùng được app, fallback về flow cũ (TEMP_ADMIN_PASSWORD_PLACEHOLDER).

Template ở [.env.example](../.env.example).

## 3. File đã tạo (P2-01)

| File | Vai trò |
|---|---|
| [src/lib/supabaseClient.js](../src/lib/supabaseClient.js) | Singleton Supabase client. Handle missing env gracefully (warn + return `null`). Export `supabase` + `isSupabaseConfigured()`. |
| [src/auth/authService.js](../src/auth/authService.js) | Wrapper functions: `getCurrentSession()`, `signInWithPassword(email, password)`, `signOut()`, `onAuthStateChange(cb)`. Đều handle null supabase (không crash). |
| [src/auth/useAuth.js](../src/auth/useAuth.js) | React hook: `{session, user, loading, error, signIn, signOut}`. Auto-subscribe vào onAuthStateChange. |
| [src/auth/LoginPage.jsx](../src/auth/LoginPage.jsx) | Form email/password tạm. **CHƯA wire vào App.jsx** — chờ P2-03. |
| [tests/auth/supabaseClient.test.js](../tests/auth/supabaseClient.test.js) | Smoke: `isSupabaseConfigured()` = false khi thiếu env (test env không set). |
| [tests/auth/authService.test.js](../tests/auth/authService.test.js) | Smoke: 4 function exports + behavior khi supabase null. |

## 4. Việc CHƯA làm trong P2-01

- ❌ **CHƯA wire `LoginPage` vào `App.jsx`** — app hiện vẫn dùng `TEMP_ADMIN_PASSWORD_PLACEHOLDER`.
- ❌ **CHƯA xóa `TEMP_ADMIN_PASSWORD_PLACEHOLDER`** khỏi 9 vị trí trong `src/`.
- ❌ **CHƯA tạo Supabase project / bảng `user_roles`** — đó là task DevOps phía bạn (manual setup ngoài code).
- ❌ **CHƯA test LoginPage UI** (cần jsdom env hoặc mock — phức tạp, để P2-03 khi wire vào UI thật).
- ❌ **CHƯA migrate config sang Supabase database** — đó là P2-05.

Lý do tách: nếu wire ngay vào UI ở P2-01 mà chưa có Supabase project setup thật, sẽ phá UX (login không pass được, admin không vào được Settings). Foundation an toàn = code có sẵn, kích hoạt sau khi user xong setup Supabase manual.

## 5. Cách dev/admin thử nghiệm sau P2-01

1. Tạo Supabase project (free tier).
2. Tạo user admin qua Supabase Dashboard → Authentication → Users → "Add user".
3. Copy URL + anon key → đặt vào `.env.local`:
   ```
   VITE_SUPABASE_URL=https://<your-project>.supabase.co
   VITE_SUPABASE_ANON_KEY=<your-anon-key>
   ```
4. Import LoginPage ở test code hoặc dev sandbox:
   ```jsx
   import LoginPage from './auth/LoginPage';
   <LoginPage onSuccess={() => console.log('Logged in!')} />
   ```
5. Thử login. Verify console không có warning Supabase missing env.

App production vẫn dùng flow cũ (`TEMP_ADMIN_PASSWORD_PLACEHOLDER`) cho đến khi P2-03 wire xong.

## 6. Task tiếp theo

### P2-02: Admin role model (next)

- Tạo bảng `user_roles` trong Supabase theo [docs/database/supabase-schema-draft.md](database/supabase-schema-draft.md).
  - Columns: `user_id`, `role` ('admin'|'staff'|'viewer'), `created_at`.
- Helper `useUserRole()` hook → return `{role, loading}` cho user hiện tại.
- Helper `useIsAdmin()` boolean.
- Backend check (RLS policies) — không trust frontend role.

### P2-03: Wire auth vào 4 SettingsPanel (sau P2-02)

- Thay password check `if (password === 'TEMP_ADMIN_PASSWORD_PLACEHOLDER')` bằng `if (useIsAdmin())`.
- Nếu chưa login → render `<LoginPage />` thay vì password input.
- Logout button trong header.
- **Xóa hết `TEMP_ADMIN_PASSWORD_PLACEHOLDER`** khỏi 9 vị trí trong `src/`.
- Update SECURITY_NOTES.md.

### P2-04: Rotate password Apps Script

- Password cũ `PHP11148045kti93@` đã lộ trong dist build trước-TASK-0002.6.
- Update Apps Script deployed phía Google + `google-apps-script.js` local.

### P2-05..09: Database & Config (sau auth)

- `price_configs` table → lưu config 4 module trong Supabase.
- `price_config_versions` → snapshot mỗi save.
- `price_change_logs` → audit log (admin nào sửa cái gì khi nào).
- Rollback UI cho admin.

## 7. Rủi ro / lưu ý

- **Backward compat**: nếu Supabase env thiếu, code vẫn run như cũ (auth disabled). Production phải đảm bảo env set.
- **Test env**: Vitest mặc định không có `import.meta.env.VITE_SUPABASE_URL` → `isSupabaseConfigured()` = false. Test smoke đã verify behavior này.
- **LoginPage chưa render được trong Vitest mặc định** (cần jsdom). Sẽ test khi wire vào UI ở P2-03 (lúc đó đã có jsdom setup).
- **Bundle JS sẽ tăng** sau khi import supabase-js vào App.jsx ở P2-03 (~20-30 kB gzipped — acceptable).
