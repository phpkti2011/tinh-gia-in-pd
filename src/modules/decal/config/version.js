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

// 1.9.0 — LAMINATION_FILMS[i] thêm `extra` (tiền chênh báo khách) và `extraCost`
//   (tiền chênh giá vốn, chỉ In KTS: đ/m dài màng), optional. Có `extra` ⇒ giá màng =
//   giá Mờ/Bóng + chênh mỗi đơn vị, bỏ qua `percent`. Thiếu ⇒ % cũ ⇒ giá không đổi.
//   Xem src/utils/laminationFilm.js filmRate().

// 1.10.0 — printSheetSizes[i] thêm `a4Factor` (optional): số trang A4 quy đổi của tờ in khổ đó
//   (giống bảng khổ decal của In KTS: 33x33 và 33x35 = 1.5, 33x48 = 2.4, 32x43 = 2). Tiền chênh
//   màng đặc biệt (đ/trang A4) nhân với hệ số này ở CẢ tem lẻ lẫn bế demi. Thiếu field ⇒ engine
//   tra bảng theo cạnh dài (resolveA4Factor) ⇒ Mờ/Bóng và màng % cũ không đổi giá.
export const DECAL_CONFIG_SCHEMA_VERSION = '1.10.0';

export const DECAL_CONFIG_LAST_UPDATED = '2026-11-02';
