// @vitest-environment jsdom
//
// Dò bản mới cho tab đang mở.
//
// Ba ràng buộc quan trọng nhất ở file này:
//   1. Server trả TRANG HTML kèm mã 200 (SPA fallback của vercel.json khi file thiếu)
//      → TUYỆT ĐỐI không được báo có bản mới. Báo nhầm là cả tiệm bị giục tải lại vô cớ.
//   2. Mọi lỗi mạng phải IM LẶNG — nhân viên mất wifi không được thấy lỗi nào.
//   3. Tab đang ẩn thì không dò: vô ích và nện server.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { fetchNewRelease, useAppUpdate } from '../../src/components/common/useAppUpdate.js';

const RELEASE = {
    id: '2026-09-24-gia-san',
    date: '2026-09-24',
    title: 'Giá sàn cho In KTS khổ nhỏ',
    items: ['Giá báo khách không xuống dưới giá vốn'],
};

// Giả lập phản hồi của server. `type` mặc định là JSON.
function reply(body, { ok = true, type = 'application/json' } = {}) {
    return {
        ok,
        headers: { get: (k) => (k.toLowerCase() === 'content-type' ? type : null) },
        json: async () => {
            if (typeof body === 'string') throw new SyntaxError('Unexpected token <');
            return body;
        },
    };
}

const versionBody = (buildId, releases = [RELEASE]) => ({ buildId, releases });

let visibility = 'visible';

beforeEach(() => {
    visibility = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
    global.fetch = vi.fn();
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete global.fetch;
});

describe('fetchNewRelease — không kêu oan', () => {
    it('cùng buildId → null', async () => {
        global.fetch.mockResolvedValue(reply(versionBody('abc1234')));
        expect(await fetchNewRelease('abc1234')).toBeNull();
    });

    it('khác buildId → trả về đúng bản phát hành mới nhất', async () => {
        global.fetch.mockResolvedValue(reply(versionBody('moi0000')));
        expect(await fetchNewRelease('cu00000')).toEqual(RELEASE);
    });

    it('khác buildId nhưng thiếu danh sách bản phát hành → vẫn báo, có tiêu đề dự phòng', async () => {
        global.fetch.mockResolvedValue(reply({ buildId: 'moi0000' }));
        const r = await fetchNewRelease('cu00000');
        expect(r.title).toBe('Đã có bản mới');
        expect(r.items).toEqual([]);
    });
});

describe('Chốt chặn SPA fallback — trả HTML kèm mã 200', () => {
    it('content-type là text/html → KHÔNG báo bản mới', async () => {
        global.fetch.mockResolvedValue(
            reply('<!doctype html><html></html>', { type: 'text/html; charset=utf-8' })
        );
        expect(await fetchNewRelease('cu00000')).toBeNull();
    });

    it('không có content-type → KHÔNG báo', async () => {
        global.fetch.mockResolvedValue(reply(versionBody('moi0000'), { type: null }));
        expect(await fetchNewRelease('cu00000')).toBeNull();
    });
});

describe('Lỗi phải im lặng', () => {
    it.each([
        ['fetch ném', () => global.fetch.mockRejectedValue(new Error('offline'))],
        ['mã 500', () => global.fetch.mockResolvedValue(reply(versionBody('moi'), { ok: false }))],
        ['JSON hỏng', () => global.fetch.mockResolvedValue(reply('không phải json'))],
        ['thiếu buildId', () => global.fetch.mockResolvedValue(reply({ releases: [] }))],
        ['buildId rỗng', () => global.fetch.mockResolvedValue(reply({ buildId: '' }))],
        ['body null', () => global.fetch.mockResolvedValue(reply(null))],
    ])('%s → null, không ném', async (_label, setup) => {
        setup();
        await expect(fetchNewRelease('cu00000')).resolves.toBeNull();
    });
});

describe('useAppUpdate', () => {
    it('cùng bản → không báo gì', async () => {
        global.fetch.mockResolvedValue(reply(versionBody('same')));
        const { result } = renderHook(() => useAppUpdate({ buildId: 'same' }));

        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        expect(result.current.hasUpdate).toBe(false);
    });

    it('có bản mới → báo, kèm nội dung', async () => {
        global.fetch.mockResolvedValue(reply(versionBody('moi0000')));
        const { result } = renderHook(() => useAppUpdate({ buildId: 'cu00000' }));

        await waitFor(() => expect(result.current.hasUpdate).toBe(true));
        expect(result.current.newRelease.title).toBe(RELEASE.title);
    });

    it('tab đang ẩn → KHÔNG gọi mạng', async () => {
        visibility = 'hidden';
        global.fetch.mockResolvedValue(reply(versionBody('moi0000')));
        renderHook(() => useAppUpdate({ buildId: 'cu00000' }));

        await act(async () => {});
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('quay lại tab → dò lại', async () => {
        visibility = 'hidden';
        global.fetch.mockResolvedValue(reply(versionBody('moi0000')));
        const { result } = renderHook(() => useAppUpdate({ buildId: 'cu00000' }));
        await act(async () => {});
        expect(global.fetch).not.toHaveBeenCalled();

        visibility = 'visible';
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });

        await waitFor(() => expect(result.current.hasUpdate).toBe(true));
    });

    it('đã tìm thấy rồi thì THÔI dò — băng báo đã hiện, dò thêm vô ích', async () => {
        global.fetch.mockResolvedValue(reply(versionBody('moi0000')));
        const { result } = renderHook(() => useAppUpdate({ buildId: 'cu00000' }));
        await waitFor(() => expect(result.current.hasUpdate).toBe(true));

        const soLan = global.fetch.mock.calls.length;
        await act(async () => {
            document.dispatchEvent(new Event('visibilitychange'));
        });
        expect(global.fetch.mock.calls.length).toBe(soLan);
    });

    it('unmount → gỡ listener và dừng hẹn giờ, không rò', async () => {
        const offSpy = vi.spyOn(document, 'removeEventListener');
        const clearSpy = vi.spyOn(global, 'clearInterval');
        global.fetch.mockResolvedValue(reply(versionBody('same')));

        const { unmount } = renderHook(() => useAppUpdate({ buildId: 'same' }));
        await act(async () => {});
        unmount();

        expect(offSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function));
        expect(clearSpy).toHaveBeenCalled();
    });
});
