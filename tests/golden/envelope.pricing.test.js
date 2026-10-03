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
import {
    kts,
    paperQuote,
    calculateFoilStamping,
    calculateDieCuttingCosts,
} from '../../src/modules/small-print/engine/index';

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
    it('bế kỹ thuật số thiếu bậc giá phải báo lỗi, không trả miễn phí', () => {
        const s = input({ dieCuttingType: 'digital' });
        const sheets = run(s).dieCut.sheets;
        const p = structuredClone(DEFAULT_CONFIG);
        p.DIGITAL_DIE_CUTTING_CONFIG = {
            cost_tiers: [{ max_qty: sheets, price: 50000, type: 'package' }],
            customer_tiers: [{ max_qty: sheets, price: 100000, type: 'package' }],
        };
        expect(row(run(s, config(), p), 'die-cut')).toMatchObject({ cost: 50000, sale: 100000 });
        p.DIGITAL_DIE_CUTTING_CONFIG.customer_tiers[0].max_qty = sheets - 1;
        expect(() => run(s, config(), p)).toThrow(/Chưa có bậc giá bế kỹ thuật số/);
        p.DIGITAL_DIE_CUTTING_CONFIG.customer_tiers[0].max_qty = sheets;
        p.DIGITAL_DIE_CUTTING_CONFIG.cost_tiers = [];
        expect(() => run(s, config(), p)).toThrow(/Chưa có bậc giá bế kỹ thuật số/);
    });
    it('phí keo tối thiểu áp riêng vốn/khách, không cộng hai lần hoặc áp khi bỏ chọn', () => {
        const c = config();
        c.flapTape = { costPerCm: 10, salePerCm: 50, minCost: 20000, minSale: 100000 };
        const s = input({ w: 200, quantity: 30, flapTape: true });
        const small = run(s, c);
        expect(row(small, 'flap-tape')).toMatchObject({ cost: 20000, sale: 100000 });
        expect(row(small, 'flap-tape').detail).toContain('100.000 đ');
        expect(row(run({ ...s, quantity: 100 }, c), 'flap-tape')).toMatchObject({
            cost: 20000,
            sale: 100000,
        });
        expect(row(run({ ...s, quantity: 101 }, c), 'flap-tape')).toMatchObject({
            cost: 20200,
            sale: 101000,
        });
        const off = run({ ...s, flapTape: false }, c);
        expect(row(off, 'flap-tape')).toBeUndefined();
        expect(small.sale - off.sale).toBe(100000);
        c.flapTape.minCost = 0;
        expect(row(run(s, c), 'flap-tape')).toMatchObject({ cost: 6000, sale: 100000 });
        c.flapTape.minSale = 0;
        expect(row(run(s, c), 'flap-tape')).toMatchObject({ cost: 6000, sale: 30000 });
        for (const invalid of [-1, NaN, null, '100000']) {
            c.flapTape.minSale = invalid;
            expect(validateEnvelopeConfig(c).isValid).toBe(false);
        }
    });
    it('mỗi bậc dán có cách tính riêng, đổi đúng tại các mốc', () => {
        const c = config();
        c.gluing.tiers = [
            { from: 1, cost: 10000, sale: 20000, mode: 'package' },
            { from: 101, cost: 100, sale: 200, mode: 'per_item' },
            { from: 201, cost: 80, sale: 150, mode: 'per_item' },
            { from: 500, cost: 30000, sale: 60000, mode: 'package' },
        ];
        for (const [quantity, cost, sale] of [
            [1, 10000, 20000],
            [100, 10000, 20000],
            [101, 10100, 20200],
            [200, 20000, 40000],
            [201, 16080, 30150],
            [499, 39920, 74850],
            [500, 30000, 60000],
            [501, 30000, 60000],
        ]) {
            expect(row(run(input({ quantity }), c), 'gluing')).toMatchObject({ cost, sale });
        }
        c.gluing.tiers[0].mode = 'invalid';
        expect(validateEnvelopeConfig(c).isValid).toBe(false);
    });
    it('keo nắp tính cạnh đặt nắp, theo cm và số bao; tách vốn/khách', () => {
        const c = config();
        c.flapTape = { costPerCm: 2, salePerCm: 5 };
        for (const construction of ['joined-opposite', 'joined-side', 'split']) {
            for (const flapEdge of ['W', 'H']) {
                const s = input({
                    w: 220,
                    h: 120,
                    flap: 30,
                    flapEdge,
                    construction,
                    backPrint: false,
                    flapTape: true,
                });
                const length = flapEdge === 'W' ? 22 : 12;
                const r = run(s, c);
                expect(row(r, 'flap-tape')).toMatchObject({
                    cost: length * 100 * 2,
                    sale: length * 100 * 5,
                });
                const cm = run({ ...s, unit: 'cm', w: 22, h: 12, flap: 3, tab: 1.5 }, c);
                expect(row(cm, 'flap-tape')).toEqual(row(r, 'flap-tape'));
                expect(row(run({ ...s, flap: 40 }, c), 'flap-tape')).toEqual(row(r, 'flap-tape'));
                const off = run({ ...s, flapTape: false }, c);
                expect(r.cost - off.cost).toBe(length * 100 * 2);
                expect(r.sale - off.sale).toBe(length * 100 * 5);
            }
        }
        expect(envelopeInputKey(input({ flapTape: true }))).not.toBe(envelopeInputKey(input()));
        expect(() => run(input({ flapTape: true }))).toThrow(/Chưa có giá dán keo nắp/);
        delete c.flapTape;
        expect(run(input(), c).complete).toBe(true);
        expect(() => run(input({ flapTape: true }), c)).toThrow(/Chưa có giá dán keo nắp/);
        c.flapTape = { costPerCm: -1, salePerCm: 5 };
        expect(validateEnvelopeConfig(c).isValid).toBe(false);
    });
    it('giấy mỹ thuật: phần in dùng đúng KTS, mặt sau trắng dùng giá mỗi tờ và không áp sàn in', () => {
        const c = config();
        c.artPapers = [{ name: 'Mỹ thuật kem', w: 70, h: 100, cost: 12500 }];
        const s = split(false, { paperSource: 'art', artIndex: 0 });
        const r = run(s, c);
        const expected = kts(
            DEFAULT_CONFIG,
            38,
            30.5,
            100,
            1,
            PAPER,
            1,
            0,
            0,
            c.artPapers[0],
            '4color',
            '',
            { gap: c.dieCut.gapCm }
        );
        expect(r.parts[0].sale).toBe(expected.sale);
        expect(r.parts[0].cost).toBe(expected.cost);
        expect(r.parts[1].cost).toBe(
            paperQuote(DEFAULT_CONFIG, 34.7, 24.7, 100, PAPER, 0, null, c.artPapers[0]).cost
        );
        expect(r.parts[1].printCost).toBe(0);
        expect(r.parts[1].printSale).toBe(0);
        expect(r.parts[1].sale).toBe(r.parts[1].cost * c.backPaperFactor);
    });
    it('giấy mỹ thuật tùy chọn đổi khổ/giá; giá chưa nhập hoặc sai phải chặn', () => {
        const s = input({
            paperSource: 'art',
            artInput: { name: 'Giấy riêng', w: 79, h: 109, cost: 20000 },
        });
        expect(run(s).parts[0].press.params.artPaperPrice).toBe(20000);
        expect(() => run(input({ paperSource: 'art' }))).toThrow(/giá hợp lệ/);
        expect(() => run({ ...s, artInput: { ...s.artInput, cost: -1 } })).toThrow();
        expect(() => run({ ...s, artInput: { ...s.artInput, w: NaN } })).toThrow();
        expect(envelopeInputKey(s)).not.toBe(
            envelopeInputKey({ ...s, artInput: { ...s.artInput, cost: 21000 } })
        );
        const legacy = config();
        delete legacy.artPapers;
        expect(validateEnvelopeConfig(legacy).isValid).toBe(true);
        expect(run(input(), legacy).sale).toBeGreaterThan(0);
    });
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
                gap: 0,
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
    it('phí dán tra bậc theo số bao thư, trọn gói không nhân; phí bế cũ không cộng thêm', () => {
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
        const withoutLegacy = config();
        withoutLegacy.gluing = c.gluing;
        expect(row(r, 'die-cut')).toEqual(
            row(run(input({ quantity: 99 }), withoutLegacy), 'die-cut')
        );
        expect(row(r, 'gluing')).toMatchObject({ cost: 20000, sale: 50000 });
        const r2 = run(input({ quantity: 500 }), c);
        expect(row(r2, 'gluing')).toMatchObject({ cost: 30000, sale: 80000 });
        expect(r2.gluing.tier.index).toBe(2);
    });
    it.each(['mold', 'digital', 'none'])(
        'bế %s khớp KTS theo số tờ và khổ trải',
        (dieCuttingType) => {
            const s = input({ dieCuttingType });
            const r = run(s);
            const p = r.parts[0];
            const expected = calculateDieCuttingCosts(
                { dieCuttingType, moldType: 'envelope', productW: 25, productH: 26 },
                p.press.sheets,
                false,
                DEFAULT_CONFIG
            );
            expect(row(r, 'die-cut').cost).toBe(Math.round(expected.moldCost + expected.laborCost));
            expect(row(r, 'die-cut').sale).toBe(
                Math.round(expected.moldCost + expected.laborCustomerPrice)
            );
            const press = kts(DEFAULT_CONFIG, 25, 26, 100, 1, PAPER, 1, 0, 0, null, '4color', '', {
                gap: dieCuttingType === 'none' ? 0 : dieCuttingType === 'mold' ? 0.4 : 0.6,
                digitalCutting: dieCuttingType === 'digital',
            });
            expect(p.press.best).toEqual(press.best);
            expect(envelopeInputKey(s)).not.toBe(
                envelopeInputKey({ ...s, dieCuttingType: 'other' })
            );
            if (dieCuttingType !== 'mold') expect(r.dieCut.moldCost).toBe(0);
        }
    );
    it('khuôn tách chỉ bế phần trước, mặt sau in hay trắng không nhân phí bế', () => {
        const off = run(split(false, { dieCuttingType: 'digital' }));
        const on = run(split(true, { dieCuttingType: 'digital' }));
        expect(off.dieCut).toEqual(on.dieCut);
        expect(off.parts[1].printCost).toBe(0);
        expect(() => run(input({ dieCuttingType: 'invalid' }))).toThrow(/hình thức bế/);
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
