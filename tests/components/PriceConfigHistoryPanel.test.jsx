// @vitest-environment jsdom
//
// Test cho PriceConfigHistoryPanel (P3-HISTORY.1).
// Mock priceConfigStore để test UI states độc lập với Supabase.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mockLoadVersionHistory = vi.fn();
const mockLoadChangeLog = vi.fn();

vi.mock('../../src/lib/priceConfigStore.js', () => ({
    loadVersionHistory: (...args) => mockLoadVersionHistory(...args),
    loadChangeLog: (...args) => mockLoadChangeLog(...args),
}));

import PriceConfigHistoryPanel from '../../src/components/admin/PriceConfigHistoryPanel.jsx';

beforeEach(() => {
    mockLoadVersionHistory.mockReset();
    mockLoadChangeLog.mockReset();
});

afterEach(() => {
    cleanup();
});

describe('P3-HISTORY.1: PriceConfigHistoryPanel', () => {
    describe('Collapsed (default state)', () => {
        it('chỉ hiển thị toggle button "Lịch sử chỉnh giá", không fetch', () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);

            expect(screen.getByText(/lịch sử chỉnh giá/i)).toBeTruthy();
            // Chưa expand → loader chưa được gọi
            expect(mockLoadVersionHistory).not.toHaveBeenCalled();
            expect(mockLoadChangeLog).not.toHaveBeenCalled();
        });

        it('click toggle → expand + gọi loader với module key', async () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledWith('decal', 20);
                expect(mockLoadChangeLog).toHaveBeenCalledWith('decal', 20);
            });
        });
    });

    describe('Empty state', () => {
        it('Supabase trả [] → "Chưa có lịch sử chỉnh giá"', async () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/chưa có lịch sử chỉnh giá/i)).toBeTruthy();
            });
        });
    });

    describe('Render version history khi có data', () => {
        it('hiển thị 2 versions với version#, schema, note, time', async () => {
            mockLoadVersionHistory.mockResolvedValue([
                {
                    id: 'uuid-v2',
                    version: 2,
                    schema_version: '1.0.0',
                    note: 'Tăng giá decal',
                    created_by: '11111111-2222-3333-4444-555555555555',
                    created_at: '2026-05-31T14:30:00Z',
                },
                {
                    id: 'uuid-v1',
                    version: 1,
                    schema_version: '1.0.0',
                    note: null,
                    created_by: '11111111-2222-3333-4444-555555555555',
                    created_at: '2026-05-30T10:00:00Z',
                },
            ]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/các phiên bản đã lưu \(2\)/i)).toBeTruthy();
            });
            expect(screen.getByText('v2')).toBeTruthy();
            expect(screen.getByText('v1')).toBeTruthy();
            expect(screen.getByText('Tăng giá decal')).toBeTruthy();
            // user_id ngắn (8 ký tự đầu + …)
            expect(screen.getAllByText(/11111111…/).length).toBeGreaterThan(0);
        });

        it('không render raw JSON config data', async () => {
            const fakeData = { progressiveTiers: [{ upTo: 100, price: 5000 }], decalCosts: {} };
            mockLoadVersionHistory.mockResolvedValue([
                {
                    id: 'uuid-1',
                    version: 1,
                    schema_version: '1.0.0',
                    data: fakeData, // có thể có nhưng KHÔNG render
                    note: 'test',
                    created_by: 'user-uuid',
                    created_at: '2026-05-31T00:00:00Z',
                },
            ]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText('v1')).toBeTruthy();
            });
            // JSON values KHÔNG xuất hiện trong DOM
            expect(screen.queryByText(/progressiveTiers/)).toBeNull();
            expect(screen.queryByText(/5000/)).toBeNull();
        });
    });

    describe('Render change log khi có data', () => {
        it('hiển thị logs với action badge + old→new version', async () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([
                {
                    id: 'log-1',
                    action: 'create',
                    old_version: null,
                    new_version: 1,
                    note: 'Khởi tạo',
                    changed_by: 'admin-uuid-1',
                    created_at: '2026-05-30T10:00:00Z',
                },
                {
                    id: 'log-2',
                    action: 'update',
                    old_version: 1,
                    new_version: 2,
                    note: 'Tăng giá',
                    changed_by: 'admin-uuid-1',
                    created_at: '2026-05-31T14:30:00Z',
                },
            ]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/audit log \(2\)/i)).toBeTruthy();
            });
            expect(screen.getByText(/tạo mới/i)).toBeTruthy();
            expect(screen.getByText(/cập nhật/i)).toBeTruthy();
            expect(screen.getByText('Khởi tạo')).toBeTruthy();
            expect(screen.getByText('Tăng giá')).toBeTruthy();
        });
    });

    describe('Error handling', () => {
        it('Supabase throw → hiển thị error message + nút Tải lại', async () => {
            mockLoadVersionHistory.mockRejectedValue(new Error('Network error'));
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/không tải được lịch sử/i)).toBeTruthy();
            });
            expect(screen.getByText(/network error/i)).toBeTruthy();
            // Có ít nhất 1 nút "Tải lại" — dùng getAllByText vì khi expand có
            // sẵn toggle button trong header.
            expect(screen.getAllByText(/tải lại/i).length).toBeGreaterThan(0);
        });

        it('Supabase trả [] (chưa cấu hình) → empty state, không crash', async () => {
            // Adapter handle null Supabase gracefully → trả []
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            const result = render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/chưa có lịch sử/i)).toBeTruthy();
            });
            // Không crash
            expect(result.container).toBeTruthy();
        });
    });

    describe('Click Tải lại re-fetch', () => {
        it('Click "Tải lại" → gọi lại loaders', async () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledTimes(1);
            });

            fireEvent.click(screen.getByText(/tải lại/i));

            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledTimes(2);
                expect(mockLoadChangeLog).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Module mapping (4 keys hợp lệ)', () => {
        it.each([['small-print'], ['decal'], ['large-print'], ['uvdtf']])(
            'moduleKey=%s → loader nhận đúng key',
            async (moduleKey) => {
                mockLoadVersionHistory.mockResolvedValue([]);
                mockLoadChangeLog.mockResolvedValue([]);

                render(<PriceConfigHistoryPanel moduleKey={moduleKey} />);
                fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

                await waitFor(() => {
                    expect(mockLoadVersionHistory).toHaveBeenCalledWith(moduleKey, 20);
                    expect(mockLoadChangeLog).toHaveBeenCalledWith(moduleKey, 20);
                });
            }
        );
    });

    describe('Custom title + limit props', () => {
        it('custom title hiển thị', () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" title="Lịch sử Decal" />);
            expect(screen.getByText('Lịch sử Decal')).toBeTruthy();
        });

        it('custom limit → loader nhận đúng', async () => {
            mockLoadVersionHistory.mockResolvedValue([]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" limit={5} />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledWith('decal', 5);
            });
        });
    });
});
