// Decal config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật DECAL_CONFIG_LAST_UPDATED.
// Khi nào MAJOR thay đổi: phải có migration script cho cloud config cũ
// (lưu trong Google Sheets + localStorage).

export const DECAL_MODULE_NAME = 'decal';

//   1.7.0 - them LAMINATION_FILMS (optional): loai mang can (Mo/Bong/...),
//           phu thu % cong tren tien can mang. Thieu field = mac dinh Mo/Bong 0%
//           => gia khong doi.
//   1.8.0 - them contentSurcharge (optional): phu thu nhieu noi dung, gom
//           singleContentPercent (moi noi dung chi in 1 cai) + bang bac
//           {min, max, percent}. Thieu field = phu thu 0% => gia khong doi.

export const DECAL_CONFIG_SCHEMA_VERSION = '1.8.0';

export const DECAL_CONFIG_LAST_UPDATED = '2026-09-19';
