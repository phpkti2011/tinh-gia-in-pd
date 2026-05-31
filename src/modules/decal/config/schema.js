// Decal config schema validation.
//
// validateDecalConfig(config) → { isValid: boolean, errors: string[] }
//
// - Không mutate input.
// - Kiểm tra TYPE (không kiểm tra business value như "price > 0").
//   Cho phép Infinity ở các trường `upTo` (typeof Infinity === 'number').
// - Dùng thuần JS, không cần thư viện ngoài.
//
// Xem version.js để biết schema version hiện tại.

const REQUIRED_NUMBER_FIELDS = [
    'basePrintWidth',
    'basePrintHeight',
    'areaConversionFactor',
    'marginShortSide',
    'marginLongSide',
    'stickerGap',
    'laminationCost',
];

function validateProgressiveTier(tier, index, errors) {
    const prefix = `progressiveTiers[${index}]`;
    if (!tier || typeof tier !== 'object') {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof tier.upTo !== 'number') {
        errors.push(`${prefix}.upTo: phải là number (cho phép Infinity)`);
    }
    if (typeof tier.price !== 'number') {
        errors.push(`${prefix}.price: phải là number`);
    }
}

function validateSurchargeTier(tier, index, errors) {
    const prefix = `demiCutSurchargeTiers[${index}]`;
    if (!tier || typeof tier !== 'object') {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof tier.upTo !== 'number') {
        errors.push(`${prefix}.upTo: phải là number`);
    }
    if (typeof tier.percent !== 'number') {
        errors.push(`${prefix}.percent: phải là number`);
    }
}

export function validateDecalConfig(config) {
    // null / undefined / non-object / array — early reject
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];

    // 1. Numeric required fields
    for (const field of REQUIRED_NUMBER_FIELDS) {
        if (typeof config[field] !== 'number') {
            errors.push(`${field}: thiếu hoặc không phải number`);
        }
    }

    // 2. progressiveTiers (array of {upTo, price})
    if (!Array.isArray(config.progressiveTiers)) {
        errors.push('progressiveTiers: thiếu hoặc không phải array');
    } else if (config.progressiveTiers.length === 0) {
        errors.push('progressiveTiers: array rỗng');
    } else {
        config.progressiveTiers.forEach((t, i) => validateProgressiveTier(t, i, errors));
    }

    // 3. demiCutSurchargeTiers (array of {upTo, percent})
    if (!Array.isArray(config.demiCutSurchargeTiers)) {
        errors.push('demiCutSurchargeTiers: thiếu hoặc không phải array');
    } else if (config.demiCutSurchargeTiers.length === 0) {
        errors.push('demiCutSurchargeTiers: array rỗng');
    } else {
        config.demiCutSurchargeTiers.forEach((t, i) => validateSurchargeTier(t, i, errors));
    }

    // 4. decalCosts (object {[name]: number})
    if (
        !config.decalCosts ||
        typeof config.decalCosts !== 'object' ||
        Array.isArray(config.decalCosts)
    ) {
        errors.push('decalCosts: thiếu hoặc không phải object');
    } else {
        for (const [key, val] of Object.entries(config.decalCosts)) {
            if (typeof val !== 'number') {
                errors.push(`decalCosts['${key}']: không phải number`);
            }
        }
    }

    return { isValid: errors.length === 0, errors };
}
