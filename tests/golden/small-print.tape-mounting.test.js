// BỒI KEO 2 MẶT — In KTS khổ nhỏ (config v1.11.0).
//
// 'keo_2_lop' = 2 lớp giấy + 1 tấm keo, 'keo_3_lop' = 3 lớp + 2 tấm keo. Số tờ in / tờ
// trắng y hệt bồi thường cùng số lớp. Mỗi tấm keo tính như CÁN MÀNG 1 MẶT trên tờ in:
//   báo khách = số trang A4 vật lý × (giá cán của bậc + chênh) × số tấm   (bậc per_page)
//             = (giá cán trọn gói + chênh × số trang A4) × số tấm           (bậc trọn gói)
//   giá vốn   = (cao tờ in / 100) × (PRICE_PER_METER + chênh vốn) × số tấm, mỗi tờ in
// Công bồi và hệ số giấy trắng tra chung MOUNTING_CONFIG cùng số lớp (mountingTierKey).
//
// Số nền giống small-print.mounting.test.js: card visit 9.3×5.8, tờ in 32.2×21.2
// (10 con/tờ, hệ số A4 = 1), C2060, C300.
//   500 con 2 mặt → 50 tờ in → 100 trang A4 → bậc 80–100 per_page, cán 1.000đ/trang
//   300 con 2 mặt → 30 tờ in →  60 trang A4 → bậc 51–79 trọn gói, cán 50.000đ

import { describe, it, expect } from 'vitest';
import {
    processSheet,
    calculatePaperOptions,
    calculateFinishingCost,
} from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';
import {
    mountingLayers,
    printedSheetsPerSet,
    blankSheetsPerSet,
    tapeSheetsPerSet,
    tapeMountingConfig,
    mountingTierKey,
    MOUNTING_LABELS,
} from '../../src/modules/small-print/engine/mounting.js';
import { validateSmallPrintConfig } from '../../src/modules/small-print/config/schema.js';

const withTape = (over) => ({
    ...DEFAULT_CONFIG,
    TAPE_MOUNTING_CONFIG: { ...DEFAULT_CONFIG.TAPE_MOUNTING_CONFIG, ...over },
});

describe('Luật số tấm keo / tờ giấy', () => {
    it.each([
        ['keo_2_lop', 2, 1],
        ['keo_3_lop', 3, 2],
        ['yes', 2, 0],
        ['3_lop', 3, 0],
        ['none', 0, 0],
        [undefined, 0, 0],
    ])('%s → %s lớp, %s tấm keo', (type, layers, tapes) => {
        expect(mountingLayers(type)).toBe(layers);
        expect(tapeSheetsPerSet(type)).toBe(tapes);
    });

    it.each([
        ['keo_2_lop', 'yes'],
        ['keo_3_lop', '3_lop'],
    ])('%s: tờ in / tờ trắng y hệt %s', (keo, plain) => {
        for (const sides of [1, 2]) {
            expect(printedSheetsPerSet(keo, sides)).toBe(printedSheetsPerSet(plain, sides));
            expect(blankSheetsPerSet(keo, sides)).toBe(blankSheetsPerSet(plain, sides));
        }
    });

    it('có nhãn cho Copy quy cách', () => {
        expect(MOUNTING_LABELS.keo_2_lop).toBe('bồi keo 2 mặt 2 lớp');
        expect(MOUNTING_LABELS.keo_3_lop).toBe('bồi keo 2 mặt 3 lớp');
    });

    it.each([
        ['keo_2_lop', 'yes'],
        ['keo_3_lop', '3_lop'],
        ['yes', 'yes'],
        ['3_lop', '3_lop'],
        ['none', 'none'],
    ])('%s tra bảng công bồi %s', (type, key) => {
        expect(mountingTierKey(type)).toBe(key);
    });

    it('config cũ thiếu TAPE_MOUNTING_CONFIG / số lỗi → chênh 0', () => {
        expect(tapeMountingConfig({})).toEqual({ extra: 0, extraCost: 0 });
        expect(
            tapeMountingConfig({ TAPE_MOUNTING_CONFIG: { extra: 'abc', extraCost: null } })
        ).toEqual({ extra: 0, extraCost: 0 });
    });
});

describe('Giá vốn (processSheet)', () => {
    function run(mountingType, config = DEFAULT_CONFIG) {
        const all = [];
        processSheet(
            32.2,
            21.2,
            { w: 65, h: 86 },
            config.PRINTER_CONFIG.C2060,
            {
                productQuantity: 500,
                printSides: 2,
                printColorMode: '4color',
                laminationType: 'none',
                mountingType,
                blankPaperType: '3',
            },
            9.3,
            5.8,
            all,
            4400,
            0,
            false,
            config,
            false
        );
        return all[0];
    }

    it('keo 2 lớp = bồi 2 lớp + 1 tấm keo (0,212 m × 2.200đ ÷ 10 con)', () => {
        const plain = run('yes');
        const keo = run('keo_2_lop');
        const perProduct = (0.212 * 2200) / 10;
        expect(keo.costPerProduct - plain.costPerProduct).toBeCloseTo(perProduct, 6);
        expect(keo.tapeMountingCostPerProduct).toBeCloseTo(perProduct, 6);
        expect(plain.tapeMountingCostPerProduct).toBe(0);
    });

    it('keo 3 lớp = 2 tấm keo, cộng chênh vốn đ/m dài', () => {
        const keo = run('keo_3_lop', withTape({ extraCost: 800 }));
        expect(keo.tapeMountingCostPerProduct).toBeCloseTo((0.212 * (2200 + 800) * 2) / 10, 6);
    });
});

describe('Báo khách (calculateCustomerQuote)', () => {
    const NO_FIN = { holePunching: 0, creasing: 0, mounting: 0 };
    const NO_DIE = { moldCost: 0, laborCustomerPrice: 0 };

    function quoteFor(over, config = DEFAULT_CONFIG, fin = NO_FIN) {
        const params = {
            paperType: '3',
            productQuantity: 500,
            printSides: 2,
            printColorMode: '4color',
            laminationType: 'none',
            printContents: 1,
            variableData: 'no',
            largeSheetSelector: '0',
            artPaperPrice: 0,
            mountingType: 'none',
            blankPaperType: '3',
            ...over,
        };
        const all = [];
        calculatePaperOptions(params, config.PAPER_STOCK_DATA[3], 9.3, 5.8, all, 0, false, config);
        const best = all.find(
            (r) =>
                r.printer.name === 'C2060' &&
                Math.abs(r.cutSheetW - 32.2) < 0.01 &&
                Math.abs(r.cutSheetH - 21.2) < 0.01
        );
        return calculateCustomerQuote(best, params, fin, NO_DIE, null, config);
    }

    // Đi đúng đường App.jsx: công bồi tra theo số tờ in rồi truyền vào quote.
    function quoteWithLabor(over, config = DEFAULT_CONFIG) {
        const sheets = Math.ceil(over.productQuantity / 10);
        const labor = calculateFinishingCost(
            sheets,
            over.mountingType,
            config.MOUNTING_CONFIG[mountingTierKey(over.mountingType)]
        );
        const q = quoteFor(over, config, { ...NO_FIN, mounting: labor.customerPrice });
        return { q, labor };
    }

    // 10 con/tờ. 300 tờ thuộc bậc công 201–500 nên công là 300.000đ.
    it.each([
        [10, 1, 100000, 8000],
        [50, 1, 100000, 40000],
        [500, 2, 100000, 50000],
        [3000, 2, 300000, 180000],
    ])('keo 2 lớp, %s con %s mặt: công %s + keo %s', (productQuantity, printSides, cong, keo) => {
        const { q } = quoteWithLabor({ mountingType: 'keo_2_lop', productQuantity, printSides });
        expect(q.mountingCustomerPrice).toBe(cong);
        expect(q.totalTapeMountingCost).toBe(keo);
    });

    it('keo 3 lớp lấy công từ bảng 3 lớp, cả giá khách lẫn giá vốn', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.MOUNTING_CONFIG['3_lop'].customer_tiers[0].price = 150000;
        cfg.MOUNTING_CONFIG['3_lop'].cost_tiers[0].price = 80000;
        const { q, labor } = quoteWithLabor(
            { mountingType: 'keo_3_lop', productQuantity: 500 },
            cfg
        );
        expect(q.mountingCustomerPrice).toBe(150000);
        expect(labor.cost).toBe(80000);
        expect(q.totalTapeMountingCost).toBe(100000);
    });

    it('hệ số giấy trắng lấy theo bảng cùng số lớp', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        const base = quoteFor({ mountingType: 'keo_3_lop' }, cfg).totalBlankPaperCost;
        cfg.MOUNTING_CONFIG['3_lop'].blankPaperMarkup = 4;
        expect(quoteFor({ mountingType: 'keo_3_lop' }, cfg).totalBlankPaperCost).toBe(base * 2);
    });

    it('bậc per_page: 50 trang A4 × (1.000 + chênh) × số tấm keo', () => {
        expect(quoteFor({ mountingType: 'keo_2_lop' }).totalTapeMountingCost).toBe(50000);
        expect(
            quoteFor({ mountingType: 'keo_2_lop' }, withTape({ extra: 500 })).totalTapeMountingCost
        ).toBe(75000);
        expect(
            quoteFor({ mountingType: 'keo_3_lop' }, withTape({ extra: 500 })).totalTapeMountingCost
        ).toBe(150000);
    });

    it('bậc trọn gói: (50.000 + chênh × 30 trang) × số tấm keo', () => {
        const q = quoteFor(
            { mountingType: 'keo_2_lop', productQuantity: 300 },
            withTape({ extra: 500 })
        );
        expect(q.unitPriceText).toBe('Trọn gói');
        expect(q.totalTapeMountingCost).toBe(65000);
        expect(
            quoteFor({ mountingType: 'keo_3_lop', productQuantity: 300 }, withTape({ extra: 500 }))
                .totalTapeMountingCost
        ).toBe(130000);
    });

    it('khác bồi thường đúng bằng tiền keo: tiền in, giấy trắng giữ nguyên', () => {
        const plain = quoteFor({ mountingType: '3_lop' });
        const keo = quoteFor({ mountingType: 'keo_3_lop' });
        expect(keo.totalPrintCost).toBe(plain.totalPrintCost);
        expect(keo.totalBlankPaperCost).toBe(plain.totalBlankPaperCost);
        expect(keo.tapeSheetsPerSet).toBe(2);
        expect(keo.totalCustomerCost - plain.totalCustomerCost).toBe(keo.totalTapeMountingCost);
    });

    it('không cộng thêm cán màng: chọn cán màng thì tiền keo vẫn y nguyên', () => {
        const a = quoteFor({ mountingType: 'keo_2_lop' });
        const b = quoteFor({ mountingType: 'keo_2_lop', laminationType: 'laminate_2' });
        expect(b.totalTapeMountingCost).toBe(a.totalTapeMountingCost);
        expect(b.totalLaminationCost).toBe(50 * 1000 * 2);
    });

    it('đơn không bồi keo → tiền keo 0, chênh keo không ảnh hưởng', () => {
        for (const mode of ['none', 'yes', '3_lop']) {
            const a = quoteFor({ mountingType: mode });
            const b = quoteFor({ mountingType: mode }, withTape({ extra: 9999 }));
            expect(a.totalTapeMountingCost).toBe(0);
            expect(b.totalCustomerCost).toBe(a.totalCustomerCost);
        }
    });
});

describe('Schema', () => {
    it('chấp nhận config mặc định và config thiếu key', () => {
        expect(validateSmallPrintConfig(DEFAULT_CONFIG).isValid).toBe(true);
        const { TAPE_MOUNTING_CONFIG: _omit, ...old } = DEFAULT_CONFIG;
        expect(validateSmallPrintConfig(old).isValid).toBe(true);
    });

    it('loại số sai kiểu', () => {
        const r = validateSmallPrintConfig(withTape({ extra: '500' }));
        expect(r.isValid).toBe(false);
        expect(r.errors).toContain('TAPE_MOUNTING_CONFIG.extra: phải là number');
    });
});
