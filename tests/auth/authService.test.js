// Smoke test cho src/auth/authService.js (P2-01).
//
// Test environment không có Supabase env → tất cả function phải:
//   - export đầy đủ
//   - không crash khi gọi
//   - trả về shape phù hợp (null / { error } / subscription stub)

import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
    // Silence supabaseClient warn về missing env
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

import {
    getCurrentSession,
    signInWithPassword,
    signOut,
    onAuthStateChange,
} from '../../src/auth/authService.js';

describe('P2-01: authService', () => {
    describe('export đủ 4 function', () => {
        it('getCurrentSession là function', () => {
            expect(typeof getCurrentSession).toBe('function');
        });
        it('signInWithPassword là function', () => {
            expect(typeof signInWithPassword).toBe('function');
        });
        it('signOut là function', () => {
            expect(typeof signOut).toBe('function');
        });
        it('onAuthStateChange là function', () => {
            expect(typeof onAuthStateChange).toBe('function');
        });
    });

    describe('behavior khi Supabase chưa cấu hình (test env)', () => {
        it('getCurrentSession() → null (không crash)', async () => {
            const s = await getCurrentSession();
            expect(s).toBeNull();
        });

        it('signInWithPassword(email, pw) → {data: null, error: Error}', async () => {
            const r = await signInWithPassword('test@x.com', 'pw');
            expect(r.data).toBeNull();
            expect(r.error).toBeInstanceOf(Error);
            expect(r.error.message).toMatch(/Supabase/);
        });

        it('signOut() → {error: null}', async () => {
            const r = await signOut();
            expect(r.error).toBeNull();
        });

        it('onAuthStateChange(cb) → subscription stub với unsubscribe noop', () => {
            const cb = vi.fn();
            const r = onAuthStateChange(cb);
            expect(r?.data?.subscription).toBeDefined();
            expect(typeof r.data.subscription.unsubscribe).toBe('function');
            // Callback KHÔNG được gọi tự động khi Supabase null
            expect(cb).not.toHaveBeenCalled();
            // unsubscribe không throw
            expect(() => r.data.subscription.unsubscribe()).not.toThrow();
        });
    });
});
