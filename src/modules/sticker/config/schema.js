// Sticker config schema validation.
// STICKER_CONFIG = { tiers:number[], sizes:{[key]:{name,units:number[],laminateFixed}},
//   finishes:{[key]:{name,percent,fixedBySize}}, + các hằng số phụ phí }.

function validateSize(key, size, tiersLen, errors) {
    const p = `STICKER_CONFIG.sizes.${key}`;
    if (!size || typeof size !== 'object' || Array.isArray(size)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    if (typeof size.name !== 'string') errors.push(`${p}.name: phải là string`);
    if (!Array.isArray(size.units) || size.units.length === 0) {
        errors.push(`${p}.units: thiếu hoặc rỗng`);
    } else {
        if (size.units.length !== tiersLen) {
            errors.push(`${p}.units: độ dài (${size.units.length}) phải khớp tiers (${tiersLen})`);
        }
        if (size.units.some((u) => typeof u !== 'number')) {
            errors.push(`${p}.units: phải toàn number`);
        }
    }
    if (typeof size.laminateFixed !== 'number') {
        errors.push(`${p}.laminateFixed: phải là number`);
    }
}

function validateFinish(key, f, errors) {
    const p = `STICKER_CONFIG.finishes.${key}`;
    if (!f || typeof f !== 'object' || Array.isArray(f)) {
        errors.push(`${p}: phải là object`);
        return;
    }
    if (typeof f.name !== 'string') errors.push(`${p}.name: phải là string`);
    if (typeof f.percent !== 'number') errors.push(`${p}.percent: phải là number`);
    if (
        f.fixedBySize != null &&
        (typeof f.fixedBySize !== 'object' || Array.isArray(f.fixedBySize))
    ) {
        errors.push(`${p}.fixedBySize: phải là object`);
    }
}

export function validateStickerConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }

    const errors = [];
    const s = config.STICKER_CONFIG;

    if (!s || typeof s !== 'object' || Array.isArray(s)) {
        errors.push('STICKER_CONFIG: thiếu hoặc không phải object');
        return { isValid: false, errors };
    }

    if (!Array.isArray(s.tiers) || s.tiers.length === 0) {
        errors.push('STICKER_CONFIG.tiers: thiếu hoặc rỗng');
    } else if (s.tiers.some((t) => typeof t !== 'number')) {
        errors.push('STICKER_CONFIG.tiers: phải toàn number');
    }
    const tiersLen = Array.isArray(s.tiers) ? s.tiers.length : 0;

    if (!s.sizes || typeof s.sizes !== 'object' || Array.isArray(s.sizes)) {
        errors.push('STICKER_CONFIG.sizes: thiếu hoặc không phải object');
    } else {
        const keys = Object.keys(s.sizes);
        if (keys.length === 0) errors.push('STICKER_CONFIG.sizes: rỗng');
        keys.forEach((k) => validateSize(k, s.sizes[k], tiersLen, errors));
    }

    if (!s.finishes || typeof s.finishes !== 'object' || Array.isArray(s.finishes)) {
        errors.push('STICKER_CONFIG.finishes: thiếu hoặc không phải object');
    } else {
        Object.keys(s.finishes).forEach((k) => validateFinish(k, s.finishes[k], errors));
    }

    for (const f of [
        'upperThresholdPct',
        'minBillableQty',
        'maxQty',
        'stickerFree',
        'stickerStep',
        'stickerPctPerStep',
        'contentFreeVector',
        'contentFreeImage',
        'contentPctPerExtra',
        'cutPathFee',
        'cutPathQtyThreshold',
    ]) {
        if (typeof s[f] !== 'number')
            errors.push(`STICKER_CONFIG.${f}: thiếu hoặc không phải number`);
    }

    return { isValid: errors.length === 0, errors };
}
