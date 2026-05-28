# TASK-0004: Tách decal pricing engine

Mục tiêu:
Tách logic tính giá decal khỏi UI/component.

Điều kiện trước khi làm:
- TASK-0003 pass.

Việc cần làm:
1. Tạo `src/modules/decal/engine/`.
2. Tách các hàm tính decal vào engine.
3. Engine nhận `input` và `config`.
4. UI gọi engine mới.
5. Golden tests phải pass.
6. Build phải pass.

Không làm:
- Không đổi giao diện lớn.
- Không thêm Supabase ở task này.
