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
