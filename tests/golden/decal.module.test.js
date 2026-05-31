// Smoke test cho module path mới sau TASK-0004 (extract decal engine).
//
// LỊCH SỬ:
//   - TASK-0004: tạo 5 assertion verify module + shim.
//   - TASK-0006: cập nhật 2 assertion behavior (Case A: 448k→451k; Case C: 7.809.600→7.810.450).
//
// Mục tiêu:
//   1. Verify import trực tiếp từ src/modules/decal/engine/ hoạt động.
//   2. Verify compatibility shim cũ (src/utils/decalCalculator.js) re-export
//      đúng reference (same function identity).
//   3. Verify behavior identical giữa 2 path (chốt: cùng số output).

import { describe, it, expect } from 'vitest';
import * as newPath from '../../src/modules/decal/engine/index.js';
import * as oldPath from '../../src/utils/decalCalculator.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/index.js';

describe('TASK-0004: module path mới + compatibility shim', () => {
    it('module path mới export đủ 6 hàm public', () => {
        expect(typeof newPath.calculateStickersPerSheet).toBe('function');
        expect(typeof newPath.calculateSheetsPerPrintSheet).toBe('function');
        expect(typeof newPath.calculateSingleStickerPrice).toBe('function');
        expect(typeof newPath.calculateSheetPrice).toBe('function');
        expect(typeof newPath.generateSinglePriceTable).toBe('function');
        expect(typeof newPath.generateSheetPriceTable).toBe('function');
    });

    it('compat shim cũ re-export cùng reference (same function identity)', () => {
        expect(oldPath.calculateStickersPerSheet).toBe(newPath.calculateStickersPerSheet);
        expect(oldPath.calculateSheetsPerPrintSheet).toBe(newPath.calculateSheetsPerPrintSheet);
        expect(oldPath.calculateSingleStickerPrice).toBe(newPath.calculateSingleStickerPrice);
        expect(oldPath.calculateSheetPrice).toBe(newPath.calculateSheetPrice);
        expect(oldPath.generateSinglePriceTable).toBe(newPath.generateSinglePriceTable);
        expect(oldPath.generateSheetPriceTable).toBe(newPath.generateSheetPriceTable);
    });

    it('module config index re-export DECAL_DEFAULT_CONFIG', () => {
        expect(DECAL_DEFAULT_CONFIG).toBeDefined();
        expect(DECAL_DEFAULT_CONFIG.basePrintWidth).toBe(330);
        expect(DECAL_DEFAULT_CONFIG.laminationCost).toBe(500);
        expect(Array.isArray(DECAL_DEFAULT_CONFIG.progressiveTiers)).toBe(true);
    });

    it('[TASK-0006] behavior identical: Case A qua module mới ≈ 451.000đ (Formula A)', () => {
        const args = [500, 'Decal giấy', false, 15, 330, 330, DECAL_DEFAULT_CONFIG];
        const fromNew = newPath.calculateSingleStickerPrice(...args);
        const fromOld = oldPath.calculateSingleStickerPrice(...args);
        expect(fromNew).toBe(fromOld);
        // Cũng đảm bảo giá trị ≈ baseline mới sau TASK-0006
        expect(fromNew).toBeCloseTo(451000, 2);
    });

    it('[TASK-0006] behavior identical: Case C (19.500 tem) qua module mới = 7.810.450đ (Excel)', () => {
        const layout = newPath.calculateStickersPerSheet(
            100,
            70,
            330,
            330,
            'rectangle',
            DECAL_DEFAULT_CONFIG
        );
        const price = newPath.calculateSingleStickerPrice(
            19500,
            'Decal giấy',
            true,
            layout.count,
            330,
            330,
            DECAL_DEFAULT_CONFIG
        );
        expect(layout.count).toBe(8);
        expect(price).toBe(7810450); // Excel target — exact match
    });
});
