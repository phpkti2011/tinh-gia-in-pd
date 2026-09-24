// Giấy khổ cố định NHIỀU KHỔ, mỗi khổ một giá (config v1.7.0).
//
// Trước v1.7.0 mỗi giấy `per_sheet` chỉ khai được đúng 1 khổ + 1 giá. Giờ khai được
// nhiều khổ; engine thử hết rồi để bảng xếp hạng ở App.jsx chọn rẻ nhất — y như giấy
// ram đã làm với COMMON_SHEET_SIZES.
//
// Hai ràng buộc quan trọng nhất ở file này:
//   1. Giấy chỉ có cặp field cũ { sheetSize, sheetPrice } phải ra giá Y HỆT trước khi sửa.
//   2. Dòng đang gõ dở (w = 0) KHÔNG được làm hỏng các khổ còn lại — bảng khổ trong Cài
//      Đặt render từ chính perSheetVariants, mà ô nhập số commit theo từng phím.

import { describe, it, expect } from 'vitest';
import { calculatePerSheetOptions } from '../../src/utils/calculator.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';
import { perSheetVariants } from '../../src/modules/small-print/config/paperStock.js';

const config = DEFAULT_CONFIG;

// Giấy per_sheet duy nhất trong config mặc định — vẫn chỉ có cặp field cũ.
const LEGACY = config.PAPER_STOCK_DATA.find((p) => p.pricingModel === 'per_sheet');

const params = {
    productQuantity: 500,
    printSides: 1,
    printColorMode: '4color',
    laminationType: 'none',
};

// Tem 16×5.3 — cùng sản phẩm mà SheetVisualizer.null-layout đang dùng.
function run(paper) {
    const out = [];
    calculatePerSheetOptions(params, paper, 16, 5.3, out, 0, false, config);
    return out;
}

const sizesOf = (results) => [...new Set(results.map((r) => `${r.cutSheetW}x${r.cutSheetH}`))];

describe('perSheetVariants — nguồn khổ', () => {
    it('chỉ có cặp field cũ → đúng 1 khổ', () => {
        expect(perSheetVariants(LEGACY)).toEqual([{ w: 33, h: 48, price: LEGACY.sheetPrice }]);
    });

    it('có sheetSizes → dùng sheetSizes, bỏ qua cặp cũ', () => {
        const paper = {
            ...LEGACY,
            sheetSizes: [
                { w: 33, h: 48, price: 5500 },
                { w: 33, h: 64, price: 7000 },
            ],
        };
        expect(perSheetVariants(paper)).toEqual([
            { w: 33, h: 48, price: 5500 },
            { w: 33, h: 64, price: 7000 },
        ]);
    });

    it.each([
        ['mảng rỗng', []],
        ['null', null],
        ['không phải mảng', { w: 1 }],
    ])('sheetSizes %s → rơi về cặp cũ', (_label, val) => {
        expect(perSheetVariants({ ...LEGACY, sheetSizes: val })).toEqual([
            { w: 33, h: 48, price: LEGACY.sheetPrice },
        ]);
    });

    it('KHÔNG lọc bỏ dòng w/h = 0 — dòng đang gõ dở phải còn trên màn hình', () => {
        const paper = { ...LEGACY, sheetSizes: [{ w: 0, h: 48, price: 5500 }] };
        expect(perSheetVariants(paper)).toEqual([{ w: 0, h: 48, price: 5500 }]);
    });

    it('chuẩn hoá field thiếu / sai kiểu về 0, không nổ', () => {
        const paper = { ...LEGACY, sheetSizes: [{}, { w: '33', h: 48 }, null] };
        expect(perSheetVariants(paper)).toEqual([
            { w: 0, h: 0, price: 0 },
            { w: 33, h: 48, price: 0 },
        ]);
    });

    it('không có gì cả → mảng rỗng', () => {
        expect(perSheetVariants({ pricingModel: 'per_sheet' })).toEqual([]);
        expect(perSheetVariants(null)).toEqual([]);
    });
});

describe('Không phá gì — giấy chỉ có cặp field cũ', () => {
    const results = run(LEGACY);

    it('vẫn ra phương án, tất cả đúng khổ 33×48', () => {
        expect(results.length).toBeGreaterThan(0);
        expect(sizesOf(results)).toEqual(['33x48']);
    });

    it('sheetSizes rỗng cho kết quả GIỐNG HỆT', () => {
        expect(run({ ...LEGACY, sheetSizes: [] })).toEqual(results);
    });

    it('giá giấy/SP bám đúng sheetPrice cũ', () => {
        const r = results[0];
        expect(r.paperCostPerProduct).toBeCloseTo(LEGACY.sheetPrice / r.productsPerSheet, 6);
    });
});

describe('Nhiều khổ', () => {
    const paper = {
        ...LEGACY,
        sheetSizes: [
            { w: 33, h: 48, price: 5500 },
            { w: 33, h: 64, price: 7000 },
        ],
    };
    const results = run(paper);

    it('ra phương án cho CẢ HAI khổ', () => {
        expect(sizesOf(results).sort()).toEqual(['33x48', '33x64']);
    });

    it('mỗi khổ tính theo GIÁ CỦA CHÍNH NÓ', () => {
        for (const r of results) {
            const price = r.cutSheetH === 48 ? 5500 : 7000;
            expect(r.paperCostPerProduct).toBeCloseTo(price / r.productsPerSheet, 6);
        }
    });

    it('khổ cao hơn xếp được nhiều sản phẩm hơn mỗi tờ', () => {
        const a = results.find((r) => r.cutSheetH === 48);
        const b = results.find((r) => r.cutSheetH === 64 && r.printer.name === a.printer.name);
        expect(b.productsPerSheet).toBeGreaterThan(a.productsPerSheet);
    });

    it('khoá khử trùng lặp của App.jsx phân biệt được 2 khổ', () => {
        // App.jsx dedupe theo printer.name + largeSheetName + cutSheetSize + productsPerSheet.
        const keys = new Set(
            results.map((r) => `${r.printer.name}|${r.largeSheetName}|${r.cutSheetSize}`)
        );
        expect(keys.size).toBe(results.length);
        expect(results.some((r) => r.largeSheetName === 'Tờ 33x48')).toBe(true);
        expect(results.some((r) => r.largeSheetName === 'Tờ 33x64')).toBe(true);
    });

    it('đổi giá 1 khổ chỉ đổi giá khổ đó', () => {
        const cheaper = run({
            ...paper,
            sheetSizes: [
                { w: 33, h: 48, price: 5500 },
                { w: 33, h: 64, price: 6000 },
            ],
        });
        const a48 = results.find((r) => r.cutSheetH === 48);
        const b48 = cheaper.find((r) => r.cutSheetH === 48);
        expect(b48.costPerProduct).toBeCloseTo(a48.costPerProduct, 6);

        const a64 = results.find((r) => r.cutSheetH === 64);
        const b64 = cheaper.find((r) => r.cutSheetH === 64);
        expect(b64.costPerProduct).toBeLessThan(a64.costPerProduct);
    });
});

describe('Dòng đang gõ dở không phá các khổ còn lại', () => {
    it('khổ w = 0 không sinh phương án, khổ hợp lệ vẫn ra đủ', () => {
        const results = run({
            ...LEGACY,
            sheetSizes: [
                { w: 0, h: 48, price: 5500 },
                { w: 33, h: 48, price: 5500 },
            ],
        });
        expect(results.length).toBeGreaterThan(0);
        expect(sizesOf(results)).toEqual(['33x48']);
    });

    it('tất cả khổ đều hỏng → không phương án nào, nhưng không nổ', () => {
        expect(() => run({ ...LEGACY, sheetSizes: [{ w: 0, h: 0, price: 0 }] })).not.toThrow();
        expect(run({ ...LEGACY, sheetSizes: [{ w: 0, h: 0, price: 0 }] })).toEqual([]);
    });
});

describe('Giữ nguyên hình dạng kết quả', () => {
    const r = run({ ...LEGACY, sheetSizes: [{ w: 33, h: 64, price: 7000 }] })[0];

    it('cuttableSheetLayout vẫn là mảng (LargeSheetVisualizer nhận null sẽ vỡ)', () => {
        expect(Array.isArray(r.cuttableSheetLayout)).toBe(true);
    });

    it('khổ tờ = khổ lớn, numCuttableSheets = 1', () => {
        expect(r.largeSheetW).toBe(33);
        expect(r.largeSheetH).toBe(64);
        expect(r.numCuttableSheets).toBe(1);
        expect(r.isDecal).toBe(true);
    });
});
