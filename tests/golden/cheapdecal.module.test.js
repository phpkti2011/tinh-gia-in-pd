import { describe, it, expect } from 'vitest';
import * as engine from '../../src/modules/cheapdecal/engine/index.js';
import * as cfg from '../../src/modules/cheapdecal/config/index.js';

describe('CheapDecal module barrels', () => {
    it('engine export calculateCheapDecal', () => {
        expect(typeof engine.calculateCheapDecal).toBe('function');
    });

    it('config export đầy đủ', () => {
        expect(cfg.CHEAP_DECAL_DEFAULT_CONFIG).toBeTruthy();
        expect(typeof cfg.validateCheapDecalConfig).toBe('function');
        expect(cfg.CHEAP_DECAL_MODULE_NAME).toBe('cheapdecal');
    });
});
