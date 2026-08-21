import { describe, it, expect } from 'vitest';
import {
    CHEAP_DECAL_DEFAULT_CONFIG,
    validateCheapDecalConfig,
    CHEAP_DECAL_MODULE_NAME,
} from '../../src/modules/cheapdecal/config/index.js';

describe('CheapDecal config', () => {
    it('default config pass validation', () => {
        const v = validateCheapDecalConfig(CHEAP_DECAL_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        expect(v.errors).toEqual([]);
    });

    it('thiếu CHEAP_DECAL_CONFIG → invalid', () => {
        expect(validateCheapDecalConfig({}).isValid).toBe(false);
    });

    it('metadata + cấu trúc default', () => {
        expect(CHEAP_DECAL_MODULE_NAME).toBe('cheapdecal');
        const c = CHEAP_DECAL_DEFAULT_CONFIG.CHEAP_DECAL_CONFIG;
        expect(c.sizes.length).toBe(7);
        expect(c.quantities).toEqual([500, 1000, 2000]);
        // mỗi cỡ có priceTable độ dài = số mốc SL
        for (const s of c.sizes) {
            expect(c.priceTable[s.id].length).toBe(c.quantities.length);
        }
    });
});
