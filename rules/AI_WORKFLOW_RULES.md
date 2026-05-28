# AI Workflow Rules

Khi giao task cho Claude/Antigravity:

1. Claude phải đọc task file trước.
2. Claude phải liệt kê file dự kiến sửa.
3. Claude không được tự ý refactor ngoài phạm vi.
4. Claude không được xóa chức năng hiện có.
5. Claude không được đổi UI lớn nếu task không yêu cầu.
6. Claude phải giữ backward compatibility.
7. Claude phải chạy build/test sau khi sửa.
8. Claude phải báo cáo kết quả bằng tiếng Việt.

Không dùng prompt kiểu:

```txt
Hãy sửa lại toàn bộ source cho chuyên nghiệp.
```

Nên dùng prompt kiểu:

```txt
Hãy thực hiện TASK-0003. Chỉ sửa các file liên quan tới module decal engine. Không thay đổi UI. Không đổi công thức ngoài phạm vi test.
```
