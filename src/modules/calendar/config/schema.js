import { CALENDAR_DEFAULT_CONFIG } from './defaultConfig';
import { requireValue, validateTiers } from '../../../utils/priceTiers.js';

// requireValue/validateTiers/pickTier chuyển sang utils/priceTiers.js (dùng chung với bao thư);
// giữ re-export để engine, UI và test của lịch không đổi đường import.
export { requireValue, validateTiers, pickTier } from '../../../utils/priceTiers.js';

// Khổ tấm nguyên của RIÊNG một loại carton. Cạnh w là cạnh nạp vào máy cắt — engine
// không tự xoay tấm nguyên, nên w mới là cạnh phải lọt khổ ngang máy.
function validateCartonSheet(item, g) {
    for (const [side, label] of [
        ['w', 'ngang'],
        ['h', 'dài'],
    ])
        requireValue(
            Number.isFinite(item?.[side]) && item[side] > 0 && item[side] <= 1000,
            `Khổ ${label} của tấm carton "${item?.name ?? ''}" phải lớn hơn 0 và không vượt 1.000 cm.`
        );
    requireValue(item.w <= g.machine, `Cạnh nạp carton "${item.name}" vượt khổ ngang máy cắt.`);
    requireValue(
        g.trim * 2 < Math.min(item.w, item.h),
        `Xén biên dùng hết tấm carton "${item.name}".`
    );
}

export function validateCalendarConfig(config) {
    try {
        requireValue(
            config && typeof config.pricesConfirmed === 'boolean',
            'Thiếu trạng thái xác nhận bảng giá.'
        );
        const c = config.geometry;
        if (config.allowedMaterials !== undefined) {
            for (const role of ['wrap', 'liner'])
                requireValue(
                    Array.isArray(config.allowedMaterials?.[role]) &&
                        config.allowedMaterials[role].length > 0 &&
                        config.allowedMaterials[role].every(
                            (name) => typeof name === 'string' && name.trim()
                        ),
                    'Mỗi phần áo/lót phải cho phép ít nhất một vật liệu.'
                );
        }
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
                if (key === 'carton') validateCartonSheet(item, c);
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
