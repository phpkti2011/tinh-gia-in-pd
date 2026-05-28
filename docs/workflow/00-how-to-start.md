# Cách bắt đầu

Không làm trực tiếp trên source chính ngay.

Thứ tự đúng:

1. Backup source hiện tại.
2. Đưa source lên Git/private repo.
3. Copy bộ framework này vào root project.
4. Tạo nhánh mới: `refactor/software-company-architecture`.
5. Chạy kiểm tra hiện trạng:
   - `npm install`
   - `npm run build`
6. Tạo baseline audit.
7. Tạo golden test cases cho từng module tính giá.
8. Sau khi có test mới bắt đầu tách engine khỏi UI.

Nguyên tắc quan trọng:
- Không đổi công thức khi chưa có test.
- Không sửa nhiều module cùng lúc.
- Không để Claude tự ý đổi toàn bộ cấu trúc trong một lần.
- Sau mỗi task phải build/test và commit.
