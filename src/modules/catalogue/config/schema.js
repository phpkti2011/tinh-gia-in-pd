// Catalogue config schema validation.
//
// validateCatalogueConfig(config) → { isValid: boolean, errors: string[] }
//
// Catalogue chỉ có STAPLE_CONFIG riêng (các bảng giá khác dùng chung printConfig,
// được validate bởi small-print). Chỉ kiểm TYPE, không kiểm business value.
// STAPLE_CONFIG = { costPerBook:number, tiers:[{min,max,price,type}] }.
// tiers[i].max cho phép Infinity (typeof Infinity === 'number').

function validateStapleTier(tier, index, errors) {
    const prefix = `STAPLE_CONFIG.tiers[${index}]`;
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    for (const f of ['min', 'max', 'price']) {
        if (typeof tier[f] !== 'number') errors.push(`${prefix}.${f}: phải là number`);
    }
    if (typeof tier.type !== 'string') errors.push(`${prefix}.type: phải là string`);
}

export function validateCatalogueConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];
    const staple = config.STAPLE_CONFIG;

    if (!staple || typeof staple !== 'object' || Array.isArray(staple)) {
        errors.push('STAPLE_CONFIG: thiếu hoặc không phải object');
    } else {
        if (typeof staple.costPerBook !== 'number') {
            errors.push('STAPLE_CONFIG.costPerBook: thiếu hoặc không phải number');
        }
        if (!Array.isArray(staple.tiers)) {
            errors.push('STAPLE_CONFIG.tiers: thiếu hoặc không phải array');
        } else if (staple.tiers.length === 0) {
            errors.push('STAPLE_CONFIG.tiers: array rỗng');
        } else {
            staple.tiers.forEach((t, i) => validateStapleTier(t, i, errors));
        }
    }

    return { isValid: errors.length === 0, errors };
}
