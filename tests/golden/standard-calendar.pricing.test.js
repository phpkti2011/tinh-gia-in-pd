import { describe, it, expect } from 'vitest';
import { STANDARD_CALENDAR_PRODUCTS } from '../../src/modules/standard-calendar/config/index.js';
import {
    buildStandardCalendarQuoteText,
    standardCalendarPrice,
    standardCalendarRows,
    validateStandardCalendarTiers,
} from '../../src/modules/standard-calendar/engine/pricing.js';

const byId = (id) => STANDARD_CALENDAR_PRODUCTS.find((p) => p.id === id);
const p20 = byId('20x15');
const p25 = byId('25x15');

describe('Lịch khổ chuẩn — bảng giá', () => {
    it('có 5 quy cách, id duy nhất, mỗi quy cách có ảnh và 25 bậc giá', () => {
        expect(STANDARD_CALENDAR_PRODUCTS.map((p) => p.id)).toEqual([
            '2phan-25x15',
            '20x15',
            '25x15',
            '17x15',
            '15x17',
        ]);
        for (const p of STANDARD_CALENDAR_PRODUCTS) {
            expect(typeof p.image).toBe('string');
            expect(p.image.length).toBeGreaterThan(0);
            expect(p.tiers).toHaveLength(25);
            expect(validateStandardCalendarTiers(p.tiers)).toEqual([]);
            expect(p.tiers[0][0]).toBe(1);
            expect(p.tiers[24][0]).toBe(3000);
        }
    });

    it('khoá giá các bậc đầu/cuối theo bảng nguồn (tổng = đơn giá × số lượng)', () => {
        const expected = {
            '2phan-25x15': { 1: 329400, 100: 9820000, 3000: 164400000 },
            '20x15': { 1: 262800, 100: 7280000, 3000: 143400000 },
            '25x15': { 1: 286400, 100: 8520000, 3000: 150000000 },
            '17x15': { 1: 246800, 100: 6420000, 3000: 113100000 },
            '15x17': { 1: 246800, 100: 6420000, 3000: 113100000 },
        };
        for (const [id, totals] of Object.entries(expected)) {
            for (const [qty, total] of Object.entries(totals)) {
                const r = standardCalendarPrice(byId(id).tiers, Number(qty));
                expect(r.type).toBe('exact');
                expect(r.total).toBe(total);
            }
        }
    });

    it('validate bắt bảng sai hình dạng', () => {
        expect(validateStandardCalendarTiers([])).not.toEqual([]);
        expect(
            validateStandardCalendarTiers([
                [1, 100],
                [1, 90],
            ])
        ).not.toEqual([]);
        expect(validateStandardCalendarTiers([[0, 100]])).not.toEqual([]);
        expect(validateStandardCalendarTiers([[1, 0]])).not.toEqual([]);
    });
});

describe('Lịch khổ chuẩn — tra giá', () => {
    it('đúng bậc: lấy đơn giá bậc đó', () => {
        const r = standardCalendarPrice(p20.tiers, 10);
        expect(r).toMatchObject({ type: 'exact', unit: 137800, total: 1378000, tierQty: 10 });
        expect(r.betweenQty).toBeNull();
    });

    it('giữa hai bậc: dưới ngưỡng 70% áp bậc dưới, từ ngưỡng trở lên áp bậc trên', () => {
        // 5 → 10: ngưỡng = 5 + ceil(5 × 0.7) = 9
        expect(standardCalendarPrice(p20.tiers, 8)).toMatchObject({
            type: 'range',
            tierQty: 5,
            unit: 162200,
            total: 162200 * 8,
            betweenQty: [5, 10],
        });
        expect(standardCalendarPrice(p20.tiers, 9)).toMatchObject({
            tierQty: 10,
            unit: 137800,
            total: 137800 * 9,
        });
        // 100 → 150: ngưỡng = 100 + ceil(50 × 0.7) = 135
        expect(standardCalendarPrice(p20.tiers, 134).tierQty).toBe(100);
        expect(standardCalendarPrice(p20.tiers, 135).tierQty).toBe(150);
        // 1000 → 2000: ngưỡng = 1000 + 700 = 1700
        expect(standardCalendarPrice(p20.tiers, 1699).tierQty).toBe(1000);
        expect(standardCalendarPrice(p20.tiers, 1700).tierQty).toBe(2000);
    });

    it('khớp 100% với công thức float gốc của file HTML trên mọi số lượng 1…3000 của mọi quy cách', () => {
        // Bản gốc: low.qty + Math.ceil((high.qty - low.qty) * 0.70)
        const legacy = (rows, q) => {
            const exact = rows.find((r) => r[0] === q);
            if (exact) return exact[1] * q;
            for (let i = 0; i < rows.length - 1; i++) {
                const [lq, lu] = rows[i];
                const [hq, hu] = rows[i + 1];
                if (lq < q && q < hq) return (q < lq + Math.ceil((hq - lq) * 0.7) ? lu : hu) * q;
            }
            throw new Error('ngoài bảng');
        };
        for (const p of STANDARD_CALENDAR_PRODUCTS) {
            for (let q = 1; q <= 3000; q++) {
                expect(standardCalendarPrice(p.tiers, q).total).toBe(legacy(p.tiers, q));
            }
        }
    });

    it('vượt bậc cuối → báo giá riêng, không ra tiền', () => {
        const r = standardCalendarPrice(p20.tiers, 3001);
        expect(r).toEqual({ type: 'over', qty: 3001, maxQty: 3000 });
        expect(buildStandardCalendarQuoteText(p20, r)).toBe('');
    });

    it('số lượng không hợp lệ', () => {
        for (const q of [0, -5, 1.5, NaN, Infinity, '10', null, undefined]) {
            expect(standardCalendarPrice(p20.tiers, q).type).toBe('invalid');
        }
        expect(standardCalendarPrice([], 5).type).toBe('invalid');
    });

    it('bảng nguồn có chỗ đặt nhiều hơn lại rẻ hơn → engine KHÔNG đổi giá, chỉ gợi ý bậc rẻ hơn', () => {
        // 25×15: 90 cuốn = 9.882.000 nhưng 100 cuốn = 8.520.000 (khác 2 phần: 9.882.000 vs 9.820.000).
        const at90 = standardCalendarPrice(p25.tiers, 90);
        expect(at90.total).toBe(95500 * 90);
        expect(at90.cheaperTier).toEqual({ qty: 100, unit: 85200, total: 8520000 });
        // 95 cuốn: nằm giữa 90 và 100, ngưỡng 97 → vẫn tính đơn giá bậc 90 (giữ nguyên như file nguồn).
        const at95 = standardCalendarPrice(p25.tiers, 95);
        expect(at95).toMatchObject({ tierQty: 90, unit: 95500, total: 95500 * 95 });
        expect(at95.total).toBeGreaterThan(8520000);
        expect(at95.cheaperTier?.qty).toBe(100);
        // Bậc đã rẻ nhất thì không gợi ý.
        expect(standardCalendarPrice(p25.tiers, 100).cheaperTier).toBeNull();
        expect(standardCalendarPrice(p25.tiers, 1).cheaperTier).toBeNull();
    });

    it('standardCalendarRows trả đủ dòng, tổng = đơn giá × số lượng', () => {
        const rows = standardCalendarRows(p20.tiers);
        expect(rows).toHaveLength(25);
        expect(rows[0]).toEqual({ qty: 1, unit: 262800, total: 262800 });
        for (const r of rows) expect(r.total).toBe(r.unit * r.qty);
    });

    it('chuỗi sao chép báo khách', () => {
        const r = standardCalendarPrice(p20.tiers, 10);
        expect(buildStandardCalendarQuoteText(p20, r)).toBe(
            [
                'Lịch để bàn khổ chuẩn · Ngang 20cm x Cao 15cm',
                'Số lượng: 10 cuốn',
                `Đơn giá: ${(137800).toLocaleString('vi-VN')} đ / cuốn`,
                `Tổng báo khách: ${(1378000).toLocaleString('vi-VN')} đ`,
            ].join('\n')
        );
    });
});
