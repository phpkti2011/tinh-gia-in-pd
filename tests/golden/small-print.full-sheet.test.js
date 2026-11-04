// In NGUYÊN TỜ giấy lớn khi nó vừa máy in (engine/options.js → calculatePaperOptions).
//
// Ca thật: thành phẩm 30 × 42 cm (+ tràn lề 0,15 ⇒ 30,3 × 42,3), giấy mỹ thuật tuỳ chọn
// 32 × 44. Tờ in cố định nhỏ nhất chứa được thành phẩm là 32,2 × 42,8 nhưng rộng hơn giấy
// 2 mm ⇒ trước đây 0 phương án, phần mềm không tính được. Nay thử luôn chính tờ 32 × 44.

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';
import {
    calculateCustomerQuote,
    calculatePaperOptions,
} from '../../src/modules/small-print/engine/index.js';

const cfg = DEFAULT_CONFIG;
const artIdx = cfg.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'custom');
const customSheetIdx = cfg.ART_PAPER_LARGE_SHEET_SIZES.findIndex((s) => s.w === 'custom');

function optionsFor(sheetW, sheetH, prodW = 30.3, prodH = 42.3, extra = {}) {
    const out = [];
    calculatePaperOptions(
        {
            largeSheetSelector: customSheetIdx,
            customSheetW: sheetW,
            customSheetH: sheetH,
            artPaperPrice: 10000,
            printColorMode: '4color',
            printSides: 2,
            laminationType: 'none',
            mountingType: 'none',
            ...extra,
        },
        cfg.PAPER_STOCK_DATA[artIdx],
        prodW,
        prodH,
        out,
        0,
        false,
        cfg
    );
    return out;
}

describe('In nguyên tờ giấy lớn', () => {
    it('giấy 32 × 44, thành phẩm 30,3 × 42,3: có phương án in nguyên tờ trên cả 2 máy', () => {
        const out = optionsFor(32, 44);
        expect(out.length).toBeGreaterThan(0);
        const sizes = new Set(out.map((r) => r.cutSheetSize));
        expect([...sizes]).toEqual(['32.00 x 44.00']);
        for (const r of out) {
            expect(r.numCuttableSheets).toBe(1);
            expect(r.productsPerSheet).toBe(1);
            // lề thường: rộng −0,8, cao −0,1 (44 không phải điểm VK)
            expect(r.printableArea).toBe('31.20 x 43.90');
            expect(r.clicks).toBe(2);
        }
        expect(out.map((r) => r.printer.name).sort()).toEqual(['C2060', 'C6085']);
    });

    it('phương án in nguyên tờ ra được giá báo khách (500 SP, 2 mặt)', () => {
        const best = optionsFor(32, 44).sort((a, b) => a.costPerProduct - b.costPerProduct)[0];
        const q = calculateCustomerQuote(
            best,
            {
                productQuantity: 500,
                printSides: 2,
                printColorMode: '4color',
                laminationType: 'none',
                printContents: 1,
                variableData: 'no',
                paperType: artIdx,
                artPaperPrice: 10000,
            },
            { holePunching: 0, creasing: 0, mounting: 0 },
            { moldCost: 0, laborCustomerPrice: 0 },
            null,
            cfg
        );
        expect(q.error ?? null).toBeNull();
        // 500 tờ × 2 mặt × hệ số A4 của tờ cao 44 cm — hệ số do luật quy đổi A4 hiện có
        // quyết (khoảng 2–2,4 trang/tờ), test này chỉ khoá việc ra được số hợp lý.
        expect(q.totalA4PagesRaw).toBeGreaterThanOrEqual(500 * 2 * 2);
        expect(q.totalA4PagesRaw).toBeLessThanOrEqual(500 * 2 * 2.4);
        expect(q.totalCustomerCost).toBeGreaterThan(0);
    });

    it('giấy nằm ngang 44 × 32 cũng thử được (xoay tờ cho vừa khổ máy)', () => {
        const out = optionsFor(44, 32);
        expect(out.some((r) => r.cutSheetSize === '32.00 x 44.00')).toBe(true);
    });

    it('giấy trùng một khổ tờ in có sẵn (33 × 48) không bị nhân đôi phương án', () => {
        const out = optionsFor(33, 48);
        const keys = out.map((r) => `${r.printer.name}|${r.cutSheetSize}`);
        expect(new Set(keys).size).toBe(keys.length);
    });

    it('giấy lớn vượt khổ máy (40 × 60) không sinh phương án in nguyên tờ', () => {
        const out = optionsFor(40, 60, 10, 10);
        expect(out.some((r) => r.cutSheetSize === '40.00 x 60.00')).toBe(false);
        expect(out.some((r) => r.cutSheetSize === '60.00 x 40.00')).toBe(false);
    });

    it('vùng in nguyên tờ vẫn nhỏ hơn thành phẩm thì vẫn 0 phương án', () => {
        // 31,5 × 42,3 không lọt vùng in 31,2 rộng
        expect(optionsFor(32, 44, 31.5, 42.3)).toHaveLength(0);
    });
});
