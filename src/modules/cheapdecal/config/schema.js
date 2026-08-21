// Cheap decal config schema validation.
// CHEAP_DECAL_CONFIG = { sizes[], quantities[], priceTable{cỡ:[số]}, materialSurcharge{},
//   laminationSurcharge{}, rushFee{}, squareSurchargePct, materials[], shapes[] }.

export function validateCheapDecalConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];
    const c = config.CHEAP_DECAL_CONFIG;

    if (!c || typeof c !== 'object' || Array.isArray(c)) {
        errors.push('CHEAP_DECAL_CONFIG: thiếu hoặc không phải object');
        return { isValid: false, errors };
    }

    if (!Array.isArray(c.sizes) || c.sizes.length === 0) {
        errors.push('CHEAP_DECAL_CONFIG.sizes: thiếu hoặc rỗng');
    } else {
        c.sizes.forEach((s, i) => {
            if (typeof s?.id !== 'string' && typeof s?.id !== 'number')
                errors.push(`CHEAP_DECAL_CONFIG.sizes[${i}].id: thiếu`);
            if (typeof s?.name !== 'string')
                errors.push(`CHEAP_DECAL_CONFIG.sizes[${i}].name: phải là string`);
        });
    }

    if (!Array.isArray(c.quantities) || c.quantities.length === 0) {
        errors.push('CHEAP_DECAL_CONFIG.quantities: thiếu hoặc rỗng');
    } else if (c.quantities.some((q) => typeof q !== 'number')) {
        errors.push('CHEAP_DECAL_CONFIG.quantities: phải toàn number');
    }
    const qLen = Array.isArray(c.quantities) ? c.quantities.length : 0;

    if (!c.priceTable || typeof c.priceTable !== 'object' || Array.isArray(c.priceTable)) {
        errors.push('CHEAP_DECAL_CONFIG.priceTable: thiếu hoặc không phải object');
    } else {
        for (const [k, arr] of Object.entries(c.priceTable)) {
            if (!Array.isArray(arr) || arr.length !== qLen) {
                errors.push(`CHEAP_DECAL_CONFIG.priceTable.${k}: độ dài phải = ${qLen}`);
            } else if (arr.some((v) => typeof v !== 'number')) {
                errors.push(`CHEAP_DECAL_CONFIG.priceTable.${k}: phải toàn number`);
            }
        }
    }

    for (const key of ['materialSurcharge', 'laminationSurcharge', 'rushFee']) {
        if (!c[key] || typeof c[key] !== 'object' || Array.isArray(c[key])) {
            errors.push(`CHEAP_DECAL_CONFIG.${key}: thiếu hoặc không phải object`);
        }
    }

    for (const key of ['materials', 'shapes']) {
        if (!Array.isArray(c[key]) || c[key].length === 0) {
            errors.push(`CHEAP_DECAL_CONFIG.${key}: thiếu hoặc rỗng`);
        }
    }

    if (typeof c.squareSurchargePct !== 'number') {
        errors.push('CHEAP_DECAL_CONFIG.squareSurchargePct: thiếu hoặc không phải number');
    }

    return { isValid: errors.length === 0, errors };
}
