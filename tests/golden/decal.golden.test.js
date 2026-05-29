// Golden tests cho module decal — KHOÁ kết quả tính giá hiện tại.
//
// LỊCH SỬ:
//   - TASK-0003: tạo Cases A–E (khoá behavior current).
//   - TASK-0006: cập nhật A, B, C, D theo Excel reference (Formula A).
//                Case E giữ nguyên (raw integer → fractional adjustment = 0).
//                Case C ĐÃ KHỚP Excel target 7.810.450đ.
//
// Formula A (TASK-0006, áp cho calculateSingleStickerPrice):
//   rawSheets   = quantity / stickersPerSheet
//   ceilSheets  = Math.ceil(rawSheets)
//   base        = progressive(ceilSheets) + (ceilSheets − rawSheets) × priceOfTierContaining(ceilSheets)
//   lam         = laminationCost × rawSheets       (raw, không ceil)
//   decalExtra  = decalCost × ceilSheets           (vẫn ceil — chờ Excel ref cho Decal nhựa)

import { describe, it, expect } from 'vitest';
import {
    calculateStickersPerSheet,
    calculateSingleStickerPrice,
} from '../../src/utils/decalCalculator.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';

const config = DECAL_DEFAULT_CONFIG;

// ---------------------------------------------------------------------------
// CASE A — đơn nhỏ, không cán màng  [updated TASK-0006]
// Input: tem 50×90mm, decal giấy, 500 cái, print sheet 330×330mm
// Layout: count=15 (5×3, vertical)  — KHÔNG đổi
// Pricing (Formula A):
//   rawSheets = 500/15 = 33,333...
//   ceil = 34, frac = 0,667
//   progressive(34) = 448.000
//   tier@34 = tier 6 (upTo=40, price=4.500)
//   base = 448.000 + 0,667 × 4.500 ≈ 451.000
//   decalExtra = 0 (Decal giấy)
//   lam = 0 (no lam)
//   TOTAL ≈ 451.000
// ---------------------------------------------------------------------------
describe('Case A: tem 50×90mm, 500 cái, Decal giấy, KHÔNG cán màng', () => {
    const stickerW = 50, stickerH = 90;
    const printSheetW = 330, printSheetH = 330;
    const quantity = 500;
    const decalType = 'Decal giấy';

    const layout = calculateStickersPerSheet(
        stickerW, stickerH, printSheetW, printSheetH, 'rectangle', config
    );
    const total = calculateSingleStickerPrice(
        quantity, decalType, false, layout.count, printSheetW, printSheetH, config
    );
    const sheetCount = Math.ceil(quantity / layout.count);
    const unitPrice = total / quantity;

    it('số con/tờ = 15 (5 cột × 3 hàng, vertical)', () => {
        expect(layout.count).toBe(15);
        expect(layout.cols).toBe(5);
        expect(layout.rows).toBe(3);
        expect(layout.orientation).toBe('vertical');
        expect(layout.type).toBe('grid');
    });

    it('vùng in = 302×280mm', () => {
        expect(layout.printableW).toBe(302);
        expect(layout.printableH).toBe(280);
    });

    it('số tờ in hiển thị (suy ra) = 34', () => {
        expect(sheetCount).toBe(34);
    });

    it('tổng tiền ≈ 451.000đ (TASK-0006 Formula A: 448k + 0,667×4500)', () => {
        expect(total).toBeCloseTo(451000, 2);
    });

    it('đơn giá (suy ra) ≈ 902đ/con', () => {
        expect(unitPrice).toBeCloseTo(902, 2);
    });
});

// ---------------------------------------------------------------------------
// CASE B — cùng input như A nhưng CÓ cán màng  [updated TASK-0006]
// base = 451.000 (như A)
// lam (raw) = 500/15 × 500 = 16.666,67
// TOTAL ≈ 467.667
// ---------------------------------------------------------------------------
describe('Case B: tem 50×90mm, 500 cái, Decal giấy, CÓ cán màng', () => {
    const stickerW = 50, stickerH = 90;
    const printSheetW = 330, printSheetH = 330;
    const quantity = 500;
    const decalType = 'Decal giấy';

    const layout = calculateStickersPerSheet(
        stickerW, stickerH, printSheetW, printSheetH, 'rectangle', config
    );
    const priceNoLam = calculateSingleStickerPrice(
        quantity, decalType, false, layout.count, printSheetW, printSheetH, config
    );
    const priceLam = calculateSingleStickerPrice(
        quantity, decalType, true,  layout.count, printSheetW, printSheetH, config
    );

    it('tổng tiền có cán ≈ 467.666,67đ', () => {
        expect(priceLam).toBeCloseTo(467666.67, 2);
    });

    it('phí cán màng ≈ 16.666,67đ (= raw 33,333 × 500đ, KHÔNG ceil)', () => {
        expect(priceLam - priceNoLam).toBeCloseTo((quantity / layout.count) * config.laminationCost, 6);
        expect(priceLam - priceNoLam).toBeCloseTo(16666.67, 2);
    });

    it('đơn giá có cán ≈ 935,33đ/con', () => {
        expect(priceLam / quantity).toBeCloseTo(935.33, 2);
    });
});

// ---------------------------------------------------------------------------
// CASE C — đơn lớn (Excel reference target)  [updated TASK-0006]
// Input: tem 100×70mm, decal giấy, 19.500 cái, có cán, print 330×330
// Layout: count=8 (4×2 horizontal)
// Pricing (Formula A):
//   raw = 19500/8 = 2.437,5
//   ceil = 2.438, frac = 0,5
//   progressive(2438) = 6.590.600
//   tier@2438 = tier 18 (upTo=Infinity, price=2.200)
//   base = 6.590.600 + 0,5 × 2.200 = 6.591.700  ✓ Excel
//   lam (raw) = 2.437,5 × 500 = 1.218.750  ✓ Excel
//   TOTAL = 7.810.450  ✓ Excel
//   đơn giá round = 401  ✓ Excel
// ---------------------------------------------------------------------------
describe('Case C [Excel reference]: tem 100×70mm, 19.500 cái, có cán 500đ/tờ', () => {
    const stickerW = 100, stickerH = 70;
    const printSheetW = 330, printSheetH = 330;
    const quantity = 19500;
    const decalType = 'Decal giấy';

    const layout = calculateStickersPerSheet(
        stickerW, stickerH, printSheetW, printSheetH, 'rectangle', config
    );

    it('số con/tờ = 8 (4×2, tem xoay ngang)', () => {
        expect(layout.count).toBe(8);
        expect(layout.cols).toBe(4);
        expect(layout.rows).toBe(2);
        expect(layout.orientation).toBe('horizontal');
        expect(layout.itemW).toBe(70);
        expect(layout.itemH).toBe(100);
    });

    const sheetCount = Math.ceil(quantity / layout.count);
    const priceNoLam = calculateSingleStickerPrice(
        quantity, decalType, false, layout.count, printSheetW, printSheetH, config
    );
    const priceLam = calculateSingleStickerPrice(
        quantity, decalType, true,  layout.count, printSheetW, printSheetH, config
    );

    it('số tờ in hiển thị = ceil(19500/8) = 2.438', () => {
        expect(sheetCount).toBe(2438);
    });

    it('thành tiền cơ bản = 6.591.700đ (Excel exact)', () => {
        expect(priceNoLam).toBe(6591700);
    });

    it('phí cán màng = 1.218.750đ (= raw 2.437,5 × 500đ)', () => {
        expect(priceLam - priceNoLam).toBe(1218750);
        expect(priceLam - priceNoLam).toBe((quantity / layout.count) * config.laminationCost);
    });

    it('tổng tiền (có cán) = 7.810.450đ (Excel exact)', () => {
        expect(priceLam).toBe(7810450);
    });

    it('đơn giá round = 401đ/con (Excel)', () => {
        expect(Math.round(priceLam / quantity)).toBe(401);
        // 7.810.450 / 19.500 = 400,5358... → round = 401
        expect(priceLam / quantity).toBeCloseTo(400.5359, 3);
    });
});

// ---------------------------------------------------------------------------
// CASE D — cross-check decalCost (Decal nhựa)  [updated TASK-0006]
// Base Decal giấy ≈ 451.000 (như Case A)
// decalExtra Decal nhựa = 1200 × ceil(34) = 40.800  (VẪN CEIL — chờ Excel ref)
// → diff nhựa − giấy = 40.800 (không đổi)
// → Decal nhựa ≈ 491.800
// ---------------------------------------------------------------------------
describe('Case D: cross-check phụ thu loại decal (Decal nhựa vs Decal giấy)', () => {
    const stickerW = 50, stickerH = 90;
    const printSheetW = 330, printSheetH = 330;
    const quantity = 500;

    const layout = calculateStickersPerSheet(
        stickerW, stickerH, printSheetW, printSheetH, 'rectangle', config
    );
    const priceGiay = calculateSingleStickerPrice(
        quantity, 'Decal giấy', false, layout.count, printSheetW, printSheetH, config
    );
    const priceNhua = calculateSingleStickerPrice(
        quantity, 'Decal nhựa', false, layout.count, printSheetW, printSheetH, config
    );

    it('chênh nhựa − giấy = 40.800đ (1200đ/tờ × ceil 34 tờ — decalExtra vẫn dùng ceil)', () => {
        expect(priceNhua - priceGiay).toBe(40800);
        expect(priceNhua - priceGiay).toBe(34 * config.decalCosts['Decal nhựa']);
    });

    it('Decal giấy ≈ 451.000đ', () => {
        expect(priceGiay).toBeCloseTo(451000, 2);
    });

    it('Decal nhựa ≈ 491.800đ', () => {
        expect(priceNhua).toBeCloseTo(491800, 2);
    });
});

// ---------------------------------------------------------------------------
// CASE E — khoá ranh giới progressiveTiers (1, 2, 11 tờ)
// [unchanged TASK-0006]: quantity = stickersPerSheet × N → raw integer →
// fractional adjustment = 0 → kết quả identical với formula cũ.
//   1 tờ  → 100.000          (tier 1)
//   2 tờ  → 140.000          (tier 1+2)
//  11 tờ  → 308.000          (tier 1+2+3+4)
// ---------------------------------------------------------------------------
describe('Case E: ranh giới progressiveTiers (1, 2, 11 tờ in) — không bị ảnh hưởng TASK-0006', () => {
    const decalType = 'Decal giấy';
    const W = 330, H = 330; // multiplier = 1

    it('1 tờ in = 100.000đ', () => {
        const p = calculateSingleStickerPrice(1, decalType, false, 1, W, H, config);
        expect(p).toBe(100000);
    });

    it('2 tờ in = 140.000đ', () => {
        const p = calculateSingleStickerPrice(2, decalType, false, 1, W, H, config);
        expect(p).toBe(140000);
    });

    it('11 tờ in = 308.000đ (= 100k + 40k + 8×20k + 1×8k)', () => {
        const p = calculateSingleStickerPrice(11, decalType, false, 1, W, H, config);
        expect(p).toBe(308000);
    });
});
