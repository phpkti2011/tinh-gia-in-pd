# Module: decal

Tách từ `src/utils/decalCalculator.js` ở TASK-0004.

## Cấu trúc

```
src/modules/decal/
├── engine/
│   ├── layout.js        — getPrintableArea, calculateGridLayout,
│   │                      calculateHexagonalLayout (private)
│   │                      + calculateStickersPerSheet,
│   │                        calculateSheetsPerPrintSheet (public)
│   ├── pricing.js       — calculateProgressivePrice, getPriceMultiplier,
│   │                      getDemiCutSurchargePercent (private)
│   │                      + calculateSingleStickerPrice,
│   │                        calculateSheetPrice (public)
│   ├── priceTables.js   — generateSinglePriceTable,
│   │                      generateSheetPriceTable (public)
│   └── index.js         — barrel export 6 public functions
├── config/
│   └── index.js         — re-export DECAL_DEFAULT_CONFIG (sẽ tách thật
│                          khi có schema ở TASK-0005)
└── README.md            — file này
```

## Nguyên tắc engine

- Engine PURE: không React, DOM, storage, alert, fetch, localStorage.
- Đầu vào: input + config object.
- Đầu ra hiện tại: số (total price) hoặc object layout.
  - **Lưu ý**: chưa có breakdown object `{itemsPerSheet, sheetCount, basePrintPrice, laminationFee, ...}` như spec [docs/pricing-rules/decal.md](../../../docs/pricing-rules/decal.md) đề xuất. Task sau có thể thêm `calculateDecalPriceBreakdown()` mới mà KHÔNG đổi return của các function hiện tại.

## Compatibility

`src/utils/decalCalculator.js` vẫn tồn tại làm thin re-export shim
để UI ở `src/components/decal/` và `src/App.jsx` không cần đổi import.

```
+----------------+      +----------------------------+
| src/App.jsx    |----->| src/utils/decalCalculator  |
| (UI hiện tại)  |      | (compat shim — re-export)  |
+----------------+      +-----------+----------------+
                                    |
+----------------+                  v
| tests/golden/  |----->+----------------------------+
| decal.golden.* |      | src/modules/decal/engine/  |
+----------------+      | (engine thực tế)           |
                        +----------------------------+
```

## Không sửa ở task này (TASK-0004)

- Công thức tính giá (vẫn còn gap với Excel — xem [docs/pricing-rules/decal-reference-cases.md](../../../docs/pricing-rules/decal-reference-cases.md))
- Bảng giá (`src/config/decalConfig.js` chưa di chuyển)
- UI components ở `src/components/decal/`
- Skipped reference tests
