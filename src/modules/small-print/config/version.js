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

// 1.1.0 — thêm field optional, không breaking:
//   - PRINTER_CONFIG[*].customerA4Tiers: bảng quy đổi trang A4 cho GIÁ KHÁCH,
//     tách khỏi clickTiers (giá vốn). Vắng mặt → engine fallback như cũ.
//   - Mở cho admin sửa từ tab Cài Đặt: A4_CONVERSION_RATES, COMMON_SHEET_SIZES,
//     STANDARD_LARGE_SHEET_SIZES, ART_PAPER_LARGE_SHEET_SIZES,
//     PAPER_REFERENCE_CONFIG, PRINT_CONTENT_CONFIG, ART_PAPER_SURCHARGE,
//     PRINTER_CONFIG[*].maxW/maxH/vkPoints. Shape không đổi, chỉ thêm UI.
//   - Sửa số MẶC ĐỊNH: C2060.customerA4Tiers thêm bậc {maxH: 35, factor: 1.5}
//     để tờ 35cm ra 1.5 trang (khớp A4_CONVERSION_RATES + C6085) thay vì rơi
//     vào bậc 48 và bị tính 2.4 trang.
// 1.2.0 — thêm field optional, không breaking:
//   - PRINTER_CONFIG[*].a4ConversionRates: bảng quy đổi A4 theo chiều cao CHÍNH
//     XÁC, riêng từng máy, dùng cho giấy thường + decal xi bạc. Vắng mặt →
//     engine fallback về A4_CONVERSION_RATES chung như cũ.
//   - A4_CONVERSION_RATES giữ nguyên, đổi vai trò thành fallback + mẫu cho máy
//     thêm mới. Giá trị mặc định 2 máy giống hệt nhau nên bật lên KHÔNG đổi giá.
export const SMALL_PRINT_CONFIG_SCHEMA_VERSION = '1.2.0';

export const SMALL_PRINT_CONFIG_LAST_UPDATED = '2026-09-12';
