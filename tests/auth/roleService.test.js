// Smoke tests cho src/auth/roleService.js (P2-02).
//
// Test env không có Supabase (VITE_SUPABASE_URL/KEY thiếu) → getUserRole() phải
// trả null an toàn, không crash, không gọi network.

import { describe, it, expect, vi, beforeAll } from 'vitest';

beforeAll(() => {
    // Silence supabaseClient warn về missing env
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

import {
    isAdminRole,
    isValidRole,
    getUserRole,
    VALID_ROLES,
} from '../../src/auth/roleService.js';

describe('P2-02: roleService', () => {
    describe('VALID_ROLES', () => {
        it('có đúng 3 role admin/staff/viewer (theo thứ tự khai báo)', () => {
            expect(VALID_ROLES).toEqual(['admin', 'staff', 'viewer']);
        });
    });

    describe('isAdminRole — strict, case-sensitive', () => {
        it("'admin' → true", () => expect(isAdminRole('admin')).toBe(true));
        it("'staff' → false", () => expect(isAdminRole('staff')).toBe(false));
        it("'viewer' → false", () => expect(isAdminRole('viewer')).toBe(false));
        it('null → false', () => expect(isAdminRole(null)).toBe(false));
        it('undefined → false', () => expect(isAdminRole(undefined)).toBe(false));
        it("'' → false", () => expect(isAdminRole('')).toBe(false));
        it("'Admin' (case khác) → false (strict)", () => expect(isAdminRole('Admin')).toBe(false));
        it("'ADMIN' (uppercase) → false", () => expect(isAdminRole('ADMIN')).toBe(false));
        it('123 (number) → false', () => expect(isAdminRole(123)).toBe(false));
    });

    describe('isValidRole', () => {
        it("'admin' → true", () => expect(isValidRole('admin')).toBe(true));
        it("'staff' → true", () => expect(isValidRole('staff')).toBe(true));
        it("'viewer' → true", () => expect(isValidRole('viewer')).toBe(true));
        it("'superadmin' → false (không thuộc enum)", () => expect(isValidRole('superadmin')).toBe(false));
        it("'' → false", () => expect(isValidRole('')).toBe(false));
        it('null → false', () => expect(isValidRole(null)).toBe(false));
        it('123 → false', () => expect(isValidRole(123)).toBe(false));
    });

    describe('getUserRole — khi Supabase chưa cấu hình', () => {
        it('null khi Supabase null + userId hợp lệ', async () => {
            const r = await getUserRole('11111111-1111-1111-1111-111111111111');
            expect(r).toBeNull();
        });

        it('null khi userId = null', async () => {
            expect(await getUserRole(null)).toBeNull();
        });

        it('null khi userId = undefined', async () => {
            expect(await getUserRole(undefined)).toBeNull();
        });

        it('null khi userId = empty string', async () => {
            expect(await getUserRole('')).toBeNull();
        });

        it('không crash — luôn resolve (không throw)', async () => {
            await expect(getUserRole('uuid-x')).resolves.toBeNull();
        });
    });
});
