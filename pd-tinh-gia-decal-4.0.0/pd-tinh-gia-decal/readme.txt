=== P&D Tính Giá Decal ===
Contributors: innhanhpd
Requires at least: 6.2
Requires PHP: 7.4
Stable tag: 4.0.0
License: GPL-2.0-or-later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Form tính giá decal lũy tiến với trang cấu hình trong quản trị WordPress.

== Installation ==
1. Sao lưu website, giữ bản ZIP/file plugin cũ để có thể quay lại.
2. Trong Plugin > Plugin đã cài đặt, tắt “Tính giá in tem nhãn (Đã sửa lỗi)” (bản 3.0).
3. Plugin > Cài mới > Tải plugin lên > chọn pd-tinh-gia-decal-4.0.0.zip > Cài đặt > Kích hoạt.
4. Mở menu “Tính giá decal” ở thanh trái. Kiểm tra giá và lưu.
5. Giữ nguyên [form_tinh_gia_decal] trên trang/UX Block; không cần thay shortcode.
6. Xóa cache website/CDN, thử lại form trên điện thoại và máy tính.

== Configuration ==
- Cài đặt chung: tiêu đề, điện thoại, Zalo, thông báo, vùng in, cộng bù và phí.
- Bảng giá: thêm/xóa/sửa bậc; phải liên tục từ tờ 1; bậc cuối có “Đến tờ” = 0.
- Loại decal: thêm/xóa/sửa tên, mã duy nhất và phụ phí mỗi tờ.
- Bấm “Lưu tất cả cài đặt”. Khi dữ liệu không hợp lệ, cấu hình đang dùng không bị ghi đè.
- Cấu hình mặc định lấy từ file tinh-gia-decal.php v3.0 đã cung cấp. Không nhập cấu hình từ plugin khác.

== Pricing ==
Giá công in là lũy tiến: cộng chi phí từng bậc, không lấy giá bậc cuối nhân toàn bộ số tờ.
Vùng in: 275 x 302 mm. Cộng bù 2 mm vào tổng ngang và tổng cao: 50 x 30 thành 52 x 32 mm.
Số con/tờ: lấy phương án tốt hơn giữa hai hướng xoay đồng nhất; không phải tối ưu phối hợp nhiều hướng.
Giữ Kraft = 0đ phụ phí như bản cũ. Cán màng = 500đ/tờ.
Phí bế thêm và phí thiết kế mặc định = 0đ; hãy xác nhận công in đã bao gồm khoản nào trước khi thay đổi.
Phí thiết kế cấu hình là phí cố định cho mọi báo giá, không phải lựa chọn của khách.
Giá VAT/vận chuyển chưa được tính riêng. Ghi chú phải phản ánh điều kiện thực tế của cửa hàng.
Đơn giá/tem làm tròn, chỉ tham khảo; tổng tiền là số tiền trước khi chia và làm tròn.

Mẫu kiểm tra mặc định:
- 1.000 tem giấy 50 x 30 mm, không cán: 45 tem/tờ, 23 tờ, 395.000đ.
- Cùng kích thước/số lượng, decal nhựa có cán: 434.100đ.

== Scope and data ==
Tính toán thực hiện trên máy chủ qua admin-ajax.php. Endpoint công khai chỉ đọc, không lưu dữ liệu.
Không yêu cầu nonce cho phép tính chỉ đọc để tránh lỗi nonce hết hạn trên trang cache.
Lưu cấu hình yêu cầu manage_options và nonce; người xem không thể đổi giá cấu hình.
Không lưu lead, không gửi email, không tạo đơn hàng hay thanh toán WooCommerce.
Không dùng thư viện JavaScript bên ngoài và không phụ thuộc jQuery.
Điện thoại/Zalo là liên kết bấm chủ động; plugin không gửi thông tin form tới Zalo.
Cấu hình lưu trong option pdtg_config, giữ lại khi tắt/gỡ plugin để dễ cài lại.
Sau thay đổi vật liệu/giới hạn/tiêu đề/liên hệ, xóa cache để cập nhật form. Giá luôn đọc cấu hình hiện tại trên máy chủ.

== Troubleshooting ==
- Form cũ còn xuất hiện: tắt plugin cũ và xóa cache trang/CDN.
- Hiện lỗi kết nối: kiểm tra plugin bảo mật/cache có chặn admin-ajax.php hoặc action pdtg_calculate không.
- Chưa thấy giao diện mới trong UX Builder: lưu trang rồi kiểm tra trang public; preview động của builder không được đảm bảo.
- Muốn quay lại: tắt P&D Tính Giá Decal, bật plugin cũ, xóa cache. Shortcode không đổi.

== Changelog ==
= 4.0.0 =
Tách cấu trúc plugin, thêm quản trị, kiểm tra dữ liệu và bảng giá, tính giá phía máy chủ,
CSS giới hạn trong form, responsive, nhiều shortcode độc lập, xử lý lỗi và hủy kết quả cũ khi đổi thông số.
