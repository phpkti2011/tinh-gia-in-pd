import { CALENDAR_DEFAULT_CONFIG } from './defaultConfig';

export function requireValue(ok, message) {
    if (!ok) throw new Error(message);
}

export function validateTiers(tiers) {
    requireValue(Array.isArray(tiers) && tiers.length > 0, 'Mỗi loại cần ít nhất một bậc giá.');
    let last = 0;
    for (const t of tiers) {
        requireValue(
            t && Number.isSafeInteger(t.from) && t.from > last,
            'Mốc bậc phải là số nguyên tăng dần, không trùng.'
        );
        requireValue(
            Number.isFinite(t.cost) && t.cost >= 0 && Number.isFinite(t.sale) && t.sale >= 0,
            'Đơn giá phải là số không âm.'
        );
        last = t.from;
    }
    requireValue(tiers[0].from === 1, 'Bậc đầu phải bắt đầu từ 1.');
}

export function pickTier(tiers, quantity) {
    validateTiers(tiers);
    requireValue(Number.isSafeInteger(quantity) && quantity > 0, 'Số lượng tra bậc không hợp lệ.');
    let index = 0;
    while (index + 1 < tiers.length && quantity >= tiers[index + 1].from) index++;
    return { ...tiers[index], index: index + 1 };
}

export function validateCalendarConfig(config) {
    try {
        requireValue(
            config && typeof config.pricesConfirmed === 'boolean',
            'Thiếu trạng thái xác nhận bảng giá.'
        );
        const c = config.geometry;
        for (const key of Object.keys(CALENDAR_DEFAULT_CONFIG.geometry)) {
            requireValue(
                Number.isFinite(c?.[key]) && c[key] >= 0,
                `Thông số ${key} phải là số không âm.`
            );
        }
        for (const key of ['largeCount', 'smallCount', 'wrapCopies', 'linerCopies']) {
            requireValue(
                Number.isSafeInteger(c[key]) && c[key] >= 1,
                `Định mức ${key} phải là số nguyên dương.`
            );
        }
        requireValue([0, 1, 2].includes(c.lamSides), 'Số mặt cán phải từ 0 đến 2.');
        for (const key of ['strip', 'stockW', 'stockH', 'machine', 'wrapFactor', 'linerFactor']) {
            requireValue(
                c[key] > 0 && c[key] <= 1000,
                `Thông số ${key} phải lớn hơn 0 và không vượt 1.000.`
            );
        }
        requireValue(c.stockW <= c.machine, 'Cạnh nạp carton vượt khổ ngang máy cắt.');
        requireValue(c.trim * 2 < Math.min(c.stockW, c.stockH), 'Xén biên dùng hết tấm carton.');
        for (const key of Object.keys(CALENDAR_DEFAULT_CONFIG.materials)) {
            const items = config.materials?.[key];
            requireValue(Array.isArray(items) && items.length > 0, `Thiếu danh mục ${key}.`);
            const names = new Set();
            for (const item of items) {
                const name = item?.name?.trim();
                requireValue(
                    name && !names.has(name.toLowerCase()),
                    'Tên loại phải có nội dung và không trùng trong nhóm.'
                );
                names.add(name.toLowerCase());
                validateTiers(item.tiers);
            }
        }
        requireValue(
            Array.isArray(config.artPapers) && config.artPapers.length > 0,
            'Cần ít nhất một loại giấy mỹ thuật.'
        );
        const artNames = new Set();
        for (const p of config.artPapers) {
            const name = p?.name?.trim();
            requireValue(
                name && !artNames.has(name.toLowerCase()),
                'Tên giấy mỹ thuật phải có nội dung và không trùng.'
            );
            artNames.add(name.toLowerCase());
            requireValue(
                [p.w, p.h, p.cost].every((x) => Number.isFinite(x) && x > 0),
                'Khổ và giá giấy mỹ thuật phải lớn hơn 0.'
            );
        }
        const sale = config.wrapperSale;
        requireValue(
            ['unset', 'kts-total', 'print-plus-paper'].includes(sale?.printed),
            'Cách bán áo có in không hợp lệ.'
        );
        requireValue(
            ['unset', 'cost-factor', 'included'].includes(sale?.blank),
            'Cách bán áo không in không hợp lệ.'
        );
        requireValue(
            Number.isFinite(sale.paperFactor) && sale.paperFactor >= 0,
            'Hệ số bán giấy áo phải không âm.'
        );
        return { isValid: true, errors: [] };
    } catch (error) {
        return { isValid: false, errors: [error.message] };
    }
}
