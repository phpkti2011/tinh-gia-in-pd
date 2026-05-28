# Coding Rules

Bắt buộc:

1. Không đổi công thức nếu task không yêu cầu.
2. Không sửa nhiều module trong cùng một task.
3. Không hardcode password/token/secret trong frontend.
4. Không gọi database trực tiếp trong pricing engine.
5. Engine phải là pure function.
6. UI không chứa công thức tính giá.
7. Config phải có schema/version.
8. Sau mỗi task phải chạy build.
9. Nếu có test thì chạy test.
10. Báo cáo rõ file đã sửa.

Commit convention:

```txt
chore: ...
test: ...
refactor: ...
feat: ...
fix: ...
docs: ...
```
