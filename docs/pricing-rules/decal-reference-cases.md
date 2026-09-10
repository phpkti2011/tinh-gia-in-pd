# Decal — Reference cases & gap với Excel

> Ngày tạo: 2026-05-28 (TASK-0003.5) — document gap.
> Cập nhật: 2026-05-29 (TASK-0006) — **calculateSingleStickerPrice đã align Excel cho Case C**. calculateSheetPrice (Case G) + decalExtra (Case D với Decal nhựa) CHƯA align — chờ thêm Excel reference.
> **Cập nhật: 2026-09-07 (TASK-DECAL-WHOLESHEET)** — theo yêu cầu chủ tiệm, **REVERT Formula A**: nay tính **NGUYÊN TỜ (ceil)** cho toàn bộ (in + vật liệu + cán màng), giống plugin `pd-tinh-gia-decal-4.0.0`. Đơn giá tem lẻ không còn theo tờ lẻ. Thay `areaConversionFactor` bằng **% tăng giá nhập tay theo từng khổ giấy in** (khổ gốc 330×330 = 0%), % nhân lên toàn bộ giá mỗi tờ. Công thức **xếp tem giữ nguyên** (khe-giữa + hex — chính xác hơn 4.0.0). Golden mới: Case A=448.000, Case C base=6.590.600 / lam=1.219.000 / tổng=7.809.600.
> **Cập nhật: 2026-09-07 (TASK-DECAL-MACHINE)** — thêm **máy bế** (`config.machines`, danh sách admin sửa được): mỗi máy có lề vùng bế riêng (`marginShort`/`marginLong`). Graptech lề 28/50; Avitech vùng bế rộng hơn → lề nhỏ hơn → nhiều tem/tờ hơn → rẻ hơn. Lề chuyển từ per-khổ sang **per-máy** (`printSheetSizes` chỉ còn `label/w/h/percent`). Bảng giá **hiện tất cả máy song song** (mỗi máy 1 cột giá) để so sánh. `getPrintableArea(w,h,config,machine)` dùng lề máy, thiếu máy → fallback `marginShortSide/marginLongSide`. Schema decal bump `1.2.0`.
> **Cập nhật: 2026-09-09 (TASK-DECAL-MATERIAL-AVAILABILITY)** — mỗi khổ có `printSheetSizes[i].unavailableMaterials: []` (danh sách loại decal KHÔNG có ở khổ đó, do quy cách cắt / khổ cuộn). Bảng ma trận giá sàn trong Cài đặt: mỗi ô có **checkbox xanh**, tick = không có → ô bôi đen + khoá giá sàn. Engine (`priceTables.js`) lọc `decalsToDisplay` bỏ vật liệu unavailable của khổ đang chọn → không sinh dòng; bảng rỗng thì ghi chú "Loại decal đang chọn không có ở khổ này". Schema `1.6.0`.
> **Cập nhật: 2026-09-08 (TASK-DECAL-FLOOR-MATRIX)** — giá sàn chuyển từ 1 số/khổ sang **ma trận vật liệu × khổ**: mỗi `printSheetSizes[i].minPriceByMaterial = { <tên decal>: đ/tờ }` (bỏ `minPrice` cũ). App tra `selectedSize.minPriceByMaterial[loại decal của dòng]` làm giá sàn cho `applyDiscount`. Cài đặt: bảng ma trận (hàng = vật liệu, cột = khổ). Schema `1.5.0`.
> **Cập nhật: 2026-09-08 (TASK-DECAL-DISCOUNT)** — thêm **chiết khấu %** (preset 5/10/15/20/25 + tùy nhập) áp cho **cả bảng giá** (mọi SL, cả 2 máy). Chặn theo **giá sàn/tờ** (`printSheetSizes[].minPrice`, theo từng khổ, 0 = không sàn): `final = max(base×(1−d/100), min(base, sheets×minPrice))`, `floored` khi bị chặn → cảnh báo + ô tô đỏ. Hàm thuần `applyDiscount(base, sheets, d, minPrice)` (pricing.js, có test `decal.discount.test.js`); áp ở App.jsx (không đụng hàm giá gốc). Schema bump `1.4.0`.
> **Cập nhật: 2026-09-07 (TASK-DECAL-MIXED)** — thuật toán xếp tem nâng từ lưới đồng nhất lên **xếp hỗn hợp (guillotine đệ quy `packRectangles`, depth 4)**: đặt khối lưới chính rồi đệ quy nhét thêm con (xoay) vào dải phải + dải đáy → **tối đa con/tờ**, luôn ≥ lưới cũ. Layout trả `blocks:[{x,y,iw,ih,cols,rows}]`; sơ đồ (LayoutVisualization + SheetLayoutVisualization) vẽ theo blocks. Ví dụ Case C (tem 100×70, 19.500): 8→**10 con/tờ** → 1.950 tờ → tổng **6.492.000đ** (trước 7.809.600đ). Hình tròn giữ hexagonal.
> **Cập nhật: 2026-09-07 (TASK-DECAL-MACHINE-4EDGE)** — lề máy nay khai báo **4 cạnh riêng** `marginTop/marginBottom/marginLeft/marginRight` (mm). Vùng bế = `(W − trái − phải) × (H − trên − dưới)`. `getPrintableArea`: máy có `marginTop` (number) → dùng 4 cạnh; ngược lại (máy kiểu cũ short/long, hoặc gọi không kèm máy) → giữ nhánh legacy short/long + fallback global (nên golden layout/pricing không đổi). Mặc định 4 cạnh = tách đôi tổng lề cũ (Graptech 25/25/14/14 = 302×280; Avitech 19/19/10/10 = 310×292). Schema `validateMachine` nới lỏng (chấp nhận cả 4-cạnh lẫn short/long). Bump `1.3.0`.

## 1. Case tham chiếu

| Trường | Giá trị |
|---|---|
| Tem | 100 × 70 mm |
| Số lượng | 19.500 cái |
| Cán màng | Có, 500đ/tờ |
| Loại decal | Decal giấy |
| Print sheet | 330 × 330 mm (default) |

## 2. So sánh kết quả

| Trường | Code SAU TASK-0006 | Excel / reference | Trùng khớp? |
|---|---:|---:|---|
| Số con/tờ | 8 | 8 | ✅ |
| Số tờ in (sau ceil) | 2.438 | 2.438 | ✅ |
| Thành tiền cơ bản | **6.591.700đ** | **6.591.700đ** | ✅ |
| Phụ phí cán màng | **1.218.750đ** | **1.218.750đ** | ✅ |
| Tổng tiền | **7.810.450đ** | 7.810.450đ | ✅ |
| Đơn giá/con (round) | **401đ** | 401đ | ✅ |

(Trước TASK-0006: base 6.590.600 / lam 1.219.000 / tổng 7.809.600 / đơn giá 400,49đ.)

## 3. Phân tích nguyên nhân (giả thuyết)

### 3.1 Cán màng — chênh lệch −250đ

```
2.437,5 (sheet thô) × 500đ = 1.218.750đ   ← Excel (khớp chính xác)
2.438   (ceil)      × 500đ = 1.219.000đ   ← Current
```

> 💡 **Giả thuyết H1 (khớp 100%):** Excel **không làm tròn** sheet count khi tính phí cán màng — dùng trực tiếp `quantity / stickersPerSheet = 19500 / 8 = 2437,5`. Hợp lý về mặt nghiệp vụ: cán màng tính theo diện tích thực, không cần dư.

Code hiện tại dùng `numSheets = Math.ceil(quantity / stickersPerSheet)` cho **cả** lam và base ([decalCalculator.js:86](../../src/utils/decalCalculator.js#L86), [:118](../../src/utils/decalCalculator.js#L118)).

### 3.2 Tiền in cơ bản — chênh lệch +1.100đ

```
6.590.600 + 0,5 × 2.200 (tier 18) = 6.591.700đ   ← Excel
```

> 💡 **Giả thuyết H2a:** Excel cộng thêm **nửa tờ thừa** ở tier cuối (tier 18 = 2.200đ/tờ) khi `quantity / stickersPerSheet` không chia hết:
> `base = progressive(ceil) + (ceil − qty/per_sheet) × marginal_tier_price`
> = 6.590.600 + 0,5 × 2.200 = 6.591.700.

> 💡 **Giả thuyết H2b (tương đương về mặt số):** Excel dùng `numSheets = qty/per_sheet + 1` cho base (cộng 1 tờ buffer) rồi tính progressive trên `2.438,5` sheet:
> tier 1–17: 3.427.000đ (1.000 tờ đầu) + tier 18: 1.438,5 × 2.200 = 3.164.700đ → 6.591.700đ.

Cả H2a/H2b cho cùng kết quả; chưa rõ Excel dùng cái nào nội tại. Cần xem công thức Excel thực tế để xác nhận.

### 3.3 Tổng thể

| Thành phần | Code (ceil cho cả 2) | Excel (raw cho lam + ceil+0.5 cho base) |
|---|---|---|
| Sheet count base | 2.438 (ceil) | 2.438,5 (ceil + ½) |
| Sheet count lam | 2.438 (ceil) | 2.437,5 (raw) |

Tóm tắt: Excel dùng **2 sheet count khác nhau** trong cùng 1 đơn — một cho phí in (round-up + buffer), một cho phí cán (raw). Code hiện tại đồng nhất ceil cả hai.

## 4. Tình trạng sau TASK-0006

**TASK-0006 đã áp Formula A vào `calculateSingleStickerPrice`** ([src/modules/decal/engine/pricing.js](../../src/modules/decal/engine/pricing.js)):
- ✅ Case C (Excel reference) khớp 100%.
- ✅ Reference test [decal.reference.todo.test.js](../../tests/golden/decal.reference.todo.test.js) đã un-skip — 6 assertion PASS.
- ✅ Cases A, B, D, H trong [decal.golden.test.js](../../tests/golden/decal.golden.test.js) + [decal.extra.golden.test.js](../../tests/golden/decal.extra.golden.test.js) đã cập nhật expected theo Formula A.
- ⚠ Còn lại CHƯA align Excel (chờ thêm reference):
  - **calculateSheetPrice** (Case G — sticker sheet mode): vẫn dùng `numPrintSheets = ceil` cho cả base + lam.
  - **decalExtra** trong `calculateSingleStickerPrice` (Case D với Decal nhựa): vẫn dùng `ceil × decalCost`. Lý do: chưa có Excel reference cho case Decal nhựa có fraction (cần case kiểu "500 cái Decal nhựa, fraction != 0" để confirm raw vs ceil).

## 5. Đề xuất hành động tiếp theo

| # | Việc | Tình trạng |
|---|---|---|
| 1 | Confirm Formula A với user | ✅ Done ở TASK-0006 |
| 2 | Áp Formula A vào calculateSingleStickerPrice | ✅ Done ở TASK-0006 |
| 3 | Un-skip reference tests | ✅ Done ở TASK-0006 |
| 4 | Xin Excel ref cho Case D (Decal nhựa với fraction) | ⏳ Chờ |
| 5 | Áp Formula tương đương cho calculateSheetPrice (Case G) | ⏳ Chờ Excel ref |
| 6 | Xin Excel ref cho calculateSheetPrice với fractional ratio | ⏳ Chờ |
