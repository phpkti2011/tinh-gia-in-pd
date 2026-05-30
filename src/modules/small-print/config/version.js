// Small-print config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật SMALL_PRINT_CONFIG_LAST_UPDATED.
// Khi nào MAJOR thay đổi: phải có migration script cho cloud config cũ
// (lưu trong Google Sheets + localStorage).

export const SMALL_PRINT_MODULE_NAME = 'small-print';

export const SMALL_PRINT_CONFIG_SCHEMA_VERSION = '1.0.0';

export const SMALL_PRINT_CONFIG_LAST_UPDATED = '2026-05-30';
