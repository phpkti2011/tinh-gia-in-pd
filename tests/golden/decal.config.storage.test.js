// Tests cho TASK-0005.5: validateDecalConfig được wire vào configStorage.
//
// Cover:
//   - saveDecalConfig (sync): gate config invalid trước khi ghi localStorage
//   - loadDecalConfig (sync): deep schema check, fallback default nếu invalid
//   - saveConfigToCloud (async, branch decal): gate trước khi ghi cả 2 nơi
//   - Roundtrip: save valid → load → identical
//   - Không ảnh hưởng module khác (printConfig, …)
//
// MOCK localStorage: vì cloudSync.js đọc localStorage ở module-load time
// (line `let APPS_SCRIPT_URL = localStorage.getItem(...)`), phải set
// globalThis.localStorage TRƯỚC khi import. Static `import` bị hoisted lên
// trên cùng nên dùng dynamic `import()` (await) sau khi gán mock.

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

// 1) Set mock localStorage TRƯỚC mọi dynamic import của configStorage / cloudSync
globalThis.localStorage = createLocalStorageMock();

// 2) Top-level await dynamic import — chạy sau khi globalThis.localStorage đã có
const { loadDecalConfig, saveDecalConfig, saveConfigToCloud } =
    await import('../../src/utils/configStorage.js');
const { DECAL_DEFAULT_CONFIG } =
    await import('../../src/modules/decal/config/index.js');
const { setAppsScriptUrl } =
    await import('../../src/utils/cloudSync.js');

describe('TASK-0005.5: validateDecalConfig wired vào configStorage', () => {
    let warnSpy, errorSpy;

    beforeEach(() => {
        localStorage.clear();
        warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveDecalConfig (sync) — gate trước khi ghi localStorage', () => {
        it('config hợp lệ → return true + localStorage có data', () => {
            const ok = saveDecalConfig(DECAL_DEFAULT_CONFIG);
            expect(ok).toBe(true);
            expect(localStorage.getItem('decalConfig')).not.toBeNull();
        });

        it('config null → return false + localStorage KHÔNG bị ghi + warn', () => {
            const ok = saveDecalConfig(null);
            expect(ok).toBe(false);
            expect(localStorage.getItem('decalConfig')).toBeNull();
            expect(warnSpy).toHaveBeenCalled();
        });

        it('config thiếu progressiveTiers → false + localStorage không bị ghi', () => {
            const cfg = { ...DECAL_DEFAULT_CONFIG };
            delete cfg.progressiveTiers;
            const ok = saveDecalConfig(cfg);
            expect(ok).toBe(false);
            expect(localStorage.getItem('decalConfig')).toBeNull();
        });

        it('config có price kiểu string trong tier → false', () => {
            const cfg = structuredClone(DECAL_DEFAULT_CONFIG);
            cfg.progressiveTiers[0].price = 'abc';
            const ok = saveDecalConfig(cfg);
            expect(ok).toBe(false);
        });

        it('config thiếu laminationCost → false', () => {
            const cfg = { ...DECAL_DEFAULT_CONFIG };
            delete cfg.laminationCost;
            const ok = saveDecalConfig(cfg);
            expect(ok).toBe(false);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('loadDecalConfig (sync) — deep schema check + fallback', () => {
        it('localStorage rỗng → trả DECAL_DEFAULT_CONFIG', () => {
            const cfg = loadDecalConfig();
            expect(cfg.basePrintWidth).toBe(330);
            expect(cfg.laminationCost).toBe(500);
        });

        it('JSON corrupted → fallback default + console.error', () => {
            localStorage.setItem('decalConfig', '{not json');
            const cfg = loadDecalConfig();
            expect(cfg.basePrintWidth).toBe(330);
            expect(errorSpy).toHaveBeenCalled();
        });

        it('config thiếu key thiết yếu (shallow) → fallback default + warn', () => {
            localStorage.setItem('decalConfig', JSON.stringify({
                progressiveTiers: [{ upTo: 1, price: 100 }],
                decalCosts: { 'Decal giấy': 0 },
                // không có basePrintWidth → shallow fail
            }));
            const cfg = loadDecalConfig();
            expect(cfg.basePrintWidth).toBe(330);  // = default
            expect(warnSpy).toHaveBeenCalled();
        });

        it('config pass shallow nhưng FAIL deep schema → fallback default + warn (TASK-0005.5)', () => {
            const bad = structuredClone(DECAL_DEFAULT_CONFIG);
            bad.progressiveTiers[0].price = 'abc';
            localStorage.setItem('decalConfig', JSON.stringify(bad));
            const cfg = loadDecalConfig();
            // Fallback default → price phải = 100000 (default), không phải "abc"
            expect(cfg.progressiveTiers[0].price).toBe(100000);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('roundtrip: save valid → load → identical', () => {
            saveDecalConfig(DECAL_DEFAULT_CONFIG);
            const loaded = loadDecalConfig();
            expect(loaded.basePrintWidth).toBe(DECAL_DEFAULT_CONFIG.basePrintWidth);
            expect(loaded.laminationCost).toBe(DECAL_DEFAULT_CONFIG.laminationCost);
            expect(loaded.progressiveTiers.length).toBe(DECAL_DEFAULT_CONFIG.progressiveTiers.length);
            // Infinity được restore từ null khi đọc lại
            const lastTier = loaded.progressiveTiers[loaded.progressiveTiers.length - 1];
            expect(lastTier.upTo).toBe(Infinity);
            expect(lastTier.price).toBe(2200);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveConfigToCloud (async, decal branch)', () => {
        beforeEach(() => {
            setAppsScriptUrl(''); // Tắt cloud để không gọi fetch
        });

        it('decalConfig invalid → {local:false, cloud:false, error}, KHÔNG ghi localStorage', async () => {
            const r = await saveConfigToCloud('decalConfig', { foo: 'bar' }, 'pw');
            expect(r.local).toBe(false);
            expect(r.cloud).toBe(false);
            expect(r.error).toMatch(/invalid/i);
            expect(localStorage.getItem('decalConfig')).toBeNull();
        });

        it('decalConfig valid + cloud disabled → {local:true, cloud:false}', async () => {
            const r = await saveConfigToCloud('decalConfig', DECAL_DEFAULT_CONFIG, 'pw');
            expect(r.local).toBe(true);
            expect(r.cloud).toBe(false);
            expect(localStorage.getItem('decalConfig')).not.toBeNull();
        });

        it('decalConfig null → bị chặn ngay', async () => {
            const r = await saveConfigToCloud('decalConfig', null, 'pw');
            expect(r.local).toBe(false);
            expect(r.cloud).toBe(false);
            expect(r.error).toBeDefined();
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('Backward compat: module khác không bị gate validation decal', () => {
        beforeEach(() => {
            setAppsScriptUrl('');
        });

        it('saveConfigToCloud("printConfig", invalid) vẫn ghi localStorage (chưa gate)', async () => {
            // printConfig chưa có validation riêng — TASK-0005.5 chỉ áp dụng decal.
            const r = await saveConfigToCloud('printConfig', { foo: 'bar' }, 'pw');
            expect(r.local).toBe(true);  // vẫn ghi
            expect(localStorage.getItem('printConfig')).not.toBeNull();
        });
    });
});
