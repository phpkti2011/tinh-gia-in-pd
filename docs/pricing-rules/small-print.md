# Pricing Rules — In KTS khổ nhỏ

Các nhóm logic cần tách:

```txt
1. Input khổ thành phẩm.
2. Số lượng.
3. Loại giấy.
4. In 1 mặt / 2 mặt.
5. Quy đổi khổ in / trang in nếu có.
6. Phụ phí thành phẩm.
7. Tổng tiền và đơn giá.
```

Không để công thức nằm trong component UI.

## Ép plastic (màng nhiệt bỏ túi) — config 1.4.0

Key: `PLASTIC_LAMINATION_CONFIG` (optional — config cũ thiếu key vẫn hợp lệ, engine trả 0).
Helper thuần: `src/utils/plasticLamination.js`. Engine: `calculatePlasticLamination()` trong
`src/modules/small-print/engine/finishing.js`.

```txt
sizes        [{ id, name }]                      cột của bảng (A6/A5/A4/A3/CCCD…), admin thêm/xoá
tiers        [{ max_qty, price: { sizeId: đ } }]  hàng = bậc SL, tra "SL <= max_qty" (dòng cuối ∞)
minPrice     { sizeId: đ }                       SÀN BÁN / tấm — CHỈ ADMIN thấy
thicknesses  [{ id, name, percent, sizeIds[] }]  độ dày: % phụ thu + khổ được tick
```

Quy tắc:

1. **Số lượng tra bậc = số thành phẩm** (`productQuantity`), mỗi sản phẩm ép 1 tấm.
2. Nhân viên chọn **độ dày** rồi chọn **khổ** trong các khổ admin đã tick cho độ dày đó —
   chọn thủ công, không gợi ý theo kích thước.
3. **Giá khách** = `đơn giá(khổ, bậc) × (1 + percent/100) × SL`, cộng vào `baseCustomerCost`
   (phụ thu nhiều nội dung áp lên như các gia công khác). Hiện 1 dòng trong card "Giá".
4. **Giá tối thiểu** = `minPrice[khổ] × (1 + percent/100) × SL` là giá bán sàn: ResultPanel
   cộng **thẳng** vào "🏆 Giá Tối Thiểu" (panel, thanh dính, cột bảng so sánh) **sau** khi nhân
   biên lợi nhuận. Nhân viên không bao giờ thấy.
5. Chọn độ dày mà **chưa chọn khổ** (hoặc khổ không được tick): tiền ép = 0, cảnh báo vàng ở
   InputPanel + ResultPanel, chuỗi "Copy quy cách" ghi `ép plastic 80 mic (CHƯA CHỌN khổ)`.
6. `plasticThickness: 'none'` (mặc định) ⇒ không thay đổi bất kỳ giá nào — 128 golden test cũ
   phải xanh.
7. Ép plastic độc lập với cán màng (chọn được cả hai).
