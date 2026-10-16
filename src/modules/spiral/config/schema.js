// Spiral config schema validation.
// SPIRAL_CONFIG = { costPerBook:number, coilTiers:[{min,max,price,type}], thicknessTiers:[{min,max,surcharge}] }.
// max cho phép Infinity (typeof Infinity === 'number').

function validateCoilTier(tier, index, errors) {
    const p = `SPIRAL_CONFIG.coilTiers[${index}]`;
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    for (const f of ['min', 'max', 'price']) {
        if (typeof tier[f] !== 'number') errors.push(`${p}.${f}: phải là number`);
    }
    if (typeof tier.type !== 'string') errors.push(`${p}.type: phải là string`);
}

function validateThicknessTier(tier, index, errors) {
    const p = `SPIRAL_CONFIG.thicknessTiers[${index}]`;
    if (!tier || typeof tier !== 'object' || Array.isArray(tier)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    for (const f of ['min', 'max', 'surcharge']) {
        if (typeof tier[f] !== 'number') errors.push(`${p}.${f}: phải là number`);
    }
}

function validateLinerType(lt, index, errors) {
    const p = `SPIRAL_CONFIG.linerTypes[${index}]`;
    if (!lt || typeof lt !== 'object' || Array.isArray(lt)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    if (typeof lt.name !== 'string') errors.push(`${p}.name: phải là string`);
    if (typeof lt.costPerBook !== 'number') errors.push(`${p}.costPerBook: phải là number`);
    if (!Array.isArray(lt.tiers) || lt.tiers.length === 0) {
        errors.push(`${p}.tiers: thiếu hoặc rỗng`);
    } else {
        lt.tiers.forEach((t, i) => validateCoilTier(t, i, errors));
    }
}

function validateLinerSizeFactor(f, index, errors) {
    const p = `SPIRAL_CONFIG.linerSizeFactors[${index}]`;
    if (!f || typeof f !== 'object' || Array.isArray(f)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    if (typeof f.label !== 'string') errors.push(`${p}.label: phải là string`);
    for (const k of ['maxShort', 'maxLong', 'divisor']) {
        if (typeof f[k] !== 'number' || !(f[k] > 0)) errors.push(`${p}.${k}: phải là number > 0`);
    }
}

// Optional — loại màng cán (thêm ở phiên bản này). Config cũ chưa có vẫn hợp lệ.
// Xem src/utils/laminationFilm.js. Thiếu ⇒ mặc định Mờ/Bóng 0% ⇒ giá không đổi.
function validateLaminationFilms(list, prefix, errors) {
    if (list == null) return;
    if (!Array.isArray(list)) {
        errors.push(`${prefix}: phải là array`);
        return;
    }
    list.forEach((f, i) => {
        const p = `${prefix}[${i}]`;
        if (!f || typeof f !== 'object' || Array.isArray(f)) {
            errors.push(`${p}: phải là object`);
            return;
        }
        if (typeof f.id !== 'string' || !f.id) errors.push(`${p}.id: phải là string không rỗng`);
        if (typeof f.name !== 'string') errors.push(`${p}.name: phải là string`);
        if (f.percent != null && typeof f.percent !== 'number')
            errors.push(`${p}.percent: phải là number`);
    });
}

export function validateSpiralConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];
    const s = config.SPIRAL_CONFIG;

    if (!s || typeof s !== 'object' || Array.isArray(s)) {
        errors.push('SPIRAL_CONFIG: thiếu hoặc không phải object');
    } else {
        if (typeof s.costPerBook !== 'number') {
            errors.push('SPIRAL_CONFIG.costPerBook: thiếu hoặc không phải number');
        }
        if (!Array.isArray(s.coilTiers) || s.coilTiers.length === 0) {
            errors.push('SPIRAL_CONFIG.coilTiers: thiếu hoặc rỗng');
        } else {
            s.coilTiers.forEach((t, i) => validateCoilTier(t, i, errors));
        }
        if (!Array.isArray(s.thicknessTiers) || s.thicknessTiers.length === 0) {
            errors.push('SPIRAL_CONFIG.thicknessTiers: thiếu hoặc rỗng');
        } else {
            s.thicknessTiers.forEach((t, i) => validateThicknessTier(t, i, errors));
        }
        // linerTypes optional (config cũ chưa có vẫn hợp lệ).
        if (s.linerTypes != null) {
            if (!Array.isArray(s.linerTypes)) {
                errors.push('SPIRAL_CONFIG.linerTypes: phải là array');
            } else {
                s.linerTypes.forEach((lt, i) => validateLinerType(lt, i, errors));
            }
        }
        // linerSizeFactors optional — thiếu ⇒ engine dùng DEFAULT_LINER_SIZE_FACTORS.
        if (s.linerSizeFactors != null) {
            if (!Array.isArray(s.linerSizeFactors) || s.linerSizeFactors.length === 0) {
                errors.push('SPIRAL_CONFIG.linerSizeFactors: phải là array không rỗng');
            } else {
                s.linerSizeFactors.forEach((f, i) => validateLinerSizeFactor(f, i, errors));
            }
        }
    }

    validateLaminationFilms(config.LAMINATION_FILMS, 'LAMINATION_FILMS', errors);

    return { isValid: errors.length === 0, errors };
}
