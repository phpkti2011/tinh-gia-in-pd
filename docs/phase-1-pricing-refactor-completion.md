# Phase 1 — Pricing Engine Refactor Completion

> Ngày tổng kết: **2026-05-30**
> Trạng thái: ✅ **100% HOÀN THÀNH** (4/4 module pricing đã chuẩn hóa)
> Branch: `main` @ `46a5fa3`

## 1. Mục tiêu Phase 1

Nâng cấp phần mềm tính giá in từ trạng thái ban đầu (1 React SPA monolithic, công thức nhúng trong utils, không test, không Git) lên kiến trúc software company:

- ✅ Tách UI / pricing engine / config / admin / storage.
- ✅ Mỗi module có golden tests khoá behavior trước khi refactor.
- ✅ Engine tách thành module riêng theo target architecture.
- ✅ Config có schema + version + validation, không hardcode trong frontend.
- ✅ Admin save bị gate bởi schema validation (chặn data rác).
- ✅ Mỗi task nhỏ, có build/test, dễ rollback (tag mỗi milestone).
- ✅ Báo cáo bằng tiếng Việt.

## 2. 4 module pricing đã chuẩn hóa

Mọi module đều có **full pattern** đồng nhất:
1. **Golden tests** (atomic + e2e nếu cần)
2. **Extracted engine** ở `src/modules/<module>/engine/`
3. **Config module** với `schema.js` + `version.js`
4. **Storage validation** wired vào `configStorage`
5. **UI save guard** (handleSave check return value)

| Module | Golden tests | Engine | Config | Storage validation | UI guard |
|---|---|---|---|---|---|
| **decal** (in tem/sticker) | ✅ 38 case (Case A-I) + 6 reference todo | ✅ `src/modules/decal/engine/{layout,pricing,priceTables,index}` | ✅ `src/modules/decal/config/` schema + v1.0.0 | ✅ `deepValidateDecal` (TASK-0005.5) | ✅ `DecalSettingsPanel.handleSave` |
| **small-print** (in KTS khổ nhỏ) | ✅ 78 case (53 atomic + 24 e2e + 1 sanity) | ✅ `src/modules/small-print/engine/{layout,pricing,finishing,options,quote,index}` (6 file) | ✅ schema có 13 nhóm OBJECT + 6 array + inner sanity | ✅ `deepValidatePrint` (TASK-0010) | ✅ `SettingsPanel.handleSave` |
| **uvdtf** (in mét tới) | ✅ 30 case (Case A-G + structural) | ✅ `src/modules/uvdtf/engine/{pricing,index}` (smallest module) | ✅ schema có 4 numeric + priceTiers array | ✅ `deepValidateUvdtf` (TASK-0013) | ✅ `UvdtfSettingsPanel.handleSave` |
| **large-print** (in khổ lớn) | ✅ 31 case (Case A-H) | ✅ `src/modules/large-print/engine/{layout,finishing,pricing,index}` | ✅ schema có 4 OBJECT + 2 array + 4 numeric + inner sanity | ✅ `deepValidateLargePrint` (TASK-0017) | ✅ `LPSettingsPanel.handleSave` |

## 3. Cấu trúc module hiện tại

```
src/
├── modules/
│   ├── decal/
│   │   ├── engine/
│   │   │   ├── layout.js          (geometry, hexagonal/grid layout)
│   │   │   ├── pricing.js         (progressive tier, multiplier, lam)
│   │   │   ├── priceTables.js     (sinh bảng giá)
│   │   │   └── index.js
│   │   ├── config/
│   │   │   ├── defaultConfig.js   (DECAL_DEFAULT_CONFIG)
│   │   │   ├── schema.js          (validateDecalConfig)
│   │   │   ├── version.js
│   │   │   └── index.js
│   │   └── README.md
│   │
│   ├── small-print/
│   │   ├── engine/
│   │   │   ├── layout.js          (getClicks, getPrintableArea, calculateImposition, …)
│   │   │   ├── pricing.js         (getProfitMargin, calculateVariableDataCost, …)
│   │   │   ├── finishing.js       (calculateLamination, calculateDieCuttingCosts, calculateFoilStamping)
│   │   │   ├── options.js         (processSheet, calculatePaperOptions, …)
│   │   │   ├── quote.js           (calculateCustomerQuote)
│   │   │   └── index.js           (16 public functions)
│   │   ├── config/
│   │   │   ├── defaultConfig.js   (DEFAULT_CONFIG — 223 dòng)
│   │   │   ├── schema.js          (validateSmallPrintConfig — schema lớn nhất)
│   │   │   ├── version.js
│   │   │   └── index.js
│   │   └── README.md
│   │
│   ├── uvdtf/
│   │   ├── engine/
│   │   │   ├── pricing.js         (calculateUvDtf — 1 public function)
│   │   │   └── index.js
│   │   ├── config/
│   │   │   ├── defaultConfig.js
│   │   │   ├── schema.js          (validateUvDtfConfig)
│   │   │   ├── version.js
│   │   │   └── index.js
│   │   └── README.md
│   │
│   └── large-print/
│       ├── engine/
│       │   ├── layout.js          (calcItemOnRoll, optimizeItemOnRoll)
│       │   ├── finishing.js       (calculateFormexCost, calculateFinishingCost)
│       │   ├── pricing.js         (calculateLargePrint — orchestrator)
│       │   └── index.js
│       ├── config/
│       │   ├── defaultConfig.js
│       │   ├── schema.js          (validateLargePrintConfig)
│       │   ├── version.js
│       │   └── index.js
│       └── README.md
│
├── utils/                          (chỉ còn shim layers + shared)
│   ├── calculator.js               (shim → small-print/engine)
│   ├── customerQuote.js            (shim → small-print/engine/quote)
│   ├── decalCalculator.js          (shim → decal/engine)
│   ├── largePrintCalculator.js     (shim → large-print/engine)
│   ├── uvdtfCalculator.js          (shim → uvdtf/engine)
│   ├── configStorage.js            (load/save 4 module + cloud sync + 4 deep validate)
│   ├── cloudSync.js                (Apps Script API + JSON↔Infinity workaround)
│   └── canvasRenderer.js           (UI helper — vẽ sơ đồ xếp hình)
│
├── config/                         (chỉ còn shim layers)
│   ├── defaultConfig.js            (shim → small-print/config)
│   ├── decalConfig.js              (shim → decal/config)
│   ├── largePrintConfig.js         (shim → large-print/config)
│   └── uvdtfConfig.js              (shim → uvdtf/config)
│
├── components/                     (UI — không bị restructure trong Phase 1)
│   ├── smallprint/, largeprint/, decal/, uvdtf/, CloudSetup.jsx
│
└── App.jsx, main.jsx, index.css
```

## 4. Tag milestone history

| Tag | Commit | Ngày | Ý nghĩa |
|---|---|---|---|
| **`v1.0-decal-pricing-aligned`** | `61314eb` | 2026-05-28 | Decal milestone — golden + extract + config + wire + **fix Excel formula Case C** (Formula A: progressive(ceil) + frac × tier_marginal) + sanitize hardcoded password vào placeholder |
| **`v1.1-small-print-engine-extracted`** | `35139a6` | 2026-05-28 | Small-print golden + e2e + extract engine + **fix bug App.jsx finishing config selection** (hole-punch/cấn/bồi LUÔN = 0 trước fix) |
| **`v1.2-small-print-config-validated`** | `d8b2dda` | 2026-05-28 | Small-print config schema/version + wire validation |
| **`v1.3-uvdtf-config-validated`** | `301ae26` | 2026-05-29 | UV DTF full milestone (golden + extract + config) trong 1 squash |
| **`v1.4-large-print-config-validated`** | `46a5fa3` | 2026-05-30 | Large-print full milestone (golden + extract + config) trong 1 squash. **Đóng full pattern 4/4 module.** |

History `main` (6 commit thẳng tắp):
```
46a5fa3 (HEAD, v1.4) feat: validate large-print pricing milestone
301ae26 (v1.3)       feat: validate uvdtf pricing milestone
d8b2dda (v1.2)       feat: validate small-print config milestone
35139a6 (v1.1)       feat: stabilize small-print pricing engine milestone
61314eb (v1.0)       feat: stabilize decal pricing engine milestone
1ef287b              chore: create clean baseline after audit and test setup
```

## 5. Stats hiện tại

| Metric | Value |
|---|---|
| **Tests passed** | 345 / 345 (0 failed, 0 skipped) |
| **Test files** | 20 |
| **Build modules** | 87 transformed |
| **Build status** | ✅ exit 0, không warning |
| **Bundle JS** | 331.59 kB (gzip 88.58 kB) |
| **Tracked files** | 129 |
| **Branches** | `main` (chỉ 1) |
| **Tags** | 5 (`v1.0` → `v1.4`) |
| **Commits trên main** | 6 |

### Test breakdown (xấp xỉ — kiểm tra `npm test` cho số chính xác)

| Module | Test files | Tests |
|---|---|---|
| sanity | 1 | 2 |
| **decal** | 6 | ~73 (golden 20 + extra 12 + module 5 + config 17 + storage 13 + reference 6) |
| **small-print** | 5 | ~123 (golden 53 + e2e 24 + module 6 + config 27 + storage 13) |
| **uvdtf** | 4 | ~71 (golden 30 + module 5 + config 23 + storage 13) |
| **large-print** | 4 | ~77 (golden 31 + module 5 + config 28 + storage 13) |
| **Total** | 20 | **345** |

## 6. Việc đã hoàn thành (chronological)

### Setup phase (TASK-0001 → TASK-0002.6)
- **TASK-0001**: Baseline audit — 9-section doc liệt kê tech stack, file engine, bảng giá, 9 vị trí password hardcoded, 2 file legacy. Build verify.
- **TASK-0002**: Thêm Vitest 2.1.9 (downgrade từ 4.x do Node 20.11.1 không hỗ trợ rolldown).
- **TASK-0002.5** + **TASK-0002.6**: Init Git + sanitize hardcoded `<OLD_APPS_SCRIPT_PASSWORD>` thành `TEMP_ADMIN_PASSWORD_PLACEHOLDER` trước commit baseline. `.gitignore` chặn `node_modules`, `dist`, `.env*`, file legacy.

### Decal phase (TASK-0003 → TASK-0007.1)
- **TASK-0003**: 20 golden test (Case A-E) khoá decalCalculator.
- **TASK-0003.5**: Document Excel reference gap (1.100đ base + 250đ lam cho Case C) + extra golden cho Cases F-I + skipped reference todo.
- **TASK-0004**: Extract decal engine → `src/modules/decal/engine/` (layout + pricing + priceTables + index).
- **TASK-0005** + **TASK-0005.5**: Decal config module + schema + version + wire validation vào configStorage. Fix UI handleSave.
- **TASK-0006**: **Fix decal formula Case C khớp Excel** (Formula A: `progressive(ceil) + (ceil − raw) × tier_marginal_price`; lam dùng raw). Un-skip 6 reference test. Update 5 golden cases bị ảnh hưởng (A, B, C, D, H).
- **TASK-0007** + **TASK-0007.1**: Squash merge milestone → tag `v1.0` + cleanup branch.

### Small-print phase (TASK-0008 → TASK-0010.6)
- **TASK-0008**: 53 atomic golden tests (Case A-L) cho 11 functions của calculator.js + customerQuote.js.
- **TASK-0008.5**: 24 e2e golden — phát hiện **bug App.jsx line 121-123** (truyền outer config cho calculateFinishingCost → hole-punch/cấn/bồi luôn = 0).
- **TASK-0008.6**: Fix bug App.jsx — thay `config.HOLE_PUNCHING_CONFIG` → `config.HOLE_PUNCHING_CONFIG?.[params.holePunchingType]`. Update Sub 3.2 test.
- **TASK-0009**: Extract small-print engine (15 fn calculator + 1 fn customerQuote) thành 5 file: layout/pricing/finishing/options/quote/index.
- **TASK-0009.5** + **TASK-0009.6**: Squash merge milestone v1.1 + cleanup.
- **TASK-0010**: Small-print config module + schema (13 nhóm OBJECT + 6 array + inner sanity).
- **TASK-0010.5** + **TASK-0010.6**: Squash merge v1.2 + cleanup.

### UV DTF phase (TASK-0011 → TASK-0014.1)
- **TASK-0011**: 30 golden tests (Case A-G + structural) cho calculateUvDtf.
- **TASK-0012**: Extract UV DTF engine (1 function — module nhỏ nhất).
- **TASK-0013**: UV DTF config module + schema (4 numeric + priceTiers) + wire.
- **TASK-0014** + **TASK-0014.1**: Squash merge v1.3 + cleanup.

### Large-print phase (TASK-0015 → TASK-0018)
- **TASK-0015**: 31 golden tests (Case A-H) cho calculateLargePrint. Phát hiện edge case Case E (roll 1.8m rotated rẻ hơn 1.0m upright).
- **TASK-0016**: Extract large-print engine vào 3 file (layout + finishing + pricing).
- **TASK-0017**: Config module + schema (4 OBJECT + 2 array + 4 numeric + 8 inner validators).
- **TASK-0018**: Squash merge v1.4 (chưa cleanup branch).

## 7. Rủi ro còn lại / Known issues

### 🔴 Security & Auth
- **`TEMP_ADMIN_PASSWORD_PLACEHOLDER`** vẫn tồn tại ở 9 vị trí trong `src/`. Ai biết chuỗi này đều vào được Settings Panel. Acceptable tạm thời (đã document trong [`docs/security/SECURITY_NOTES.md`](security/SECURITY_NOTES.md)). **Cần Supabase Auth** để thay thế.
- Password `<OLD_APPS_SCRIPT_PASSWORD>` cũ đã lộ trong dist build trước-TASK-0002.6. Cần **rotate** trên Apps Script deployed.
- File `google-apps-script.js` + 2 file legacy (HTML/xlsx) **vẫn trên đĩa dev** với password cũ — không vào git (gitignored).

### 🟡 Business logic gaps
- **Excel formula chưa fix hết cho decal**: Case G (`calculateSheetPrice` — sticker sheet mode + demiCutSurcharge) + Case D (`decalExtra` cho Decal nhựa với fraction) — cần Excel reference bổ sung từ user.
- 3 module khác (small-print, uvdtf, large-print) **chưa kiểm tra Excel gap** — golden tests chỉ lock current behavior, không verify business correctness vs Excel.

### 🟡 Architecture / Cleanup
- **Compat shims** ở `src/utils/{calculator,customerQuote,decalCalculator,largePrintCalculator,uvdtfCalculator}.js` + `src/config/{defaultConfig,decalConfig,largePrintConfig,uvdtfConfig}.js` (9 shim files) — chờ consumer (UI) được update sang module path mới ở phase tương lai.
- **App.jsx vẫn import từ shim** thay vì module path mới. Không bắt buộc fix nhưng nên làm khi UI restructure.
- **2 function trùng tên `calculateFinishingCost`** ở small-print/pricing.js (tier lookup) và large-print/finishing.js (sum operations) — không xung đột (khác module + signature) nhưng có thể confuse khi grep. Đã document.

### 🟢 Quality of life
- **Bundle JS tăng dần** qua các TASK config wire (từ ~319 kB lên 331 kB do schema validation vào bundle). Acceptable nhưng nếu cần optimize có thể dynamic-import schema.
- **localStorage có thể chứa config rác từ trước-Phase-1** — nếu user gặp lỗi load, dùng `?reset` URL param (đã có sẵn trong App.jsx) hoặc nút "Xóa dữ liệu cũ & Tải lại" trong ErrorBoundary.
- **6 vulnerabilities** trong `devDependencies` của Vitest 2.1.9 (5 moderate + 1 high) — **không ảnh hưởng bundle production**, chỉ là dev tooling.

### 🟢 Workflow
- Branch `refactor/large-print-pricing` vẫn còn (chưa xoá ở TASK-0018) — cleanup ở task riêng (TASK-0018.1).

## 8. Phase 2 — Đề xuất

Theo target architecture ([docs/architecture/01-target-architecture.md](architecture/01-target-architecture.md)), Phase 2 sẽ tập trung vào **admin / auth / database / production**:

### Priority 1 — Auth & Admin (critical)
| Task | Mô tả | Mức |
|---|---|---|
| **P2-01: Supabase Auth setup** | Init Supabase project, tạo `auth.users` table, wire email/password login. UI: trang login mới + logout. | 🔴 Cao |
| **P2-02: Role admin via `user_roles` table** | Theo [`supabase-schema-draft.md`](database/supabase-schema-draft.md): admin/staff/viewer. Backend check role thay vì frontend password check. | 🔴 Cao |
| **P2-03: Remove `TEMP_ADMIN_PASSWORD_PLACEHOLDER`** từ 9 vị trí trong `src/`. Replace bằng `useAuth()` hook + role check. UI Settings Panel chỉ hiển thị khi `isAdmin`. | 🔴 Cao |
| **P2-04: Rotate password thật** trên Apps Script deployed (vì cũ đã lộ). | 🔴 Cao |

### Priority 2 — Database & Config
| Task | Mô tả | Mức |
|---|---|---|
| **P2-05: Tạo bảng `price_configs` trong Supabase** | Lưu config 4 module: `{id, module, active_version, data jsonb, created_at, updated_at}`. | 🟡 Trung |
| **P2-06: Migrate config từ Apps Script + localStorage → Supabase** | Sync cũ → mới, giữ fallback default. | 🟡 Trung |
| **P2-07: Bảng `price_config_versions`** | Lưu lịch sử mỗi phiên bản: `{id, module, version, data jsonb, created_by, note, created_at}`. | 🟡 Trung |
| **P2-08: Bảng `price_change_logs`** | Log mọi thay đổi: `{id, module, changed_by, old_data jsonb, new_data jsonb, note, created_at}`. | 🟡 Trung |
| **P2-09: Rollback bảng giá UI** | Admin xem version history, restore phiên bản cũ. | 🟢 Thấp |

### Priority 3 — Business value (chờ Excel ref)
| Task | Mô tả | Mức |
|---|---|---|
| **P2-10: Fix decal Excel formula Case G** | `calculateSheetPrice` (sticker sheet + demiCutSurcharge). Cần Excel reference từ user. | 🟡 Trung |
| **P2-11: Fix decal `decalExtra` Case D** | Decal nhựa với fraction — raw vs ceil. Cần Excel reference. | 🟢 Thấp |
| **P2-12: Verify Excel cho 3 module còn lại** | Small-print / uvdtf / large-print có thể có gap tương tự — cần Excel ref. | 🟢 Thấp |

### Priority 4 — Production readiness
| Task | Mô tả | Mức |
|---|---|---|
| **P2-13: CI/CD pipeline** | GitHub Actions: lint, test, build, deploy preview trên Vercel. | 🟡 Trung |
| **P2-14: Production deploy checklist** | Env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), backup config, monitoring. | 🟡 Trung |
| **P2-15: Audit shim layers** — xoá `src/utils/*.js` + `src/config/*.js` shims sau khi UI update | 🟢 Thấp |
| **P2-16: Migrate App.jsx + components sang module path mới** | Bỏ shim dependency. | 🟢 Thấp |

### Deploy production checklist (gợi ý)

```
[ ] Supabase project created (auth + tables migrated)
[ ] Env vars set trên Vercel (no plaintext secrets in code)
[ ] Password Apps Script rotated (cũ đã lộ)
[ ] localStorage migration path tested (cho user cũ)
[ ] Admin can login + change password
[ ] Admin can view price change logs
[ ] Admin can rollback to previous version
[ ] Non-admin user cannot access Settings Panel
[ ] Cloud config sync works (Supabase + fallback)
[ ] `npm test` 345+ pass trong CI
[ ] `npm run build` exit 0 trong CI
[ ] Production smoke test: 4 module flow (decal, small-print, uvdtf, large-print)
[ ] Backup decal/print/uvdtf/large-print config trước go-live
[ ] Excel reconciliation cho ít nhất Case C decal (đã làm) + 1 case mỗi module
[ ] Monitoring + error tracking (e.g., Sentry)
```

### Khuyến nghị task Phase 2 đầu tiên

**P2-01: Supabase Auth setup** — đây là foundation cho mọi việc về sau (P2-02 role check, P2-05 database, P2-07 audit log). Không phụ thuộc Excel reference, không phụ thuộc business gap. Có thể bắt đầu ngay.

Pattern recommendations cho P2-01:
- Tạo branch `refactor/supabase-auth`
- Cài `@supabase/supabase-js`
- Setup Supabase project (auth provider email/password)
- Tạo `src/lib/supabaseClient.js` (init client với env vars)
- Tạo `src/hooks/useAuth.js` (signIn/signOut/session)
- Tạo `src/components/LoginPage.jsx`
- Wire `App.jsx` để check auth trước khi render UI
- Test: smoke test login + logout (jsdom env hoặc mock)

---

## Kết

Phase 1 hoàn thành mục tiêu **tách UI / pricing engine / config / admin / storage** theo workflow software company. 4/4 module pricing có cấu trúc đồng nhất, được khóa bởi 345 golden tests, có schema validation chống data rác, có UI guard chống save xấu. 5 milestone tags làm điểm rollback an toàn.

Phase 2 sẽ chuyển trọng tâm sang **auth & database** để hoàn thành kiến trúc target (admin chỉnh bảng giá trên frontend nhưng config lưu trong database, có lịch sử thay đổi, có role-based access control).

Repo sẵn sàng cho phase 2.
