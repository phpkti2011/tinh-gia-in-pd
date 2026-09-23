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

export const MOUNTING_LAYERS = { none: 0, yes: 2, '3_lop': 3 };

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

// Nhãn gửi khách / hiện trên màn hình.
export const MOUNTING_LABELS = { yes: 'bồi 2 lớp', '3_lop': 'bồi 3 lớp' };
