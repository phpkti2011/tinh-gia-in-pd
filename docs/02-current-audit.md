# Baseline Audit — Hiện trạng dự án `tinh-gia-in`

> Tài liệu sinh bởi **TASK-0001-baseline-audit**. Chỉ mô tả hiện trạng, **không đề xuất sửa code, không đổi công thức**. Mọi tham chiếu dạng `path:line` đều click được trong IDE.

Ngày audit: 2026-05-28.
Build verify: `npm run build` — PASS (xem mục 8).

---

## 1. Tổng quan dự án

| Mục | Giá trị |
|---|---|
| Loại dự án | React SPA tính giá in ấn cho 4 module (small-print, large-print, decal, uvdtf) |
| Framework | React 18.2.0 + React DOM 18.2.0 |
| Build tool | Vite (declared `^5.2.0`, installed 5.4.21) |
| Styling | Tailwind CSS 3.4.3 + PostCSS 8.4.38 + Autoprefixer 10.4.19 |
| Icon | lucide-react 0.368.0 |
| Ngôn ngữ | JavaScript (JSX) — **không có TypeScript** |
| Testing | **Không có** test framework |
| Linting | **Không có** ESLint / Prettier |
| Git | **Chưa init repo** (không có thư mục `.git`) |
| Triển khai | Vercel (có [.vercel/project.json](.vercel/project.json) cho `tinh-gia-in`) |
| Cloud config storage | Google Apps Script (URL fix sẵn trong `cloudSync.js`) |
| Local fallback | `localStorage` (4 key: `printConfig`, `largePrintConfig`, `decalConfig`, `uvdtfConfig`) |

Entry points:
- HTML: [index.html](../index.html) — title "Công Cụ Tính Giá In Ấn", lang `vi`, mount `<div id="root">`.
- JS: [src/main.jsx](../src/main.jsx) — render `<App />` (10 dòng).
- App root: [src/App.jsx](../src/App.jsx) — 467 dòng, chứa `HomePage` + 4 module wrapper + `ErrorBoundary` + auto-reset hook.

Phụ thuộc khác (chỉ tham khảo, **không phải secret**):
- `google-apps-script.js` ở root: code Apps Script tham khảo, không bundle vào React.
- `tinh gia ep nhu + tinh cuon nhu_v189.249 (1).html`, `Tinh-gia-decal 12-7-2024 (3).xlsx`: file legacy, không tham gia build.
- `.env.local`: chứa JWT token Vercel OIDC (đã được `.gitignore` bỏ qua).

---

## 2. Cây thư mục hiện tại (depth 3, bỏ `node_modules/`, `dist/`)

```
tinh-gia-in/
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── .gitignore                    (chỉ gitignore .vercel, .env*.local)
├── .env.local                    (token Vercel)
├── .vercel/project.json
├── README.md
├── google-apps-script.js
├── tinh gia ep nhu + tinh cuon nhu_v189.249 (1).html   (legacy)
├── Tinh-gia-decal 12-7-2024 (3).xlsx                   (legacy)
│
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   ├── config/
│   │   ├── defaultConfig.js          (in KTS nhỏ — 223 dòng)
│   │   ├── largePrintConfig.js       (44 dòng)
│   │   ├── decalConfig.js            (53 dòng)
│   │   └── uvdtfConfig.js            (12 dòng)
│   ├── utils/
│   │   ├── calculator.js             (516 dòng — engine in KTS)
│   │   ├── largePrintCalculator.js   (186 dòng — engine khổ lớn)
│   │   ├── decalCalculator.js        (173 dòng — engine decal)
│   │   ├── uvdtfCalculator.js        (57  dòng — engine UV DTF)
│   │   ├── customerQuote.js          (118 dòng — quote khách hàng cho in KTS)
│   │   ├── configStorage.js          (223 dòng — load/save 4 module config)
│   │   ├── cloudSync.js              (94  dòng — Google Apps Script API)
│   │   └── canvasRenderer.js         (193 dòng — vẽ sơ đồ xếp hình)
│   └── components/
│       ├── CloudSetup.jsx            (UI nhập Apps Script URL)
│       ├── smallprint/
│       │   ├── InputPanel.jsx        (253 dòng)
│       │   ├── ResultPanel.jsx       (383 dòng)
│       │   ├── SettingsPanel.jsx     (563 dòng — admin lớn nhất)
│       │   └── SheetVisualizer.jsx   (207 dòng)
│       ├── largeprint/
│       │   ├── LPInputPanel.jsx      (150 dòng)
│       │   ├── LPResultPanel.jsx     (214 dòng)
│       │   └── LPSettingsPanel.jsx   (404 dòng)
│       ├── decal/
│       │   ├── DecalInputPanel.jsx   (367 dòng)
│       │   ├── DecalResultPanel.jsx  (338 dòng)
│       │   └── DecalSettingsPanel.jsx (268 dòng)
│       └── uvdtf/
│           ├── UvdtfInputPanel.jsx
│           ├── UvdtfResultPanel.jsx  (188 dòng)
│           └── UvdtfSettingsPanel.jsx (240 dòng)
│
├── docs/
│   ├── 02-current-audit.md           (← file này)
│   ├── tasks/TASK-0001-baseline-audit.md   (báo cáo task — sinh ra task này)
│   ├── architecture/{01-target-architecture, 02-module-boundaries}.md
│   ├── pricing-rules/{00-golden-test-cases, decal, large-print, small-print, uvdtf}.md
│   ├── database/supabase-schema-draft.md
│   ├── security/admin-price-management.md
│   └── workflow/00-how-to-start.md
├── tasks/        (TASK-0001..0006 specs ngắn)
├── rules/        (AI_WORKFLOW_RULES.md, CODING_RULES.md)
├── prompts/      (START_WITH_CLAUDE, NEXT_TASK_TEMPLATE)
└── skills/       (admin-config, golden-tests, pricing-engine)
```

---

## 3. Bốn module tính giá — bảng đối chiếu

| Module | Config (default) | Engine (logic thuần) | UI Input / Result / Settings | localStorage key |
|---|---|---|---|---|
| **small-print** (In KTS khổ nhỏ) | [src/config/defaultConfig.js](../src/config/defaultConfig.js) (223 d) | [src/utils/calculator.js](../src/utils/calculator.js) (516 d) + [customerQuote.js](../src/utils/customerQuote.js) | [smallprint/InputPanel](../src/components/smallprint/InputPanel.jsx), [ResultPanel](../src/components/smallprint/ResultPanel.jsx), [SettingsPanel](../src/components/smallprint/SettingsPanel.jsx) | `printConfig` |
| **large-print** (In khổ lớn) | [src/config/largePrintConfig.js](../src/config/largePrintConfig.js) | [src/utils/largePrintCalculator.js](../src/utils/largePrintCalculator.js) (186 d) | [largeprint/LPInputPanel](../src/components/largeprint/LPInputPanel.jsx), [LPResultPanel](../src/components/largeprint/LPResultPanel.jsx), [LPSettingsPanel](../src/components/largeprint/LPSettingsPanel.jsx) | `largePrintConfig` |
| **decal** (Tem / Sticker) | [src/config/decalConfig.js](../src/config/decalConfig.js) | [src/utils/decalCalculator.js](../src/utils/decalCalculator.js) (173 d) | [decal/DecalInputPanel](../src/components/decal/DecalInputPanel.jsx), [DecalResultPanel](../src/components/decal/DecalResultPanel.jsx), [DecalSettingsPanel](../src/components/decal/DecalSettingsPanel.jsx) | `decalConfig` |
| **uvdtf** (In UV DTF mét tới) | [src/config/uvdtfConfig.js](../src/config/uvdtfConfig.js) | [src/utils/uvdtfCalculator.js](../src/utils/uvdtfCalculator.js) (57 d) | [uvdtf/UvdtfInputPanel](../src/components/uvdtf/UvdtfInputPanel.jsx), [UvdtfResultPanel](../src/components/uvdtf/UvdtfResultPanel.jsx), [UvdtfSettingsPanel](../src/components/uvdtf/UvdtfSettingsPanel.jsx) | `uvdtfConfig` |

Routing: [src/App.jsx:453-465](../src/App.jsx#L453-L465) — `useState('home')` chuyển giữa 4 module + Home. Không dùng react-router.

---

## 4. File chứa logic chính — chi tiết hàm (đã verify line numbers)

### 4.1 `src/utils/calculator.js` (engine in KTS nhỏ, 516 dòng)

| Hàm | Dòng | Vai trò |
|---|---|---|
| `getClicks(h, printer)` | [1–6](../src/utils/calculator.js#L1) | Tra số click theo chiều cao tờ in |
| `getProfitMargin(cost, config)` | [8–11](../src/utils/calculator.js#L8) | Tra margin theo giá vốn |
| `getPrintableArea(...)` | [13–33](../src/utils/calculator.js#L13) | Trừ lề vùng in (custom / digital / VK / non-VK) |
| `calculateImposition(...)` | [35–69](../src/utils/calculator.js#L35) | Xếp hình tối ưu (thử 2 hướng xoay) |
| `calculateLamination(...)` | [71–87](../src/utils/calculator.js#L71) | Tính cán màng + cảnh báo vượt khổ màng |
| `calculateVariableDataCost(...)` | [89–97](../src/utils/calculator.js#L89) | Phụ thu data biến đổi (tiers 500/1000/1000+) |
| `calculatePrintContentSurcharge(...)` | [99–117](../src/utils/calculator.js#L99) | Phụ thu nhiều nội dung |
| `calculateFinishingCost(...)` | [119–141](../src/utils/calculator.js#L119) | Pricing tier (cost + customer) cho đục lỗ / cấn / bồi / bế |
| `calculateDieCuttingCosts(...)` | [143–220](../src/utils/calculator.js#L143) | Bế: switch 4 loại mold (simple / envelope / box / bag / tag) |
| `calculateMaxCuttableSheetsLayout(...)` | [222–292](../src/utils/calculator.js#L222) | Tối ưu cắt tờ lớn → tờ press (solveSimple + solveMixed) |
| `processSheet(...)` | [294–323](../src/utils/calculator.js#L294) | Pipeline tổng hợp 1 phương án (paper + print + lamination) |
| `calculateDecalOptions(...)` | [325–361](../src/utils/calculator.js#L325) | Nhánh decal (pricing per m²) |
| `calculatePerSheetOptions(...)` | [363–391](../src/utils/calculator.js#L363) | Nhánh giấy bán per_sheet (decal xi cố định 33x48) |
| `calculatePaperOptions(...)` | [393–460](../src/utils/calculator.js#L393) | Nhánh giấy bán theo ream + giấy mỹ thuật custom |
| `calculateFoilStamping(...)` | [462–516](../src/utils/calculator.js#L462) | Ép kim (cuộn nhũ + khuôn) |

### 4.2 `src/utils/largePrintCalculator.js` (186 dòng)

| Hàm | Dòng | Vai trò |
|---|---|---|
| `calculateFormexCost(...)` | [1–13](../src/utils/largePrintCalculator.js#L1) | Bồi formex + chiết khấu theo m² |
| `calculateFinishingCost(...)` ⚠️ | [15–39](../src/utils/largePrintCalculator.js#L15) | **Trùng tên** với `calculator.js` nhưng signature/logic khác (tham số `totalArea, params, config`) — chỉ scoped trong file |
| `calcItemOnRoll(...)` | [42–61](../src/utils/largePrintCalculator.js#L42) | Chi phí 1 tấm trên 1 khổ cuộn cụ thể |
| `optimizeItemOnRoll(...)` | [64–88](../src/utils/largePrintCalculator.js#L64) | Thử 2 hướng xoay, chọn rẻ hơn |
| `calculateLargePrint(...)` | [90–186](../src/utils/largePrintCalculator.js#L90) | Pipeline tổng: loop items × loop khổ cuộn, cộng formex + finishing + standee |

### 4.3 `src/utils/decalCalculator.js` (173 dòng)

| Hàm | Dòng | Vai trò |
|---|---|---|
| `getPrintableArea(...)` (private) | [2–10](../src/utils/decalCalculator.js#L2) | Trừ lề ngắn / dài |
| `calculateGridLayout(...)` (private) | [13–18](../src/utils/decalCalculator.js#L13) | Xếp lưới chữ nhật / oval |
| `calculateHexagonalLayout(...)` (private) | [21–38](../src/utils/decalCalculator.js#L21) | Xếp hex cho hình tròn |
| `calculateStickersPerSheet(...)` | [41–59](../src/utils/decalCalculator.js#L41) | Tem / tờ in (export) |
| `calculateProgressivePrice(...)` (private) | [62–73](../src/utils/decalCalculator.js#L62) | **Pricing lũy tiến — từng tier có giá per-sheet riêng, không cộng dồn tổng** |
| `getPriceMultiplier(...)` (private) | [76–81](../src/utils/decalCalculator.js#L76) | Hệ số quy đổi theo diện tích sheet |
| `calculateSingleStickerPrice(...)` | [84–93](../src/utils/decalCalculator.js#L84) | Giá tem lẻ (export) |
| `getDemiCutSurchargePercent(...)` (private) | [96–101](../src/utils/decalCalculator.js#L96) | % phụ thu bế demi theo số sticker |
| `calculateSheetsPerPrintSheet(...)` | [104–113](../src/utils/decalCalculator.js#L104) | Tờ sticker / tờ in (export) |
| `calculateSheetPrice(...)` | [116–127](../src/utils/decalCalculator.js#L116) | Giá tờ sticker (export) |
| `generateSinglePriceTable(...)` | [130–150](../src/utils/decalCalculator.js#L130) | Sinh bảng giá tem lẻ (20 mốc × 100) + custom qty |
| `generateSheetPriceTable(...)` | [153–172](../src/utils/decalCalculator.js#L153) | Sinh bảng giá tờ sticker |

### 4.4 `src/utils/uvdtfCalculator.js` (57 dòng)

Chỉ 1 hàm export `calculateUvDtf(params, config)` ([1–57](../src/utils/uvdtfCalculator.js#L1)): thử 2 hướng xoay trên khổ cuộn 55 cm / vùng in 53 cm → chọn ngắn hơn → tra `priceTiers` theo mét → áp `minBillableMeters`.

### 4.5 Shared helpers

- [src/utils/customerQuote.js](../src/utils/customerQuote.js) (118 dòng): tính giá bán khách cho in KTS nhỏ. Quy đổi tờ press → trang A4 theo `A4_CONVERSION_RATES`, áp `CUSTOMER_PRICE_TIERS`, cộng phụ thu giấy + ép kim + nội dung. **Hằng số `A4_REFERENCE_HEIGHT = 21.2`, `A4_CONVERSION_BASE_HEIGHT = 21.0`** ở [dòng 9–10](../src/utils/customerQuote.js#L9) hardcode trong code (không trong config).
- [src/utils/configStorage.js](../src/utils/configStorage.js) (223 dòng): 4 cặp `loadXxxConfig` / `saveXxxConfig` đồng bộ + `loadConfigFromCloud` / `saveConfigToCloud` bất đồng bộ; `isValidConfig` ([16–42](../src/utils/configStorage.js#L16)) kiểm tra key thiết yếu; `mergeDeep` ([104–127](../src/utils/configStorage.js#L104)) với danh sách array key đặc biệt được clone từ source.
- [src/utils/cloudSync.js](../src/utils/cloudSync.js) (94 dòng): wrapper GET/POST Apps Script + `restoreInfinity` ([21–35](../src/utils/cloudSync.js#L21)) chuyển `null → Infinity` cho key `upTo / max / max_cost / max_qty / maxArea / maxMeters`.
- [src/utils/canvasRenderer.js](../src/utils/canvasRenderer.js): vẽ sơ đồ xếp hình (UI helper, không tham gia tính giá).

---

## 5. Storage & cloud sync

**3 lớp ưu tiên** khi load config (ví dụ `loadConfigFromCloud('printConfig')` ở [configStorage.js:45–74](../src/utils/configStorage.js#L45)):

```
1. Cloud (Google Apps Script)  ── fetchCloudConfig() ──┐
2. localStorage[key]            ── restoreInfinity() ──┤── isValidConfig() ──► dùng
3. DEFAULT_CONFIG (file .js)    ── deep clone        ──┘
```

Khi lưu (`saveConfigToCloud`, [configStorage.js:77–98](../src/utils/configStorage.js#L77)):
- **Luôn** ghi `localStorage[key]` trước.
- Nếu `isCloudEnabled()` và có `password` → POST lên Apps Script.

**URL Apps Script:**
- Hằng số `DEFAULT_APPS_SCRIPT_URL` hardcoded ở [cloudSync.js:4](../src/utils/cloudSync.js#L4): `https://script.google.com/macros/s/AKfycbxkiJMGUHInjYV1FP29BwNh6yeY2_bVc4_c6pYS1jHp3ZKFsiKeSKe0UuyBnWArl4mA/exec`.
- Có thể override bằng `localStorage['appsScriptUrl']` (qua component [CloudSetup.jsx](../src/components/CloudSetup.jsx)).

**JSON ↔ Infinity workaround:** [cloudSync.js:26](../src/utils/cloudSync.js#L26) trả `Infinity` khi value là `null` và key thuộc whitelist (`upTo`, `max`, `max_cost`, `max_qty`, `maxArea`, `maxMeters`). Không có giải pháp toàn diện (key khác có `Infinity` sẽ mất).

**ErrorBoundary tự xoá cache:** [App.jsx:400–435](../src/App.jsx#L400-L435) hiển thị nút "Xóa dữ liệu cũ & Tải lại" khi render lỗi → `removeItem` cả 4 key.

**Auto-reset qua URL:** [App.jsx:438–451](../src/App.jsx#L438-L451) — `?reset` xoá toàn bộ localStorage rồi reload.

---

## 6. Vấn đề kiến trúc cần ghi nhận (chỉ ghi, KHÔNG sửa)

### 6.1 Hardcoded admin password `[REDACTED — sanitized in TASK-0002.6, xem docs/security/SECURITY_NOTES.md]`

Xuất hiện ở **9 vị trí frontend** (đã grep verify):

| File | Dòng | Ngữ cảnh |
|---|---|---|
| [src/components/smallprint/ResultPanel.jsx:5](../src/components/smallprint/ResultPanel.jsx#L5) | const `ADMIN_PASSWORD` |
| [src/components/smallprint/SettingsPanel.jsx:53](../src/components/smallprint/SettingsPanel.jsx#L53) | `if (password === '...')` |
| [src/components/largeprint/LPSettingsPanel.jsx:46](../src/components/largeprint/LPSettingsPanel.jsx#L46) | password check |
| [src/components/decal/DecalSettingsPanel.jsx:36](../src/components/decal/DecalSettingsPanel.jsx#L36) | password check |
| [src/components/uvdtf/UvdtfSettingsPanel.jsx:46](../src/components/uvdtf/UvdtfSettingsPanel.jsx#L46) | password check |
| [src/App.jsx:168](../src/App.jsx#L168) | `saveConfigToCloud('printConfig', …, '...')` |
| [src/App.jsx:242](../src/App.jsx#L242) | `saveConfigToCloud('largePrintConfig', …)` |
| [src/App.jsx:333](../src/App.jsx#L333) | `saveConfigToCloud('decalConfig', …)` |
| [src/App.jsx:394](../src/App.jsx#L394) | `saveConfigToCloud('uvdtfConfig', …)` |

> Vi phạm trực tiếp **CODING_RULES #3** ("Không hardcode password/token/secret trong frontend") và [docs/security/admin-price-management.md](security/admin-price-management.md). Password lộ trong cả `src/` lẫn bundle `dist/assets/index-*.js`.

### 6.2 Magic numbers / hằng số nhúng cứng trong engine

| File | Dòng | Giá trị | Ý nghĩa |
|---|---|---|---|
| [calculator.js:188](../src/utils/calculator.js#L188) | `0.4` | spacing 4 mm khi bế tag |
| [calculator.js:189](../src/utils/calculator.js#L189) | `32.2` | rộng press cho tag |
| [calculator.js:191](../src/utils/calculator.js#L191) | `3` | số tag theo chiều cao mold |
| [calculator.js:326](../src/utils/calculator.js#L326) | `[32.2, 33.0]` | khổ press decal |
| [calculator.js:420](../src/utils/calculator.js#L420) | `48` | ngưỡng "sản phẩm lớn" |
| [calculator.js:427-428](../src/utils/calculator.js#L427) | `32.2, 120.0` | fallback rộng / cao tối đa khi không có printer config |
| [customerQuote.js:9-10](../src/utils/customerQuote.js#L9) | `21.2`, `21.0` | chiều cao tham chiếu / cơ sở quy đổi A4 |
| [customerQuote.js:20-22](../src/utils/customerQuote.js#L20) | `76 / 91 / fallback 5` | mốc quy đổi A4 cho khổ > 48 cm |
| [App.jsx:106-107](../src/App.jsx#L106) | `0.4`, `0.6` | spacing bế mold / digital |

Phần lớn magic number có thể move vào config nhưng hiện sống trong code — **bất kỳ thay đổi nào đều cần golden test trước**.

### 6.3 Trùng tên hàm `calculateFinishingCost`

- [calculator.js:119](../src/utils/calculator.js#L119) — signature `(quantity, type, configData)`, dùng cho hole-punch / crease / mount / die-cut labor.
- [largePrintCalculator.js:15](../src/utils/largePrintCalculator.js#L15) — signature `(totalArea, params, config)`, **không export** (scoped trong file), dùng cho dán biên / khoen / bế khổ lớn.

Hiện không xung đột vì khác scope, nhưng vi phạm "single source of truth" và dễ nhầm khi refactor.

### 6.4 Component admin / kết quả quá dài (smell)

| File | Dòng | Nội dung |
|---|---|---|
| [smallprint/SettingsPanel.jsx](../src/components/smallprint/SettingsPanel.jsx) | 563 | Form chỉnh ~12 nhóm cấu hình in KTS |
| [smallprint/ResultPanel.jsx](../src/components/smallprint/ResultPanel.jsx) | 383 | Hiển thị + breakdown + giá khách (có 1 const password ở dòng 5) |
| [largeprint/LPSettingsPanel.jsx](../src/components/largeprint/LPSettingsPanel.jsx) | 404 | Form khổ lớn |
| [decal/DecalInputPanel.jsx](../src/components/decal/DecalInputPanel.jsx) | 367 | Input decal (2 mode) |
| [decal/DecalResultPanel.jsx](../src/components/decal/DecalResultPanel.jsx) | 338 | Bảng giá decal |
| [decal/DecalSettingsPanel.jsx](../src/components/decal/DecalSettingsPanel.jsx) | 268 | Form decal |

### 6.5 Engine chưa phải pure function tuyệt đối

- `calculator.js` không import side-effect (sạch).
- `decalCalculator.js`, `uvdtfCalculator.js`, `largePrintCalculator.js` không import React/DOM/storage (sạch).
- ✅ Engine khả thi để test pure khi có framework.
- ⚠ `customerQuote.js` import từ `calculator.js` ([dòng 1](../src/utils/customerQuote.js#L1)) — vẫn pure nhưng cần lưu ý coupling khi extract module decal.

### 6.6 Thiếu hạ tầng chất lượng

- **Không có schema/version cho config** → vi phạm CODING_RULES #7. `isValidConfig` ([configStorage.js:16](../src/utils/configStorage.js#L16)) chỉ check sự tồn tại key, không validate kiểu dữ liệu / khoảng giá trị / version.
- **Không có test framework** → không thể golden-test trước khi tách engine.
- **Không có ESLint/Prettier** → style code không nhất quán.
- **Chưa init Git** → không có rollback theo task; toàn bộ history dựa vào file system. Workflow [docs/workflow/00-how-to-start.md](workflow/00-how-to-start.md) yêu cầu Git nhưng chưa thực thi.

### 6.7 Vấn đề khác

- **Cloud URL hardcoded** ([cloudSync.js:4](../src/utils/cloudSync.js#L4)) — không phải secret nhưng nên di chuyển ra `.env` / config admin.
- **Infinity ↔ JSON workaround whitelist** ([cloudSync.js:26](../src/utils/cloudSync.js#L26)) — dễ vỡ nếu thêm key mới chứa `Infinity` (ví dụ `maxSqm`).
- **Không có error boundary cho từng module** — chỉ có 1 ErrorBoundary cấp App ([App.jsx:400](../src/App.jsx#L400)) reset toàn bộ localStorage khi user bấm.
- **`.env.local` chứa JWT Vercel OIDC** đã được `.gitignore` — không lộ qua git, nhưng nằm cùng cây thư mục.
- **`google-apps-script.js`** ở root: code Apps Script tham khảo, không bundle.

---

## 7. Gap so với target architecture

### 7.1 Cấu trúc thư mục: hiện tại vs mục tiêu ([docs/architecture/01-target-architecture.md](architecture/01-target-architecture.md))

| Hiện tại | Mục tiêu |
|---|---|
| `src/components/<module>/` | `src/modules/<module>/ui/` |
| `src/utils/<module>Calculator.js` | `src/modules/<module>/engine/calculate*.js` (tách hàm con) |
| `src/config/<module>Config.js` | `src/modules/<module>/config/default*Config.js` + `*ConfigSchema.js` |
| _(không có)_ | `src/modules/<module>/tests/<module>.golden.test.js` |
| Admin panel tách rời trong từng module | `src/admin/{ui, services, config-editor}` |
| `src/utils/configStorage.js`, `cloudSync.js` | `src/shared/{config, database, auth}` |
| Hardcoded password trong UI | `src/shared/auth` + database role check |

### 7.2 Tuân thủ CODING_RULES (`rules/CODING_RULES.md`)

| # | Rule | Tuân thủ? | Ghi chú |
|---|---|---|---|
| 1 | Không đổi công thức nếu task không yêu cầu | N/A (chưa refactor) | TASK-0001 không sửa code |
| 2 | Không sửa nhiều module trong 1 task | N/A | TASK-0001 chỉ audit |
| 3 | **Không hardcode password/token/secret trong frontend** | ❌ KHÔNG | 9 vị trí password (mục 6.1) |
| 4 | Không gọi database trực tiếp trong pricing engine | ✅ ĐẠT | Engine không import storage |
| 5 | Engine phải là pure function | ⚠ GẦN ĐẠT | Khả thi pure, chưa có test xác nhận |
| 6 | UI không chứa công thức tính giá | ✅ ĐẠT phần lớn | Tính toán đã ở `utils/`; còn `App.jsx` lo orchestration |
| 7 | **Config phải có schema/version** | ❌ KHÔNG | Chỉ check key tồn tại, không version |
| 8 | Sau mỗi task phải chạy build | ✅ ĐẠT | TASK-0001 đã chạy (mục 8) |
| 9 | Nếu có test thì chạy test | N/A | Không có test |
| 10 | Báo cáo rõ file đã sửa | ✅ ĐẠT | [docs/tasks/TASK-0001-baseline-audit.md](tasks/TASK-0001-baseline-audit.md) |

---

## 8. Kết quả `npm run build`

```
> tinh-gia-in@1.0.0 build
> vite build

vite v5.4.21 building for production...
transforming...
✓ 55 modules transformed.
rendering chunks...
computing gzip size...
dist/index.html                 0.46 kB │ gzip: 0.33 kB
dist/assets/index-CGXBtwM9.css  32.46 kB │ gzip: 6.22 kB
dist/assets/index-58SiIv15.js   319.63 kB │ gzip: 86.05 kB
✓ built in 3.21s
```

- ✅ Exit code 0, không warning.
- 55 module transformed, 1 chunk JS duy nhất 319.63 kB (gzip 86.05 kB) — chưa code-split.
- CSS 32.46 kB chủ yếu từ Tailwind (đã purge theo `tailwind.config.js`).

---

## 9. Khuyến nghị thứ tự task tiếp theo

Các task spec đã có sẵn trong [tasks/](../tasks/). Đề xuất giữ nguyên thứ tự:

1. **TASK-0002**: thêm Vitest (test framework chạy được trên Vite). Điều kiện bắt buộc trước khi đụng engine.
2. **TASK-0003**: viết golden test cho **decal** (module được [docs/pricing-rules/decal.md](pricing-rules/decal.md) khuyến nghị ưu tiên vì "dễ sai nhất"). Output cố định trước khi refactor.
3. **TASK-0004**: extract `decal/engine/*` theo [docs/architecture/02-module-boundaries.md](architecture/02-module-boundaries.md). Vẫn không đổi công thức — chỉ tách file & restructure.
4. **TASK-0005**: định nghĩa config schema + version (giải quyết CODING_RULES #7).
5. **TASK-0006**: thiết kế lại admin UI (chuẩn bị tách auth khỏi frontend).

**Việc nên làm thêm ngoài 6 task hiện có** (đề xuất, chưa có spec):
- Init Git repo + branch `refactor/software-company-architecture` (đáp ứng [docs/workflow/00-how-to-start.md](workflow/00-how-to-start.md)).
- Rotate password `[REDACTED — sanitized in TASK-0002.6, xem docs/security/SECURITY_NOTES.md]` đã lộ trong dist build cũ (sau khi tách auth ở TASK-0006).
- Audit kỹ hơn 3 module còn lại (small-print, large-print, uvdtf) khi đến lượt golden test của từng module.
