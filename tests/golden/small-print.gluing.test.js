// Dán thành phẩm (config 1.9.0) — GLUING_TYPES + calculateGluingCost + vào báo giá khách.
//
// Bảng mặc định (GIÁ MẪU, admin sửa trong Cài Đặt):
//   Dán keo phá màng     ≤100: trọn gói 30.000 vốn / 60.000 khách;  >100: 300 / 600 đ mỗi SP
//   Dán keo 2 mặt vàng   ≤100: trọn gói 40.000 vốn / 80.000 khách;  >100: 400 / 800 đ mỗi SP
// Mỗi dòng dán tính cho TOÀN BỘ số thành phẩm; hai dòng cùng kiểu tính hai lần.

import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig.js';
import { validateSmallPrintConfig } from '../../src/modules/small-print/config/schema.js';
import {
    validateGluingTypes,
    emptyGluingType,
    emptyGluingTier,
} from '../../src/modules/small-print/config/gluingTypes.js';
import {
    calculateGluingCost,
    calculatePaperOptions,
    calculateCustomerQuote,
} from '../../src/modules/small-print/engine/index.js';

const TYPES = DEFAULT_CONFIG.GLUING_TYPES;
const PEEL = 'glue-peel-seal';
const DOUBLE = 'glue-double-sided-yellow';
const types = () => structuredClone(TYPES);
const withTypes = (edit) => {
    const cfg = structuredClone(DEFAULT_CONFIG);
    cfg.GLUING_TYPES = types();
    edit(cfg.GLUING_TYPES);
    return cfg;
};

describe('GLUING_TYPES (1.9.0) — cấu hình', () => {
    it('mặc định 2 kiểu dán, hai bảng cùng số bậc, bậc cuối không giới hạn, khách = 2× vốn', () => {
        expect(TYPES.map((t) => [t.id, t.name])).toEqual([
            [PEEL, 'Dán keo phá màng'],
            [DOUBLE, 'Dán keo 2 mặt vàng'],
        ]);
        for (const type of TYPES) {
            expect(type.cost_tiers).toHaveLength(type.customer_tiers.length);
            expect(type.cost_tiers.at(-1).max_qty).toBe(Infinity);
            expect(type.customer_tiers.at(-1).max_qty).toBe(Infinity);
            type.cost_tiers.forEach((tier, i) => {
                expect(type.customer_tiers[i].price).toBe(tier.price * 2);
                expect(type.customer_tiers[i].type).toBe(tier.type);
                expect(type.customer_tiers[i].max_qty).toBe(tier.max_qty);
            });
        }
        expect(TYPES[0].cost_tiers).toEqual([
            { max_qty: 100, price: 30000, type: 'package' },
            { max_qty: Infinity, price: 300, type: 'per_piece' },
        ]);
        expect(TYPES[1].customer_tiers).toEqual([
            { max_qty: 100, price: 80000, type: 'package' },
            { max_qty: Infinity, price: 800, type: 'per_piece' },
        ]);
        expect(validateGluingTypes(TYPES)).toEqual([]);
        expect(validateSmallPrintConfig(DEFAULT_CONFIG).isValid).toBe(true);
    });

    it('optional — config cũ không có key, hoặc admin xoá hết kiểu dán, vẫn hợp lệ', () => {
        const old = { ...DEFAULT_CONFIG };
        delete old.GLUING_TYPES;
        expect(validateSmallPrintConfig(old).isValid).toBe(true);
        expect(validateSmallPrintConfig({ ...DEFAULT_CONFIG, GLUING_TYPES: [] }).isValid).toBe(
            true
        );
        expect(validateGluingTypes(undefined)).toEqual([]);
        expect(validateGluingTypes(null)).toEqual([]);
    });

    it.each([
        ['trùng id', (t) => (t[1].id = t[0].id)],
        ['id rỗng', (t) => (t[0].id = '')],
        ['tên rỗng', (t) => (t[0].name = '   ')],
        ['trùng tên (khác hoa thường)', (t) => (t[1].name = ' dán KEO phá màng ')],
        ['hai bảng lệch số bậc', (t) => t[0].customer_tiers.pop()],
        ['bảng giá rỗng', (t) => (t[0].cost_tiers = [])],
        ['mốc không tăng', (t) => (t[0].cost_tiers[1].max_qty = 100)],
        ['mốc lẻ', (t) => (t[0].cost_tiers[0].max_qty = 99.5)],
        ['mốc bằng 0', (t) => (t[0].cost_tiers[0].max_qty = 0)],
        [
            '∞ không ở bậc cuối',
            (t) => {
                t[0].cost_tiers[0].max_qty = Infinity;
                t[0].customer_tiers[0].max_qty = Infinity;
            },
        ],
        ['giá để trống (NaN)', (t) => (t[0].cost_tiers[0].price = NaN)],
        ['giá âm', (t) => (t[1].customer_tiers[1].price = -1)],
        ['cách tính lạ', (t) => (t[0].cost_tiers[0].type = 'per_sheet')],
        ['mốc vốn/khách lệch nhau', (t) => (t[0].customer_tiers[0].max_qty = 50)],
        ['cách tính vốn/khách lệch nhau', (t) => (t[0].customer_tiers[0].type = 'per_piece')],
        ['kiểu không phải object', (t) => (t[0] = 'keo')],
    ])('%s → cấu hình không hợp lệ, lỗi ghi rõ GLUING_TYPES', (_, edit) => {
        const result = validateSmallPrintConfig(withTypes(edit));
        expect(result.isValid).toBe(false);
        expect(result.errors.some((e) => e.startsWith('GLUING_TYPES'))).toBe(true);
    });

    it('không phải mảng → lỗi; bậc cuối hữu hạn vẫn hợp lệ (engine cảnh báo khi vượt)', () => {
        expect(validateSmallPrintConfig({ ...DEFAULT_CONFIG, GLUING_TYPES: {} }).isValid).toBe(
            false
        );
        const capped = withTypes((t) => {
            t[0].cost_tiers[1].max_qty = 1000;
            t[0].customer_tiers[1].max_qty = 1000;
        });
        expect(validateSmallPrintConfig(capped).isValid).toBe(true);
    });

    it('kiểu/bậc mới thêm có giá trống (NaN) → bị chặn cho tới khi nhập giá; id không trùng', () => {
        const a = emptyGluingType();
        const b = emptyGluingType('Dán keo sữa');
        expect(a.id).not.toBe(b.id);
        expect(a.id.startsWith('glue-')).toBe(true);
        expect(b.name).toBe('Dán keo sữa');
        expect(a.cost_tiers).toEqual([{ max_qty: Infinity, price: NaN, type: 'per_piece' }]);
        expect(emptyGluingTier(200)).toEqual({ max_qty: 200, price: NaN, type: 'per_piece' });
        expect(validateGluingTypes([a]).join(' ')).toContain('Nhập giá');
        a.cost_tiers[0].price = 100;
        a.customer_tiers[0].price = 200;
        expect(validateGluingTypes([a])).toEqual([]);
    });
});

describe('calculateGluingCost — tra bậc theo số thành phẩm', () => {
    it.each([
        [1, 30000, 60000],
        [99, 30000, 60000],
        [100, 30000, 60000], // mốc là biên đóng: đúng 100 vẫn trọn gói
        [101, 101 * 300, 101 * 600],
        [500, 150000, 300000],
    ])('keo phá màng, %s SP → vốn %s đ, khách %s đ', (qty, cost, customerPrice) => {
        const r = calculateGluingCost(qty, [{ typeId: PEEL }], TYPES);
        expect(r.cost).toBe(cost);
        expect(r.customerPrice).toBe(customerPrice);
        expect(r.lines).toEqual([
            {
                typeId: PEEL,
                name: 'Dán keo phá màng',
                cost,
                customerPrice,
                missing: false,
                uncovered: false,
            },
        ]);
        expect(r.missingCount).toBe(0);
        expect(r.uncoveredCount).toBe(0);
    });

    it('hai kiểu dán trong một đơn → cộng dồn, giữ thứ tự dòng', () => {
        const r = calculateGluingCost(500, [{ typeId: DOUBLE }, { typeId: PEEL }], TYPES);
        expect(r.lines.map((l) => [l.name, l.cost, l.customerPrice])).toEqual([
            ['Dán keo 2 mặt vàng', 200000, 400000],
            ['Dán keo phá màng', 150000, 300000],
        ]);
        expect(r.cost).toBe(350000);
        expect(r.customerPrice).toBe(700000);
    });

    it('hai dòng cùng kiểu (dán hai đường) → tính hai lần; trọn gói cũng tính mỗi dòng một gói', () => {
        const big = calculateGluingCost(500, [{ typeId: PEEL }, { typeId: PEEL }], TYPES);
        expect(big.customerPrice).toBe(600000);
        const small = calculateGluingCost(50, [{ typeId: PEEL }, { typeId: PEEL }], TYPES);
        expect(small.cost).toBe(60000);
        expect(small.customerPrice).toBe(120000);
    });

    it('kiểu đã bị xoá khỏi Cài Đặt → dòng đó 0 đ + missing, dòng khác vẫn tính', () => {
        const r = calculateGluingCost(500, [{ typeId: 'glue-da-xoa' }, { typeId: PEEL }], TYPES);
        expect(r.lines[0]).toEqual({
            typeId: 'glue-da-xoa',
            name: '',
            cost: 0,
            customerPrice: 0,
            missing: true,
            uncovered: false,
        });
        expect(r.missingCount).toBe(1);
        expect(r.customerPrice).toBe(300000);
        expect(calculateGluingCost(500, [{}], TYPES).missingCount).toBe(1);
    });

    it('không có dòng dán / thiếu danh sách / số lượng 0 → 0 đ, không nổ', () => {
        const zero = { cost: 0, customerPrice: 0, lines: [], missingCount: 0, uncoveredCount: 0 };
        expect(calculateGluingCost(500, [], TYPES)).toEqual(zero);
        expect(calculateGluingCost(500, undefined, TYPES)).toEqual(zero);
        expect(calculateGluingCost(500, 'none', TYPES)).toEqual(zero);
        const noTypes = calculateGluingCost(500, [{ typeId: PEEL }], undefined);
        expect([noTypes.cost, noTypes.customerPrice, noTypes.missingCount]).toEqual([0, 0, 1]);
        for (const qty of [0, -5, NaN]) {
            const r = calculateGluingCost(qty, [{ typeId: PEEL }], TYPES);
            expect([r.cost, r.customerPrice, r.uncoveredCount]).toEqual([0, 0, 0]);
            expect(r.lines).toHaveLength(1);
        }
    });

    it('bậc cuối hữu hạn: trong mốc vẫn tính, vượt mốc → 0 đ + uncovered (không lấy giá bậc cuối)', () => {
        const capped = types();
        capped[0].cost_tiers[1].max_qty = 1000;
        capped[0].customer_tiers[1].max_qty = 1000;
        expect(calculateGluingCost(1000, [{ typeId: PEEL }], capped).customerPrice).toBe(600000);
        const over = calculateGluingCost(1001, [{ typeId: PEEL }, { typeId: DOUBLE }], capped);
        expect(over.lines[0]).toMatchObject({ cost: 0, customerPrice: 0, uncovered: true });
        expect(over.uncoveredCount).toBe(1);
        expect(over.customerPrice).toBe(1001 * 800);
    });

    it('không mutate danh sách kiểu dán hay dòng dán', () => {
        const lines = [{ typeId: PEEL }];
        const snapshot = JSON.stringify([lines, TYPES]);
        calculateGluingCost(500, lines, TYPES);
        expect(JSON.stringify([lines, TYPES])).toBe(snapshot);
    });
});

// Cùng đơn mẫu với E2E-3 (500 card visit C300 2 mặt, C2060 khổ 32.2×21.2 → in 300.000 đ).
describe('Dán thành phẩm trong báo giá khách', () => {
    const config = DEFAULT_CONFIG;
    const params = {
        paperType: '3',
        productQuantity: 500,
        printSides: 2,
        printColorMode: '4color',
        laminationType: 'none',
        printContents: 1,
        variableData: 'no',
        largeSheetSelector: '0',
        customSheetW: 70,
        customSheetH: 100,
        artPaperPrice: 0,
        holePunchingType: 'none',
        creasingType: 'none',
        mountingType: 'none',
        dieCuttingType: 'none',
        moldType: 'simple',
        foilStamping: 'no',
        foilMolds: [{ w: 5, h: 5, special: false, impressions: 1 }],
    };
    const allResults = [];
    calculatePaperOptions(
        params,
        config.PAPER_STOCK_DATA[3],
        9.3,
        5.8,
        allResults,
        0,
        false,
        config
    );
    const bestOption = allResults.find(
        (r) =>
            r.printer.name === 'C2060' &&
            Math.abs(r.cutSheetW - 32.2) < 0.01 &&
            Math.abs(r.cutSheetH - 21.2) < 0.01
    );
    const base = { holePunching: 0, creasing: 0, mounting: 0 };
    const die = { moldCost: 0, laborCustomerPrice: 0 };
    const quote = (prices, p = params) =>
        calculateCustomerQuote(bestOption, p, prices, die, null, config);

    it('object cũ 3 key (catalogue, lò xo, lịch, bao thư) → không NaN, tổng vẫn 300.000 đ', () => {
        const q = quote(base);
        expect(q.gluingCustomerPrice).toBe(0);
        expect(q.totalCustomerCost).toBe(300000);
    });

    it('2 dòng dán cho 500 SP → 300.000 in + 700.000 dán = 1.000.000 đ', () => {
        const gluing = calculateGluingCost(500, [{ typeId: PEEL }, { typeId: DOUBLE }], TYPES);
        const q = quote({ ...base, gluing: gluing.customerPrice });
        expect(q.gluingCustomerPrice).toBe(700000);
        expect(q.totalCustomerCost).toBe(1000000);
    });

    it('5 nội dung → phụ thu 10% áp lên CẢ tiền dán: (300.000 + 90.000) × 1,1 = 429.000 đ', () => {
        const q = quote({ ...base, gluing: 90000 }, { ...params, printContents: 5 });
        expect(q.customerSurcharge).toBeCloseTo(39000, 6);
        expect(q.totalCustomerCost).toBeCloseTo(429000, 6);
    });
});
