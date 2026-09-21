// UV DTF — chuẩn hoá bảng giá theo mét tới.
//
// Khoá 2 lỗi thật đã xảy ra ở màn Cài Đặt UV DTF:
//   1. Panel đọc/ghi `pricePerMeter` (tên OUTPUT của engine) trong khi engine + schema
//      dùng `price`. Admin đổi giá xong báo giá không nhúc nhích, và bậc mới thêm thì
//      thiếu `price` nên schema chặn → "Không lưu được".
//   2. Bậc thêm sau dòng (vô hạn) không bao giờ được dùng, vì engine lấy tier ĐẦU TIÊN
//      thoả totalMeters <= maxMeters.

import { describe, it, expect } from 'vitest';
import { normalizePriceTiers, sortPriceTiers } from '../../src/modules/uvdtf/config/priceTiers.js';
import { validateUvDtfConfig } from '../../src/modules/uvdtf/config/schema.js';
import { UVDTF_DEFAULT_CONFIG } from '../../src/modules/uvdtf/config/defaultConfig.js';
import { calculateUvDtf } from '../../src/modules/uvdtf/engine/index.js';

describe('normalizePriceTiers — vá field sai tên', () => {
    it('pricePerMeter → price, và bỏ hẳn field cũ', () => {
        const out = normalizePriceTiers([{ maxMeters: 2, pricePerMeter: 845000 }]);
        expect(out).toEqual([{ maxMeters: 2, price: 845000 }]);
        expect('pricePerMeter' in out[0]).toBe(false);
    });

    it('có cả hai → lấy pricePerMeter, vì nó là số admin gõ gần đây nhất', () => {
        const out = normalizePriceTiers([{ maxMeters: 2, price: 440000, pricePerMeter: 845000 }]);
        expect(out[0].price).toBe(845000);
    });

    it('bậc mới thiếu price (do nút "+ Thêm bậc" cũ) → có price sau khi vá', () => {
        const out = normalizePriceTiers([{ maxMeters: Infinity, pricePerMeter: 0 }]);
        expect(out[0].price).toBe(0);
    });

    it('config lành lặn → không đụng gì', () => {
        const tiers = UVDTF_DEFAULT_CONFIG.priceTiers;
        expect(normalizePriceTiers(tiers)).toEqual(tiers);
    });

    it('không mutate input', () => {
        const src = [{ maxMeters: 2, pricePerMeter: 845000 }];
        normalizePriceTiers(src);
        expect(src[0].pricePerMeter).toBe(845000);
        expect(src[0].price).toBeUndefined();
    });

    it('vá xong thì qua được schema (trước đó bị chặn)', () => {
        const broken = {
            ...UVDTF_DEFAULT_CONFIG,
            priceTiers: [
                { maxMeters: 2, pricePerMeter: 845000 },
                { maxMeters: Infinity, pricePerMeter: 685000 },
            ],
        };
        expect(validateUvDtfConfig(broken).isValid).toBe(false);
        expect(
            validateUvDtfConfig({ ...broken, priceTiers: normalizePriceTiers(broken.priceTiers) })
                .isValid
        ).toBe(true);
    });
});

describe('sortPriceTiers — bậc phải tăng dần, (vô hạn) cuối', () => {
    it('bậc 0.5 thêm sau dòng (vô hạn) → được đưa lên đầu', () => {
        const out = sortPriceTiers([
            { maxMeters: 2, price: 845000 },
            { maxMeters: Infinity, price: 685000 },
            { maxMeters: 0.5, price: 1190000 },
        ]);
        expect(out.map((t) => t.maxMeters)).toEqual([0.5, 2, Infinity]);
    });

    it('nhiều dòng (vô hạn) không làm loạn thứ tự (Infinity - Infinity = NaN)', () => {
        const out = sortPriceTiers([
            { maxMeters: Infinity, price: 1 },
            { maxMeters: 5, price: 2 },
            { maxMeters: Infinity, price: 3 },
        ]);
        expect(out.map((t) => t.maxMeters)).toEqual([5, Infinity, Infinity]);
    });

    it('đã đúng thứ tự → giữ nguyên', () => {
        const tiers = UVDTF_DEFAULT_CONFIG.priceTiers;
        expect(sortPriceTiers(tiers)).toEqual(tiers);
    });

    it('không mutate input', () => {
        const src = [
            { maxMeters: Infinity, price: 1 },
            { maxMeters: 2, price: 2 },
        ];
        sortPriceTiers(src);
        expect(src[0].maxMeters).toBe(Infinity);
    });
});

describe('Engine thực sự dùng bậc mới sau khi sắp xếp', () => {
    // Bậc 0.5m giá cao (hàng lẻ) — chỉ có tác dụng khi nằm TRƯỚC dòng (vô hạn).
    const withSmallTier = (tiers) => ({ ...UVDTF_DEFAULT_CONFIG, priceTiers: tiers });
    // 50×90mm × 1 → totalMeters = 0.054 → lọt mọi bậc, nên thứ tự quyết định giá.
    const tiny = { widthMM: 50, heightMM: 90, quantity: 1 };

    const unsorted = [
        { maxMeters: 2, price: 845000 },
        { maxMeters: Infinity, price: 685000 },
        { maxMeters: 0.5, price: 1190000 },
    ];

    it('chưa sắp: dòng (vô hạn) khớp trước → bậc 0.5 chết lặng', () => {
        const r = calculateUvDtf(tiny, withSmallTier(unsorted));
        expect(r.pricePerMeter).toBe(845000);
    });

    it('sắp rồi: bậc 0.5 được dùng đúng', () => {
        const r = calculateUvDtf(tiny, withSmallTier(sortPriceTiers(unsorted)));
        expect(r.pricePerMeter).toBe(1190000);
    });
});
