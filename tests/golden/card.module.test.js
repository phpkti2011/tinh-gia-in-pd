import { describe, it, expect } from 'vitest';
import * as engine from '../../src/modules/card/engine/index.js';
import * as cfg from '../../src/modules/card/config/index.js';

describe('Card module barrels', () => {
    it('engine export calculateCard', () => {
        expect(typeof engine.calculateCard).toBe('function');
    });

    it('config export đầy đủ', () => {
        expect(cfg.CARD_DEFAULT_CONFIG).toBeTruthy();
        expect(typeof cfg.validateCardConfig).toBe('function');
        expect(cfg.CARD_MODULE_NAME).toBe('card');
    });
});
