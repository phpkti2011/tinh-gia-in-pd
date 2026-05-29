# Module: small-print (in KTS khổ nhỏ)

Tách từ `src/utils/calculator.js` (516 dòng) + `src/utils/customerQuote.js` (118 dòng) ở TASK-0009.

## Cấu trúc

```
src/modules/small-print/
├── engine/
│   ├── layout.js          — geometry + printer helpers (public: getClicks,
│   │                        getPrintableArea, calculateImposition,
│   │                        calculateMaxCuttableSheetsLayout)
│   ├── pricing.js         — cost helpers + tier lookups (public: getProfitMargin,
│   │                        calculateVariableDataCost, calculatePrintContentSurcharge,
│   │                        calculateFinishingCost)
│   ├── finishing.js       — finishing operations (public: calculateLamination,
│   │                        calculateDieCuttingCosts, calculateFoilStamping)
│   │                        imports: ./pricing (calculateFinishingCost)
│   ├── options.js         — option pipeline (public: processSheet,
│   │                        calculatePaperOptions, calculatePerSheetOptions,
│   │                        calculateDecalOptions)
│   │                        imports: ./layout, ./finishing
│   ├── quote.js           — customer-facing quote (public: calculateCustomerQuote)
│   │                        imports: ./pricing
│   └── index.js           — barrel re-export tất cả 16 public function
└── README.md              — file này

(config/ — chưa tách trong TASK-0009, vẫn ở src/config/defaultConfig.js;
 sẽ extract ở task riêng tương tự TASK-0005 cho decal.)
```

## Dependency graph (không cycle)

```
pricing.js   (no deps)
layout.js    (no deps)
finishing.js → pricing.js
options.js   → layout.js, finishing.js
quote.js     → pricing.js
index.js     → all
```

## Nguyên tắc engine

- **Pure functions**: không React, DOM, storage, alert, fetch, localStorage.
- Đầu vào: input + config object (DEFAULT_CONFIG hoặc loaded variant).
- Đầu ra:
  - Layout / pricing helpers: số hoặc object {field, ...}.
  - Options pipeline (`processSheet`, `calculatePaperOptions`, …): **mutate `allResults` qua ref** (giữ contract cũ — App.jsx phụ thuộc).
  - `calculateCustomerQuote`: object `{totalA4Pages, totalPrintCost, totalCustomerCost, error, …}`.

## Compatibility

```
+----------------+      +---------------------------+
| src/App.jsx    |----->| src/utils/calculator.js   |
| (UI hiện tại)  |      | (compat shim re-export)   |
|                |      +-----------+---------------+
|                |                  |
|                |----->+---------------------------+
|                |      | src/utils/customerQuote.js|
|                |      | (compat shim re-export)   |
+----------------+      +-----------+---------------+
                                    |
+----------------+                  v
| tests/golden/  |----->+----------------------------+
| small-print.*  |      | src/modules/small-print/   |
+----------------+      | engine/ (engine thực tế)   |
                        +----------------------------+
```

Hai shim `src/utils/{calculator,customerQuote}.js` giữ public API cũ — UI và 5 file golden test cũ KHÔNG cần đổi đường dẫn import.

## Không sửa ở TASK-0009

- Công thức tính giá (đã align Excel cho decal ở TASK-0006; small-print giữ nguyên).
- Bảng giá (`src/config/defaultConfig.js`).
- UI ở `src/components/smallprint/`.
- App.jsx (TASK-0008.6 fix finishing config đã xong — TASK-0009 chỉ extract engine).
- Module decal.
