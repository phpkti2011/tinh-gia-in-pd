// Golden tests cho module TÍNH GIÁ THẺ NHỰA.
// Port từ webapp/current/index.html — tra bảng bậc SL + hệ số nhóm khách + sàn đơn hàng.

import { describe, it, expect } from 'vitest';
import { calculateCard } from '../../src/modules/card/engine/index.js';
import { CARD_DEFAULT_CONFIG } from '../../src/modules/card/config/index.js';

const config = CARD_DEFAULT_CONFIG;
const P = (o) => ({ product: 'normal', segment: 'direct', addons: {}, ...o });

describe('Card: calculateCard', () => {
    it('q10 normal trực tiếp → sàn đơn thắng: đơn 40.000, tổng 400.000', () => {
        const r = calculateCard(P({ qty: 10 }), config);
        expect(r.isContact).toBe(false);
        expect(r.tierLabel).toBe('10–50 cái');
        expect(r.unit).toBe(40000);
        expect(r.total).toBe(400000);
    });

    it('q100 normal trực tiếp (hệ số ×2 thắng) → đơn 14.000', () => {
        const r = calculateCard(P({ qty: 100 }), config);
        expect(r.unit).toBe(14000); // 7000×2
        expect(r.total).toBe(1400000);
    });

    it('đại lý ×1.5 rẻ hơn trực tiếp ×2 (cùng q100 normal)', () => {
        const direct = calculateCard(P({ qty: 100 }), config);
        const agency = calculateCard(P({ qty: 100, segment: 'agency' }), config);
        expect(agency.unit).toBe(10500); // 7000×1.5
        expect(agency.total).toBeLessThan(direct.total);
    });

    it('add-on cộng vào giá gốc trước khi nhân hệ số (q100 +từ đen)', () => {
        const r = calculateCard(P({ qty: 100, addons: { magstripe: true } }), config);
        expect(r.unit).toBe(16400); // (7000+1200)×2
    });

    it('q9 → cơ sở 10 cái, cap theo tổng 10 cái (đơn 44.500, tổng 400.500 — giữ quirk làm tròn)', () => {
        const r = calculateCard(P({ qty: 9 }), config);
        expect(r.moqApplied).toBe(true);
        expect(r.tierLabel).toMatch(/MOQ/);
        expect(r.unit).toBe(44500);
        expect(r.total).toBe(400500);
    });

    it('thẻ gỗ 4.000–4.999 → LIÊN HỆ (ô giá null)', () => {
        const r = calculateCard(P({ qty: 4000, product: 'wood' }), config);
        expect(r.isContact).toBe(true);
    });

    it('qty > maxQty → LIÊN HỆ', () => {
        const r = calculateCard(P({ qty: 6000 }), config);
        expect(r.isContact).toBe(true);
    });

    it('qty ≤ 0 → LIÊN HỆ (nhập không hợp lệ)', () => {
        expect(calculateCard(P({ qty: 0 }), config).isContact).toBe(true);
        expect(calculateCard(P({ qty: -5 }), config).isContact).toBe(true);
    });

    it('chuyển bậc 50 → 51 (đơn giá gốc đổi)', () => {
        const r50 = calculateCard(P({ qty: 50 }), config);
        const r51 = calculateCard(P({ qty: 51 }), config);
        expect(r50.tierLabel).toBe('10–50 cái');
        expect(r51.tierLabel).toBe('51–99 cái');
    });

    it('chuyển bậc 999 → 1000', () => {
        expect(calculateCard(P({ qty: 999 }), config).tierLabel).toBe('Mốc 700');
        expect(calculateCard(P({ qty: 1000 }), config).tierLabel).toBe('Mốc 1.000');
    });

    it('loại thẻ không hợp lệ → error', () => {
        expect(calculateCard(P({ product: 'zzz' }), config).error).toBeTruthy();
    });

    it('thẻ gỗ q5000 có giá (không null) → tính bình thường', () => {
        const r = calculateCard(P({ qty: 5000, product: 'wood' }), config);
        expect(r.isContact).toBe(false);
        expect(r.unit).toBeGreaterThan(0);
    });
});
