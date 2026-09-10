// REFERENCE TESTS — case lớn cho calculateSingleStickerPrice.
//
// LỊCH SỬ:
//   - TASK-0003.5: tạo dưới dạng describe.skip (target Excel).
//   - TASK-0006: UN-SKIP theo Formula A (tờ lẻ) — khớp Excel 7.810.450đ.
//   - TASK-DECAL-WHOLESHEET: revert về NGUYÊN TỜ (như 4.0.0) → cập nhật lại kỳ vọng.
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
// NGUYÊN TỜ + XẾP HỖN HỢP: tem 100×70mm × 19.500 cái, Decal giấy, cán 500đ/tờ
// Target:
//   - 10 con/tờ (xếp hỗn hợp); 1.950 tờ
//   - base = 5.517.000đ  (progressive(1950))
//   - lam  = 975.000đ  (= ceil 1.950 × 500)
//   - tổng = 6.492.000đ
//   - đơn giá round = 333đ
// ─────────────────────────────────────────────────────────────────────────────
describe('[nguyên tờ + hỗn hợp] tem 100×70mm × 19.500 cái có cán màng', () => {
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

    it('số con/tờ = 10 (xếp hỗn hợp)', () => {
        expect(layout.count).toBe(10);
    });

    it('số tờ in = 1.950', () => {
        expect(sheetCount).toBe(1950);
    });

    it('thành tiền cơ bản = 5.517.000đ (nguyên tờ)', () => {
        expect(priceNoLam).toBe(5517000);
    });

    it('phụ phí cán màng = 975.000đ (= ceil 1.950 × 500)', () => {
        expect(priceLam - priceNoLam).toBe(975000);
    });

    it('tổng tiền = 6.492.000đ', () => {
        expect(priceLam).toBe(6492000);
    });

    it('đơn giá round = 333đ', () => {
        expect(Math.round(priceLam / quantity)).toBe(333);
    });
});
