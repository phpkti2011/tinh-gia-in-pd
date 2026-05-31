# Phase 2 — Price config database plan (P2-05)

> Ngày: 2026-05-31 (P2-05.1)
> Trạng thái: 🟡 Schema design + docs done — chưa wire app vào Supabase
> Phụ thuộc: [P2-01 Supabase Auth foundation](phase-2-supabase-auth-plan.md), [P2-02 admin role model](phase-2-admin-role-model.md)

## 1. Mục tiêu P2-05

Migrate cloud sync config từ Google Apps Script sang Supabase Database, kèm version history + audit log. Long-term: bỏ hẳn Apps Script + `VITE_ADMIN_PASSWORD`, dùng Supabase JWT làm auth duy nhất.

P2-05 sẽ chia thành nhiều sub-task:
| Sub-task | Mục tiêu | Trạng thái |
|---|---|---|
| **P2-05.1** | Schema + RLS + docs. CHƯA wire app. | ✅ DONE |
| **P2-05.2** | Adapter `src/lib/priceConfigStore.js` + RPC `save_price_config()`. CHƯA wire vào UI. | ✅ DONE |
| **P2-05.3** | `configStorage.loadConfigFromCloud()` ưu tiên Supabase → Apps Script fallback → localStorage → default. | ✅ DONE |
| P2-05.4 | `configStorage.js` save lên Supabase + tạo version + log. Bỏ Apps Script khỏi save path. | ⏸ |
| P2-05.5 | UI history/rollback cho admin (xem version cũ, rollback). | ⏸ |
| P2-05.6 | Cleanup: remove Apps Script code + `VITE_ADMIN_PASSWORD` env + `cloudSync.js` legacy. | ⏸ |

## 2. Tại sao chuyển từ Apps Script sang Supabase

| Vấn đề Apps Script hiện tại | Giải pháp Supabase |
|---|---|
| Password hardcoded server-side (dù đã ở Script Properties), share password = share quyền | Supabase JWT — mỗi admin có session riêng, revoke được |
| Không có history/version (chỉ overwrite cell hiện tại) | `price_config_versions` table — append-only snapshot |
| Không có audit log (ai sửa, khi nào, sửa gì) | `price_change_logs` table — append-only audit |
| Không có rollback dễ dàng (phải mở Sheet history) | SELECT từ versions table → INSERT row mới với `data` cũ |
| Performance: HTTP request → Google → Sheet API → response (~500-1500ms) | Direct Postgres query (~50-100ms) |
| Khó scale (>10 admin concurrent có thể bị throttle) | Postgres + Supabase Realtime nếu cần |
| Bundle Apps Script URL hardcoded trong source | Supabase URL qua env var (đã setup từ P2-01) |
| Đã từng lộ password cũ → cần rotate manual | Auth qua JWT — không lộ literal nào |

Một vấn đề Supabase KHÔNG giải quyết:
- ⚠️ **Network/Supabase downtime** → không lưu được cloud config. Apps Script cũng vậy. App vẫn fallback localStorage (đã có sẵn từ Phase 1).

## 3. Mô hình 3 bảng

### 3.1 `price_configs` — current state

| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | gen_random_uuid() |
| `module` | text UNIQUE NOT NULL | enum: `decal` / `small-print` / `large-print` / `uvdtf` |
| `current_version` | int NOT NULL default 1 | Trỏ tới `price_config_versions.version` mới nhất |
| `schema_version` | text | Match `XXX_CONFIG_SCHEMA_VERSION` trong `src/modules/<module>/config/version.js` |
| `data` | jsonb NOT NULL | Toàn bộ config (PAPER_STOCK_DATA, FINISHING_PRICES, …) |
| `updated_by` | uuid → auth.users(id) ON DELETE SET NULL | Admin lưu cuối |
| `created_at` | timestamptz default now() | |
| `updated_at` | timestamptz default now() | Auto-update qua trigger `trg_price_configs_touch` (reuse `touch_updated_at()` từ P2-02) |

**Constraint quan trọng:** `UNIQUE(module)` → mỗi module chỉ 1 row current. INSERT thứ 2 trong cùng module → conflict → upsert pattern.

### 3.2 `price_config_versions` — history snapshot

| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `module` | text NOT NULL | enum như trên |
| `version` | int NOT NULL | Monotonic per module (1, 2, 3, …) |
| `schema_version` | text | Snapshot tại thời điểm lưu |
| `data` | jsonb NOT NULL | Snapshot data |
| `note` | text | Ghi chú admin: "tăng giá decal nhựa 5%" / "rollback về v3" |
| `created_by` | uuid → auth.users(id) | |
| `created_at` | timestamptz default now() | |

**Constraint:** `UNIQUE(module, version)` → không trùng version trong cùng module.

**Index:** `(module, created_at DESC)` cho history list.

### 3.3 `price_change_logs` — audit trail

| Column | Type | Note |
|---|---|---|
| `id` | uuid PK | |
| `module` | text NOT NULL | enum |
| `action` | text NOT NULL CHECK | `create` / `update` / `rollback` |
| `old_version` | int | null nếu `action = create` |
| `new_version` | int | |
| `note` | text | |
| `changed_by` | uuid → auth.users(id) | |
| `created_at` | timestamptz default now() | |

**Index:** `(module, created_at DESC)` cho audit timeline + `(changed_by, created_at DESC)` cho query "user X đã sửa gì".

## 4. RLS policies

### Tổng quan

| Table | anon SELECT | auth SELECT | admin INSERT | admin UPDATE | DELETE |
|---|---|---|---|---|---|
| `price_configs` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `price_config_versions` | ❌ | admin only | ✅ admin | ❌ | ❌ |
| `price_change_logs` | ❌ | admin only | ✅ admin | ❌ | ❌ |

### Helper function `is_admin()`

```sql
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public
as $$
    select exists (
        select 1 from public.user_roles
        where user_id = auth.uid() and role = 'admin'
    );
$$;
```

Dùng trong tất cả RLS policy admin-only (`USING (public.is_admin())`).

### Quyết định: cho `anon` SELECT `price_configs`

✅ **CHO PHÉP**.

**Lý do:**
- Public calculator (4 module tính giá) phải dùng được KHÔNG cần login (yêu cầu UX từ Phase 1+2).
- Calculator cần đọc config để render bảng giá / công thức / khổ vật liệu, …
- Nếu không cho anon đọc → mọi user phải login → phá UX hiện tại.

**Trade-off:**
- ⚠️ **Bảng giá nội bộ (giá vốn) sẽ lộ qua DevTools Network** cho ai biết Supabase URL + anon key.
- Cụ thể: trong `data` jsonb có cả giá vốn (cost) lẫn giá khách (customer price). Ai gọi `SELECT data FROM price_configs WHERE module = 'decal'` đều xem được toàn bộ.
- Hiện tại Apps Script flow cũng tương tự (anyone với Apps Script URL có thể GET).

**Mitigation (Phase 3 hoặc khi cần):**
- (A) Tách jsonb thành 2 cột: `public_data` (chỉ giá khách) + `admin_data` (chỉ giá vốn). RLS chỉ cho anon đọc `public_data`. App tính giá khách dùng public_data; ResultPanel cost columns dùng admin_data (đã gate qua AdminGate).
- (B) Encrypt admin_data với key chỉ admin có (phức tạp, ít khuyến khích).
- (C) Move public calculator sang server-side rendering (chỉ trả HTML, không expose data).

P2-05 giữ option **(A) ở Phase 3** — không làm trong Phase 2 vì cần refactor toàn bộ engine để chia data.

### Append-only enforcement

`price_config_versions` + `price_change_logs` đều **KHÔNG có policy UPDATE/DELETE** → sau khi enable RLS, mặc định cấm. Frontend KHÔNG xoá / sửa history được. Service Role Key (không expose) có thể sửa qua Dashboard nếu cần (cleanup test data, …).

## 5. Luồng đọc config (sau P2-05.3)

```
App start / module mount
  ↓
configStorage.loadXxxConfig()
  ↓
1. Đọc localStorage (cache, instant)  ←─ trả ngay nếu có
  ↓
2. Query Supabase: SELECT data FROM price_configs WHERE module = 'xxx'
  ↓
3a. Có row → validate schema → setConfig(data)
3b. Không có row → fallback defaultConfig (defaultConfig.js)
  ↓
4. Cập nhật localStorage cache
```

Public user (chưa login) vẫn read được vì RLS `price_configs_public_read` cho `anon`.

## 6. Luồng lưu config (sau P2-05.4)

```
Admin login → AdminGate → SettingsPanel.handleSave()
  ↓
1. Validate schema FRONTEND (đã có từ P2-02 — validateXxxConfig)
  ↓
2. Save localStorage (đã có từ Phase 1 — saveXxxConfig)
  ↓
3. Bắt đầu transaction Supabase:
   a. SELECT current_version FROM price_configs WHERE module = X
   b. new_version = current_version + 1
   c. INSERT INTO price_config_versions (module, version: new_version, data, note, created_by: auth.uid())
   d. UPSERT price_configs SET data, current_version: new_version, schema_version, updated_by: auth.uid()
      ON CONFLICT (module) DO UPDATE SET …
   e. INSERT INTO price_change_logs (module, action: 'update', old_version, new_version: new_version, note, changed_by: auth.uid())
  ↓
4. Trả ok = true → cập nhật React state → user thấy "Đã lưu"
   Hoặc error → alert + giữ React state cũ (không corrupt UI)
```

Lưu ý: **Supabase JS client chưa support multi-statement transaction nguyên tử từ browser**. 3 INSERT a/b/c/d/e sẽ chạy tuần tự, có thể nửa chừng. Mitigation:
- (A) Wrap thành 1 `rpc()` Postgres function (transactional) — KHUYẾN NGHỊ cho P2-05.4.
- (B) Idempotent — nếu nửa chừng fail, retry an toàn (UPSERT + UNIQUE constraint chống duplicate version).

## 7. Quyết định khác

- **Seed data:** ❌ KHÔNG seed `default config` thật vào SQL file này. Lý do:
  - File SQL quá dài (defaultConfig 4 module = nhiều trăm dòng JSON).
  - Logic source-of-truth nên ở `src/modules/<module>/config/defaultConfig.js` (Phase 1), không duplicate vào SQL.
  - Bootstrap sẽ làm ở P2-05.2 hoặc P2-05.3: app tự INSERT row default khi SELECT trả null lần đầu (admin save lần 1).
- **Realtime sub:** ❌ KHÔNG bật ở P2-05. Future option (Phase 3) nếu cần multi-admin sync.
- **`data` size:** Mỗi config ~10-30 kB JSON. 1000 versions / module = ~30 MB. Supabase free tier (500 MB) đủ cho ~5 năm. Acceptable.
- **schema_version dùng để làm gì:** future P2-05.5 — phát hiện schema mismatch (admin save với schema v1.0.0 nhưng DB còn data v0.9.x) → trigger migration script hoặc warn.

## 8. Việc CHƯA làm trong P2-05.1

- ❌ **CHƯA tạo Supabase tables** — bạn phải chạy SQL manual trong Dashboard.
- ❌ **CHƯA viết adapter `priceConfigStore.js`** — P2-05.2.
- ❌ **CHƯA sửa `configStorage.js`** — P2-05.3/04.
- ❌ **CHƯA UI history/rollback** — P2-05.5.
- ❌ **CHƯA bỏ Apps Script** — P2-05.6.
- ❌ **CHƯA seed default config** — sẽ làm bootstrap qua app code.
- ❌ **CHƯA tách public_data / admin_data** — Phase 3 nếu cần.

## 9. File đã tạo / sửa (P2-05.1)

| File | Vai trò |
|---|---|
| [docs/database/supabase-price-configs.sql](database/supabase-price-configs.sql) | SQL idempotent — 3 bảng + RLS + helper `is_admin()`. Chạy thủ công trong Dashboard. |
| [docs/phase-2-price-config-database-plan.md](phase-2-price-config-database-plan.md) | File này — design + roadmap P2-05. |
| [docs/phase-2-supabase-auth-plan.md](phase-2-supabase-auth-plan.md) | Update roadmap: thêm P2-05.1 done. |

## 10. Task tiếp theo

### ✅ P2-05.2: Supabase price config adapter — DONE

- ✅ `src/lib/priceConfigStore.js` — 5 export functions:
  - `isPriceConfigStoreAvailable()` → boolean
  - `loadConfigFromSupabase(module)` → `{data, current_version, schema_version, updated_at}|null`
  - `saveConfigToSupabase(module, data, schemaVersion, note)` → `{ok, error, newVersion}` (gọi RPC)
  - `loadVersionHistory(module, limit=20)` → array
  - `loadChangeLog(module, limit=20)` → array
- ✅ Postgres function `public.save_price_config(p_module, p_data, p_schema_version, p_note)` trong SQL file — transactional + is_admin() check + grant authenticated.
- ✅ Tất cả handle null Supabase gracefully (null/[]/ok=false, không throw).
- ✅ ~25 smoke tests trong `tests/lib/priceConfigStore.test.js`.
- ❌ **CHƯA wire** vào `configStorage.js` / SettingsPanel — đó là P2-05.3/04.

### ✅ P2-05.3: Wire READ từ Supabase — DONE

Wire vào async path `loadConfigFromCloud(moduleName)` thay vì async-hoá `loadXxxConfig()` sync (giữ minimal change, ít risk regression).

Priority order (mới):
1. **Supabase** (`loadConfigFromSupabase(supabaseKey)` từ adapter P2-05.2) → nếu có data hợp lệ (shallow + deep schema check) → cache localStorage → return.
2. **Apps Script** (`fetchCloudConfig(moduleName)`) — fallback tạm đến P2-05.6.
3. **localStorage** (`localStorage.getItem(mod.key)`) → nếu hợp lệ.
4. **Default config** (`mod.default`, deep clone + restoreInfinity).

Mapping `moduleName → supabaseKey` (CHECK enum trong DB):
- `printConfig` → `small-print`
- `decalConfig` → `decal`
- `largePrintConfig` → `large-print`
- `uvdtfConfig` → `uvdtf`

Khi Supabase chưa cấu hình (env thiếu) hoặc chưa có row hoặc data invalid → fallback xuống Apps Script bình thường. App KHÔNG crash, KHÔNG đổi behavior.

Validation cùng pattern với Apps Script fallback:
- `isValidConfig()` (shallow key check).
- `deepValidateXxx()` (full schema validation per module).
- Fail bất kỳ → skip cache + skip return → fallback.

Tests: 7 integration tests trong `tests/lib/configStorage.supabase-read.test.js` (per-file jsdom env):
- 4 module mapping verification.
- Valid Supabase data → cache + return.
- Supabase null / invalid / error → fallback Apps Script.
- Tất cả fail → default.

### ⏸ P2-05.4: Wire SAVE qua Supabase

- Modify `configStorage.js` 4 hàm `save{Print,Decal,LargePrint,Uvdtf}Config()`:
  - Sau khi validate schema + save localStorage → gọi `saveConfigToSupabase(...)`.
  - Bỏ `saveConfigToCloud()` Apps Script (P2-05.6 xoá hẳn code).
- App.jsx có thể xoá `APPS_SCRIPT_PASSWORD` const + 4 truyền vào (chỉ giữ load fallback).

### ⏸ P2-05.5: UI history/rollback

- Tab "Lịch sử" trong SettingsPanel — hiển thị `loadVersionHistory()` + `loadChangeLog()`.
- Nút "Rollback về v N" — gọi `saveConfigToSupabase()` với data của version cũ → tự động thành version mới.

### ⏸ P2-05.6: Remove Apps Script

- Xoá `src/utils/cloudSync.js` (saveCloudConfig, fetchCloudConfig).
- Xoá `import.meta.env.VITE_ADMIN_PASSWORD` khỏi App.jsx.
- Xoá `VITE_ADMIN_PASSWORD` khỏi `.env.example`.
- Cleanup `loadConfigFromCloud`/`saveConfigToCloud` trong `configStorage.js`.
- Update docs/security/SECURITY_NOTES.md: mục R1-R4 đóng (không còn Apps Script password).
