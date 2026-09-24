// Danh mục GIẤY — thêm giấy / đổi cách tính giá / ẩn giấy (config v1.6.0).
//
// ⚠ Giấy được nhận diện bằng VỊ TRÍ trong mảng (params.paperType = '3'). Cả Catalogue và
// Lò xo dùng chung bảng giấy này. Vì vậy:
//   - thêm giấy chỉ được NỐI VÀO CUỐI,
//   - bỏ giấy là đánh dấu hidden, KHÔNG splice khỏi mảng.
// File này khoá đúng hai luật đó, cộng với việc ẩn KHÔNG đụng tới tính tiền.

import { describe, it, expect } from 'vitest';
import {
    PAPER_PRICING_MODELS,
    visiblePapers,
    makeNewPaper,
    withPricingModel,
} from '../../src/modules/small-print/config/paperStock.js';
import {
    DEFAULT_CONFIG,
    validateSmallPrintConfig,
} from '../../src/modules/small-print/config/index.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { calculatePaperOptions } from '../../src/utils/calculator.js';

const PAPERS = DEFAULT_CONFIG.PAPER_STOCK_DATA;

describe('visiblePapers — giữ nguyên số thứ tự gốc', () => {
    it('không ẩn gì → trả đủ, index khớp vị trí thật', () => {
        const out = visiblePapers(PAPERS);
        expect(out).toHaveLength(PAPERS.length);
        out.forEach((x, i) => expect(x.index).toBe(i));
    });

    it('ẩn 1 giấy → biến mất khỏi danh sách nhưng index các giấy khác KHÔNG đổi', () => {
        const arr = structuredClone(PAPERS);
        arr[1].hidden = true;
        const out = visiblePapers(arr);

        expect(out).toHaveLength(PAPERS.length - 1);
        expect(out.some((x) => x.index === 1)).toBe(false);
        // C300 vẫn ở đúng vị trí 3 — đây là điều xoá thật sẽ phá.
        expect(out.find((x) => x.index === 3).paper.name).toBe('C300');
    });

    it('giấy ĐANG CHỌN dù đã ẩn vẫn được giữ lại trong ô chọn', () => {
        const arr = structuredClone(PAPERS);
        arr[3].hidden = true;
        expect(visiblePapers(arr, '3').some((x) => x.index === 3)).toBe(true);
        expect(visiblePapers(arr, 3).some((x) => x.index === 3)).toBe(true);
        expect(visiblePapers(arr, '0').some((x) => x.index === 3)).toBe(false);
    });

    it('mảng thiếu / sai kiểu → trả rỗng, không nổ', () => {
        expect(visiblePapers(undefined)).toEqual([]);
        expect(visiblePapers(null, '3')).toEqual([]);
    });
});

describe('makeNewPaper — luôn có sẵn field giá của đúng cách tính', () => {
    it.each([
        ['ream', 'pricePerReam'],
        ['sqm', 'pricePerSqm'],
        ['per_sheet', 'sheetPrice'],
    ])('%s → có field %s là number', (model, field) => {
        const p = makeNewPaper(model);
        expect(p.pricingModel).toBe(model);
        expect(typeof p[field]).toBe('number');
    });

    it('per_sheet có sẵn khổ tờ', () => {
        const p = makeNewPaper('per_sheet');
        expect(typeof p.sheetSize.w).toBe('number');
        expect(typeof p.sheetSize.h).toBe('number');
    });

    it('giấy mới luôn qua được schema', () => {
        for (const m of PAPER_PRICING_MODELS) {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.PAPER_STOCK_DATA.push(makeNewPaper(m.id));
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        }
    });
});

describe('withPricingModel — đổi cách tính giá', () => {
    it('bơm field giá còn thiếu', () => {
        const out = withPricingModel({ name: 'X', pricingModel: 'ream' }, 'per_sheet');
        expect(out.pricingModel).toBe('per_sheet');
        expect(typeof out.sheetPrice).toBe('number');
        expect(out.sheetSize).toEqual({ w: 33, h: 48 });
    });

    it('GIỮ số cũ: đổi nhầm rồi đổi lại thì giá không mất', () => {
        const orig = { name: 'C300', pricingModel: 'ream', pricePerReam: 2200000 };
        const back = withPricingModel(withPricingModel(orig, 'sqm'), 'ream');
        expect(back.pricePerReam).toBe(2200000);
    });

    it('giữ nguyên tên và phụ thu', () => {
        const out = withPricingModel(
            { name: 'Giấy A', pricingModel: 'ream', pricePerReam: 1, customerSurcharge: 500 },
            'sqm'
        );
        expect(out.name).toBe('Giấy A');
        expect(out.customerSurcharge).toBe(500);
    });

    it('không mutate input', () => {
        const orig = { name: 'X', pricingModel: 'ream', pricePerReam: 5 };
        withPricingModel(orig, 'sqm');
        expect(orig.pricingModel).toBe('ream');
        expect(orig.pricePerSqm).toBeUndefined();
    });
});

describe('Schema — field hidden', () => {
    it('thiếu field → hợp lệ (config cũ)', () => {
        expect(validateSmallPrintConfig(DEFAULT_CONFIG).isValid).toBe(true);
    });

    it('hidden = true/false → hợp lệ', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PAPER_STOCK_DATA[0].hidden = true;
        cfg.PAPER_STOCK_DATA[1].hidden = false;
        expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
    });

    it('hidden sai kiểu → báo lỗi đúng chỗ', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PAPER_STOCK_DATA[2].hidden = 'yes';
        const r = validateSmallPrintConfig(cfg);
        expect(r.isValid).toBe(false);
        expect(r.errors.some((e) => e.includes('PAPER_STOCK_DATA[2].hidden'))).toBe(true);
    });

    it('per_sheet có sheetSize sai kiểu → báo lỗi', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        const i = cfg.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'per_sheet');
        cfg.PAPER_STOCK_DATA[i].sheetSize = { w: '33', h: 48 };
        expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
    });

    it('thêm giấy mới vào cuối → vẫn hợp lệ, không đụng giấy cũ', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PAPER_STOCK_DATA.push(makeNewPaper('ream'));
        expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        expect(cfg.PAPER_STOCK_DATA[3].name).toBe('C300');
    });
});

describe('Schema — field sheetSizes (v1.7.0)', () => {
    const perSheetIdx = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex(
        (p) => p.pricingModel === 'per_sheet'
    );
    const withSizes = (val) => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PAPER_STOCK_DATA[perSheetIdx].sheetSizes = val;
        return cfg;
    };

    it('thiếu field → hợp lệ (config cũ)', () => {
        expect(validateSmallPrintConfig(DEFAULT_CONFIG).isValid).toBe(true);
    });

    it('mảng hợp lệ → hợp lệ', () => {
        expect(
            validateSmallPrintConfig(
                withSizes([
                    { w: 33, h: 48, price: 5500 },
                    { w: 33, h: 64, price: 7000 },
                ])
            ).isValid
        ).toBe(true);
    });

    it('không phải mảng → báo lỗi nêu sheetSizes', () => {
        const r = validateSmallPrintConfig(withSizes({ w: 33 }));
        expect(r.isValid).toBe(false);
        expect(r.errors.some((e) => e.includes('sheetSizes'))).toBe(true);
    });

    it('ô sai kiểu → báo lỗi nêu đúng dòng và đúng ô', () => {
        const r = validateSmallPrintConfig(withSizes([{ w: '33', h: 48, price: 5500 }]));
        expect(r.isValid).toBe(false);
        expect(r.errors.some((e) => e.includes('sheetSizes[0].w'))).toBe(true);
    });

    it('khổ 0 → VẪN hợp lệ: dễ dãi là giao kèo, chặn ở đây là admin mất cả bảng giá', () => {
        expect(validateSmallPrintConfig(withSizes([{ w: 0, h: 0, price: 0 }])).isValid).toBe(true);
    });
});

describe('Ẩn giấy KHÔNG đụng tới tiền', () => {
    // Ẩn chỉ là chuyện giao diện: engine vẫn tra theo vị trí, nên đơn đang mở dùng đúng
    // giấy đó vẫn ra y hệt một đồng.
    const params = {
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

    function totalFor(config) {
        const all = [];
        calculatePaperOptions(params, config.PAPER_STOCK_DATA[3], 9.3, 5.8, all, 0, false, config);
        const best = all.find(
            (r) =>
                r.printer.name === 'C2060' &&
                Math.abs(r.cutSheetW - 32.2) < 0.01 &&
                Math.abs(r.cutSheetH - 21.2) < 0.01
        );
        return calculateCustomerQuote(
            best,
            params,
            NO_FIN,
            { moldCost: 0, laborCustomerPrice: 0 },
            null,
            config
        ).totalCustomerCost;
    }

    it('ẩn chính giấy đang dùng → giá không đổi một đồng', () => {
        const hidden = structuredClone(DEFAULT_CONFIG);
        hidden.PAPER_STOCK_DATA[3].hidden = true;
        expect(totalFor(hidden)).toBe(totalFor(DEFAULT_CONFIG));
    });

    it('ẩn giấy khác → giá không đổi, và giấy chuẩn so giá vẫn tìm được theo tên', () => {
        const hidden = structuredClone(DEFAULT_CONFIG);
        hidden.PAPER_STOCK_DATA[0].hidden = true;
        hidden.PAPER_STOCK_DATA[5].hidden = true;
        expect(totalFor(hidden)).toBe(totalFor(DEFAULT_CONFIG));
    });

    it('thêm giấy mới vào cuối → giá đơn cũ không đổi', () => {
        const added = structuredClone(DEFAULT_CONFIG);
        added.PAPER_STOCK_DATA.push(makeNewPaper('ream'));
        expect(totalFor(added)).toBe(totalFor(DEFAULT_CONFIG));
    });
});
