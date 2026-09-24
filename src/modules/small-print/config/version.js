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
//   1.3.0 - them LAMINATION_FILMS (optional): loai mang can (Mo/Bong/...),
//           phu thu % cong tren tien can mang. Thieu field = mac dinh Mo/Bong 0%
//           => gia khong doi.
// 1.8.0 — PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage (optional number): mức GIÁ SÀN
//   thứ hai, đ/trang A4, dành cho giấy KHÔNG tính theo ram (m² / theo tờ / gõ tay) — sàn
//   chỉ bao tiền IN, tiền giấy cộng theo giá thật. Giấy ram vẫn dùng minPrintPricePerPage
//   đã có (mức đó ĐÃ GỒM giấy). Xem engine/floorPrice.js.
//   ĐỔI GIÁ CÓ CHỦ ĐÍCH: trước đây minPrintPricePerPage chỉ tô màu MỘT DÒNG CHỮ trong panel
//   admin, không chặn gì cả. Nay hai mức này vừa là "Giá Tối Thiểu", vừa kẹp giá báo khách
//   (khách = max(bảng giá, sàn)) ⇒ đơn nào đang dưới sàn sẽ báo cao hơn trước.
//   Đặt sàn = 0 ⇒ tắt, mọi giá về y như trước.
//   ⚠ Subkey mới BÊN TRONG key cũ ⇒ merge nông tầng 1 KHÔNG bù được ⇒ phải đi qua
//   withPaperReferenceDefaults(), nếu không sàn tắt trong im lặng trên máy đã từng Lưu.
// 1.7.0 — PAPER_STOCK_DATA[*].sheetSizes (optional array): giấy bán THEO TỜ khổ cố định
//   khai được NHIỀU khổ, mỗi khổ một giá ([{w,h,price}] — 33×48 = 5.500đ/tờ, 33×64 =
//   7.000đ/tờ…). Engine thử hết rồi chọn rẻ nhất, y như giấy ram với COMMON_SHEET_SIZES.
//   Vắng field ⇒ suy ra đúng 1 khổ từ cặp { sheetSize, sheetPrice } cũ ⇒ config đã lưu ra
//   giá không đổi một đồng. sheetSizes là NGUỒN ĐÚNG; cặp cũ được Cài Đặt ghi mirror theo
//   dòng 1 để máy chưa tải lại bundle (và đường rollback) vẫn báo giá đúng.
//   ⚠ Catalogue và Lò xo dùng CHUNG bảng giấy này và cũng gọi calculatePerSheetOptions →
//   thêm khổ là thêm phương án ở cả 3 module.
// 1.6.0 — PAPER_STOCK_DATA[*].hidden (optional boolean): ẩn một loại giấy khỏi mọi ô
//   chọn ở màn tính giá mà KHÔNG xoá khỏi mảng. Giấy nhận diện bằng VỊ TRÍ trong mảng
//   (params.paperType = '3') nên xoá thật sẽ làm mọi giấy phía sau tụt 1 bậc — đơn đang
//   mở lặng lẽ đổi giấy, lan sang cả Catalogue và Lò xo (dùng chung bảng giấy).
//   Admin thêm giấy (luôn nối vào CUỐI) và đổi cách tính giá ngay trong Cài Đặt.
//   Thiếu field = hiện bình thường → config cũ vẫn hợp lệ, giá không đổi.
// 1.5.0 — bồi thành phẩm: thêm kiểu MOUNTING_CONFIG['3_lop'] (bồi 3 lớp) + 2 field
//   blankPaperType / blankPaperMarkup cho mỗi kiểu, và ĐẾM ĐÚNG SỐ TỜ GIẤY khi bồi:
//   tờ in = số mặt in, tờ trắng = số lớp − số mặt in (xem engine/mounting.js).
//   ĐỔI GIÁ CÓ CHỦ ĐÍCH: trước đây bồi ép số mặt in về 1 và không tính tờ giấy lót, nên
//   đơn bồi 1 mặt bị thiếu tiền 1 tờ giấy và đơn bồi 2 mặt không báo đúng được.
//   Subkey mới KHÔNG được merge nông bù cho ⇒ phải đi qua withMountingDefaults().
// 1.4.0 — thêm PLASTIC_LAMINATION_CONFIG (optional): ép plastic (màng nhiệt bỏ
//   túi) theo độ dày × khổ × bậc SL + dòng sàn giá tối thiểu (chỉ admin thấy,
//   cộng thẳng vào Giá Tối Thiểu). Thiếu field → engine trả 0, ô chọn ẩn ở màn
//   tính giá → giá không đổi. Xem src/utils/plasticLamination.js.

export const SMALL_PRINT_CONFIG_SCHEMA_VERSION = '1.8.0';

export const SMALL_PRINT_CONFIG_LAST_UPDATED = '2026-09-24';
