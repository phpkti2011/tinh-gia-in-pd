// Smoke test: barrel exports của module catalogue có mặt.

import { describe, it, expect } from 'vitest';
import * as engine from '../../src/modules/catalogue/engine/index.js';
import * as cfg from '../../src/modules/catalogue/config/index.js';

describe('Catalogue module barrels', () => {
    it('engine export calculateCatalogue', () => {
        expect(typeof engine.calculateCatalogue).toBe('function');
    });

    it('config export đầy đủ', () => {
        expect(cfg.CATALOGUE_DEFAULT_CONFIG).toBeTruthy();
        expect(typeof cfg.validateCatalogueConfig).toBe('function');
        expect(cfg.CATALOGUE_MODULE_NAME).toBe('catalogue');
    });
});
