// Tests cho small-print config schema + version (TASK-0010).
//
// Cover:
//   1. Compat shim: import qua đường cũ (src/config/defaultConfig.js)
//      và đường mới (src/modules/small-print/config/index.js) trả cùng reference.
//   2. Version metadata: tồn tại + đúng định dạng.
//   3. validateSmallPrintConfig(DEFAULT_CONFIG) → pass (valid).
//   4. Negative cases: null, missing required groups, wrong types → fail.
//   5. validateSmallPrintConfig không mutate input.

import { describe, it, expect } from 'vitest';
import {
    DEFAULT_CONFIG,
    validateSmallPrintConfig,
    SMALL_PRINT_MODULE_NAME,
    SMALL_PRINT_CONFIG_SCHEMA_VERSION,
    SMALL_PRINT_CONFIG_LAST_UPDATED,
} from '../../src/modules/small-print/config/index.js';
import { DEFAULT_CONFIG as PRINT_OLD_PATH } from '../../src/config/defaultConfig.js';

describe('TASK-0010: small-print config schema + version', () => {
    describe('compat shim — đường cũ vs đường mới', () => {
        it('cùng reference (no copy, shim re-export đúng)', () => {
            expect(PRINT_OLD_PATH).toBe(DEFAULT_CONFIG);
        });

        it('giá trị quan trọng giữ nguyên (không đổi bảng giá)', () => {
            expect(DEFAULT_CONFIG.LAMINATION_CONFIG.WIDTH).toBe(32);
            expect(DEFAULT_CONFIG.LAMINATION_CONFIG.PRICE_PER_METER).toBe(2200);
            expect(DEFAULT_CONFIG.ART_PAPER_SURCHARGE).toBe(80000);
            expect(DEFAULT_CONFIG.PRINTER_CONFIG.C2060.maxW).toBe(33.0);
            expect(DEFAULT_CONFIG.PRINTER_CONFIG.C2060.prices['4color']).toBe(750);
            expect(DEFAULT_CONFIG.PRINTER_CONFIG.C6085.prices['4color']).toBe(650);
            expect(DEFAULT_CONFIG.PAPER_STOCK_DATA[3].name).toBe('C300');
            expect(DEFAULT_CONFIG.PAPER_STOCK_DATA[3].pricePerReam).toBe(2200000);
            expect(DEFAULT_CONFIG.PROFIT_MARGIN_TIERS).toHaveLength(5);
            expect(DEFAULT_CONFIG.CUSTOMER_PRICE_TIERS).toHaveLength(14);
        });
    });

    describe('version metadata', () => {
        it('SMALL_PRINT_MODULE_NAME = "small-print"', () => {
            expect(SMALL_PRINT_MODULE_NAME).toBe('small-print');
        });

        it('schema version semver', () => {
            expect(SMALL_PRINT_CONFIG_SCHEMA_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
        });

        it('last_updated YYYY-MM-DD', () => {
            expect(SMALL_PRINT_CONFIG_LAST_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        });
    });

    describe('validateSmallPrintConfig(DEFAULT_CONFIG) — happy path', () => {
        const result = validateSmallPrintConfig(DEFAULT_CONFIG);

        it('isValid = true', () => {
            expect(result.isValid).toBe(true);
        });

        it('errors = []', () => {
            expect(result.errors).toEqual([]);
        });
    });

    describe('validateSmallPrintConfig — negative: shape gốc', () => {
        it('null → fail', () => {
            const r = validateSmallPrintConfig(null);
            expect(r.isValid).toBe(false);
            expect(r.errors.length).toBeGreaterThan(0);
        });

        it('undefined → fail', () => {
            expect(validateSmallPrintConfig(undefined).isValid).toBe(false);
        });

        it('array thay vì object → fail', () => {
            expect(validateSmallPrintConfig([]).isValid).toBe(false);
        });

        it('primitive (string) → fail', () => {
            expect(validateSmallPrintConfig('abc').isValid).toBe(false);
        });
    });

    describe('validateSmallPrintConfig — negative: thiếu nhóm thiết yếu', () => {
        it('thiếu PRINTER_CONFIG → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.PRINTER_CONFIG;
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('PRINTER_CONFIG'))).toBe(true);
        });

        it('thiếu LAMINATION_CONFIG → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.LAMINATION_CONFIG;
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('LAMINATION_CONFIG'))).toBe(true);
        });

        it('thiếu HOLE_PUNCHING_CONFIG → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.HOLE_PUNCHING_CONFIG;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('thiếu CREASING_CONFIG → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.CREASING_CONFIG;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('thiếu MOUNTING_CONFIG → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.MOUNTING_CONFIG;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('thiếu PAPER_STOCK_DATA → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.PAPER_STOCK_DATA;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('PAPER_STOCK_DATA rỗng → fail', () => {
            const cfg = { ...DEFAULT_CONFIG, PAPER_STOCK_DATA: [] };
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('rỗng'))).toBe(true);
        });

        it('thiếu CUSTOMER_PRICE_TIERS → fail', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.CUSTOMER_PRICE_TIERS;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });
    });

    describe('validateSmallPrintConfig — negative: sai kiểu', () => {
        it('LAMINATION_CONFIG.WIDTH sai kiểu → fail', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.LAMINATION_CONFIG.WIDTH = '32';
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('LAMINATION_CONFIG.WIDTH'))).toBe(true);
        });

        it('PROFIT_MARGIN_TIERS[0].margin sai kiểu → fail', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.PROFIT_MARGIN_TIERS[0].margin = '0.75';
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('PROFIT_MARGIN_TIERS[0].margin'))).toBe(true);
        });

        it('CUSTOMER_PRICE_TIERS[0].print sai kiểu → fail', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.CUSTOMER_PRICE_TIERS[0].print = 'free';
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('CUSTOMER_PRICE_TIERS[0].print'))).toBe(true);
        });

        it('CUSTOMER_PRICE_TIERS[0].type sai value → fail', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.CUSTOMER_PRICE_TIERS[0].type = 'unknown';
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('CUSTOMER_PRICE_TIERS[0].type'))).toBe(true);
        });

        it('PRINTER_CONFIG.C2060.maxW sai kiểu → fail', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.maxW = '33';
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('maxW'))).toBe(true);
        });

        it('PAPER_STOCK_DATA[0].pricingModel sai value → fail', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.PAPER_STOCK_DATA[0].pricingModel = 'unknown';
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('pricingModel'))).toBe(true);
        });

        it('ART_PAPER_SURCHARGE sai kiểu → fail', () => {
            const cfg = { ...DEFAULT_CONFIG, ART_PAPER_SURCHARGE: '80000' };
            const r = validateSmallPrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some(e => e.includes('ART_PAPER_SURCHARGE'))).toBe(true);
        });
    });

    describe('immutability — validateSmallPrintConfig không mutate input', () => {
        it('config object không bị thay đổi sau khi validate', () => {
            const snapshot = JSON.stringify({
                W: DEFAULT_CONFIG.LAMINATION_CONFIG.WIDTH,
                len: DEFAULT_CONFIG.PROFIT_MARGIN_TIERS.length,
                m0: DEFAULT_CONFIG.PROFIT_MARGIN_TIERS[0].margin,
                p0: DEFAULT_CONFIG.PAPER_STOCK_DATA[0].name,
            });
            validateSmallPrintConfig(DEFAULT_CONFIG);
            const after = JSON.stringify({
                W: DEFAULT_CONFIG.LAMINATION_CONFIG.WIDTH,
                len: DEFAULT_CONFIG.PROFIT_MARGIN_TIERS.length,
                m0: DEFAULT_CONFIG.PROFIT_MARGIN_TIERS[0].margin,
                p0: DEFAULT_CONFIG.PAPER_STOCK_DATA[0].name,
            });
            expect(after).toBe(snapshot);
        });
    });
});
