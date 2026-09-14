// Loại màng cán dùng chung — src/utils/laminationFilm.js
//
// Hai tính chất an toàn phải được khoá chặt ở đây, vì toàn bộ 128 golden test
// khoá giá của 6 module dựa vào chúng:
//   1. Config cũ chưa có danh sách  → mặc định Mờ/Bóng 0% → hệ số 1.
//   2. Nhân viên CHƯA CHỌN loại màng → hệ số 1.
// Tức là: không bao giờ được tự ý đổi tiền khi thiếu dữ liệu.

import { describe, it, expect } from 'vitest';
import {
    DEFAULT_LAMINATION_FILMS,
    getLaminationFilms,
    findLaminationFilm,
    filmMultiplier,
    filmName,
    filmPhrase,
    newFilmId,
    FILM_UNSET_NOTE,
} from '../../src/utils/laminationFilm.js';

const CUSTOM = [
    { id: 'mo', name: 'Mờ', percent: 0 },
    { id: 'bong', name: 'Bóng', percent: 0 },
    { id: 'soft', name: 'Soft-touch', percent: 30 },
];

describe('Mặc định', () => {
    it('ship đúng Mờ + Bóng, cả hai 0%', () => {
        expect(DEFAULT_LAMINATION_FILMS).toEqual([
            { id: 'mo', name: 'Mờ', percent: 0 },
            { id: 'bong', name: 'Bóng', percent: 0 },
        ]);
    });

    it('Mờ và Bóng không đổi giá (hệ số đúng bằng 1)', () => {
        expect(filmMultiplier(DEFAULT_LAMINATION_FILMS, 'mo')).toBe(1);
        expect(filmMultiplier(DEFAULT_LAMINATION_FILMS, 'bong')).toBe(1);
    });
});

describe('An toàn 1 — config cũ chưa có danh sách', () => {
    it('undefined / null / rỗng / sai kiểu → quay về mặc định', () => {
        for (const bad of [undefined, null, [], {}, 'mo', 0]) {
            expect(getLaminationFilms(bad)).toBe(DEFAULT_LAMINATION_FILMS);
        }
    });

    it('không có danh sách vẫn tra được Mờ/Bóng, hệ số 1', () => {
        expect(filmMultiplier(undefined, 'mo')).toBe(1);
        expect(filmName(undefined, 'bong')).toBe('Bóng');
    });
});

describe('An toàn 2 — chưa chọn loại màng', () => {
    it('id rỗng/undefined/null → hệ số 1, KHÔNG đổi giá', () => {
        for (const id of ['', undefined, null]) {
            expect(filmMultiplier(CUSTOM, id)).toBe(1);
        }
    });

    it('id lạ (loại màng đã bị admin xoá) → hệ số 1', () => {
        expect(filmMultiplier(CUSTOM, 'khong_ton_tai')).toBe(1);
    });

    it('percent sai kiểu → hệ số 1', () => {
        expect(filmMultiplier([{ id: 'x', name: 'X', percent: 'nhiều' }], 'x')).toBe(1);
        expect(filmMultiplier([{ id: 'x', name: 'X' }], 'x')).toBe(1);
    });
});

describe('Phụ thu %', () => {
    it('30% → nhân 1.3', () => {
        expect(filmMultiplier(CUSTOM, 'soft')).toBeCloseTo(1.3, 10);
    });

    it('phụ thu âm (giảm giá) vẫn chạy', () => {
        expect(filmMultiplier([{ id: 'x', name: 'X', percent: -10 }], 'x')).toBeCloseTo(0.9, 10);
    });
});

describe('Chữ ghi vào quy cách', () => {
    it('đã chọn → tên viết thường', () => {
        expect(filmPhrase(CUSTOM, 'mo')).toBe('mờ');
        expect(filmPhrase(CUSTOM, 'soft')).toBe('soft-touch');
    });

    it('chưa chọn → nói thẳng để xưởng hỏi lại', () => {
        expect(filmPhrase(CUSTOM, '')).toBe(FILM_UNSET_NOTE);
        expect(FILM_UNSET_NOTE).toBe('(CHƯA CHỌN mờ/bóng)');
    });

    it('cảnh báo không chứa từ khoá bị jobSpec chặn', () => {
        // buildJobSpec loại bỏ chuỗi có undefined/NaN/null để không lọt rác cho khách.
        expect(/undefined|NaN|null/.test(FILM_UNSET_NOTE)).toBe(false);
    });

    it('tên rỗng/khoảng trắng → coi như chưa chọn', () => {
        expect(filmPhrase([{ id: 'x', name: '   ', percent: 0 }], 'x')).toBe(FILM_UNSET_NOTE);
    });
});

describe('findLaminationFilm / newFilmId', () => {
    it('tìm đúng phần tử', () => {
        expect(findLaminationFilm(CUSTOM, 'soft')).toEqual(CUSTOM[2]);
        expect(findLaminationFilm(CUSTOM, '')).toBeNull();
    });

    it('id mới không trùng nhau', () => {
        const ids = new Set(Array.from({ length: 50 }, () => newFilmId()));
        expect(ids.size).toBe(50);
    });
});
