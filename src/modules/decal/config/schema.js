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

function validatePrintSheet(size, index, errors) {
    const prefix = `printSheetSizes[${index}]`;
    if (!size || typeof size !== 'object') {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof size.w !== 'number') errors.push(`${prefix}.w: phải là number`);
    if (typeof size.h !== 'number') errors.push(`${prefix}.h: phải là number`);
    // percent/marginShort/marginLong là optional — nếu có phải là number.
    for (const f of ['percent', 'marginShort', 'marginLong']) {
        if (size[f] != null && typeof size[f] !== 'number') {
            errors.push(`${prefix}.${f}: phải là number`);
        }
    }
    // minPriceByMaterial (optional): object {<tên decal>: number}.
    if (size.minPriceByMaterial != null) {
        if (typeof size.minPriceByMaterial !== 'object' || Array.isArray(size.minPriceByMaterial)) {
            errors.push(`${prefix}.minPriceByMaterial: phải là object`);
        } else {
            for (const [k, v] of Object.entries(size.minPriceByMaterial)) {
                if (typeof v !== 'number') {
                    errors.push(`${prefix}.minPriceByMaterial['${k}']: phải là number`);
                }
            }
        }
    }
    // unavailableMaterials (optional): array of string (loại decal không có ở khổ này).
    if (size.unavailableMaterials != null) {
        if (!Array.isArray(size.unavailableMaterials)) {
            errors.push(`${prefix}.unavailableMaterials: phải là array`);
        } else if (size.unavailableMaterials.some((m) => typeof m !== 'string')) {
            errors.push(`${prefix}.unavailableMaterials: mỗi phần tử phải là string`);
        }
    }
}

function validateMachine(m, index, errors) {
    const prefix = `machines[${index}]`;
    if (!m || typeof m !== 'object') {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof m.name !== 'string' || m.name === '') errors.push(`${prefix}.name: phải là string`);
    // Chấp nhận cả 4-cạnh (marginTop/Bottom/Left/Right) lẫn kiểu cũ (marginShort/marginLong).
    // Field lề nào CÓ thì phải là number.
    for (const f of [
        'marginTop',
        'marginBottom',
        'marginLeft',
        'marginRight',
        'marginShort',
        'marginLong',
    ]) {
        if (m[f] != null && typeof m[f] !== 'number') {
            errors.push(`${prefix}.${f}: phải là number`);
        }
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

    // 3b. printSheetSizes (array of {label, w, h, percent?})
    if (config.printSheetSizes != null) {
        if (!Array.isArray(config.printSheetSizes)) {
            errors.push('printSheetSizes: phải là array');
        } else {
            config.printSheetSizes.forEach((s, i) => validatePrintSheet(s, i, errors));
        }
    }

    // 3c. machines (array of {name, marginShort, marginLong}) — optional
    if (config.machines != null) {
        if (!Array.isArray(config.machines)) {
            errors.push('machines: phải là array');
        } else {
            config.machines.forEach((m, i) => validateMachine(m, i, errors));
        }
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
