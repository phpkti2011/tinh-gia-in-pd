// Test cho applyDiscount (decal) — chiết khấu % có chặn giá sàn/tờ.
//
// Công thức:
//   floorTotal = sheets × minPricePerSheet
//   final      = max(base×(1−d/100), min(base, floorTotal))
//   floored    = d>0 && giảm thô < final

import { describe, it, expect } from 'vitest';
import { applyDiscount, generateSinglePriceTable } from '../../src/utils/decalCalculator.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/config/decalConfig.js';

describe('applyDiscount — chiết khấu + giá sàn', () => {
    it('d=0 → giữ nguyên giá, không floored', () => {
        const r = applyDiscount(1000000, 10, 0, 50000);
        expect(r.price).toBe(1000000);
        expect(r.floored).toBe(false);
    });

    it('giảm bình thường (chưa chạm sàn)', () => {
        // base 1.000.000, 10 tờ, giảm 10% = 900.000; sàn 10×50.000=500.000 → 900.000
        const r = applyDiscount(1000000, 10, 10, 50000);
        expect(r.price).toBe(900000);
        expect(r.floored).toBe(false);
    });

    it('chạm sàn → chặn ở giá sàn + floored=true', () => {
        // base 1.000.000, 10 tờ, giảm 60% = 400.000 < sàn 10×50.000=500.000 → chặn 500.000
        const r = applyDiscount(1000000, 10, 60, 50000);
        expect(r.price).toBe(500000);
        expect(r.floored).toBe(true);
    });

    it('không có sàn (minPrice=0) → giảm tự do, không floored', () => {
        const r = applyDiscount(1000000, 10, 60, 0);
        expect(r.price).toBe(400000);
        expect(r.floored).toBe(false);
    });

    it('base đã ≤ sàn → không tăng giá, không giảm (floored)', () => {
        // base 400.000 ≤ sàn 10×50.000=500.000 → giữ 400.000, floored (giảm bị chặn hoàn toàn)
        const r = applyDiscount(400000, 10, 20, 50000);
        expect(r.price).toBe(400000);
        expect(r.floored).toBe(true);
    });
});

describe('unavailableMaterials — loại vật liệu không có ở khổ khỏi bảng giá', () => {
    it('khổ đánh dấu Decal nhựa không có → bảng chỉ còn Decal giấy', () => {
        const cfg = JSON.parse(JSON.stringify(DECAL_DEFAULT_CONFIG));
        // Khổ gốc 330×330: đánh dấu Decal nhựa không có.
        cfg.printSheetSizes[0].unavailableMaterials = ['Decal nhựa'];
        const rows = generateSinglePriceTable(15, 'Decal giấy', 330, 330, cfg, 0);
        expect(rows.length).toBeGreaterThan(0);
        expect(rows.some((r) => r.decalType === 'Decal nhựa')).toBe(false);
        expect(rows.every((r) => r.decalType === 'Decal giấy')).toBe(true);
    });

    it('chọn đúng loại bị đánh dấu không có → bảng rỗng', () => {
        const cfg = JSON.parse(JSON.stringify(DECAL_DEFAULT_CONFIG));
        cfg.printSheetSizes[0].unavailableMaterials = ['Decal giấy', 'Decal nhựa'];
        const rows = generateSinglePriceTable(15, 'Decal giấy', 330, 330, cfg, 0);
        expect(rows.length).toBe(0);
    });
});
