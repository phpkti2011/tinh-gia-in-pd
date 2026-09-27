// Envelope engine — tính giá bao thư qua In KTS khổ nhỏ, hàm thuần.
//
//   calculateEnvelopeQuote(input, envelopeConfig, printConfig)
//
// Mỗi phần của khổ trải (docs/ke-hoach-module-kho-trai-bao-thu.md §4) đi qua đúng một đường:
//   printEnabled = true  → kts(): giấy + in theo bảng giá khách KTS, nâng lên giá sàn nếu có.
//   printEnabled = false → paperQuote(): CHỈ giấy ram (tờ nguyên × vốn/tờ); tiền in = 0,
//                          không giá sàn, không phí thiết lập, không gia công riêng.
// Số lượng truyền vào là số chi tiết; KTS không có hao hụt nên không cộng hai lần.
// Nắp và tay dán đã nằm trong khổ trải; KHÔNG cộng thêm ở đây. Bleed 0.3 cm do kts() tự
// cộng khi bình tờ (giống màn KTS), không đổi khổ khuôn đầu ra.

import { calculateFoilStamping, kts, paperQuote } from '../../small-print/engine/index.js';
import { pickTier, requireValue as must } from '../../../utils/priceTiers.js';
import { FEE_MODE_LABELS } from '../config/defaultConfig.js';
import { validateEnvelopeConfig, allowedPapers, PRINT_COLORS } from '../config/schema.js';
import {
    computeEnvelopeLayout,
    describeEnvelopePanels,
    validateEnvelopeInput,
    PART_LABELS,
} from './layout.js';

const precise = (n) => Math.round(n * 1e6) / 1e6;

const INPUT_KEYS = [
    'unit',
    'w',
    'h',
    'flap',
    'tab',
    'flapEdge',
    'construction',
    'backPrint',
    'quantity',
    'paper',
    'stock',
    'color',
    'foil',
    'molds',
];

// Khóa nhận diện đầu vào: UI chỉ hiển thị kết quả có khóa trùng với input hiện tại (I10).
export function envelopeInputKey(input) {
    return JSON.stringify(INPUT_KEYS.map((k) => (input ? input[k] : null) ?? null));
}

export function calculateEnvelopeQuote(input, config, printConfig) {
    const validConfig = validateEnvelopeConfig(config);
    must(validConfig.isValid, validConfig.errors.join(' '));
    const validInput = validateEnvelopeInput(input);
    must(validInput.ok, Object.values(validInput.errors).join(' '));
    const s = input;
    const papers = allowedPapers(config, printConfig);
    const paperEntry = papers.find((p) => p.index === s.paper);
    must(paperEntry, 'Chọn loại giấy bao thư trong danh sách giấy cho phép.');
    const stock = printConfig.STANDARD_LARGE_SHEET_SIZES?.[s.stock];
    must(stock, 'Chọn khổ giấy ram hợp lệ.');
    must(PRINT_COLORS.includes(s.color), 'Màu in không hợp lệ.');
    if (s.foil) {
        must(Array.isArray(s.molds) && s.molds.length > 0, 'Cần ít nhất một khuôn ép nhũ.');
        for (const mold of s.molds)
            must(
                [mold.w, mold.h].every((x) => Number.isFinite(x) && x > 0) &&
                    Number.isSafeInteger(mold.impressions) &&
                    mold.impressions > 0,
                'Khổ khuôn ép nhũ phải dương, số lần ép phải nguyên dương.'
            );
    }

    const layout = computeEnvelopeLayout(s);
    const panels = describeEnvelopePanels(layout);
    const qty = layout.envelopeQuantity;
    const colorLabel = s.color === '1color' ? 'đen trắng' : '4 màu';
    const rows = [];
    const row = (id, name, detail, cost, sale) => {
        must(
            Number.isFinite(cost) && cost >= 0 && Number.isFinite(sale) && sale >= 0,
            `Giá ${name} không hợp lệ.`
        );
        rows.push({ id, name, detail, cost: Math.round(cost), sale: Math.round(sale) });
    };

    const parts = layout.parts.map((part) => {
        const wCm = precise(part.widthMm / 10),
            hCm = precise(part.heightMm / 10),
            label = PART_LABELS[part.id],
            size = `${part.widthMm} × ${part.heightMm} mm`;
        if (part.printEnabled) {
            const press = kts(
                printConfig,
                wCm,
                hCm,
                part.quantity,
                1,
                s.paper,
                1,
                0,
                s.stock,
                null,
                s.color,
                '',
                { gap: config.dieCut.gapCm }
            );
            row(
                part.id,
                `${label} · giấy + in`,
                `${size} · ${part.quantity} cái · ${paperEntry.paper.name} · in ${colorLabel} · ${press.sheets} tờ máy`,
                press.cost,
                press.sale
            );
            return {
                ...part,
                label,
                press,
                paper: null,
                cost: press.cost,
                sale: press.sale,
                printCost: press.printCost,
                printSale: press.printSale,
            };
        }
        const paper = paperQuote(printConfig, wCm, hCm, part.quantity, s.paper, s.stock);
        const sale = paper.cost * config.backPaperFactor;
        row(
            part.id,
            `${label} · chỉ giấy`,
            `${size} · ${part.quantity} cái · ${paper.paperName} · ${paper.sheets} tờ ${paper.stock} · không in, tiền in 0 đ`,
            paper.cost,
            sale
        );
        return {
            ...part,
            label,
            press: null,
            paper,
            cost: paper.cost,
            sale,
            printCost: 0,
            printSale: 0,
        };
    });

    const fee = (key, id, name) => {
        const cfg = config[key],
            tier = pickTier(cfg.tiers, qty),
            times = cfg.mode === 'package' ? 1 : qty;
        row(
            id,
            name,
            `${qty} bao thư · bậc ${tier.index} · ${FEE_MODE_LABELS[cfg.mode].toLowerCase()}`,
            tier.cost * times,
            tier.sale * times
        );
        return { tier, cost: tier.cost * times, sale: tier.sale * times };
    };
    const dieCut = fee('dieCut', 'die-cut', 'Bế khuôn');
    const gluing = fee('gluing', 'gluing', 'Dán bao thư');

    const foil = calculateFoilStamping(
        { foilStamping: s.foil ? 'yes' : 'none', productQuantity: qty, foilMolds: s.molds },
        printConfig
    );
    row(
        'foil',
        'Ép nhũ',
        s.foil ? `${s.molds.length} khuôn · ${qty} bao thư · dùng giá KTS` : 'Không ép nhũ',
        foil.totalCost,
        foil.totalCost
    );

    const m = config.orderMin;
    if (m.fixedCost > 0 || m.fixedSale > 0)
        row('fixed', 'Phí cố định mỗi đơn', 'Áp một lần cho cả đơn', m.fixedCost, m.fixedSale);
    const subtotal = rows.reduce((sum, r) => sum + r.sale, 0);
    const minApplied = m.minSale > 0 && subtotal < m.minSale;
    if (minApplied)
        row(
            'min',
            'Phụ thu giá tối thiểu',
            `Đơn tối thiểu ${Math.round(m.minSale).toLocaleString('vi-VN')} đ`,
            0,
            m.minSale - subtotal
        );

    const reasons = [];
    if (!config.pricesConfirmed)
        reasons.push('Quản trị viên cần kiểm tra và xác nhận bảng giá bao thư.');
    const complete = reasons.length === 0;
    const cost = rows.reduce((sum, r) => sum + r.cost, 0),
        sale = complete ? rows.reduce((sum, r) => sum + r.sale, 0) : null;
    return {
        inputKey: envelopeInputKey(s),
        layout,
        panels,
        parts,
        rows,
        dieCut,
        gluing,
        foil,
        minApplied,
        cost,
        sale,
        unit: complete ? sale / qty : null,
        complete,
        reasons,
    };
}
