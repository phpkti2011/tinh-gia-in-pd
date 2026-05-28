# Kiến trúc mục tiêu

Source nên được tổ chức theo module nghiệp vụ.

```txt
src/
  app/
    App.jsx
    routes.jsx

  modules/
    small-print/
      ui/
      engine/
      config/
      tests/

    large-print/
      ui/
      engine/
      config/
      tests/

    decal/
      ui/
      engine/
      config/
      tests/

    uvdtf/
      ui/
      engine/
      config/
      tests/

  admin/
    ui/
    services/
    config-editor/

  shared/
    pricing/
    config/
    auth/
    database/
    ui/
    utils/
```

Quy tắc tách lớp:

```txt
UI: nhập dữ liệu, hiển thị kết quả.
Engine: tính giá, không phụ thuộc React.
Config: bảng giá, schema, version.
Admin: màn hình chỉnh bảng giá.
Database service: đọc/ghi config.
Test: khóa kết quả tính giá.
```
