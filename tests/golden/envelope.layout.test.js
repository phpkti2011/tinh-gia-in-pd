import { describe, it, expect } from 'vitest';
import {
    computeEnvelopeLayout,
    describeEnvelopePanels,
    describeEnvelope,
    validateEnvelopeInput,
    convertUnit,
    toMm,
} from '../../src/modules/envelope/engine/layout';

// Bộ thông số chung của tài liệu §7.1: W 350, H 250, N 40, T 15 mm.
const base = {
    unit: 'mm',
    w: 350,
    h: 250,
    flap: 40,
    tab: 15,
    flapEdge: 'W',
    construction: 'joined-opposite',
    backPrint: null,
    quantity: 100,
};
const size = (r, i = 0) => [r.parts[i].widthMm, r.parts[i].heightMm];
const CASES = [
    ['F01', 'joined-opposite', 'W', [380, 540]],
    ['F02', 'joined-opposite', 'H', [740, 280]],
    ['F03', 'joined-side', 'W', [715, 305]],
    ['F04', 'joined-side', 'H', [405, 515]],
    ['F05', 'split', 'W', [380, 305]],
    ['F06', 'split', 'H', [405, 280]],
];

describe('Envelope layout — công thức F01–F07', () => {
    it.each(CASES)('%s: %s, nắp cạnh %s', (_, construction, flapEdge, expected) => {
        const r = computeEnvelopeLayout({ ...base, construction, flapEdge, backPrint: false });
        expect(size(r)).toEqual(expected);
        expect(r.parts[0]).toMatchObject({
            id: construction === 'split' ? 'front' : 'body',
            quantity: 100,
            printEnabled: true,
        });
        expect(r.schemaVersion).toBe(1);
        expect(r.unit).toBe('mm');
    });
    it('F07: mặt sau rời 347 × 247 mm cho cả hai vị trí nắp, giảm 3 mm trên tổng mỗi chiều', () => {
        for (const flapEdge of ['W', 'H']) {
            const r = computeEnvelopeLayout({
                ...base,
                construction: 'split',
                flapEdge,
                backPrint: true,
            });
            expect(r.parts).toHaveLength(2);
            expect(size(r, 1)).toEqual([347, 247]);
            expect(r.parts[1]).toMatchObject({ id: 'back', quantity: 100, printEnabled: true });
        }
    });
    it('I01: nhập cm cho ra đúng bộ kết quả mm; I11: giữ phần thập phân, không làm tròn', () => {
        const mm = computeEnvelopeLayout(base);
        const cm = computeEnvelopeLayout({ ...base, unit: 'cm', w: 35, h: 25, flap: 4, tab: 1.5 });
        expect(cm.parts).toEqual(mm.parts);
        expect(cm.dimensionsMm).toEqual({ W: 350, H: 250, N: 40, T: 15 });
        expect(toMm(35, 'cm')).toBe(350);
        const dec = computeEnvelopeLayout({ ...base, w: 350.25, tab: 15.3 });
        expect(size(dec)).toEqual([380.85, 540]);
        const decCm = computeEnvelopeLayout({
            ...base,
            unit: 'cm',
            w: 35.25,
            h: 25,
            flap: 4,
            tab: 1.5,
            construction: 'split',
            backPrint: false,
        });
        expect(size(decCm, 1)).toEqual([349.5, 247]);
        // 0.1 + 0.2 kiểu dấu phẩy động không làm lệch kết quả
        expect(
            size(computeEnvelopeLayout({ ...base, unit: 'cm', w: 0.1, h: 25, flap: 0.2, tab: 1 }))
        ).toEqual([21, 502]);
    });
    it('không đảo ngang/cao: W nhỏ hơn H vẫn giữ nguyên thứ tự; I06 liền thân chỉ một phần', () => {
        const r = computeEnvelopeLayout({ ...base, w: 250, h: 350 });
        expect(size(r)).toEqual([280, 740]);
        expect(r.parts).toHaveLength(1);
        expect(r.parts.map((p) => p.id)).toEqual(['body']);
    });
    it('I07: đổi cạnh nắp đổi đúng hàng công thức', () => {
        const w = computeEnvelopeLayout({ ...base, construction: 'joined-side' });
        const h = computeEnvelopeLayout({ ...base, construction: 'joined-side', flapEdge: 'H' });
        expect([size(w), size(h)]).toEqual([
            [715, 305],
            [405, 515],
        ]);
    });
    it('convertUnit quy đổi giá trị đang nhập (35 cm ↔ 350 mm), giữ NaN cho ô trống', () => {
        expect(convertUnit(35, 'cm', 'mm')).toBe(350);
        expect(convertUnit(350, 'mm', 'cm')).toBe(35);
        expect(convertUnit(1.5, 'cm', 'mm')).toBe(15);
        expect(convertUnit(347, 'mm', 'cm')).toBe(34.7);
        expect(Number.isNaN(convertUnit(NaN, 'cm', 'mm'))).toBe(true);
        expect(convertUnit(12, 'mm', 'mm')).toBe(12);
    });
});

describe('Envelope layout — kiểm tra dữ liệu (I08, I09)', () => {
    it('đầu vào hợp lệ không có lỗi', () => {
        expect(validateEnvelopeInput(base)).toEqual({ ok: true, errors: {} });
    });
    it.each([
        ['ô trống W', { w: NaN }, 'w'],
        ['W âm', { w: -5 }, 'w'],
        ['H bằng 0', { h: 0 }, 'h'],
        ['N vô hạn', { flap: Infinity }, 'flap'],
        ['T là chuỗi', { tab: '15' }, 'tab'],
        ['số lượng lẻ', { quantity: 100.5 }, 'quantity'],
        ['số lượng 0', { quantity: 0 }, 'quantity'],
        ['đơn vị lạ', { unit: 'inch' }, 'unit'],
        ['vị trí nắp lạ', { flapEdge: 'X' }, 'flapEdge'],
        ['kiểu khuôn lạ', { construction: 'other' }, 'construction'],
        ['tách chưa chọn in mặt sau', { construction: 'split' }, 'backPrint'],
        ['tách W = 3 mm', { construction: 'split', backPrint: true, w: 3 }, 'w'],
        [
            'tách H = 0,3 cm',
            {
                construction: 'split',
                backPrint: true,
                unit: 'cm',
                w: 35,
                h: 0.3,
                flap: 4,
                tab: 1.5,
            },
            'h',
        ],
    ])('%s → báo lỗi đúng trường và chặn tính', (_, patch, field) => {
        const v = validateEnvelopeInput({ ...base, ...patch });
        expect(v.ok).toBe(false);
        expect(v.errors[field]).toBeTruthy();
        expect(() => computeEnvelopeLayout({ ...base, ...patch })).toThrow();
    });
    it('W = 3,1 mm khi tách vẫn hợp lệ (mặt sau dương); liền thân không cần điều kiện 3 mm', () => {
        expect(
            validateEnvelopeInput({ ...base, construction: 'split', backPrint: false, w: 3.1 }).ok
        ).toBe(true);
        expect(validateEnvelopeInput({ ...base, w: 2 }).ok).toBe(true);
    });
});

describe('Envelope panels — hình mô tả khớp công thức', () => {
    const bbox = (panels) => [
        Math.min(...panels.map((p) => p.x)),
        Math.min(...panels.map((p) => p.y)),
        Math.max(...panels.map((p) => p.x + p.w)),
        Math.max(...panels.map((p) => p.y + p.h)),
    ];
    const overlap = (a, b) =>
        Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) *
        Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    it.each(CASES)(
        '%s: hộp bao = khổ trải, 5 mảnh, không chồng, nắp đúng cạnh',
        (_, construction, flapEdge) => {
            const layout = computeEnvelopeLayout({
                ...base,
                construction,
                flapEdge,
                backPrint: false,
            });
            const [main] = describeEnvelopePanels(layout);
            expect(main.panels).toHaveLength(5);
            expect(bbox(main.panels)).toEqual([0, 0, main.widthMm, main.heightMm]);
            expect([main.widthMm, main.heightMm]).toEqual(size(layout));
            for (const a of main.panels)
                for (const b of main.panels) if (a !== b) expect(overlap(a, b)).toBe(0);
            const flap = main.panels.find((p) => p.id === 'flap');
            expect([flap.w, flap.h]).toEqual(flapEdge === 'W' ? [350, 40] : [40, 250]);
            expect(main.panels.filter((p) => p.id.startsWith('tab'))).toHaveLength(
                construction === 'split' ? 3 : 2
            );
            expect(main.panels.some((p) => p.id === 'back')).toBe(construction !== 'split');
            expect(main.folds.length).toBeGreaterThanOrEqual(4);
        }
    );
    it('mặt sau rời là một mảnh 347 × 247, không đường gấp', () => {
        const layout = computeEnvelopeLayout({ ...base, construction: 'split', backPrint: false });
        const parts = describeEnvelopePanels(layout);
        expect(parts.map((p) => p.id)).toEqual(['front', 'back']);
        expect(parts[1].panels).toEqual([
            { id: 'back', label: 'Mặt sau rời', x: 0, y: 0, w: 347, h: 247 },
        ]);
        expect(parts[1].folds).toEqual([]);
    });
    it('mô tả bằng chữ theo đơn vị hiển thị', () => {
        const layout = computeEnvelopeLayout({ ...base, construction: 'split', backPrint: false });
        const text = describeEnvelope(layout, 'cm');
        expect(text.summary).toContain('35 × 25 cm');
        expect(text.summary).toContain('tách hai phần');
        expect(text.parts[0]).toContain('38 × 30,5 cm');
        expect(text.parts[1]).toContain('34,7 × 24,7 cm');
        expect(text.parts[1]).toContain('chỉ tính giấy');
        expect(describeEnvelope(layout, 'mm').parts[0]).toContain('380 × 305 mm');
    });
});
