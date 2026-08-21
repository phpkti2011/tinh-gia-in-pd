import { describe, it, expect } from 'vitest';
import {
    FLYER_DEFAULT_CONFIG,
    validateFlyerConfig,
    FLYER_MODULE_NAME,
} from '../../src/modules/flyer/config/index.js';

describe('Flyer config', () => {
    it('default config pass validation', () => {
        const v = validateFlyerConfig(FLYER_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        expect(v.errors).toEqual([]);
    });

    it('thiếu FLYER_CONFIG → invalid', () => {
        expect(validateFlyerConfig({}).isValid).toBe(false);
    });

    it('metadata + cấu trúc default', () => {
        expect(FLYER_MODULE_NAME).toBe('flyer');
        const c = FLYER_DEFAULT_CONFIG.FLYER_CONFIG;
        expect(c.sizes.map((s) => s.id)).toEqual(['A5', 'A4']);
        expect(c.priceTable.A5.length).toBe(8);
        expect(c.priceTable.A4.length).toBe(9);
        expect(c.creasing.bands.length).toBe(4);
    });
});
