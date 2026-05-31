// @vitest-environment jsdom
//
// Test cho P2-05.4 + P2-05.6 — wire SAVE config qua Supabase.
//
// P2-05.6: cloudSync.js đã bị xoá. Chỉ mock priceConfigStore.
//
// Verify:
//   - Save path đi qua Supabase only.
//   - Mapping moduleName → supabaseKey + schemaVersion đúng.
//   - Return shape {local, cloud, error, provider, newVersion}.
//   - Fallback an toàn khi Supabase fail / invalid config.

import { describe, it, expect, vi, beforeEach, afterEach, beforeAll } from 'vitest';

beforeAll(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// Mock factories — vi.mock hoisted
const mockSaveSupabase = vi.fn();
const mockLoadSupabase = vi.fn();

vi.mock('../../src/lib/priceConfigStore.js', () => ({
    loadConfigFromSupabase: (...args) => mockLoadSupabase(...args),
    saveConfigToSupabase: (...args) => mockSaveSupabase(...args),
}));

// P2-05.6: KHÔNG mock cloudSync — file đã bị xoá khỏi src/.

import { saveConfigToCloud } from '../../src/utils/configStorage.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/config/largePrintConfig.js';
import { UVDTF_DEFAULT_CONFIG } from '../../src/config/uvdtfConfig.js';

// Valid configs — dùng default trực tiếp (preserve Infinity, pass schema validator).
// LƯU Ý: KHÔNG JSON-roundtrip vì JSON.stringify(Infinity) = "null" → schema reject.
// saveConfigToCloud không mutate config nên dùng reference an toàn cho test read-only.
const VALID_DECAL = DECAL_DEFAULT_CONFIG;
const VALID_PRINT = DEFAULT_CONFIG;
const VALID_LARGE = LARGE_PRINT_DEFAULT_CONFIG;
const VALID_UVDTF = UVDTF_DEFAULT_CONFIG;
// JSON-roundtripped versions (Infinity → null) cho localStorage comparison
const VALID_DECAL_AS_JSON = JSON.parse(JSON.stringify(VALID_DECAL));
const INVALID = { someRandomKey: 1 };

beforeEach(() => {
    mockSaveSupabase.mockReset();
    mockLoadSupabase.mockReset();
    if (typeof localStorage !== 'undefined') localStorage.clear();
});

afterEach(() => {
    if (typeof localStorage !== 'undefined') localStorage.clear();
});

describe('P2-05.4: saveConfigToCloud — Supabase save path', () => {
    describe('Mapping moduleName → supabaseKey + schemaVersion', () => {
        it('printConfig → small-print + SMALL_PRINT_CONFIG_SCHEMA_VERSION', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 1 });
            await saveConfigToCloud('printConfig', VALID_PRINT);
            expect(mockSaveSupabase).toHaveBeenCalledWith(
                'small-print',
                VALID_PRINT,
                '1.0.0',
                null
            );
        });

        it('decalConfig → decal + DECAL_CONFIG_SCHEMA_VERSION', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 3 });
            await saveConfigToCloud('decalConfig', VALID_DECAL);
            expect(mockSaveSupabase).toHaveBeenCalledWith(
                'decal',
                VALID_DECAL,
                '1.0.0',
                null
            );
        });

        it('largePrintConfig → large-print + LARGE_PRINT_CONFIG_SCHEMA_VERSION', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 1 });
            await saveConfigToCloud('largePrintConfig', VALID_LARGE);
            expect(mockSaveSupabase).toHaveBeenCalledWith(
                'large-print',
                VALID_LARGE,
                '1.0.0',
                null
            );
        });

        it('uvdtfConfig → uvdtf + UVDTF_CONFIG_SCHEMA_VERSION', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 1 });
            await saveConfigToCloud('uvdtfConfig', VALID_UVDTF);
            expect(mockSaveSupabase).toHaveBeenCalledWith(
                'uvdtf',
                VALID_UVDTF,
                '1.0.0',
                null
            );
        });
    });

    describe('P2-05.6: cloudSync.js removed — chữ ký saveConfigToCloud chỉ 2 args', () => {
        it('saveConfigToCloud.length === 2 (param thứ 3 _password đã xoá)', () => {
            expect(saveConfigToCloud.length).toBe(2);
        });

        it('Save thành công gọi Supabase với đúng 4 RPC args', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 1 });
            await saveConfigToCloud('decalConfig', VALID_DECAL);
            expect(mockSaveSupabase).toHaveBeenCalledWith('decal', VALID_DECAL, '1.0.0', null);
        });
    });

    describe('Save thành công', () => {
        it('return shape mới {local, cloud, error, provider, newVersion}', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 7 });

            const result = await saveConfigToCloud('decalConfig', VALID_DECAL);
            expect(result).toEqual({
                local: true,
                cloud: true,
                error: null,
                provider: 'supabase',
                newVersion: 7,
            });
        });

        it('localStorage được ghi sau khi Supabase ok', async () => {
            mockSaveSupabase.mockResolvedValue({ ok: true, error: null, newVersion: 1 });

            await saveConfigToCloud('decalConfig', VALID_DECAL);
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            // localStorage stringify drops Infinity → so compare with JSON-roundtripped
            expect(cached).toEqual(VALID_DECAL_AS_JSON);
        });
    });

    describe('Supabase chưa cấu hình / RPC fail', () => {
        it('Supabase ok=false (chưa cấu hình env) → local: true, cloud: false, error có message', async () => {
            mockSaveSupabase.mockResolvedValue({
                ok: false,
                error: new Error('Supabase chưa cấu hình'),
                newVersion: null,
            });

            const result = await saveConfigToCloud('decalConfig', VALID_DECAL);
            expect(result.local).toBe(true);  // local vẫn ghi
            expect(result.cloud).toBe(false);
            expect(result.error).toMatch(/Supabase/);
            expect(result.provider).toBe('supabase');
            expect(result.newVersion).toBeNull();
            // localStorage vẫn được ghi (admin không mất dữ liệu trên máy)
            const cached = JSON.parse(localStorage.getItem('decalConfig'));
            expect(cached).toEqual(VALID_DECAL_AS_JSON);
        });

        it('Supabase throw → catch + local true + cloud false', async () => {
            mockSaveSupabase.mockRejectedValue(new Error('Network down'));

            const result = await saveConfigToCloud('decalConfig', VALID_DECAL);
            expect(result.local).toBe(true);
            expect(result.cloud).toBe(false);
            expect(result.error).toMatch(/Network down/);
        });

        it('Supabase RLS denied → local true + cloud false + error rõ ràng', async () => {
            mockSaveSupabase.mockResolvedValue({
                ok: false,
                error: { message: 'permission denied for table price_configs' },
                newVersion: null,
            });

            const result = await saveConfigToCloud('decalConfig', VALID_DECAL);
            expect(result.local).toBe(true);
            expect(result.cloud).toBe(false);
            expect(result.error).toMatch(/permission denied/);
        });
    });

    describe('Config invalid → KHÔNG gọi Supabase, local false', () => {
        it('decal invalid → return error message', async () => {
            const result = await saveConfigToCloud('decalConfig', INVALID);
            expect(result.local).toBe(false);
            expect(result.cloud).toBe(false);
            expect(result.error).toMatch(/[Dd]ecal/);
            expect(result.error).toMatch(/invalid/);
            expect(mockSaveSupabase).not.toHaveBeenCalled();
            // localStorage KHÔNG bị ghi rác:
            expect(localStorage.getItem('decalConfig')).toBeNull();
        });

        it('print invalid → return error message', async () => {
            const result = await saveConfigToCloud('printConfig', INVALID);
            expect(result.local).toBe(false);
            expect(result.error).toMatch(/[Pp]rint/);
            expect(mockSaveSupabase).not.toHaveBeenCalled();
        });

        it('uvdtf invalid → return error message', async () => {
            const result = await saveConfigToCloud('uvdtfConfig', INVALID);
            expect(result.local).toBe(false);
            expect(result.error).toMatch(/UV DTF/);
            expect(mockSaveSupabase).not.toHaveBeenCalled();
        });

        it('largePrint invalid → return error message', async () => {
            const result = await saveConfigToCloud('largePrintConfig', INVALID);
            expect(result.local).toBe(false);
            expect(result.error).toMatch(/[Ll]arge print/);
            expect(mockSaveSupabase).not.toHaveBeenCalled();
        });
    });

    describe('Unknown module', () => {
        it('moduleName lạ → return error rõ ràng, KHÔNG ghi gì', async () => {
            const result = await saveConfigToCloud('foobar', { test: 1 });
            expect(result.local).toBe(false);
            expect(result.cloud).toBe(false);
            expect(result.error).toMatch(/Unknown module/);
            expect(mockSaveSupabase).not.toHaveBeenCalled();
        });
    });
});
