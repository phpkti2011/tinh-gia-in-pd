// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/lib/priceConfigStore', () => ({
    loadConfigFromSupabase: vi.fn(),
    saveConfigToSupabase: vi.fn(),
}));
import { loadConfigFromSupabase, saveConfigToSupabase } from '../../src/lib/priceConfigStore';
import {
    loadCalendarConfig,
    loadCalendarFromCloud,
    saveCalendarConfig,
} from '../../src/modules/calendar/config/storage';
import { CALENDAR_DEFAULT_CONFIG } from '../../src/modules/calendar/config/defaultConfig';
beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
});
describe('Calendar isolated persistence', () => {
    it('ghi đúng namespace, không sửa giá KTS/decal', async () => {
        localStorage.setItem('printConfig', 'original-print');
        localStorage.setItem('decalConfig', 'original-decal');
        saveConfigToSupabase.mockResolvedValue({ ok: true });
        expect((await saveCalendarConfig(CALENDAR_DEFAULT_CONFIG)).cloud).toBe(true);
        expect(saveConfigToSupabase).toHaveBeenCalledWith(
            'calendar',
            CALENDAR_DEFAULT_CONFIG,
            '1.0.0'
        );
        expect(localStorage.getItem('printConfig')).toBe('original-print');
        expect(localStorage.getItem('decalConfig')).toBe('original-decal');
    });
    it('lỗi cloud vẫn báo local, không nói đã đồng bộ', async () => {
        saveConfigToSupabase.mockResolvedValue({
            ok: false,
            error: new Error('invalid module: calendar'),
        });
        expect(await saveCalendarConfig(CALENDAR_DEFAULT_CONFIG)).toEqual({
            local: true,
            cloud: false,
            error: 'invalid module: calendar',
        });
        expect(loadCalendarConfig()).toEqual(CALENDAR_DEFAULT_CONFIG);
    });
    it('cấu hình lỗi không được ghi; cloud lỗi schema giữ cache hợp lệ', async () => {
        const config = structuredClone(CALENDAR_DEFAULT_CONFIG);
        config.geometry.baseMin = 70000;
        localStorage.setItem('calendarConfig', JSON.stringify(config));
        expect((await saveCalendarConfig({})).local).toBe(false);
        expect(saveConfigToSupabase).not.toHaveBeenCalled();
        loadConfigFromSupabase.mockResolvedValue({ data: {} });
        expect(await loadCalendarFromCloud()).toEqual(config);
    });
    it('cache hỏng dùng default riêng, cloud hợp lệ cập nhật lịch', async () => {
        localStorage.setItem('calendarConfig', 'invalid');
        expect(loadCalendarConfig()).toEqual(CALENDAR_DEFAULT_CONFIG);
        const config = structuredClone(CALENDAR_DEFAULT_CONFIG);
        config.geometry.strip = 4;
        loadConfigFromSupabase.mockResolvedValue({ data: config });
        expect(await loadCalendarFromCloud()).toEqual(config);
        expect(loadCalendarConfig()).toEqual(config);
    });
    it('cloud cũ không ghi đè cấu hình vừa lưu hoặc bản còn chờ đồng bộ', async () => {
        let resolveRead;
        loadConfigFromSupabase.mockReturnValue(
            new Promise((resolve) => {
                resolveRead = resolve;
            })
        );
        const read = loadCalendarFromCloud(),
            config = structuredClone(CALENDAR_DEFAULT_CONFIG);
        config.geometry.baseMin = 90000;
        saveConfigToSupabase.mockResolvedValue({ ok: false, error: new Error('offline') });
        await saveCalendarConfig(config);
        resolveRead({ data: CALENDAR_DEFAULT_CONFIG });
        expect(await read).toEqual(config);
        expect(await loadCalendarFromCloud()).toEqual(config);
        expect(loadConfigFromSupabase).toHaveBeenCalledTimes(1);
    });
});
