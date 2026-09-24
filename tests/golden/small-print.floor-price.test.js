// GIÁ SÀN — mức tiệm không bao giờ bán dưới (config v1.8.0).
//
// Hai công thức, chia theo cách tính giá giấy:
//   Giấy ram           sàn = 1.500đ × trang A4 + giá vốn thành phẩm
//   m² / tờ / mỹ thuật sàn = 1.100đ × trang A4 + tiền giấy thật + giá vốn thành phẩm
//
// Ba ràng buộc quan trọng nhất ở file này:
//   1. Giấy ram KHÔNG được cộng tiền giấy thật — mức 1.500 đã gồm giấy, cộng nữa là
//      tính hai lần và sàn vọt lên trên cả giá báo khách.
//   2. Sàn = 0 phải cho ra `active: false` — đó là đường lùi của admin, hỏng chỗ này là
//      không tắt sàn được nữa.
//   3. Config rác không được ném: hàm này chạy trong lúc admin đang gõ số.

import { describe, it, expect } from 'vitest';
import {
    calculateFloorPrice,
    floorIncludesPaper,
} from '../../src/modules/small-print/engine/floorPrice.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig.js';

const config = DEFAULT_CONFIG;
const RAM = config.PAPER_REFERENCE_CONFIG.minPrintPricePerPage; // 1500
const CHI_IN = config.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage; // 1100

const floor = (over = {}) =>
    calculateFloorPrice({
        pricingModel: 'ream',
        totalA4Pages: 1000,
        paperCost: 0,
        otherCost: 0,
        quantity: 500,
        printContents: 1,
        config,
        ...over,
    });

describe('floorIncludesPaper — chỉ giấy ram', () => {
    it('ram → mức sàn đã gồm giấy', () => {
        expect(floorIncludesPaper('ream')).toBe(true);
    });

    it.each(['sqm', 'per_sheet', 'custom'])('%s → mức chỉ in, phải cộng giấy thật', (m) => {
        expect(floorIncludesPaper(m)).toBe(false);
    });

    it('model lạ / thiếu → rơi vào nhánh AN TOÀN HƠN (cộng giấy thật)', () => {
        expect(floorIncludesPaper(undefined)).toBe(false);
        expect(floorIncludesPaper('model-moi-nao-do')).toBe(false);
    });
});

describe('Giấy ram — sàn đã gồm giấy', () => {
    it('1.000 trang → 1.500.000đ, không thành phẩm', () => {
        const f = floor();
        expect(f.rate).toBe(RAM);
        expect(f.printFloor).toBe(1000 * RAM);
        expect(f.total).toBe(1500000);
        expect(f.active).toBe(true);
    });

    it('KHÔNG cộng tiền giấy thật dù caller có truyền vào', () => {
        const f = floor({ paperCost: 900000 });
        expect(f.paperCost).toBe(0);
        expect(f.total).toBe(1500000);
    });

    it('cộng giá vốn thành phẩm', () => {
        expect(floor({ otherCost: 320000 }).total).toBe(1500000 + 320000);
    });
});

describe('Giấy m² / theo tờ / mỹ thuật — sàn chỉ in + giấy thật', () => {
    it.each(['sqm', 'per_sheet', 'custom'])('%s: 1.000 trang + giấy 800k + gia công 200k', (m) => {
        const f = floor({ pricingModel: m, paperCost: 800000, otherCost: 200000 });
        expect(f.rate).toBe(CHI_IN);
        expect(f.includesPaper).toBe(false);
        expect(f.printFloor).toBe(1000 * CHI_IN);
        expect(f.paperCost).toBe(800000);
        expect(f.total).toBe(1100000 + 800000 + 200000);
    });

    it('cùng một đơn, đổi ram → decal xi thì sàn đổi theo đúng hai luật', () => {
        const chung = { totalA4Pages: 500, paperCost: 1200000, otherCost: 0 };
        expect(floor({ ...chung, pricingModel: 'ream' }).total).toBe(500 * RAM);
        expect(floor({ ...chung, pricingModel: 'per_sheet' }).total).toBe(500 * CHI_IN + 1200000);
    });
});

describe('Phụ thu nhiều nội dung áp lên cả sàn', () => {
    it('1 nội dung → không phụ thu', () => {
        expect(floor({ printContents: 1 }).surcharge).toBe(0);
    });

    it('nhiều nội dung → sàn tăng đúng % của bảng phụ thu', () => {
        const f = floor({ printContents: 5, quantity: 500 });
        const tier = config.PRINT_CONTENT_CONFIG.tiers.find((t) => 5 >= t.min && 5 <= t.max);

        expect(f.surcharge).toBeCloseTo(1500000 * tier.surcharge, 6);
        expect(f.total).toBeCloseTo(1500000 * (1 + tier.surcharge), 6);
    });
});

describe('Tắt sàn — đường lùi của admin', () => {
    const withRates = (ram, chiIn) => ({
        ...config,
        PAPER_REFERENCE_CONFIG: {
            ...config.PAPER_REFERENCE_CONFIG,
            minPrintPricePerPage: ram,
            minPrintOnlyPricePerPage: chiIn,
        },
    });

    it('sàn ram = 0 → active false, total 0 ⇒ không kẹp đơn nào', () => {
        const f = floor({ config: withRates(0, CHI_IN) });
        expect(f.active).toBe(false);
        expect(f.total).toBe(0);
    });

    it('tắt sàn này KHÔNG tắt sàn kia', () => {
        const cfg = withRates(0, CHI_IN);
        expect(floor({ config: cfg, pricingModel: 'ream' }).active).toBe(false);
        expect(floor({ config: cfg, pricingModel: 'sqm' }).active).toBe(true);
    });

    it('thiếu hẳn field (config cũ chưa qua withPaperReferenceDefaults) → tắt, không nổ', () => {
        const cfg = { ...config, PAPER_REFERENCE_CONFIG: { referencePaperName: 'C300' } };
        expect(floor({ config: cfg, pricingModel: 'sqm' }).total).toBe(0);
        expect(floor({ config: cfg, pricingModel: 'ream' }).active).toBe(false);
    });
});

describe('Rác không được ném', () => {
    it('0 trang → total 0 nhưng vẫn trả về mức sàn đang đặt', () => {
        const f = floor({ totalA4Pages: 0 });
        expect(f.total).toBe(0);
        expect(f.rate).toBe(RAM);
    });

    it.each([undefined, null, NaN, -5])('số trang = %s → 0, không nổ', (v) => {
        expect(() => floor({ totalA4Pages: v })).not.toThrow();
        expect(floor({ totalA4Pages: v }).total).toBe(0);
    });

    it('giá vốn ÂM bị kẹp về 0, không trừ vào sàn', () => {
        const f = floor({ pricingModel: 'sqm', paperCost: -500000, otherCost: -200000 });
        expect(f.total).toBe(1000 * CHI_IN);
    });

    it('thiếu config / config rác → 0, không nổ', () => {
        expect(calculateFloorPrice({ pricingModel: 'ream', totalA4Pages: 100 }).total).toBe(0);
        expect(calculateFloorPrice({ config: null, totalA4Pages: 100 }).active).toBe(false);
    });
});
