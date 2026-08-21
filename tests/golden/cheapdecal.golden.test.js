// Golden tests cho module DECAL NHÃN GIÁ RẺ.
// Dựng từ bảng giá Google Sheets — tra bảng (cỡ × SL cố định) + phụ phí.

import { describe, it, expect } from 'vitest';
import { calculateCheapDecal } from '../../src/modules/cheapdecal/engine/index.js';
import { CHEAP_DECAL_DEFAULT_CONFIG } from '../../src/modules/cheapdecal/config/index.js';

const config = CHEAP_DECAL_DEFAULT_CONFIG;
const P = (o) => ({
    size: '1',
    quantity: 1000,
    shape: 'round',
    material: 'paper',
    lamination: 'no',
    rush: 'no',
    ...o,
});

describe('CheapDecal: calculateCheapDecal', () => {
    it('Cỡ1 500 tròn giấy = 90.000', () => {
        expect(calculateCheapDecal(P({ quantity: 500 }), config).total).toBe(90000);
    });

    it('Cỡ7 2000 = 800.000', () => {
        expect(calculateCheapDecal(P({ size: '7', quantity: 2000 }), config).total).toBe(800000);
    });

    it('Cỡ1 1000 nhãn VUÔNG (+10%) = 121.000', () => {
        const r = calculateCheapDecal(P({ shape: 'square' }), config);
        expect(r.squareSurcharge).toBe(11000);
        expect(r.total).toBe(121000);
    });

    it('Cỡ1 1000 decal NHỰA (+40đ/nhãn) = 150.000', () => {
        const r = calculateCheapDecal(P({ material: 'plastic' }), config);
        expect(r.materialFee).toBe(40000);
        expect(r.total).toBe(150000);
    });

    it('Cỡ1 1000 CÁN màng (+40đ/nhãn) = 150.000', () => {
        const r = calculateCheapDecal(P({ lamination: 'yes' }), config);
        expect(r.laminationFee).toBe(40000);
        expect(r.total).toBe(150000);
    });

    it('Cỡ1 1000 lấy trong ngày = 110.000 + 180.000 = 290.000', () => {
        const r = calculateCheapDecal(P({ rush: 'yes' }), config);
        expect(r.rushFee).toBe(180000);
        expect(r.total).toBe(290000);
    });

    it('combo Cỡ1 1000 vuông + nhựa + cán + rush = 381.000', () => {
        const r = calculateCheapDecal(
            P({ shape: 'square', material: 'plastic', lamination: 'yes', rush: 'yes' }),
            config
        );
        expect(r.total).toBe(381000);
    });

    it('số tờ in = ceil(SL / nhãn per tờ) (Cỡ7 2000, 16 nhãn/tờ → 125)', () => {
        expect(calculateCheapDecal(P({ size: '7', quantity: 2000 }), config).sheets).toBe(125);
    });

    it('SL không phải 500/1000/2000 → error', () => {
        expect(calculateCheapDecal(P({ quantity: 700 }), config).error).toBeTruthy();
    });

    it('cỡ không hợp lệ → error', () => {
        expect(calculateCheapDecal(P({ size: '9' }), config).error).toBeTruthy();
    });
});
