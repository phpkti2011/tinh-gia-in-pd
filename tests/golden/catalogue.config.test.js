// Test schema validation + barrel cho catalogue config.

import { describe, it, expect } from 'vitest';
import {
    CATALOGUE_DEFAULT_CONFIG,
    validateCatalogueConfig,
    CATALOGUE_MODULE_NAME,
    CATALOGUE_CONFIG_SCHEMA_VERSION,
} from '../../src/modules/catalogue/config/index.js';

describe('Catalogue config', () => {
    it('default config pass validation', () => {
        const v = validateCatalogueConfig(CATALOGUE_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        expect(v.errors).toEqual([]);
    });

    it('thiếu STAPLE_CONFIG → invalid', () => {
        const v = validateCatalogueConfig({});
        expect(v.isValid).toBe(false);
    });

    it('thiếu tiers → invalid', () => {
        const v = validateCatalogueConfig({ STAPLE_CONFIG: { costPerBook: 0 } });
        expect(v.isValid).toBe(false);
    });

    it('tier thiếu price → invalid', () => {
        const v = validateCatalogueConfig({
            STAPLE_CONFIG: { costPerBook: 0, tiers: [{ min: 1, max: 5, type: 'package' }] },
        });
        expect(v.isValid).toBe(false);
    });

    it('metadata + default tiers đúng', () => {
        expect(CATALOGUE_MODULE_NAME).toBe('catalogue');
        expect(typeof CATALOGUE_CONFIG_SCHEMA_VERSION).toBe('string');
        expect(Array.isArray(CATALOGUE_DEFAULT_CONFIG.STAPLE_CONFIG.tiers)).toBe(true);
        expect(CATALOGUE_DEFAULT_CONFIG.STAPLE_CONFIG.tiers.length).toBeGreaterThan(0);
    });
});
