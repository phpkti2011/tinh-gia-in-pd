# Module tính giá lịch bàn

Tier 3 — bổ sung công cụ nội bộ. Chủ trì: Codex.

## Phạm vi và các hợp đồng giữ nguyên

- Engine lịch thuần `calculateCalendar(input, calendarConfig, printConfig)`, không truy cập trình duyệt hay database.
- Đọc lại engine và cấu hình KTS đang dùng; không sửa engine, bảng giá, dữ liệu hay giao diện các module cũ.
- Chỉ thêm tile/nhánh điều hướng lịch vào App, thêm nhãn lịch vào cấu hình hiển thị.
- Lưu riêng `calendarConfig` / cloud module `calendar`; quyền sửa qua AdminGate và RPC hiện có.
- Migration SQL riêng, chưa chạy lên database. Lưu local/cloud phải báo đúng trạng thái.
- Giữ nguyên các thay đổi có sẵn ở hai SQL nền, LaminationFilmSelect và DecalResultPanel.

## Các bước

| ID | Kết quả kiểm chứng | Phụ thuộc | Cỡ | Trạng thái |
|---|---|---|---|---|
| CAL-1 | Công thức, sơ đồ cắt và giá vốn/báo khách có kiểm thử | — | M | đã kiểm chứng |
| CAL-2 | Màn nhập lịch và sơ đồ trong phần mềm | CAL-1 | M | đã kiểm chứng |
| CAL-3 | Cài đặt loại/bậc, lưu riêng, quyền admin | CAL-1 | M | đã kiểm chứng |
| CAL-4 | Hồi quy module cũ, build, rà soát, bàn giao | CAL-2, CAL-3 | S | đã kiểm chứng |

## Quyết định còn chờ

Giá bán giấy áo không in và phần giấy trong giá áo có in: đã hỏi người dùng. Trước khi chốt, cấu hình dùng lựa chọn “Chưa thiết lập”, tổng báo khách không xuất ra nếu thiếu quy tắc. Không gán giá mẫu thành giá chính thức.

Giá mặc định của vật tư mới là dữ liệu minh họa từ demo; cần quản trị viên xác nhận bảng giá trước khi báo khách. Giá vốn giấy ram và ép kim lấy cấu hình KTS hiện tại.

## Quay lại phiên bản trước

Gỡ nhánh/tile lịch và import mới trong App, nhãn lịch; các module cũ không phụ thuộc module lịch. Dữ liệu lịch dùng khóa riêng. Không xóa hoặc ghi đè dữ liệu module cũ.

## Kiểm chứng

- Baseline `npm test -- --reporter=dot`: các golden engine đã chạy đều qua; test có Supabase gặp Node 20 thiếu WebSocket khi nạp env local; nhiều worker đồng thời gây hết bộ nhớ. Sẽ chạy lại tối đa 2 worker với env test không có kết nối thật.
- Chạy lại baseline với env test không nối Supabase và 2 worker: 100 file / 1.482 test đạt.
- Kiểm thử cuối cùng bằng lệnh ở README module: **103 file / 1.512 test đạt**, gồm 30 test lịch mới. Thời gian 81,34 giây; mã thoát 0.
- Prettier các file được thêm/sửa: đạt sau khi sửa riêng cách xuống dòng Suspense mới trong App.
- SHA-256 đối chiếu trước/sau: 152 tệp nguồn có sẵn dưới modules/components/utils/lib/auth không thay đổi, bao gồm các thay đổi người dùng đang có trước khi bắt đầu.
- ESLint các file được thêm/sửa: đạt, không lỗi/cảnh báo.
- Build Vite: đạt; module lịch thành chunk riêng khoảng 43,5 KB. Cảnh báo dung lượng chunk App và dữ liệu Browserslist cũ còn tồn tại.
- Browser QA ở localhost: mở tile lịch, bảng giá đọc KTS hiện hành, áo mỹ thuật có in, giấy lót riêng, sơ đồ cắt 6+8 tấm, trang cài đặt yêu cầu đăng nhập admin. Không ghi bảng giá lên cloud khi kiểm tra.

## Rà soát trước bàn giao

Rà soát tiêu chuẩn và yêu cầu bằng đọc mã/diff cùng các kiểm thử đối kháng, không dùng reviewer bên ngoài.

- Đã sửa: bản cloud đọc chậm có thể ghi đè bản local vừa lưu. Dùng revision và cờ chờ đồng bộ riêng; có test kiểm tra cả hai đường.
- Đã sửa: rời tab cài đặt không tự tải cloud cũ đè bản vừa lưu; bản nháp không bị refresh khi đang chỉnh.
- Đã sửa: bù carton lẻ không bị làm tròn thành số mm nguyên. Lưới 0,1 mm làm tròn phôi lên và khổ nguyên xuống, có test 4,2 mm.
- Đã kiểm tra: chỉ thêm import, tile và nhánh tải/điều hướng lịch trong App; không sửa nhánh tính cũ. Thêm nhãn/tile và cập nhật test số module 10→11 là thay đổi hợp đồng có chủ đích.
- Không chạy migration hoặc kiểm chứng RPC trên Supabase thật; file migration riêng phục vụ bước triển khai. Đây là giới hạn kiểm chứng, không ghi nhận cloud đã hoạt động.
- Thuật toán carton tìm phương án khả thi; UI nói rõ chưa bảo đảm tối ưu toàn cục. Các giới hạn tìm kiếm được ghi ở README module.

## Bổ sung ngày 27/09/2026: giá lót và hiển thị vốn

- Tách mục cài đặt giá giấy lót trong, giữ các khóa cấu hình và công thức hiện có: vốn × hệ số (mặc định 2), cộng vào đế, không có bậc.
- Chỉ admin đã xác thực thấy tổng/cột vốn, vốn đế và ô giá giấy mỹ thuật áo/lót. Người dùng thường vẫn chọn giấy riêng và xem báo khách. Các mô tả công thức có thể lộ vốn cũng được ẩn.
- Không sửa engine, nguồn bảng giá, quyền hoặc giao diện module cũ.
- Kiểm chứng: 45 test liên quan đạt (calendar engine/storage/UI và AdminGate), ESLint đạt, build Vite đạt; chỉ còn các cảnh báo build có sẵn.
- Kiểm tra browser: cấu hình hiển thị được tải về ẩn tile lịch với phiên chưa đăng nhập; không thay đổi cấu hình cloud để phục vụ kiểm tra. Quyền admin/staff và cài đặt lót được kiểm chứng bằng component test.

## Sửa đồng bộ bảng giá — 27/09/2026

Trạng thái: **mã nguồn đã kiểm chứng; triển khai máy chủ chưa hoàn tất, đang chờ quyền quản trị Supabase**.

- Nguyên nhân trong mã cũ: cờ pending ngăn đọc cloud; save thất bại vẫn áp dụng local để tính và sao chép báo giá. Ngoài ra file migration lịch chưa được chạy khi triển khai module.
- Đọc kiểm tra máy chủ thật bằng kết nối ứng dụng (chỉ đọc): HTTP 200, có small-print v31, không có hàng calendar. Không có công cụ quản trị DB hoặc thông tin kết nối DDL trong môi trường; đã yêu cầu người dùng mở phiên quản trị hoặc tự chạy SQL.
- Bỏ dùng cache/default để báo khách; đọc calendar + small-print trong một truy vấn, kiểm tra dữ liệu và phiên bản. Bản local chưa đồng bộ là nháp riêng, không được áp dụng.
- Tự tải mỗi 15 giây khi tab hiện, khi focus/visibility/online và storage thay đổi. Offline chặn ngay; phản hồi trước đó không mở lại giá. Trước copy kiểm tra lại phiên bản và chỉ sao chép khi vẫn đúng giá đang hiển thị.
- Thêm RPC lịch có khóa giao dịch, so sánh phiên bản, kiểm tra admin; gửi lại dữ liệu giống hệt không tăng phiên bản. Nháp có chủ sở hữu; không tự gửi bằng tài khoản khác. Nháp cũ thiếu phiên bản chỉ được thử với expected version 0.
- Cập nhật danh mục làm mất sự tương ứng chỉ số thì chặn để chọn lại vật tư; không ghi đè form admin đang sửa. Không thay đổi nguồn/engine/UI của các module cũ.
- Kiểm chứng: **103 file / 1.532 test đạt**; 50 test lịch trong đó. ESLint các file thay đổi đạt; build đạt, chỉ còn cảnh báo Browserslist/chunk có sẵn.
- PostgreSQL WASM: migration chạy hai lần; admin lưu mới/cập nhật; gửi lại không trùng version/log; xung đột bị chặn; staff/anon bị từ chối; dữ liệu KTS cũ nguyên vẹn và RPC cũ vẫn lưu được. Script: `scripts/check-calendar-migration.cjs`.
- Browser QA dùng đúng module qua trang kiểm tra tạm: đọc máy chủ thật, hiện “Máy chủ chưa có bảng giá lịch”, không có bảng tiền hoặc nút sao chép. Trang tạm đã đóng và xóa. Không giả lập admin hay sửa dữ liệu thật để kiểm tra.
- Còn phải làm: áp dụng `docs/database/migration-calendar-module.sql` trên Supabase thật; admin mở module để tự gửi nháp hoặc lưu bảng giá lần đầu; xác nhận máy khác đọc cùng phiên bản. Chưa tuyên bố đồng bộ thật đã hoạt động.
