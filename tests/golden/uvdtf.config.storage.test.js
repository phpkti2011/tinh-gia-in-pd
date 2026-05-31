// Tests cho TASK-0013: validateUvDtfConfig được wire vào configStorage.
//
// Cover:
//   - saveUvdtfConfig (sync): gate config invalid trước khi ghi localStorage
//   - loadUvdtfConfig (sync): deep schema check, fallback default nếu invalid
//   - saveConfigToCloud (async, branch uvdtfConfig): gate cả localStorage + cloud
//   - Roundtrip: save valid → load → identical (Infinity restore)
//   - Không ảnh hưởng module khác (largePrintConfig vẫn chưa gate)
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
const { loadUvdtfConfig, saveUvdtfConfig, saveConfigToCloud } =
    await import('../../src/utils/configStorage.js');
const { UVDTF_DEFAULT_CONFIG } = await import('../../src/modules/uvdtf/config/index.js');

describe('TASK-0013: validateUvDtfConfig wired vào configStorage', () => {
    let warnSpy, errorSpy;

    beforeEach(() => {
        localStorage.clear();
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveUvdtfConfig (sync) — gate trước khi ghi localStorage', () => {
        it('config hợp lệ → return true + localStorage có data', () => {
            const ok = saveUvdtfConfig(UVDTF_DEFAULT_CONFIG);
            expect(ok).toBe(true);
            expect(localStorage.getItem('uvdtfConfig')).not.toBeNull();
        });

        it('config null → return false + localStorage KHÔNG bị ghi + warn', () => {
            const ok = saveUvdtfConfig(null);
            expect(ok).toBe(false);
            expect(localStorage.getItem('uvdtfConfig')).toBeNull();
            expect(warnSpy).toHaveBeenCalled();
        });

        it('config thiếu priceTiers → false + không ghi', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.priceTiers;
            const ok = saveUvdtfConfig(cfg);
            expect(ok).toBe(false);
            expect(localStorage.getItem('uvdtfConfig')).toBeNull();
        });

        it('config có price sai kiểu → false', () => {
            const cfg = structuredClone(UVDTF_DEFAULT_CONFIG);
            cfg.priceTiers[0].price = 'free';
            const ok = saveUvdtfConfig(cfg);
            expect(ok).toBe(false);
        });

        it('config thiếu printableWidthCM → false', () => {
            const cfg = { ...UVDTF_DEFAULT_CONFIG };
            delete cfg.printableWidthCM;
            expect(saveUvdtfConfig(cfg)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('loadUvdtfConfig (sync) — deep schema check + fallback', () => {
        it('localStorage rỗng → trả UVDTF_DEFAULT_CONFIG', () => {
            const cfg = loadUvdtfConfig();
            expect(cfg.materialWidthCM).toBe(55);
            expect(cfg.priceTiers.length).toBe(4);
        });

        it('JSON corrupted → fallback default + console.error', () => {
            localStorage.setItem('uvdtfConfig', '{not json');
            const cfg = loadUvdtfConfig();
            expect(cfg.materialWidthCM).toBe(55);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('localStorage có config thiếu key shallow → fallback default + warn', () => {
            // isValidConfig('uvdtfConfig', ...) requires: priceTiers (array nonempty),
            // printableWidthCM (other key). Pass empty object → shallow fail.
            localStorage.setItem('uvdtfConfig', JSON.stringify({ foo: 'bar' }));
            const cfg = loadUvdtfConfig();
            expect(cfg.materialWidthCM).toBe(55);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('localStorage pass shallow nhưng FAIL deep schema → fallback default + warn (TASK-0013)', () => {
            // Pass shallow (priceTiers nonempty + printableWidthCM exists) nhưng deep fail
            // (maxMeters sai kiểu)
            const bad = structuredClone(UVDTF_DEFAULT_CONFIG);
            bad.priceTiers[0].maxMeters = 'two';
            localStorage.setItem('uvdtfConfig', JSON.stringify(bad));
            const cfg = loadUvdtfConfig();
            // Fallback default → maxMeters tier 0 phải = 2
            expect(cfg.priceTiers[0].maxMeters).toBe(2);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('roundtrip: save valid → load → identical (Infinity restored)', () => {
            saveUvdtfConfig(UVDTF_DEFAULT_CONFIG);
            const loaded = loadUvdtfConfig();
            expect(loaded.materialWidthCM).toBe(UVDTF_DEFAULT_CONFIG.materialWidthCM);
            expect(loaded.paddingCM).toBe(UVDTF_DEFAULT_CONFIG.paddingCM);
            expect(loaded.priceTiers.length).toBe(UVDTF_DEFAULT_CONFIG.priceTiers.length);
            // Infinity restored từ null sau JSON roundtrip
            const lastTier = loaded.priceTiers[loaded.priceTiers.length - 1];
            expect(lastTier.maxMeters).toBe(Infinity);
            expect(lastTier.price).toBe(280000);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveConfigToCloud (async, uvdtfConfig branch)', () => {
        // P2-05.6: Apps Script đã xoá → không cần setAppsScriptUrl('') để tắt cloud.
        // saveConfigToCloud chỉ còn 2 args.

        it('uvdtfConfig invalid → {local:false, cloud:false, error}', async () => {
            const r = await saveConfigToCloud('uvdtfConfig', { foo: 'bar' });
            expect(r.local).toBe(false);
            expect(r.cloud).toBe(false);
            expect(r.error).toMatch(/invalid/i);
            expect(localStorage.getItem('uvdtfConfig')).toBeNull();
        });

        it('uvdtfConfig valid + cloud disabled → {local:true, cloud:false}', async () => {
            const r = await saveConfigToCloud('uvdtfConfig', UVDTF_DEFAULT_CONFIG, 'pw');
            expect(r.local).toBe(true);
            expect(r.cloud).toBe(false);
            expect(localStorage.getItem('uvdtfConfig')).not.toBeNull();
        });

        it('uvdtfConfig null → bị chặn ngay', async () => {
            const r = await saveConfigToCloud('uvdtfConfig', null, 'pw');
            expect(r.local).toBe(false);
            expect(r.error).toBeDefined();
        });
    });

    // Backward-compat describe block removed in TASK-0017:
    // largePrintConfig đã được gate ở TASK-0017 → không còn module nào "ungated"
    // để test backward compat. All 4 module config đều đã wire validation.
});
