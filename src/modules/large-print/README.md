# Module: large-print (in khổ lớn)

Tách từ `src/utils/largePrintCalculator.js` (186 dòng) ở TASK-0016.

## Cấu trúc

```
src/modules/large-print/
├── engine/
│   ├── layout.js      — internal: calcItemOnRoll, optimizeItemOnRoll
│   │                    (per-item per-roll layout & cost)
│   ├── finishing.js   — internal: calculateFormexCost, calculateFinishingCost
│   │                    (formex tier discount + edge taping + grommets + die cutting)
│   ├── pricing.js     — public: calculateLargePrint (main orchestrator)
│   │                    imports: ./layout (optimizeItemOnRoll),
│   │                             ./finishing (calculateFormexCost, calculateFinishingCost)
│   └── index.js       — barrel re-export calculateLargePrint
└── README.md          — file này

(config/ chưa tách — sẽ làm ở task riêng tương tự TASK-0005/0010/0013.)
```

## Dependency graph (không cycle)

```
layout.js    (no deps)
finishing.js (no deps)
pricing.js   → layout.js, finishing.js
index.js     → pricing.js
```

## Nguyên tắc engine

- **Pure function**: không React, DOM, storage, alert, fetch.
- Đầu vào: `params + config = LARGE_PRINT_DEFAULT_CONFIG`.
- Đầu ra: object 13 fields hoặc `null` (item không fit roll nào).
- Helpers (4 fn) là internal — file gốc cũng không export.

## Lưu ý quan trọng

⚠️ Có **2 function tên `calculateFinishingCost`** trong project:
- `src/modules/large-print/engine/finishing.js` (file này) — signature `(totalArea, params, config)`, trả `{cost, desc}` cộng dồn nhiều operation.
- `src/modules/small-print/engine/pricing.js` — signature `(quantity, type, configData)`, trả `{cost, customerPrice}` tier lookup đơn.

2 function này hoàn toàn độc lập (khác module + signature). Đã được note từ TASK-0001 audit. Không thay đổi.

## Compatibility

```
+----------------+      +-----------------------------+
| src/App.jsx    |----->| src/utils/largePrintCalculator.js |
| (UI hiện tại)  |      | (compat shim re-export)     |
+----------------+      +-----------+-----------------+
                                    |
+----------------+                  v
| tests/golden/  |----->+----------------------------+
| large-print.*  |      | src/modules/large-print/   |
+----------------+      | engine/ (engine thực tế)   |
                        +----------------------------+
```

Shim `src/utils/largePrintCalculator.js` giữ public API cũ — UI và golden test cũ KHÔNG cần đổi đường dẫn import.

## Không sửa ở TASK-0016

- Công thức tính giá (giữ identical, khoá bởi 31 golden assertion).
- Bảng giá (`src/config/largePrintConfig.js` chưa di chuyển).
- UI ở `src/components/largeprint/`.
- App.jsx.
- Module decal / small-print / uvdtf.
