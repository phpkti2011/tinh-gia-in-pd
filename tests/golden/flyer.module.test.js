import { describe, it, expect } from 'vitest';
import * as engine from '../../src/modules/flyer/engine/index.js';
import * as cfg from '../../src/modules/flyer/config/index.js';

describe('Flyer module barrels', () => {
    it('engine export calculateFlyer', () => {
        expect(typeof engine.calculateFlyer).toBe('function');
    });

    it('config export đầy đủ', () => {
        expect(cfg.FLYER_DEFAULT_CONFIG).toBeTruthy();
        expect(typeof cfg.validateFlyerConfig).toBe('function');
        expect(cfg.FLYER_MODULE_NAME).toBe('flyer');
    });
});
