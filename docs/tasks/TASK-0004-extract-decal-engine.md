# Báo cáo: TASK-0004 — Extract decal engine

| Trường | Giá trị |
|---|---|
| Ngày thực hiện | 2026-05-28 |
| Branch | `refactor/pricing-engine` |
| Trạng thái | ✅ Done |
| Loại task | Refactor cấu trúc (không đổi behavior) |

## 1. Mục tiêu

Tách engine decal từ file đơn lẻ `src/utils/decalCalculator.js` sang module mới `src/modules/decal/` theo kiến trúc software company (xem [docs/architecture/02-module-boundaries.md](../architecture/02-module-boundaries.md)). **Không đổi formula, không đổi return value của function public**.

## 2. Cấu trúc trước/sau

**Trước:**
```
src/utils/decalCalculator.js   (173 dòng, mix layout+pricing+priceTables)
src/config/decalConfig.js
```

**Sau:**
```
src/modules/decal/
├── engine/
│   ├── layout.js          — 70 dòng (private helpers + 2 public)
│   ├── pricing.js         — 56 dòng (private helpers + 2 public)
│   ├── priceTables.js     — 47 dòng (2 public)
│   └── index.js           — barrel export 6 public functions
├── config/
│   └── index.js           — re-export DECAL_DEFAULT_CONFIG
└── README.md

src/utils/decalCalculator.js   — 18 dòng (compatibility shim)
src/config/decalConfig.js      — UNCHANGED
```

## 3. Cách phân chia

| File mới | Chứa |
|---|---|
| `engine/layout.js` | Private: `getPrintableArea`, `calculateGridLayout`, `calculateHexagonalLayout`<br>Public: `calculateStickersPerSheet`, `calculateSheetsPerPrintSheet` |
| `engine/pricing.js` | Private: `calculateProgressivePrice`, `getPriceMultiplier`, `getDemiCutSurchargePercent`<br>Public: `calculateSingleStickerPrice`, `calculateSheetPrice` |
| `engine/priceTables.js` | Public: `generateSinglePriceTable`, `generateSheetPriceTable` (import từ pricing.js) |
| `engine/index.js` | Barrel re-export tất cả 6 public function |
| `config/index.js` | Re-export `DECAL_DEFAULT_CONFIG` (chưa di chuyển file gốc) |

## 4. Compatibility

`src/utils/decalCalculator.js` được thay thành thin shim:
```js
export {
    calculateStickersPerSheet, calculateSheetsPerPrintSheet,
    calculateSingleStickerPrice, calculateSheetPrice,
    generateSinglePriceTable, generateSheetPriceTable,
} from '../modules/decal/engine/index.js';
```

→ [src/App.jsx](../../src/App.jsx) và các UI component cũ KHÔNG cần đổi import.
→ Test golden cũ KHÔNG cần đổi import.

## 5. Verification

```
npm test:
  ✓ tests/sanity.test.js                       (2 tests)
  ✓ tests/golden/decal.golden.test.js          (20 tests)
  ✓ tests/golden/decal.extra.golden.test.js    (12 tests)
  ✓ tests/golden/decal.module.test.js          (5 tests — mới)  ← TASK-0004
  ↓ tests/golden/decal.reference.todo.test.js  (6 skipped)

39 passed + 6 skipped (45 total)

npm run build:
  ✓ 55 modules transformed (giảm cha mẹ trước được +3 do thêm module mới)
  ✓ built in ~1.4s
  bundle size: ~319.7 kB JS (gần như không đổi)
```

## 6. Không làm ở task này

| | Lý do |
|---|---|
| Sửa công thức (Excel gap) | User cấm. Sẽ làm ở task riêng sau TASK-0004. |
| Đổi return value của 6 public function | User cấm. Nếu cần API breakdown, tạo function MỚI (`calculateDecalPriceBreakdown()`) ở task khác. |
| Di chuyển `src/config/decalConfig.js` | Tránh đụng các nơi đang import config cũ. TASK-0005 sẽ xử lý. |
| Sửa UI `src/components/decal/` | UI vẫn dùng shim `src/utils/decalCalculator.js`. |
| Un-skip `decal.reference.todo.test.js` | User cấm. |

## 7. Rủi ro còn lại

| # | Vấn đề | Mức |
|---|---|---|
| 1 | Compat shim cần được xoá ở task cleanup tương lai khi tất cả import được cập nhật | 🟢 Thấp |
| 2 | Excel gap vẫn còn (1.100đ base + 250đ lam) — chưa fix | 🟡 Trung |
| 3 | `customerQuote.js`, `cloudSync.js`, các module khác (smallprint, largeprint, uvdtf) chưa được extract tương tự | 🟢 Thấp (sẽ làm khi đến lượt) |

## 8. Bước tiếp theo

Có 2 hướng đi tiếp:

- **A. TASK-0005**: config schema/version (đã có spec ở [tasks/TASK-0005-config-schema.md](../../tasks/TASK-0005-config-schema.md)) — tách config decal vào module mới, thêm version. **Khuyến nghị làm trước** vì giúp các fix sau sạch hơn.
- **B. Task riêng "Fix decal formula khớp Excel"** — un-skip [decal.reference.todo.test.js](../../tests/golden/decal.reference.todo.test.js); chấp nhận Case C trong [decal.golden.test.js](../../tests/golden/decal.golden.test.js) sẽ fail và cần cập nhật.
