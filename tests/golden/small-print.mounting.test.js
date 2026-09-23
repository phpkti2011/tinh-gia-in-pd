// BỒI THÀNH PHẨM — In KTS khổ nhỏ (config v1.5.0).
//
// Trước file này module KHÔNG có một test nào chạy qua bồi: 4 bậc công bồi
// 50k/100k/150k/225k chưa từng được khoá, và việc bồi tính theo SỐ TỜ IN (chứ không
// theo số sản phẩm) cũng chưa ai chốt.
//
// Luật số tờ giấy (src/modules/small-print/engine/mounting.js):
//     tờ in mỗi bộ    = số mặt in
//     tờ trắng mỗi bộ = số lớp − số mặt in
//     trang in (click) = KHÔNG ĐỔI
//
// Số dùng trong file: card visit 9.3×5.8 trên tờ cắt 32.2×21.2, tờ lớn 65×86, máy C2060,
// giấy C300 (2.200.000/ream → 4.400đ/tờ lớn). Đây đúng là case E2E-1 của
// small-print.e2e.golden.test.js, nên mọi số nền dưới đây đã được khoá sẵn ở đó:
//     numCuttableSheets = 8, productsPerSheet = 10, clicks = 1, clickPrice = 750
//     giấy  = 4.400 / 8 / 10 = 55đ/SP mỗi tờ
//     in    = 1 × 750 × (số mặt) / 10 = 75đ/SP mỗi mặt

import { describe, it, expect } from 'vitest';
import {
    processSheet,
    calculateFinishingCost,
    calculatePaperOptions,
} from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';
import {
    mountingLayers,
    printedSheetsPerSet,
    blankSheetsPerSet,
} from '../../src/modules/small-print/engine/mounting.js';

const config = DEFAULT_CONFIG;
const LARGE_SHEET = { w: 65, h: 86 };
const C300_PRICE_PER_LARGE_SHEET = 4400;

// Chạy 1 combination cố định, chỉ đổi kiểu bồi / số mặt in.
function run({ mountingType = 'none', printSides = 2, blankPaperType = '3' } = {}) {
    const allResults = [];
    processSheet(
        32.2,
        21.2,
        LARGE_SHEET,
        config.PRINTER_CONFIG.C2060,
        {
            productQuantity: 500,
            printSides,
            printColorMode: '4color',
            laminationType: 'none',
            mountingType,
            blankPaperType,
        },
        9.3,
        5.8,
        allResults,
        C300_PRICE_PER_LARGE_SHEET,
        0,
        false,
        config,
        false
    );
    return allResults[0];
}

describe('Luật số tờ giấy', () => {
    it('không bồi → 1 tờ in, 0 tờ trắng (dù in mấy mặt)', () => {
        expect(mountingLayers('none')).toBe(0);
        expect(printedSheetsPerSet('none', 2)).toBe(1);
        expect(blankSheetsPerSet('none', 2)).toBe(0);
    });

    it.each([
        ['yes', 1, 1, 1],
        ['yes', 2, 2, 0],
        ['3_lop', 1, 1, 2],
        ['3_lop', 2, 2, 1],
    ])('%s + %s mặt → %s tờ in, %s tờ trắng', (type, sides, printed, blank) => {
        expect(printedSheetsPerSet(type, sides)).toBe(printed);
        expect(blankSheetsPerSet(type, sides)).toBe(blank);
    });

    it('params cũ thiếu mountingType → y như không bồi', () => {
        expect(mountingLayers(undefined)).toBe(0);
        expect(printedSheetsPerSet(undefined, 2)).toBe(1);
        expect(blankSheetsPerSet(undefined, 2)).toBe(0);
    });
});

describe('Chi phí — không bồi (nền cũ, phải y nguyên)', () => {
    const r = run();

    it('giấy 55đ/SP, in 150đ/SP, không có giấy trắng', () => {
        expect(r.paperCostPerProduct).toBeCloseTo(55, 6);
        expect(r.printCostPerProduct).toBeCloseTo(150, 6);
        expect(r.blankPaperCostPerProduct).toBe(0);
        expect(r.costPerProduct).toBeCloseTo(205, 6);
    });
});

describe('Bồi 2 lớp', () => {
    it('2 mặt → giấy in GẤP ĐÔI, trang in Y NGUYÊN, không có tờ trắng', () => {
        const off = run();
        const on = run({ mountingType: 'yes', printSides: 2 });

        expect(on.paperCostPerProduct).toBeCloseTo(off.paperCostPerProduct * 2, 6);
        expect(on.printCostPerProduct).toBeCloseTo(off.printCostPerProduct, 6);
        expect(on.blankPaperCostPerProduct).toBe(0);
        expect(on.costPerProduct).toBeCloseTo(110 + 150, 6);
    });

    it('1 mặt → 1 tờ in + 1 tờ trắng', () => {
        const r = run({ mountingType: 'yes', printSides: 1 });
        expect(r.paperCostPerProduct).toBeCloseTo(55, 6);
        expect(r.blankPaperCostPerProduct).toBeCloseTo(55, 6);
        expect(r.printCostPerProduct).toBeCloseTo(75, 6);
        expect(r.costPerProduct).toBeCloseTo(55 + 55 + 75, 6);
    });
});

describe('Bồi 3 lớp', () => {
    it('2 mặt → 2 tờ in + 1 tờ trắng', () => {
        const r = run({ mountingType: '3_lop', printSides: 2 });
        expect(r.paperCostPerProduct).toBeCloseTo(110, 6);
        expect(r.blankPaperCostPerProduct).toBeCloseTo(55, 6);
        expect(r.printCostPerProduct).toBeCloseTo(150, 6);
        expect(r.costPerProduct).toBeCloseTo(110 + 55 + 150, 6);
    });

    it('1 mặt → 1 tờ in + 2 tờ trắng', () => {
        const r = run({ mountingType: '3_lop', printSides: 1 });
        expect(r.paperCostPerProduct).toBeCloseTo(55, 6);
        expect(r.blankPaperCostPerProduct).toBeCloseTo(110, 6);
        expect(r.printCostPerProduct).toBeCloseTo(75, 6);
    });

    it('đắt hơn bồi 2 lớp đúng bằng tiền 1 tờ giấy trắng', () => {
        const two = run({ mountingType: 'yes', printSides: 2 });
        const three = run({ mountingType: '3_lop', printSides: 2 });
        expect(three.costPerProduct - two.costPerProduct).toBeCloseTo(55, 6);
    });
});

describe('Giấy trắng đổi theo loại giấy chọn', () => {
    it('C150 (1,2tr) rẻ hơn C300 (2,2tr) đúng theo tỉ lệ ream', () => {
        const c300 = run({ mountingType: '3_lop', printSides: 2, blankPaperType: '3' });
        const c150 = run({ mountingType: '3_lop', printSides: 2, blankPaperType: '0' });
        expect(c150.blankPaperCostPerProduct / c300.blankPaperCostPerProduct).toBeCloseTo(
            1200000 / 2200000,
            6
        );
    });

    it('giấy in KHÔNG đổi khi đổi giấy trắng', () => {
        const a = run({ mountingType: '3_lop', printSides: 2, blankPaperType: '3' });
        const b = run({ mountingType: '3_lop', printSides: 2, blankPaperType: '0' });
        expect(a.paperCostPerProduct).toBeCloseTo(b.paperCostPerProduct, 6);
        expect(a.printCostPerProduct).toBeCloseTo(b.printCostPerProduct, 6);
    });
});

describe('Công bồi — khoá 4 bậc chưa từng có test', () => {
    const tiers = config.MOUNTING_CONFIG.yes;

    it.each([
        [1, 50000, 100000],
        [50, 50000, 100000],
        [51, 100000, 200000],
        [200, 100000, 200000],
        [201, 150000, 300000],
        [500, 150000, 300000],
        [501, 225000, 450000],
        [5000, 225000, 450000],
    ])('%s tờ in → vốn %sđ, khách %sđ', (qty, cost, customer) => {
        const r = calculateFinishingCost(qty, 'yes', tiers);
        expect(r.cost).toBe(cost);
        expect(r.customerPrice).toBe(customer);
    });

    it('bậc dùng dấu <= (đúng biên vẫn thuộc bậc đó)', () => {
        expect(calculateFinishingCost(50, 'yes', tiers).cost).toBe(50000);
        expect(calculateFinishingCost(50.0001, 'yes', tiers).cost).toBe(100000);
    });

    it('bồi 3 lớp có bảng RIÊNG, sửa được độc lập', () => {
        expect(config.MOUNTING_CONFIG['3_lop']).toBeDefined();
        expect(config.MOUNTING_CONFIG['3_lop'].cost_tiers).not.toBe(tiers.cost_tiers);
    });

    it('config cũ thiếu bảng 3 lớp → trả 0, không nổ', () => {
        expect(calculateFinishingCost(50, '3_lop', undefined)).toEqual({
            cost: 0,
            customerPrice: 0,
        });
    });
});

describe('Cả 2 bảng công bồi đều lành lặn', () => {
    it.each(['yes', '3_lop'])('%s: 2 mảng cùng độ dài, bậc cuối là ∞', (mode) => {
        const m = config.MOUNTING_CONFIG[mode];
        expect(m.cost_tiers.length).toBe(m.customer_tiers.length);
        expect(m.cost_tiers[m.cost_tiers.length - 1].max_qty).toBe(Infinity);
        expect(m.customer_tiers[m.customer_tiers.length - 1].max_qty).toBe(Infinity);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Phía BÁO KHÁCH — calculateCustomerQuote
//
// Cùng đơn 500 card visit C300 2 mặt của E2E-3 (đã khoá: totalA4Pages = '100',
// totalPrintCost = 300.000đ). 500 con ÷ 10 con/tờ = 50 tờ in.
// ─────────────────────────────────────────────────────────────────────────────

describe('Báo khách', () => {
    const baseParams = {
        paperType: '3',
        productQuantity: 500,
        printSides: 2,
        printColorMode: '4color',
        laminationType: 'none',
        printContents: 1,
        variableData: 'no',
        largeSheetSelector: '0',
        customSheetW: 70,
        customSheetH: 100,
        artPaperPrice: 0,
        holePunchingType: 'none',
        creasingType: 'none',
        mountingType: 'none',
        blankPaperType: '3',
        dieCuttingType: 'none',
        moldType: 'simple',
        foilStamping: 'no',
        foilMolds: [{ w: 5, h: 5, special: false, impressions: 1 }],
    };
    const NO_FIN = { holePunching: 0, creasing: 0, mounting: 0 };
    const NO_DIE = { moldCost: 0, laborCustomerPrice: 0 };

    // CỐ Ý chọn cùng một phương án xếp cho mọi kiểu bồi, để so sánh đúng thứ cần so.
    function quoteFor(over) {
        const params = { ...baseParams, ...over };
        const all = [];
        calculatePaperOptions(params, config.PAPER_STOCK_DATA[3], 9.3, 5.8, all, 0, false, config);
        const best = all.find(
            (r) =>
                r.printer.name === 'C2060' &&
                Math.abs(r.cutSheetW - 32.2) < 0.01 &&
                Math.abs(r.cutSheetH - 21.2) < 0.01
        );
        return calculateCustomerQuote(best, params, NO_FIN, NO_DIE, null, config);
    }

    it('TIỀN IN KHÔNG ĐỔI khi bồi — đúng câu chủ xưởng nói', () => {
        const off = quoteFor({});
        for (const mode of ['yes', '3_lop']) {
            const on = quoteFor({ mountingType: mode });
            expect(on.totalPrintCost).toBe(off.totalPrintCost);
            expect(on.totalA4Pages).toBe(off.totalA4Pages);
        }
    });

    it('không bồi → không có tiền giấy trắng', () => {
        const q = quoteFor({});
        expect(q.totalBlankPaperCost).toBe(0);
        expect(q.blanksPerSet).toBe(0);
    });

    it('bồi 2 lớp 2 mặt → 2 tờ in, VẪN không có tờ trắng', () => {
        const q = quoteFor({ mountingType: 'yes', printSides: 2 });
        expect(q.sheetsPerSet).toBe(2);
        expect(q.blanksPerSet).toBe(0);
        expect(q.totalBlankPaperCost).toBe(0);
    });

    it('bồi 2 lớp 1 mặt → 1 tờ trắng, tính đúng giá vốn × hệ số', () => {
        const q = quoteFor({ mountingType: 'yes', printSides: 1 });
        // 4.400đ/tờ lớn ÷ 8 tờ cắt = 550đ/tờ cắt; × 1 tờ trắng × 50 tờ in × hệ số 2
        expect(q.blanksPerSet).toBe(1);
        expect(q.totalBlankPaperCost).toBe(550 * 1 * 50 * 2);
    });

    it('bồi 3 lớp 2 mặt → 1 tờ trắng', () => {
        const q = quoteFor({ mountingType: '3_lop', printSides: 2 });
        expect(q.blanksPerSet).toBe(1);
        expect(q.totalBlankPaperCost).toBe(550 * 1 * 50 * 2);
    });

    it('bồi 3 lớp 1 mặt → 2 tờ trắng, gấp đôi tiền giấy trắng', () => {
        const one = quoteFor({ mountingType: 'yes', printSides: 1 });
        const three = quoteFor({ mountingType: '3_lop', printSides: 1 });
        expect(three.blanksPerSet).toBe(2);
        expect(three.totalBlankPaperCost).toBe(one.totalBlankPaperCost * 2);
    });

    it('đổi loại giấy trắng → chỉ tiền giấy trắng đổi', () => {
        const a = quoteFor({ mountingType: '3_lop', blankPaperType: '3' });
        const b = quoteFor({ mountingType: '3_lop', blankPaperType: '0' });
        expect(b.totalBlankPaperCost / a.totalBlankPaperCost).toBeCloseTo(1200000 / 2200000, 6);
        expect(b.totalPrintCost).toBe(a.totalPrintCost);
    });

    it('phụ thu giấy theo TRANG IN không bị nhân hai lần', () => {
        // customerSurcharge × totalA4Pages. Số trang in không đổi khi bồi ⇒ phụ thu
        // phải y nguyên. Dùng decal (có customerSurcharge) thì đi nhánh khác, nên ở đây
        // chốt bằng chính totalA4Pages — thứ phụ thu bám vào.
        const off = quoteFor({});
        const on = quoteFor({ mountingType: '3_lop' });
        expect(on.totalA4Pages).toBe(off.totalA4Pages);
    });

    it('tiền giấy trắng cộng thẳng vào tổng báo khách', () => {
        const off = quoteFor({ mountingType: 'yes', printSides: 2 });
        const on = quoteFor({ mountingType: '3_lop', printSides: 2 });
        expect(on.totalCustomerCost - off.totalCustomerCost).toBe(on.totalBlankPaperCost);
    });

    it('cán màng KHÔNG đổi khi bồi (công thức cũ đã đúng sẵn)', () => {
        const off = quoteFor({ laminationType: 'laminate_2' });
        const on = quoteFor({ laminationType: 'laminate_2', mountingType: 'yes', printSides: 2 });
        expect(on.totalLaminationCost).toBe(off.totalLaminationCost);
    });
});
