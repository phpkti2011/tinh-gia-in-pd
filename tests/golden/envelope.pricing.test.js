import { describe, it, expect } from 'vitest';
import {
    ENVELOPE_DEFAULT_CONFIG,
    ENVELOPE_DEFAULT_INPUT,
    inputFromConfig,
} from '../../src/modules/envelope/config/defaultConfig';
import { validateEnvelopeConfig, allowedPapers } from '../../src/modules/envelope/config/schema';
import {
    calculateEnvelopeQuote,
    envelopeInputKey,
} from '../../src/modules/envelope/engine/pricing';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
import { kts, paperQuote, calculateFoilStamping } from '../../src/modules/small-print/engine/index';

const config = () => ({ ...structuredClone(ENVELOPE_DEFAULT_CONFIG), pricesConfirmed: true });
// Giá liền thân dùng khổ lọt máy KTS; bộ 350×250 vẫn kiểm tra riêng ở khổ tách/layout.
const input = (patch = {}) => ({
    ...structuredClone(ENVELOPE_DEFAULT_INPUT),
    w: 220,
    h: 110,
    ...patch,
});
const run = (s = input(), c = config(), p = DEFAULT_CONFIG) => calculateEnvelopeQuote(s, c, p);
const row = (r, id) => r.rows.find((t) => t.id === id);
const split = (backPrint, patch = {}) =>
    input({ w: 350, h: 250, construction: 'split', backPrint, ...patch });
const PAPER = ENVELOPE_DEFAULT_INPUT.paper;

describe('Envelope pricing — tích hợp KTS khổ nhỏ', () => {
    it('I02: 100 bao thư khuôn tách → 100 phần trước + 100 mặt sau, đúng khổ', () => {
        const r = run(split(false));
        expect(r.parts.map((p) => [p.id, p.widthMm, p.heightMm, p.quantity])).toEqual([
            ['front', 380, 305, 100],
            ['back', 347, 247, 100],
        ]);
        expect(r.rows.map((t) => t.id)).toEqual(['front', 'back', 'die-cut', 'gluing', 'foil']);
    });
    it('I03/I04: mặt sau không in chỉ tính giấy ram, tiền in 0, khách = vốn × hệ số, không áp sàn KTS', () => {
        const p = structuredClone(DEFAULT_CONFIG);
        p.PAPER_REFERENCE_CONFIG.minPrintPricePerPage = 999999;
        p.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage = 999999;
        const c = config();
        c.backPaperFactor = 3;
        const r = run(split(false), c, p);
        const back = r.parts[1];
        const expected = paperQuote(p, 34.7, 24.7, 100, PAPER, 0);
        expect(back.printCost).toBe(0);
        expect(back.printSale).toBe(0);
        expect(back.press).toBeNull();
        expect(back.cost).toBe(expected.cost);
        expect(row(r, 'back')).toMatchObject({
            cost: Math.round(expected.cost),
            sale: Math.round(expected.cost * 3),
        });
        expect(row(r, 'back').detail).toContain('tiền in 0');
        // Phần trước vẫn là giấy + in (và bị sàn rất cao nâng lên) — sàn không lan sang mặt sau.
        expect(r.parts[0].printSale).toBeGreaterThan(0);
        expect(r.parts[0].sale).toBeGreaterThan(back.sale);
    });
    it('I05: bật in mặt sau → dùng kts với khoảng cách bế, có tiền in', () => {
        const r = run(split(true));
        const expected = kts(
            DEFAULT_CONFIG,
            34.7,
            24.7,
            100,
            1,
            PAPER,
            1,
            0,
            0,
            null,
            '4color',
            '',
            {
                gap: ENVELOPE_DEFAULT_CONFIG.dieCut.gapCm,
            }
        );
        expect(r.parts[1].sale).toBe(expected.sale);
        expect(r.parts[1].cost).toBe(expected.cost);
        expect(r.parts[1].printSale).toBeGreaterThan(0);
        expect(row(r, 'back').name).toContain('giấy + in');
        // Bật/tắt in không đổi kích thước hay số lượng (I03)
        const off = run(split(false));
        expect(off.parts[1].widthMm).toBe(r.parts[1].widthMm);
        expect(off.parts[1].quantity).toBe(r.parts[1].quantity);
    });
    it('I06: chuyển tách → liền thân chỉ còn một phần, không còn dòng mặt sau', () => {
        const r = run(input({ construction: 'joined-opposite' }));
        expect(r.parts.map((p) => p.id)).toEqual(['body']);
        expect(row(r, 'back')).toBeUndefined();
        expect(r.parts[0].press.params.productW).toBe(25);
        expect(r.parts[0].press.params.productH).toBe(26);
        expect(r.parts[0].press.params.dieCuttingType).toBe('none');
    });
    it('khổ khuôn chuyển sang KTS không cộng thêm nắp/tay dán; giữ số thập phân (I11)', () => {
        const r = run(
            input({
                unit: 'cm',
                w: 35.25,
                h: 25,
                flap: 4,
                tab: 1.5,
                construction: 'split',
                backPrint: false,
            })
        );
        expect(r.layout.parts[0].widthMm).toBe(382.5);
        expect(r.parts[0].press.params.productW).toBe(38.25);
    });
    it('khổ liền thân 380×540 vượt máy: chặn giá, không tự đổi khuôn hoặc thu nhỏ', () => {
        expect(() => run(input({ w: 350, h: 250 }))).toThrow(/Khổ in không phù hợp/);
    });
    it('khoảng cách bế 0,4 cm không cho nhiều thành phẩm/tờ hơn bình sát', () => {
        const withGap = kts(DEFAULT_CONFIG, 10, 7, 100, 1, PAPER, 1, 0, 0, null, '4color', '', {
            gap: 0.4,
        });
        const noGap = kts(DEFAULT_CONFIG, 10, 7, 100, 1, PAPER);
        expect(withGap.best.productsPerSheet).toBeLessThanOrEqual(noGap.best.productsPerSheet);
        expect(noGap.best.productsPerSheet).toBe(
            kts(DEFAULT_CONFIG, 10, 7, 100, 1, PAPER, 1, 0, 0, null, '4color', '', { gap: 0 }).best
                .productsPerSheet
        );
    });
    it('phí bế/dán tra bậc theo số bao thư; mỗi bao thư nhân số lượng, trọn gói không nhân', () => {
        const c = config();
        c.dieCut.tiers = [
            { from: 1, cost: 500, sale: 1000 },
            { from: 100, cost: 300, sale: 600 },
        ];
        c.gluing.mode = 'package';
        c.gluing.tiers = [
            { from: 1, cost: 20000, sale: 50000 },
            { from: 500, cost: 30000, sale: 80000 },
        ];
        const r = run(input({ quantity: 99 }), c);
        expect(row(r, 'die-cut')).toMatchObject({ cost: 99 * 500, sale: 99 * 1000 });
        expect(row(r, 'gluing')).toMatchObject({ cost: 20000, sale: 50000 });
        const r2 = run(input({ quantity: 500 }), c);
        expect(row(r2, 'die-cut')).toMatchObject({ cost: 500 * 300, sale: 500 * 600 });
        expect(row(r2, 'gluing')).toMatchObject({ cost: 30000, sale: 80000 });
        expect(r2.dieCut.tier.index).toBe(2);
    });
    it('phí cố định và giá tối thiểu áp cho cả đơn; tổng bằng tổng các dòng', () => {
        const c = config();
        c.orderMin = { fixedCost: 10000, fixedSale: 30000, minSale: 99999999 };
        const r = run(split(false), c);
        expect(row(r, 'fixed')).toMatchObject({ cost: 10000, sale: 30000 });
        expect(r.minApplied).toBe(true);
        expect(row(r, 'min').cost).toBe(0);
        expect(r.sale).toBe(99999999);
        expect(r.sale).toBe(r.rows.reduce((sum, t) => sum + t.sale, 0));
        expect(r.cost).toBe(r.rows.reduce((sum, t) => sum + t.cost, 0));
        expect(r.unit).toBe(r.sale / 100);
        // Tối thiểu không chạm dòng mặt sau
        expect(row(r, 'back').sale).toBe(Math.round(r.parts[1].sale));
        c.orderMin.minSale = 1;
        expect(run(split(false), c).minApplied).toBe(false);
        expect(row(run(split(false), c), 'min')).toBeUndefined();
    });
    it('ép nhũ bằng đúng tổng KTS theo số bao thư; tắt → 0; khuôn thiếu kích thước → lỗi', () => {
        const molds = [
            { w: 8, h: 5, impressions: 2, special: true },
            { w: 3, h: 2, impressions: 1, special: false },
        ];
        const expected = calculateFoilStamping(
            { foilStamping: 'yes', productQuantity: 100, foilMolds: molds },
            DEFAULT_CONFIG
        );
        const r = run(split(false, { foil: true, molds }));
        expect(row(r, 'foil')).toMatchObject({
            cost: Math.round(expected.totalCost),
            sale: Math.round(expected.totalCost),
        });
        expect(expected.totalCost).toBeGreaterThan(0);
        expect(row(run(input()), 'foil')).toMatchObject({ cost: 0, sale: 0 });
        expect(() => run(input({ foil: true, molds: [{ w: NaN, h: 3, impressions: 1 }] }))).toThrow(
            /khuôn/i
        );
        expect(() => run(input({ foil: true, molds: [] }))).toThrow(/khuôn/i);
    });
    it('không xuất tổng khi admin chưa xác nhận bảng giá; vẫn có các dòng để kiểm tra', () => {
        const r = run(input(), structuredClone(ENVELOPE_DEFAULT_CONFIG));
        expect(r.complete).toBe(false);
        expect(r.sale).toBeNull();
        expect(r.unit).toBeNull();
        expect(r.rows.length).toBeGreaterThan(0);
        expect(r.reasons[0]).toContain('xác nhận');
    });
    it('chặn giấy ngoài danh sách cho phép, giấy không phải ram, giấy ẩn và khổ ram sai', () => {
        const c = config();
        c.papers.allowed = [0, 1];
        c.papers.defaultPaper = 0;
        expect(() => run(input({ paper: PAPER }), c)).toThrow(/danh sách giấy/);
        expect(run(input({ paper: 1 }), c).parts[0].press.params.paperType).toBe('1');
        expect(() => run(input({ paper: 9 }))).toThrow();
        const p = structuredClone(DEFAULT_CONFIG);
        p.PAPER_STOCK_DATA[PAPER].hidden = true;
        expect(() => run(input(), config(), p)).toThrow();
        expect(() => run(input({ stock: 9 }))).toThrow(/khổ giấy/i);
        expect(allowedPapers(c, DEFAULT_CONFIG).map((x) => x.index)).toEqual([0, 1]);
        expect(allowedPapers(config(), DEFAULT_CONFIG).map((x) => x.index)).toEqual([
            0, 1, 2, 3, 4, 5, 6, 7,
        ]);
    });
    it('I08: đầu vào lỗi ném lỗi, không trả giá', () => {
        expect(() => run(input({ w: NaN }))).toThrow(/W/);
        expect(() => run(input({ quantity: 10.5 }))).toThrow(/Số lượng/);
        expect(() => run(input({ construction: 'split' }))).toThrow(/mặt sau/);
        expect(() => run(input({ color: 'cmyk' }))).toThrow(/Màu/);
        expect(() => run(input(), { ...config(), backPaperFactor: -1 })).toThrow();
    });
    it('I10: khóa đầu vào đổi khi đổi bất kỳ thông số', () => {
        const a = envelopeInputKey(input());
        expect(envelopeInputKey(input())).toBe(a);
        expect(envelopeInputKey(input({ w: 351 }))).not.toBe(a);
        expect(envelopeInputKey(input({ flapEdge: 'H' }))).not.toBe(a);
        expect(envelopeInputKey(input({ foil: true }))).not.toBe(a);
        expect(run(input()).inputKey).toBe(a);
    });
    it('validateEnvelopeConfig bắt bậc trùng, chế độ sai, giấy mặc định ngoài danh sách, gap âm', () => {
        expect(validateEnvelopeConfig(ENVELOPE_DEFAULT_CONFIG).isValid).toBe(true);
        const c1 = config();
        c1.gluing.tiers.push({ from: 500, cost: 1, sale: 1 });
        expect(validateEnvelopeConfig(c1).isValid).toBe(false);
        const c2 = config();
        c2.dieCut.mode = 'per_sheet';
        expect(validateEnvelopeConfig(c2).isValid).toBe(false);
        const c3 = config();
        c3.papers.allowed = [1];
        c3.papers.defaultPaper = 5;
        expect(validateEnvelopeConfig(c3).errors[0]).toContain('mặc định');
        const c4 = config();
        c4.dieCut.gapCm = -1;
        expect(validateEnvelopeConfig(c4).isValid).toBe(false);
        expect(validateEnvelopeConfig({}).isValid).toBe(false);
    });
    it('inputFromConfig điền sẵn theo cài đặt, quy đổi nắp/tay dán sang cm khi cần', () => {
        const c = config();
        c.defaults = {
            ...c.defaults,
            unit: 'cm',
            flapMm: 45,
            tabMm: 12,
            flapEdge: 'H',
            color: '1color',
        };
        c.papers.defaultPaper = 3;
        const s = inputFromConfig(c);
        expect(s).toMatchObject({
            unit: 'cm',
            flap: 4.5,
            tab: 1.2,
            flapEdge: 'H',
            color: '1color',
            paper: 3,
        });
        expect(Number.isNaN(s.w)).toBe(true);
    });
});
