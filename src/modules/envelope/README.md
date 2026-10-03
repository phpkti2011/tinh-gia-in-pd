# Tính Giá Bao Thư

Module riêng trên trang chủ, dùng engine và bảng giá In KTS khổ nhỏ. Tài liệu công thức và nghiệm thu: [kế hoạch](../../../docs/ke-hoach-module-kho-trai-bao-thu.md).

## Sử dụng

1. Chọn khổ nhanh 220×120, 220×110, 230×160 hoặc 350×250 mm, hoặc nhập tùy chỉnh. Nắp, tay dán và số lượng chỉnh riêng. Chuyển mm/cm sẽ quy đổi các số đang nhập; sửa ngang/cao trở về Tùy chỉnh.
2. Chọn cạnh nắp W/H và kiểu khuôn: nối đối diện nắp, nối cạnh bên hoặc tách hai phần.
3. Với khuôn tách, chọn rõ có in hay không in mặt sau. Mỗi chiều mặt sau giảm tổng 3 mm.
4. Chọn nguồn giấy ram hoặc giấy mỹ thuật, loại giấy và màu in. Mỹ thuật dùng tên, khổ nguyên và giá mỗi tờ đã được admin cài đặt; admin có thể chỉnh khổ/giá riêng cho đơn đang tính. Nếu ép nhũ, bật lựa chọn rồi nhập khổ khuôn (cm), số lần ép, màu đặc biệt; có thể thêm nhiều khuôn.
5. Kiểm tra hình khổ trải và mô tả. Có thể tải SVG minh họa; hình không thay file khuôn bế sản xuất.
   Trong Thành phẩm, chọn Không bế / Bế có khuôn / Bế kỹ thuật số. Bế chỉ áp phần thân hoặc phần trước; mặt sau rời cắt thẳng không tính thêm bế.
6. Khi bảng giá đã đồng bộ và được admin xác nhận, xem chi tiết và sao chép báo giá. Nút sao chép kiểm tra lại phiên bản trước khi xuất giá.

Ví dụ: 100 bao thư 350×250 mm, nắp W dài 40 mm, tay dán 15 mm, khuôn tách: phần trước 380×305 mm và mặt sau 347×247 mm. Nếu không in mặt sau, phần này chỉ tính giấy ram, tiền in bằng 0. Với kiểu liền nối đối diện, khổ trải 380×540 mm vượt máy KTS mặc định: vẫn xem được hình nhưng không báo giá, không tự đổi kiểu khuôn.

## Cài đặt giá

Trong **Khổ bao thư chuẩn**, admin có thể thêm, sửa ngang/cao (mm), xóa từng khổ rồi bấm **Lưu cài đặt bao thư**. Danh sách `sizePresets` được lưu cùng cấu hình và dùng ở màn tính giá; có thể xóa hết để chỉ dùng Tùy chỉnh. Cấu hình cũ chưa có danh sách sẽ dùng bốn khổ ban đầu. Nếu khổ đang chọn bị sửa/xóa, đơn đang nhập giữ kích thước và hiển thị Tùy chỉnh.

Admin vào **Cài Đặt** để sửa giấy cho phép/mặc định, giá trị nhập mặc định, bậc phí dán (giá vốn/khách; mỗi bao thư hoặc trọn gói), phí cố định, giá tối thiểu mỗi đơn, hệ số bán giấy mặt sau. Giữ ít nhất một loại giấy trong danh sách chọn. Danh sách `allowed: []` trong dữ liệu cũ có nghĩa dùng mọi giấy ram.

Bế dùng trực tiếp `calculateDieCuttingCosts` của KTS: khuôn loại `envelope`, công theo số tờ máy phần chính. Bế khuôn bình cách 0,4 cm; bế kỹ thuật số cách 0,6 cm và dùng biên bế kỹ thuật số của KTS. Không bế bình cách 0. Không cộng thêm bảng phí bế Bao thư cũ (giữ trường config cũ chỉ để tương thích dữ liệu đã lưu).

Giá giấy, click in, bảng giá khách A4, giá sàn in và ép nhũ dùng cấu hình KTS. Ép nhũ tính theo số bao thư, không nhân đôi vì khuôn tách. Tổng phí ép nhũ KTS được dùng cho cả vốn và bán, tương tự Lịch bàn.

Các bậc phí khởi tạo chỉ là mẫu; admin phải kiểm tra và xác nhận trước khi báo khách. Giá vốn và trang cài đặt chỉ hiện với admin đã xác thực. Không có cơ chế nhóm khách riêng.

## Đồng bộ và triển khai

Giấy mỹ thuật được quản lý trong Cài Đặt bao thư (tên, ngang/dài cm, giá vốn mỗi tờ). Giá khởi tạo bằng 0 nghĩa là chưa khai báo, không báo giá loại giấy đó. Giấy mỹ thuật có in vẫn dùng adapter KTS và sàn cho giấy custom; mặt sau trắng tính tờ nguyên × giá mỗi tờ × hệ số bán. Cấu hình Bao thư cũ không có `artPapers` vẫn dùng được cho giấy ram.

Kiểm tra máy chủ ngày 27/09/2026: chỉ có `small-print` v31; chưa có hàng `envelope`; RPC `save_envelope_price_config` trả 404/PGRST202. Cần áp dụng migration, không khắc phục bằng cách bỏ chặn đồng bộ hoặc tự dùng giá mẫu để báo khách.

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

Mỗi bậc phí dán thân có `mode` riêng: `package` tính một lần cho đơn,
`per_item` nhân số bao. Bậc áp dụng từ `from` tới trước mốc tiếp theo.
Bậc cũ thiếu `mode` tiếp tục dùng `gluing.mode`; mở Cài Đặt sẽ điền cách tính
cũ vào từng dòng, giữ nguyên giá trước khi chỉnh sửa.

Dán keo 2 mặt nắp là tùy chọn riêng với dán thân. Chiều dài keo mỗi bao bằng cạnh
đặt nắp W hoặc H, quy đổi sang cm. Tổng phí = chiều dài × số bao × đơn giá đ/cm.
`flapTape.costPerCm` và `flapTape.salePerCm` là giá vốn và giá khách riêng.
Cấu hình cũ vẫn dùng khi không chọn keo nắp; khi chọn cần nhập cả hai giá lớn hơn 0.

Phí keo nắp có `minCost` và `minSale` riêng: mỗi tổng bằng giá lớn hơn giữa
phí theo chiều dài và mức tối thiểu tương ứng. Mức 0 hoặc trường chưa có trong
cấu hình cũ nghĩa là không áp tối thiểu. Chỉ áp khi chọn dán keo nắp.
