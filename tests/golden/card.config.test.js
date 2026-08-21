import { describe, it, expect } from 'vitest';
import {
    CARD_DEFAULT_CONFIG,
    validateCardConfig,
    CARD_MODULE_NAME,
} from '../../src/modules/card/config/index.js';

describe('Card config', () => {
    it('default config pass validation', () => {
        const v = validateCardConfig(CARD_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        expect(v.errors).toEqual([]);
    });

    it('thiếu CARD_CONFIG → invalid', () => {
        expect(validateCardConfig({}).isValid).toBe(false);
    });

    it('cho phép prices null (thẻ gỗ 4.000–4.999)', () => {
        const s = CARD_DEFAULT_CONFIG.CARD_CONFIG;
        const woodGap = s.woodTiers.find((t) => t.min === 4000);
        expect(woodGap.prices.wood).toBeNull();
    });

    it('metadata + cấu trúc default', () => {
        expect(CARD_MODULE_NAME).toBe('card');
        const s = CARD_DEFAULT_CONFIG.CARD_CONFIG;
        expect(s.products.length).toBe(10);
        expect(s.standardTiers.length).toBe(13);
        expect(s.woodTiers.length).toBe(8);
        expect(s.segments.map((x) => x.multiplier)).toEqual([2, 1.5]);
    });
});
