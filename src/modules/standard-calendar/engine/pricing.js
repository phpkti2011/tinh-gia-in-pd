// Engine thuần cho bảng giá lịch khổ chuẩn: không đọc storage/network, không biết gì về React.
//
// Quy tắc tra giá (giữ NGUYÊN như file nguồn "bang_tinh_gia_lich_de_ban_kho chuan.html"):
//   - Số lượng trùng một bậc  → đơn giá của bậc đó.
//   - Nằm giữa hai bậc [low, high] → chọn MỘT trong hai đơn giá, KHÔNG nội suy:
//       ngưỡng = low + ceil((high − low) × 70%)
//       qty < ngưỡng → đơn giá bậc low;  qty ≥ ngưỡng → đơn giá bậc high.
//     Tổng = đơn giá đã chọn × qty.
//   - Lớn hơn bậc cuối → không có giá, báo giá riêng.
//   - Không phải số nguyên ≥ 1 → không hợp lệ.

// 70% viết bằng số nguyên (7/10) để ceil không dính sai số dấu phẩy động.
const THRESHOLD_NUM = 7;
const THRESHOLD_DEN = 10;

function thresholdBetween(low, high) {
    return low + Math.ceil(((high - low) * THRESHOLD_NUM) / THRESHOLD_DEN);
}

export function standardCalendarPrice(tiers, qty) {
    if (!Array.isArray(tiers) || tiers.length === 0) return { type: 'invalid' };
    if (!Number.isInteger(qty) || qty < 1) return { type: 'invalid' };

    const maxQty = tiers[tiers.length - 1][0];
    if (qty > maxQty) return { type: 'over', qty, maxQty };

    let type;
    let tierQty; // bậc giá thực sự được áp
    let unit;
    const exact = tiers.find(([q]) => q === qty);
    if (exact) {
        type = 'exact';
        [tierQty, unit] = exact;
    } else {
        // qty nằm trong (tiers[0][0], maxQty) nên luôn có cặp low < qty < high.
        const i = tiers.findIndex(([q]) => q > qty);
        const [lowQty, lowUnit] = tiers[i - 1];
        const [highQty, highUnit] = tiers[i];
        type = 'range';
        if (qty < thresholdBetween(lowQty, highQty)) {
            tierQty = lowQty;
            unit = lowUnit;
        } else {
            tierQty = highQty;
            unit = highUnit;
        }
    }

    const total = unit * qty;
    return {
        type,
        qty,
        unit,
        total,
        tierQty,
        // Cận dưới/trên của khoảng số lượng đang đứng giữa (exact: cả hai là chính bậc đó).
        betweenQty: type === 'range' ? [lowerTier(tiers, qty), upperTier(tiers, qty)] : null,
        cheaperTier: findCheaperHigherTier(tiers, qty, total),
    };
}

function lowerTier(tiers, qty) {
    return [...tiers].reverse().find(([q]) => q < qty)[0];
}
function upperTier(tiers, qty) {
    return tiers.find(([q]) => q > qty)[0];
}

// Bảng nguồn có chỗ đặt NHIỀU cuốn hơn lại rẻ hơn tổng (vd 25×15: 90 cuốn 9.882.000đ nhưng 100 cuốn
// 9.820.000đ). Engine KHÔNG tự sửa giá — chỉ báo để nhân viên gợi ý khách đặt tròn bậc đó.
function findCheaperHigherTier(tiers, qty, total) {
    for (const [q, unit] of tiers) {
        if (q > qty && unit * q < total) return { qty: q, unit, total: unit * q };
    }
    return null;
}

// Dòng bảng giá để hiển thị: [{ qty, unit, total }].
export function standardCalendarRows(tiers) {
    return tiers.map(([qty, unit]) => ({ qty, unit, total: qty * unit }));
}

// Kiểm tra hình dạng bảng giá (dùng trong test): qty nguyên ≥ 1 tăng dần, đơn giá nguyên dương.
export function validateStandardCalendarTiers(tiers) {
    const errors = [];
    if (!Array.isArray(tiers) || tiers.length === 0) return ['Bảng giá trống'];
    tiers.forEach(([qty, unit], i) => {
        if (!Number.isInteger(qty) || qty < 1) errors.push(`Bậc ${i + 1}: số lượng không hợp lệ`);
        if (!Number.isInteger(unit) || unit <= 0) errors.push(`Bậc ${i + 1}: đơn giá không hợp lệ`);
        if (i > 0 && qty <= tiers[i - 1][0]) errors.push(`Bậc ${i + 1}: số lượng không tăng dần`);
    });
    return errors;
}

export function buildStandardCalendarQuoteText(product, r) {
    if (!r || (r.type !== 'exact' && r.type !== 'range')) return '';
    const vnd = (n) => n.toLocaleString('vi-VN') + ' đ';
    return [
        `Lịch để bàn khổ chuẩn · ${product.name}`,
        `Số lượng: ${r.qty.toLocaleString('vi-VN')} cuốn`,
        `Đơn giá: ${vnd(r.unit)} / cuốn`,
        `Tổng báo khách: ${vnd(r.total)}`,
    ].join('\n');
}
