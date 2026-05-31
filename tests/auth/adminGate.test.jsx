// @vitest-environment jsdom
//
// Test cho src/auth/AdminGate.jsx (P2-03).
//
// Mock useAuth + useUserRole để test logic AdminGate độc lập với Supabase.
// Per-file jsdom env (không thay đổi vitest config global → không phá 380 test cũ).

import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';

beforeAll(() => {
    // Silence supabaseClient warn về missing env (gọi gián tiếp qua useAuth/useUserRole)
    vi.spyOn(console, 'warn').mockImplementation(() => {});
});

// Mock hooks — vi.mock được hoist lên trên cùng tự động bởi Vitest.
// Phải mock TRƯỚC khi import AdminGate (LoginPage cũng dùng cùng useAuth → mock chung).
const mockUseAuth = vi.fn();
const mockUseUserRole = vi.fn();

vi.mock('../../src/auth/useAuth.js', () => ({
    useAuth: () => mockUseAuth(),
}));
vi.mock('../../src/auth/useUserRole.js', () => ({
    useUserRole: (user) => mockUseUserRole(user),
}));

import AdminGate from '../../src/auth/AdminGate.jsx';

afterEach(() => {
    cleanup();
    mockUseAuth.mockReset();
    mockUseUserRole.mockReset();
});

// Default mock fixtures
const baseAuth = (overrides = {}) => ({
    user: null,
    session: null,
    loading: false,
    error: null,
    signIn: vi.fn(),
    signOut: vi.fn(),
    ...overrides,
});

const baseRole = (overrides = {}) => ({
    role: null,
    isAdmin: false,
    loading: false,
    error: null,
    refreshRole: vi.fn(),
    ...overrides,
});

const SECRET = 'TOP_SECRET_CHILDREN';
const renderGate = () =>
    render(
        <AdminGate>
            <div>{SECRET}</div>
        </AdminGate>
    );

describe('P2-03: AdminGate', () => {
    describe('1. Auth loading', () => {
        it('render spinner "Đang xác thực..." + không render children', () => {
            mockUseAuth.mockReturnValue(baseAuth({ loading: true }));
            mockUseUserRole.mockReturnValue(baseRole());
            renderGate();
            expect(screen.getByText(/đang xác thực/i)).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });
    });

    describe('2. Chưa login', () => {
        it('render LoginPage (form đăng nhập) + không render children', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: null }));
            mockUseUserRole.mockReturnValue(baseRole());
            renderGate();
            // LoginPage có h2 "Đăng nhập Admin"
            expect(screen.getByText(/đăng nhập admin/i)).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });
    });

    describe('3. Login, role đang loading', () => {
        it('render "Đang kiểm tra quyền..." + hiển thị email user', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: { id: 'u1', email: 'a@b.com' } }));
            mockUseUserRole.mockReturnValue(baseRole({ loading: true }));
            renderGate();
            expect(screen.getByText(/đang kiểm tra quyền/i)).toBeTruthy();
            expect(screen.getByText('a@b.com')).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });
    });

    describe('4. Role query lỗi', () => {
        it('render error message + nút Đăng xuất', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: { id: 'u1', email: 'a@b' } }));
            mockUseUserRole.mockReturnValue(baseRole({ error: 'Network error' }));
            renderGate();
            expect(screen.getByText(/không kiểm tra được quyền/i)).toBeTruthy();
            expect(screen.getByText(/network error/i)).toBeTruthy();
            expect(screen.getByText(/đăng xuất/i)).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });
    });

    describe('5. Login nhưng không phải admin', () => {
        it('role = staff → deny + Đăng xuất + không render children', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: { id: 'u1', email: 'staff@x' } }));
            mockUseUserRole.mockReturnValue(baseRole({ role: 'staff' }));
            renderGate();
            expect(screen.getByText(/không có quyền admin/i)).toBeTruthy();
            expect(screen.getByText('staff')).toBeTruthy();
            expect(screen.getByText(/đăng xuất/i)).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });

        it('role = viewer → deny + không render children', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: { id: 'u1', email: 'v@x' } }));
            mockUseUserRole.mockReturnValue(baseRole({ role: 'viewer' }));
            renderGate();
            expect(screen.getByText(/không có quyền admin/i)).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });

        it('role = null (chưa gán) → deny + hiển thị "(chưa gán)"', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: { id: 'u1', email: 'new@x' } }));
            mockUseUserRole.mockReturnValue(baseRole({ role: null }));
            renderGate();
            expect(screen.getByText(/không có quyền admin/i)).toBeTruthy();
            expect(screen.getByText(/chưa gán/i)).toBeTruthy();
            expect(screen.queryByText(SECRET)).toBeNull();
        });
    });

    describe('6. Login + role admin', () => {
        it('render children + status badge "🔓 Admin: <email>"', () => {
            mockUseAuth.mockReturnValue(baseAuth({ user: { id: 'u1', email: 'admin@co.vn' } }));
            mockUseUserRole.mockReturnValue(baseRole({ role: 'admin', isAdmin: true }));
            renderGate();
            expect(screen.getByText(SECRET)).toBeTruthy();
            expect(screen.getByText(/admin@co\.vn/i)).toBeTruthy();
            expect(screen.getByText(/đăng xuất/i)).toBeTruthy();
        });
    });

    describe('7. Supabase chưa cấu hình env', () => {
        it('useAuth trả null/loading=false → render LoginPage (không crash)', () => {
            // Simulate: Supabase env thiếu → useAuth hết loading nhưng user vẫn null
            mockUseAuth.mockReturnValue(baseAuth({ user: null, loading: false }));
            mockUseUserRole.mockReturnValue(baseRole());
            // Phải không throw, render bình thường
            expect(() => renderGate()).not.toThrow();
            expect(screen.getByText(/đăng nhập admin/i)).toBeTruthy();
        });
    });
});
