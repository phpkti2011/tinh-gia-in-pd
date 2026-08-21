import { describe, it, expect } from 'vitest';
import {
    MODULE_VISIBILITY_DEFAULT_CONFIG,
    validateModuleVisibilityConfig,
} from '../../src/config/moduleVisibilityConfig';

describe('Module visibility config', () => {
    it('default pass validation + đủ 10 module = true', () => {
        const v = validateModuleVisibilityConfig(MODULE_VISIBILITY_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        const map = MODULE_VISIBILITY_DEFAULT_CONFIG.MODULE_VISIBILITY;
        expect(Object.keys(map)).toEqual([
            'small',
            'large',
            'decal',
            'uvdtf',
            'catalogue',
            'spiral',
            'sticker',
            'card',
            'flyer',
            'cheapdecal',
        ]);
        expect(Object.values(map).every((x) => x === true)).toBe(true);
    });

    it('thiếu MODULE_VISIBILITY → invalid', () => {
        expect(validateModuleVisibilityConfig({}).isValid).toBe(false);
    });

    it('value không phải boolean → invalid', () => {
        expect(
            validateModuleVisibilityConfig({ MODULE_VISIBILITY: { small: 'yes' } }).isValid
        ).toBe(false);
    });

    it('map hợp lệ (boolean) → valid', () => {
        expect(
            validateModuleVisibilityConfig({ MODULE_VISIBILITY: { small: true, card: false } })
                .isValid
        ).toBe(true);
    });
});
