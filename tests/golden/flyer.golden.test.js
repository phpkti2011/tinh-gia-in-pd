// Golden tests cho module TÍNH GIÁ TỜ RƠI.
// Port từ module-tinh-gia-to-roi-pd-tone-web.html — tra bảng bậc + quy tắc tăng 70% + phụ phí.

import { describe, it, expect } from 'vitest';
import { calculateFlyer } from '../../src/modules/flyer/engine/index.js';
import { FLYER_DEFAULT_CONFIG } from '../../src/modules/flyer/config/index.js';

const config = FLYER_DEFAULT_CONFIG;
const P = (o) => ({
    size: 'A5',
    quantity: 170,
    paper: 'C150',
    sides: '2',
    lamination: 'none',
    creasing: 'none',
    contents: '1-2',
    ...o,
});

describe('Flyer: calculateFlyer', () => {
    it('A5 170 (mặc định) → mốc dưới 100 (tăng 70% không > 70) = 425.000', () => {
        const r = calculateFlyer(P({}), config);
        expect(r.error).toBeNull();
        expect(r.sourceQty).toBe(100);
        expect(r.unitPrice).toBe(2500);
        expect(r.total).toBe(425000);
    });

    it('A5 171 → mốc trên 200 (tăng 71% > 70) = 342.000', () => {
        const r = calculateFlyer(P({ quantity: 171 }), config);
        expect(r.sourceQty).toBe(200);
        expect(r.unitPrice).toBe(2000);
        expect(r.total).toBe(342000);
    });

    it('A4 50 → trùng mốc = 320.000', () => {
        const r = calculateFlyer(P({ size: 'A4', quantity: 50 }), config);
        expect(r.total).toBe(320000);
    });

    it('A5 200 · C300 · 1 mặt · cán · cấn 1-2 · nội 3-5 = 529.000 (thứ tự cộng đúng)', () => {
        const r = calculateFlyer(
            P({
                quantity: 200,
                paper: 'C300',
                sides: '1',
                lamination: 'yes',
                creasing: '1-2',
                contents: '3-5',
            }),
            config
        );
        expect(r.basePrice).toBe(400000);
        expect(r.oneSideDiscount).toBe(140000); // 400000 × 35%
        expect(r.paperFee).toBe(30000); // 150 × 200
        expect(r.contentFee).toBe(29000); // (260000 + 30000) × 10%
        expect(r.laminationFee).toBe(60000); // 300 × 200
        expect(r.creasingFee).toBe(150000);
        expect(r.total).toBe(529000);
    });

    it('over-max: A5 2500 → đơn giá mốc 2000 = 3.875.000', () => {
        const r = calculateFlyer(P({ quantity: 2500 }), config);
        expect(r.sourceQty).toBe(2000);
        expect(r.unitPrice).toBe(1550);
        expect(r.total).toBe(3875000);
    });

    it('cấn 3-5 & SL > 2000 → requiresManualQuote, fee 0', () => {
        const r = calculateFlyer(P({ quantity: 2500, creasing: '3-5' }), config);
        expect(r.requiresManualQuote).toBe(true);
        expect(r.creasingFee).toBe(0);
    });

    it('cấn 1-2 & SL > 2000 → qty × 140', () => {
        const r = calculateFlyer(P({ quantity: 2500, creasing: '1-2' }), config);
        expect(r.requiresManualQuote).toBe(false);
        expect(r.creasingFee).toBe(2500 * 140);
    });

    it('SL < min → error', () => {
        expect(calculateFlyer(P({ quantity: 50 }), config).error).toMatch(/tối thiểu/);
        expect(calculateFlyer(P({ quantity: 0 }), config).error).toBeTruthy();
    });

    it('in 1 mặt giảm 35% trên giá in cơ bản (A5 200)', () => {
        const two = calculateFlyer(P({ quantity: 200 }), config);
        const one = calculateFlyer(P({ quantity: 200, sides: '1' }), config);
        expect(one.oneSideDiscount).toBe(two.basePrice * 0.35);
        expect(one.total).toBeLessThan(two.total);
    });

    it('khổ không hợp lệ → error', () => {
        expect(calculateFlyer(P({ size: 'A3' }), config).error).toBeTruthy();
    });
});
