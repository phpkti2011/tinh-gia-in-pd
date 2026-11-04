// In khổ lớn: giá in / cán TỐI THIỂU là sàn của CẢ ĐƠN, áp đúng 1 lần.
//
// Trước đây calcItemOnRoll chặn sàn cho từng tấm rồi pricing.js nhân × số lượng ⇒
// 80 tấm 2×80cm (1,28 m²) ra 6,1 triệu thay vì ~335 nghìn. Xem docs/pricing-rules/large-print.md.
//
// Bảng giá mặc định: Decal Sữa cuộn 1.07 in 150k/m², vật liệu 35k/m²; Màng Mờ 20k/m²;
// sàn in 30k, sàn cán 15k; bế demi ≤5 m² = 80k/m².

import { describe, it, expect } from 'vitest';
import { calculateLargePrint } from '../../src/modules/large-print/engine/index.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/index.js';

const config = LARGE_PRINT_DEFAULT_CONFIG;

const base = {
    materialTypeKey: 'decal_sua',
    laminationTypeKey: 'mang_mo',
    formexTypeKey: 'none',
    edgeTaping: false,
    grommetsCheck: false,
    grommetsCount: 0,
    dieCutting: false,
    standeeKey: 'none',
};

const calc = (items, extra = {}) => calculateLargePrint({ ...base, items, ...extra }, config);

describe('In khổ lớn — giá tối thiểu tính 1 lần cho cả đơn', () => {
    it('80 tấm 2×80 cm: tính theo tổng m², không bị nâng sàn từng tấm', () => {
        const r = calc([{ width: 2, height: 80, quantity: 80 }]);
        // in 1,28 m² × 150k = 192.000 · vật liệu dư 0,432 m² × 35k = 15.120 · cán 1,28 × 20k = 25.600
        expect(r.totalCost).toBeCloseTo(192000 + 15120 + 25600, 0);
        expect(r.minChargeTopUp).toBe(0);
        expect(r.printedArea).toBeCloseTo(1.28, 6);
        expect(r.unprintedArea).toBeCloseTo(0.432, 6);
    });

    it('đúng đơn trong ảnh (kèm bế demi 80k/m²) ≈ 335.120đ', () => {
        const r = calc([{ width: 2, height: 80, quantity: 80 }], { dieCutting: true });
        expect(r.finishingCost).toBeCloseTo(102400, 0);
        expect(r.totalCost).toBeCloseTo(335120, 0);
    });

    it('sàn Supabase 50k/25k cũng không nhân theo số tấm', () => {
        const live = { ...config, MIN_PRINT_PRICE: 50000, MIN_LAMINATION_PRICE: 25000 };
        const r = calculateLargePrint(
            { ...base, items: [{ width: 2, height: 80, quantity: 80 }], dieCutting: true },
            live
        );
        // 192.000 > 50.000 và 25.600 > 25.000 ⇒ không bù gì
        expect(r.minChargeTopUp).toBe(0);
        expect(r.totalCost).toBeCloseTo(335120, 0);
    });

    it('1 tấm 10×10 cm: bù lên sàn 1 lần (in 30k + cán 15k)', () => {
        const r = calc([{ width: 10, height: 10, quantity: 1 }]);
        // in thô 1.500 → bù 28.500; cán thô 200 → bù 14.800; vật liệu dư (1,07−0,1)×0,1×35k = 3.395
        expect(r.minChargeTopUp).toBeCloseTo(28500 + 14800, 0);
        expect(r.totalCost).toBeCloseTo(30000 + 15000 + 3395, 0);
    });

    it('5 tấm 10×10 cm: vẫn chỉ 1 lần sàn (không gấp 5)', () => {
        const r = calc([{ width: 10, height: 10, quantity: 5 }]);
        // in thô 7.500 → bù 22.500; cán thô 1.000 → bù 14.000; vật liệu dư 5 × 3.395
        expect(r.minChargeTopUp).toBeCloseTo(22500 + 14000, 0);
        expect(r.totalCost).toBeCloseTo(30000 + 15000 + 5 * 3395, 0);
    });

    it('nhiều loại tấm trong 1 đơn: sàn tính trên tổng, không cộng mỗi loại một sàn', () => {
        const r = calc([
            { width: 10, height: 10, quantity: 1 },
            { width: 20, height: 20, quantity: 1 },
        ]);
        // in thô 1.500 + 6.000 = 7.500 → bù 22.500 (1 lần); cán thô 200 + 800 = 1.000 → bù 14.000
        expect(r.minChargeTopUp).toBeCloseTo(22500 + 14000, 0);
        expect(r.totalCost).toBeCloseTo(30000 + 15000 + 3395 + 6090, 0);
    });

    it('không cán màng ⇒ không bù sàn cán', () => {
        const r = calc([{ width: 10, height: 10, quantity: 1 }], { laminationTypeKey: 'none' });
        expect(r.minChargeTopUp).toBeCloseTo(28500, 0);
        expect(r.totalCost).toBeCloseTo(30000 + 3395, 0);
    });

    it('đơn lớn (1×1 m): giá theo m² thuần, không bù', () => {
        const r = calc([{ width: 100, height: 100, quantity: 1 }], { laminationTypeKey: 'none' });
        expect(r.minChargeTopUp).toBe(0);
        expect(r.totalCost).toBeCloseTo(1 * 150000 + 0.07 * 35000, 0);
    });
});
