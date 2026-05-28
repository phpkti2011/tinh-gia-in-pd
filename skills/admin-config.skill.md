# Skill: Admin Config Management

Mục tiêu:
Admin chỉnh bảng giá trên frontend nhưng dữ liệu không hardcode trong code.

Luồng chuẩn:

```txt
loadConfig(module)
saveDraftConfig(module, data)
publishConfig(module, version)
rollbackConfig(module, version)
```

Yêu cầu:
- Có schema validate trước khi lưu.
- Có lịch sử version.
- Có ghi chú khi thay đổi.
- Chỉ admin được ghi.
- Staff/user chỉ được đọc config active.
