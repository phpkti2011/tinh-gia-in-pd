// Tests cho decal config schema + version (TASK-0005).
//
// Cover:
//   1. Compat shim: import qua đường cũ và đường mới trả về cùng reference.
//   2. Version metadata: tồn tại + đúng định dạng.
//   3. validateDecalConfig(DECAL_DEFAULT_CONFIG) → pass (valid).
//   4. Negative cases: null, missing fields, wrong types → fail.
//   5. validateDecalConfig không mutate input.

import { describe, it, expect } from 'vitest';
import {
    DECAL_DEFAULT_CONFIG,
    validateDecalConfig,
    DECAL_MODULE_NAME,
    DECAL_CONFIG_SCHEMA_VERSION,
    DECAL_CONFIG_LAST_UPDATED,
} from '../../src/modules/decal/config/index.js';
import { DECAL_DEFAULT_CONFIG as DECAL_OLD_PATH } from '../../src/config/decalConfig.js';

describe('TASK-0005: decal config schema + version', () => {
    describe('compat shim — đường cũ vs đường mới', () => {
        it('cùng reference (no copy, shim re-export đúng)', () => {
            expect(DECAL_OLD_PATH).toBe(DECAL_DEFAULT_CONFIG);
        });

        it('giá trị quan trọng giữ nguyên (không đổi bảng giá)', () => {
            expect(DECAL_DEFAULT_CONFIG.basePrintWidth).toBe(330);
            expect(DECAL_DEFAULT_CONFIG.laminationCost).toBe(500);
            expect(DECAL_DEFAULT_CONFIG.areaConversionFactor).toBe(0.35);
            expect(DECAL_DEFAULT_CONFIG.progressiveTiers[0]).toEqual({ upTo: 1, price: 100000 });
            expect(DECAL_DEFAULT_CONFIG.decalCosts['Decal giấy']).toBe(0);
            expect(DECAL_DEFAULT_CONFIG.decalCosts['Decal nhựa']).toBe(1200);
        });
    });

    describe('version metadata', () => {
        it('DECAL_MODULE_NAME = "decal"', () => {
            expect(DECAL_MODULE_NAME).toBe('decal');
        });

        it('DECAL_CONFIG_SCHEMA_VERSION đúng dạng semver', () => {
            expect(DECAL_CONFIG_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('DECAL_CONFIG_LAST_UPDATED đúng dạng YYYY-MM-DD', () => {
            expect(DECAL_CONFIG_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('validateDecalConfig(DECAL_DEFAULT_CONFIG) — happy path', () => {
        const result = validateDecalConfig(DECAL_DEFAULT_CONFIG);

        it('isValid = true', () => {
            expect(result.isValid).toBe(true);
        });

        it('errors là array rỗng', () => {
            expect(result.errors).toEqual([]);
        });
    });

    describe('validateDecalConfig — negative cases', () => {
        it('null → fail', () => {
            const r = validateDecalConfig(null);
            expect(r.isValid).toBe(false);
            expect(r.errors.length).toBeGreaterThan(0);
        });

        it('undefined → fail', () => {
            const r = validateDecalConfig(undefined);
            expect(r.isValid).toBe(false);
        });

        it('array thay vì object → fail', () => {
            const r = validateDecalConfig([]);
            expect(r.isValid).toBe(false);
        });

        it('thiếu progressiveTiers → fail', () => {
            const cfg = { ...DECAL_DEFAULT_CONFIG };
            delete cfg.progressiveTiers;
            const r = validateDecalConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('progressiveTiers'))).toBe(true);
        });

        it('progressiveTiers rỗng → fail', () => {
            const cfg = { ...DECAL_DEFAULT_CONFIG, progressiveTiers: [] };
            const r = validateDecalConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('rỗng'))).toBe(true);
        });

        it('price trong progressiveTier sai kiểu → fail', () => {
            const cfg = structuredClone(DECAL_DEFAULT_CONFIG);
            cfg.progressiveTiers[0].price = 'abc';
            const r = validateDecalConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('progressiveTiers[0].price'))).toBe(true);
        });

        it('decalCosts có value sai kiểu → fail', () => {
            const cfg = structuredClone(DECAL_DEFAULT_CONFIG);
            cfg.decalCosts['Decal giấy'] = 'free';
            const r = validateDecalConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes("decalCosts['Decal giấy']"))).toBe(true);
        });

        it('thiếu laminationCost → fail', () => {
            const cfg = { ...DECAL_DEFAULT_CONFIG };
            delete cfg.laminationCost;
            const r = validateDecalConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('laminationCost'))).toBe(true);
        });

        it('basePrintWidth sai kiểu → fail', () => {
            const cfg = { ...DECAL_DEFAULT_CONFIG, basePrintWidth: '330' };
            const r = validateDecalConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('basePrintWidth'))).toBe(true);
        });
    });

    describe('immutability — validateDecalConfig không mutate input', () => {
        it('config object không bị thay đổi sau khi validate', () => {
            const snapshot = structuredClone(DECAL_DEFAULT_CONFIG);
            validateDecalConfig(DECAL_DEFAULT_CONFIG);
            // So sánh shape chứ không so sánh reference
            expect(DECAL_DEFAULT_CONFIG.basePrintWidth).toBe(snapshot.basePrintWidth);
            expect(DECAL_DEFAULT_CONFIG.laminationCost).toBe(snapshot.laminationCost);
            expect(DECAL_DEFAULT_CONFIG.progressiveTiers.length).toBe(
                snapshot.progressiveTiers.length
            );
            expect(DECAL_DEFAULT_CONFIG.progressiveTiers[0]).toEqual(snapshot.progressiveTiers[0]);
        });
    });
});
