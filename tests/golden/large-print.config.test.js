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
                width: 0.91,
                printPrice: 120000,
                materialPrice: 25000,
            });
            expect(LARGE_PRINT_DEFAULT_CONFIG.FORMEX_OPTIONS.formex_5mm.price).toBe(130000);
            expect(LARGE_PRINT_DEFAULT_CONFIG.FORMEX_DISCOUNT_TIERS).toHaveLength(3);
            expect(LARGE_PRINT_DEFAULT_CONFIG.STANDEE_OPTIONS).toHaveLength(4);
            expect(LARGE_PRINT_DEFAULT_CONFIG.FINISHING_PRICES.dieCutting.tier1PricePerSqm).toBe(
                80000
            );
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
            expect(r.errors.some((e) => e.includes('MATERIAL_TYPES'))).toBe(true);
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
            expect(r.errors.some((e) => e.includes('FINISHING_PRICES'))).toBe(true);
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
            expect(r.errors.some((e) => e.includes('rỗng'))).toBe(true);
        });

        it('thiếu MIN_PRINT_PRICE → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.MIN_PRINT_PRICE;
            expect(validateLargePrintConfig(cfg).isValid).toBe(false);
        });
    });

    // v1.2.0 — thành phẩm theo vật liệu (MATERIAL_TYPES[*].disallowedFinishing).
    describe('disallowedFinishing — default values', () => {
        // Luật thành phẩm là của từng xưởng: phần mềm KHÔNG đặt hộ luật nào.
        // Admin tick/bỏ tick trong tab Cài đặt, bấm Lưu là đẩy lên Supabase.
        it('mọi vật liệu mặc định đều làm được tất cả thành phẩm', () => {
            const mats = Object.entries(LARGE_PRINT_DEFAULT_CONFIG.MATERIAL_TYPES);
            expect(mats.length).toBe(6);
            for (const [key, m] of mats) {
                expect(m.disallowedFinishing, `${key} phải mở hết`).toEqual([]);
            }
        });
    });

    describe('validateLargePrintConfig — disallowedFinishing (optional)', () => {
        it('xoá hẳn field → vẫn valid (config lưu trước v1.2.0)', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            for (const m of Object.values(cfg.MATERIAL_TYPES)) delete m.disallowedFinishing;
            expect(validateLargePrintConfig(cfg).isValid).toBe(true);
        });

        it('string thay vì array → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MATERIAL_TYPES.hiflex.disallowedFinishing = 'lamination';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('disallowedFinishing'))).toBe(true);
        });

        it('phần tử không phải string → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MATERIAL_TYPES.hiflex.disallowedFinishing = [1];
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('disallowedFinishing'))).toBe(true);
        });

        it('id lạ (không thuộc registry) → vẫn valid, cố ý không chặn', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MATERIAL_TYPES.hiflex.disallowedFinishing = ['khong_ton_tai'];
            expect(validateLargePrintConfig(cfg).isValid).toBe(true);
        });
    });

    describe('validateLargePrintConfig — MACHINE_MAX_PRINT_WIDTH_M (optional, v1.3.0)', () => {
        it('default khai 1.6 (mét, KHÔNG phải 160 cm)', () => {
            expect(LARGE_PRINT_DEFAULT_CONFIG.MACHINE_MAX_PRINT_WIDTH_M).toBe(1.6);
        });

        it('xoá hẳn field → vẫn valid (config lưu trước v1.3.0)', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            delete cfg.MACHINE_MAX_PRINT_WIDTH_M;
            expect(validateLargePrintConfig(cfg).isValid).toBe(true);
        });

        it('string thay vì number → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MACHINE_MAX_PRINT_WIDTH_M = '1.6';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('MACHINE_MAX_PRINT_WIDTH_M'))).toBe(true);
        });

        it('số <= 0 → vẫn valid: schema chỉ kiểm TYPE, engine tự xử lý dễ dãi', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MACHINE_MAX_PRINT_WIDTH_M = 0;
            expect(validateLargePrintConfig(cfg).isValid).toBe(true);
        });
    });

    describe('validateLargePrintConfig — negative: inner sanity', () => {
        it('MATERIAL_TYPES.pp_co_keo.options[0].printPrice sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MATERIAL_TYPES.pp_co_keo.options[0].printPrice = 'high';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('printPrice'))).toBe(true);
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
            expect(r.errors.some((e) => e.includes('dieCutting.tier1PricePerSqm'))).toBe(true);
        });

        it('MATERIAL_TYPES rỗng → fail', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG, MATERIAL_TYPES: {} };
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('không có material nào'))).toBe(true);
        });
    });

    describe('FORMEX_DIE_CUT_SHAPES + MIN_FORMEX_DIE_CUT_PRICE (optional, v1.4.0)', () => {
        it('default có 4 hình dạng, key duy nhất, sàn 50.000đ', () => {
            const shapes = LARGE_PRINT_DEFAULT_CONFIG.FORMEX_DIE_CUT_SHAPES;
            expect(shapes).toHaveLength(4);
            expect(shapes.map((s) => s.key)).toEqual(['tron', 'vuong_cn', 'bo_goc', 'phuc_tap']);
            expect(new Set(shapes.map((s) => s.key)).size).toBe(4);
            expect(LARGE_PRINT_DEFAULT_CONFIG.MIN_FORMEX_DIE_CUT_PRICE).toBe(50000);
        });

        it('config lưu trước v1.4.0 (xoá hẳn 2 key) → VẪN hợp lệ', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            delete cfg.FORMEX_DIE_CUT_SHAPES;
            delete cfg.MIN_FORMEX_DIE_CUT_PRICE;
            expect(validateLargePrintConfig(cfg).isValid).toBe(true);
        });

        it('array RỖNG vẫn hợp lệ (admin tạm không nhận bế)', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_DIE_CUT_SHAPES = [];
            expect(validateLargePrintConfig(cfg).isValid).toBe(true);
        });

        it('sai kiểu (string thay vì array) → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_DIE_CUT_SHAPES = 'abc';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('FORMEX_DIE_CUT_SHAPES'))).toBe(true);
        });

        it('giá sai kiểu → fail, nêu đúng field', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_DIE_CUT_SHAPES[0].tier1PricePerSqm = '60k';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(
                r.errors.some((e) => e.includes('FORMEX_DIE_CUT_SHAPES[0].tier1PricePerSqm'))
            ).toBe(true);
        });

        it('key rỗng → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_DIE_CUT_SHAPES[0].key = '   ';
            expect(validateLargePrintConfig(cfg).isValid).toBe(false);
        });

        it('key TRÙNG → fail (params sẽ trỏ vào dòng ngẫu nhiên)', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.FORMEX_DIE_CUT_SHAPES[1].key = cfg.FORMEX_DIE_CUT_SHAPES[0].key;
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('key bị trùng'))).toBe(true);
        });

        it('MIN_FORMEX_DIE_CUT_PRICE sai kiểu → fail', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MIN_FORMEX_DIE_CUT_PRICE = '50k';
            const r = validateLargePrintConfig(cfg);
            expect(r.isValid).toBe(false);
            expect(r.errors.some((e) => e.includes('MIN_FORMEX_DIE_CUT_PRICE'))).toBe(true);
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
