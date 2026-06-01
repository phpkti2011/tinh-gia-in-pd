// @vitest-environment jsdom
//
// Test cho PriceConfigHistoryPanel (P3-HISTORY.1).
// Mock priceConfigStore để test UI states độc lập với Supabase.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const mockLoadVersionHistory = vi.fn();
const mockLoadChangeLog = vi.fn();
const mockRollbackConfigVersion = vi.fn();

vi.mock('../../src/lib/priceConfigStore.js', () => ({
    loadVersionHistory: (...args) => mockLoadVersionHistory(...args),
    loadChangeLog: (...args) => mockLoadChangeLog(...args),
    rollbackConfigVersion: (...args) => mockRollbackConfigVersion(...args),
}));

import PriceConfigHistoryPanel from '../../src/components/admin/PriceConfigHistoryPanel.jsx';

beforeEach(() => {
    mockLoadVersionHistory.mockReset();
    mockLoadChangeLog.mockReset();
    mockRollbackConfigVersion.mockReset();
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

            // "Tải lại" có thể xuất hiện ở footer ("Tải lại trang…") nên pick
            // chính xác button (không match span/p).
            const reloadBtn = screen
                .getAllByRole('button')
                .find((b) => b.textContent === 'Tải lại');
            fireEvent.click(reloadBtn);

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

describe('P3-HISTORY.2: PriceConfigHistoryPanel rollback', () => {
    const twoVersions = [
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
            note: 'Khởi tạo',
            created_by: '11111111-2222-3333-4444-555555555555',
            created_at: '2026-05-30T10:00:00Z',
        },
    ];

    let confirmSpy;
    beforeEach(() => {
        confirmSpy = vi.spyOn(window, 'confirm');
    });
    afterEach(() => {
        confirmSpy.mockRestore();
    });

    describe('Render rollback button', () => {
        it('version mới nhất (idx 0) KHÔNG có nút rollback, version cũ CÓ', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/hiện tại/i)).toBeTruthy();
            });
            // Chỉ 1 nút "Rollback về v1" (cho version cũ), không có "Rollback về v2"
            expect(screen.queryByText(/rollback về v1/i)).toBeTruthy();
            expect(screen.queryByText(/rollback về v2/i)).toBeNull();
        });

        it('chỉ có 1 version → không có nút rollback nào (idx 0 = latest)', async () => {
            mockLoadVersionHistory.mockResolvedValue([twoVersions[0]]);
            mockLoadChangeLog.mockResolvedValue([]);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText('v2')).toBeTruthy();
            });
            expect(screen.queryByText(/rollback về/i)).toBeNull();
        });
    });

    describe('Confirm dialog gate', () => {
        it('user cancel confirm → KHÔNG gọi rollbackConfigVersion', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(false);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback về v1/i)).toBeTruthy();
            });

            fireEvent.click(screen.getByText(/rollback về v1/i));

            expect(confirmSpy).toHaveBeenCalledTimes(1);
            expect(mockRollbackConfigVersion).not.toHaveBeenCalled();
        });

        it('confirm dialog có message chứa version# + module', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(false);

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback về v1/i)).toBeTruthy();
            });
            fireEvent.click(screen.getByText(/rollback về v1/i));

            const msg = confirmSpy.mock.calls[0][0];
            expect(msg).toMatch(/decal/i);
            expect(msg).toMatch(/v1/);
        });
    });

    describe('Success flow', () => {
        it('confirm OK → gọi rollbackConfigVersion với module + versionId + note', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(true);
            mockRollbackConfigVersion.mockResolvedValue({
                ok: true,
                error: null,
                newVersion: 3,
            });

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback về v1/i)).toBeTruthy();
            });

            fireEvent.click(screen.getByText(/rollback về v1/i));

            await waitFor(() => {
                expect(mockRollbackConfigVersion).toHaveBeenCalledWith({
                    module: 'decal',
                    versionId: 'uuid-v1',
                    note: 'Rollback về v1',
                });
            });
        });

        it('success → show success message + reload history', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(true);
            mockRollbackConfigVersion.mockResolvedValue({
                ok: true,
                error: null,
                newVersion: 3,
            });

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledTimes(1);
            });

            fireEvent.click(screen.getByText(/rollback về v1/i));

            await waitFor(() => {
                expect(screen.getByText(/đã rollback thành công/i)).toBeTruthy();
            });
            expect(screen.getByText(/v3/)).toBeTruthy();
            // Reload đã gọi lại loaders → 2 lần total
            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledTimes(2);
                expect(mockLoadChangeLog).toHaveBeenCalledTimes(2);
            });
        });
    });

    describe('Error flow', () => {
        it('adapter trả ok=false → hiển thị error banner, KHÔNG reload', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(true);
            mockRollbackConfigVersion.mockResolvedValue({
                ok: false,
                error: new Error('RLS deny'),
                newVersion: null,
            });

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(mockLoadVersionHistory).toHaveBeenCalledTimes(1);
            });

            fireEvent.click(screen.getByText(/rollback về v1/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback thất bại/i)).toBeTruthy();
            });
            expect(screen.getByText(/RLS deny/i)).toBeTruthy();
            // KHÔNG reload (vẫn 1 lần)
            expect(mockLoadVersionHistory).toHaveBeenCalledTimes(1);
        });

        it('adapter throw → hiển thị exception message', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(true);
            mockRollbackConfigVersion.mockRejectedValue(new Error('Network down'));

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback về v1/i)).toBeTruthy();
            });

            fireEvent.click(screen.getByText(/rollback về v1/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback exception/i)).toBeTruthy();
            });
            expect(screen.getByText(/network down/i)).toBeTruthy();
        });

        it('user có thể đóng error banner bằng nút ✕', async () => {
            mockLoadVersionHistory.mockResolvedValue(twoVersions);
            mockLoadChangeLog.mockResolvedValue([]);
            confirmSpy.mockReturnValue(true);
            mockRollbackConfigVersion.mockResolvedValue({
                ok: false,
                error: new Error('fail'),
                newVersion: null,
            });

            render(<PriceConfigHistoryPanel moduleKey="decal" />);
            fireEvent.click(screen.getByText(/lịch sử chỉnh giá/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback về v1/i)).toBeTruthy();
            });
            fireEvent.click(screen.getByText(/rollback về v1/i));

            await waitFor(() => {
                expect(screen.getByText(/rollback thất bại/i)).toBeTruthy();
            });

            fireEvent.click(screen.getByLabelText(/đóng thông báo/i));

            // Banner biến mất
            expect(screen.queryByText(/rollback thất bại/i)).toBeNull();
        });
    });
});
