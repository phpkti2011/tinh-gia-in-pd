// Flyer (tính giá tờ rơi) config — schema version & metadata.

export const FLYER_MODULE_NAME = 'flyer';

//   1.1.0 - them LAMINATION_FILMS (optional): loai mang can (Mo/Bong/...),
//           phu thu % cong tren tien can mang. Thieu field = mac dinh Mo/Bong 0%
//           => gia khong doi.

// 1.2.0 — LAMINATION_FILMS[i] thêm `extra` (tiền chênh báo khách) và `extraCost`
//   (tiền chênh giá vốn, chỉ In KTS: đ/m dài màng), optional. Có `extra` ⇒ giá màng =
//   giá Mờ/Bóng + chênh mỗi đơn vị, bỏ qua `percent`. Thiếu ⇒ % cũ ⇒ giá không đổi.
//   Xem src/utils/laminationFilm.js filmRate().
export const FLYER_CONFIG_SCHEMA_VERSION = '1.2.0';

export const FLYER_CONFIG_LAST_UPDATED = '2026-11-02';
