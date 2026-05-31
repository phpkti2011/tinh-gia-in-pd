# SECURITY NOTES — Hardcoded secrets & sanitization log

> Cập nhật: 2026-05-28 (TASK-0002.6). Đọc trước khi push repo lên remote (GitHub / GitLab / etc.).

## 1. Lịch sử

- **Trước TASK-0002.6**: source chứa **hardcoded admin password** thật ở 14 vị trí:
  - 9 vị trí trong `src/` (4 SettingsPanel + 1 ResultPanel + 4 lần ở App.jsx) — chi tiết trong [docs/02-current-audit.md mục 6.1](../02-current-audit.md#61-hardcoded-admin-password-redacted--sanitized-in-task-00026-xem-docssecuritysecurity_notesmd).
  - 1 vị trí trong `google-apps-script.js` ở root (file reference).
  - 1 vị trí trong file HTML legacy `tinh gia ep nhu + tinh cuon nhu_v189.249 (1).html`.
  - 3 vị trí trong docs trích dẫn password để báo cáo audit.
- **TASK-0001**: đã audit & ghi nhận. Không sửa code.
- **TASK-0002**: đã thêm Vitest. Không sửa code.
- **TASK-0002.5** (ban đầu): định init Git + commit baseline — **dừng** vì phát hiện sẽ commit secrets thật vào git history.
- **TASK-0002.6** (task này): sanitize toàn bộ secret thật trước khi tạo baseline.

## 2. Đã làm gì ở TASK-0002.6

### 2.1 Thay password thật trong `src/` bằng placeholder

| File | Vị trí | Trước | Sau |
|---|---|---|---|
| `src/App.jsx` | dòng 168, 242, 333, 394 | `'<REDACTED>'` | `'TEMP_ADMIN_PASSWORD_PLACEHOLDER'` |
| `src/components/smallprint/SettingsPanel.jsx` | dòng 53 | `'<REDACTED>'` | `'TEMP_ADMIN_PASSWORD_PLACEHOLDER'` |
| `src/components/smallprint/ResultPanel.jsx` | dòng 5 | `const ADMIN_PASSWORD = '<REDACTED>'` | `const ADMIN_PASSWORD = 'TEMP_ADMIN_PASSWORD_PLACEHOLDER'` |
| `src/components/largeprint/LPSettingsPanel.jsx` | dòng 46 | `'<REDACTED>'` | `'TEMP_ADMIN_PASSWORD_PLACEHOLDER'` |
| `src/components/decal/DecalSettingsPanel.jsx` | dòng 36 | `'<REDACTED>'` | `'TEMP_ADMIN_PASSWORD_PLACEHOLDER'` |
| `src/components/uvdtf/UvdtfSettingsPanel.jsx` | dòng 46 | `'<REDACTED>'` | `'TEMP_ADMIN_PASSWORD_PLACEHOLDER'` |

**Không sửa logic tính giá. Không sửa UI. Không sửa cấu trúc.** Chỉ thay literal string.

### 2.2 Loại file legacy / reference khỏi baseline (`.gitignore`)

Các file sau **vẫn nằm trên đĩa** (để dev tham khảo) nhưng **không vào git baseline**:

- `google-apps-script.js` — code Apps Script tham khảo, chứa `ADMIN_PASSWORD` thật để dán vào Google Apps Script khi redeploy.
- `tinh gia ep nhu + tinh cuon nhu_v189.249 (1).html` — file HTML legacy của phiên bản cũ, chứa password thật trong inline JS.
- `Tinh-gia-decal 12-7-2024 (3).xlsx` — bảng giá Excel legacy, không cần cho app hiện tại.

### 2.3 Redact docs

- `docs/02-current-audit.md`: 2 vị trí trích dẫn literal password → `[REDACTED — sanitized in TASK-0002.6, xem docs/security/SECURITY_NOTES.md]`.
- `docs/tasks/TASK-0001-baseline-audit.md`: 1 vị trí trích dẫn → thay bằng `<admin-password-redacted>`.

## 3. Hậu quả & lưu ý cho dev

### 3.1 Admin login hiện tại

⚠️ **Admin auth tạm thời bị "lộ" theo cách khác**: ai biết chuỗi `TEMP_ADMIN_PASSWORD_PLACEHOLDER` đều có thể vào Settings Panel. Đây **chấp nhận tạm thời** vì:
- Repo chưa public.
- Placeholder rõ ràng là tạm thời (tên gọi đã báo).
- Task tiếp theo (TASK-0006 hoặc trước đó) sẽ chuyển sang auth thật.

**Không dùng baseline này trên production cho đến khi auth được thay.**

### 3.2 Cloud sync sẽ thất bại

[`saveConfigToCloud`](../../src/utils/configStorage.js) gọi POST lên Apps Script với password `TEMP_ADMIN_PASSWORD_PLACEHOLDER`. Apps Script deployed phía Google vẫn check password thật → request bị reject → admin chỉnh giá chỉ lưu localStorage, không lưu cloud.

**Local-only mode vẫn hoạt động bình thường.** Tính giá không bị ảnh hưởng.

### 3.3 File legacy còn password thật trên đĩa

Sau `git status`, các file sau **không xuất hiện** nhưng vẫn tồn tại trên file system của dev:
- `google-apps-script.js`
- `tinh gia ep nhu + tinh cuon nhu_v189.249 (1).html`
- `Tinh-gia-decal 12-7-2024 (3).xlsx`

→ Khi share repo / clone qua máy khác qua git, các file này KHÔNG đi theo. An toàn cho baseline.
→ Khi dev khác cần redeploy Apps Script: phải lấy file `google-apps-script.js` qua kênh khác (không qua git).

### 3.4 Vercel JWT token (`.env.local`)

- `.env.local` đã được `.gitignore` ngay từ đầu (`.env*.local` pattern).
- Token JWT Vercel OIDC: đã expire sớm (theo audit `exp: 1776389350 = 28/04/2026`) — vẫn nên rotate khi có cơ hội.

## 4. Việc cần làm ở task sau (KHÔNG làm ở TASK-0002.6)

| Task tương lai | Việc | Trạng thái |
|---|---|---|
| P2-01 (Supabase Auth foundation) | Singleton Supabase client + `useAuth` + `LoginPage`. | ✅ DONE (commit `9d12821`, tag `v2.0-supabase-auth-foundation`) |
| P2-02 (Admin role model) | Bảng `user_roles` + `useUserRole` + RLS. | ✅ DONE (commit `05eb7bd`, tag `v2.1-admin-role-model`) |
| **P2-03 (Wire auth + remove placeholder)** | **Thay hardcoded placeholder bằng `<AdminGate>` + Supabase auth/role. Xoá hết placeholder khỏi `src/`. Wire `VITE_ADMIN_PASSWORD` env var cho Apps Script call.** | ✅ **DONE (task này)** |
| P2-04 (sớm) Rotate Apps Script | Đổi password thật trên deployed Apps Script (vì password cũ đã lộ trong build cũ + file legacy). Cập nhật `google-apps-script.js` local + `VITE_ADMIN_PASSWORD` trong `.env.local`. | ⏸ Pending |
| P2-05..09 (Database & history) | Migrate config sang Supabase Database (bỏ hẳn Apps Script + `VITE_ADMIN_PASSWORD`). | ⏸ Pending |
| (cleanup) | Xoá file legacy `tinh gia ep nhu ... .html`, `Tinh-gia-decal ... .xlsx` nếu xác nhận không cần. | ⏸ Pending |

## 4bis. Cập nhật sau P2-03 (2026-05-31)

### Đã làm

- ✅ **Xoá hoàn toàn** chuỗi placeholder cũ khỏi `src/` (kể cả trong comments). `grep` trả 0 hit.
- ✅ **Tạo `src/auth/AdminGate.jsx`** — wrapper component check Supabase Auth + role admin trước khi render Settings.
- ✅ **Wire `<AdminGate>` vào 4 tab Settings** ở `src/App.jsx` (smallprint, large-print, decal, uvdtf).
- ✅ **Xoá password gate cũ** khỏi 4 SettingsPanel — gồm state `password/isAuthenticated/errorMsg/showPassword`, hàm `handlePasswordCheck`, và toàn bộ early-return block password input.
- ✅ **Thay admin reveal trong `ResultPanel.jsx`** (smallprint) — bỏ `ADMIN_PASSWORD` constant + inline password input; giờ `isAdmin` đến từ `useUserRole(useAuth().user)` (cùng session login).
- ✅ **Apps Script password** đọc từ env `VITE_ADMIN_PASSWORD` thay vì hardcoded sanitized placeholder.

### Hậu quả tích cực

- Frontend không còn chứa bất kỳ chuỗi password nào.
- Chỉ user login Supabase với role `admin` mới truy cập được Settings.
- Staff/khách vẫn dùng được tab tính giá public (không bị gate).
- Apps Script password được cấu hình qua `.env.local` (gitignored), không lộ trong git.

### Còn lại sau P2-03

- ⚠️ **Apps Script password thật vẫn cần rotate** (đã lộ trong build cũ trước-TASK-0002.6 + còn trong file legacy `google-apps-script.js` ngoài git). Đó là task P2-04.
- ⚠️ **Cần Supabase project + bảng `user_roles`** setup phía bạn (manual SQL trong [docs/database/supabase-user-roles.sql](../database/supabase-user-roles.sql)) thì auth mới hoạt động end-to-end. Nếu thiếu env Supabase: AdminGate render `<LoginPage />` báo "Supabase chưa cấu hình" khi user submit → không crash.

## 5. Quy tắc bắt buộc trước khi push lên remote lần đầu

> Trong các lệnh dưới, thay `<OLD_ADMIN_PASSWORD>` bằng chuỗi password cũ. Chuỗi này **không lưu trong repo** — hãy giữ trong password manager riêng và copy-paste khi chạy lệnh.

1. ✅ Verify `.git/config` chưa có `[remote "origin"]` (chưa push).
2. ✅ Chạy `git log --all -p | grep -i '<OLD_ADMIN_PASSWORD>'` → phải trả về **0 dòng**.
3. ✅ Chạy `git ls-files | xargs grep -l '<OLD_ADMIN_PASSWORD>' 2>/dev/null` → phải trả về **0 file**.
4. ⚠️ Sau khi push: rotate ngay password admin trên Apps Script + cập nhật `google-apps-script.js` local.

## 6. Liên hệ

Mọi thay đổi liên quan đến secret/auth nên ghi thêm vào file này (append-only log), không xoá phần lịch sử.
