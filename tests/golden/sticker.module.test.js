import { describe, it, expect } from 'vitest';
import * as engine from '../../src/modules/sticker/engine/index.js';
import * as cfg from '../../src/modules/sticker/config/index.js';

describe('Sticker module barrels', () => {
    it('engine export calculateSticker', () => {
        expect(typeof engine.calculateSticker).toBe('function');
    });

    it('config export đầy đủ', () => {
        expect(cfg.STICKER_DEFAULT_CONFIG).toBeTruthy();
        expect(typeof cfg.validateStickerConfig).toBe('function');
        expect(cfg.STICKER_MODULE_NAME).toBe('sticker');
    });
});
