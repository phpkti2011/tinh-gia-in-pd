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
const { loadConfig, saveConfig, saveConfigToCloud } =
    await import('../../src/utils/configStorage.js');
const { DEFAULT_CONFIG } = await import('../../src/modules/small-print/config/index.js');

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
            expect(cfg.LAMINATION_CONFIG.WIDTH).toBe(32); // = default
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
            expect(loaded.PROFIT_MARGIN_TIERS.length).toBe(
                DEFAULT_CONFIG.PROFIT_MARGIN_TIERS.length
            );
            // Infinity restored từ null
            const lastTier = loaded.PROFIT_MARGIN_TIERS[loaded.PROFIT_MARGIN_TIERS.length - 1];
            expect(lastTier.max_cost).toBe(Infinity);
            expect(lastTier.margin).toBe(0.55);
        });
    });

    // ─────────────────────────────────────────────────────────────────────
    describe('saveConfigToCloud (async, printConfig branch)', () => {
        // P2-05.6: Apps Script đã xoá → không cần setAppsScriptUrl('') để tắt cloud.
        // saveConfigToCloud chỉ còn 2 args.

        it('printConfig invalid → {local:false, cloud:false, error}, KHÔNG ghi localStorage', async () => {
            const r = await saveConfigToCloud('printConfig', { foo: 'bar' });
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

    // ─────────────────────────────────────────────────────────────────────
    describe('withMountingDefaults — bơm lại kiểu bồi còn thiếu (v1.5.0)', () => {
        // Merge config ở configStorage chỉ NÔNG cấp 1. MOUNTING_CONFIG là key cấp 1, nên
        // config admin lưu trước v1.5.0 (chỉ có `yes`) sẽ NUỐT TRỌN object mặc định ⇒
        // MOUNTING_CONFIG['3_lop'] thành undefined và công bồi 3 lớp thành 0đ trong im lặng.
        it('config đã lưu chỉ có bồi 2 lớp → loadConfig trả về CÓ bồi 3 lớp', () => {
            const legacy = structuredClone(DEFAULT_CONFIG);
            delete legacy.MOUNTING_CONFIG['3_lop'];
            expect(saveConfig(legacy)).toBe(true);

            const loaded = loadConfig();
            expect(loaded.MOUNTING_CONFIG['3_lop']).toBeDefined();
            expect(loaded.MOUNTING_CONFIG['3_lop'].cost_tiers.length).toBeGreaterThan(0);
        });

        it('bơm lại giữ nguyên Infinity ở bậc cuối (không thành null)', () => {
            const legacy = structuredClone(DEFAULT_CONFIG);
            delete legacy.MOUNTING_CONFIG['3_lop'];
            saveConfig(legacy);

            const m = loadConfig().MOUNTING_CONFIG['3_lop'];
            expect(m.cost_tiers[m.cost_tiers.length - 1].max_qty).toBe(Infinity);
            expect(m.customer_tiers[m.customer_tiers.length - 1].max_qty).toBe(Infinity);
        });

        it('KHÔNG đè bảng 2 lớp admin đã chỉnh', () => {
            const legacy = structuredClone(DEFAULT_CONFIG);
            delete legacy.MOUNTING_CONFIG['3_lop'];
            legacy.MOUNTING_CONFIG.yes.cost_tiers[0].price = 77000;
            saveConfig(legacy);

            expect(loadConfig().MOUNTING_CONFIG.yes.cost_tiers[0].price).toBe(77000);
        });

        it('config đã có đủ 2 kiểu → giữ nguyên, không đụng gì', () => {
            const edited = structuredClone(DEFAULT_CONFIG);
            edited.MOUNTING_CONFIG['3_lop'].cost_tiers[0].price = 88000;
            saveConfig(edited);

            expect(loadConfig().MOUNTING_CONFIG['3_lop'].cost_tiers[0].price).toBe(88000);
        });
    });

    // ──────────────────────────────────────────────────────────────────
    describe('withPaperReferenceDefaults — bơm lại mức giá sàn còn thiếu (v1.8.0)', () => {
        // Cùng bẫy mẫu trên: PAPER_REFERENCE_CONFIG là key cấp 1, nên config admin đã lưu
        // trước v1.8.0 NUỐT TRỌN object mặc định ⇒ minPrintOnlyPricePerPage undefined ⇒ giá
        // sàn TẮT TRONG IM LẮNG đúng trên máy dùng lâu nhất, máy dev vẫn thấy sàn chạy ngon.
        it('config đã lưu thiếu sàn "chỉ in" → loadConfig trả về CÓ, đúng mặc định', () => {
            const legacy = structuredClone(DEFAULT_CONFIG);
            delete legacy.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage;
            expect(saveConfig(legacy)).toBe(true);

            expect(loadConfig().PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage).toBe(
                DEFAULT_CONFIG.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage
            );
        });

        it('thiếu hẳn PAPER_REFERENCE_CONFIG → bơm nguyên cụm', () => {
            const legacy = structuredClone(DEFAULT_CONFIG);
            delete legacy.PAPER_REFERENCE_CONFIG;
            saveConfig(legacy);

            const ref = loadConfig().PAPER_REFERENCE_CONFIG;
            expect(ref.minPrintPricePerPage).toBeGreaterThan(0);
            expect(ref.minPrintOnlyPricePerPage).toBeGreaterThan(0);
        });

        it('admin đặt sàn = 0 (TẮT có chủ đích) → GIỮ NGUYÊN 0, không bị bật lại', () => {
            // Chốt chặn `=== undefined` thay vì falsy. Dùng falsy thì mỗi lần nạp lại là sàn
            // tự bật sau lưng admin, giá khách bị nâng mà không ai hiểu vì sao.
            const off = structuredClone(DEFAULT_CONFIG);
            off.PAPER_REFERENCE_CONFIG.minPrintPricePerPage = 0;
            off.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage = 0;
            saveConfig(off);

            const ref = loadConfig().PAPER_REFERENCE_CONFIG;
            expect(ref.minPrintPricePerPage).toBe(0);
            expect(ref.minPrintOnlyPricePerPage).toBe(0);
        });

        it('KHÔNG đè mức sàn admin đã chỉnh', () => {
            const edited = structuredClone(DEFAULT_CONFIG);
            edited.PAPER_REFERENCE_CONFIG.minPrintPricePerPage = 1800;
            delete edited.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage;
            saveConfig(edited);

            const ref = loadConfig().PAPER_REFERENCE_CONFIG;
            expect(ref.minPrintPricePerPage).toBe(1800);
            expect(ref.minPrintOnlyPricePerPage).toBeGreaterThan(0);
        });

        it('giữ nguyên giấy chuẩn và tỉ lệ chia sẻ admin đang dùng', () => {
            const edited = structuredClone(DEFAULT_CONFIG);
            edited.PAPER_REFERENCE_CONFIG.adjustmentRatio = 0.7;
            delete edited.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage;
            saveConfig(edited);

            expect(loadConfig().PAPER_REFERENCE_CONFIG.adjustmentRatio).toBe(0.7);
        });
    });

    // Backward-compat describe block removed in TASK-0017:
    // largePrintConfig đã được gate ở TASK-0017 → không còn module nào "ungated"
    // để test backward compat. All 4 module config đều đã wire validation.
});
