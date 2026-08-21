// Card config schema validation.
// CARD_CONFIG = { products[], standardTiers[], woodTiers[], addons[], segments[],
//   + hằng số number, lowQtyProfit object }.

function validateTier(tier, index, path, errors) {
    const p = `${path}[${index}]`;
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    for (const f of ['min', 'max']) {
        if (typeof tier[f] !== 'number') errors.push(`${p}.${f}: phải là number`);
    }
    if (typeof tier.label !== 'string') errors.push(`${p}.label: phải là string`);
    if (!tier.prices || typeof tier.prices !== 'object' || Array.isArray(tier.prices)) {
        errors.push(`${p}.prices: phải là object`);
    } else {
        for (const [k, v] of Object.entries(tier.prices)) {
            if (v !== null && typeof v !== 'number') {
                errors.push(`${p}.prices.${k}: phải là number hoặc null`);
            }
        }
    }
}

export function validateCardConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];
    const c = config.CARD_CONFIG;

    if (!c || typeof c !== 'object' || Array.isArray(c)) {
        errors.push('CARD_CONFIG: thiếu hoặc không phải object');
        return { isValid: false, errors };
    }

    if (!Array.isArray(c.products) || c.products.length === 0) {
        errors.push('CARD_CONFIG.products: thiếu hoặc rỗng');
    } else {
        c.products.forEach((pr, i) => {
            if (typeof pr?.id !== 'string')
                errors.push(`CARD_CONFIG.products[${i}].id: phải là string`);
            if (typeof pr?.name !== 'string')
                errors.push(`CARD_CONFIG.products[${i}].name: phải là string`);
            if (typeof pr?.table !== 'string')
                errors.push(`CARD_CONFIG.products[${i}].table: phải là string`);
        });
    }

    for (const key of ['standardTiers', 'woodTiers']) {
        if (!Array.isArray(c[key]) || c[key].length === 0) {
            errors.push(`CARD_CONFIG.${key}: thiếu hoặc rỗng`);
        } else {
            c[key].forEach((t, i) => validateTier(t, i, `CARD_CONFIG.${key}`, errors));
        }
    }

    if (!Array.isArray(c.addons)) {
        errors.push('CARD_CONFIG.addons: phải là array');
    } else {
        c.addons.forEach((a, i) => {
            if (typeof a?.id !== 'string')
                errors.push(`CARD_CONFIG.addons[${i}].id: phải là string`);
            if (typeof a?.base !== 'number')
                errors.push(`CARD_CONFIG.addons[${i}].base: phải là number`);
        });
    }

    if (!Array.isArray(c.segments) || c.segments.length === 0) {
        errors.push('CARD_CONFIG.segments: thiếu hoặc rỗng');
    } else {
        c.segments.forEach((sg, i) => {
            if (typeof sg?.id !== 'string')
                errors.push(`CARD_CONFIG.segments[${i}].id: phải là string`);
            if (typeof sg?.multiplier !== 'number') {
                errors.push(`CARD_CONFIG.segments[${i}].multiplier: phải là number`);
            }
        });
    }

    for (const f of ['shipping', 'minProfit', 'minOrderAdd', 'roundTo', 'maxQty', 'moq']) {
        if (typeof c[f] !== 'number') errors.push(`CARD_CONFIG.${f}: thiếu hoặc không phải number`);
    }

    if (!c.lowQtyProfit || typeof c.lowQtyProfit !== 'object' || Array.isArray(c.lowQtyProfit)) {
        errors.push('CARD_CONFIG.lowQtyProfit: thiếu hoặc không phải object');
    }

    return { isValid: errors.length === 0, errors };
}
