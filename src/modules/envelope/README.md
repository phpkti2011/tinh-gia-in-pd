# Tính Giá Bao Thư

Module riêng trên trang chủ, dùng engine và bảng giá In KTS khổ nhỏ. Tài liệu công thức và nghiệm thu: [kế hoạch](../../../docs/ke-hoach-module-kho-trai-bao-thu.md).

## Sử dụng

1. Nhập ngang/cao thành phẩm, chiều dài nắp, rộng tay dán và số lượng. Chuyển mm/cm sẽ quy đổi các số đang nhập.
2. Chọn cạnh nắp W/H và kiểu khuôn: nối đối diện nắp, nối cạnh bên hoặc tách hai phần.
3. Với khuôn tách, chọn rõ có in hay không in mặt sau. Mỗi chiều mặt sau giảm tổng 3 mm.
4. Chọn giấy ram, khổ giấy và màu in. Nếu ép nhũ, bật lựa chọn rồi nhập khổ khuôn (cm), số lần ép, màu đặc biệt; có thể thêm nhiều khuôn.
5. Kiểm tra hình khổ trải và mô tả. Có thể tải SVG minh họa; hình không thay file khuôn bế sản xuất.
6. Khi bảng giá đã đồng bộ và được admin xác nhận, xem chi tiết và sao chép báo giá. Nút sao chép kiểm tra lại phiên bản trước khi xuất giá.

Ví dụ: 100 bao thư 350×250 mm, nắp W dài 40 mm, tay dán 15 mm, khuôn tách: phần trước 380×305 mm và mặt sau 347×247 mm. Nếu không in mặt sau, phần này chỉ tính giấy ram, tiền in bằng 0. Với kiểu liền nối đối diện, khổ trải 380×540 mm vượt máy KTS mặc định: vẫn xem được hình nhưng không báo giá, không tự đổi kiểu khuôn.

## Cài đặt giá

Admin vào **Cài Đặt** để sửa giấy cho phép/mặc định, giá trị nhập mặc định, bậc phí bế và dán (giá vốn/khách; mỗi bao thư hoặc trọn gói), phí cố định, giá tối thiểu mỗi đơn, hệ số bán giấy mặt sau. Giữ ít nhất một loại giấy trong danh sách chọn. Danh sách `allowed: []` trong dữ liệu cũ có nghĩa dùng mọi giấy ram.

Giá giấy, click in, bảng giá khách A4, giá sàn in và ép nhũ dùng cấu hình KTS. Ép nhũ tính theo số bao thư, không nhân đôi vì khuôn tách. Tổng phí ép nhũ KTS được dùng cho cả vốn và bán, tương tự Lịch bàn.

Các bậc phí khởi tạo chỉ là mẫu; admin phải kiểm tra và xác nhận trước khi báo khách. Giá vốn và trang cài đặt chỉ hiện với admin đã xác thực. Không có cơ chế nhóm khách riêng.

## Đồng bộ và triển khai

- Chạy `docs/database/migration-envelope-module.sql` trên Supabase trước triển khai. Migration giữ các module cũ, thêm Bao thư và RPC kiểm tra quyền admin/phiên bản; gửi lại cùng nội dung không tạo lịch sử trùng.
- Admin mở Cài Đặt, nhập giá thực tế, xác nhận và lưu lần đầu; kiểm tra thông báo đồng bộ thành công.
- Mất kết nối, bảng giá sai hoặc còn nháp chưa đồng bộ sẽ dừng báo giá. Hình khổ trải vẫn dùng được khi thông số hợp lệ.
- Nháp lưu lỗi chỉ tự gửi lại bởi đúng tài khoản admin. Nếu admin khác sửa giá, nạp bảng giá máy chủ để đối chiếu rồi lưu lại.
- Không dùng cache/default thay giá máy chủ để báo khách. Khóa `envelopeConfig` là cache form, `envelopeConfigDraft` là nháp chờ lưu.

## Mã nguồn và kiểm tra

- `engine/layout.js`: công thức, validation, các mảnh và đường gấp dùng để vẽ.
- `engine/pricing.js`: gọi KTS cho phần in, giấy ram cho phần trắng, cộng bế/dán/ép nhũ/phí đơn.
- `config/`: cấu hình mặc định, schema, đọc/lưu và đồng bộ.
- `ui/`: nhập liệu, hình, kết quả, cài đặt và theo dõi thay đổi bảng giá.
- Adapter chung: `src/modules/small-print/engine/quoteAdapter.js`; Lịch bàn giữ đường import cũ bằng re-export. Hàm bậc giá chung nằm ở `src/utils/priceTiers.js`.
- Đăng ký module: `src/App.jsx`, `src/config/moduleVisibilityConfig.js`.
- SVG: `src/components/common/saveSvg.js`.
- Tests: `tests/golden/envelope.{layout,pricing,storage}.test.js`, `tests/components/Envelope.test.jsx`, bài kiểm tra module visibility và các bài hồi quy Lịch bàn.
- Kiểm tra SQL cục bộ: `node scripts/check-envelope-migration.cjs` (PGlite tại `tmp/calendar-db-check`; không kết nối máy chủ thật).

PowerShell chạy test không dùng tài khoản thật:

```powershell
$env:VITE_SUPABASE_URL=''
$env:VITE_SUPABASE_ANON_KEY=''
npm test
npm run build
```

Kết quả kiểm tra và giới hạn bàn giao nằm trong `tasks/TASK-envelope-module.md`.
