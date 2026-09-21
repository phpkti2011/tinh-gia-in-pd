// Phụ thu nhiều nội dung (decal) — TASK-DECAL-CONTENT-SURCHARGE.
//
// Bê cơ chế từ In KTS khổ nhỏ (calculatePrintContentSurcharge) sang decal.
// Khác biệt CỐ Ý so với small-print: decal lưu % dạng SỐ NGUYÊN (10 = 10%),
// không phải phân số (0.1) — cho khớp mọi field percent khác của module.
//
// DECAL_DEFAULT_CONFIG.contentSurcharge:
//   singleContentPercent: 20  (khi mỗi nội dung chỉ in 1 cái)
//   tiers: [{4-9, 10%}, {10-14, 20%}, {15-25, 30%}, {26-Inf, 35%}]
//   Khoảng trống ở contentCount ∈ {2, 3}: KHÔNG phụ thu (ưu đãi bậc thấp).

import { describe, it, expect } from 'vitest';
import {
    getContentSurchargePercent,
    calculateSingleStickerPrice,
    calculateSheetPrice,
    generateSinglePriceTable,
} from '../../src/modules/decal/engine/index.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/index.js';

const C = DECAL_DEFAULT_CONFIG;
const clone = (o) => JSON.parse(JSON.stringify(o));

describe('getContentSurchargePercent — tra bậc', () => {
    it('1 nội dung → 0%', () => {
        expect(getContentSurchargePercent(500, 1, C)).toBe(0);
    });

    it('0 hoặc thiếu số nội dung → 0%', () => {
        expect(getContentSurchargePercent(500, 0, C)).toBe(0);
        expect(getContentSurchargePercent(500, undefined, C)).toBe(0);
    });

    it('số lượng 0 → 0% (không chia cho 0)', () => {
        expect(getContentSurchargePercent(0, 5, C)).toBe(0);
    });

    it('500 nội dung / 500 con (mỗi nội dung 1 cái) → 20%, KHÔNG rơi vào bậc 26+', () => {
        expect(getContentSurchargePercent(500, 500, C)).toBe(20);
    });

    it('3 nội dung → khoảng trống 2-3 → 0%', () => {
        expect(getContentSurchargePercent(500, 3, C)).toBe(0);
        expect(getContentSurchargePercent(500, 2, C)).toBe(0);
    });

    it('5 nội dung → bậc 4-9 → 10%', () => {
        expect(getContentSurchargePercent(500, 5, C)).toBe(10);
    });

    it('15 nội dung → bậc 15-25 → 30%', () => {
        expect(getContentSurchargePercent(500, 15, C)).toBe(30);
    });

    it('30 nội dung → bậc cuối max: Infinity → 35%', () => {
        expect(getContentSurchargePercent(500, 30, C)).toBe(35);
    });

    it('biên bậc: 4 → 10%, 9 → 10%, 10 → 20%, 26 → 35%', () => {
        expect(getContentSurchargePercent(500, 4, C)).toBe(10);
        expect(getContentSurchargePercent(500, 9, C)).toBe(10);
        expect(getContentSurchargePercent(500, 10, C)).toBe(20);
        expect(getContentSurchargePercent(500, 26, C)).toBe(35);
    });

    it('config cũ KHÔNG có contentSurcharge → 0% (giá không đổi)', () => {
        const old = clone(C);
        delete old.contentSurcharge;
        expect(getContentSurchargePercent(500, 15, old)).toBe(0);
    });
});

describe('Tương thích ngược — không truyền contentCount thì giá y như cũ', () => {
    it('Case A: tem lẻ 50×90, 500 con, không cán = 448.000đ', () => {
        expect(calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, C)).toBe(448000);
    });

    it('Case G: tờ sticker 25 tờ in, 20 sticker/tờ, không cán = 486.000đ', () => {
        expect(calculateSheetPrice(100, 'Decal giấy', false, 4, 20, 330, 330, C)).toBe(486000);
    });

    it('config cũ thiếu contentSurcharge + có truyền contentCount → vẫn giá cũ', () => {
        const old = clone(C);
        delete old.contentSurcharge;
        expect(
            calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, old, '', 15)
        ).toBe(448000);
    });
});

describe('Phụ thu áp vào giá — tem lẻ', () => {
    it('5 nội dung / 500 con → 448.000 × 1,1 = 492.800đ', () => {
        const price = calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, C, '', 5);
        expect(price).toBeCloseTo(492800, 6);
    });

    it('5 nội dung / 5 con → ăn mức "mỗi nội dung 1 cái" 20%, không phải 10%', () => {
        const base = calculateSingleStickerPrice(5, 'Decal giấy', false, 15, 330, 330, C);
        const withContent = calculateSingleStickerPrice(
            5,
            'Decal giấy',
            false,
            15,
            330,
            330,
            C,
            '',
            5
        );
        expect(withContent).toBeCloseTo(base * 1.2, 6);
    });

    it('3 nội dung → khoảng trống → giá không đổi', () => {
        const base = calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, C);
        expect(calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, C, '', 3)).toBe(
            base
        );
    });
});

describe('Phụ thu áp vào giá — tờ sticker (chồng lên bế demi, không thay nó)', () => {
    it('5 nội dung → 486.000 × 1,1 = 534.600đ', () => {
        const price = calculateSheetPrice(100, 'Decal giấy', false, 4, 20, 330, 330, C, '', 5);
        expect(price).toBeCloseTo(534600, 6);
    });

    it('phụ thu nội dung nhân SAU phụ phí bế demi, không thay thế nó', () => {
        // 20 sticker/tờ → bế demi 20%. 15 nội dung → +30%.
        const demiOnly = calculateSheetPrice(100, 'Decal giấy', false, 4, 20, 330, 330, C);
        const both = calculateSheetPrice(100, 'Decal giấy', false, 4, 20, 330, 330, C, '', 15);
        expect(both).toBeCloseTo(demiOnly * 1.3, 6);
    });
});

describe('Bảng giá — phụ thu tính theo TỪNG dòng số lượng', () => {
    it('cùng 5 nội dung: dòng 100 con ăn bậc 4-9 (10%), dòng SL tùy chỉnh 5 con ăn 20%', () => {
        const rows = generateSinglePriceTable(15, 'Decal xi', 330, 330, C, 5, '', 5);
        const custom = rows.find((r) => r.isCustom);
        const qty100 = rows.find((r) => r.quantity === 100 && !r.isCustom);
        expect(custom.quantity).toBe(5);
        expect(custom.contentPercent).toBe(20);
        expect(qty100.contentPercent).toBe(10);
    });

    it('1 nội dung → contentPercent = 0 ở mọi dòng và giá khớp bảng cũ', () => {
        const withArg = generateSinglePriceTable(15, 'Decal xi', 330, 330, C, 0, '', 1);
        const withoutArg = generateSinglePriceTable(15, 'Decal xi', 330, 330, C, 0);
        expect(withArg.every((r) => r.contentPercent === 0)).toBe(true);
        expect(withArg.map((r) => r.price)).toEqual(withoutArg.map((r) => r.price));
    });
});
