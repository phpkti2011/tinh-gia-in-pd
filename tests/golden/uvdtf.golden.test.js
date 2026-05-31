// Golden tests cho module UV DTF (TASK-0011).
//
// Khóa kết quả tính giá hiện tại của:
//   - src/utils/uvdtfCalculator.js (1 public export: calculateUvDtf)
//   - src/config/uvdtfConfig.js (UVDTF_DEFAULT_CONFIG)
//
// KHÔNG sửa engine. KHÔNG mock. Tất cả expected values tính tay từ
// formula gốc (xem comment trong từng case).
//
// Config mặc định:
//   materialWidthCM: 55, printableWidthCM: 53, paddingCM: 0.4
//   minBillableMeters: 1
//   priceTiers: [
//     {maxMeters:2, price:440000}, {maxMeters:5, price:390000},
//     {maxMeters:10, price:330000}, {maxMeters:Infinity, price:280000}
//   ]
//
// Formula:
//   itemWcm = widthMM/10 + pad; itemHcm = heightMM/10 + pad
//   Upright:  acrossUp = floor(printableW / itemWcm)
//             rowsUp = ceil(qty / acrossUp)
//             lengthUp = rowsUp × itemHcm
//   Rotated:  acrossRot = floor(printableW / itemHcm)
//             rowsRot = ceil(qty / acrossRot)
//             lengthRot = rowsRot × itemWcm
//   Chọn orientation có length ngắn hơn (lengthUp <= lengthRot → upright)
//   totalMeters = totalLengthCM / 100
//   pricePerMeter = tier đầu tiên thỏa totalMeters <= maxMeters
//   billableMeters = max(minBillableMeters, totalMeters)
//   totalPrice = billableMeters × pricePerMeter

import { describe, it, expect } from 'vitest';
import { calculateUvDtf } from '../../src/utils/uvdtfCalculator.js';
import { UVDTF_DEFAULT_CONFIG } from '../../src/config/uvdtfConfig.js';

const config = UVDTF_DEFAULT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// CASE A — đơn nhỏ, MIN BILLABLE METERS kích hoạt
// Input: 50×90mm, qty=10
// Trace:
//   itemWcm = 50/10 + 0.4 = 5.4
//   itemHcm = 90/10 + 0.4 = 9.4
//   Upright:  acrossUp = floor(53/5.4) = 9
//             rowsUp = ceil(10/9) = 2
//             lengthUp = 2 × 9.4 = 18.8
//   Rotated:  acrossRot = floor(53/9.4) = 5
//             rowsRot = ceil(10/5) = 2
//             lengthRot = 2 × 5.4 = 10.8
//   Rotated thắng (10.8 < 18.8)
//   totalMeters = 0.108
//   tier upTo=2 → 440.000đ/m
//   billable = max(1, 0.108) = 1 (min kicks in)
//   total = 1 × 440.000 = 440.000đ
//   rowsPerMeter = floor(100/5.4) = 18; itemsPerMeter = 5 × 18 = 90
// ─────────────────────────────────────────────────────────────────────────────
describe('Case A: 50×90mm × 10 cái — min billable (0.108m < 1m)', () => {
    const r = calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 10 }, config);

    it('chọn rotated (length 10.8 < 18.8)', () => {
        expect(r.rotated).toBe(true);
        expect(r.itemsAcross).toBe(5);
        expect(r.finalItemW).toBeCloseTo(9.4, 6);
        expect(r.finalItemH).toBeCloseTo(5.4, 6);
    });

    it('totalLengthCM = 10.8 (2 rows × 5.4)', () => {
        expect(r.totalLengthCM).toBeCloseTo(10.8, 4);
        expect(r.totalMeters).toBeCloseTo(0.108, 4);
    });

    it('pricePerMeter = 440.000đ (tier ≤ 2m)', () => {
        expect(r.pricePerMeter).toBe(440000);
    });

    it('billableMeters = 1 (min kích hoạt vì 0.108 < 1)', () => {
        expect(r.billableMeters).toBe(1);
    });

    it('totalPrice = 440.000đ', () => {
        expect(r.totalPrice).toBe(440000);
    });

    it('itemsPerMeter = 90 (5 × 18 rows/m)', () => {
        expect(r.itemsPerMeter).toBe(90);
        expect(r.rowsPerMeter).toBe(18);
    });

    it('giữ originalW + originalH', () => {
        expect(r.originalW).toBe(50);
        expect(r.originalH).toBe(90);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE B — đơn vừa, billable đã vượt min
// Input: 50×90mm, qty=100
// Trace:
//   Upright:  rowsUp = ceil(100/9) = 12, lengthUp = 12 × 9.4 = 112.8
//   Rotated:  rowsRot = ceil(100/5) = 20, lengthRot = 20 × 5.4 = 108
//   Rotated thắng (108 < 112.8)
//   totalMeters = 1.08
//   tier upTo=2 → 440.000đ/m
//   billable = max(1, 1.08) = 1.08
//   total = 1.08 × 440.000 = 475.200đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case B: 50×90mm × 100 cái — vượt min, vẫn tier 1', () => {
    const r = calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 100 }, config);

    it('chọn rotated (108 < 112.8)', () => {
        expect(r.rotated).toBe(true);
    });

    it('totalLengthCM = 108; totalMeters = 1.08', () => {
        expect(r.totalLengthCM).toBeCloseTo(108, 4);
        expect(r.totalMeters).toBeCloseTo(1.08, 4);
    });

    it('pricePerMeter = 440.000đ (vẫn tier ≤ 2m)', () => {
        expect(r.pricePerMeter).toBe(440000);
    });

    it('billableMeters = 1.08 (vượt min)', () => {
        expect(r.billableMeters).toBeCloseTo(1.08, 4);
    });

    it('totalPrice ≈ 475.200đ', () => {
        expect(r.totalPrice).toBeCloseTo(475200, 1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE C — đơn lớn, tier cuối (>10m)
// Input: 50×90mm, qty=1000
// Trace:
//   Upright:  rowsUp = ceil(1000/9) = 112, lengthUp = 112 × 9.4 = 1052.8
//   Rotated:  rowsRot = ceil(1000/5) = 200, lengthRot = 200 × 5.4 = 1080
//   Upright thắng (1052.8 < 1080)
//   totalMeters = 10.528
//   tier upTo=Infinity → 280.000đ/m (vì 10.528 > 10)
//   billable = 10.528
//   total = 10.528 × 280.000 = 2.947.840đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case C: 50×90mm × 1.000 cái — tier cuối (>10m)', () => {
    const r = calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 1000 }, config);

    it('chọn UPRIGHT (1052.8 < 1080)', () => {
        expect(r.rotated).toBe(false);
        expect(r.itemsAcross).toBe(9);
        expect(r.finalItemW).toBeCloseTo(5.4, 6);
        expect(r.finalItemH).toBeCloseTo(9.4, 6);
    });

    it('totalLengthCM = 1052.8; totalMeters = 10.528', () => {
        expect(r.totalLengthCM).toBeCloseTo(1052.8, 2);
        expect(r.totalMeters).toBeCloseTo(10.528, 4);
    });

    it('pricePerMeter = 280.000đ (tier cuối)', () => {
        expect(r.pricePerMeter).toBe(280000);
    });

    it('totalPrice ≈ 2.947.840đ', () => {
        expect(r.totalPrice).toBeCloseTo(2947840, 0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE D — tem vuông (no rotation benefit) + min billable
// Input: 80×80mm, qty=50
// Trace:
//   itemWcm = itemHcm = 8.4
//   Upright/Rotated cho cùng số (đối xứng)
//   acrossUp = floor(53/8.4) = 6
//   rowsUp = ceil(50/6) = 9
//   lengthUp = 9 × 8.4 = 75.6
//   lengthUp <= lengthRot (cùng) → chọn upright (rotated=false)
//   totalMeters = 0.756
//   tier upTo=2 → 440.000đ/m
//   billable = max(1, 0.756) = 1 (min kích hoạt)
//   total = 1 × 440.000 = 440.000đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case D: 80×80mm × 50 cái — tem vuông, min billable', () => {
    const r = calculateUvDtf({ widthMM: 80, heightMM: 80, quantity: 50 }, config);

    it('rotated=false (upright thắng khi tie)', () => {
        expect(r.rotated).toBe(false);
        expect(r.itemsAcross).toBe(6);
        expect(r.finalItemW).toBeCloseTo(8.4, 6);
        expect(r.finalItemH).toBeCloseTo(8.4, 6);
    });

    it('totalLengthCM = 75.6; totalMeters = 0.756', () => {
        expect(r.totalLengthCM).toBeCloseTo(75.6, 4);
        expect(r.totalMeters).toBeCloseTo(0.756, 4);
    });

    it('billableMeters = 1 (min kích hoạt)', () => {
        expect(r.billableMeters).toBe(1);
    });

    it('totalPrice = 440.000đ (= 1 × 440.000)', () => {
        expect(r.totalPrice).toBe(440000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE E — input invalid → null
// ─────────────────────────────────────────────────────────────────────────────
describe('Case E: input invalid → return null', () => {
    it('quantity=0 → null', () => {
        expect(calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 0 }, config)).toBeNull();
    });

    it('widthMM=0 → null', () => {
        expect(calculateUvDtf({ widthMM: 0, heightMM: 90, quantity: 10 }, config)).toBeNull();
    });

    it('heightMM=0 → null', () => {
        expect(calculateUvDtf({ widthMM: 50, heightMM: 0, quantity: 10 }, config)).toBeNull();
    });

    it('tem cả 2 chiều quá lớn (600×600mm > printable 53cm) → null', () => {
        // itemWcm = 60.4 > 53; itemHcm = 60.4 > 53
        // → acrossUp = floor(53/60.4) = 0, acrossRot = 0 → null
        expect(calculateUvDtf({ widthMM: 600, heightMM: 600, quantity: 10 }, config)).toBeNull();
    });

    it('thiếu params → null (undefined fields)', () => {
        expect(calculateUvDtf({}, config)).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE F — tier boundary qty=200 (ngay sau 2m)
// Input: 50×90mm, qty=200
// Trace:
//   Upright:  rowsUp = ceil(200/9) = 23, lengthUp = 23 × 9.4 = 216.2
//   Rotated:  rowsRot = ceil(200/5) = 40, lengthRot = 40 × 5.4 = 216
//   Rotated thắng (216 < 216.2)
//   totalMeters = 2.16 (vừa quá tier 1)
//   tier upTo=5 → 390.000đ/m
//   billable = 2.16
//   total = 2.16 × 390.000 = 842.400đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case F: 50×90mm × 200 cái — vừa qua tier 1 → tier 2 (390k)', () => {
    const r = calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 200 }, config);

    it('chọn rotated (216 < 216.2)', () => {
        expect(r.rotated).toBe(true);
    });

    it('totalMeters ≈ 2.16 (vừa qua tier 1)', () => {
        expect(r.totalMeters).toBeCloseTo(2.16, 4);
    });

    it('pricePerMeter = 390.000đ (tier ≤ 5m)', () => {
        expect(r.pricePerMeter).toBe(390000);
    });

    it('totalPrice ≈ 842.400đ', () => {
        expect(r.totalPrice).toBeCloseTo(842400, 0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE G — structural check: object trả về có đủ 13 trường
// ─────────────────────────────────────────────────────────────────────────────
describe('Case G: structural — object output có đủ 13 trường', () => {
    const r = calculateUvDtf({ widthMM: 50, heightMM: 90, quantity: 100 }, config);

    it('có đủ 13 trường public', () => {
        const expectedKeys = [
            'totalLengthCM',
            'totalMeters',
            'pricePerMeter',
            'billableMeters',
            'totalPrice',
            'rotated',
            'finalItemW',
            'finalItemH',
            'itemsAcross',
            'itemsPerMeter',
            'rowsPerMeter',
            'originalW',
            'originalH',
        ];
        for (const key of expectedKeys) {
            expect(r).toHaveProperty(key);
        }
        expect(Object.keys(r).length).toBe(13);
    });
});
