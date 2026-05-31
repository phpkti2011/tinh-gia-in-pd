// REFERENCE TESTS — Excel target cho calculateSingleStickerPrice.
//
// LỊCH SỬ:
//   - TASK-0003.5: tạo dưới dạng describe.skip (target Excel, current code chưa khớp).
//   - TASK-0006: UN-SKIP — sau khi áp Formula A vào pricing.js, các assertion
//                target dưới đây ĐÃ PASS với engine hiện tại.
//
// File này giữ lại để document case Excel reference cho Case C, tách rời với
// decal.golden.test.js (vốn cover thêm A, B, D, E). Cả 2 cùng pass.
//
// Chi tiết phân tích: docs/pricing-rules/decal-reference-cases.md

import { describe, it, expect } from 'vitest';
import {
    calculateStickersPerSheet,
    calculateSingleStickerPrice,
} from '../../src/utils/decalCalculator.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';

const config = DECAL_DEFAULT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL REFERENCE: tem 100×70mm × 19.500 cái, Decal giấy, cán 500đ/tờ
// Target:
//   - 8 con/tờ; 2.438 tờ
//   - base = 6.591.700đ  (Formula A: progressive(2438) + 0,5 × 2.200)
//   - lam  = 1.218.750đ  (= raw 2.437,5 × 500)
//   - tổng = 7.810.450đ
//   - đơn giá round = 401đ
// ─────────────────────────────────────────────────────────────────────────────
describe('[Excel reference] tem 100×70mm × 19.500 cái có cán màng — TASK-0006 đã align', () => {
    const stickerW = 100,
        stickerH = 70;
    const printSheetW = 330,
        printSheetH = 330;
    const quantity = 19500;

    const layout = calculateStickersPerSheet(
        stickerW,
        stickerH,
        printSheetW,
        printSheetH,
        'rectangle',
        config
    );
    const sheetCount = Math.ceil(quantity / layout.count);

    const priceNoLam = calculateSingleStickerPrice(
        quantity,
        'Decal giấy',
        false,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );
    const priceLam = calculateSingleStickerPrice(
        quantity,
        'Decal giấy',
        true,
        layout.count,
        printSheetW,
        printSheetH,
        config
    );

    it('số con/tờ = 8', () => {
        expect(layout.count).toBe(8);
    });

    it('số tờ in = 2.438', () => {
        expect(sheetCount).toBe(2438);
    });

    it('thành tiền cơ bản = 6.591.700đ (Excel)', () => {
        expect(priceNoLam).toBe(6591700);
    });

    it('phụ phí cán màng = 1.218.750đ (Excel — raw 2.437,5 × 500)', () => {
        expect(priceLam - priceNoLam).toBe(1218750);
    });

    it('tổng tiền = 7.810.450đ (Excel)', () => {
        expect(priceLam).toBe(7810450);
    });

    it('đơn giá round = 401đ (Excel)', () => {
        expect(Math.round(priceLam / quantity)).toBe(401);
    });
});
