// Small-print — luật BỒI THÀNH PHẨM. Nguồn duy nhất, dùng chung engine + 2 panel + jobSpec.
//
// Khi bồi, mỗi tờ giấy CHỈ IN ĐƯỢC 1 MẶT (in xong mới dán chồng lên nhau). Nên:
//
//   tờ IN mỗi bộ    = số mặt in của thành phẩm   (1 hoặc 2)
//   tờ TRẮNG mỗi bộ = số lớp − số mặt in          (không bao giờ âm)
//   trang in (click) = KHÔNG ĐỔI
//
//   | kiểu   | mặt in | tờ in | tờ trắng |
//   | 2 lớp  | 1      | 1     | 1        |
//   | 2 lớp  | 2      | 2     | 0        |
//   | 3 lớp  | 1      | 1     | 2        |
//   | 3 lớp  | 2      | 2     | 1        |
//
// Trang in không đổi vì 2 tờ × 1 mặt = 2 lượt in, đúng bằng 1 tờ × 2 mặt. Chỉ SỐ TỜ GIẤY
// tăng. Trước v1.5.0 phần mềm ép số mặt in về 1 khi bồi và không nhân số tờ giấy, nên đơn
// bồi thành phẩm 2 mặt không có cách nào báo đúng, còn tờ giấy lót thì không tính đồng nào.
//
// Key 'yes' = bồi 2 lớp. CỐ Ý giữ tên cũ: nó nằm trong config đã lưu và trong params của
// báo giá đã lưu, đổi tên là breaking. Nhãn hiển thị mới là "Bồi 2 lớp".

//
// Bồi bằng KEO 2 MẶT (config 1.11.0): 'keo_2_lop' / 'keo_3_lop'. Luật tờ in / tờ trắng y
// hệt bồi thường cùng số lớp. Khác ở tiền công: không tra bảng MOUNTING_CONFIG mà tính
// theo TẤM KEO — mỗi chỗ tiếp giáp giữa 2 lớp dán 1 tấm ⇒ số tấm = số lớp − 1. Mỗi tấm
// tính như cán màng 1 mặt trên tờ in (giá cán theo trang A4 + tiền chênh), xem
// engine/quote.js + engine/finishing.js và TAPE_MOUNTING_CONFIG.

export const MOUNTING_LAYERS = { none: 0, yes: 2, '3_lop': 3, keo_2_lop: 2, keo_3_lop: 3 };

// 0 = không bồi. Type lạ / thiếu ⇒ 0 (dễ dãi, giữ nguyên hành vi cho params cũ).
export function mountingLayers(type) {
    return MOUNTING_LAYERS[type] || 0;
}

export function isMounted(type) {
    return mountingLayers(type) > 0;
}

// Số tờ giấy IN cho mỗi bộ thành phẩm. Không bồi ⇒ 1 (1 tờ in được cả 2 mặt).
export function printedSheetsPerSet(type, printSides) {
    if (!isMounted(type)) return 1;
    const sides = Number(printSides);
    return sides > 0 ? sides : 1;
}

// Số tờ giấy TRẮNG (không in) cho mỗi bộ. Không bồi ⇒ 0.
export function blankSheetsPerSet(type, printSides) {
    const layers = mountingLayers(type);
    if (layers === 0) return 0;
    const sides = Number(printSides) > 0 ? Number(printSides) : 1;
    return Math.max(0, layers - sides);
}

export function isTapeMounting(type) {
    return type === 'keo_2_lop' || type === 'keo_3_lop';
}

// Số tấm keo 2 mặt cho mỗi bộ. Không phải bồi keo ⇒ 0.
export function tapeSheetsPerSet(type) {
    return isTapeMounting(type) ? mountingLayers(type) - 1 : 0;
}

// Config của bồi keo, bù mặc định cho config đã lưu trước 1.11.0 / số admin nhập lỗi.
export function tapeMountingConfig(config) {
    const c = config?.TAPE_MOUNTING_CONFIG || {};
    const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);
    return {
        extra: num(c.extra, 0),
        extraCost: num(c.extraCost, 0),
        blankPaperMarkup: num(c.blankPaperMarkup, 2),
    };
}

// Nhãn gửi khách / hiện trên màn hình.
export const MOUNTING_LABELS = {
    yes: 'bồi 2 lớp',
    '3_lop': 'bồi 3 lớp',
    keo_2_lop: 'bồi keo 2 mặt 2 lớp',
    keo_3_lop: 'bồi keo 2 mặt 3 lớp',
};
