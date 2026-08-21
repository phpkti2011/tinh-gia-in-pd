// Flyer config schema validation.
// FLYER_CONFIG = { sizes[], priceTable{size:[{qty,price}]}, paperTypes[], paperSurcharge{},
//   laminationSurcharge{}, creasing{bands[],overMax{}}, *Options[], các % number }.

export function validateFlyerConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];
    const c = config.FLYER_CONFIG;

    if (!c || typeof c !== 'object' || Array.isArray(c)) {
        errors.push('FLYER_CONFIG: thiếu hoặc không phải object');
        return { isValid: false, errors };
    }

    if (!Array.isArray(c.sizes) || c.sizes.length === 0) {
        errors.push('FLYER_CONFIG.sizes: thiếu hoặc rỗng');
    } else {
        c.sizes.forEach((s, i) => {
            if (typeof s?.id !== 'string')
                errors.push(`FLYER_CONFIG.sizes[${i}].id: phải là string`);
            if (typeof s?.min !== 'number')
                errors.push(`FLYER_CONFIG.sizes[${i}].min: phải là number`);
        });
    }

    if (!c.priceTable || typeof c.priceTable !== 'object' || Array.isArray(c.priceTable)) {
        errors.push('FLYER_CONFIG.priceTable: thiếu hoặc không phải object');
    } else {
        for (const [size, rows] of Object.entries(c.priceTable)) {
            if (!Array.isArray(rows) || rows.length === 0) {
                errors.push(`FLYER_CONFIG.priceTable.${size}: thiếu hoặc rỗng`);
            } else {
                rows.forEach((r, i) => {
                    if (typeof r?.qty !== 'number' || typeof r?.price !== 'number') {
                        errors.push(
                            `FLYER_CONFIG.priceTable.${size}[${i}]: qty/price phải là number`
                        );
                    }
                });
            }
        }
    }

    if (!Array.isArray(c.paperTypes) || c.paperTypes.length === 0) {
        errors.push('FLYER_CONFIG.paperTypes: thiếu hoặc rỗng');
    }
    for (const key of ['paperSurcharge', 'laminationSurcharge']) {
        if (!c[key] || typeof c[key] !== 'object' || Array.isArray(c[key])) {
            errors.push(`FLYER_CONFIG.${key}: thiếu hoặc không phải object`);
        }
    }

    if (!c.creasing || typeof c.creasing !== 'object' || !Array.isArray(c.creasing.bands)) {
        errors.push('FLYER_CONFIG.creasing.bands: thiếu hoặc không phải array');
    }

    for (const key of ['sidesOptions', 'laminationOptions', 'creasingOptions', 'contentOptions']) {
        if (!Array.isArray(c[key]) || c[key].length === 0) {
            errors.push(`FLYER_CONFIG.${key}: thiếu hoặc rỗng`);
        }
    }

    for (const f of ['oneSideDiscountPct', 'contentSurchargePct', 'upperThresholdPct']) {
        if (typeof c[f] !== 'number')
            errors.push(`FLYER_CONFIG.${f}: thiếu hoặc không phải number`);
    }

    return { isValid: errors.length === 0, errors };
}
