import { FEE_MODES } from './defaultConfig';
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
        }
        requireValue(
            Number.isFinite(config.dieCut.gapCm) &&
                config.dieCut.gapCm >= 0 &&
                config.dieCut.gapCm <= 5,
            'Khoảng cách bình khi bế phải từ 0 đến 5 cm.'
        );
        const m = config.orderMin;
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

// Giấy ram KTS được phép dùng cho bao thư, GIỮ số thứ tự gốc (engine tra theo index).
export function allowedPapers(config, printConfig) {
    const all = (printConfig?.PAPER_STOCK_DATA || [])
        .map((paper, index) => ({ paper, index }))
        .filter(({ paper }) => paper?.pricingModel === 'ream' && !paper.hidden);
    const allowed = config?.papers?.allowed || [];
    return allowed.length ? all.filter(({ index }) => allowed.includes(index)) : all;
}
