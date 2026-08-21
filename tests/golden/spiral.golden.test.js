// Golden tests cho module SỔ ĐÓNG LÒ XO.
// In từng tờ đơn tại khổ thành phẩm; nhập số trang ruột; bìa 2 tờ; 1/2 mặt riêng;
// đóng lò xo theo bậc số cuốn + phụ giá độ dày.

import { describe, it, expect } from 'vitest';
import { calculateSpiral } from '../../src/modules/spiral/engine/index.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig.js';
import { SPIRAL_DEFAULT_CONFIG } from '../../src/modules/spiral/config/index.js';

const config = { ...DEFAULT_CONFIG, SPIRAL_CONFIG: SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG };

const baseParams = {
    numPages: 96, // số trang ruột
    finishedW: 148,
    finishedH: 210,
    quantity: 100,
    coverPaperType: '3', // C300
    innerPaperType: '0', // C150
    coverSides: '2',
    innerSides: '2',
    coverColorMode: '4color',
    innerColorMode: '4color',
    coverLam: '0',
    innerLam: '0',
    artPaperPrice: 10000,
};

describe('Spiral: calculateSpiral', () => {
    it('A5, 96 trang ruột, 100 cuốn, 2 mặt', () => {
        const r = calculateSpiral(baseParams, config);
        expect(r.error).toBeNull();
        // Khổ in = thành phẩm + 2mm, KHÔNG gấp đôi
        expect(r.pieceW_mm).toBe(150);
        expect(r.pieceH_mm).toBe(212);
        // Số tờ: bìa 2, ruột ceil(96/2)=48, độ dày 50
        expect(r.cover.leaves).toBe(2);
        expect(r.cover.sides).toBe(2);
        expect(r.inner.leaves).toBe(48);
        expect(r.totalLeaves).toBe(50);
        // Lò xo bậc 80–100 = 7.000/cuốn (độ dày 50 → phụ giá mặc định 0)
        expect(r.coilCustomer).toBe(7000 * 100);
        expect(r.thicknessAdd).toBe(0);
        // Tổng khớp
        expect(r.totalCustomerCost).toBe(
            r.printPrice +
                r.lamCost +
                r.paperSurcharge +
                r.artPaperCost -
                r.paperAdjustment +
                r.coilCustomer
        );
        expect(r.unitPerBook).toBeCloseTo(r.totalCustomerCost / 100, 6);
    });

    it('bìa A5 (2 tờ trên tờ in 4-up, qty 1) = 2 trang A4, KHÔNG phải 4 (bằng A4)', () => {
        // A5 148×210, qty 1: bìa 2 tờ ghép 4-up → tờ in cuối chưa đầy, không được tính cả tờ.
        const r = calculateSpiral({ ...baseParams, quantity: 1 }, config);
        expect(r.error).toBeNull();
        expect(r.cover.a4).toBe(2); // 2 tờ × 2 mặt × 0.5 (A5=½A4) = 2
        expect(r.inner.a4).toBe(48); // ruột 48 tờ ghép đầy → không đổi
        expect(r.totalA4Pages).toBe(50);
    });

    it('A4 thành phẩm: số trang A4 quy đổi = số trang nội dung (không nhân đôi)', () => {
        // 210×297 → tờ in 32.2×42.8 · 2 sp/tờ · factor 2. Ruột 100 trang, 1 cuốn.
        const p = { ...baseParams, finishedW: 210, finishedH: 297, numPages: 100, quantity: 1 };
        // Ruột 2 mặt, bìa 1 mặt → A4 = 100 (ruột) + 2 (bìa 1 mặt) = 102; độ dày 50+2=52
        const r1 = calculateSpiral({ ...p, innerSides: '2', coverSides: '1' }, config);
        expect(r1.error).toBeNull();
        expect(r1.totalA4Pages).toBe(102);
        expect(r1.totalLeaves).toBe(52);
        // Bìa 2 mặt → A4 = 100 + 4 = 104
        const r2 = calculateSpiral({ ...p, innerSides: '2', coverSides: '2' }, config);
        expect(r2.totalA4Pages).toBe(104);
        // Ruột 1 mặt → nội dung vẫn 100 trang → A4 = 102 (độc lập số mặt); độ dày 100+2=102
        const r3 = calculateSpiral({ ...p, innerSides: '1', coverSides: '1' }, config);
        expect(r3.totalA4Pages).toBe(102);
        expect(r3.totalLeaves).toBe(102);
    });

    it('ruột in 1 mặt → số tờ ruột gấp đôi', () => {
        const r = calculateSpiral({ ...baseParams, innerSides: '1' }, config);
        expect(r.error).toBeNull();
        expect(r.inner.leaves).toBe(96); // 1 mặt → mỗi tờ 1 trang
        expect(r.inner.sides).toBe(1);
        expect(r.totalLeaves).toBe(98);
    });

    it('ruột in 1 mặt → báo khách CAO hơn 2 mặt (cộng phụ thu giấy dư)', () => {
        const r2 = calculateSpiral({ ...baseParams, innerSides: '2' }, config);
        const r1 = calculateSpiral({ ...baseParams, innerSides: '1' }, config);
        expect(r2.extraPaperCustomer).toBe(0);
        expect(r1.extraPaperCustomer).toBeGreaterThan(0);
        // Chiết khấu giấy KHÔNG nhân đôi theo số tờ 1 mặt (tính trên phần nội dung = 2 mặt).
        expect(r1.paperAdjustment).toBeCloseTo(r2.paperAdjustment, -3);
        // ruột 1 mặt tốn gấp đôi giấy → tổng báo khách phải cao hơn 2 mặt
        expect(r1.totalCustomerCost).toBeGreaterThan(r2.totalCustomerCost);
        // và cao hơn ĐÚNG bằng phần giấy dư (phụ thu không bị chiết khấu triệt tiêu).
        expect(r1.totalCustomerCost - r2.totalCustomerCost).toBeCloseTo(
            r1.extraPaperCustomer,
            -3
        );
    });

    it('cán màng bìa & ruột riêng (per_page) = trang A4 × số mặt × đơn giá cán', () => {
        const r0 = calculateSpiral(baseParams, config);
        expect(r0.lamCost).toBe(0);
        expect(r0.lamLabel).toBe('Không cán');
        const r = calculateSpiral({ ...baseParams, coverLam: '2', innerLam: '1' }, config);
        const tier = config.CUSTOMER_PRICE_TIERS.find(
            (t) => r.totalA4Pages >= t.min && r.totalA4Pages <= t.max
        );
        expect(tier.type).toBe('per_page');
        expect(r.lamCost).toBe((r.coverA4 * 2 + r.innerA4 * 1) * (tier.laminate || 0));
        expect(r.lamLabel).toBe('Bìa cán 2 mặt + Ruột cán 1 mặt');
    });

    it('tương thích laminationMode cũ: cover1 → bìa cán 1 mặt', () => {
        const legacy = { ...baseParams };
        delete legacy.coverLam;
        delete legacy.innerLam;
        legacy.laminationMode = 'cover1';
        const r = calculateSpiral(legacy, config);
        expect(r.lamLabel).toBe('Bìa cán 1 mặt');
        const tier = config.CUSTOMER_PRICE_TIERS.find(
            (t) => r.totalA4Pages >= t.min && r.totalA4Pages <= t.max
        );
        expect(r.lamCost).toBe(r.coverA4 * (tier.laminate || 0));
    });

    it('đơn giá in / trang (quy đổi) = tiền in ÷ tổng trang A4', () => {
        const r = calculateSpiral(baseParams, config);
        expect(r.printPricePerPage).toBeGreaterThan(0);
        expect(r.printPricePerPage).toBeCloseTo(r.printPrice / r.totalA4Pages, 6);
    });

    it('số trang lẻ (97, 2 mặt) → làm tròn lên 49 tờ', () => {
        const r = calculateSpiral({ ...baseParams, numPages: 97 }, config);
        expect(r.error).toBeNull();
        expect(r.inner.leaves).toBe(49); // ceil(97/2)
    });

    it('phụ giá độ dày cộng đúng', () => {
        const cfg = {
            ...config,
            SPIRAL_CONFIG: {
                ...config.SPIRAL_CONFIG,
                thicknessTiers: [{ min: 1, max: Infinity, surcharge: 1000 }],
            },
        };
        const r = calculateSpiral(baseParams, cfg);
        // totalLeaves 50 → surcharge 1.000 × 100 cuốn = 100.000
        expect(r.thicknessAdd).toBe(100000);
        expect(r.coilCustomer).toBe(7000 * 100 + 100000);
    });

    it('lò xo theo bậc số cuốn (3 cuốn → 10.000/cuốn)', () => {
        const r = calculateSpiral({ ...baseParams, quantity: 3 }, config);
        expect(r.coilCustomer).toBe(10000 * 3);
    });

    it('bìa 4 màu + ruột 1 màu đen → chỉ phần ruột giảm 20% (sàn 1.200/trang)', () => {
        const base = calculateSpiral(baseParams, config); // cả 2 = 4 màu
        const r = calculateSpiral({ ...baseParams, innerColorMode: '1color' }, config);
        expect(r.error).toBeNull();
        expect(r.cover.colorMode).toBe('4color');
        expect(r.inner.colorMode).toBe('1color');
        expect(r.totalA4Pages).toBe(base.totalA4Pages); // số trang không đổi
        // Giá in: bìa theo 4 màu, ruột theo 1 màu = max(print×0.8, 1200)
        const tier = config.CUSTOMER_PRICE_TIERS.find(
            (t) => r.totalA4Pages >= t.min && r.totalA4Pages <= t.max
        );
        const rate1c = Math.max(tier.print * 0.8, 1200);
        expect(r.printPrice).toBe(r.coverA4 * tier.print + r.innerA4 * rate1c);
        expect(r.printPrice).toBeLessThan(base.printPrice); // rẻ hơn bản 4 màu
    });

    it('không chọn bìa lót → linerCustomer 0', () => {
        const r = calculateSpiral(baseParams, config);
        expect(r.linerCustomer).toBe(0);
    });

    it('bìa lót theo bậc số cuốn, KHÔNG tính vào độ dày', () => {
        // config: loại '2 zem' có bậc 80–100 = 3.000/cuốn
        const cfg = {
            ...config,
            SPIRAL_CONFIG: {
                ...config.SPIRAL_CONFIG,
                linerTypes: [
                    {
                        name: '2 zem',
                        costPerBook: 0,
                        tiers: [{ min: 1, max: Infinity, price: 3000, type: 'per_book' }],
                    },
                ],
            },
        };
        const base = calculateSpiral(baseParams, cfg); // không lót
        const r = calculateSpiral({ ...baseParams, linerType: '0' }, cfg);
        expect(r.linerName).toBe('2 zem');
        expect(r.linerCustomer).toBe(3000 * 100);
        expect(r.totalLeaves).toBe(base.totalLeaves); // không đổi độ dày
        expect(r.totalCustomerCost).toBe(base.totalCustomerCost + 3000 * 100);
    });

    it('khổ quá lớn → lỗi vượt khổ máy', () => {
        const r = calculateSpiral({ ...baseParams, finishedW: 500, finishedH: 700 }, config);
        expect(r.error).toMatch(/vượt quá khổ/);
    });

    it('số trang ruột < 1 → lỗi', () => {
        const r = calculateSpiral({ ...baseParams, numPages: 0 }, config);
        expect(r.error).toMatch(/Số trang ruột/);
    });
});
