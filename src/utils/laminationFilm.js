// Loại màng cán (Mờ / Bóng / …) — dùng chung cho 6 module có cán màng:
// small-print, catalogue, spiral, flyer, cheapdecal, decal.
//
// Mục đích chính là ghi ĐÚNG THÔNG TIN SẢN XUẤT vào chuỗi "Copy quy cách":
// xưởng phải biết cán mờ hay cán bóng. Mờ và Bóng mặc định phụ thu 0% nên
// KHÔNG đổi giá. Admin thêm loại mới (soft-touch, màng nhung…) kèm % phụ thu
// cộng trên tiền cán màng.
//
// ⚠ HAI TÍNH CHẤT AN TOÀN — lý do 128 golden test khoá giá vẫn phải xanh:
//   1. Config cũ chưa có danh sách  → dùng mặc định Mờ/Bóng 0% → giá không đổi.
//   2. Nhân viên CHƯA CHỌN loại màng → hệ số nhân = 1        → giá không đổi.
// Việc "bắt phải chọn" chỉ tác động lên CHỮ trong chuỗi copy, tuyệt đối không
// tác động lên tiền.
//
// Mô hình lấy từ module Tem tờ (sticker) vốn đã làm đúng việc này:
// xem `finishes` trong src/modules/sticker/config/defaultConfig.js — mỗi loại
// màng có `name` + `percent`.

export const DEFAULT_LAMINATION_FILMS = [
    { id: 'mo', name: 'Mờ', percent: 0 },
    { id: 'bong', name: 'Bóng', percent: 0 },
];

// Danh sách loại màng của một module. Thiếu / rỗng / sai kiểu ⇒ mặc định.
export function getLaminationFilms(list) {
    return Array.isArray(list) && list.length > 0 ? list : DEFAULT_LAMINATION_FILMS;
}

export function findLaminationFilm(list, id) {
    if (!id) return null;
    return getLaminationFilms(list).find((f) => f && f.id === id) || null;
}

// Hệ số nhân vào tiền cán màng. CHƯA CHỌN hoặc id lạ ⇒ 1 (không đổi giá).
export function filmMultiplier(list, id) {
    const film = findLaminationFilm(list, id);
    const pct = Number(film?.percent);
    if (!Number.isFinite(pct)) return 1;
    return 1 + pct / 100;
}

// Tên để ghi vào chuỗi quy cách. CHƯA CHỌN ⇒ null (caller tự ghi cảnh báo).
export function filmName(list, id) {
    const film = findLaminationFilm(list, id);
    return typeof film?.name === 'string' && film.name.trim() ? film.name.trim() : null;
}

// Cụm chữ chèn vào quy cách: 'mờ' | 'bóng' | '(CHƯA CHỌN mờ/bóng)'.
// Dùng khi ĐÃ có cán màng — nhân viên buộc phải chọn loại, chưa chọn thì nói
// thẳng để xưởng hỏi lại, không đoán bừa.
export const FILM_UNSET_NOTE = '(CHƯA CHỌN mờ/bóng)';

export function filmPhrase(list, id) {
    const name = filmName(list, id);
    return name ? name.toLowerCase() : FILM_UNSET_NOTE;
}

// Sinh id ổn định cho loại màng admin thêm mới — đổi tên không làm hỏng lựa
// chọn đã lưu trong báo giá cũ.
export function newFilmId() {
    return 'film_' + Math.random().toString(36).slice(2, 8);
}
