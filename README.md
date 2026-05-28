# P&D Price Calculator Framework

Bộ file này dùng để thiết lập lại dự án phần mềm tính giá in theo quy trình software company.

Mục tiêu:
- Không sửa source tùy tiện.
- Không thay đổi công thức nếu chưa có test case.
- Tách UI, pricing engine, config, admin, storage/database.
- Admin vẫn chỉnh bảng giá trên frontend nhưng không hardcode mật khẩu/giá trong code.
- Mỗi task nhỏ, có build/test/checkpoint rõ ràng.

Cách dùng nhanh:
1. Copy toàn bộ thư mục này vào root source code phần mềm tính giá.
2. Đọc `docs/workflow/00-how-to-start.md`.
3. Gửi nội dung `prompts/START_WITH_CLAUDE.md` cho Claude/Antigravity.
4. Chỉ làm từng task trong thư mục `tasks/`, không yêu cầu Claude refactor toàn bộ một lần.
