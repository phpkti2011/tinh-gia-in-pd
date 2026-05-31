// UV DTF config schema validation.
//
// validateUvDtfConfig(config) → { isValid: boolean, errors: string[] }
//
// - Không mutate input.
// - Kiểm tra TYPE (không kiểm tra business value như "price > 0").
//   Cho phép Infinity ở priceTiers[i].maxMeters cho tier cuối
//   (typeof Infinity === 'number').
// - Field names match THỰC TẾ trong src/modules/uvdtf/config/defaultConfig.js:
//     * materialWidthCM    (number, required)
//     * printableWidthCM   (number, required) — engine dùng cho tính across
//     * paddingCM          (number, required) — engine dùng cho cộng vào item
//     * minBillableMeters  (number, required) — engine dùng cho max() với totalMeters
//     * priceTiers         (array non-empty của {maxMeters: number, price: number})
//
// Không có nhóm OBJECT phụ — UV DTF là module nhỏ nhất.

const REQUIRED_NUMBERS = ['materialWidthCM', 'printableWidthCM', 'paddingCM', 'minBillableMeters'];

function validatePriceTier(tier, index, errors) {
    const prefix = `priceTiers[${index}]`;
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof tier.maxMeters !== 'number') {
        errors.push(`${prefix}.maxMeters: phải là number (cho phép Infinity)`);
    }
    if (typeof tier.price !== 'number') {
        errors.push(`${prefix}.price: phải là number`);
    }
}

export function validateUvDtfConfig(config) {
    // null / undefined / non-object / array — early reject
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];

    // 1. Numeric required fields
    for (const field of REQUIRED_NUMBERS) {
        if (typeof config[field] !== 'number') {
            errors.push(`${field}: thiếu hoặc không phải number`);
        }
    }

    // 2. priceTiers (array of {maxMeters, price})
    if (!Array.isArray(config.priceTiers)) {
        errors.push('priceTiers: thiếu hoặc không phải array');
    } else if (config.priceTiers.length === 0) {
        errors.push('priceTiers: array rỗng');
    } else {
        config.priceTiers.forEach((t, i) => validatePriceTier(t, i, errors));
    }

    return { isValid: errors.length === 0, errors };
}
