// Smoke test cho module path mới sau TASK-0016 (extract large-print engine).
//
// Mục tiêu:
//   1. Module path mới export đúng 1 function calculateLargePrint.
//   2. Compat shim cũ (src/utils/largePrintCalculator.js) re-export đúng
//      reference (same function identity).
//   3. Behavior identical: spot-check 2-3 case golden qua cả 2 path.

import { describe, it, expect } from 'vitest';
import * as newPath from '../../src/modules/large-print/engine/index.js';
import * as oldPath from '../../src/utils/largePrintCalculator.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/config/largePrintConfig.js';

describe('TASK-0016: large-print module path + compat shim', () => {
    it('module path mới export calculateLargePrint', () => {
        expect(typeof newPath.calculateLargePrint).toBe('function');
    });

    it('compat shim cũ re-export cùng reference (same function identity)', () => {
        expect(oldPath.calculateLargePrint).toBe(newPath.calculateLargePrint);
    });

    it('behavior identical: Case A (PP 100×100cm) → 121.750đ qua cả 2 path', () => {
        const params = {
            width: 100, height: 100, quantity: 1,
            materialTypeKey: 'pp_co_keo', laminationTypeKey: 'none', formexTypeKey: 'none',
            edgeTaping: false, grommetsCheck: false, grommetsCount: 0, dieCutting: false,
            standeeKey: 'none',
        };
        const fromNew = newPath.calculateLargePrint(params, LARGE_PRINT_DEFAULT_CONFIG);
        const fromOld = oldPath.calculateLargePrint(params, LARGE_PRINT_DEFAULT_CONFIG);
        expect(fromNew).toEqual(fromOld);
        expect(fromNew.totalCost).toBeCloseTo(121750, 0);
        expect(fromNew.rollWidth).toBe(1.07);
    });

    it('behavior identical: Case C (PP 150×400 + formex) → 1.424.000đ qua module mới', () => {
        const params = {
            width: 150, height: 400, quantity: 1,
            materialTypeKey: 'pp_co_keo', laminationTypeKey: 'none', formexTypeKey: 'formex_5mm',
            edgeTaping: false, grommetsCheck: false, grommetsCount: 0, dieCutting: false,
            standeeKey: 'none',
        };
        const r = newPath.calculateLargePrint(params, LARGE_PRINT_DEFAULT_CONFIG);
        expect(r.totalCost).toBeCloseTo(1424000, 0);
        expect(r.formexCost).toBeCloseTo(702000, 0);
    });

    it('null cases: invalid input vẫn return null qua module mới', () => {
        const invalidMaterial = {
            width: 100, height: 100, quantity: 1,
            materialTypeKey: 'unknown', laminationTypeKey: 'none', formexTypeKey: 'none',
            standeeKey: 'none',
        };
        expect(newPath.calculateLargePrint(invalidMaterial, LARGE_PRINT_DEFAULT_CONFIG)).toBeNull();

        const tooLarge = {
            width: 400, height: 400, quantity: 1,
            materialTypeKey: 'pp_co_keo', laminationTypeKey: 'none', formexTypeKey: 'none',
            standeeKey: 'none',
        };
        expect(newPath.calculateLargePrint(tooLarge, LARGE_PRINT_DEFAULT_CONFIG)).toBeNull();
    });
});
