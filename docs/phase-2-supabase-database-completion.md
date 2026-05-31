# Phase 2 — Supabase Auth + Database Completion

> Ngày tổng kết: 2026-05-31 (P2-06)
> Trạng thái: 🎉 **PHASE 2 COMPLETE** — sealed at tag `v3.0-phase-2-complete`
> Tiền đề: [Phase 1 completion](phase-1-pricing-refactor-completion.md) (`v1.5-phase-1-pricing-refactor-complete`)

## 1. Mục tiêu Phase 2

Sau Phase 1 (chuẩn hoá 4 module pricing engine + config schema + golden tests), Phase 2 tập trung vào **migration cloud + auth**:

1. **Bỏ password admin hardcoded** (sanitized placeholder vẫn còn trong src/ sau Phase 1).
2. **Bỏ Apps Script cloud sync** (password đã lộ trong git history + endpoint phụ thuộc Google Sheets server-side).
3. **Migrate sang Supabase**: Auth (login), database (config + history + audit).
4. **Backward compat**: app vẫn chạy được nếu Supabase chưa cấu hình (fallback localStorage/default).
5. **Public calculator không bị gate**: chỉ Settings panel cần admin.

## 2. Tất cả việc đã hoàn thành

### 2.1 Auth & Admin (P2-01..03)

| Sub-task | Mục tiêu | Tag |
|---|---|---|
| **P2-01** | Supabase Auth foundation: client + service + `useAuth` hook + `LoginPage`. Handle env thiếu gracefully. | `v2.0-supabase-auth-foundation` |
| **P2-02** | Admin role model: bảng `user_roles` + RLS + `useUserRole` hook + `roleService`. SQL idempotent. | `v2.1-admin-role-model` |
| **P2-03** | `<AdminGate>` wrap 4 SettingsPanel. **Xoá `TEMP_ADMIN_PASSWORD_PLACEHOLDER`** khỏi `src/` (9 vị trí). ResultPanel admin reveal dùng `useUserRole`. | `v2.2-admin-role-wired` ★ |

Sau v2.2: **frontend không còn bất kỳ chuỗi password literal nào**.

### 2.2 Apps Script docs hygiene (P2-04)

| Sub-task | Mục tiêu | Tag |
|---|---|---|
| **P2-04** | Rotation guide cho Apps Script password (cũ đã lộ). Frontend đọc env `VITE_ADMIN_PASSWORD` (đã wire từ P2-03). | `v2.3-apps-script-rotation-guide` |
| **P2-04.7** | Redact literal password cũ khỏi 3 docs lịch sử + 2 substring trong SECURITY_NOTES verify command. | `v2.4-apps-script-docs-redacted` |

Sau v2.4: **current working tree 0 password literal** (cả full + substring).

### 2.3 Database group (P2-05.x)

| Sub-task | Mục tiêu | Tag |
|---|---|---|
| **P2-05.1** | Schema SQL + RLS — 3 bảng (`price_configs`, `price_config_versions`, `price_change_logs`) + helper `is_admin()`. | `v2.5-price-config-schema-plan` |
| **P2-05.2** | Adapter `src/lib/priceConfigStore.js` (5 functions) + Postgres RPC `save_price_config()` (transactional + admin check). | `v2.6-price-config-adapter` |
| **P2-05.3** | Wire READ — `configStorage.loadConfigFromCloud()` ưu tiên Supabase, fallback Apps Script → localStorage → default. | `v2.7-price-config-read-supabase` |
| **P2-05.4** | Wire SAVE — `saveConfigToCloud()` gọi RPC Supabase. App.jsx bỏ `APPS_SCRIPT_PASSWORD`. Save 100% qua Supabase. | `v2.8-price-config-save-supabase` |
| **P2-05.6** | **Remove Apps Script runtime hoàn toàn**: xoá `cloudSync.js` + `CloudSetup.jsx` + Apps Script block trong `loadConfigFromCloud` + `_password` param + `VITE_ADMIN_PASSWORD` khỏi `.env.example`. Extract `restoreInfinity` ra helper riêng. | `v2.9-apps-script-removed` ★ |

P2-05.5 (UI history/rollback) skip — optional feature, để Phase 3 nếu cần.

## 3. Cấu trúc cloud config hiện tại (Supabase Database)

### 3.1 3 bảng

```sql
-- 1. Current config (1 row / module)
public.price_configs (
    id              uuid PK,
    module          text UNIQUE CHECK in ('decal','small-print','large-print','uvdtf'),
    current_version int,
    schema_version  text,
    data            jsonb,
    updated_by      uuid → auth.users(id),
    created_at, updated_at  timestamptz
);

-- 2. History snapshot (append-only, UNIQUE(module, version))
public.price_config_versions (
    id              uuid PK,
    module          text,
    version         int,
    schema_version  text,
    data            jsonb,
    note            text,
    created_by      uuid → auth.users(id),
    created_at      timestamptz
);

-- 3. Audit log (append-only)
public.price_change_logs (
    id              uuid PK,
    module          text,
    action          text CHECK in ('create','update','rollback'),
    old_version, new_version  int,
    note            text,
    changed_by      uuid → auth.users(id),
    created_at      timestamptz
);
```

### 3.2 RLS policies (7 policies)

| Table | anon SELECT | auth SELECT | admin INSERT | admin UPDATE | DELETE |
|---|---|---|---|---|---|
| `price_configs` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `price_config_versions` | ❌ | admin only | admin | ❌ | ❌ |
| `price_change_logs` | ❌ | admin only | admin | ❌ | ❌ |

### 3.3 Helper + RPC functions

| Function | Vai trò |
|---|---|
| `public.is_admin()` | Stable + security definer. Check `auth.uid()` có row admin trong `user_roles`. |
| `public.touch_updated_at()` | Trigger fn auto-update `updated_at` (reuse từ P2-02). |
| `public.save_price_config(p_module, p_data, p_schema_version, p_note)` | Transactional: validate admin + lock current_version + INSERT version snapshot + UPSERT current + INSERT audit log. Trả `jsonb {ok, module, new_version, action}`. |

Files: [docs/database/supabase-user-roles.sql](database/supabase-user-roles.sql) (P2-02) + [docs/database/supabase-price-configs.sql](database/supabase-price-configs.sql) (P2-05.1 + P2-05.2).

## 4. Runtime flow hiện tại

### 4.1 Read config

```
App start / module mount
  ↓
loadConfigFromCloud(moduleName)
  ↓
1. Supabase     → loadConfigFromSupabase(supabaseKey) → restoreInfinity → validate → cache localStorage → return ✅
   ↓ (null/invalid/error)
2. localStorage → JSON.parse + restoreInfinity + validate → return ✅
   ↓
3. Default      → restoreInfinity(deepClone) → return ✅
```

Apps Script tier (đã có ở P2-05.3 làm fallback) đã được REMOVE ở P2-05.6.

### 4.2 Save config (admin)

```
Admin login → AdminGate → SettingsPanel.handleSave()
  ↓
1. Validate schema (deep) frontend — fail: alert + abort
2. saveXxxConfig (sync local) — localStorage.setItem
3. App.jsx: saveConfigToCloud(moduleName, newConfig)
  ↓
4. configStorage.saveConfigToCloud:
   a. Validate (nếu sai → {local: false, cloud: false, error})
   b. localStorage.setItem (admin không mất data nếu cloud fail)
   c. saveConfigToSupabase(supabaseKey, config, schemaVersion, null)
      → RPC save_price_config (transactional version + upsert + log)
      → return {local, cloud, error, provider: 'supabase', newVersion}
```

### 4.3 Auth

```
Public user (chưa login)
  - Mở 4 calculator tabs (smallprint/decal/largeprint/uvdtf) → OK
  - Read config qua loadConfigFromCloud (Supabase anon SELECT cho price_configs OK)
  - Settings tab → AdminGate render <LoginPage />

Admin user (login Supabase)
  - useAuth() → user
  - useUserRole(user) → {role: 'admin', isAdmin: true} (qua RLS self_read)
  - Settings tab → AdminGate render children + Đăng xuất button
  - ResultPanel cost columns auto-show (isAdmin = true)
```

Source: [src/auth/AdminGate.jsx](../src/auth/AdminGate.jsx) (P2-03).

## 5. Tag history Phase 2

| Tag | Hash | Ý nghĩa |
|---|---|---|
| `v2.0-supabase-auth-foundation` | `9d12821` | Supabase client + auth service (P2-01) |
| `v2.1-admin-role-model` | `05eb7bd` | user_roles + useUserRole hook (P2-02) |
| `v2.2-admin-role-wired` ★ | `a6300e3` | AdminGate + 4 SettingsPanel + src CLEAN khỏi password placeholder (P2-03) |
| `v2.3-apps-script-rotation-guide` | `f327caf` | Rotation guide manual (P2-04) |
| `v2.4-apps-script-docs-redacted` | `ade00a9` | Literal password cũ removed khỏi docs (P2-04.7) |
| `v2.5-price-config-schema-plan` | `12bdb80` | DB schema + RLS + roadmap (P2-05.1) |
| `v2.6-price-config-adapter` | `d250568` | Adapter + RPC save_price_config (P2-05.2) |
| `v2.7-price-config-read-supabase` | `51b7636` | Wire READ Supabase priority (P2-05.3) |
| `v2.8-price-config-save-supabase` | `7b54774` | Wire SAVE qua Supabase RPC (P2-05.4) |
| `v2.9-apps-script-removed` ★ | `af6e81d` | Apps Script runtime gone hoàn toàn (P2-05.6) |
| **`v3.0-phase-2-complete`** | (this commit) | **Phase 2 SEALED** |

★ = milestone lớn nhất nhóm

## 6. Test + Build status

### Tests
```
Test Files  28 passed (28)
Tests      439 passed (439)
Duration    ~3.5s
```

Breakdown (Phase 1 → Phase 2):
- 345 golden tests (Phase 1 — 4 module pricing engine + config storage)
- 35 auth tests (P2-01 + P2-02 — supabaseClient + authService + roleService + useUserRole)
- 9 AdminGate tests (P2-03 — 6 state branches + supabase null + extra)
- 23 priceConfigStore tests (P2-05.2)
- 8 supabase-read tests (P2-05.3, giảm 3 khi P2-05.6 bỏ Apps Script fallback)
- 14 supabase-save tests (P2-05.4, giảm 3 khi P2-05.6 bỏ Apps Script + 2 P2-05.6 sig tests = 14)
- (4 golden config storage tests vẫn pass — đã update bỏ cloudSync)
- 5 misc

### Build
```
vite v5.4.21
✓ 136 modules transformed
dist/assets/index-kdis2ffB.js  330.41 kB │ gzip: 88.50 kB
✓ built in ~2s
```

Bundle size journey Phase 2:
- Pre-P2-01: 331.59 kB (Phase 1 final)
- P2-03 (auth wired): 329.51 kB (-2.08 kB — removed password gates > added auth code)
- P2-05.3 (read wire): 330.05 kB (+0.54)
- P2-05.4 (save wire): 331.18 kB (+1.13)
- **P2-05.6 (Apps Script gone): 330.41 kB (-0.77)**

Net Phase 1 → Phase 2: **-1.18 kB raw, -0.08 kB gzip** dù đã add Supabase Auth + database client. Tree-shake hiệu quả.

## 7. Rủi ro còn lại sau Phase 2

### 🟡 Trung — cần action phía admin (ngoài code)

| # | Rủi ro | Mitigation |
|---|---|---|
| R1 | **Apps Script endpoint deploy phía Google vẫn alive** — ai biết URL + password cũ vẫn POST thẳng (bypass app, không qua Supabase). | **Decommission**: Google Apps Script Dashboard → Project Settings → Delete deployment hoặc disable. |
| R2 | **Cần chạy SQL trong Supabase Dashboard** trước khi app hoạt động end-to-end. | Chạy 2 file SQL: [supabase-user-roles.sql](database/supabase-user-roles.sql) + [supabase-price-configs.sql](database/supabase-price-configs.sql). Idempotent. |
| R3 | **Cần tạo admin user + insert role** thủ công qua Dashboard. | Authentication → Users → Add user → Copy uuid → SQL `INSERT INTO user_roles (user_id, role) VALUES ('<uuid>', 'admin');` |
| R4 | **Cần cấu hình `.env.local` / Vercel Env Vars** với `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`. | Lấy từ Supabase Dashboard → Project Settings → API. |

### 🟢 Thấp — chấp nhận hoặc Phase 3

| # | Rủi ro | Notes |
|---|---|---|
| R5 | **UI chưa có history/rollback** — admin save xong không thấy version mấy / không rollback được. | P2-05.5 (optional, Phase 3 nếu cần) — UI list versions + nút Rollback. |
| R6 | **Cloud save fail không surface UI** — `handleSave` SettingsPanel chỉ check sync local, không hiển thị cloud error. | Phase 3: thêm toast notification cho cloud save result. |
| R7 | **6 npm vulnerabilities** từ `vitest@2.x` devDeps (Node 20.11.1 không support vitest@4.x). | Phase 3: upgrade Node + vitest hoặc swap tooling. |
| R8 | **Git history vẫn chứa literal password cũ + URL Apps Script** (commits trước-TASK-0002.6). `git log -p` xem được. | Optional `git filter-repo --replace-text` (destructive — mất hash 16 tag). Chỉ cần nếu push public repo. |
| R9 | **`google-apps-script.js` trên đĩa dev cũ** vẫn chứa password (gitignored). | Manual delete trên các máy dev cũ. |
| R10 | **Race condition multi-admin save** — `FOR UPDATE` lock DB-level, nhưng UI không có conflict warning. | Phase 3: realtime sub hoặc warning UI. |

## 8. Production deployment checklist

Đánh dấu ✅ khi xong từng bước:

### Database setup (Supabase Dashboard)
- [ ] Tạo Supabase project (free tier OK).
- [ ] Mở SQL Editor → copy [docs/database/supabase-user-roles.sql](database/supabase-user-roles.sql) → Run. Verify table `user_roles` + RLS policy + trigger.
- [ ] Mở SQL Editor → copy [docs/database/supabase-price-configs.sql](database/supabase-price-configs.sql) → Run. Verify 3 bảng + 7 policy + 2 index + 2 function.
- [ ] Test `SELECT public.is_admin();` (chưa login → false; sau khi login admin → true).

### Admin setup
- [ ] Authentication → Users → "Add user" → email + password (lưu vào password manager).
- [ ] Copy `user_id` (uuid) từ Users list.
- [ ] SQL Editor: `INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'admin');`
- [ ] Verify: `SELECT * FROM public.user_roles;` → row admin.

### App config
- [ ] `.env.local` trên máy dev: thêm `VITE_SUPABASE_URL=...` + `VITE_SUPABASE_ANON_KEY=...` (từ Supabase Dashboard → Project Settings → API).
- [ ] Vercel Environment Variables (Production + Preview + Development): cùng 2 vars trên.
- [ ] `npm run dev` → mở app → kiểm tra console không có warning "Supabase chưa cấu hình".

### End-to-end test
- [ ] Vào tab Settings của 1 module (vd: decal) → AdminGate render LoginPage.
- [ ] Login với admin user → AdminGate render SettingsPanel + status badge "🔓 Admin: <email>".
- [ ] Thay đổi 1 giá trị → bấm Lưu → alert "Đã lưu cài đặt".
- [ ] Supabase Dashboard → Table Editor → `price_configs` → có 1 row module='decal', current_version=1, data có giá mới.
- [ ] `price_config_versions` → có 1 row module='decal', version=1.
- [ ] `price_change_logs` → có 1 row action='create', new_version=1.
- [ ] Logout → reload tab → calculator vẫn chạy (anon SELECT price_configs OK) + Settings tab quay lại LoginPage.
- [ ] Login lại admin → Settings tab → giá hiển thị đúng giá vừa lưu (Supabase priority).

### Security cleanup
- [ ] Decommission Apps Script project phía Google (đóng R1).
- [ ] Xoá `google-apps-script.js` khỏi máy dev cũ (đóng R9).
- [ ] (Optional) Rewrite git history nếu push public (đóng R8).

## 9. Phase 3 — đề xuất

Phase 2 đã xong các yêu cầu critical (auth + database + remove Apps Script). Phase 3 có thể tập trung vào:

### 9.1 Operations & DevX (recommended first)

| Task | Mô tả |
|---|---|
| **P3-CI** | CI pipeline (GitHub Actions / Vercel): lint + npm test + npm run build trên mỗi PR. Block merge nếu fail. |
| **P3-E2E** | E2E test Playwright/Cypress với mock Supabase: login → save → verify cloud row + audit log. |
| **P3-DEPLOY** | Deploy checklist + runbook + monitoring (Sentry / LogRocket). |

### 9.2 UI feature (P2-05.5 carryover)

| Task | Mô tả |
|---|---|
| **P3-HISTORY** | Tab "Lịch sử" trong SettingsPanel: list `loadVersionHistory()` + `loadChangeLog()` + nút Rollback. |
| **P3-TOAST** | Toast notification cho cloud save result (đóng R6). |
| **P3-NOTE** | Input "Ghi chú thay đổi" khi admin Save (truyền vào RPC). |

### 9.3 Security hardening

| Task | Mô tả |
|---|---|
| **P3-REWRITE** | (Nếu push public) Rewrite git history xoá literal password cũ + URL Apps Script. Re-tag 16 tag. |
| **P3-RATELIMIT** | Rate limit Supabase RPC (Postgres trigger / Edge Function) để chống brute-force / spam save. |
| **P3-AUDIT-UI** | Admin UI xem `price_change_logs` để audit ai sửa gì khi nào (subset của P3-HISTORY). |
| **P3-2FA** | 2FA cho admin login qua Supabase Auth TOTP. |

### 9.4 Data integrity

| Task | Mô tả |
|---|---|
| **P3-SCHEMA-MIGRATE** | Migration script khi bump `schema_version` (vd 1.0.0 → 1.1.0). |
| **P3-PUBLIC-ADMIN-SPLIT** | Tách `data` jsonb thành `public_data` (giá khách) + `admin_data` (giá vốn) → anon chỉ đọc public (đóng trade-off tại mục 6 phase-2-price-config-database-plan.md). |
| **P3-DECAL-CASE-G** | Fix Excel formula gap decal Case G + D (carryover từ Phase 1 — cần Excel reference bổ sung). |

### 9.5 Performance & UX

| Task | Mô tả |
|---|---|
| **P3-REALTIME** | Supabase Realtime sub: admin A save → admin B's UI auto-refresh. |
| **P3-CACHE** | TanStack Query / SWR cho roleService + priceConfigStore (giảm round-trip). |
| **P3-MOBILE** | Responsive cho 4 SettingsPanel (hiện desktop-optimized). |

**Khuyến nghị Phase 3 task đầu tiên:** **P3-CI** (CI pipeline) — đặt foundation cho mọi task sau, đảm bảo regression không silently leak vào main. Có thể setup nhanh (1-2 giờ) với GitHub Actions: `npm ci && npm test && npm run build`.

## 10. File đã tạo / sửa trong Phase 2

Toàn bộ thay đổi từ tag `v1.5-phase-1-pricing-refactor-complete` → `v3.0-phase-2-complete`:

### Code (src/)
- ✅ **+** `src/lib/supabaseClient.js`, `authService.js`, `useAuth.js`, `LoginPage.jsx` (P2-01)
- ✅ **+** `src/auth/roleService.js`, `useUserRole.js` (P2-02)
- ✅ **+** `src/auth/AdminGate.jsx` (P2-03)
- ✅ **+** `src/lib/priceConfigStore.js` (P2-05.2)
- ✅ **+** `src/utils/restoreInfinity.js` (P2-05.6 — extract)
- ✅ **M** `src/utils/configStorage.js` (P2-05.3/.4/.6)
- ✅ **M** `src/App.jsx` (P2-03 AdminGate + P2-05.4 bỏ password arg)
- ✅ **M** 4 SettingsPanel + ResultPanel (P2-03 — bỏ password gate + admin reveal hook)
- ❌ **D** `src/utils/cloudSync.js` (P2-05.6)
- ❌ **D** `src/components/CloudSetup.jsx` (P2-05.6 dead)

### Database
- ✅ **+** `docs/database/supabase-user-roles.sql` (P2-02)
- ✅ **+** `docs/database/supabase-price-configs.sql` (P2-05.1 + P2-05.2)

### Tests (tests/)
- ✅ **+** `tests/auth/supabaseClient.test.js`, `authService.test.js`, `roleService.test.js`, `useUserRole.test.js`, `adminGate.test.jsx`
- ✅ **+** `tests/lib/priceConfigStore.test.js`, `configStorage.supabase-read.test.js`, `configStorage.supabase-save.test.js`
- ✅ **M** 4 `tests/golden/<module>.config.storage.test.js` (P2-05.6 cleanup)
- 345 golden tests Phase 1 không đổi (regression-protected)

### Docs (docs/)
- ✅ **+** `docs/phase-2-supabase-auth-plan.md`, `phase-2-admin-role-model.md`, `phase-2-price-config-database-plan.md`
- ✅ **+** `docs/security/apps-script-password-rotation.md`
- ✅ **+** `docs/phase-2-supabase-database-completion.md` (file này, P2-06)
- ✅ **M** `docs/security/SECURITY_NOTES.md` (4 mục bổ sung P2-03/04/04.7/05.6)

### Deps (package.json + lock)
- ✅ **+** `@supabase/supabase-js@^2`
- ✅ **+** (devDeps) `jsdom@^25`, `@testing-library/react@^16`, `@testing-library/jest-dom@^6`

### Env (.env.example)
- ✅ **+** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (commented template)
- ❌ **D** `VITE_ADMIN_PASSWORD` + `VITE_APPS_SCRIPT_URL` (P2-05.6 — không còn dùng)

## 11. Recap

**Phase 2 đã đóng**:
- ✅ Supabase Auth + role admin → AdminGate
- ✅ Database 3 bảng + RLS + RPC transactional
- ✅ Read/Save 100% qua Supabase
- ✅ Apps Script runtime gone hoàn toàn
- ✅ 0 password literal trong current tree
- ✅ Backward compat: app chạy được không cần Supabase env
- ✅ 439 tests / 0 failed / build pass / bundle smaller

**Phase 3 ready to start** — gợi ý P3-CI làm trước.

🎉 **Phase 2: COMPLETE** at `v3.0-phase-2-complete`.
