import { describe, it, expect } from 'vitest';
import {
    CALENDAR_DEFAULT_CONFIG,
    CALENDAR_DEFAULT_INPUT,
} from '../../src/modules/calendar/config/defaultConfig';
import { validateCalendarConfig, pickTier } from '../../src/modules/calendar/config/schema';
import { calculateCalendar, artInput, artPaper } from '../../src/modules/calendar/engine/pricing';
import { layout, validatePattern } from '../../src/modules/calendar/engine/layout';
import { kts, paperQuote } from '../../src/modules/calendar/engine/smallPrintAdapter';
import {
    selectableMaterials,
    decalStocks,
} from '../../src/modules/calendar/config/wrapperMaterials';
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
    it('giấy F120 do admin thêm sau lấy giá từ bảng KTS được truyền vào', () => {
        const p = structuredClone(DEFAULT_CONFIG);
        const index = p.PAPER_STOCK_DATA.length;
        p.PAPER_STOCK_DATA.push({
            name: 'F120',
            pricingModel: 'ream',
            pricePerReam: 900000,
            customerSurcharge: 0,
        });
        const s = { ...input(), linerPaper: index };
        const first = run(s, config(), p);
        expect(first.liner.paperName).toBe('F120');
        expect(first.liner.pricePerReam).toBe(900000);
        p.PAPER_STOCK_DATA[index].pricePerReam = 1800000;
        expect(run(s, config(), p).liner.cost).toBe(first.liner.cost * 2);
    });
    it('lót in dùng tổng KTS, cán riêng độc lập và danh mục được kiểm tra', () => {
        const c = config();
        const s = { ...input(), linerPrint: true, linerColor: '1color', linerLam: true };
        const r = run(s, c);
        const expected = kts(
            DEFAULT_CONFIG,
            r.linerW,
            r.linerH,
            s.n * c.geometry.linerCopies,
            1,
            s.linerPaper,
            1,
            0,
            s.linerStock,
            null,
            '1color'
        );
        expect(row(r, 'liner').cost).toBe(Math.round(expected.cost));
        expect(row(r, 'liner').sale).toBe(Math.round(expected.sale));
        expect(row(r, 'liner-lam').sale).toBeGreaterThan(0);
        const off = run({ ...s, linerLam: false }, c);
        expect(r.sale - off.sale).toBe(row(r, 'liner-lam').sale);
        expect(() => run({ ...s, linerPaper: 1 }, c)).toThrow(/chưa được cho phép/);
        c.allowedMaterials = { wrap: ['C150'], liner: ['C200'] };
        expect(run({ ...s, linerPaper: 1 }, c).complete).toBe(true);
        expect(() => run(s, c)).toThrow(/chưa được cho phép/);
    });
    it('áo mỹ thuật dưới 150gsm không cán; C150 bắt buộc cán và chặn C200', () => {
        const s = { ...input(), wrapSource: 'art', wrapGsm: 120 };
        const c = config();
        c.geometry.lamSides = 2;
        const r = run(s, c);
        expect(row(r, 'lam')).toMatchObject({ cost: 0, sale: 0 });
        expect(row(r, 'lam').detail).toContain('không cán màng');
        for (const wrapGsm of [NaN, 0, 150, 200])
            expect(() => run({ ...s, wrapGsm }, c)).toThrow(/150 gsm/);
        c.geometry.lamSides = 0;
        expect(row(run(input(), c), 'lam').sale).toBeGreaterThan(0);
        expect(() => run({ ...input(), wrapPaper: 1 }, c)).toThrow(/chưa được cho phép/);
    });
    it('decal nhựa dùng giá m² KTS, giấy riêng và cán một lần, có/không in', () => {
        const wrapPaper = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) =>
            p.name.includes('Decal nhựa')
        );
        for (const wrapperPrint of [false, true]) {
            const r = run({ ...input(), wrapPaper, wrapStock: 2, wrapperPrint });
            expect(r.wrap.unit).toBeCloseTo(
                ((r.wrap.cutting.stockW * r.wrap.cutting.stockH) / 10000) *
                    DEFAULT_CONFIG.PAPER_STOCK_DATA[wrapPaper].pricePerSqm
            );
            expect(r.wrap.cost).toBeCloseTo(r.wrap.unit * r.wrap.sheets);
            expect(row(r, 'lam').sale).toBeGreaterThan(0);
            if (wrapperPrint) {
                expect(r.wrapPress.params.paperType).toBe(String(wrapPaper));
                expect(r.wrapPress.params.laminationType).toBe('none');
            }
        }
    });
    it('sơ đồ giấy mỹ thuật khớp định mức giấy trắng và tờ máy có in', () => {
        const art = { name: 'Mỹ thuật', w: 70, h: 100, cost: 50000 };
        const blank = paperQuote(DEFAULT_CONFIG, 25, 43.1, 30, 0, 0, null, art);
        const c = blank.cutting;
        expect(c.columns * c.rows).toBe(blank.yieldPer);
        expect(c.columns * c.pieceW).toBeLessThanOrEqual(70);
        expect(c.rows * c.pieceH).toBeLessThanOrEqual(100);
        expect(blank.sheets).toBe(Math.ceil(c.required / c.perSheet));
        const press = kts(DEFAULT_CONFIG, 25, 43.1, 30, 1, 0, 1, 0, 0, art);
        const printed = paperQuote(DEFAULT_CONFIG, 25, 43.1, 30, 0, 0, press, art);
        expect(printed.cutting.pieces.length).toBe(press.best.numCuttableSheets);
        expect(printed.sheets).toBe(Math.ceil(printed.cutting.required / printed.cutting.perSheet));
        for (const p of printed.cutting.pieces) {
            expect(p.x + p.w).toBeLessThanOrEqual(70 + 1e-8);
            expect(p.y + p.h).toBeLessThanOrEqual(100 + 1e-8);
        }
    });
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
                r = layout({ ...input(), n, cfg: c.geometry, sheet: { w: 60, h: 100 } });
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
        c.materials.carton[0].w = 100;
        c.materials.carton[0].h = 60;
        expect(() => run(input(), c)).toThrow(/Cạnh nạp/);
        expect(validateCalendarConfig(c).errors[0]).toMatch(/vượt khổ ngang máy cắt/);
        expect(() => run({ ...input(), a: 200, b: 150 })).toThrow();
    });
    it('kích thước lẻ và bù lẻ được giữ đến 0,1 mm, không làm nhỏ phôi', () => {
        const c = config();
        c.geometry.allowance = 4.2;
        const r = layout({ ...input(), a: 20.05, cfg: c.geometry, sheet: { w: 60, h: 100 } });
        expect(r.l.w).toBe(204.7);
        expect(r.l.h).toBe(154.2);
        const r2 = layout({ ...input(), a: 20.051, cfg: c.geometry, sheet: { w: 60, h: 100 } });
        expect(r2.l.w).toBe(204.8);
    });
    it('áo mỹ thuật có in chạy cùng KTS với khổ giấy tùy chọn và màu đen', () => {
        const s = {
            ...input(),
            wrapperPrint: true,
            wrapSource: 'art',
            wrapGsm: 120,
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
            wrapGsm: 120,
            linerSource: 'art',
            wrapArtInput: { size: 'custom', w: 80, h: 120, cost: 9000 },
            linerArtInput: { size: 'custom', w: 70, h: 100, cost: 3000 },
        };
        c.allowedMaterials = { wrap: ['C150', 'art'], liner: ['C150', 'art'] };
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
    it('decal giấy chỉ hiện ở danh sách lót, decal nhựa hiện ở cả áo và lót', () => {
        const names = (role) => selectableMaterials(DEFAULT_CONFIG, role).map((p) => p.name);
        expect(names('wrap').some((n) => /decal nhựa/i.test(n))).toBe(true);
        expect(names('wrap').some((n) => /decal giấy/i.test(n))).toBe(false);
        expect(names('liner').some((n) => /decal nhựa/i.test(n))).toBe(true);
        expect(names('liner').filter((n) => /decal giấy/i.test(n)).length).toBe(2);
        // Decal tính theo tờ (xi bạc/vàng) engine chưa dựng được khổ nên không được chào.
        expect(names('liner').some((n) => /decal xi/i.test(n))).toBe(false);
    });
    it('decal giấy dùng làm lót, cán màng tính riêng theo m²', () => {
        const c = config();
        const name = 'Decal giấy đế mỏng (VHM)';
        c.allowedMaterials = { wrap: ['C150'], liner: ['C150', 'F120', name] };
        const paper = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.name === name);
        const stock = decalStocks(DEFAULT_CONFIG).findIndex((p) => p.h === 48);
        const s = { ...input(), linerPaper: paper, linerStock: stock };
        const plain = run(s, c);
        expect(row(plain, 'liner').detail).toContain(name);
        expect(row(plain, 'liner').detail).toContain('100 tờ 33×48');
        // 9.000 đ/m² × (0,33 × 0,48 m²) = 1.425,6 đ/tờ.
        expect(row(plain, 'liner').cost).toBe(Math.round(100 * 9000 * 0.33 * 0.48));
        expect(row(plain, 'liner').sale).toBe(
            row(plain, 'liner').cost * c.geometry.linerSaleFactor
        );
        expect(row(plain, 'liner-lam')).toBeUndefined();
        const lam = run({ ...s, linerLam: true }, c);
        expect(row(lam, 'liner').cost).toBe(row(plain, 'liner').cost);
        expect(row(lam, 'liner-lam').cost).toBeGreaterThan(0);
        expect(lam.cost).toBe(plain.cost + row(lam, 'liner-lam').cost);
    });
    it('có in: khổ lót chỉ vô tác dụng với decal, giấy ram vẫn đổi giá theo khổ', () => {
        const c = config();
        c.allowedMaterials = {
            wrap: ['C150'],
            liner: ['C150', 'Decal giấy đế mỏng (VHM)'],
        };
        const costs = (paperName, linerPrint) =>
            [0, 1].map((linerStock) => {
                const s = {
                    ...input(),
                    linerPaper: DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex(
                        (p) => p.name === paperName
                    ),
                    linerStock,
                    linerPrint,
                };
                try {
                    return row(run(s, c), 'liner').cost;
                } catch {
                    return null;
                }
            });
        const decal = costs('Decal giấy đế mỏng (VHM)', true);
        expect(decal[0]).toBe(decal[1]);
        const ream = costs('C150', true);
        expect(ream[0]).not.toBe(ream[1]);
    });
    it('dòng carton xuất vốn/cm² tấm nguyên và vốn/cm² thành phẩm thật của đơn', () => {
        const r = run();
        expect(r.carton).toMatchObject({
            sheetW: 60,
            sheetH: 100,
            sheets: 14,
            area: 72000,
            salePerCm2: 12,
        });
        // 14 tấm nguyên rơi vào bậc vốn "từ 10" = 42.000đ/tấm ⇒ 42000 / (60 × 100) = 7 đ/cm².
        expect(r.carton).toMatchObject({ sheetCost: 42000, costTier: 2, saleTier: 3 });
        expect(r.carton.costPerRawCm2).toBeCloseTo(7);
        // Thành phẩm chỉ 72.000 cm² trên 84.000 cm² tấm nguyên ⇒ vốn thật mỗi cm² cao hơn.
        expect(r.carton.costPerFinishedCm2).toBeCloseTo(588000 / 72000);
        expect(r.carton.costPerFinishedCm2 * r.carton.area).toBeCloseTo(row(r, 'carton').cost);
        expect(r.carton.wasteFactor).toBeGreaterThan(1);
        expect(row(r, 'carton').detail).toContain('60 × 100 cm');
        expect(row(r, 'carton').detail).toContain('7.00 đ/cm² tấm nguyên');
        expect(row(r, 'carton').detail).toContain('8.17 đ/cm² thành phẩm');
    });
    it('đổi loại carton đổi luôn khổ tấm, không dùng lại sơ đồ của loại trước', () => {
        const c = config();
        const t = [{ from: 1, cost: 45000, sale: 18 }];
        c.materials.carton = [
            { name: 'Khổ 60×100', w: 60, h: 100, tiers: structuredClone(t) },
            { name: 'Khổ 76×100', w: 76, h: 100, tiers: structuredClone(t) },
        ];
        const s = input();
        const a = run(s, c),
            b = run({ ...s, selected: { ...s.selected, carton: 1 } }, c),
            again = run(s, c);
        expect([a.lay.sw, b.lay.sw]).toEqual([600, 760]);
        expect([a.carton.sheetW, b.carton.sheetW]).toEqual([60, 76]);
        expect(a.carton.costPerRawCm2).not.toBeCloseTo(b.carton.costPerRawCm2);
        expect(again.lay.count).toBe(a.lay.count);
        expect(again.carton.sheetW).toBe(60);
    });
    it('mỗi loại carton phải có khổ hợp lệ, lọt máy cắt và còn dư sau khi xén biên', () => {
        const missing = config();
        delete missing.materials.carton[0].w;
        expect(validateCalendarConfig(missing).isValid).toBe(false);
        expect(() => run(input(), missing)).toThrow(/Khổ ngang của tấm carton/);
        const wide = config();
        wide.materials.carton[0].w = 100;
        expect(validateCalendarConfig(wide).errors[0]).toMatch(/máy cắt/);
        const huge = config();
        huge.materials.carton[0].h = 1001;
        expect(validateCalendarConfig(huge).isValid).toBe(false);
        const trimmed = config();
        trimmed.geometry.trim = 40;
        expect(validateCalendarConfig(trimmed).errors[0]).toMatch(/Xén biên/);
    });
});
