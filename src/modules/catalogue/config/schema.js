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

    validateLaminationFilms(config.LAMINATION_FILMS, 'LAMINATION_FILMS', errors);

    return { isValid: errors.length === 0, errors };
}
