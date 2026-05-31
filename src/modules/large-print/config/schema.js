// Large-print config schema validation.
//
// validateLargePrintConfig(config) → { isValid: boolean, errors: string[] }
//
// - Không mutate input.
// - Kiểm tra TYPE (không kiểm tra business value).
// - Cho phép Infinity ở FORMEX_DISCOUNT_TIERS[i].maxArea cho tier cuối.
// - Pure JS, không thư viện ngoài.

const REQUIRED_OBJECT_GROUPS = [
    'MATERIAL_TYPES',
    'LAMINATION_TYPES',
    'FORMEX_OPTIONS',
    'FINISHING_PRICES',
];

const REQUIRED_NONEMPTY_ARRAYS = ['FORMEX_DISCOUNT_TIERS', 'STANDEE_OPTIONS'];

const REQUIRED_NUMBERS = [
    'MIN_PRINT_PRICE',
    'MIN_LAMINATION_PRICE',
    'MIN_EDGE_TAPING_PRICE',
    'MIN_GROMMET_PRICE',
];

function isPlainObject(v) {
    return v != null && typeof v === 'object' && !Array.isArray(v);
}

function validateMaterialOption(opt, materialKey, i, errors) {
    const prefix = `MATERIAL_TYPES['${materialKey}'].options[${i}]`;
    if (!isPlainObject(opt)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof opt.width !== 'number') errors.push(`${prefix}.width: phải là number`);
    if (typeof opt.printPrice !== 'number') errors.push(`${prefix}.printPrice: phải là number`);
    if (typeof opt.materialPrice !== 'number')
        errors.push(`${prefix}.materialPrice: phải là number`);
}

function validateMaterialType(material, key, errors) {
    const prefix = `MATERIAL_TYPES['${key}']`;
    if (!isPlainObject(material)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof material.name !== 'string') errors.push(`${prefix}.name: phải là string`);
    if (!Array.isArray(material.options) || material.options.length === 0) {
        errors.push(`${prefix}.options: phải là array non-empty`);
        return;
    }
    material.options.forEach((o, i) => validateMaterialOption(o, key, i, errors));
}

function validateLaminationOption(opt, lamKey, i, errors) {
    const prefix = `LAMINATION_TYPES['${lamKey}'].options[${i}]`;
    if (!isPlainObject(opt)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof opt.width !== 'number') errors.push(`${prefix}.width: phải là number`);
    if (typeof opt.price !== 'number') errors.push(`${prefix}.price: phải là number`);
}

function validateLaminationType(lam, key, errors) {
    const prefix = `LAMINATION_TYPES['${key}']`;
    if (!isPlainObject(lam)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof lam.name !== 'string') errors.push(`${prefix}.name: phải là string`);
    if (!Array.isArray(lam.options) || lam.options.length === 0) {
        errors.push(`${prefix}.options: phải là array non-empty`);
        return;
    }
    lam.options.forEach((o, i) => validateLaminationOption(o, key, i, errors));
}

function validateFormexOption(opt, key, errors) {
    const prefix = `FORMEX_OPTIONS['${key}']`;
    if (!isPlainObject(opt)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof opt.name !== 'string') errors.push(`${prefix}.name: phải là string`);
    if (typeof opt.price !== 'number') errors.push(`${prefix}.price: phải là number`);
}

function validateFormexDiscountTier(tier, i, errors) {
    const prefix = `FORMEX_DISCOUNT_TIERS[${i}]`;
    if (!isPlainObject(tier)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof tier.minArea !== 'number') errors.push(`${prefix}.minArea: phải là number`);
    if (typeof tier.maxArea !== 'number')
        errors.push(`${prefix}.maxArea: phải là number (cho phép Infinity)`);
    if (typeof tier.discount !== 'number') errors.push(`${prefix}.discount: phải là number`);
}

function validateStandeeOption(s, i, errors) {
    const prefix = `STANDEE_OPTIONS[${i}]`;
    if (!isPlainObject(s)) {
        errors.push(`${prefix}: phải là object`);
        return;
    }
    if (typeof s.key !== 'string') errors.push(`${prefix}.key: phải là string`);
    if (typeof s.name !== 'string') errors.push(`${prefix}.name: phải là string`);
    if (typeof s.price !== 'number') errors.push(`${prefix}.price: phải là number`);
}

function validateFinishingPrices(fp, errors) {
    if (!isPlainObject(fp)) return; // already reported as missing object
    if (typeof fp.edgeTapingPricePerSqm !== 'number')
        errors.push('FINISHING_PRICES.edgeTapingPricePerSqm: phải là number');
    if (typeof fp.grommetPricePerPiece !== 'number')
        errors.push('FINISHING_PRICES.grommetPricePerPiece: phải là number');
    if (!isPlainObject(fp.dieCutting)) {
        errors.push('FINISHING_PRICES.dieCutting: phải là object');
    } else {
        for (const k of [
            'tier1LimitSqm',
            'tier2LimitSqm',
            'tier1PricePerSqm',
            'tier2PricePerSqm',
            'tier3PricePerSqm',
        ]) {
            if (typeof fp.dieCutting[k] !== 'number')
                errors.push(`FINISHING_PRICES.dieCutting.${k}: phải là number`);
        }
    }
}

export function validateLargePrintConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];

    // 1. Required object groups
    for (const key of REQUIRED_OBJECT_GROUPS) {
        if (!isPlainObject(config[key])) {
            errors.push(`${key}: thiếu hoặc không phải object`);
        }
    }

    // 2. Required non-empty arrays
    for (const key of REQUIRED_NONEMPTY_ARRAYS) {
        const v = config[key];
        if (!Array.isArray(v)) {
            errors.push(`${key}: thiếu hoặc không phải array`);
        } else if (v.length === 0) {
            errors.push(`${key}: array rỗng`);
        }
    }

    // 3. Required numbers
    for (const key of REQUIRED_NUMBERS) {
        if (typeof config[key] !== 'number') {
            errors.push(`${key}: thiếu hoặc không phải number`);
        }
    }

    // 4. Inner sanity
    if (isPlainObject(config.MATERIAL_TYPES)) {
        const keys = Object.keys(config.MATERIAL_TYPES);
        if (keys.length === 0) errors.push('MATERIAL_TYPES: không có material nào');
        for (const k of keys) validateMaterialType(config.MATERIAL_TYPES[k], k, errors);
    }

    if (isPlainObject(config.LAMINATION_TYPES)) {
        for (const k of Object.keys(config.LAMINATION_TYPES)) {
            validateLaminationType(config.LAMINATION_TYPES[k], k, errors);
        }
    }

    if (isPlainObject(config.FORMEX_OPTIONS)) {
        const keys = Object.keys(config.FORMEX_OPTIONS);
        if (keys.length === 0) errors.push('FORMEX_OPTIONS: không có option nào');
        for (const k of keys) validateFormexOption(config.FORMEX_OPTIONS[k], k, errors);
    }

    if (Array.isArray(config.FORMEX_DISCOUNT_TIERS)) {
        config.FORMEX_DISCOUNT_TIERS.forEach((t, i) => validateFormexDiscountTier(t, i, errors));
    }

    if (Array.isArray(config.STANDEE_OPTIONS)) {
        config.STANDEE_OPTIONS.forEach((s, i) => validateStandeeOption(s, i, errors));
    }

    validateFinishingPrices(config.FINISHING_PRICES, errors);

    return { isValid: errors.length === 0, errors };
}
