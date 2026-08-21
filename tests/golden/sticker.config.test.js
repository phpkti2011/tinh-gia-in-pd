import { describe, it, expect } from 'vitest';
import {
    STICKER_DEFAULT_CONFIG,
    validateStickerConfig,
    STICKER_MODULE_NAME,
} from '../../src/modules/sticker/config/index.js';

describe('Sticker config', () => {
    it('default config pass validation', () => {
        const v = validateStickerConfig(STICKER_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        expect(v.errors).toEqual([]);
    });

    it('thiếu STICKER_CONFIG → invalid', () => {
        expect(validateStickerConfig({}).isValid).toBe(false);
    });

    it('units lệch độ dài tiers → invalid', () => {
        const bad = JSON.parse(JSON.stringify(STICKER_DEFAULT_CONFIG));
        bad.STICKER_CONFIG.sizes['10x10'].units = [1, 2, 3];
        expect(validateStickerConfig(bad).isValid).toBe(false);
    });

    it('metadata + cấu trúc default', () => {
        expect(STICKER_MODULE_NAME).toBe('sticker');
        const s = STICKER_DEFAULT_CONFIG.STICKER_CONFIG;
        expect(s.tiers.length).toBe(11);
        expect(Object.keys(s.sizes)).toEqual(['10x10', 'A6', 'A5', 'A4']);
        // mỗi khổ có units cùng độ dài tiers
        for (const k of s.sizeOrder) {
            expect(s.sizes[k].units.length).toBe(s.tiers.length);
        }
    });
});
