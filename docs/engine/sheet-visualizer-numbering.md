# Sheet Visualizer — quy tắc đánh số ô (tránh tái lỗi)

File liên quan: [`src/components/smallprint/SheetVisualizer.jsx`](../../src/components/smallprint/SheetVisualizer.jsx)

Có 2 sơ đồ trong module in nhỏ:

| Component | Sơ đồ | Đơn vị mỗi ô |
| --- | --- | --- |
| `LargeSheetVisualizer` | "Sơ đồ cắt từ giấy lớn" | 1 tờ con cắt ra từ tờ giấy lớn |
| `PrintSheetVisualizer` | "Sơ đồ xếp sản phẩm trên tờ in" | 1 sản phẩm trên tờ in |

## Lỗi đã từng gặp (2026-07-19)

**Triệu chứng:** "Sơ đồ cắt từ giấy lớn" cắt được 6 tờ con nhưng chỉ **ô số 1** hiện số, các ô
còn lại trống.

**Nguyên nhân:** số của ô bị gate bởi cờ `isUsed`:

```jsx
const isUsed = i < neededPrintSheets;      // SAI khi dùng để quyết định đánh số
...
{isUsed && <span>{i + 1}</span>}           // số biến mất ở các ô i >= neededPrintSheets
```

`neededPrintSheets` = `Math.ceil(productQuantity / productsPerSheet)` = **tổng số tờ in cho cả
đơn hàng**, thường bằng `1` khi số lượng nhỏ ⇒ `i < 1` chỉ đúng với ô đầu ⇒ chỉ ô 1 có số.

## Phân biệt 2 đại lượng — KHÔNG được dùng lẫn

| Biến | Ý nghĩa | Dùng để |
| --- | --- | --- |
| `neededPrintSheets` (prop) | **Tổng tờ in cho cả đơn** (`ceil(SL / SP mỗi tờ)`) | Chỉ để **tô sáng/highlight** ô "cần dùng cho đơn" và tính `neededLargeSheets`. |
| `rects.length` (`sheetsPerLarge`) | **Số ô cắt được trên MỘT tờ lớn** (từ `cuttableSheetLayout`) | Số ô vẽ ra và cần đánh số. |

Hai đại lượng khác hẳn nhau về ngữ nghĩa. Lấy `neededPrintSheets` (đại lượng cấp *đơn hàng*) để
quyết định đánh số ô cắt (đại lượng cấp *một tờ lớn*) là sai loại.

## Quy tắc

1. **Luôn đánh số MỌI ô cắt** — render `{i + 1}` cho mọi phần tử của `rects`, không gate bằng
   `isUsed`. (Giống `PrintSheetVisualizer` luôn render `{r.idx}`.)
2. `isUsed` **chỉ được dùng cho style**: màu nền ô + độ mờ của chữ số
   (ô cần dùng = chữ sáng `text-blue-100`; ô dư = chữ mờ `text-gray-500`).
3. Bất kỳ điều kiện nào ẩn/hiện **số** phải dựa trên số lượng ô cắt (`rects`), KHÔNG dựa trên
   đại lượng cấp đơn hàng.

## Nguồn dữ liệu layout

`layouts` prop = `displayResult.cuttableSheetLayout`, sinh ra ở:

- [`src/modules/small-print/engine/options.js`](../../src/modules/small-print/engine/options.js) —
  gọi `calculateMaxCuttableSheetsLayout(...)` và gán `cuttableSheetLayout`.
- [`src/modules/small-print/engine/layout.js`](../../src/modules/small-print/engine/layout.js) —
  `calculateMaxCuttableSheetsLayout` trả về `{ count, layout }`, `layout` là mảng
  `{ x, y, w, h }` (một phần tử cho mỗi ô cắt). Đây là hình học đầy đủ; nếu `null`,
  `LargeSheetVisualizer` tự dựng lưới fallback từ `largeW/largeH` và `cutW/cutH`.
