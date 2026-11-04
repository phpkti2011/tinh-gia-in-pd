// @vitest-environment jsdom
//
// Hai chỗ báo bản mới: băng đáy màn hình, và bảng "Đã cập nhật" sau khi tải lại.
//
// Ràng buộc chốt ở đây:
//   - Lần đầu mở trên một máy (chưa có dấu đã-xem) thì KHÔNG hiện bảng changelog.
//   - Đóng bảng rồi thì ghi nhớ, mở lại không hiện nữa.
//   - Không đóng thì bảng tự tắt sau 24 giờ kể từ lúc máy này thấy nó lần đầu.
//   - localStorage ném (chế độ riêng tư) cũng KHÔNG được làm vỡ app.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';

const mockUpdate = { newRelease: null, hasUpdate: false };

vi.mock('../../src/components/common/useAppUpdate', () => ({
    useAppUpdate: () => mockUpdate,
}));

import { UpdateBanner, WhatsNewNotice } from '../../src/components/common/UpdateBanner.jsx';
import { RELEASE_NOTES, CURRENT_RELEASE } from '../../src/releaseNotes.js';

const SEEN_KEY = 'lastSeenReleaseId';

beforeEach(() => {
    localStorage.clear();
    mockUpdate.newRelease = null;
    mockUpdate.hasUpdate = false;
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const body = () => document.body.textContent.replace(/\s+/g, ' ');

describe('UpdateBanner — băng đáy', () => {
    it('chưa có bản mới → không hiện gì', () => {
        render(<UpdateBanner />);
        expect(screen.queryByTestId('update-banner')).toBeNull();
    });

    it('có bản mới → hiện tiêu đề và từng gạch đầu dòng', () => {
        mockUpdate.hasUpdate = true;
        mockUpdate.newRelease = {
            id: 'x',
            date: '2026-09-24',
            title: 'Giá sàn In KTS khổ nhỏ',
            items: ['Giá báo khách không xuống dưới giá vốn', 'Thêm Bế Formex'],
        };
        render(<UpdateBanner />);

        expect(screen.getByTestId('update-banner')).toBeTruthy();
        expect(body()).toContain('Đã có bản mới');
        expect(body()).toContain('Giá sàn In KTS khổ nhỏ');
        expect(body()).toContain('Giá báo khách không xuống dưới giá vốn');
        expect(body()).toContain('Thêm Bế Formex');
    });

    it('bấm Tải lại → gọi reload', () => {
        const reload = vi.fn();
        Object.defineProperty(window, 'location', {
            value: { ...window.location, reload },
            writable: true,
        });
        mockUpdate.hasUpdate = true;
        mockUpdate.newRelease = { id: 'x', date: '', title: 'Bản mới', items: [] };
        render(<UpdateBanner />);

        fireEvent.click(screen.getByText('Tải lại'));
        expect(reload).toHaveBeenCalled();
    });

    it('neo ở ĐÁY, không đè thanh dính top-0 của hai module chính', () => {
        mockUpdate.hasUpdate = true;
        mockUpdate.newRelease = { id: 'x', date: '', title: 'Bản mới', items: [] };
        render(<UpdateBanner />);

        const cls = screen.getByTestId('update-banner').className;
        expect(cls).toContain('bottom-0');
        expect(cls).not.toContain('top-0');
    });

    it('không có nút tắt — còn đó tới khi tải lại', () => {
        mockUpdate.hasUpdate = true;
        mockUpdate.newRelease = { id: 'x', date: '', title: 'Bản mới', items: [] };
        render(<UpdateBanner />);
        expect(screen.queryByLabelText('Đóng thông báo')).toBeNull();
    });
});

describe('WhatsNewNotice — bảng "Đã cập nhật"', () => {
    it('LẦN ĐẦU trên máy → KHÔNG hiện, chỉ ghi nhận', () => {
        render(<WhatsNewNotice />);
        expect(screen.queryByTestId('whats-new')).toBeNull();
        expect(localStorage.getItem(SEEN_KEY)).toBe(CURRENT_RELEASE.id);
    });

    it('đã xem đúng bản hiện tại → không hiện', () => {
        localStorage.setItem(SEEN_KEY, CURRENT_RELEASE.id);
        render(<WhatsNewNotice />);
        expect(screen.queryByTestId('whats-new')).toBeNull();
    });

    it('đã xem bản cũ hơn → hiện, kèm nội dung bản mới', () => {
        localStorage.setItem(SEEN_KEY, RELEASE_NOTES[RELEASE_NOTES.length - 1].id);
        render(<WhatsNewNotice />);

        expect(screen.getByTestId('whats-new')).toBeTruthy();
        expect(body()).toContain('Đã cập nhật lên bản mới');
        expect(body()).toContain(CURRENT_RELEASE.title);
    });

    it('dấu đã-xem lạ (bản đã xoá khỏi danh sách) → chỉ hiện bản hiện tại, không đổ cả lịch sử', () => {
        localStorage.setItem(SEEN_KEY, 'khong-ton-tai');
        render(<WhatsNewNotice />);

        expect(screen.getByTestId('whats-new')).toBeTruthy();
        expect(body()).toContain(CURRENT_RELEASE.title);
    });

    it('đóng → ghi nhớ và không hiện lại', () => {
        localStorage.setItem(SEEN_KEY, RELEASE_NOTES[RELEASE_NOTES.length - 1].id);
        render(<WhatsNewNotice />);
        fireEvent.click(screen.getByLabelText('Đóng thông báo'));

        expect(screen.queryByTestId('whats-new')).toBeNull();
        expect(localStorage.getItem(SEEN_KEY)).toBe(CURRENT_RELEASE.id);

        cleanup();
        render(<WhatsNewNotice />);
        expect(screen.queryByTestId('whats-new')).toBeNull();
    });

    describe('tự tắt sau 24 giờ', () => {
        const SHOWN_AT_KEY = 'whatsNewShownAt';
        const OLD = () => RELEASE_NOTES[RELEASE_NOTES.length - 1].id;
        const H = 60 * 60 * 1000;
        const NOW = new Date('2026-10-06T08:00:00Z').getTime();

        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(NOW);
        });
        afterEach(() => {
            vi.useRealTimers();
        });

        const markShown = (hoursAgo, id = CURRENT_RELEASE.id) =>
            localStorage.setItem(SHOWN_AT_KEY, JSON.stringify({ id, at: NOW - hoursAgo * H }));

        it('lần đầu thấy → ghi lại mốc thời gian và hiện', () => {
            localStorage.setItem(SEEN_KEY, OLD());
            render(<WhatsNewNotice />);

            expect(screen.getByTestId('whats-new')).toBeTruthy();
            expect(JSON.parse(localStorage.getItem(SHOWN_AT_KEY))).toEqual({
                id: CURRENT_RELEASE.id,
                at: NOW,
            });
        });

        it('mới thấy 23 giờ trước → vẫn hiện', () => {
            localStorage.setItem(SEEN_KEY, OLD());
            markShown(23);
            render(<WhatsNewNotice />);
            expect(screen.getByTestId('whats-new')).toBeTruthy();
        });

        it('đã thấy 25 giờ trước → không hiện, ghi nhận đã xem', () => {
            localStorage.setItem(SEEN_KEY, OLD());
            markShown(25);
            render(<WhatsNewNotice />);

            expect(screen.queryByTestId('whats-new')).toBeNull();
            expect(localStorage.getItem(SEEN_KEY)).toBe(CURRENT_RELEASE.id);
        });

        it('đang hiện, tab mở qua mốc 24 giờ → tự biến mất', () => {
            localStorage.setItem(SEEN_KEY, OLD());
            markShown(23);
            render(<WhatsNewNotice />);
            expect(screen.getByTestId('whats-new')).toBeTruthy();

            act(() => {
                vi.advanceTimersByTime(1 * H + 1);
            });
            expect(screen.queryByTestId('whats-new')).toBeNull();
            expect(localStorage.getItem(SEEN_KEY)).toBe(CURRENT_RELEASE.id);
        });

        it('mốc của bản khác → đồng hồ tính lại từ đầu', () => {
            localStorage.setItem(SEEN_KEY, OLD());
            markShown(30, 'ban-cu-khac');
            render(<WhatsNewNotice />);

            expect(screen.getByTestId('whats-new')).toBeTruthy();
            expect(JSON.parse(localStorage.getItem(SHOWN_AT_KEY)).at).toBe(NOW);
        });
    });

    it('localStorage ném → KHÔNG làm vỡ app', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('chặn site data');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('chặn site data');
        });

        expect(() => render(<WhatsNewNotice />)).not.toThrow();
        expect(screen.queryByTestId('whats-new')).toBeNull();
    });
});
