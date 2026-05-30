// Tests cho TASK-0010: validateSmallPrintConfig được wire vào configStorage.
//
// Cover:
//   - saveConfig (sync, printConfig): gate config invalid trước khi ghi
//   - loadConfig (sync, printConfig): deep schema check, fallback default
//   - saveConfigToCloud (async, branch printConfig): gate cả localStorage + cloud
//   - Roundtrip: save valid → load → identical
//   - Không ảnh hưởng module khác (decalConfig vẫn dùng decal schema)
//
// MOCK localStorage: dynamic import sau khi set globalThis.localStorage
// (cloudSync.js đọc localStorage ở module-load time).

import { describe, it, expect, beforeEach, vi } from 'vitest';

function createLocalStorageMock() {
    return {
        _data: {},
        getItem(key) {
            return Object.prototype.hasOwnProperty.call(this._data, key) ? this._data[key] : null;
        },
        setItem(key, value) { this._data[key] = String(value); },
        removeItem(key) { delete this._data[key]; },
        clear() { this._data = {}; },
        get length() { return Object.keys(this._data).length; },
        key(i) { return Object.keys(this._data)[i] ?? null; },
    };
}
globalThis.localStorage = createLocalStorageMock();

const { loadConfig, saveConfig, saveConfigToCloud } =
    await import('../../src/utils/configStorage.js');
const { DEFAULT_CONFIG } =
    await import('../../src/modules/small-print/config/index.js');
const { setAppsScriptUrl } =
    await import('../../src/utils/cloudSync.js');

describe('TASK-0010: validateSmallPrintConfig wired vào configStorage', () => {
    let warnSpy, errorSpy;

    beforeEach(() => {
        localStorage.clear();
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveConfig (sync) — gate trước khi ghi localStorage', () => {
        it('config hợp lệ → return true + localStorage có data', () => {
            const ok = saveConfig(DEFAULT_CONFIG);
            expect(ok).toBe(true);
            expect(localStorage.getItem('printConfig')).not.toBeNull();
        });

        it('config null → return false + localStorage KHÔNG bị ghi + warn', () => {
            const ok = saveConfig(null);
            expect(ok).toBe(false);
            expect(localStorage.getItem('printConfig')).toBeNull();
            expect(warnSpy).toHaveBeenCalled();
        });

        it('config thiếu PRINTER_CONFIG → false + không ghi', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.PRINTER_CONFIG;
            const ok = saveConfig(cfg);
            expect(ok).toBe(false);
            expect(localStorage.getItem('printConfig')).toBeNull();
        });

        it('config có CUSTOMER_PRICE_TIERS[0].print sai kiểu → false', () => {
            const cfg = structuredClone(DEFAULT_CONFIG);
            cfg.CUSTOMER_PRICE_TIERS[0].print = 'free';
            const ok = saveConfig(cfg);
            expect(ok).toBe(false);
        });

        it('config thiếu PAPER_STOCK_DATA → false', () => {
            const cfg = { ...DEFAULT_CONFIG };
            delete cfg.PAPER_STOCK_DATA;
            expect(saveConfig(cfg)).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('loadConfig (sync) — deep schema check + fallback', () => {
        it('localStorage rỗng → trả DEFAULT_CONFIG', () => {
            const cfg = loadConfig();
            expect(cfg.LAMINATION_CONFIG.WIDTH).toBe(32);
            expect(cfg.ART_PAPER_SURCHARGE).toBe(80000);
        });

        it('JSON corrupted → fallback default + console.error', () => {
            localStorage.setItem('printConfig', '{not json');
            const cfg = loadConfig();
            expect(cfg.LAMINATION_CONFIG.WIDTH).toBe(32);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('localStorage có config thiếu key thiết yếu (shallow fail) → fallback default + warn', () => {
            // PAPER_STOCK_DATA + PROFIT_MARGIN_TIERS + PRINTER_CONFIG required by isValidConfig
            localStorage.setItem('printConfig', JSON.stringify({ PAPER_STOCK_DATA: [] }));
            const cfg = loadConfig();
            expect(cfg.LAMINATION_CONFIG.WIDTH).toBe(32);  // = default
            expect(warnSpy).toHaveBeenCalled();
        });

        it('localStorage pass shallow nhưng FAIL deep schema → fallback default + warn (TASK-0010)', () => {
            const bad = structuredClone(DEFAULT_CONFIG);
            // Pass shallow (vẫn có PAPER_STOCK_DATA non-empty, PROFIT_MARGIN_TIERS, PRINTER_CONFIG)
            // nhưng fail deep (margin sai kiểu)
            bad.PROFIT_MARGIN_TIERS[0].margin = 'high';
            localStorage.setItem('printConfig', JSON.stringify(bad));
            const cfg = loadConfig();
            // Fallback default → margin phải = 0.75
            expect(cfg.PROFIT_MARGIN_TIERS[0].margin).toBe(0.75);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('roundtrip: save valid → load → identical', () => {
            saveConfig(DEFAULT_CONFIG);
            const loaded = loadConfig();
            expect(loaded.LAMINATION_CONFIG.WIDTH).toBe(DEFAULT_CONFIG.LAMINATION_CONFIG.WIDTH);
            expect(loaded.ART_PAPER_SURCHARGE).toBe(DEFAULT_CONFIG.ART_PAPER_SURCHARGE);
            expect(loaded.PAPER_STOCK_DATA.length).toBe(DEFAULT_CONFIG.PAPER_STOCK_DATA.length);
            expect(loaded.PROFIT_MARGIN_TIERS.length).toBe(DEFAULT_CONFIG.PROFIT_MARGIN_TIERS.length);
            // Infinity restored từ null
            const lastTier = loaded.PROFIT_MARGIN_TIERS[loaded.PROFIT_MARGIN_TIERS.length - 1];
            expect(lastTier.max_cost).toBe(Infinity);
            expect(lastTier.margin).toBe(0.55);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveConfigToCloud (async, printConfig branch)', () => {
        beforeEach(() => {
            setAppsScriptUrl(''); // tắt cloud
        });

        it('printConfig invalid → {local:false, cloud:false, error}, KHÔNG ghi localStorage', async () => {
            const r = await saveConfigToCloud('printConfig', { foo: 'bar' }, 'pw');
            expect(r.local).toBe(false);
            expect(r.cloud).toBe(false);
            expect(r.error).toMatch(/invalid/i);
            expect(localStorage.getItem('printConfig')).toBeNull();
        });

        it('printConfig valid + cloud disabled → {local:true, cloud:false}', async () => {
            const r = await saveConfigToCloud('printConfig', DEFAULT_CONFIG, 'pw');
            expect(r.local).toBe(true);
            expect(r.cloud).toBe(false);
            expect(localStorage.getItem('printConfig')).not.toBeNull();
        });

        it('printConfig null → bị chặn ngay', async () => {
            const r = await saveConfigToCloud('printConfig', null, 'pw');
            expect(r.local).toBe(false);
            expect(r.error).toBeDefined();
        });
    });

    // Backward-compat describe block removed in TASK-0017:
    // largePrintConfig đã được gate ở TASK-0017 → không còn module nào "ungated"
    // để test backward compat. All 4 module config đều đã wire validation.
});
