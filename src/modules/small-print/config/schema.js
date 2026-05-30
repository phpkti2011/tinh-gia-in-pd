// Small-print config schema validation.
//
// validateSmallPrintConfig(config) → { isValid: boolean, errors: string[] }
//
// - Không mutate input.
// - Kiểm tra:
//     * config là object hợp lệ
//     * tồn tại 13 nhóm OBJECT thiết yếu (engine cần)
//     * tồn tại 6 nhóm ARRAY non-empty thiết yếu
//     * trường numeric thiết yếu (ART_PAPER_SURCHARGE)
//     * inner sanity: LAMINATION_CONFIG, PROFIT_MARGIN_TIERS,
//       CUSTOMER_PRICE_TIERS, PRINTER_CONFIG, PAPER_STOCK_DATA
// - Cho phép Infinity ở các trường upper-bound (typeof Infinity === 'number').
// - Pure JS, không thư viện ngoài.

const REQUIRED_OBJECT_GROUPS = [
    'PRINTABLE_AREA_CONFIG',
    'PRINTER_CONFIG',
    'LAMINATION_CONFIG',
    'VARIABLE_DATA_CONFIG',
    'PRINT_CONTENT_CONFIG',
    'HOLE_PUNCHING_CONFIG',
    'CREASING_CONFIG',
    'MOUNTING_CONFIG',
    'DIE_CUTTING_MOLD_COST_CONFIG',
    'DIE_CUTTING_LABOR_CONFIG',
    'DIGITAL_DIE_CUTTING_CONFIG',
    'EP_KIM_CONFIG',
    'A4_CONVERSION_RATES',
];

const REQUIRED_NONEMPTY_ARRAYS = [
    'PROFIT_MARGIN_TIERS',
    'PAPER_STOCK_DATA',
    'STANDARD_LARGE_SHEET_SIZES',
    'ART_PAPER_LARGE_SHEET_SIZES',
    'COMMON_SHEET_SIZES',
    'CUSTOMER_PRICE_TIERS',
];

const REQUIRED_NUMBERS = ['ART_PAPER_SURCHARGE'];

const VALID_PRICING_MODELS = ['ream', 'sqm', 'per_sheet', 'custom'];
const VALID_CUSTOMER_TIER_TYPES = ['per_page', 'package'];

function isPlainObject(v) {
    return v != null && typeof v === 'object' && !Array.isArray(v);
}

function validateLaminationInner(cfg, errors) {
    if (!isPlainObject(cfg)) return;
    if (typeof cfg.WIDTH !== 'number') errors.push('LAMINATION_CONFIG.WIDTH: phải là number');
    if (typeof cfg.PRICE_PER_METER !== 'number') errors.push('LAMINATION_CONFIG.PRICE_PER_METER: phải là number');
}

function validateProfitMarginTier(tier, i, errors) {
    if (!isPlainObject(tier)) { errors.push(`PROFIT_MARGIN_TIERS[${i}]: phải là object`); return; }
    if (typeof tier.max_cost !== 'number') errors.push(`PROFIT_MARGIN_TIERS[${i}].max_cost: phải là number (cho phép Infinity)`);
    if (typeof tier.margin !== 'number') errors.push(`PROFIT_MARGIN_TIERS[${i}].margin: phải là number`);
}

function validateCustomerPriceTier(tier, i, errors) {
    if (!isPlainObject(tier)) { errors.push(`CUSTOMER_PRICE_TIERS[${i}]: phải là object`); return; }
    for (const f of ['min', 'max', 'print', 'laminate']) {
        if (typeof tier[f] !== 'number') errors.push(`CUSTOMER_PRICE_TIERS[${i}].${f}: phải là number`);
    }
    if (!VALID_CUSTOMER_TIER_TYPES.includes(tier.type)) {
        errors.push(`CUSTOMER_PRICE_TIERS[${i}].type: phải là 'per_page' hoặc 'package'`);
    }
}

function validatePrinter(name, p, errors) {
    if (!isPlainObject(p)) { errors.push(`PRINTER_CONFIG['${name}']: phải là object`); return; }
    if (typeof p.name !== 'string') errors.push(`PRINTER_CONFIG['${name}'].name: phải là string`);
    if (typeof p.maxW !== 'number') errors.push(`PRINTER_CONFIG['${name}'].maxW: phải là number`);
    if (typeof p.maxH !== 'number') errors.push(`PRINTER_CONFIG['${name}'].maxH: phải là number`);
    if (!Array.isArray(p.clickTiers) || p.clickTiers.length === 0) {
        errors.push(`PRINTER_CONFIG['${name}'].clickTiers: phải là array non-empty`);
    }
    if (!isPlainObject(p.prices)) errors.push(`PRINTER_CONFIG['${name}'].prices: phải là object`);
}

function validatePaperStock(paper, i, errors) {
    if (!isPlainObject(paper)) { errors.push(`PAPER_STOCK_DATA[${i}]: phải là object`); return; }
    if (typeof paper.name !== 'string') errors.push(`PAPER_STOCK_DATA[${i}].name: phải là string`);
    if (!VALID_PRICING_MODELS.includes(paper.pricingModel)) {
        errors.push(`PAPER_STOCK_DATA[${i}].pricingModel: phải là 'ream'|'sqm'|'per_sheet'|'custom'`);
    }
}

export function validateSmallPrintConfig(config) {
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
    validateLaminationInner(config.LAMINATION_CONFIG, errors);

    if (Array.isArray(config.PROFIT_MARGIN_TIERS)) {
        config.PROFIT_MARGIN_TIERS.forEach((t, i) => validateProfitMarginTier(t, i, errors));
    }

    if (Array.isArray(config.CUSTOMER_PRICE_TIERS)) {
        config.CUSTOMER_PRICE_TIERS.forEach((t, i) => validateCustomerPriceTier(t, i, errors));
    }

    if (isPlainObject(config.PRINTER_CONFIG)) {
        const printerKeys = Object.keys(config.PRINTER_CONFIG);
        if (printerKeys.length === 0) {
            errors.push('PRINTER_CONFIG: không có printer nào');
        }
        for (const name of printerKeys) {
            validatePrinter(name, config.PRINTER_CONFIG[name], errors);
        }
    }

    if (Array.isArray(config.PAPER_STOCK_DATA)) {
        config.PAPER_STOCK_DATA.forEach((p, i) => validatePaperStock(p, i, errors));
    }

    return { isValid: errors.length === 0, errors };
}
