// Calendar config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật CALENDAR_CONFIG_LAST_UPDATED.
// Khi nào MAJOR thay đổi: phải có migration cho config cũ trên Supabase.

export const CALENDAR_MODULE_NAME = 'calendar';

// 2.0.0 — MAJOR. Khổ tấm carton chuyển vào TỪNG loại: materials.carton[i].{w,h} (cm).
//   Loại carton đang chọn ở màn tính giá quyết định sơ đồ cắt — engine/layout.js nhận
//   tham số `sheet`, không còn đọc một khổ dùng chung cho mọi loại.
//   geometry.stockW/stockH GIỮ LẠI làm BẢN SAO (mirror) của materials.carton[0].w/h:
//   engine mới không đọc, Cài Đặt không cho sửa, nhưng bundle cũ (service worker chưa
//   tải lại) và đường rollback vẫn validate được và báo giá đúng loại đầu tiên.
//   Mirror được ghi lại ở MỌI đường lưu — xem config/normalize.js:withStockMirror.
//   Config lưu TRƯỚC 2.0.0 được config/normalize.js điền w/h từ geometry.stockW/stockH
//   (fallback 60 × 100) ngay khi đọc ⇒ giá KHÔNG đổi một đồng, không cần migration SQL;
//   dòng trên Supabase tự lên hình dạng mới ở lần admin bấm Lưu kế tiếp.
// 1.0.0 — bản đầu: geometry.stockW/stockH là khổ tấm carton dùng chung.
export const CALENDAR_SCHEMA_VERSION = '2.0.0';
export const CALENDAR_CONFIG_LAST_UPDATED = '2026-10-02';
