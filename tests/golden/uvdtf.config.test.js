// Tests cho uvdtf config schema + version (TASK-0013).
//
// Cover:
//   1. Compat shim: import qua đường cũ (src/config/uvdtfConfig.js)
//      và đường mới (src/modules/uvdtf/config/index.js) trả cùng reference.
//   2. Version metadata: tồn tại + đúng định dạng.
//   3. validateUvDtfConfig(UVDTF_DEFAULT_CONFIG) → pass (valid).
//   4. Negative cases: null, missing required fields, wrong types → fail.
//   5. validateUvDtfConfig không mutate input.

import { describe, it, expect } from 'vitest';
import {
    UVDTF_DEFAULT_CONFIG,
    validateUvDtfConfig,
    UVDTF_MODULE_NAME,
    UVDTF_CONFIG_SCHEMA_VERSION,
    UVDTF_CONFIG_LAST_UPDATED,
} from '../../src/modules/uvdtf/config/index.js';
import { UVDTF_DEFAULT_CONFIG as UVDTF_OLD_PATH } from '../../src/config/uvdtfConfig.js';

describe('TASK-0013: uvdtf config schema + version', () => {
    describe('compat shim — đường cũ vs đường mới', () => {
        it('cùng reference (no copy, shim re-export đúng)', () => {
            expect(UVDTF_OLD_PATH).toBe(UVDTF_DEFAULT_CONFIG);
        });

        it('giá trị quan trọng giữ nguyên (không đổi bảng giá)', () => {
            expect(UVDTF_DEFAULT_CONFIG.materialWidthCM).toBe(55);
            expect(UVDTF_DEFAULT_CONFIG.printableWidthCM).toBe(53);
            expect(UVDTF_DEFAULT_CONFIG.paddingCM).toBe(0.4);
            expect(UVDTF_DEFAULT_CONFIG.minBillableMeters).toBe(1);
            expect(UVDTF_DEFAULT_CONFIG.priceTiers).toHaveLength(4);
            expect(UVDTF_DEFAULT_CONFIG.priceTiers[0]).toEqual({ maxMeters: 2, price: 440000 });
            const last = UVDTF_DEFAULT_CONFIG.priceTiers[3];
            expect(last.maxMeters).toBe(Infinity);
            expect(last.price).toBe(280000);
        });
    });

    describe('version metadata', () => {
        it('UVDTF_MODULE_NAME = "uvdtf"', () => {
            expect(UVDTF_MODULE_NAME).toBe('uvdtf');
        });

        it('schema version đúng dạng semver', () => {
            expect(UVDTF_CONFIG_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('last_updated YYYY-MM-DD', () => {
            expect(UVDTF_CONFIG_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('validateUvDtfConfig(UVDTF_DEFAULT_CONFIG) — happy path', () => {
        const result = validateUvDtfConfig(UVDTF_DEFAULT_CONFIG);

        it('isValid = true', () => {
            expect(result.isValid).toBe(true);
        });

        it('errors = []', () => {
            expect(result.errors).toEqual([]);
        });
    });

    describe('validateUvDtfConfig — negative: shape gốc', () => {
        it('null → fail', () => {
            const r = validateUvDtfConfig(null);
            expect(r.isValid).toBe(false);
            expect(r.errors.length).toBeGreaterThan(0);
        });

        it('undefined → fail', () => {
            expect(validateUvDtfConfig(undefined).isValid).toBe(false);
        });

        it('array thay vì object → fail', () => {
            expect(validateUvDtfConfig([]).isValid).toBe(false);
        });

        it('primitive (string) → fail', () => {
            expect(validateUvDtfConfig('abc').isValid).toBe(false);
        });
    });

    describe('validateUvDtfConfig — negative: thiếu numeric required', () => {
        it('thiếu materialWidthCM → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.materialWidthCM;
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('materialWidthCM'))).toBe(true);
        });

        it('thiếu printableWidthCM → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.printableWidthCM;
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('printableWidthCM'))).toBe(true);
        });

        it('thiếu paddingCM → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.paddingCM;
            expect(validateUvDtfConfig(cfg).isValid).toBe(false);
        });

        it('thiếu minBillableMeters → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.minBillableMeters;
            expect(validateUvDtfConfig(cfg).isValid).toBe(false);
        });

        it('numeric field sai kiểu (string) → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG, paddingCM: '0.4' };
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('paddingCM'))).toBe(true);
        });
    });

    describe('validateUvDtfConfig — negative: priceTiers', () => {
        it('thiếu priceTiers → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.priceTiers;
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('priceTiers'))).toBe(true);
        });

        it('priceTiers rỗng → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG, priceTiers: [] };
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('rỗng'))).toBe(true);
        });

        it('priceTiers không phải array → fail', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG, priceTiers: { foo: 'bar' } };
            expect(validateUvDtfConfig(cfg).isValid).toBe(false);
        });

        it('priceTiers[0].price sai kiểu (string) → fail', () => {
            const cfg = structuredClone(UVDTF_DEFAULT_CONFIG);
            cfg.priceTiers[0].price = '440000';
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('priceTiers[0].price'))).toBe(true);
        });

        it('priceTiers[0].maxMeters sai kiểu → fail', () => {
            const cfg = structuredClone(UVDTF_DEFAULT_CONFIG);
            cfg.priceTiers[0].maxMeters = '2';
            const r = validateUvDtfConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('priceTiers[0].maxMeters'))).toBe(true);
        });

        it('priceTiers chấp nhận Infinity ở maxMeters cho tier cuối', () => {
            // Default config có { maxMeters: Infinity, price: 280000 } cho tier cuối
            // → vẫn pass validation (Infinity là number)
            const r = validateUvDtfConfig(UVDTF_DEFAULT_CONFIG);
            expect(r.isValid).toBe(true);
        });
    });

    describe('immutability — validateUvDtfConfig không mutate input', () => {
        it('config object không bị thay đổi sau khi validate', () => {
            const snapshot = JSON.stringify({
                m: UVDTF_DEFAULT_CONFIG.materialWidthCM,
                p: UVDTF_DEFAULT_CONFIG.paddingCM,
                tiers: UVDTF_DEFAULT_CONFIG.priceTiers.length,
                t0: UVDTF_DEFAULT_CONFIG.priceTiers[0].price,
            });
            validateUvDtfConfig(UVDTF_DEFAULT_CONFIG);
            const after = JSON.stringify({
                m: UVDTF_DEFAULT_CONFIG.materialWidthCM,
                p: UVDTF_DEFAULT_CONFIG.paddingCM,
                tiers: UVDTF_DEFAULT_CONFIG.priceTiers.length,
                t0: UVDTF_DEFAULT_CONFIG.priceTiers[0].price,
            });
            expect(after).toBe(snapshot);
        });
    });
});
