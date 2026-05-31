// @vitest-environment jsdom
//
// Test cho P2-05.3 — wire READ config từ Supabase vào loadConfigFromCloud.
//
// Mock priceConfigStore.loadConfigFromSupabase + cloudSync.fetchCloudConfig
// để test 3-tier priority: Supabase → Apps Script → localStorage/default.
// Per-file jsdom env để có localStorage thật.

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

beforeAll(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// Mock factories — call vi.mock TRƯỚC khi import configStorage
const mockLoadSupabase = vi.fn();
const mockFetchCloud = vi.fn();
const mockIsCloudEnabled = vi.fn();

vi.mock('../../src/lib/priceConfigStore.js', () => ({
    loadConfigFromSupabase: (...args) => mockLoadSupabase(...args),
}));

// LƯU Ý: configStorage.js import `./cloudSync` (KHÔNG có .js extension) →
// vi.mock path phải match đúng. Vitest không tự normalize extension.
vi.mock('../../src/utils/cloudSync', async (importOriginal) => {
    // Giữ restoreInfinity thật (cần khôi phục Infinity trong default config),
    // chỉ stub network calls
    const actual = await importOriginal();
    return {
        ...actual,
        fetchCloudConfig: (...args) => mockFetchCloud(...args),
        isCloudEnabled: () => mockIsCloudEnabled(),
        saveCloudConfig: vi.fn(),
    };
});

// Import sau khi mock setup. restoreInfinity vẫn là actual (mock spread ...actual).
import { loadConfigFromCloud } from '../../src/utils/configStorage.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';
import { restoreInfinity } from '../../src/utils/cloudSync.js';

// VALID_DECAL_FROM_DB: dạng đã JSON-roundtripped — Infinity → null (mô phỏng
// data trả từ Supabase jsonb hoặc Apps Script). Code sẽ restoreInfinity nó.
const VALID_DECAL_FROM_DB = JSON.parse(JSON.stringify(DECAL_DEFAULT_CONFIG));
// VALID_DECAL_RESTORED: sau khi code chạy restoreInfinity → có Infinity trở lại.
// Đây là shape KÝ VỌNG cho `result` trả về từ loadConfigFromCloud.
const VALID_DECAL_RESTORED = restoreInfinity(VALID_DECAL_FROM_DB);
// INVALID: thiếu các key thiết yếu — fail isValidConfig.
const INVALID_DECAL = { someRandomKey: 1 };

beforeEach(() => {
    mockLoadSupabase.mockReset();
    mockFetchCloud.mockReset();
    mockIsCloudEnabled.mockReset();
    if (typeof localStorage !== 'undefined') localStorage.clear();
});

afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('P2-05.3: configStorage.loadConfigFromCloud — Supabase priority', () => {
    describe('Module mapping (moduleName → Supabase key)', () => {
        it('printConfig → small-print', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(false);
            await loadConfigFromCloud('printConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('small-print');
        });
        it('decalConfig → decal', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(false);
            await loadConfigFromCloud('decalConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('decal');
        });
        it('largePrintConfig → large-print', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(false);
            await loadConfigFromCloud('largePrintConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('large-print');
        });
        it('uvdtfConfig → uvdtf', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(false);
            await loadConfigFromCloud('uvdtfConfig');
            expect(mockLoadSupabase).toHaveBeenCalledWith('uvdtf');
        });
    });

    describe('Supabase priority: trả valid data', () => {
        it('Supabase decal valid → cache localStorage + return data (KHÔNG gọi Apps Script)', async () => {
            mockLoadSupabase.mockResolvedValue({
                data: VALID_DECAL_FROM_DB,
                current_version: 5,
                schema_version: '1.0.0',
                updated_at: '2026-05-31T00:00:00Z',
            });
            mockIsCloudEnabled.mockReturnValue(true);  // even if cloud enabled, Supabase wins
            mockFetchCloud.mockResolvedValue({ unrelated: 'data' });  // sẽ không gọi

            const result = await loadConfigFromCloud('decalConfig');

            expect(result).toEqual(VALID_DECAL_RESTORED);
            expect(mockFetchCloud).not.toHaveBeenCalled();  // Apps Script bị bỏ qua

            // localStorage cache — JSON.stringify lại làm mất Infinity → null
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            expect(cached).toEqual(VALID_DECAL_FROM_DB);
        });
    });

    describe('Fallback chain: Supabase null/invalid/error', () => {
        it('Supabase trả null → fallback Apps Script', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(true);
            // Apps Script mock — fetchCloudConfig đã được wrap với restoreInfinity
            // trong code thật, nhưng vì mình mock fetchCloudConfig → mock trả luôn data đã restored.
            mockFetchCloud.mockResolvedValue(VALID_DECAL_RESTORED);

            const result = await loadConfigFromCloud('decalConfig');

            expect(mockLoadSupabase).toHaveBeenCalledWith('decal');
            expect(mockFetchCloud).toHaveBeenCalledWith('decalConfig');
            expect(result).toEqual(VALID_DECAL_RESTORED);
        });

        it('Supabase trả {data: null} → fallback Apps Script', async () => {
            mockLoadSupabase.mockResolvedValue({ data: null });
            mockIsCloudEnabled.mockReturnValue(true);
            mockFetchCloud.mockResolvedValue(VALID_DECAL_RESTORED);

            const result = await loadConfigFromCloud('decalConfig');
            expect(mockFetchCloud).toHaveBeenCalled();
            expect(result).toEqual(VALID_DECAL_RESTORED);
        });

        it('Supabase trả invalid data (fail shallow isValidConfig) → fallback, KHÔNG cache invalid', async () => {
            mockLoadSupabase.mockResolvedValue({ data: INVALID_DECAL });
            mockIsCloudEnabled.mockReturnValue(true);
            mockFetchCloud.mockResolvedValue(VALID_DECAL_RESTORED);

            const result = await loadConfigFromCloud('decalConfig');

            expect(mockFetchCloud).toHaveBeenCalled();
            expect(result).toEqual(VALID_DECAL_RESTORED);
            // Cache từ Apps Script (KHÔNG phải từ invalid Supabase data):
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            // Apps Script cũng cache → cached.progressiveTiers tồn tại (hợp lệ)
            expect(cached).toHaveProperty('progressiveTiers');
        });

        it('Supabase throw error → fallback Apps Script', async () => {
            mockLoadSupabase.mockRejectedValue(new Error('Network error'));
            mockIsCloudEnabled.mockReturnValue(true);
            mockFetchCloud.mockResolvedValue(VALID_DECAL_RESTORED);

            const result = await loadConfigFromCloud('decalConfig');

            expect(mockFetchCloud).toHaveBeenCalled();
            expect(result).toEqual(VALID_DECAL_RESTORED);
        });
    });

    describe('Supabase + Apps Script + localStorage đều không có → default', () => {
        it('Tất cả null → return default config (deep clone)', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(false);
            // localStorage trống (đã clear ở beforeEach)

            const result = await loadConfigFromCloud('decalConfig');

            // Default config — không null, có structure cơ bản
            expect(result).toBeTruthy();
            expect(result).toHaveProperty('progressiveTiers');
            expect(result).toHaveProperty('decalCosts');
            expect(result).toHaveProperty('basePrintWidth');
        });
    });

    describe('Backward compat: Apps Script vẫn hoạt động khi Supabase chưa cấu hình', () => {
        it('Supabase null + Apps Script enabled → return Apps Script data', async () => {
            mockLoadSupabase.mockResolvedValue(null);
            mockIsCloudEnabled.mockReturnValue(true);
            mockFetchCloud.mockResolvedValue(VALID_DECAL_RESTORED);

            const result = await loadConfigFromCloud('decalConfig');

            expect(result).toEqual(VALID_DECAL_RESTORED);
            // localStorage được cache từ Apps Script (backward compat)
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            expect(cached).toHaveProperty('progressiveTiers');
        });
    });
});
