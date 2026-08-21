// Catalogue (bấm kim) config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật CATALOGUE_CONFIG_LAST_UPDATED.

export const CATALOGUE_MODULE_NAME = 'catalogue';

export const CATALOGUE_CONFIG_SCHEMA_VERSION = '1.0.0';

export const CATALOGUE_CONFIG_LAST_UPDATED = '2026-07-28';
