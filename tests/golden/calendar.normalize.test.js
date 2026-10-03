import { describe, it, expect } from 'vitest';
import {
    withCartonSheets,
    withStockMirror,
    normalizeCalendarConfig,
} from '../../src/modules/calendar/config/normalize';
import { CALENDAR_DEFAULT_CONFIG } from '../../src/modules/calendar/config/defaultConfig';
import { validateCalendarConfig } from '../../src/modules/calendar/config/schema';

const config = () => structuredClone(CALENDAR_DEFAULT_CONFIG);
const legacy = (w = 79, h = 109) => {
    const c = config();
    for (const item of c.materials.carton) {
        delete item.w;
        delete item.h;
    }
    c.geometry.stockW = w;
    c.geometry.stockH = h;
    return c;
};

describe('Nâng cấp bảng giá lịch lên khổ carton theo từng loại', () => {
    it('bảng giá cũ được điền w/h từ khổ chung đang dùng', () => {
        const r = withCartonSheets(legacy());
        expect(r.materials.carton[0]).toMatchObject({ w: 79, h: 109 });
    });
    it('thiếu cả khổ chung thì lùi về 60 × 100', () => {
        const c = legacy();
        delete c.geometry.stockW;
        c.geometry.stockH = 0;
        expect(withCartonSheets(c).materials.carton[0]).toMatchObject({ w: 60, h: 100 });
    });
    it('điền đủ cho mọi loại, không đụng loại đã khai khổ riêng', () => {
        const c = legacy(60, 100);
        c.materials.carton.push({
            name: 'Khổ riêng',
            w: 70,
            h: 100,
            tiers: [{ from: 1, cost: 1, sale: 1 }],
        });
        const r = withCartonSheets(c);
        expect(r.materials.carton.map((x) => [x.w, x.h])).toEqual([
            [60, 100],
            [70, 100],
        ]);
        expect(r.materials.carton[1]).toBe(c.materials.carton[1]);
    });
    it('config đã đúng trả lại NGUYÊN reference cũ, không làm React tính lại', () => {
        const c = config();
        expect(withCartonSheets(c)).toBe(c);
        expect(withStockMirror(c)).toBe(c);
        expect(normalizeCalendarConfig(c)).toBe(c);
    });
    it('bản sao geometry bám theo loại carton đầu tiên', () => {
        const c = config();
        c.materials.carton[0].w = 70;
        c.materials.carton[0].h = 90;
        const r = withStockMirror(c);
        expect([r.geometry.stockW, r.geometry.stockH]).toEqual([70, 90]);
        expect(validateCalendarConfig(r).isValid).toBe(true);
    });
    it('khổ loại đầu không hợp lệ thì GIỮ bản sao cũ, không ghi NaN lên máy chủ', () => {
        const c = config();
        c.materials.carton[0].w = NaN;
        const r = withStockMirror(c);
        expect([r.geometry.stockW, r.geometry.stockH]).toEqual([60, 100]);
        expect(JSON.parse(JSON.stringify(r)).geometry.stockW).toBe(60);
        expect(validateCalendarConfig(r).isValid).toBe(false);
    });
    it('nâng cấp xong vẫn hợp lệ và không đổi bậc giá nào', () => {
        const source = legacy(60, 100);
        const r = normalizeCalendarConfig(source);
        expect(validateCalendarConfig(r).isValid).toBe(true);
        expect(r.materials.carton[0].tiers).toEqual(
            CALENDAR_DEFAULT_CONFIG.materials.carton[0].tiers
        );
        expect(r.pricesConfirmed).toBe(source.pricesConfirmed);
    });
    it('không có danh mục carton thì trả về nguyên trạng, không ném lỗi', () => {
        expect(withCartonSheets(null)).toBe(null);
        expect(withStockMirror(undefined)).toBe(undefined);
        const empty = { geometry: {} };
        expect(normalizeCalendarConfig(empty)).toBe(empty);
    });
});
