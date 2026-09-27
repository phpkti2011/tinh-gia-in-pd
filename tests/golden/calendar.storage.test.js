// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/modules/calendar/config/cloud', () => ({
    readCalendarPrices: vi.fn(),
    publishCalendarPrices: vi.fn(),
}));
import { readCalendarPrices, publishCalendarPrices } from '../../src/modules/calendar/config/cloud';
import {
    loadCalendarConfig,
    loadCalendarFromCloud,
    saveCalendarConfig,
    loadCalendarDraft,
} from '../../src/modules/calendar/config/storage';
import { CALENDAR_DEFAULT_CONFIG } from '../../src/modules/calendar/config/defaultConfig';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
const config = () => structuredClone(CALENDAR_DEFAULT_CONFIG);
const options = { ownerId: 'admin-a', baseVersion: 1 };
const rows = (calendar = config(), version = 1) => [
    ...(calendar ? [{ module: 'calendar', data: calendar, current_version: version }] : []),
    { module: 'small-print', data: DEFAULT_CONFIG, current_version: 31 },
];
beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
    readCalendarPrices.mockResolvedValue(rows());
    publishCalendarPrices.mockResolvedValue({ ok: true, new_version: 2 });
});
describe('Calendar cloud-authoritative persistence', () => {
    it('đọc đồng thời giá lịch/KTS; chỉ cache lịch, không sửa module cũ', async () => {
        localStorage.setItem('printConfig', 'original-print');
        localStorage.setItem('decalConfig', 'original-decal');
        const next = config();
        next.geometry.baseMin = 99000;
        readCalendarPrices.mockResolvedValue(rows(next, 2));
        const result = await loadCalendarFromCloud();
        expect(result).toMatchObject({ ready: true, version: 2, printVersion: 31, config: next });
        expect(loadCalendarConfig()).toEqual(next);
        expect(localStorage.getItem('printConfig')).toBe('original-print');
        expect(localStorage.getItem('decalConfig')).toBe('original-decal');
    });
    it.each([
        'offline',
        'missing-calendar',
        'invalid-calendar',
        'invalid-print',
        'missing-print',
        'invalid-version',
    ])('%s: không dùng cache/default thay giá máy chủ', async (mode) => {
        localStorage.setItem('calendarConfig', JSON.stringify(config()));
        if (mode === 'offline') readCalendarPrices.mockRejectedValue(new Error('offline'));
        if (mode === 'missing-calendar') readCalendarPrices.mockResolvedValue(rows(null));
        if (mode === 'invalid-calendar') readCalendarPrices.mockResolvedValue(rows({}));
        if (mode === 'invalid-print')
            readCalendarPrices.mockResolvedValue([
                rows()[0],
                { module: 'small-print', data: {}, current_version: 31 },
            ]);
        if (mode === 'missing-print') readCalendarPrices.mockResolvedValue([rows()[0]]);
        if (mode === 'invalid-version') readCalendarPrices.mockResolvedValue(rows(config(), null));
        expect((await loadCalendarFromCloud()).ready).toBe(false);
    });
    it('lưu lỗi chỉ giữ nháp và không áp dụng cache; tự gửi lại với đúng phiên bản và tài khoản', async () => {
        localStorage.setItem('calendarConfig', JSON.stringify(config()));
        const next = config();
        next.geometry.baseMin = 90000;
        publishCalendarPrices.mockRejectedValueOnce(new Error('offline'));
        expect(await saveCalendarConfig(next, options)).toMatchObject({
            local: true,
            cloud: false,
        });
        expect(loadCalendarConfig().geometry.baseMin).toBe(20000);
        expect((await loadCalendarFromCloud()).ready).toBe(false);
        expect(publishCalendarPrices).toHaveBeenCalledTimes(1);
        readCalendarPrices.mockResolvedValueOnce(rows()).mockResolvedValueOnce(rows(next, 2));
        expect(await loadCalendarFromCloud({ ownerId: 'admin-a' })).toMatchObject({
            ready: true,
            version: 2,
            config: next,
        });
        expect(publishCalendarPrices).toHaveBeenLastCalledWith(next, '1.0.0', 1);
        expect(loadCalendarDraft()).toBeNull();
    });
    it('không tự đẩy nháp bằng tài khoản khác, không ngừng đọc giá máy chủ', async () => {
        publishCalendarPrices.mockRejectedValue(new Error('offline'));
        await saveCalendarConfig(config(), options);
        const next = config();
        next.geometry.baseMin = 40000;
        readCalendarPrices.mockResolvedValue(rows(next, 3));
        expect(await loadCalendarFromCloud({ ownerId: 'admin-b' })).toMatchObject({
            ready: false,
            version: 3,
            config: next,
        });
        expect(publishCalendarPrices).toHaveBeenCalledTimes(1);
    });
    it('nháp cũ từ bản trước chỉ tự gửi khi máy chủ chưa có bảng lịch, giữ nguyên nếu đã có', async () => {
        localStorage.setItem('calendarConfig', JSON.stringify(config()));
        localStorage.setItem('calendarConfigPending', 'true');
        publishCalendarPrices.mockRejectedValueOnce(new Error('calendar_version_conflict'));
        expect((await loadCalendarFromCloud({ ownerId: 'admin-a' })).ready).toBe(false);
        expect(publishCalendarPrices).toHaveBeenCalledWith(config(), '1.0.0', 0);
        readCalendarPrices.mockResolvedValueOnce(rows(null)).mockResolvedValueOnce(rows());
        expect((await loadCalendarFromCloud({ ownerId: 'admin-a' })).ready).toBe(true);
        expect(publishCalendarPrices).toHaveBeenCalledWith(config(), '1.0.0', 0);
    });
    it('xung đột phiên bản giữ nháp; vẫn đọc được bản máy chủ để admin đối chiếu', async () => {
        publishCalendarPrices.mockRejectedValue(new Error('calendar_version_conflict'));
        await saveCalendarConfig(config(), options);
        readCalendarPrices.mockResolvedValue(rows(config(), 5));
        const result = await loadCalendarFromCloud({ ownerId: 'admin-a' });
        expect(result).toMatchObject({ ready: false, version: 5 });
        expect(result.error).toContain('Admin khác');
        expect(loadCalendarDraft().baseVersion).toBe(1);
    });
    it('xác nhận lưu cũ không xóa bản nháp mới hơn', async () => {
        let finish;
        publishCalendarPrices.mockReturnValueOnce(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const first = saveCalendarConfig(config(), options);
        const newer = config();
        newer.geometry.baseMin = 80000;
        publishCalendarPrices.mockRejectedValueOnce(new Error('offline'));
        await saveCalendarConfig(newer, options);
        finish({ ok: true, new_version: 2 });
        await first;
        expect(loadCalendarDraft().data).toEqual(newer);
    });
    it('không lưu dữ liệu lỗi, thiếu tài khoản hoặc thiếu phiên bản', async () => {
        expect((await saveCalendarConfig({}, options)).cloud).toBe(false);
        expect((await saveCalendarConfig(config())).cloud).toBe(false);
        expect(
            (await saveCalendarConfig(config(), { ownerId: 'admin-a', baseVersion: null })).cloud
        ).toBe(false);
        expect(publishCalendarPrices).not.toHaveBeenCalled();
    });
    it('đọc bắt đầu trước lần lưu không ghi đè cache bằng dữ liệu cũ', async () => {
        let finish;
        readCalendarPrices.mockReturnValueOnce(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        const read = loadCalendarFromCloud();
        await saveCalendarConfig(config(), options);
        const newer = config();
        newer.geometry.baseMin = 80000;
        localStorage.setItem('calendarConfig', JSON.stringify(newer));
        finish(rows());
        await read;
        expect(loadCalendarConfig()).toEqual(newer);
    });
});
