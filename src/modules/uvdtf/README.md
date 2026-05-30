# Module: uvdtf (in UV DTF tính theo mét tới)

Tách từ `src/utils/uvdtfCalculator.js` (57 dòng — module nhỏ nhất) ở TASK-0012.

## Cấu trúc

```
src/modules/uvdtf/
├── engine/
│   ├── pricing.js   — single public: calculateUvDtf(params, config)
│   └── index.js     — barrel re-export
└── README.md        — file này

(config/ chưa tách — sẽ làm ở task riêng tương tự TASK-0005 cho decal
 hoặc TASK-0010 cho small-print.)
```

## Nguyên tắc engine

- **Pure function**: không React, DOM, storage, alert, fetch, localStorage.
- Đầu vào: `params = { widthMM, heightMM, quantity }` + `config = UVDTF_DEFAULT_CONFIG`.
- Đầu ra: object 13 fields hoặc `null` (input invalid).

## Compatibility

```
+----------------+      +---------------------------+
| src/App.jsx    |----->| src/utils/uvdtfCalculator |
| (UI hiện tại)  |      | (compat shim re-export)   |
+----------------+      +-----------+---------------+
                                    |
+----------------+                  v
| tests/golden/  |----->+----------------------------+
| uvdtf.golden.* |      | src/modules/uvdtf/engine/  |
+----------------+      | (engine thực tế)           |
                        +----------------------------+
```

Shim `src/utils/uvdtfCalculator.js` giữ public API cũ — UI và file golden test cũ KHÔNG cần đổi đường dẫn import.

## Không sửa ở TASK-0012

- Công thức tính giá (giữ identical, khoá bởi 30 golden assertion).
- Bảng giá (`src/config/uvdtfConfig.js` chưa di chuyển).
- UI ở `src/components/uvdtf/`.
- App.jsx.
- Module decal / small-print / large-print.
