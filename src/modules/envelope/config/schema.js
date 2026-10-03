import { FEE_MODES, ENVELOPE_ART_PAPERS } from './defaultConfig';
import { requireValue, validateTiers } from '../../../utils/priceTiers.js';
import { ENVELOPE_UNITS, FLAP_EDGES, CONSTRUCTIONS } from '../engine/layout.js';

export { requireValue, validateTiers, pickTier } from '../../../utils/priceTiers.js';

export const PRINT_COLORS = ['4color', '1color'];

export function validateEnvelopeConfig(config) {
    try {
        requireValue(
            config && typeof config.pricesConfirmed === 'boolean',
            'Thiếu trạng thái xác nhận bảng giá.'
        );
        const p = config.papers;
        // Thiếu trường: cấu hình cũ dùng danh sách mặc định. []: admin đã xóa hết.
        if (config.sizePresets !== undefined) {
            requireValue(Array.isArray(config.sizePresets), 'Danh sách khổ chuẩn không hợp lệ.');
            const ids = new Set();
            for (const size of config.sizePresets) {
                requireValue(
                    size &&
                        typeof size.id === 'string' &&
                        size.id.trim() &&
                        size.id !== 'custom' &&
                        !ids.has(size.id),
                    'Mã khổ chuẩn phải khác nhau.'
                );
                requireValue(
                    [size.w, size.h].every((n) => Number.isFinite(n) && n > 0),
                    'Ngang và cao khổ chuẩn phải là số lớn hơn 0 mm.'
                );
                ids.add(size.id);
                requireValue(
                    size.name === undefined || typeof size.name === 'string',
                    'Tên khổ chuẩn phải là văn bản.'
                );
            }
        }
        if (config.artPapers !== undefined) {
            requireValue(
                Array.isArray(config.artPapers) && config.artPapers.length > 0,
                'Cần ít nhất một loại giấy mỹ thuật.'
            );
            for (const art of config.artPapers)
                requireValue(
                    art &&
                        typeof art.name === 'string' &&
                        art.name.trim() &&
                        [art.w, art.h].every((n) => Number.isFinite(n) && n > 0) &&
                        Number.isFinite(art.cost) &&
                        art.cost >= 0,
                    'Giấy mỹ thuật cần tên, khổ giấy dương và giá mỗi tờ không âm.'
                );
        }
        requireValue(
            p &&
                Array.isArray(p.allowed) &&
                p.allowed.every((i) => Number.isSafeInteger(i) && i >= 0),
            'Danh sách giấy cho phép phải là số thứ tự giấy KTS.'
        );
        requireValue(
            Number.isSafeInteger(p.defaultPaper) && p.defaultPaper >= 0,
            'Giấy mặc định không hợp lệ.'
        );
        requireValue(
            Number.isSafeInteger(p.defaultStock) && p.defaultStock >= 0,
            'Khổ giấy ram mặc định không hợp lệ.'
        );
        requireValue(
            p.allowed.length === 0 || p.allowed.includes(p.defaultPaper),
            'Giấy mặc định phải nằm trong danh sách giấy cho phép.'
        );
        const d = config.defaults;
        requireValue(d && ENVELOPE_UNITS.includes(d.unit), 'Đơn vị mặc định không hợp lệ.');
        requireValue(CONSTRUCTIONS.includes(d.construction), 'Kiểu khuôn mặc định không hợp lệ.');
        requireValue(FLAP_EDGES.includes(d.flapEdge), 'Vị trí nắp mặc định không hợp lệ.');
        requireValue(PRINT_COLORS.includes(d.color), 'Màu in mặc định không hợp lệ.');
        for (const [key, label] of [
            ['flapMm', 'nắp'],
            ['tabMm', 'tay dán'],
        ])
            requireValue(
                Number.isFinite(d[key]) && d[key] > 0,
                `Kích thước ${label} mặc định phải lớn hơn 0 mm.`
            );
        for (const [key, label] of [
            ['dieCut', 'bế khuôn'],
            ['gluing', 'dán bao thư'],
        ]) {
            const fee = config[key];
            requireValue(
                fee && FEE_MODES.includes(fee.mode),
                `Cách tính phí ${label} phải là mỗi bao thư hoặc trọn gói.`
            );
            validateTiers(fee.tiers);
            if (key === 'gluing') {
                requireValue(
                    fee.tiers.every(
                        (tier) => tier.mode === undefined || FEE_MODES.includes(tier.mode)
                    ),
                    'Cách tính mỗi bậc dán bao thư phải là mỗi bao thư hoặc trọn gói.'
                );
            }
        }
        requireValue(
            Number.isFinite(config.dieCut.gapCm) &&
                config.dieCut.gapCm >= 0 &&
                config.dieCut.gapCm <= 5,
            'Khoảng cách bình khi bế phải từ 0 đến 5 cm.'
        );
        const m = config.orderMin;
        if (config.flapTape !== undefined) {
            requireValue(
                config.flapTape &&
                    ['costPerCm', 'salePerCm'].every(
                        (key) => Number.isFinite(config.flapTape[key]) && config.flapTape[key] >= 0
                    ),
                'Giá dán keo nắp theo cm phải là số không âm.'
            );
            requireValue(
                ['minCost', 'minSale'].every(
                    (key) =>
                        config.flapTape[key] === undefined ||
                        (Number.isFinite(config.flapTape[key]) && config.flapTape[key] >= 0)
                ),
                'Phí dán keo nắp tối thiểu phải là số không âm.'
            );
        }
        for (const [key, label] of [
            ['fixedCost', 'vốn cố định'],
            ['fixedSale', 'phí cố định báo khách'],
            ['minSale', 'giá tối thiểu'],
        ])
            requireValue(
                m && Number.isFinite(m[key]) && m[key] >= 0,
                `Khoản ${label} mỗi đơn phải là số không âm.`
            );
        requireValue(
            Number.isFinite(config.backPaperFactor) && config.backPaperFactor >= 0,
            'Hệ số bán giấy mặt sau phải không âm.'
        );
        return { isValid: true, errors: [] };
    } catch (error) {
        return { isValid: false, errors: [error.message] };
    }
}

export function envelopeArtPaper(input, config) {
    return input.artInput ?? (config.artPapers ?? ENVELOPE_ART_PAPERS)[input.artIndex ?? 0];
}

// Giấy ram KTS được phép dùng cho bao thư, GIỮ số thứ tự gốc (engine tra theo index).
export function allowedPapers(config, printConfig) {
    const all = (printConfig?.PAPER_STOCK_DATA || [])
        .map((paper, index) => ({ paper, index }))
        .filter(({ paper }) => paper?.pricingModel === 'ream' && !paper.hidden);
    const allowed = config?.papers?.allowed || [];
    return allowed.length ? all.filter(({ index }) => allowed.includes(index)) : all;
}
