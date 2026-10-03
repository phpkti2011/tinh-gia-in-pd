export function validateDigitalDieCutTiers(config) {
    const errors = [];
    for (const key of ['cost_tiers', 'customer_tiers']) {
        const rows = config?.[key];
        if (!Array.isArray(rows) || !rows.length) {
            errors.push('Bế kỹ thuật số cần ít nhất một bậc giá vốn và giá khách.');
            continue;
        }
        let previous = 0;
        for (const row of rows) {
            if (
                !row ||
                !(
                    (Number.isSafeInteger(row.max_qty) || row.max_qty === Infinity) &&
                    row.max_qty > previous
                )
            )
                errors.push('Mốc bế kỹ thuật số phải là số nguyên dương tăng dần, không trùng.');
            if (!row || !Number.isFinite(row.price) || row.price < 0)
                errors.push('Nhập giá bế kỹ thuật số là số không âm cho mọi bậc.');
            if (!row || !['package', 'per_item', 'per_piece'].includes(row.type))
                errors.push('Chọn cách tính bế kỹ thuật số hợp lệ.');
            previous = row?.max_qty;
        }
    }
    return [...new Set(errors)];
}
