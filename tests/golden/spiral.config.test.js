import { describe, it, expect } from 'vitest';
import {
    SPIRAL_DEFAULT_CONFIG,
    validateSpiralConfig,
    SPIRAL_MODULE_NAME,
} from '../../src/modules/spiral/config/index.js';

describe('Spiral config', () => {
    it('default config pass validation', () => {
        const v = validateSpiralConfig(SPIRAL_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        expect(v.errors).toEqual([]);
    });

    it('thiếu SPIRAL_CONFIG → invalid', () => {
        expect(validateSpiralConfig({}).isValid).toBe(false);
    });

    it('thiếu coilTiers → invalid', () => {
        const v = validateSpiralConfig({
            SPIRAL_CONFIG: { costPerBook: 0, thicknessTiers: [{ min: 1, max: 50, surcharge: 0 }] },
        });
        expect(v.isValid).toBe(false);
    });

    it('metadata + default tiers + linerTypes', () => {
        expect(SPIRAL_MODULE_NAME).toBe('spiral');
        expect(SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG.coilTiers.length).toBeGreaterThan(0);
        expect(SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG.thicknessTiers.length).toBeGreaterThan(0);
        expect(SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG.linerTypes.length).toBe(2);
    });

    it('linerSizeFactors: mặc định A6 ÷2.5, A5 ÷1.5, A4 ÷1; thiếu field vẫn hợp lệ', () => {
        const f = SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG.linerSizeFactors;
        expect(f.map((x) => [x.label, x.divisor])).toEqual([
            ['A6', 2.5],
            ['A5', 1.5],
            ['A4', 1],
        ]);
        const { linerSizeFactors, ...withoutFactors } = SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG;
        expect(linerSizeFactors).toBeDefined();
        expect(validateSpiralConfig({ SPIRAL_CONFIG: withoutFactors }).isValid).toBe(true);
    });

    it('linerSizeFactors sai (divisor ≤ 0 / rỗng) → invalid', () => {
        const base = SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG;
        const bad = (linerSizeFactors) =>
            validateSpiralConfig({ SPIRAL_CONFIG: { ...base, linerSizeFactors } }).isValid;
        expect(bad([{ label: 'A5', maxShort: 148, maxLong: 210, divisor: 0 }])).toBe(false);
        expect(bad([])).toBe(false);
    });

    it('linerType thiếu tiers → invalid', () => {
        const v = validateSpiralConfig({
            SPIRAL_CONFIG: {
                costPerBook: 0,
                coilTiers: [{ min: 1, max: 5, price: 1, type: 'per_book' }],
                thicknessTiers: [{ min: 1, max: 5, surcharge: 0 }],
                linerTypes: [{ name: '2 zem', costPerBook: 0 }],
            },
        });
        expect(v.isValid).toBe(false);
    });
});
