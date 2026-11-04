# Tính giá lịch khổ chuẩn

Điểm vào: `ui/StandardCalendarModule.jsx` (id module `standardcalendar`, tải bằng `React.lazy` trong `App.jsx`).

Đây là **bảng giá tra cứu**, khác module `calendar` (Tính Giá Lịch Bàn — dựng giá từ giấy, in KTS, carton, lò xo...). Nguồn: file `bang_tinh_gia_lich_de_ban_kho chuan.html` (5 quy cách × 25 bậc, từ 1 đến 3.000 cuốn).

## Ranh giới

- `config/priceTable.js`: dữ liệu. Mỗi bậc là `[số lượng, đơn giá/cuốn]`; tổng = đơn giá × số lượng (đã đối chiếu 125/125 dòng với cột tổng của file nguồn nên không lưu trùng).
- `engine/pricing.js`: engine thuần, không đọc storage/network.
- **Không dùng Supabase, không có tab Cài Đặt, không cần migration SQL.** Đổi giá = sửa `priceTable.js` rồi deploy. Tile trang chủ vẫn ẩn/hiện và đổi tên được qua cấu hình `ui-visibility` có sẵn (id `standardcalendar`; client cũ thiếu id này thì mặc định hiện).
- Ảnh minh họa nằm ở `assets/preview-N.png` (tách từ ảnh base64 trong file nguồn).

## Quy tắc tra giá (giữ nguyên file nguồn)

- Trùng bậc → đơn giá bậc đó.
- Giữa hai bậc `[low, high]` → ngưỡng = `low + ceil((high − low) × 70%)`; `qty < ngưỡng` dùng đơn giá `low`, ngược lại dùng đơn giá `high`. Không nội suy. Tổng = đơn giá × `qty`.
- Trên bậc cuối (3.000) → `over`, báo giá riêng, không ra tiền.
- Không phải số nguyên ≥ 1 → `invalid`.
- 70% tính bằng số nguyên (`× 7 / 10`) để `ceil` không dính sai số float; test so khớp công thức float gốc trên mọi số lượng 1…3000.

## Điểm lệch của bảng nguồn (CHƯA sửa, chỉ cảnh báo)

Ba quy cách (2 phần 25×15, 20×15, 25×15) có **90 cuốn đắt hơn 100 cuốn** (vd 25×15: 8.595.000 đ so với 8.520.000 đ), và số lượng 91–96 áp đơn giá bậc 90 nên cũng đắt hơn 100 cuốn. Engine giữ đúng giá nguồn; `cheaperTier` trong kết quả để UI nhắc nhân viên gợi ý khách đặt tròn bậc rẻ hơn. Nếu muốn khoá cứng (không bao giờ cao hơn bậc kế) thì phải có quyết định giá từ chủ xưởng, không tự đổi trong engine.

Hai quy cách 17×15 và 15×17 hiện cùng bảng giá (đúng nguồn) nhưng được tách bảng riêng.

## Kiểm chứng

`tests/golden/standard-calendar.pricing.test.js` (bảng, ngưỡng 70%, khớp công thức gốc, vượt bậc, không hợp lệ, bậc rẻ hơn), `tests/components/StandardCalendar.test.jsx` (giao diện).
