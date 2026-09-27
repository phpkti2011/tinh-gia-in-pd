// Bậc giá theo số lượng dùng chung cho các module nội bộ (lịch bàn, bao thư).
//
// Một bậc = { from, cost, sale }: mốc "từ số lượng" áp dụng tới trước mốc kế tiếp,
// bậc cuối không giới hạn trên. Bậc đầu bắt buộc từ 1 để mọi số lượng đều có giá.
// Tách ra khỏi modules/calendar/config/schema.js để module bao thư dùng lại mà không
// phụ thuộc chéo giữa hai module; calendar vẫn re-export nguyên tên cũ.

export function requireValue(ok, message) {
    if (!ok) throw new Error(message);
}

export function validateTiers(tiers) {
    requireValue(Array.isArray(tiers) && tiers.length > 0, 'Mỗi loại cần ít nhất một bậc giá.');
    let last = 0;
    for (const t of tiers) {
        requireValue(
            t && Number.isSafeInteger(t.from) && t.from > last,
            'Mốc bậc phải là số nguyên tăng dần, không trùng.'
        );
        requireValue(
            Number.isFinite(t.cost) && t.cost >= 0 && Number.isFinite(t.sale) && t.sale >= 0,
            'Đơn giá phải là số không âm.'
        );
        last = t.from;
    }
    requireValue(tiers[0].from === 1, 'Bậc đầu phải bắt đầu từ 1.');
}

export function pickTier(tiers, quantity) {
    validateTiers(tiers);
    requireValue(Number.isSafeInteger(quantity) && quantity > 0, 'Số lượng tra bậc không hợp lệ.');
    let index = 0;
    while (index + 1 < tiers.length && quantity >= tiers[index + 1].from) index++;
    return { ...tiers[index], index: index + 1 };
}
