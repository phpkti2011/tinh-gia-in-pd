// Tests cho large-print config schema + version (TASK-0017).
//
// Cover:
//   1. Compat shim: import qua đường cũ (src/config/largePrintConfig.js)
//      và đường mới (src/modules/large-print/config/index.js) trả cùng reference.
//   2. Version metadata: tồn tại + đúng định dạng.
//   3. validateLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG) → pass.
//   4. Negative cases: null, missing groups, wrong types → fail.
//   5. validateLargePrintConfig không mutate input.

import { describe, it, expect } from 'vitest';
import {
    LARGE_PRINT_DEFAULT_CONFIG,
    validateLargePrintConfig,
    LARGE_PRINT_MODULE_NAME,
    LARGE_PRINT_CONFIG_SCHEMA_VERSION,
    LARGE_PRINT_CONFIG_LAST_UPDATED,
} from '../../src/modules/large-print/config/index.js';
import { LARGE_PRINT_DEFAULT_CONFIG as LP_OLD_PATH } from '../../src/config/largePrintConfig.js';

describe('TASK-0017: large-print config schema + version', () => {
    describe('compat shim — đường cũ vs đường mới', () => {
        it('cùng reference (no copy, shim re-export đúng)', () => {
            expect(LP_OLD_PATH).toBe(LARGE_PRINT_DEFAULT_CONFIG);
        });

        it('giá trị quan trọng giữ nguyên (không đổi bảng giá)', () => {
            expect(LARGE_PRINT_DEFAULT_CONFIG.MIN_PRINT_PRICE).toBe(30000);
            expect(LARGE_PRINT_DEFAULT_CONFIG.MIN_LAMINATION_PRICE).toBe(15000);
            expect(LARGE_PRINT_DEFAULT_CONFIG.MATERIAL_TYPES.hiflex.options).toHaveLength(4);
            expect(LARGE_PRINT_DEFAULT_CONFIG.MATERIAL_TYPES.pp_co_keo.options[0]).toEqual({
                width: 0.91, printPrice: 120000, materialPrice: 25000
            });
            expect(LARGE_PRINT_DEFAULT_CONFIG.FORMEX_OPTIONS.formex_5mm.price).toBe(130000);
            expect(LARGE_PRINT_DEFAULT_CONFIG.FORMEX_DISCOUNT_TIERS).toHaveLength(3);
            expect(LARGE_PRINT_DEFAULT_CONFIG.STANDEE_OPTIONS).toHaveLength(4);
            expect(LARGE_PRINT_DEFAULT_CONFIG.FINISHING_PRICES.dieCutting.tier1PricePerSqm).toBe(80000);
        });
    });

    describe('version metadata', () => {
        it('LARGE_PRINT_MODULE_NAME = "large-print"', () => {
            expect(LARGE_PRINT_MODULE_NAME).toBe('large-print');
        });

        it('schema version đúng dạng semver', () => {
            expect(LARGE_PRINT_CONFIG_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('last_updated YYYY-MM-DD', () => {
            expect(LARGE_PRINT_CONFIG_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('validateLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG) — happy path', () => {
        const result = validateLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG);

        it('isValid = true', () => {
            expect(result.isValid).toBe(true);
        });

        it('errors = []', () => {
            expect(result.errors).toEqual([]);
        });
    });

    describe('validateLargePrintConfig — negative: shape gốc', () => {
        it('null → fail', () => {
            const r = validateLargePrintConfig(null);
            expect(r.isValid).toBe(false);
            expect(r.errors.length).toBeGreaterThan(0);
        });

        it('undefined → fail', () => {
            expect(validateLargePrintConfig(undefined).isValid).toBe(false);
        });

        it('array thay vì object → fail', () => {
            expect(validateLargePrintConfig([]).isValid).toBe(false);
        });

        it('primitive (string) → fail', () => {
            expect(validateLargePrintConfig('abc').isValid).toBe(false);
        });
    });

    describe('validateLargePrintConfig — negative: thiếu nhóm thiết yếu', () => {
        it('thiếu MATERIAL_TYPES → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.MATERIAL_TYPES;
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('MATERIAL_TYPES'))).toBe(true);
        });

        it('thiếu LAMINATION_TYPES → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.LAMINATION_TYPES;
            expect(validateLargePrintConfig(cfg).isValid).toBe(false);
        });

        it('thiếu FORMEX_OPTIONS → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.FORMEX_OPTIONS;
            expect(validateLargePrintConfig(cfg).isValid).toBe(false);
        });

        it('thiếu FINISHING_PRICES → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.FINISHING_PRICES;
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('FINISHING_PRICES'))).toBe(true);
        });

        it('thiếu FORMEX_DISCOUNT_TIERS → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.FORMEX_DISCOUNT_TIERS;
            expect(validateLargePrintConfig(cfg).isValid).toBe(false);
        });

        it('STANDEE_OPTIONS rỗng → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG, STANDEE_OPTIONS: [] };
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('rỗng'))).toBe(true);
        });

        it('thiếu MIN_PRINT_PRICE → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.MIN_PRINT_PRICE;
            expect(validateLargePrintConfig(cfg).isValid).toBe(false);
        });
    });

    describe('validateLargePrintConfig — negative: inner sanity', () => {
        it('MATERIAL_TYPES.pp_co_keo.options[0].printPrice sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MATERIAL_TYPES.pp_co_keo.options[0].printPrice = 'high';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('printPrice'))).toBe(true);
        });

        it('LAMINATION_TYPES.mang_mo.options[0].price sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.LAMINATION_TYPES.mang_mo.options[0].price = 'expensive';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
        });

        it('FORMEX_OPTIONS.formex_5mm.price sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_OPTIONS.formex_5mm.price = '130k';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
        });

        it('FORMEX_DISCOUNT_TIERS[0].discount sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_DISCOUNT_TIERS[0].discount = '10%';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
        });

        it('FORMEX_DISCOUNT_TIERS[2].maxArea = Infinity vẫn pass (cho phép)', () => {
            // Default config có tier cuối {minArea:20, maxArea:Infinity}
            expect(LARGE_PRINT_DEFAULT_CONFIG.FORMEX_DISCOUNT_TIERS[2].maxArea).toBe(Infinity);
            expect(validateLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG).isValid).toBe(true);
        });

        it('STANDEE_OPTIONS[0].price sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.STANDEE_OPTIONS[0].price = 'free';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
        });

        it('FINISHING_PRICES.dieCutting.tier1PricePerSqm sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FINISHING_PRICES.dieCutting.tier1PricePerSqm = '80k';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('dieCutting.tier1PricePerSqm'))).toBe(true);
        });

        it('MATERIAL_TYPES rỗng → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG, MATERIAL_TYPES: {} };
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('không có material nào'))).toBe(true);
        });
    });

    describe('immutability — validateLargePrintConfig không mutate input', () => {
        it('config object không bị thay đổi sau khi validate', () => {
            const snapshot = JSON.stringify({
                m: LARGE_PRINT_DEFAULT_CONFIG.MIN_PRINT_PRICE,
                pp0: LARGE_PRINT_DEFAULT_CONFIG.MATERIAL_TYPES.pp_co_keo.options[0].printPrice,
                fx: LARGE_PRINT_DEFAULT_CONFIG.FORMEX_OPTIONS.formex_5mm.price,
                fdt: LARGE_PRINT_DEFAULT_CONFIG.FORMEX_DISCOUNT_TIERS.length,
                std: LARGE_PRINT_DEFAULT_CONFIG.STANDEE_OPTIONS.length,
            });
            validateLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG);
            const after = JSON.stringify({
                m: LARGE_PRINT_DEFAULT_CONFIG.MIN_PRINT_PRICE,
                pp0: LARGE_PRINT_DEFAULT_CONFIG.MATERIAL_TYPES.pp_co_keo.options[0].printPrice,
                fx: LARGE_PRINT_DEFAULT_CONFIG.FORMEX_OPTIONS.formex_5mm.price,
                fdt: LARGE_PRINT_DEFAULT_CONFIG.FORMEX_DISCOUNT_TIERS.length,
                std: LARGE_PRINT_DEFAULT_CONFIG.STANDEE_OPTIONS.length,
            });
            expect(after).toBe(snapshot);
        });
    });
});
