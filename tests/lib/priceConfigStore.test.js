// Smoke tests cho src/lib/priceConfigStore.js (P2-05.2).
//
// Test env không có Supabase (VITE_SUPABASE_URL/KEY thiếu) → tất cả function
// trả về graceful (null/[]/ok=false), không crash, không gọi network.
//
// Integration test (với Supabase thật + RPC save_price_config) sẽ làm ở P2-05.4
// khi wire vào SettingsPanel.

import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
    // Silence supabaseClient warn về missing env
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

import {
    isPriceConfigStoreAvailable,
    loadConfigFromSupabase,
    saveConfigToSupabase,
    loadVersionHistory,
    loadChangeLog,
    loadVersionData,
    rollbackConfigVersion,
} from '../../src/lib/priceConfigStore.js';

describe('P2-05.2: priceConfigStore', () => {
    describe('exports', () => {
        it('isPriceConfigStoreAvailable là function', () => {
            expect(typeof isPriceConfigStoreAvailable).toBe('function');
        });
        it('loadConfigFromSupabase là function', () => {
            expect(typeof loadConfigFromSupabase).toBe('function');
        });
        it('saveConfigToSupabase là function', () => {
            expect(typeof saveConfigToSupabase).toBe('function');
        });
        it('loadVersionHistory là function', () => {
            expect(typeof loadVersionHistory).toBe('function');
        });
        it('loadChangeLog là function', () => {
            expect(typeof loadChangeLog).toBe('function');
        });
        it('loadVersionData là function (P3-HISTORY.2)', () => {
            expect(typeof loadVersionData).toBe('function');
        });
        it('rollbackConfigVersion là function (P3-HISTORY.2)', () => {
            expect(typeof rollbackConfigVersion).toBe('function');
        });
    });

    describe('isPriceConfigStoreAvailable', () => {
        it('false khi Supabase chưa cấu hình (test env)', () => {
            expect(isPriceConfigStoreAvailable()).toBe(false);
        });
    });

    describe('loadConfigFromSupabase — Supabase null', () => {
        it('null khi gọi với module hợp lệ', async () => {
            expect(await loadConfigFromSupabase('decal')).toBeNull();
        });
        it('null khi module = null', async () => {
            expect(await loadConfigFromSupabase(null)).toBeNull();
        });
        it('null khi module = empty string', async () => {
            expect(await loadConfigFromSupabase('')).toBeNull();
        });
        it('null khi module = undefined', async () => {
            expect(await loadConfigFromSupabase(undefined)).toBeNull();
        });
        it('không crash — luôn resolve', async () => {
            await expect(loadConfigFromSupabase('uvdtf')).resolves.toBeNull();
        });
    });

    describe('saveConfigToSupabase — Supabase null', () => {
        it('ok=false + Error khi gọi với args hợp lệ', async () => {
            const r = await saveConfigToSupabase('decal', { test: 1 }, '1.0.0', 'note');
            expect(r.ok).toBe(false);
            expect(r.error).toBeInstanceOf(Error);
            expect(r.error.message).toMatch(/Supabase/);
            expect(r.newVersion).toBeNull();
        });
        it('ok=false + Error khi module rỗng', async () => {
            const r = await saveConfigToSupabase(null, {}, '1.0.0', null);
            expect(r.ok).toBe(false);
            expect(r.error).toBeInstanceOf(Error);
            expect(r.newVersion).toBeNull();
        });
        it('default note = null', async () => {
            const r = await saveConfigToSupabase('decal', {}, '1.0.0');
            // Cả khi không pass note, vẫn không crash
            expect(r.ok).toBe(false);
            expect(r.newVersion).toBeNull();
        });
        it('không throw', async () => {
            await expect(saveConfigToSupabase('decal', {}, '1.0.0', null)).resolves.toMatchObject({
                ok: false,
            });
        });
    });

    describe('loadVersionHistory — Supabase null', () => {
        it('[] khi Supabase chưa cấu hình + module hợp lệ', async () => {
            expect(await loadVersionHistory('decal')).toEqual([]);
        });
        it('[] khi module rỗng', async () => {
            expect(await loadVersionHistory('')).toEqual([]);
            expect(await loadVersionHistory(null)).toEqual([]);
        });
        it('default limit = 20 (không crash với arg mặc định)', async () => {
            await expect(loadVersionHistory('decal')).resolves.toEqual([]);
        });
        it('custom limit không crash', async () => {
            await expect(loadVersionHistory('decal', 5)).resolves.toEqual([]);
        });
    });

    describe('loadChangeLog — Supabase null', () => {
        it('[] khi Supabase chưa cấu hình + module hợp lệ', async () => {
            expect(await loadChangeLog('uvdtf')).toEqual([]);
        });
        it('[] khi module rỗng', async () => {
            expect(await loadChangeLog('')).toEqual([]);
        });
        it('default limit = 20', async () => {
            await expect(loadChangeLog('decal')).resolves.toEqual([]);
        });
        it('custom limit', async () => {
            await expect(loadChangeLog('decal', 100)).resolves.toEqual([]);
        });
    });
});

describe('P3-HISTORY.2: rollback adapter', () => {
    describe('loadVersionData — Supabase null', () => {
        it('null khi Supabase chưa cấu hình + versionId hợp lệ', async () => {
            expect(await loadVersionData('uuid-fake-123')).toBeNull();
        });
        it('null khi versionId rỗng / null / undefined', async () => {
            expect(await loadVersionData('')).toBeNull();
            expect(await loadVersionData(null)).toBeNull();
            expect(await loadVersionData(undefined)).toBeNull();
        });
        it('không crash — luôn resolve', async () => {
            await expect(loadVersionData('uuid-any')).resolves.toBeNull();
        });
    });

    describe('rollbackConfigVersion — Supabase null', () => {
        it('ok=false + Error khi Supabase chưa cấu hình', async () => {
            const r = await rollbackConfigVersion({
                module: 'decal',
                versionId: 'uuid-fake-123',
            });
            expect(r.ok).toBe(false);
            expect(r.error).toBeInstanceOf(Error);
            expect(r.error.message).toMatch(/Supabase/);
            expect(r.newVersion).toBeNull();
        });
        it('ok=false khi module rỗng', async () => {
            const r = await rollbackConfigVersion({
                module: '',
                versionId: 'uuid-fake-123',
            });
            expect(r.ok).toBe(false);
            expect(r.error).toBeInstanceOf(Error);
            expect(r.newVersion).toBeNull();
        });
        it('ok=false khi versionId rỗng', async () => {
            const r = await rollbackConfigVersion({
                module: 'decal',
                versionId: '',
            });
            expect(r.ok).toBe(false);
            expect(r.error).toBeInstanceOf(Error);
            expect(r.newVersion).toBeNull();
        });
        it('default note = null (không crash)', async () => {
            await expect(
                rollbackConfigVersion({ module: 'decal', versionId: 'uuid' })
            ).resolves.toMatchObject({ ok: false });
        });
        it('không throw cho any input', async () => {
            await expect(
                rollbackConfigVersion({ module: 'uvdtf', versionId: 'uuid-x', note: 'test' })
            ).resolves.toMatchObject({ ok: false });
        });
    });

    describe('saveConfigToSupabase — options.action passthrough', () => {
        it('options.action không break khi Supabase null', async () => {
            const r = await saveConfigToSupabase('decal', {}, '1.0.0', 'note', {
                action: 'rollback',
            });
            expect(r.ok).toBe(false);
            expect(r.error).toBeInstanceOf(Error);
            expect(r.newVersion).toBeNull();
        });
        it('options = {} (no action) không break — backward compat', async () => {
            await expect(
                saveConfigToSupabase('decal', {}, '1.0.0', 'note', {})
            ).resolves.toMatchObject({ ok: false });
        });
        it('options = undefined không break — backward compat', async () => {
            await expect(saveConfigToSupabase('decal', {}, '1.0.0', 'note')).resolves.toMatchObject(
                { ok: false }
            );
        });
    });
});
