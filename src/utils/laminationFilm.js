// Loại màng cán (Mờ / Bóng / …) — dùng chung cho 6 module có cán màng:
// small-print, catalogue, spiral, flyer, cheapdecal, decal.
//
// Mục đích chính là ghi ĐÚNG THÔNG TIN SẢN XUẤT vào chuỗi "Copy quy cách":
// xưởng phải biết cán mờ hay cán bóng. Mờ và Bóng mặc định phụ thu 0% nên
// KHÔNG đổi giá. Admin thêm loại mới (soft-touch, màng nhung…) kèm phụ thu.
//
// HAI CÁCH PHỤ THU (từng loại màng chọn một):
//   - `extra` (tiền chênh cố định) — cách đúng từ 11/2026: giá màng = giá Mờ/Bóng
//     (vẫn tra bậc số lượng) + chênh mỗi đơn vị. % cũ sai vì nhân theo bậc: bậc ít
//     trang (8.000đ/trang) + 150% đội quá cao, bậc nhiều trang (250đ/trang) gần như
//     không thu thêm. Xem filmRate().
//   - `percent` — cách cũ, chỉ còn hiệu lực khi màng CHƯA có `extra`, để giá đang
//     chạy không đổi một đồng tới khi admin nhập tiền chênh.
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

// Bảng màng chuẩn lấy theo In KTS khổ nhỏ (giá live 11/2026): Mờ/Bóng + 7 màng đặc biệt kèm
// tiền chênh báo khách `extra` (đ/đơn vị cán). Decal, Sổ lò xo, Catalogue, Tờ rơi, Decal giá rẻ
// lấy cùng tên + cùng số này làm mặc định. `extraCost` (chênh giá vốn đ/m dài) chỉ In KTS dùng
// nên không đưa sang module khác.
export const KTS_LAMINATION_FILMS = [
    { id: 'mo', name: 'Mờ', percent: 0 },
    { id: 'bong', name: 'Bóng', percent: 0 },
    { id: 'film_opt1h2', name: 'Màng 7 màu sọc chéo', extra: 600 },
    { id: 'film_dxwv5k', name: 'Màng kim tuyến cát', extra: 1700 },
    { id: 'film_jdxlxq', name: 'Màng Nhung', extra: 1600 },
    { id: 'film_mr05qx', name: 'Màng 7 màu bông tuyết', extra: 600 },
    { id: 'film_ev4tfo', name: 'Màng siêu chống trầy', extra: 1600 },
    { id: 'film_j7ne95', name: 'Màng kim tuyến tơ tằm', extra: 1700 },
    { id: 'film_gg7ibm', name: 'Màng Laminate (dày)', extra: 4000 },
];

// Bản sao để module gắn vào defaultConfig của mình (admin sửa không đụng hằng số gốc).
export function ktsLaminationFilms() {
    return KTS_LAMINATION_FILMS.map((f) => ({ ...f }));
}

const normFilmName = (s) =>
    String(s ?? '')
        .trim()
        .toLowerCase();

// Đồng bộ danh sách màng ĐANG CÓ của một module theo bảng màng In KTS khổ nhỏ:
//   - màng trùng tên (không phân biệt hoa/thường) ⇒ GIỮ id + tên, chỉ ghi đè `extra` theo In KTS
//     (id giữ nguyên để báo giá đã lưu không mất loại màng);
//   - màng In KTS còn thiếu ⇒ thêm vào cuối;
//   - màng riêng của module không có trong In KTS ⇒ để nguyên.
// `source` là bảng màng In KTS ĐANG CHẠY (config small-print: LAMINATION_FILMS) để module
// theo kịp mỗi khi admin đổi giá ở In KTS. Không truyền / rỗng ⇒ dùng bảng chuẩn KTS_LAMINATION_FILMS.
// Không bao giờ ghi `extraCost` (chênh vốn chỉ In KTS dùng). Trả mảng mới, không sửa mảng vào.
export function mergeKtsFilms(list, source) {
    const current = Array.isArray(list) ? list : [];
    const src = Array.isArray(source) && source.length > 0 ? source : KTS_LAMINATION_FILMS;
    const byName = new Map(src.map((f) => [normFilmName(f?.name), f]));
    const seen = new Set();
    const merged = current.map((f) => {
        const kts = byName.get(normFilmName(f?.name));
        if (!kts) return f;
        seen.add(normFilmName(kts.name));
        return filmUsesExtra(kts) && f.extra !== kts.extra ? { ...f, extra: Number(kts.extra) } : f;
    });
    const missing = src.filter((f) => f && !seen.has(normFilmName(f.name)));
    return [
        ...merged,
        ...missing.map((f) => {
            // eslint-disable-next-line no-unused-vars
            const { extraCost, ...rest } = f;
            return rest;
        }),
    ];
}

// Màng của bảng In KTS trùng tên với `film` (để UI biết màng nào đang "lấy theo In KTS").
export function findKtsFilm(source, film) {
    if (!Array.isArray(source)) return null;
    const key = normFilmName(film?.name);
    return source.find((f) => f && normFilmName(f.name) === key) || null;
}

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

// Loại màng đang ở chế độ TIỀN CHÊNH (có `extra` là số hữu hạn) hay chế độ % cũ.
export function filmUsesExtra(film) {
    return film != null && film.extra != null && Number.isFinite(Number(film.extra));
}

// Đơn giá cán màng ĐÃ ĐIỀU CHỈNH theo loại màng — dùng thay cho `đơn giá × filmMultiplier`.
//   - Màng có `extra` (tiền chênh cố định): baseRate + chênh. Chênh KHÔNG co giãn theo bậc
//     số lượng như %, nên màng đặc biệt đắt hơn Mờ/Bóng đúng một khoản trên mỗi đơn vị.
//     `field` = 'extra' (báo khách) hoặc 'extraCost' (giá vốn In KTS, đ/m dài màng);
//     chế độ tiền chênh mà thiếu `extraCost` ⇒ chênh vốn 0.
//   - Màng chưa nhập tiền chênh ⇒ % cũ: baseRate × (1 + percent/100).
//   - CHƯA CHỌN / id lạ ⇒ baseRate (không đổi giá).
// Đơn vị của chênh do caller quyết (đ/trang A4, đ/tờ, đ/cái…), phải khớp đơn vị baseRate.
export function filmRate(list, id, baseRate, field = 'extra') {
    const film = findLaminationFilm(list, id);
    if (!film) return baseRate;
    if (filmUsesExtra(film)) {
        const extra = Number(film[field]);
        return baseRate + (Number.isFinite(extra) ? extra : 0);
    }
    return baseRate * filmMultiplier(list, id);
}

// Tiền chênh của màng trên MỘT đơn vị (0 nếu màng ở chế độ % / chưa chọn). Dùng cho bậc
// "trọn gói": phí gói nhân % như cũ, còn chênh cộng theo số trang thật.
export function filmExtra(list, id, field = 'extra') {
    const film = findLaminationFilm(list, id);
    if (!filmUsesExtra(film)) return 0;
    const extra = Number(film[field]);
    return Number.isFinite(extra) ? extra : 0;
}

// Tiền cán màng cho `units` đơn vị với đơn giá gốc `rate`: chế độ tiền chênh ⇒
// units × (rate + chênh); chế độ % / chưa chọn ⇒ units × rate × hệ số (đúng thứ tự nhân
// cũ của catalogue/spiral/tờ rơi/decal để golden test khoá giá không lệch 1 ULP).
export function filmPerUnit(list, id, units, rate, field = 'extra') {
    const film = findLaminationFilm(list, id);
    if (filmUsesExtra(film)) return units * (rate + filmExtra(list, id, field));
    return units * rate * filmMultiplier(list, id);
}

// Phí phẳng (bậc trọn gói) cho `units` đơn vị: chế độ tiền chênh ⇒ phí + chênh × units;
// chế độ % ⇒ phí × hệ số như trước.
export function filmLumpSum(list, id, lump, units, field = 'extra') {
    const film = findLaminationFilm(list, id);
    if (filmUsesExtra(film)) return lump + filmExtra(list, id, field) * units;
    return lump * filmMultiplier(list, id);
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
