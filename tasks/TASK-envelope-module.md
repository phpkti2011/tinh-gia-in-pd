# TASK — Hoàn thiện module Bao thư

Trạng thái: hoàn thành source và kiểm tra cục bộ trên `codex/envelope-module`; chưa triển khai máy chủ.

## Mục tiêu và phạm vi

Hoàn thành kế hoạch đã duyệt trong `docs/ke-hoach-module-kho-trai-bao-thu.md`: sáu công thức khổ trải, hình kiểm tra, giá qua KTS, giấy mặt sau không in, ép nhũ, cài đặt bậc giá và đồng bộ có kiểm tra phiên bản.

Kế thừa mã nguồn đang làm dở; giữ hành vi Lịch bàn qua adapter tương thích. Không thay đổi các chỉnh sửa có sẵn ở LaminationFilmSelect, DecalResultPanel và SQL nền. Không triển khai lên máy chủ trong bước hoàn thiện source.

## Các bước và điều kiện kiểm tra

| Bước | Phụ thuộc | Trạng thái | Điều kiện |
| --- | --- | --- | --- |
| 1. Rà soát source và tài liệu | — | Xong | Đối chiếu công thức F01–F07 và yêu cầu đã chốt |
| 2. Hoàn thiện giao diện/cài đặt | 1 | Xong | Không hiện giá cũ khi input lỗi; giữ quyền xem vốn; danh sách giấy đúng |
| 3. Kiểm thử engine, giao diện, đồng bộ | 2 | Xong | Kiểm tra I01–I11, nháp, xung đột và offline |
| 4. Kiểm tra migration và build | 3 | Xong cục bộ | Kiểm tra SQL trên PostgreSQL cục bộ, toàn bộ test và build |
| 5. Hướng dẫn bàn giao | 4 | Xong | README và kết quả bên dưới |

## Hợp đồng cần giữ

- Khổ khuôn bằng mm, không chứa bleed; số lượng mỗi phần bằng số bao thư.
- Mặt sau không in: chỉ giấy ram, tiền in bằng 0 và không áp sàn in.
- Ép nhũ gọi engine KTS một lần theo số bao thư, không nhân theo số phần.
- Máy chủ là nguồn giá; lỗi kết nối/nháp chưa lưu chặn báo giá.
- Chỉ admin có quyền xem vốn và lưu cài đặt; RPC kiểm tra quyền và phiên bản.

## Kiểm tra và giới hạn

Ngày 27/09/2026:

- `npm test -- --reporter=dot` với `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY` để trống: **107 file, 1608 test đạt**, trong đó 76 test Bao thư. Test Lịch bàn và các module cũ đều đạt.
- `npm run build`: đạt; Vite còn cảnh báo bundle chung lớn hơn 500 kB.
- ESLint cho module Bao thư, adapter dùng chung, tiện ích mới và các test Bao thư: đạt, không cảnh báo.
- Prettier cho các file JS/JSX liên quan: đạt. `git diff --check`: đạt.
- `node scripts/check-envelope-migration.cjs`: đạt trên PGlite, gồm chạy migration hai lần, lưu admin, gửi lại trùng, xung đột phiên bản, nhật ký, chặn staff/anon; Lịch bàn và KTS vẫn lưu được.
- Thử trình duyệt tại `http://127.0.0.1:5178/`: thẻ Bao thư mở được; mẫu tách 350×250 mm cho phần trước 380×305, mặt sau 347×247; đổi cm và cạnh H cho 40,5×28 cm và 34,7×24,7 cm. Quan sát SVG đúng nắp, tay dán, đường gấp, nhãn kích thước. Bản xem thử không nối Supabase nên chỉ hiển thị hình và chặn báo giá như thiết kế.

Rà soát và sửa: giữ ít nhất một giấy được chọn để không vô tình mở toàn bộ danh mục; cập nhật mặc định bằng trạng thái hiện tại để không ghi đè thao tác đang nhập; sửa fixture giá liền thân về khổ lọt máy và giữ test riêng cho khổ vượt máy; sửa helper test để thực sự truyền lựa chọn ép nhũ.

**Còn trước triển khai:** chạy migration trên Supabase, kiểm tra lưu bằng tài khoản admin thật, xác nhận giá thực tế thay số mẫu. Chưa push/deploy và chưa thay dữ liệu máy chủ. Các phép kiểm tra quyền/đồng bộ ở trên dùng test giả lập và PostgreSQL cục bộ.

Hoàn tác: bỏ phần tích hợp Bao thư và khôi phục adapter từ phiên bản trước; không xóa các chỉnh sửa ngoài phạm vi đã có trong workspace.
