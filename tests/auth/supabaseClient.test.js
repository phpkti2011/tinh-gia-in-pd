// Smoke test cho src/lib/supabaseClient.js (P2-01).
//
// Test environment KHÔNG set VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// → isSupabaseConfigured() phải return false (không crash, không throw).
//
// LƯU Ý: dùng dynamic import để spy console.warn TRƯỚC khi module được evaluate
// (top-level static import chạy trước beforeAll → spy bắt không kịp).

import { describe, it, expect, vi } from 'vitest';

describe('P2-01: supabaseClient', () => {
    it('isSupabaseConfigured() = false khi test env thiếu VITE_SUPABASE_URL/KEY', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { isSupabaseConfigured } = await import('../../src/lib/supabaseClient.js');
        expect(isSupabaseConfigured()).toBe(false);
    });

    it('supabase = null khi thiếu env (không crash khi import)', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {});
        const { supabase } = await import('../../src/lib/supabaseClient.js');
        expect(supabase).toBeNull();
    });

    it('console.warn được gọi khi load module với env thiếu', async () => {
        // Reset module cache để client.js chạy lại fresh và trigger warn
        vi.resetModules();
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await import('../../src/lib/supabaseClient.js');
        expect(warnSpy).toHaveBeenCalled();
        const warnMsg = warnSpy.mock.calls[0]?.[0] || '';
        expect(warnMsg).toMatch(/Supabase/);
        expect(warnMsg).toMatch(/VITE_SUPABASE_URL|VITE_SUPABASE_ANON_KEY/);
    });
});
