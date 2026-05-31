// @vitest-environment jsdom
//
// Test cho P2-05.3 + P2-05.6 — wire READ config từ Supabase vào loadConfigFromCloud.
//
// P2-05.6: Apps Script fallback đã được REMOVE. Priority order còn lại:
// Supabase → localStorage → default.
//
// Mock priceConfigStore.loadConfigFromSupabase để test 3 trường hợp:
//   - Supabase trả valid data → cache localStorage + return.
//   - Supabase null/invalid/error → fallback localStorage.
//   - localStorage cũng không có → fallback default.

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

beforeAll(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// Mock priceConfigStore — vi.mock hoisted
const mockLoadSupabase = vi.fn();

vi.mock('../../src/lib/priceConfigStore.js', () => ({
    loadConfigFromSupabase: (...args) => mockLoadSupabase(...args),
}));

// P2-05.6: cloudSync.js đã bị xoá → KHÔNG mock cloudSync nữa.

// Import sau khi mock setup
import { loadConfigFromCloud } from '../../src/utils/configStorage.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';
import { restoreInfinity } from '../../src/utils/restoreInfinity.js';

// VALID_DECAL_FROM_DB: dạng đã JSON-roundtripped — Infinity → null (mô phỏng
// data trả từ Supabase jsonb). Code sẽ restoreInfinity nó.
const VALID_DECAL_FROM_DB = JSON.parse(JSON.stringify(DECAL_DEFAULT_CONFIG));
// VALID_DECAL_RESTORED: sau khi code chạy restoreInfinity → có Infinity trở lại.
// Đây là shape KÝ VỌNG cho `result` trả về từ loadConfigFromCloud.
const VALID_DECAL_RESTORED = restoreInfinity(VALID_DECAL_FROM_DB);
// INVALID: thiếu các key thiết yếu — fail isValidConfig.
const INVALID_DECAL = { someRandomKey: 1 };

beforeEach(() => {
    mockLoadSupabase.mockReset();
    if (typeof localStorage !== 'undefined') localStorage.clear();
});

afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('P2-05.3 + P2-05.6: configStorage.loadConfigFromCloud — Supabase only (no Apps Script)', () => {
    describe('Module mapping (moduleName → Supabase key)', () => {
        it('printConfig → small-print', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            await loadConfigFromCloud('printConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('small-print');
        });
        it('decalConfig → decal', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            await loadConfigFromCloud('decalConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('decal');
        });
        it('largePrintConfig → large-print', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            await loadConfigFromCloud('largePrintConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('large-print');
        });
        it('uvdtfConfig → uvdtf', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            await loadConfigFromCloud('uvdtfConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('uvdtf');
        });
    });

    describe('Supabase trả valid data', () => {
        it('cache localStorage + return restored data', async () => {
            mockLoadSupabase.mockResolvedValue({
                data: VALID_DECAL_FROM_DB,
                current_version: 5,
                schema_version: '1.0.0',
                updated_at: '2026-05-31T00:00:00Z',
            });

            const result = await loadConfigFromCloud('decalConfig');

            expect(result).toEqual(VALID_DECAL_RESTORED);
            // localStorage cache (JSON.stringify lại sẽ mất Infinity → null)
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            expect(cached).toEqual(VALID_DECAL_FROM_DB);
        });
    });

    describe('Fallback chain (P2-05.6): Supabase null/invalid/error → localStorage', () => {
        it('Supabase trả null → fallback localStorage (nếu có)', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            // Setup localStorage có data hợp lệ
            localStorage.setItem('decalConfig', JSON.stringify(VALID_DECAL_FROM_DB));

            const result = await loadConfigFromCloud('decalConfig');

            // localStorage → restoreInfinity → expect VALID_DECAL_RESTORED
            expect(result).toEqual(VALID_DECAL_RESTORED);
            expect(mockLoadSupabase).toHaveBeenCalledWith('decal');
        });

        it('Supabase trả {data: null} → fallback localStorage', async () => {
            mockLoadSupabase.mockResolvedValue({ data: null });
            localStorage.setItem('decalConfig', JSON.stringify(VALID_DECAL_FROM_DB));

            const result = await loadConfigFromCloud('decalConfig');
            expect(result).toEqual(VALID_DECAL_RESTORED);
        });

        it('Supabase trả invalid data → KHÔNG cache invalid, fallback localStorage', async () => {
            mockLoadSupabase.mockResolvedValue({ data: INVALID_DECAL });
            localStorage.setItem('decalConfig', JSON.stringify(VALID_DECAL_FROM_DB));

            const result = await loadConfigFromCloud('decalConfig');

            // result đến từ localStorage (sau khi Supabase invalid bị skip)
            expect(result).toEqual(VALID_DECAL_RESTORED);
            // localStorage KHÔNG bị ghi đè bằng invalid data:
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            expect(cached).toEqual(VALID_DECAL_FROM_DB);
        });

        it('Supabase throw error → fallback localStorage', async () => {
            mockLoadSupabase.mockRejectedValue(new Error('Network error'));
            localStorage.setItem('decalConfig', JSON.stringify(VALID_DECAL_FROM_DB));

            const result = await loadConfigFromCloud('decalConfig');
            expect(result).toEqual(VALID_DECAL_RESTORED);
        });
    });

    describe('Tất cả null → default', () => {
        it('Supabase null + localStorage trống → return default config', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            // localStorage trống (đã clear ở beforeEach)

            const result = await loadConfigFromCloud('decalConfig');

            // Default config có structure cơ bản
            expect(result).toBeTruthy();
            expect(result).toHaveProperty('progressiveTiers');
            expect(result).toHaveProperty('decalCosts');
            expect(result).toHaveProperty('basePrintWidth');
        });
    });

    describe('Backward compat: Supabase chưa cấu hình → app vẫn chạy', () => {
        it('Supabase trả null (env thiếu) + localStorage empty → default config', async () => {
            mockLoadSupabase.mockResolvedValue(null);

            const result = await loadConfigFromCloud('decalConfig');

            // App KHÔNG crash, trả default config
            expect(result).toHaveProperty('progressiveTiers');
        });
    });
});
