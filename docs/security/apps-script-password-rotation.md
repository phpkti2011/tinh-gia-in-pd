# Apps Script password rotation guide (P2-04)

> Ngày: 2026-05-31
> Trạng thái: 🟡 Code path ready — chờ rotate phía Google Apps Script (manual)
> Phụ thuộc: [P2-03 admin role wired](../phase-2-supabase-auth-plan.md)

## 1. Tại sao phải rotate

Password admin của Google Apps Script cloud sync **đã từng bị lộ** trong source code trước [TASK-0002.6](../tasks/TASK-0002.6-sanitize-secrets.md):

- Build production tại các thời điểm trước-sanitize chứa password thật trong bundle JS → bất kỳ ai từng download dist/ đều có copy.
- File legacy `google-apps-script.js` (gitignored từ TASK-0002.6 nhưng vẫn nằm trên ổ đĩa của các dev cũ) chứa password thật.
- File HTML legacy `tinh gia ep nhu + tinh cuon nhu_v189.249 (1).html` (gitignored) chứa password thật trong inline JS.

⚠️ **Phải coi password cũ là PUBLIC**. Mọi cloud sync hiện tại đang dùng password cũ đều có rủi ro bị ai đó gửi request giả mạo lên Apps Script để ghi đè bảng giá.

## 2. Nguyên tắc bảo mật

| Nơi | Có password mới? |
|---|---|
| Google Apps Script project (Script Properties hoặc code) | ✅ Bắt buộc — đây là server-side check |
| `.env.local` của dev/admin | ✅ Để app gọi cloud — gitignored |
| Vercel Environment Variables (nếu deploy production) | ✅ Để build production có env — không lộ qua git |
| Bất kỳ file nào trong repo (git tracked) | ❌ TUYỆT ĐỐI KHÔNG |
| Bất kỳ file docs nào trong repo | ❌ TUYỆT ĐỐI KHÔNG |
| Slack/Discord/email plain text | ❌ KHÔNG — dùng password manager chia sẻ (1Password, Bitwarden, …) |
| Commit message | ❌ KHÔNG |

Khi cần reference: dùng placeholder `<NEW_APPS_SCRIPT_PASSWORD>` hoặc `<OLD_APPS_SCRIPT_PASSWORD>`.

## 3. Code state hiện tại (post-P2-03)

`src/App.jsx` đọc env vào module-level constant:
```js
const APPS_SCRIPT_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || '';
```
Constant này được pass cho 4 lần gọi `saveConfigToCloud(moduleName, newConfig, APPS_SCRIPT_PASSWORD)` (mỗi module pricing 1 lần).

`src/utils/configStorage.js` line 175:
```js
if (isCloudEnabled() && password) {
    const result = await saveCloudConfig(moduleName, config, password);
    ...
}
```
→ Nếu env trống → `password = ''` → cloud save skip, **local save (localStorage) vẫn chạy bình thường**.

`src/utils/cloudSync.js` `saveCloudConfig()` POST body có field `password` để Apps Script server-side verify.

### 3.1 Tên env: nên giữ hay rename?

Hiện tại: `VITE_ADMIN_PASSWORD`. Sau Phase 1+2 thì ý nghĩa thực ra là "password Apps Script cloud sync", không phải password admin login UI (login UI dùng Supabase Auth qua `VITE_SUPABASE_URL/ANON_KEY`).

| Tùy chọn | Pros | Cons |
|---|---|---|
| Giữ `VITE_ADMIN_PASSWORD` | Không cần touch code; ai đã có `.env.local` không phải đổi | Tên dễ gây nhầm với Supabase login |
| Rename → `VITE_APPS_SCRIPT_PASSWORD` | Rõ nghĩa | Cần đổi `src/App.jsx` + `.env.example` + bất kỳ `.env.local` của dev hiện tại |

**Quyết định P2-04**: GIỮ `VITE_ADMIN_PASSWORD` để không phá `.env.local` đang dùng. Rename sẽ làm ở P2-05 khi migrate sang Supabase Database (lúc đó env này bị bỏ hẳn nên rename tạm thời không cần thiết).

## 4. Quy trình rotate (manual phía Apps Script)

### Bước 1. Backup config hiện tại

Trước khi đổi password, vào Supabase Dashboard hoặc Apps Script Sheet để verify config cloud đang đúng. Nếu có thể, export snapshot 4 module config (printConfig, largePrintConfig, decalConfig, uvdtfConfig) lưu offline phòng trường hợp rotate hỏng.

### Bước 2. Sinh password mới

Dùng password manager (1Password, Bitwarden) sinh chuỗi ngẫu nhiên ≥ 20 ký tự, hỗn hợp chữ + số + ký tự đặc biệt. **KHÔNG dùng password personal**, **KHÔNG reuse password Supabase**.

Lưu lại trong password manager chia sẻ với team admin. Tag với label "Apps Script cloud sync — tinh-gia-in".

### Bước 3. Update Google Apps Script

1. Mở Google Apps Script project đang xử lý cloud sync (URL hiện tại trong [src/utils/cloudSync.js](../../src/utils/cloudSync.js) line 4 — chỉ URL endpoint, không có password).
2. Mở Editor → file `Code.gs` (hoặc tên tương ứng) → tìm dòng check password.
3. **Tốt nhất** (nếu chưa làm): chuyển password từ hardcoded sang Script Properties:
   - Project Settings → Script properties → Add property:
     - Key: `ADMIN_PASSWORD`
     - Value: `<NEW_APPS_SCRIPT_PASSWORD>` (paste từ password manager)
   - Sửa code Apps Script:
     ```js
     // Trước (hardcoded — XOÁ literal cũ ra khỏi file, không paste vào docs):
     const ADMIN_PASSWORD = "<OLD_APPS_SCRIPT_PASSWORD>";  // <-- BỎ
     // Sau (đọc properties):
     const ADMIN_PASSWORD = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
     ```
4. **Đơn giản hơn** (nếu chấp nhận hardcoded trong Apps Script — server-side, không bundle ra frontend): thay literal string mới trong code.
5. Save.
6. **Deploy → Manage Deployments → Edit (✏️) current deployment → Version: New version → Description: "P2-04: rotate password" → Deploy**.
7. URL deployed KHÔNG ĐỔI (giữ nguyên endpoint cũ).

### Bước 4. Update file legacy local `google-apps-script.js`

File này nằm ngoài git (gitignored) nhưng vẫn trên ổ đĩa của các dev cũ. Mở và thay:
```js
const ADMIN_PASSWORD = "<OLD_APPS_SCRIPT_PASSWORD>";  // <-- đổi
const ADMIN_PASSWORD = "<NEW_APPS_SCRIPT_PASSWORD>";  // <-- mới (paste từ password manager)
```
Mục đích: nếu sau này cần redeploy Apps Script từ file local, không vô tình rollback về password cũ.

### Bước 5. Update `.env.local` (mỗi dev/admin)

Mỗi máy admin/dev có file `.env.local` (gitignored) ở root project. Thay/bổ sung:
```env
VITE_ADMIN_PASSWORD=<NEW_APPS_SCRIPT_PASSWORD>
```
(Paste password mới — KHÔNG đặt trong dấu nháy nếu chứa ký tự đặc biệt làm bash hiểu nhầm; Vite parse được literal string sau dấu `=`.)

### Bước 6. Update Vercel Environment Variables (nếu deploy production)

1. Vercel Dashboard → Project `tinh-gia-in` → Settings → Environment Variables.
2. Tìm var `VITE_ADMIN_PASSWORD` (nếu chưa có thì Add):
   - Key: `VITE_ADMIN_PASSWORD`
   - Value: `<NEW_APPS_SCRIPT_PASSWORD>`
   - Environments: Production + Preview + Development.
3. Save.
4. Redeploy production (Deployments → Redeploy hoặc push commit mới).

### Bước 7. Test end-to-end

1. Stop dev server, restart `npm run dev` (Vite reload env).
2. Đăng nhập với user admin Supabase.
3. Vào tab Settings → đổi 1 giá trị nhỏ trong bảng giá → bấm Lưu.
4. Mở DevTools → Network → tìm POST request đến Apps Script URL → status phải 200, response body không có `error: "Sai mật khẩu"`.
5. Mở Google Sheet đích → verify giá trị mới đã ghi vào sheet.
6. Reload page → verify config load lại đúng giá mới (sync 2 chiều OK).

### Bước 8. Verify password cũ KHÔNG còn work

1. Tạm thời sửa `.env.local`: `VITE_ADMIN_PASSWORD=<OLD_APPS_SCRIPT_PASSWORD>` (paste password CŨ).
2. Restart dev server.
3. Thử lưu config → Apps Script phải reject (status 200 nhưng response có `error`).
4. Trả `.env.local` về `<NEW_APPS_SCRIPT_PASSWORD>`.

Nếu password cũ vẫn work → Apps Script chưa deploy bản mới hoặc Script Properties chưa update → quay lại Bước 3.

## 5. Verify trong repo

Sau khi xong:

```bash
# 1. Password cũ KHÔNG được xuất hiện trong git tracked files
git ls-files | xargs grep -l '<OLD_APPS_SCRIPT_PASSWORD>' 2>/dev/null
# Phải trả về: (empty)

# 2. Password mới CHƯA BAO GIỜ xuất hiện trong git tracked files
git ls-files | xargs grep -l '<NEW_APPS_SCRIPT_PASSWORD>' 2>/dev/null
# Phải trả về: (empty)

# 3. Placeholder cũ TEMP_ADMIN_PASSWORD_PLACEHOLDER vẫn = 0 (regression check P2-03)
grep -rn "TEMP_ADMIN_PASSWORD_PLACEHOLDER" src/
# Phải trả về: (no matches)

# 4. Env var tham chiếu vẫn đúng tên
grep -rn "VITE_ADMIN_PASSWORD" src/ .env.example
# Phải trả về: 5 dòng (1 trong .env.example + 1 const trong App.jsx + 3 dòng comment)

# 5. Tests + build vẫn pass
npm test
npm run build
```

## 6. Nếu password cũ đã bị abuse trước khi rotate

Trong khoảng thời gian từ "build đầu tiên chứa password" → "deploy Apps Script bản password mới", có khả năng ai đó đã lưu dữ liệu rác / ghi đè giá xấu lên cloud config.

Mitigation:
1. Sau Bước 8 (đã confirm password cũ chết), review snapshot Apps Script Sheet cho 4 module config.
2. So với git history (`docs/02-current-audit.md` mục 8 có giá trị mặc định ban đầu).
3. Nếu phát hiện anomaly: rollback cloud config về snapshot backup (Bước 1) hoặc về `defaultConfig.js` trong source.

## 7. Long-term

Sau P2-05+ (migrate config sang Supabase Database):
- `saveConfigToCloud` viết vào bảng Supabase `price_configs` thay vì Apps Script.
- Auth đã do Supabase JWT lo (RLS policy enforce admin role mới insert/update được).
- `VITE_ADMIN_PASSWORD` env var bị **bỏ hẳn**.
- Apps Script project có thể decommission (giữ history nhưng không deploy nữa).

## 8. Liên hệ

Mọi thay đổi liên quan đến password Apps Script ghi vào [SECURITY_NOTES.md](SECURITY_NOTES.md) (append-only log) **mà KHÔNG ghi giá trị password thật**.
