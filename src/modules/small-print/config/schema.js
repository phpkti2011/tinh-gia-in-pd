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

// Bảng quy đổi A4 { "<chiều cao>": <hệ số> }. Admin sửa được từ Cài Đặt nên phải
// chặt: engine tra bằng h.toFixed(1) (engine/a4.js) → khoá sai định dạng sẽ không
// bao giờ khớp và engine âm thầm rơi xuống công thức h/21.
function validateA4Rates(label, rates, errors, requireNonEmpty) {
    const entries = Object.entries(rates);
    if (requireNonEmpty && entries.length === 0) {
        errors.push(`${label}: object rỗng`);
    }
    for (const [k, v] of entries) {
        const h = Number(k);
        if (!isFinite(h) || !(h > 0)) {
            errors.push(`${label}['${k}']: khoá phải là chiều cao > 0`);
        } else if (h.toFixed(1) !== String(k)) {
            errors.push(
                `${label}['${k}']: khoá phải đúng dạng 1 chữ số thập phân (vd '${h.toFixed(1)}')`
            );
        }
        if (typeof v !== 'number' || !(v > 0)) {
            errors.push(`${label}['${k}']: hệ số phải là number > 0`);
        }
    }
}

function validateLaminationInner(cfg, errors) {
    if (!isPlainObject(cfg)) return;
    if (typeof cfg.WIDTH !== 'number') errors.push('LAMINATION_CONFIG.WIDTH: phải là number');
    if (typeof cfg.PRICE_PER_METER !== 'number')
        errors.push('LAMINATION_CONFIG.PRICE_PER_METER: phải là number');
}

function validateProfitMarginTier(tier, i, errors) {
    if (!isPlainObject(tier)) {
        errors.push(`PROFIT_MARGIN_TIERS[${i}]: phải là object`);
        return;
    }
    if (typeof tier.max_cost !== 'number')
        errors.push(`PROFIT_MARGIN_TIERS[${i}].max_cost: phải là number (cho phép Infinity)`);
    if (typeof tier.margin !== 'number')
        errors.push(`PROFIT_MARGIN_TIERS[${i}].margin: phải là number`);
}

function validateCustomerPriceTier(tier, i, errors) {
    if (!isPlainObject(tier)) {
        errors.push(`CUSTOMER_PRICE_TIERS[${i}]: phải là object`);
        return;
    }
    for (const f of ['min', 'max', 'print', 'laminate']) {
        if (typeof tier[f] !== 'number')
            errors.push(`CUSTOMER_PRICE_TIERS[${i}].${f}: phải là number`);
    }
    if (!VALID_CUSTOMER_TIER_TYPES.includes(tier.type)) {
        errors.push(`CUSTOMER_PRICE_TIERS[${i}].type: phải là 'per_page' hoặc 'package'`);
    }
}

function validatePrinter(name, p, errors) {
    if (!isPlainObject(p)) {
        errors.push(`PRINTER_CONFIG['${name}']: phải là object`);
        return;
    }
    if (typeof p.name !== 'string') errors.push(`PRINTER_CONFIG['${name}'].name: phải là string`);
    if (typeof p.maxW !== 'number') errors.push(`PRINTER_CONFIG['${name}'].maxW: phải là number`);
    if (typeof p.maxH !== 'number') errors.push(`PRINTER_CONFIG['${name}'].maxH: phải là number`);
    if (!Array.isArray(p.clickTiers) || p.clickTiers.length === 0) {
        errors.push(`PRINTER_CONFIG['${name}'].clickTiers: phải là array non-empty`);
    } else {
        p.clickTiers.forEach((t, i) => {
            if (!isPlainObject(t) || typeof t.maxH !== 'number' || typeof t.clicks !== 'number') {
                errors.push(
                    `PRINTER_CONFIG['${name}'].clickTiers[${i}]: cần {maxH, clicks} number`
                );
            }
        });
    }
    // customerA4Tiers: OPTIONAL — config lưu trước khi thêm field này vẫn hợp lệ
    // (engine fallback về DECAL_SHEET_SIZES[].a4Factor rồi computeA4Factor).
    // Nhưng nếu có thì phải đúng hình dạng, vì admin sửa được từ Cài Đặt.
    if (p.customerA4Tiers != null) {
        if (!Array.isArray(p.customerA4Tiers) || p.customerA4Tiers.length === 0) {
            errors.push(`PRINTER_CONFIG['${name}'].customerA4Tiers: phải là array non-empty`);
        } else {
            p.customerA4Tiers.forEach((t, i) => {
                if (
                    !isPlainObject(t) ||
                    typeof t.maxH !== 'number' ||
                    typeof t.factor !== 'number' ||
                    !(t.factor > 0)
                ) {
                    errors.push(
                        `PRINTER_CONFIG['${name}'].customerA4Tiers[${i}]: cần {maxH, factor} number, factor > 0`
                    );
                }
            });
        }
    }
    // a4ConversionRates: OPTIONAL — bảng quy đổi A4 riêng của máy (giấy thường +
    // decal xi bạc). Vắng → engine fallback về A4_CONVERSION_RATES chung.
    if (p.a4ConversionRates != null) {
        if (!isPlainObject(p.a4ConversionRates)) {
            errors.push(`PRINTER_CONFIG['${name}'].a4ConversionRates: phải là object`);
        } else {
            validateA4Rates(
                `PRINTER_CONFIG['${name}'].a4ConversionRates`,
                p.a4ConversionRates,
                errors,
                false
            );
        }
    }
    // vkPoints: OPTIONAL, mảng số trần (chiều cao ăn lề rộng hơn khi tính vùng in).
    if (p.vkPoints != null) {
        if (!Array.isArray(p.vkPoints)) {
            errors.push(`PRINTER_CONFIG['${name}'].vkPoints: phải là array`);
        } else if (p.vkPoints.some((v) => typeof v !== 'number')) {
            errors.push(`PRINTER_CONFIG['${name}'].vkPoints: mọi phần tử phải là number`);
        }
    }
    if (!isPlainObject(p.prices)) errors.push(`PRINTER_CONFIG['${name}'].prices: phải là object`);
}

// Khổ tờ ({w, h}) — w/h phải là number > 0. Riêng ART_PAPER_LARGE_SHEET_SIZES có
// dòng "Tùy chọn" với w/h = 'custom' (admin nhập khổ ở màn tính giá) nên cho phép.
function validateSheetSize(listKey, s, i, errors, allowCustom) {
    if (!isPlainObject(s)) {
        errors.push(`${listKey}[${i}]: phải là object`);
        return;
    }
    for (const f of ['w', 'h']) {
        if (allowCustom && s[f] === 'custom') continue;
        if (typeof s[f] !== 'number' || !(s[f] > 0)) {
            errors.push(`${listKey}[${i}].${f}: phải là number > 0`);
        }
    }
}

function validatePaperStock(paper, i, errors) {
    if (!isPlainObject(paper)) {
        errors.push(`PAPER_STOCK_DATA[${i}]: phải là object`);
        return;
    }
    if (typeof paper.name !== 'string') errors.push(`PAPER_STOCK_DATA[${i}].name: phải là string`);
    if (!VALID_PRICING_MODELS.includes(paper.pricingModel)) {
        errors.push(
            `PAPER_STOCK_DATA[${i}].pricingModel: phải là 'ream'|'sqm'|'per_sheet'|'custom'`
        );
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

    // Optional: giá 1 màu đen (config cũ chưa có vẫn hợp lệ).
    for (const key of ['ONE_COLOR_DISCOUNT_PERCENT', 'ONE_COLOR_MIN_PRICE_PER_PAGE']) {
        if (config[key] != null && typeof config[key] !== 'number') {
            errors.push(`${key}: phải là number`);
        }
    }

    // A4_CONVERSION_RATES — bảng CHUNG (fallback cho máy chưa có bảng riêng).
    if (isPlainObject(config.A4_CONVERSION_RATES)) {
        validateA4Rates('A4_CONVERSION_RATES', config.A4_CONVERSION_RATES, errors, true);
    }

    // Khổ tờ — 3 danh sách admin sửa được.
    for (const listKey of ['COMMON_SHEET_SIZES', 'STANDARD_LARGE_SHEET_SIZES']) {
        if (Array.isArray(config[listKey])) {
            config[listKey].forEach((s, i) => validateSheetSize(listKey, s, i, errors, false));
        }
    }
    if (Array.isArray(config.ART_PAPER_LARGE_SHEET_SIZES)) {
        config.ART_PAPER_LARGE_SHEET_SIZES.forEach((s, i) =>
            validateSheetSize('ART_PAPER_LARGE_SHEET_SIZES', s, i, errors, true)
        );
    }

    // PAPER_REFERENCE_CONFIG — OPTIONAL (config cũ chưa có, engine tự fallback
    // C300 + ratio 1 ở quote.js). Có thì phải đúng kiểu.
    const refCfg = config.PAPER_REFERENCE_CONFIG;
    if (refCfg != null) {
        if (!isPlainObject(refCfg)) {
            errors.push('PAPER_REFERENCE_CONFIG: phải là object');
        } else {
            if (typeof refCfg.referencePaperName !== 'string' || !refCfg.referencePaperName) {
                errors.push('PAPER_REFERENCE_CONFIG.referencePaperName: phải là string non-empty');
            }
            if (typeof refCfg.adjustmentRatio !== 'number' || refCfg.adjustmentRatio < 0) {
                errors.push('PAPER_REFERENCE_CONFIG.adjustmentRatio: phải là number ≥ 0');
            }
            if (
                refCfg.minPrintPricePerPage != null &&
                typeof refCfg.minPrintPricePerPage !== 'number'
            ) {
                errors.push('PAPER_REFERENCE_CONFIG.minPrintPricePerPage: phải là number');
            }
        }
    }

    // PRINT_CONTENT_CONFIG — đã nằm trong REQUIRED_OBJECT_GROUPS, ở đây check inner.
    if (isPlainObject(config.PRINT_CONTENT_CONFIG)) {
        const pc = config.PRINT_CONTENT_CONFIG;
        if (typeof pc.single_content_surcharge !== 'number') {
            errors.push('PRINT_CONTENT_CONFIG.single_content_surcharge: phải là number');
        }
        if (!Array.isArray(pc.tiers)) {
            errors.push('PRINT_CONTENT_CONFIG.tiers: phải là array');
        } else {
            pc.tiers.forEach((t, i) => {
                if (!isPlainObject(t)) {
                    errors.push(`PRINT_CONTENT_CONFIG.tiers[${i}]: phải là object`);
                    return;
                }
                for (const f of ['min', 'max', 'surcharge']) {
                    if (typeof t[f] !== 'number') {
                        errors.push(
                            `PRINT_CONTENT_CONFIG.tiers[${i}].${f}: phải là number (cho phép Infinity ở max)`
                        );
                    }
                }
            });
        }
    }

    return { isValid: errors.length === 0, errors };
}
