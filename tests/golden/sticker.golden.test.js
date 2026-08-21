// Golden tests cho module TÍNH GIÁ TỜ STICKER.
// Port từ webapp_tinh_gia_in_sticker_pd_v9 — tra bảng bậc giá + phụ phí %/cố định.

import { describe, it, expect } from 'vitest';
import { calculateSticker } from '../../src/modules/sticker/engine/index.js';
import { STICKER_DEFAULT_CONFIG } from '../../src/modules/sticker/config/index.js';

const config = STICKER_DEFAULT_CONFIG;
const base = {
    size: '10x10',
    qty: 24,
    stickers: 12,
    contents: 1,
    finish: 'normal',
    fileType: 'vector',
};

describe('Sticker: calculateSticker', () => {
    it('mặc định 10x10 q24 → mốc trên (bậc 30), tổng 192.000', () => {
        const r = calculateSticker(base, config);
        expect(r.error).toBeNull();
        expect(r.tier).toBe(30);
        expect(r.tierMode).toBe('Lấy đơn giá mốc trên');
        expect(r.threshold).toBe(24); // 10 + 0.7×20
        expect(r.unit).toBe(8000);
        expect(r.base).toBe(192000);
        expect(r.total).toBe(192000);
    });

    it('q23 → mốc dưới (bậc 10), tổng 276.000 (đắt hơn q24)', () => {
        const r = calculateSticker({ ...base, qty: 23 }, config);
        expect(r.tier).toBe(10);
        expect(r.tierMode).toBe('Lấy đơn giá mốc dưới');
        expect(r.unit).toBe(12000);
        expect(r.total).toBe(276000);
    });

    it('q9 file ảnh → billable 10 + phí vẽ cắt 100.000 = 220.000', () => {
        const r = calculateSticker({ ...base, qty: 9, fileType: 'image' }, config);
        expect(r.billableQty).toBe(10);
        expect(r.base).toBe(120000); // 12000×10
        expect(r.cutPathFee).toBe(100000);
        expect(r.total).toBe(220000);
    });

    it('phí vẽ cắt chỉ áp file ảnh & qty < ngưỡng 50', () => {
        // qty 50 image → KHÔNG phí (điều kiện qty < 50)
        expect(calculateSticker({ ...base, qty: 50, fileType: 'image' }, config).cutPathFee).toBe(
            0
        );
        // vector luôn 0
        expect(calculateSticker({ ...base, qty: 9, fileType: 'vector' }, config).cutPathFee).toBe(
            0
        );
    });

    it('A4 q100 sticker18 (+20%) nội dung3 vector (+10%) kim tuyến (+20%) → 1.350.000', () => {
        const r = calculateSticker(
            {
                size: 'A4',
                qty: 100,
                stickers: 18,
                contents: 3,
                finish: 'glitter',
                fileType: 'vector',
            },
            config
        );
        expect(r.unit).toBe(9000);
        expect(r.base).toBe(900000);
        expect(r.stickerPct).toBe(20); // ceil((18-12)/5)=2 → 20%
        expect(r.contentPct).toBe(10); // vector: (3-2)×10
        expect(r.finishPct).toBe(20);
        expect(r.totalPct).toBe(50);
        expect(r.percentSurcharge).toBe(450000);
        expect(r.total).toBe(1350000);
    });

    it('qty > 3000 → báo giá riêng (không có số tổng)', () => {
        const r = calculateSticker({ ...base, qty: 3001 }, config);
        expect(r.isCustomQuote).toBe(true);
        expect(r.total).toBeNull();
    });

    it('sticker ≤ 12 miễn phụ phí; 13 → +10%, 18 → +20%', () => {
        expect(calculateSticker({ ...base, stickers: 12 }, config).stickerPct).toBe(0);
        expect(calculateSticker({ ...base, stickers: 13 }, config).stickerPct).toBe(10);
        expect(calculateSticker({ ...base, stickers: 17 }, config).stickerPct).toBe(10);
        expect(calculateSticker({ ...base, stickers: 18 }, config).stickerPct).toBe(20);
    });

    it('laminate dày → phí cố định theo khổ × billable (A5 q50 = 125.000)', () => {
        const r = calculateSticker(
            {
                size: 'A5',
                qty: 50,
                stickers: 12,
                contents: 2,
                finish: 'laminate',
                fileType: 'vector',
            },
            config
        );
        expect(r.finishFixedPerSheet).toBe(2500);
        expect(r.finishFixedFee).toBe(125000); // 2500 × 50
        expect(r.finishPct).toBe(0);
        expect(r.base).toBe(450000); // 9000 × 50
        expect(r.total).toBe(575000);
    });

    it('nội dung: image miễn 1, vector miễn 2', () => {
        // image, contents 2 → (2-1)×10 = 10%
        expect(
            calculateSticker({ ...base, fileType: 'image', qty: 100, contents: 2 }, config)
                .contentPct
        ).toBe(10);
        // vector, contents 2 → 0%
        expect(calculateSticker({ ...base, contents: 2 }, config).contentPct).toBe(0);
    });

    it('mốc chính xác bằng bậc → lấy đúng đơn giá bậc đó (q30 → bậc 30)', () => {
        const r = calculateSticker({ ...base, qty: 30 }, config);
        expect(r.tier).toBe(30);
        expect(r.unit).toBe(8000);
    });

    it('khổ không hợp lệ → error', () => {
        const r = calculateSticker({ ...base, size: 'XX' }, config);
        expect(r.error).toBeTruthy();
    });
});
