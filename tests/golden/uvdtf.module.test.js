// Smoke test cho module path mới sau TASK-0012 (extract UV DTF engine).
//
// Mục tiêu:
//   1. Module path mới export đúng 1 function calculateUvDtf.
//   2. Compat shim cũ (src/utils/uvdtfCalculator.js) re-export đúng reference
//      (same function identity — đảm bảo không có wrapper/proxy).
//   3. Behavior identical: spot-check 2 case golden qua cả 2 path.

import { describe, it, expect } from 'vitest';
import * as newPath from '../../src/modules/uvdtf/engine/index.js';
import * as oldPath from '../../src/utils/uvdtfCalculator.js';
import { UVDTF_DEFAULT_CONFIG } from '../../src/config/uvdtfConfig.js';

describe('TASK-0012: uvdtf module path + compat shim', () => {
    it('module path mới export calculateUvDtf', () => {
        expect(typeof newPath.calculateUvDtf).toBe('function');
    });

    it('compat shim cũ re-export cùng reference (same function identity)', () => {
        expect(oldPath.calculateUvDtf).toBe(newPath.calculateUvDtf);
    });

    it('behavior identical: Case A (50×90 × 10) → 440k qua cả 2 path', () => {
        const args = [{ widthMM: 50, heightMM: 90, quantity: 10 }, UVDTF_DEFAULT_CONFIG];
        const fromNew = newPath.calculateUvDtf(...args);
        const fromOld = oldPath.calculateUvDtf(...args);
        expect(fromNew).toEqual(fromOld);
        expect(fromNew.totalPrice).toBe(440000);
        expect(fromNew.rotated).toBe(true);
    });

    it('behavior identical: Case C (50×90 × 1000) → ≈2.947.840đ qua module mới', () => {
        const r = newPath.calculateUvDtf(
            { widthMM: 50, heightMM: 90, quantity: 1000 },
            UVDTF_DEFAULT_CONFIG
        );
        expect(r.rotated).toBe(false);
        expect(r.pricePerMeter).toBe(280000);
        expect(r.totalPrice).toBeCloseTo(2947840, 0);
    });

    it('null cases: invalid input vẫn return null qua module mới', () => {
        expect(newPath.calculateUvDtf({ widthMM: 0, heightMM: 90, quantity: 10 }, UVDTF_DEFAULT_CONFIG)).toBeNull();
        expect(newPath.calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 0 }, UVDTF_DEFAULT_CONFIG)).toBeNull();
    });
});
