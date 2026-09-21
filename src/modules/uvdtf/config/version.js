// UV DTF config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật UVDTF_CONFIG_LAST_UPDATED.
// Khi nào MAJOR thay đổi: phải có migration script cho cloud config cũ.

// Changelog:
//   1.1.0 — thêm dieCutPriceTiers (optional): bảng giá theo mét tới RIÊNG cho hàng CÓ BẾ,
//           THAY THẾ đơn giá/mét chứ không phải phụ thu cộng thêm.
//           CỐ Ý không có trong UVDTF_DEFAULT_CONFIG: loadConfigFromCloud merge nông
//           {...default, ...saved} nên để field trong default sẽ nhét bảng giá mặc định
//           vào xưởng vốn đã có bảng giá riêng. Thiếu field / mảng rỗng = hàng có bế tính
//           y hệt hàng không bế ⇒ config cũ vẫn hợp lệ, giá không đổi.
//           Rollback về bản < 1.1.0 sẽ mất field ⇒ giá có bế quay về bằng giá không bế.
//           Đúng ý "về lại bảng giá cũ", nhưng cần biết trước.
//   1.0.0 — bản đầu (tách config vào module ở TASK-0013).

export const UVDTF_MODULE_NAME = 'uvdtf';

export const UVDTF_CONFIG_SCHEMA_VERSION = '1.1.0';

export const UVDTF_CONFIG_LAST_UPDATED = '2026-09-21';
