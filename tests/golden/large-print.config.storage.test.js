// Tests cho TASK-0017: validateLargePrintConfig được wire vào configStorage.
//
// Cover:
//   - saveLargePrintConfig (sync): gate config invalid trước khi ghi
//   - loadLargePrintConfig (sync): deep schema check, fallback default
//   - saveConfigToCloud (async, branch largePrintConfig): gate cả localStorage + cloud
//   - Roundtrip: save valid → load → identical
//
// MOCK localStorage: dynamic import sau khi set globalThis.localStorage.

import { describe, it, expect, beforeEach, vi } from 'vitest';

function createLocalStorageMock() {
    return {
        _data: {},
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
        },
        setItem(key, value) {
            this._data[key] = String(value);
        },
        removeItem(key) {
            delete this._data[key];
        },
        clear() {
            this._data = {};
        },
        get length() {
            return Object.keys(this._data).length;
        },
        key(i) {
            return Object.keys(this._data)[i] ?? null;
        },
    };
}
globalThis.localStorage = createLocalStorageMock();

// P2-05.6: bỏ dynamic import cloudSync.js (file đã xoá).
const { loadLargePrintConfig, saveLargePrintConfig, saveConfigToCloud } =
    await import('../../src/utils/configStorage.js');
const { LARGE_PRINT_DEFAULT_CONFIG } =
    await import('../../src/modules/large-print/config/index.js');

describe('TASK-0017: validateLargePrintConfig wired vào configStorage', () => {
    let warnSpy, errorSpy;

    beforeEach(() => {
        localStorage.clear();
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveLargePrintConfig (sync) — gate trước khi ghi localStorage', () => {
        it('config hợp lệ → return true + localStorage có data', () => {
            const ok = saveLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG);
            expect(ok).toBe(true);
            expect(localStorage.getItem('largePrintConfig')).not.toBeNull();
        });

        it('config null → return false + localStorage KHÔNG bị ghi + warn', () => {
            const ok = saveLargePrintConfig(null);
            expect(ok).toBe(false);
            expect(localStorage.getItem('largePrintConfig')).toBeNull();
            expect(warnSpy).toHaveBeenCalled();
        });

        it('config thiếu MATERIAL_TYPES → false + không ghi', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.MATERIAL_TYPES;
            const ok = saveLargePrintConfig(cfg);
            expect(ok).toBe(false);
            expect(localStorage.getItem('largePrintConfig')).toBeNull();
        });

        it('config có printPrice sai kiểu → false', () => {
            const cfg = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            cfg.MATERIAL_TYPES.hiflex.options[0].printPrice = 'high';
            const ok = saveLargePrintConfig(cfg);
            expect(ok).toBe(false);
        });

        it('config thiếu FINISHING_PRICES → false', () => {
            const cfg = { ...LARGE_PRINT_DEFAULT_CONFIG };
            delete cfg.FINISHING_PRICES;
            expect(saveLargePrintConfig(cfg)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('loadLargePrintConfig (sync) — deep schema check + fallback', () => {
        it('localStorage rỗng → trả LARGE_PRINT_DEFAULT_CONFIG', () => {
            const cfg = loadLargePrintConfig();
            expect(cfg.MIN_PRINT_PRICE).toBe(30000);
            expect(cfg.MATERIAL_TYPES).toBeDefined();
        });

        it('JSON corrupted → fallback default + console.error', () => {
            localStorage.setItem('largePrintConfig', '{not json');
            const cfg = loadLargePrintConfig();
            expect(cfg.MIN_PRINT_PRICE).toBe(30000);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('localStorage có config thiếu key shallow → fallback default + warn', () => {
            // isValidConfig('largePrintConfig', ...) requires MATERIAL_TYPES + FINISHING_PRICES
            localStorage.setItem('largePrintConfig', JSON.stringify({ foo: 'bar' }));
            const cfg = loadLargePrintConfig();
            expect(cfg.MIN_PRINT_PRICE).toBe(30000);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('localStorage pass shallow nhưng FAIL deep schema → fallback default + warn (TASK-0017)', () => {
            const bad = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
            bad.FORMEX_OPTIONS.formex_5mm.price = 'expensive'; // pass shallow, fail deep
            localStorage.setItem('largePrintConfig', JSON.stringify(bad));
            const cfg = loadLargePrintConfig();
            // Fallback default → price phải = 130000
            expect(cfg.FORMEX_OPTIONS.formex_5mm.price).toBe(130000);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('roundtrip: save valid → load → identical (Infinity restored)', () => {
            saveLargePrintConfig(LARGE_PRINT_DEFAULT_CONFIG);
            const loaded = loadLargePrintConfig();
            expect(loaded.MIN_PRINT_PRICE).toBe(LARGE_PRINT_DEFAULT_CONFIG.MIN_PRINT_PRICE);
            expect(loaded.MATERIAL_TYPES.hiflex.options.length).toBe(4);
            // Infinity restored từ null sau JSON roundtrip
            const lastTier = loaded.FORMEX_DISCOUNT_TIERS[loaded.FORMEX_DISCOUNT_TIERS.length - 1];
            expect(lastTier.maxArea).toBe(Infinity);
            expect(lastTier.discount).toBe(0.2);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveConfigToCloud (async, largePrintConfig branch)', () => {
        // P2-05.6: Apps Script đã xoá → không cần setAppsScriptUrl('') để tắt cloud.
        // saveConfigToCloud chỉ còn 2 args.

        it('largePrintConfig invalid → {local:false, cloud:false, error}', async () => {
            const r = await saveConfigToCloud('largePrintConfig', { foo: 'bar' });
            expect(r.local).toBe(false);
            expect(r.cloud).toBe(false);
            expect(r.error).toMatch(/invalid/i);
            expect(localStorage.getItem('largePrintConfig')).toBeNull();
        });

        it('largePrintConfig valid + cloud disabled → {local:true, cloud:false}', async () => {
            const r = await saveConfigToCloud('largePrintConfig', LARGE_PRINT_DEFAULT_CONFIG, 'pw');
            expect(r.local).toBe(true);
            expect(r.cloud).toBe(false);
            expect(localStorage.getItem('largePrintConfig')).not.toBeNull();
        });

        it('largePrintConfig null → bị chặn ngay', async () => {
            const r = await saveConfigToCloud('largePrintConfig', null, 'pw');
            expect(r.local).toBe(false);
            expect(r.error).toBeDefined();
        });
    });
});
