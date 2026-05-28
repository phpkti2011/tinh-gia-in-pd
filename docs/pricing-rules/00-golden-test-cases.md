# Golden Test Cases

Golden test cases là bộ đơn mẫu dùng để đảm bảo sau khi refactor, kết quả tính giá không bị sai.

Mỗi case cần ghi:

```txt
Module:
Tên case:
Input:
- kích thước
- số lượng
- vật liệu/giấy
- cán màng/thành phẩm
- các tùy chọn liên quan

Expected output hiện tại:
- số con/tờ
- số tờ
- tiền in cơ bản
- phụ phí
- tổng tiền
- đơn giá
```

Không refactor engine nếu chưa có golden test case.
