// Tests cho thành phẩm BẾ FORMEX (large-print config v1.4.0).
//
// Luật:
//   - Tính theo TỔNG m² của đơn, bậc LŨY TIẾN (giống bế demi), giá theo HÌNH DẠNG.
//   - CHỈ tính khi đơn CÓ bồi Formex (formexTypeKey !== 'none' sau deny-list).
//   - Có 1 giá sàn chung MIN_FORMEX_DIE_CUT_PRICE cho mọi hình dạng.
//   - Tiền gộp vào finishingCost/finishingDesc (KHÔNG thêm field return mới —
//     object vẫn 14 key, xem large-print.finishing-rules.test.js).
//
// Bảng giá mặc định (limits 5/20 m² cho mọi hình):
//   tron      60.000 / 40.000 / 25.000
//   vuong_cn  40.000 / 25.000 / 15.000
//   bo_goc    50.000 / 30.000 / 20.000
//   phuc_tap  90.000 / 60.000 / 40.000
//   sàn: 50.000đ
//
// structuredClone (KHÔNG dùng JSON round-trip) để giữ Infinity ở
// FORMEX_DISCOUNT_TIERS[last].maxArea.

import { describe, it, expect } from 'vitest';
import { calculateLargePrint } from '../../src/utils/largePrintCalculator.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/config/largePrintConfig.js';

const config = LARGE_PRINT_DEFAULT_CONFIG;

// PP 100×100 trơn — trùng Case A của golden test (121.750đ).
const base = {
    width: 100,
    height: 100,
    quantity: 1,
    materialTypeKey: 'pp_co_keo',
    laminationTypeKey: 'none',
    formexTypeKey: 'none',
    edgeTaping: false,
    grommetsCheck: false,
    grommetsCount: 0,
    dieCutting: false,
    formexDieCut: false,
    formexDieCutShapeKey: 'tron',
    standeeKey: 'none',
};

// Đơn có bồi Formex + bật bế. quantity tấm 1m² ⇒ quantity == tổng m².
const cut = (over = {}) => ({
    ...base,
    formexTypeKey: 'formex_5mm',
    formexDieCut: true,
    ...over,
});

function withBlocked(ids) {
    const c = structuredClone(config);
    c.MATERIAL_TYPES.pp_co_keo.disallowedFinishing = ids;
    return c;
}

describe('Gate — chỉ bế khi ĐÃ bồi Formex', () => {
    it('chưa bồi Formex mà vẫn tick bế → không tính tiền, về đúng Case A', () => {
        const r = calculateLargePrint({ ...base, formexDieCut: true }, config);
        expect(r.finishingCost).toBe(0);
        expect(r.finishingDesc).toBe('');
        expect(r.totalCost).toBeCloseTo(121750, 0);
    });

    it('vật liệu bị chặn "formex" → bế tắt theo dây chuyền (khỏi khai 2 lần)', () => {
        const r = calculateLargePrint(cut(), withBlocked(['formex']));
        expect(r.formexCost).toBe(0);
        expect(r.finishingCost).toBe(0);
    });

    it('vật liệu bị chặn riêng "formexDieCut" → bồi vẫn tính, bế không', () => {
        const r = calculateLargePrint(cut(), withBlocked(['formexDieCut']));
        expect(r.formexCost).toBeGreaterThan(0);
        expect(r.finishingCost).toBe(0);
    });

    it('bỏ tick bế → tổng giảm đúng bằng tiền bế, phần còn lại không đổi', () => {
        const on = calculateLargePrint(cut({ quantity: 8 }), config);
        const off = calculateLargePrint(cut({ quantity: 8, formexDieCut: false }), config);
        expect(on.totalCost - off.totalCost).toBe(420000); // 8m² tròn
        expect(on.formexCost).toBe(off.formexCost);
    });
});

describe('Bậc LŨY TIẾN theo m²', () => {
    it('bậc 1 (≤5m²): 3m² tròn = 3×60.000 = 180.000đ', () => {
        expect(calculateLargePrint(cut({ quantity: 3 }), config).finishingCost).toBe(180000);
    });

    it('bậc 2 (5–20m²): 8m² phức tạp = 5×90.000 + 3×60.000 = 630.000đ', () => {
        const r = calculateLargePrint(
            cut({ quantity: 8, formexDieCutShapeKey: 'phuc_tap' }),
            config
        );
        expect(r.finishingCost).toBe(630000);
    });

    it('bậc 3 (>20m²): 30m² tròn = 5×60.000 + 15×40.000 + 10×25.000 = 1.150.000đ', () => {
        expect(calculateLargePrint(cut({ quantity: 30 }), config).finishingCost).toBe(1150000);
    });

    it('đúng mốc 5m² và 20m² (biên) — tròn', () => {
        expect(calculateLargePrint(cut({ quantity: 5 }), config).finishingCost).toBe(300000);
        // 5×60.000 + 15×40.000 = 900.000
        expect(calculateLargePrint(cut({ quantity: 20 }), config).finishingCost).toBe(900000);
    });
});

describe('Giá khác nhau theo HÌNH DẠNG (cùng 8m²)', () => {
    const at8 = (key) =>
        calculateLargePrint(cut({ quantity: 8, formexDieCutShapeKey: key }), config).finishingCost;

    it('vuông/CN rẻ nhất, phức tạp đắt nhất', () => {
        expect(at8('vuong_cn')).toBe(275000); // 5×40.000 + 3×25.000
        expect(at8('bo_goc')).toBe(340000); // 5×50.000 + 3×30.000
        expect(at8('tron')).toBe(420000); // 5×60.000 + 3×40.000
        expect(at8('phuc_tap')).toBe(630000); // 5×90.000 + 3×60.000
        expect(at8('vuong_cn')).toBeLessThan(at8('phuc_tap'));
    });
});

describe('Giá sàn MIN_FORMEX_DIE_CUT_PRICE', () => {
    it('tấm 50×50 (0,25m²) tròn → 15.000 bị nâng lên 50.000đ', () => {
        const r = calculateLargePrint(cut({ width: 50, height: 50 }), config);
        expect(r.finishingCost).toBe(50000);
    });

    it('sàn chỉ áp cho phần BẾ, không nuốt các thành phẩm khác', () => {
        const r = calculateLargePrint(cut({ width: 50, height: 50, edgeTaping: true }), config);
        // dán biên: max(0,25 × 20.000, 20.000) = 20.000 ; bế: 50.000
        expect(r.finishingCost).toBe(70000);
    });

    it('thiếu MIN_FORMEX_DIE_CUT_PRICE → không có sàn, không throw', () => {
        const c = structuredClone(config);
        delete c.MIN_FORMEX_DIE_CUT_PRICE;
        const r = calculateLargePrint(cut({ width: 50, height: 50 }), c);
        expect(r.finishingCost).toBe(15000);
    });
});

describe('Fallback dễ dãi — config cũ / admin sửa tay', () => {
    it('config lưu trước v1.4.0 (xoá hẳn key) → 0đ, giá bằng bản không bế', () => {
        const legacy = structuredClone(config);
        delete legacy.FORMEX_DIE_CUT_SHAPES;
        const on = calculateLargePrint(cut({ quantity: 8 }), legacy);
        const off = calculateLargePrint(cut({ quantity: 8, formexDieCut: false }), legacy);
        expect(on.finishingCost).toBe(0);
        expect(on.totalCost).toBe(off.totalCost);
    });

    it('admin xoá sạch hình dạng (array rỗng) → 0đ', () => {
        const c = structuredClone(config);
        c.FORMEX_DIE_CUT_SHAPES = [];
        expect(calculateLargePrint(cut({ quantity: 8 }), c).finishingCost).toBe(0);
    });

    it('key sai kiểu (string) → 0đ, không throw', () => {
        const c = structuredClone(config);
        c.FORMEX_DIE_CUT_SHAPES = 'abc';
        expect(calculateLargePrint(cut({ quantity: 8 }), c).finishingCost).toBe(0);
    });

    it('shapeKey lạ → rơi về hình ĐẦU danh sách (tròn), không miễn phí', () => {
        const r = calculateLargePrint(
            cut({ quantity: 8, formexDieCutShapeKey: 'khong_ton_tai' }),
            config
        );
        expect(r.finishingCost).toBe(420000);
        expect(r.finishingDesc).toMatch(/Bế Formex \(Tròn\)/);
    });

    it('thiếu hẳn formexDieCutShapeKey → cũng rơi về hình đầu', () => {
        const p = cut({ quantity: 8 });
        delete p.formexDieCutShapeKey;
        expect(calculateLargePrint(p, config).finishingCost).toBe(420000);
    });

    it('admin gõ NGƯỢC 2 mốc bậc → không sinh tiền âm', () => {
        const c = structuredClone(config);
        const tron = c.FORMEX_DIE_CUT_SHAPES[0];
        tron.tier1LimitSqm = 20;
        tron.tier2LimitSqm = 5;
        const r = calculateLargePrint(cut({ quantity: 8 }), c);
        expect(r.finishingCost).toBeGreaterThan(0);
        // sắp lại thành 5/20 ⇒ bằng đúng trường hợp gõ thuận
        expect(r.finishingCost).toBe(420000);
    });
});

describe('Không ảnh hưởng phần còn lại của engine', () => {
    it('không đổi quyết định khổ cuộn (chi phí bế là hằng số theo mọi cuộn)', () => {
        const on = calculateLargePrint(cut({ quantity: 8 }), config);
        const off = calculateLargePrint(cut({ quantity: 8, formexDieCut: false }), config);
        expect(on.rollWidth).toBe(off.rollWidth);
    });

    it('object trả về vẫn đúng 14 key (cố ý gộp vào finishingCost)', () => {
        expect(Object.keys(calculateLargePrint(cut({ quantity: 8 }), config)).length).toBe(14);
    });

    it('Bế demi giữ nguyên công thức cũ sau khi tách progressiveSqmCost', () => {
        // 8m²: 5×80.000 + 3×40.000 = 520.000đ
        const r = calculateLargePrint({ ...base, quantity: 8, dieCutting: true }, config);
        expect(r.finishingCost).toBe(520000);
    });

    it('bế demi + bế Formex cùng lúc thì cộng dồn, mô tả có cả hai', () => {
        const r = calculateLargePrint(cut({ quantity: 8, dieCutting: true }), config);
        expect(r.finishingCost).toBe(520000 + 420000);
        expect(r.finishingDesc).toMatch(/Bế: /);
        expect(r.finishingDesc).toMatch(/Bế Formex \(Tròn\)/);
    });
});
