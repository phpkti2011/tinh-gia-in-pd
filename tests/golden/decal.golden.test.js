// Golden tests cho module decal — KHOÁ kết quả tính giá hiện tại.
//
// LỊCH SỬ:
//   - TASK-0003: tạo Cases A–E (khoá behavior current).
//   - TASK-0006: A, B, C, D theo Excel reference (Formula A, tờ lẻ).
//   - TASK-DECAL-WHOLESHEET: REVERT Formula A → tính NGUYÊN TỜ (ceil) toàn bộ,
//                giống plugin 4.0.0. Đã cập nhật lại kỳ vọng A, B, C, D.
//
// Công thức hiện tại (calculateSingleStickerPrice):
//   sheets   = Math.ceil(quantity / stickersPerSheet)          // NGUYÊN TỜ
//   print    = progressive(sheets)
//   material = decalCost × sheets
//   lam      = laminationCost × sheets                         // cũng ceil
//   total    = (print + material + lam) × (1 + percent/100)    // percent theo khổ giấy (gốc = 0%)

import { describe, it, expect } from 'vitest';
import {
    calculateStickersPerSheet,
    calculateSingleStickerPrice,
} from '../../src/utils/decalCalculator.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';

const config = DECAL_DEFAULT_CONFIG;

// ---------------------------------------------------------------------------
// CASE A — đơn nhỏ, không cán màng  [WHOLESHEET]
// Input: tem 50×90mm, decal giấy, 500 cái, print sheet 330×330mm (gốc, 0%)
// Layout: count=15 (5×3, vertical)  — KHÔNG đổi
// Pricing (nguyên tờ):
//   sheets = ceil(500/15) = 34
//   progressive(34) = 448.000
//   material = 0 (Decal giấy), lam = 0 (no lam), percent = 0
//   TOTAL = 448.000
// ---------------------------------------------------------------------------
describe('Case A: tem 50×90mm, 500 cái, Decal giấy, KHÔNG cán màng', () => {
    const stickerW = 50,
        stickerH = 90;
    const printSheetW = 330,
        printSheetH = 330;
    const quantity = 500;
    const decalType = 'Decal giấy';

    const layout = calculateStickersPerSheet(
        stickerW,
        stickerH,
        printSheetW,
        printSheetH,
        'rectangle',
        config
    );
    const total = calculateSingleStickerPrice(
        quantity,
        decalType,
        false,
        layout.count,
        printSheetW,
        printSheetH,
        config
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

    it('tổng tiền = 448.000đ (nguyên tờ: progressive(34))', () => {
        expect(total).toBe(448000);
    });

    it('đơn giá (suy ra) = 896đ/con', () => {
        expect(unitPrice).toBeCloseTo(896, 2);
    });
});

// ---------------------------------------------------------------------------
// CASE B — cùng input như A nhưng CÓ cán màng  [WHOLESHEET]
// base = 448.000 (như A)
// lam (nguyên tờ) = ceil(34) × 500 = 17.000
// TOTAL = 465.000
// ---------------------------------------------------------------------------
describe('Case B: tem 50×90mm, 500 cái, Decal giấy, CÓ cán màng', () => {
    const stickerW = 50,
        stickerH = 90;
    const printSheetW = 330,
        printSheetH = 330;
    const quantity = 500;
    const decalType = 'Decal giấy';

    const layout = calculateStickersPerSheet(
        stickerW,
        stickerH,
        printSheetW,
        printSheetH,
        'rectangle',
        config
    );
    const priceNoLam = calculateSingleStickerPrice(
        quantity,
        decalType,
        false,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );
    const priceLam = calculateSingleStickerPrice(
        quantity,
        decalType,
        true,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );

    it('tổng tiền có cán = 465.000đ', () => {
        expect(priceLam).toBe(465000);
    });

    it('phí cán màng = 17.000đ (= ceil 34 tờ × 500đ)', () => {
        expect(priceLam - priceNoLam).toBe(
            Math.ceil(quantity / layout.count) * config.laminationCost
        );
        expect(priceLam - priceNoLam).toBe(17000);
    });

    it('đơn giá có cán = 930đ/con', () => {
        expect(priceLam / quantity).toBeCloseTo(930, 2);
    });
});

// ---------------------------------------------------------------------------
// CASE C — đơn lớn  [WHOLESHEET + xếp HỖN HỢP]
// Input: tem 100×70mm, decal giấy, 19.500 cái, có cán, print 330×330 (gốc, 0%)
// Layout: xếp hỗn hợp → count=10 (khối chính 4×2 xoay ngang + 2 con ở dải đáy)
// Pricing (nguyên tờ):
//   sheets = ceil(19500/10) = 1.950
//   base   = progressive(1950) = 5.517.000
//   lam    = 1.950 × 500 = 975.000
//   TOTAL  = 6.492.000
//   đơn giá round = 333  (6.492.000 / 19.500 = 332,92)
// ---------------------------------------------------------------------------
describe('Case C: tem 100×70mm, 19.500 cái, có cán 500đ/tờ', () => {
    const stickerW = 100,
        stickerH = 70;
    const printSheetW = 330,
        printSheetH = 330;
    const quantity = 19500;
    const decalType = 'Decal giấy';

    const layout = calculateStickersPerSheet(
        stickerW,
        stickerH,
        printSheetW,
        printSheetH,
        'rectangle',
        config
    );

    it('số con/tờ = 10 (xếp hỗn hợp: 4×2 + 2 con dải đáy)', () => {
        expect(layout.count).toBe(10);
        expect(layout.type).toBe('packed');
        expect(layout.blocks.length).toBeGreaterThan(1);
    });

    const sheetCount = Math.ceil(quantity / layout.count);
    const priceNoLam = calculateSingleStickerPrice(
        quantity,
        decalType,
        false,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );
    const priceLam = calculateSingleStickerPrice(
        quantity,
        decalType,
        true,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );

    it('số tờ in hiển thị = ceil(19500/10) = 1.950', () => {
        expect(sheetCount).toBe(1950);
    });

    it('thành tiền cơ bản = 5.517.000đ (nguyên tờ)', () => {
        expect(priceNoLam).toBe(5517000);
    });

    it('phí cán màng = 975.000đ (= ceil 1.950 tờ × 500đ)', () => {
        expect(priceLam - priceNoLam).toBe(975000);
        expect(priceLam - priceNoLam).toBe(
            Math.ceil(quantity / layout.count) * config.laminationCost
        );
    });

    it('tổng tiền (có cán) = 6.492.000đ', () => {
        expect(priceLam).toBe(6492000);
    });

    it('đơn giá round = 333đ/con', () => {
        expect(Math.round(priceLam / quantity)).toBe(333);
        // 6.492.000 / 19.500 = 332,92... → round = 333
        expect(priceLam / quantity).toBeCloseTo(332.92, 2);
    });
});

// ---------------------------------------------------------------------------
// CASE D — cross-check decalCost (Decal nhựa)  [WHOLESHEET]
// Base Decal giấy = 448.000 (như Case A)
// material Decal nhựa = 1200 × ceil(34) = 40.800
// → diff nhựa − giấy = 40.800
// → Decal nhựa = 488.800
// ---------------------------------------------------------------------------
describe('Case D: cross-check phụ thu loại decal (Decal nhựa vs Decal giấy)', () => {
    const stickerW = 50,
        stickerH = 90;
    const printSheetW = 330,
        printSheetH = 330;
    const quantity = 500;

    const layout = calculateStickersPerSheet(
        stickerW,
        stickerH,
        printSheetW,
        printSheetH,
        'rectangle',
        config
    );
    const priceGiay = calculateSingleStickerPrice(
        quantity,
        'Decal giấy',
        false,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );
    const priceNhua = calculateSingleStickerPrice(
        quantity,
        'Decal nhựa',
        false,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );

    it('chênh nhựa − giấy = 40.800đ (1200đ/tờ × ceil 34 tờ — decalExtra vẫn dùng ceil)', () => {
        expect(priceNhua - priceGiay).toBe(40800);
        expect(priceNhua - priceGiay).toBe(34 * config.decalCosts['Decal nhựa']);
    });

    it('Decal giấy = 448.000đ', () => {
        expect(priceGiay).toBe(448000);
    });

    it('Decal nhựa = 488.800đ', () => {
        expect(priceNhua).toBe(488800);
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
    const W = 330,
        H = 330; // multiplier = 1

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
