// Tests cho luật THÀNH PHẨM THEO VẬT LIỆU (large-print config v1.2.0).
//
// Luật: MATERIAL_TYPES[key].disallowedFinishing = deny-list id thành phẩm.
//   Thiếu field / [] ⇒ làm được tất cả (fallback dễ dãi — BẮT BUỘC vì config
//   lưu trước v1.2.0 không có field này).
//
// Cover:
//   1. getBlockedFinishing — các nhánh fallback
//   2. Hiflex + cán màng → engine bỏ qua, giá bằng đúng case 'none' của golden
//   3. Đối chứng: PP vẫn cán màng bình thường (chặn là theo vật liệu)
//   4. Chặn cả 4 op còn lại → formexCost/finishingCost về 0
//   5. Backward-compat: xoá hẳn field → hành vi cũ (vẫn tính tiền)
//   6. Id lạ → không throw, giá không đổi
//   7. Object trả về vẫn đúng 14 key
//
// structuredClone (KHÔNG dùng JSON round-trip) để giữ Infinity ở
// FORMEX_DISCOUNT_TIERS[last].maxArea.

import { describe, it, expect } from 'vitest';
import { calculateLargePrint } from '../../src/utils/largePrintCalculator.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/config/largePrintConfig.js';
import {
    LARGE_PRINT_FINISHING_OPS,
    getBlockedFinishing,
    finishingOpLabel,
} from '../../src/modules/large-print/config/finishingOps.js';

const config = LARGE_PRINT_DEFAULT_CONFIG;

// Default KHÔNG chặn gì (luật do admin tick trong Cài đặt), nên mọi case chặn
// đều tự dựng config riêng — giống hệt dữ liệu admin lưu lên Supabase.
function withBlocked(materialKey, ids) {
    const c = structuredClone(config);
    c.MATERIAL_TYPES[materialKey].disallowedFinishing = ids;
    return c;
}

// Banner bạt 200×100 + dán biên + 8 khoen — trùng Case D của golden test.
const hiflexBanner = {
    width: 200,
    height: 100,
    quantity: 1,
    materialTypeKey: 'hiflex',
    laminationTypeKey: 'none',
    formexTypeKey: 'none',
    edgeTaping: true,
    grommetsCheck: true,
    grommetsCount: 8,
    dieCutting: false,
    standeeKey: 'none',
};

// PP 100×100 trơn — trùng Case A của golden test (121.750đ).
const ppPlain = {
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
    standeeKey: 'none',
};

describe('finishingOps — registry', () => {
    it('có đúng 6 op, id duy nhất', () => {
        expect(LARGE_PRINT_FINISHING_OPS).toHaveLength(6);
        const ids = LARGE_PRINT_FINISHING_OPS.map((o) => o.id);
        expect(new Set(ids).size).toBe(6);
        expect(ids).toEqual([
            'lamination',
            'formex',
            'formexDieCut',
            'edgeTaping',
            'grommets',
            'dieCutting',
        ]);
    });

    it('mọi op đều có label string không rỗng', () => {
        for (const op of LARGE_PRINT_FINISHING_OPS) {
            expect(typeof op.label).toBe('string');
            expect(op.label.length).toBeGreaterThan(0);
        }
    });

    it('finishingOpLabel: id biết → label; id lạ → trả lại chính id', () => {
        expect(finishingOpLabel('lamination')).toBe('Cán màng');
        expect(finishingOpLabel('khong_ton_tai')).toBe('khong_ton_tai');
    });
});

describe('getBlockedFinishing — fallback dễ dãi', () => {
    it('default → không vật liệu nào bị chặn', () => {
        for (const key of Object.keys(config.MATERIAL_TYPES)) {
            expect(getBlockedFinishing(config, key).size, key).toBe(0);
        }
    });

    it('admin chặn cán màng cho hiflex → đọc lại đúng', () => {
        const c = withBlocked('hiflex', ['lamination']);
        expect(getBlockedFinishing(c, 'hiflex')).toEqual(new Set(['lamination']));
        expect(getBlockedFinishing(c, 'pp_co_keo').size).toBe(0);
    });

    it('key vật liệu không tồn tại → Set rỗng', () => {
        expect(getBlockedFinishing(config, 'khong_co_that').size).toBe(0);
    });

    it('config null/undefined → Set rỗng (không throw)', () => {
        expect(getBlockedFinishing(null, 'hiflex').size).toBe(0);
        expect(getBlockedFinishing(undefined, 'hiflex').size).toBe(0);
    });

    it('thiếu field disallowedFinishing → Set rỗng', () => {
        const c = structuredClone(config);
        delete c.MATERIAL_TYPES.hiflex.disallowedFinishing;
        expect(getBlockedFinishing(c, 'hiflex').size).toBe(0);
    });

    it('field sai kiểu (string thay vì array) → Set rỗng', () => {
        const c = structuredClone(config);
        c.MATERIAL_TYPES.hiflex.disallowedFinishing = 'lamination';
        expect(getBlockedFinishing(c, 'hiflex').size).toBe(0);
    });
});

describe('Admin bỏ tick "Cán màng" cho Bạt Hiflex', () => {
    const blocked = withBlocked('hiflex', ['lamination']);
    const params = { ...hiflexBanner, laminationTypeKey: 'mang_mo' };

    it('chọn Màng Mờ vẫn ra đúng 320.000đ như khi không cán', () => {
        const r = calculateLargePrint(params, blocked);
        expect(r.totalCost).toBe(320000);
        expect(r.finishingCost).toBe(80000);
    });

    it('laminationChoice = null → LPResultPanel không render khối "Cán màng"', () => {
        expect(calculateLargePrint(params, blocked).laminationChoice).toBeNull();
    });

    it('dán biên + đóng khoen VẪN được tính (chỉ cán màng bị chặn)', () => {
        const r = calculateLargePrint(params, blocked);
        expect(r.finishingDesc).toMatch(/Dán biên/);
        expect(r.finishingDesc).toMatch(/8 khoen/);
    });

    it('object trả về vẫn đúng 14 key', () => {
        expect(Object.keys(calculateLargePrint(params, blocked)).length).toBe(14);
    });

    it('CHƯA tick thì vẫn tính tiền cán màng như thường', () => {
        const r = calculateLargePrint(params, config);
        expect(r.laminationChoice).not.toBeNull();
        expect(r.totalCost).toBeGreaterThan(320000);
    });
});

describe('Đối chứng — chặn là THEO VẬT LIỆU, không phải hỏng toàn cục', () => {
    it('PP có keo + Màng Mờ → vẫn đắt hơn khi không cán', () => {
        const withLam = calculateLargePrint({ ...ppPlain, laminationTypeKey: 'mang_mo' }, config);
        const noLam = calculateLargePrint(ppPlain, config);
        expect(withLam.totalCost).toBeGreaterThan(noLam.totalCost);
        expect(withLam.laminationChoice).not.toBeNull();
    });
});

describe('Chặn toàn bộ formex + 3 thành phẩm', () => {
    const c = structuredClone(config);
    c.MATERIAL_TYPES.pp_co_keo.disallowedFinishing = [
        'formex',
        'edgeTaping',
        'grommets',
        'dieCutting',
    ];
    const params = {
        ...ppPlain,
        formexTypeKey: 'formex_5mm',
        edgeTaping: true,
        grommetsCheck: true,
        grommetsCount: 8,
        dieCutting: true,
    };
    const r = calculateLargePrint(params, c);

    it('formexCost = 0', () => {
        expect(r.formexCost).toBe(0);
    });

    it('finishingCost = 0 và finishingDesc rỗng', () => {
        expect(r.finishingCost).toBe(0);
        expect(r.finishingDesc).toBe('');
    });

    it('totalCost quay về đúng giá trơn của Case A (121.750đ)', () => {
        expect(r.totalCost).toBeCloseTo(121750, 0);
    });
});

describe('Backward-compat — config lưu trước v1.2.0 (không có field)', () => {
    const legacy = structuredClone(config);
    for (const m of Object.values(legacy.MATERIAL_TYPES)) {
        delete m.disallowedFinishing;
    }

    it('hiflex + Màng Mờ → VẪN bị tính tiền cán màng (hành vi cũ)', () => {
        const r = calculateLargePrint({ ...hiflexBanner, laminationTypeKey: 'mang_mo' }, legacy);
        expect(r.laminationChoice).not.toBeNull();
        expect(r.totalCost).toBeGreaterThan(320000);
    });

    it('mọi thành phẩm khác vẫn tính bình thường', () => {
        const r = calculateLargePrint(hiflexBanner, legacy);
        expect(r.finishingCost).toBe(80000);
        expect(r.totalCost).toBe(320000);
    });
});

describe('Id lạ trong deny-list — bỏ qua vô hại', () => {
    it('không throw, giá không đổi', () => {
        const c = structuredClone(config);
        c.MATERIAL_TYPES.pp_co_keo.disallowedFinishing = ['khong_ton_tai', 'abc'];
        const r = calculateLargePrint(ppPlain, c);
        expect(r.totalCost).toBeCloseTo(121750, 0);
    });
});

describe('Vật liệu không tồn tại vẫn trả null (không đổi hành vi cũ)', () => {
    it('materialTypeKey lạ → null', () => {
        expect(calculateLargePrint({ ...ppPlain, materialTypeKey: 'unknown' }, config)).toBeNull();
    });
});
