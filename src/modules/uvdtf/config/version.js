// UV DTF config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật UVDTF_CONFIG_LAST_UPDATED.
// Khi nào MAJOR thay đổi: phải có migration script cho cloud config cũ.

export const UVDTF_MODULE_NAME = 'uvdtf';

export const UVDTF_CONFIG_SCHEMA_VERSION = '1.0.0';

export const UVDTF_CONFIG_LAST_UPDATED = '2026-05-30';
