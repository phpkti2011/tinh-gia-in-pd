import { describe, it, expect } from 'vitest';
import {
    CALENDAR_DEFAULT_CONFIG,
    CALENDAR_DEFAULT_INPUT,
} from '../../src/modules/calendar/config/defaultConfig';
import { validateCalendarConfig, pickTier } from '../../src/modules/calendar/config/schema';
import { calculateCalendar, artInput, artPaper } from '../../src/modules/calendar/engine/pricing';
import { layout, validatePattern } from '../../src/modules/calendar/engine/layout';
import { kts, paperQuote } from '../../src/modules/calendar/engine/smallPrintAdapter';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
import {
    calculateFoilStamping,
    calculatePaperOptions,
    calculateCustomerQuote,
    calculateFloorPrice,
} from '../../src/modules/small-print/engine/index';
const config = () => ({
    ...structuredClone(CALENDAR_DEFAULT_CONFIG),
    pricesConfirmed: true,
    wrapperSale: { printed: 'kts-total', blank: 'cost-factor', paperFactor: 2 },
});
const input = () => structuredClone(CALENDAR_DEFAULT_INPUT);
const run = (s = input(), c = config(), p = DEFAULT_CONFIG) => calculateCalendar(s, c, p);
const row = (r, id) => r.rows.find((t) => t.id === id);

describe('Calendar contracts', () => {
    it('20×15: carton bù 4 mm, áo và lót theo công thức đã chốt', () => {
        const r = run();
        expect([r.lay.W, r.lay.H]).toEqual([20, 15]);
        expect([r.lay.l.w, r.lay.l.h, r.lay.b.w, r.lay.b.h]).toEqual([204, 154, 204, 34]);
        expect([r.wrapW, r.wrapH, r.wrapPrintW, r.wrapPrintH]).toEqual([25, 43.1, 24, 42.1]);
        expect([r.linerW, r.linerH]).toEqual([19.6, 37.7]);
        expect(r.lay.count).toBe(14);
        expect(r.lay.lower).toBe(13);
    });
    it('portrait đảo W/H, A/B nhập đảo vẫn cùng kết quả', () => {
        const s = { ...input(), orientation: 'portrait' };
        const r = run(s),
            other = run({ ...s, a: 15, b: 20 });
        expect([r.lay.W, r.lay.H, r.wrapW, r.wrapH, r.linerW, r.linerH]).toEqual([
            15, 20, 20, 53.1, 14.6, 47.7,
        ]);
        expect(other.cost).toBe(r.cost);
    });
    it.each([1, 10, 100, 201, 1001])(
        'cắt %i cuốn đủ từng loại, không chồng/vượt và dải lọt máy',
        (n) => {
            const c = config(),
                r = layout({ ...input(), n, cfg: c.geometry });
            expect(r.producedL).toBeGreaterThanOrEqual(n * 2);
            expect(r.producedS).toBeGreaterThanOrEqual(n * 2);
            expect(r.groups.reduce((sum, g) => sum + g.repeat, 0)).toBe(r.count);
            for (const g of r.groups) {
                validatePattern(g.pattern, r.uw, r.uh);
                for (const b of g.pattern.bands) expect(b.h).toBeLessThanOrEqual(760);
            }
        }
    );
    it('chặn nạp cạnh 100 vào máy 76; khổ không lọt không cho giá giả', () => {
        const c = config();
        c.geometry.stockW = 100;
        c.geometry.stockH = 60;
        expect(() => run(input(), c)).toThrow(/Cạnh nạp/);
        expect(() => run({ ...input(), a: 200, b: 150 })).toThrow();
    });
    it('kích thước lẻ và bù lẻ được giữ đến 0,1 mm, không làm nhỏ phôi', () => {
        const c = config();
        c.geometry.allowance = 4.2;
        const r = layout({ ...input(), a: 20.05, cfg: c.geometry });
        expect(r.l.w).toBe(204.7);
        expect(r.l.h).toBe(154.2);
        const r2 = layout({ ...input(), a: 20.051, cfg: c.geometry });
        expect(r2.l.w).toBe(204.8);
    });
    it('áo mỹ thuật có in chạy cùng KTS với khổ giấy tùy chọn và màu đen', () => {
        const s = {
            ...input(),
            wrapperPrint: true,
            wrapSource: 'art',
            wrapColor: '1color',
            wrapArtInput: { size: 'custom', w: 70, h: 100, cost: 9000 },
        };
        const r = run(s);
        expect(r.wrap.unit).toBe(9000);
        expect(r.wrapQuote.params.printColorMode).toBe('1color');
        expect(r.wrapQuote.params.artPaperPrice).toBe(9000);
        expect(r.wrapQuote.best.largeSheetW * r.wrapQuote.best.largeSheetH).toBe(7000);
    });
    it('bậc thêm sau 100: tra toàn số lượng và tách bậc carton theo số tấm', () => {
        const c = config();
        c.materials.carton[0].tiers = [
            { from: 1, cost: 45000, sale: 18 },
            { from: 100, cost: 10000, sale: 12 },
            { from: 200, cost: 9000, sale: 10 },
            { from: 500, cost: 8000, sale: 8 },
        ];
        const r = run(input(), c);
        expect(row(r, 'carton').cost).toBe(14 * 45000);
        expect(row(r, 'carton').sale).toBe(720 * 100 * 12);
        expect(
            [99, 100, 199, 200, 499, 500, 1000].map(
                (n) => pickTier(c.materials.carton[0].tiers, n).sale
            )
        ).toEqual([18, 12, 12, 10, 10, 8, 8]);
    });
    it('tối thiểu chỉ cho carton một đế; lót vốn×2 cộng đúng một lần', () => {
        const c = config();
        c.geometry.baseMin = 999999;
        const r = run({ ...input(), n: 1 }, c);
        expect(row(r, 'carton').sale).toBe(999999);
        expect(row(r, 'liner').sale).toBe(Math.round(r.liner.cost * 2));
        expect(r.sale).toBe(r.rows.reduce((sum, t) => sum + t.sale, 0));
        expect(r.baseSale).toBe(r.sale - row(r, 'leaf').sale - row(r, 'coil').sale);
        expect(row(run({ ...input(), n: 2 }, c), 'carton').sale).toBeLessThan(999999);
    });
    it('không xuất tổng nếu bảng giá còn mẫu hoặc quy tắc chưa thiết lập', () => {
        expect(run(input(), structuredClone(CALENDAR_DEFAULT_CONFIG)).sale).toBeNull();
        const c = config();
        c.wrapperSale.blank = 'unset';
        expect(run(input(), c).complete).toBe(false);
    });
    it('áo in dùng vùng in để báo KTS, giấy vốn vẫn theo toàn áo, không cộng trùng in', () => {
        const r = run({ ...input(), wrapperPrint: true });
        expect(r.wrapQuote.params.productW).toBe(24);
        expect(r.wrapPress.params.productW).toBe(25);
        expect(row(r, 'wrap').sale).toBe(Math.round(r.wrapQuote.sale));
        expect(row(r, 'wrap-print').sale).toBe(0);
        expect(row(r, 'wrap-print').cost).toBe(Math.round(r.wrapPress.printCost));
        expect(r.wrap.sheets).toBe(
            Math.ceil(r.wrapPress.sheets / r.wrapPress.best.numCuttableSheets)
        );
    });
    it('quy tắc chỉ in + giấy hệ số và áo không in đã gộp', () => {
        const c = config();
        c.wrapperSale.printed = 'print-plus-paper';
        c.wrapperSale.paperFactor = 3;
        const r = run({ ...input(), wrapperPrint: true }, c);
        expect(row(r, 'wrap').sale).toBe(Math.round(r.wrap.cost * 3));
        expect(row(r, 'wrap-print').sale).toBe(Math.round(r.wrapQuote.printSale));
        c.wrapperSale.blank = 'included';
        expect(row(run(input(), c), 'wrap').sale).toBe(0);
    });
    it('mỹ thuật áo/lót có khổ và giá riêng, không đụng dữ liệu KTS', () => {
        const p = structuredClone(DEFAULT_CONFIG),
            before = structuredClone(p),
            c = config();
        const s = {
            ...input(),
            wrapSource: 'art',
            linerSource: 'art',
            wrapArtInput: { size: 'custom', w: 80, h: 120, cost: 9000 },
            linerArtInput: { size: 'custom', w: 70, h: 100, cost: 3000 },
        };
        const r = run(s, c, p);
        expect(r.wrap.unit).toBe(9000);
        expect(r.liner.unit).toBe(3000);
        expect(r.wrap.cost).toBe(r.wrap.sheets * 9000);
        expect(r.liner.cost).toBe(r.liner.sheets * 3000);
        expect(p).toEqual(before);
        s.wrapArtInput.cost = 12000;
        expect(artPaper(s, c, p, 'liner').cost).toBe(3000);
        expect(artInput(input(), c, p, 'wrap').cost).toBe(c.artPapers[0].cost);
    });
    it('giá ram chỉ tính vốn và thay đổi theo cấu hình KTS được truyền vào', () => {
        const p = structuredClone(DEFAULT_CONFIG),
            s = input();
        const first = paperQuote(p, 25, 43.1, 100, s.wrapPaper, 0);
        p.PAPER_STOCK_DATA[s.wrapPaper].pricePerReam *= 2;
        const second = paperQuote(p, 25, 43.1, 100, s.wrapPaper, 0);
        expect(second.cost).toBe(first.cost * 2);
    });
    it('ép kim bằng chính tổng KTS, không nhân lại số cuốn/tiền giao khuôn', () => {
        const s = {
            ...input(),
            foil: true,
            molds: [
                { w: 8, h: 5, impressions: 2, special: true },
                { w: 3, h: 2, impressions: 1, special: false },
            ],
        };
        const expected = calculateFoilStamping(
            { foilStamping: 'yes', productQuantity: s.n, foilMolds: s.molds },
            DEFAULT_CONFIG
        );
        const r = run(s);
        expect(row(r, 'foil').sale).toBe(Math.round(expected.totalCost));
        expect(row(r, 'foil').cost).toBe(Math.round(expected.totalCost));
    });
    it('adapter giống cách chọn phương án + báo khách + sàn của KTS', () => {
        const r = kts(DEFAULT_CONFIG, 20, 15, 700, 2, 3, 7, 1),
            options = [];
        calculatePaperOptions(
            r.params,
            DEFAULT_CONFIG.PAPER_STOCK_DATA[3],
            20.3,
            15.3,
            options,
            0,
            false,
            DEFAULT_CONFIG
        );
        const sorted = options
                .filter((x) => Number.isFinite(x.costPerProduct))
                .sort((a, b) => a.costPerProduct - b.costPerProduct),
            best = sorted.find((x) => x.cutSheetH <= 48) || sorted[0];
        const quote = calculateCustomerQuote(
            best,
            r.params,
            { holePunching: 0, creasing: 0, mounting: 0 },
            { moldCost: 0, laborCustomerPrice: 0 },
            null,
            DEFAULT_CONFIG
        );
        const floor = calculateFloorPrice({
            pricingModel: 'ream',
            totalA4Pages: quote.totalA4PagesRaw,
            paperCost: 700 * best.paperCostPerProduct,
            otherCost: 700 * best.laminationCostPerProduct,
            quantity: 700,
            printContents: 7,
            config: DEFAULT_CONFIG,
        });
        expect(r.sale).toBe(Math.max(quote.totalCustomerCost, floor.active ? floor.total : 0));
    });
    it('bắt cấu hình bậc trùng, giá NaN, số lượng lẻ, khổ lót âm', () => {
        const c = config();
        c.materials.coil[0].tiers.push({ from: 100, cost: 1, sale: 1 });
        expect(validateCalendarConfig(c).isValid).toBe(false);
        expect(() => run({ ...input(), n: 1.5 })).toThrow();
        expect(() => run({ ...input(), a: NaN })).toThrow();
        const c2 = config();
        c2.geometry.linerReduceW = 300;
        expect(() => run(input(), c2)).toThrow(/Khổ lót/);
    });
});
