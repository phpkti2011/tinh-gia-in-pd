import { describe, it, expect } from 'vitest';
import * as engine from '../../src/modules/spiral/engine/index.js';
import * as cfg from '../../src/modules/spiral/config/index.js';

describe('Spiral module barrels', () => {
    it('engine export calculateSpiral', () => {
        expect(typeof engine.calculateSpiral).toBe('function');
    });

    it('config export đầy đủ', () => {
        expect(cfg.SPIRAL_DEFAULT_CONFIG).toBeTruthy();
        expect(typeof cfg.validateSpiralConfig).toBe('function');
        expect(cfg.SPIRAL_MODULE_NAME).toBe('spiral');
    });
});
