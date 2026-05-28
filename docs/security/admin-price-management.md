# Admin chỉnh giá trên frontend nhưng không hardcode

Yêu cầu đúng:

```txt
Admin vẫn chỉnh bảng giá trên giao diện frontend.
Nhưng password, token, quyền admin, bảng giá chính không được hardcode trong code frontend.
```

Luồng chuẩn:

```txt
Admin đăng nhập
→ Frontend kiểm tra session
→ Database kiểm tra role admin
→ Admin chỉnh bảng giá
→ Lưu config mới vào database
→ Ghi lịch sử thay đổi
→ Public/user lấy bảng giá active để tính giá
```

Không dùng:

```js
const ADMIN_PASSWORD = "..."
```

Không lưu secret trong:
- source code
- dist build
- file public
- localStorage dạng có thể dùng để vượt quyền
