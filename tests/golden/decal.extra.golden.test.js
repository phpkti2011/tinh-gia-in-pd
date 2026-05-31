// Golden tests BỔ SUNG — phủ các hàm public của decalCalculator
// mà decal.golden.test.js không cover:
//   - calculateSheetsPerPrintSheet (sticker sheet mode)
//   - calculateSheetPrice          (sticker sheet mode + demiCutSurcharge + multiplier ≠ 1)
//   - generateSinglePriceTable     (cấu trúc bảng giá lẻ)
//   - calculateStickersPerSheet shape='circle' (hexagonal layout)
//
// LỊCH SỬ:
//   - TASK-0003.5: tạo F, G, H, I.
//   - TASK-0006: cập nhật Case H (qua generateSinglePriceTable → calculateSingleStickerPrice).
//                F, G, I KHÔNG đổi (raw integer hoặc layout-only).

import { describe, it, expect } from 'vitest';
import {
    calculateStickersPerSheet,
    calculateSheetsPerPrintSheet,
    calculateSheetPrice,
    generateSinglePriceTable,
} from '../../src/utils/decalCalculator.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';

const config = DECAL_DEFAULT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// CASE F — calculateSheetsPerPrintSheet  [unchanged]
// sticker sheet A6 (100×145mm) trên print sheet 330×330mm
//   printable = 302×280
//   lv (100,145): cols=floor(304/102)=2, rows=floor(282/147)=1 → 2
//   lh (145,100): cols=floor(304/147)=2, rows=floor(282/102)=2 → 4
//   lh > lv → orientation 'horizontal', count = 4
// ─────────────────────────────────────────────────────────────────────────────
describe('Case F: layout sticker sheet A6 (100×145) trên print 330×330', () => {
    const r = calculateSheetsPerPrintSheet(100, 145, 330, 330, config);

    it('xếp được 4 sheet/print (xoay ngang)', () => {
        expect(r.count).toBe(4);
        expect(r.orientation).toBe('horizontal');
    });

    it('vùng in 302×280', () => {
        expect(r.printableW).toBe(302);
        expect(r.printableH).toBe(280);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE G — calculateSheetPrice  [unchanged TASK-0006: calculateSheetPrice CHƯA fix]
// 100 sticker sheet A6, 20 sticker/sheet, Decal giấy
//   numPrintSheets = ceil(100/4) = 25 (integer → không có fractional issue)
//   multiplier = (100×145) / (330×330) × 0.35
//   baseCost = progressive(25) = 405,000
//   surcharge = 20% (tier upTo=20)
//   noLam   = (405000 × multiplier + 0)      × 1.2
//   withLam = (405000 × multiplier + 25×500) × 1.2   ← lam vẫn ceil (chưa fix G)
//   diff = 25 × 500 × 1.2 = 15,000
// ─────────────────────────────────────────────────────────────────────────────
describe('Case G: calculateSheetPrice 100 sheet A6 với 20 sticker/sheet', () => {
    const noLam = calculateSheetPrice(100, 'Decal giấy', false, 4, 20, 100, 145, config);
    const withLam = calculateSheetPrice(100, 'Decal giấy', true, 4, 20, 100, 145, config);

    const expectedX = 405000 * (14500 / 108900) * 0.35;
    const expectedNoLam = expectedX * 1.2;
    const expectedWithLam = (expectedX + 25 * 500) * 1.2;

    it('giá không cán ≈ 22.648,76đ', () => {
        expect(noLam).toBeCloseTo(expectedNoLam, 6);
        expect(noLam).toBeCloseTo(22648.76, 1);
    });

    it('giá có cán ≈ 37.648,76đ', () => {
        expect(withLam).toBeCloseTo(expectedWithLam, 6);
        expect(withLam).toBeCloseTo(37648.76, 1);
    });

    it('chênh lam − no_lam = 15.000đ (25 tờ × 500đ × 1.2)', () => {
        expect(withLam - noLam).toBeCloseTo(15000, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE H — generateSinglePriceTable  [updated TASK-0006]
// stickersPerSheet=15, decalType='Decal giấy', sheet 330×330, customQty=0
//   80 rows (20 qty × 2 type × 2 lam)
//   row[0] = qty=100, 'Decal giấy', lam=true
//     raw = 100/15 = 6,666...
//     ceil = 7, frac = 1/3
//     progressive(7) = 240.000
//     tier@7 = tier 3 (upTo=10, price=20.000)
//     base = 240.000 + (1/3) × 20.000 = 246.666,67
//     decalExtra (Decal giấy) = 0
//     lam (raw) = 6,666... × 500 = 3.333,33
//     TOTAL = 250.000 (math exact, JS float ~249.999,99)
//   row[2] = qty=100, 'Decal nhựa', lam=true
//     base + lam giống row[0] = 250.000
//     decalExtra (Decal nhựa, ceil) = 7 × 1.200 = 8.400
//     TOTAL = 258.400
// ─────────────────────────────────────────────────────────────────────────────
describe('Case H: generateSinglePriceTable với 15 con/tờ', () => {
    const rows = generateSinglePriceTable(15, 'Decal giấy', 330, 330, config, 0);

    it('sinh đủ 80 dòng (20 qty × 2 type × 2 lam)', () => {
        expect(rows.length).toBe(80);
    });

    it('dòng đầu (Decal giấy, có cán) ≈ 250.000đ', () => {
        expect(rows[0].quantity).toBe(100);
        expect(rows[0].decalType).toBe('Decal giấy');
        expect(rows[0].laminated).toBe(true);
        expect(rows[0].price).toBeCloseTo(250000, 2);
    });

    it('customQuantity=0 → không sinh row isCustom', () => {
        expect(rows.every((r) => !r.isCustom)).toBe(true);
    });

    it('dòng thứ 3 (Decal nhựa, có cán) ≈ 258.400đ (+ 8.400 = 1.200 × ceil 7)', () => {
        // qty=100 cycle 4 rows: [giấy+lam, giấy+nolam, nhựa+lam, nhựa+nolam]
        expect(rows[2].decalType).toBe('Decal nhựa');
        expect(rows[2].laminated).toBe(true);
        // decalExtra Decal nhựa vẫn dùng ceil → diff 8.400 vẫn đúng
        expect(rows[2].price - rows[0].price).toBeCloseTo(8400, 6);
        expect(rows[2].price).toBeCloseTo(258400, 2);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE I — shape='circle' (hexagonal layout)  [unchanged]
// sticker tròn d=50mm trên print sheet 330×330mm, gap=2
//   lv (areaW=302, areaH=280): count=30, full_first
//   lh (areaW=280, areaH=302): count=27
//   lv > lh → orientation 'vertical', count 30
// ─────────────────────────────────────────────────────────────────────────────
describe('Case I: sticker tròn d=50mm trên print 330×330 (hexagonal)', () => {
    const r = calculateStickersPerSheet(50, 50, 330, 330, 'circle', config);

    it('30 con/tờ, hexagonal pattern full_first, vertical', () => {
        expect(r.count).toBe(30);
        expect(r.type).toBe('hexagonal');
        expect(r.pattern).toBe('full_first');
        expect(r.orientation).toBe('vertical');
    });

    it('cols_full=5, cols_staggered=5, rows=6', () => {
        expect(r.cols_full).toBe(5);
        expect(r.cols_staggered).toBe(5);
        expect(r.rows).toBe(6);
    });

    it('itemW = itemH = đường kính 50', () => {
        expect(r.itemW).toBe(50);
        expect(r.itemH).toBe(50);
    });
});
