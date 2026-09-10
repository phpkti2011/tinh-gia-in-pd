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
// CASE G — calculateSheetPrice  [WHOLESHEET]
// 100 sticker sheet A6, 20 sticker/sheet, Decal giấy
//   numPrintSheets = ceil(100/4) = 25
//   baseCost = progressive(25) = 405.000
//   percent = 0 (khổ không khớp → 0%), surcharge demi = 20% (tier upTo=20)
//   noLam   = (405.000 + 0)        × 1.2 = 486.000
//   withLam = (405.000 + 25×500)   × 1.2 = 501.000
//   diff = 25 × 500 × 1.2 = 15.000
// ─────────────────────────────────────────────────────────────────────────────
describe('Case G: calculateSheetPrice 100 sheet A6 với 20 sticker/sheet', () => {
    const noLam = calculateSheetPrice(100, 'Decal giấy', false, 4, 20, 100, 145, config);
    const withLam = calculateSheetPrice(100, 'Decal giấy', true, 4, 20, 100, 145, config);

    it('giá không cán = 486.000đ (progressive(25) × 1.2 demi)', () => {
        expect(noLam).toBe(486000);
    });

    it('giá có cán = 501.000đ', () => {
        expect(withLam).toBe(501000);
    });

    it('chênh lam − no_lam = 15.000đ (25 tờ × 500đ × 1.2)', () => {
        expect(withLam - noLam).toBeCloseTo(15000, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE H — generateSinglePriceTable  [WHOLESHEET]
// stickersPerSheet=15, decalType='Decal giấy', sheet 330×330 (gốc, 0%), customQty=0
//   80 rows (20 qty × 2 type × 2 lam)
//   row[0] = qty=100, 'Decal giấy', lam=true
//     sheets = ceil(100/15) = 7
//     progressive(7) = 240.000
//     material (Decal giấy) = 0
//     lam = 7 × 500 = 3.500
//     TOTAL = 243.500
//   row[2] = qty=100, 'Decal nhựa', lam=true
//     base + lam giống row[0] = 243.500
//     material (Decal nhựa) = 7 × 1.200 = 8.400
//     TOTAL = 251.900
// ─────────────────────────────────────────────────────────────────────────────
describe('Case H: generateSinglePriceTable với 15 con/tờ', () => {
    const rows = generateSinglePriceTable(15, 'Decal giấy', 330, 330, config, 0);

    it('sinh đủ 80 dòng (20 qty × 2 type × 2 lam)', () => {
        expect(rows.length).toBe(80);
    });

    it('dòng đầu (Decal giấy, có cán) = 243.500đ', () => {
        expect(rows[0].quantity).toBe(100);
        expect(rows[0].decalType).toBe('Decal giấy');
        expect(rows[0].laminated).toBe(true);
        expect(rows[0].price).toBe(243500);
    });

    it('customQuantity=0 → không sinh row isCustom', () => {
        expect(rows.every((r) => !r.isCustom)).toBe(true);
    });

    it('dòng thứ 3 (Decal nhựa, có cán) = 251.900đ (+ 8.400 = 1.200 × ceil 7)', () => {
        // qty=100 cycle 4 rows: [giấy+lam, giấy+nolam, nhựa+lam, nhựa+nolam]
        expect(rows[2].decalType).toBe('Decal nhựa');
        expect(rows[2].laminated).toBe(true);
        expect(rows[2].price - rows[0].price).toBeCloseTo(8400, 6);
        expect(rows[2].price).toBe(251900);
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
