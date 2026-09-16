// Ép plastic — helper thuần dùng chung: src/utils/plasticLamination.js
//
// Hai tính chất an toàn phải khoá chặt (128 golden test khoá giá dựa vào chúng):
//   1. Config cũ chưa có PLASTIC_LAMINATION_CONFIG → helper trả rỗng/null.
//   2. Chưa chọn độ dày → null; chọn độ dày mà chưa chọn khổ → chuỗi quy cách
//      ghi thẳng "(CHƯA CHỌN khổ)", không đoán bừa.

import { describe, it, expect } from 'vitest';
import {
    PLASTIC_SIZE_UNSET_NOTE,
    findPlasticThickness,
    findPlasticSize,
    plasticSizesFor,
    resolvePlastic,
    plasticLabel,
    plasticPhrase,
    newPlasticId,
} from '../../src/utils/plasticLamination.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

const cfg = DEFAULT_CONFIG.PLASTIC_LAMINATION_CONFIG;

describe('An toàn 1 — config cũ thiếu key', () => {
    it('undefined / null / rỗng / sai kiểu → rỗng hoặc null, không throw', () => {
        for (const bad of [undefined, null, {}, [], 'x', 0]) {
            expect(findPlasticThickness(bad, 'mic80')).toBeNull();
            expect(findPlasticSize(bad, 'a4')).toBeNull();
            expect(plasticSizesFor(bad, 'mic80')).toEqual([]);
            expect(resolvePlastic(bad, 'mic80', 'a4')).toEqual({ thickness: null, size: null });
            expect(plasticLabel(bad, 'mic80', 'a4')).toBeNull();
            expect(plasticPhrase(bad, 'mic80', 'a4')).toBeNull();
        }
    });
});

describe('An toàn 2 — chưa chọn độ dày', () => {
    it("'none' / '' / undefined → null / rỗng", () => {
        for (const th of ['none', '', undefined, null]) {
            expect(findPlasticThickness(cfg, th)).toBeNull();
            expect(plasticSizesFor(cfg, th)).toEqual([]);
            expect(plasticLabel(cfg, th, 'a4')).toBeNull();
            expect(plasticPhrase(cfg, th, 'a4')).toBeNull();
        }
    });
});

describe('plasticSizesFor — khổ theo độ dày, giữ thứ tự cột', () => {
    it('80 mic → A6/A5/A4/A3, không có CCCD', () => {
        expect(plasticSizesFor(cfg, 'mic80').map((s) => s.id)).toEqual(['a6', 'a5', 'a4', 'a3']);
    });

    it('125 mic → chỉ CCCD', () => {
        expect(plasticSizesFor(cfg, 'mic125').map((s) => s.id)).toEqual(['cccd']);
    });

    it('độ dày lạ → []', () => {
        expect(plasticSizesFor(cfg, 'mic999')).toEqual([]);
    });

    it('sizeIds lưu đảo thứ tự vẫn trả theo thứ tự cột của bảng', () => {
        const c = structuredClone(cfg);
        c.thicknesses[0].sizeIds = ['a3', 'a6'];
        expect(plasticSizesFor(c, 'mic80').map((s) => s.id)).toEqual(['a6', 'a3']);
    });

    it('sizeIds trỏ khổ đã xoá → bỏ qua, không throw', () => {
        const c = structuredClone(cfg);
        c.thicknesses[1].sizeIds = ['cccd', 'zzz'];
        expect(plasticSizesFor(c, 'mic125').map((s) => s.id)).toEqual(['cccd']);
    });
});

describe('resolvePlastic', () => {
    it('đủ độ dày + khổ được tick → trả cả hai', () => {
        const r = resolvePlastic(cfg, 'mic80', 'a4');
        expect(r.thickness.id).toBe('mic80');
        expect(r.size.id).toBe('a4');
    });

    it('khổ không được tick cho độ dày → size null (coi như chưa chọn)', () => {
        const r = resolvePlastic(cfg, 'mic80', 'cccd');
        expect(r.thickness.id).toBe('mic80');
        expect(r.size).toBeNull();
    });
});

describe('plasticLabel / plasticPhrase', () => {
    it('đủ độ dày + khổ', () => {
        expect(plasticLabel(cfg, 'mic80', 'a4')).toBe('Ép plastic 80 mic — A4');
        expect(plasticPhrase(cfg, 'mic80', 'a4')).toBe('ép plastic 80 mic khổ A4');
        expect(plasticPhrase(cfg, 'mic125', 'cccd')).toBe(
            'ép plastic 125 mic khổ CCCD (67 x 97 mm)'
        );
    });

    it('chưa chọn khổ → nói thẳng để xưởng hỏi lại', () => {
        expect(PLASTIC_SIZE_UNSET_NOTE).toBe('(CHƯA CHỌN khổ)');
        expect(plasticLabel(cfg, 'mic80', '')).toBe('Ép plastic 80 mic');
        expect(plasticPhrase(cfg, 'mic80', '')).toBe('ép plastic 80 mic (CHƯA CHỌN khổ)');
        expect(plasticPhrase(cfg, 'mic80', 'cccd')).toBe('ép plastic 80 mic (CHƯA CHỌN khổ)');
    });

    it('không bao giờ lộ undefined/NaN/null vào chuỗi (guard của buildJobSpec)', () => {
        const c = structuredClone(cfg);
        c.thicknesses[0].name = '';
        c.sizes[2].name = undefined;
        for (const s of [plasticPhrase(c, 'mic80', 'a4'), plasticLabel(c, 'mic80', 'a4')]) {
            expect(s).not.toMatch(/undefined|NaN|null/);
        }
    });
});

describe('newPlasticId', () => {
    it('có tiền tố + "_" (không trùng khoá upper-bound của restoreInfinity) và không lặp', () => {
        const a = newPlasticId('sz');
        const b = newPlasticId('sz');
        expect(a.startsWith('sz_')).toBe(true);
        expect(a).not.toBe(b);
        for (const k of ['upTo', 'max', 'max_cost', 'max_qty', 'maxArea', 'maxMeters']) {
            expect(a).not.toBe(k);
        }
    });

    it('mặc định tiền tố pl', () => {
        expect(newPlasticId().startsWith('pl_')).toBe(true);
    });
});
