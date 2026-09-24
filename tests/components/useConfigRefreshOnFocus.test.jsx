// @vitest-environment jsdom
//
// Quay lại tab → kéo lại bảng giá mới nhất.
//
// Ràng buộc chốt ở đây:
//   1. Đang ở tab Cài Đặt thì TUYỆT ĐỐI không kéo — nạp đè lúc admin đang sửa dở là mất
//      nguyên bản nháp.
//   2. Catalogue và Lò xo nạp HAI config; sót một cái là giá lệch mà không ai hiểu vì sao.
//   3. Mất mạng thì giữ giá đang có, không ném.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

const mockLoad = vi.fn();
vi.mock('../../src/utils/configStorage', () => ({
    loadConfigFromCloud: (...a) => mockLoad(...a),
}));

import { useConfigRefreshOnFocus } from '../../src/components/common/useConfigRefreshOnFocus.js';

let visibility = 'visible';

beforeEach(() => {
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    mockLoad.mockReset();
    mockLoad.mockResolvedValue({ GIA: 1 });
});
// Repo này không bật globals của Testing Library nên KHÔNG tự dọn: không gọi cleanup
// thì hook của test trước vẫn còn gắn listener và bắt chung sự kiện của test sau.
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const quayLaiTab = async () => {
    await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'));
    });
};

describe('Kéo lại khi quay về tab', () => {
    it('gọi đúng module và đưa config cho caller', async () => {
        const apply = vi.fn();
        renderHook(() => useConfigRefreshOnFocus([{ module: 'decalConfig', apply }], false));

        await quayLaiTab();

        expect(mockLoad).toHaveBeenCalledWith('decalConfig');
        expect(apply).toHaveBeenCalledWith({ GIA: 1 });
    });

    it('KHÔNG gọi lúc mount — chỉ khi quay lại tab', () => {
        renderHook(() =>
            useConfigRefreshOnFocus([{ module: 'decalConfig', apply: vi.fn() }], false)
        );
        expect(mockLoad).not.toHaveBeenCalled();
    });

    it('tab chuyển sang ẩn → không gọi', async () => {
        visibility = 'hidden';
        renderHook(() =>
            useConfigRefreshOnFocus([{ module: 'decalConfig', apply: vi.fn() }], false)
        );
        await quayLaiTab();
        expect(mockLoad).not.toHaveBeenCalled();
    });

    it('config trả null → KHÔNG đè giá đang có', async () => {
        mockLoad.mockResolvedValue(null);
        const apply = vi.fn();
        renderHook(() => useConfigRefreshOnFocus([{ module: 'decalConfig', apply }], false));

        await quayLaiTab();
        expect(apply).not.toHaveBeenCalled();
    });
});

describe('Đang ở tab Cài Đặt — không được đè bản nháp admin', () => {
    it('skip = true → không gọi dù quay lại tab', async () => {
        const apply = vi.fn();
        renderHook(() => useConfigRefreshOnFocus([{ module: 'decalConfig', apply }], true));

        await quayLaiTab();
        expect(mockLoad).not.toHaveBeenCalled();
        expect(apply).not.toHaveBeenCalled();
    });

    it('rời tab Cài Đặt → kéo lại bình thường', async () => {
        const apply = vi.fn();
        const { rerender } = renderHook(
            ({ skip }) => useConfigRefreshOnFocus([{ module: 'decalConfig', apply }], skip),
            { initialProps: { skip: true } }
        );
        await quayLaiTab();
        expect(mockLoad).not.toHaveBeenCalled();

        rerender({ skip: false });
        await quayLaiTab();
        expect(mockLoad).toHaveBeenCalledWith('decalConfig');
    });
});

describe('Module nạp HAI config', () => {
    it('Catalogue: kéo lại CẢ printConfig lẫn catalogueConfig', async () => {
        const applyPrint = vi.fn();
        const applyCat = vi.fn();
        renderHook(() =>
            useConfigRefreshOnFocus(
                [
                    { module: 'printConfig', apply: applyPrint },
                    { module: 'catalogueConfig', apply: applyCat },
                ],
                false
            )
        );

        await quayLaiTab();

        expect(mockLoad).toHaveBeenCalledWith('printConfig');
        expect(mockLoad).toHaveBeenCalledWith('catalogueConfig');
        expect(applyPrint).toHaveBeenCalled();
        expect(applyCat).toHaveBeenCalled();
    });
});

describe('Bền với rác và dọn dẹp sạch', () => {
    it('mất mạng → không ném, giá giữ nguyên', async () => {
        mockLoad.mockRejectedValue(new Error('offline'));
        const apply = vi.fn();
        renderHook(() => useConfigRefreshOnFocus([{ module: 'decalConfig', apply }], false));

        await expect(quayLaiTab()).resolves.not.toThrow();
        expect(apply).not.toHaveBeenCalled();
    });

    it.each([
        ['mảng rỗng', []],
        ['undefined', undefined],
        ['phần tử rác', [null, { module: 'x' }, { apply: vi.fn() }]],
    ])('%s → không gọi, không nổ', async (_label, entries) => {
        renderHook(() => useConfigRefreshOnFocus(entries, false));
        await expect(quayLaiTab()).resolves.not.toThrow();
        expect(mockLoad).not.toHaveBeenCalled();
    });

    it('unmount → gỡ listener', async () => {
        const off = vi.spyOn(document, 'removeEventListener');
        const { unmount } = renderHook(() =>
            useConfigRefreshOnFocus([{ module: 'decalConfig', apply: vi.fn() }], false)
        );
        unmount();
        expect(off).toHaveBeenCalledWith('visibilitychange', expect.any(Function));

        await quayLaiTab();
        expect(mockLoad).not.toHaveBeenCalled();
    });
});
