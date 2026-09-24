// Danh sách bản phát hành — hình dạng phải luôn đúng.
//
// Một mục hỏng là băng báo vỡ trên máy nhân viên, ngay lúc họ đang báo giá cho khách.
// File này rẻ nhưng chặn đúng loại lỗi hay xảy ra nhất: quên `items`, trùng `id`, hoặc
// thêm bản mới vào CUỐI mảng thay vì đầu.

import { describe, it, expect } from 'vitest';
import { RELEASE_NOTES, CURRENT_RELEASE } from '../../src/releaseNotes.js';

describe('RELEASE_NOTES', () => {
    it('có ít nhất một bản', () => {
        expect(Array.isArray(RELEASE_NOTES)).toBe(true);
        expect(RELEASE_NOTES.length).toBeGreaterThan(0);
    });

    it('id duy nhất — trùng id là máy nhân viên nhớ nhầm bản đã xem', () => {
        const ids = RELEASE_NOTES.map((r) => r.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it.each(RELEASE_NOTES.map((r) => [r.id, r]))('bản %s đủ field và không rỗng', (_id, r) => {
        expect(typeof r.id).toBe('string');
        expect(r.id.length).toBeGreaterThan(0);
        expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(typeof r.title).toBe('string');
        expect(r.title.trim().length).toBeGreaterThan(0);
        expect(Array.isArray(r.items)).toBe(true);
        expect(r.items.length).toBeGreaterThan(0);
        r.items.forEach((it) => {
            expect(typeof it).toBe('string');
            expect(it.trim().length).toBeGreaterThan(0);
        });
    });

    it('xếp theo ngày GIẢM DẦN — mới nhất đứng đầu', () => {
        const dates = RELEASE_NOTES.map((r) => r.date);
        expect(dates).toEqual([...dates].sort().reverse());
    });

    it('CURRENT_RELEASE là phần tử đầu', () => {
        expect(CURRENT_RELEASE).toBe(RELEASE_NOTES[0]);
    });
});
