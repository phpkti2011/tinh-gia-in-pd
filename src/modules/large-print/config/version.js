// Large-print config — schema version & metadata.
//
// Quy ước semver:
//   MAJOR: breaking change (rename / xóa field, đổi type).
//   MINOR: thêm field optional.
//   PATCH: doc/comment fix, không đổi shape.
//
// Khi bump version: tăng số + cập nhật LARGE_PRINT_CONFIG_LAST_UPDATED.
// Khi MAJOR thay đổi: phải có migration script cho cloud config cũ.

// Changelog:
//   1.4.0 — thêm FORMEX_DIE_CUT_SHAPES + MIN_FORMEX_DIE_CUT_PRICE (optional):
//           thành phẩm "Bế Formex" — bế chính tấm đã bồi Formex, tính theo tổng m²
//           của đơn, giá theo HÌNH DẠNG với 3 bậc LŨY TIẾN + 1 giá sàn chung.
//           Kèm id 'formexDieCut' trong LARGE_PRINT_FINISHING_OPS (deny-list theo
//           vật liệu). Engine chỉ tính khi đơn CÓ bồi Formex.
//           KEY TẦNG 1 (không nhét vào FINISHING_PRICES) vì configStorage merge
//           default chỉ 1 cấp — subkey mới sẽ bị config cũ trên Supabase nuốt mất.
//           Thiếu field = chưa khai giá bế → 0đ, config cũ vẫn hợp lệ, giá không đổi.
//   1.3.0 — thêm MACHINE_MAX_PRINT_WIDTH_M (optional, MÉT): khổ ngang máy in THẬT được.
//           Khổ in tại xưởng = min(số này, khổ cuộn lớn nhất của vật liệu) — vừa chặn
//           cách xếp tấm trong optimizeItemOnRoll, vừa chặn báo giá: tấm có cả 2 chiều
//           lớn hơn ⇒ engine trả { error, outsource, oversizeItems } thay vì giá.
//           Thiếu field = không giới hạn máy → config cũ vẫn hợp lệ, giá không đổi.
//   1.2.0 — thêm MATERIAL_TYPES[*].disallowedFinishing (optional): deny-list
//           thành phẩm theo từng vật liệu (vd bạt Hiflex không cán màng được).
//           Thiếu field = làm được tất cả → config cũ vẫn hợp lệ, giá không đổi.
//   1.1.0 — thêm PRINT_DISCOUNT_TIERS + STANDARD_SIZES (optional).
//   1.0.0 — bản đầu (tách config vào module ở TASK-0017).

export const LARGE_PRINT_MODULE_NAME = 'large-print';

export const LARGE_PRINT_CONFIG_SCHEMA_VERSION = '1.4.0';

export const LARGE_PRINT_CONFIG_LAST_UPDATED = '2026-09-24';
