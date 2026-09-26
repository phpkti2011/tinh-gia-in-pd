import { largeSheetPrice } from '../../small-print/engine/paper.js';
import {
    calculatePaperOptions,
    calculateCustomerQuote,
    calculateFloorPrice,
} from '../../small-print/engine/index.js';
import { requireValue as must } from '../config/schema.js';
export function kts(
    printConfig,
    w,
    h,
    qty,
    sides,
    paperIndex,
    contents = 1,
    lam = 0,
    stockIndex = 0,
    art = null,
    color = '4color',
    film = ''
) {
    const config = art
        ? { ...printConfig, ART_PAPER_LARGE_SHEET_SIZES: [{ name: art.name, w: art.w, h: art.h }] }
        : printConfig;
    if (art) {
        paperIndex = config.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'custom');
        stockIndex = 0;
    }
    const paper = config.PAPER_STOCK_DATA[paperIndex];
    must(
        paper &&
            !paper.hidden &&
            (paper.pricingModel === 'ream' || (art && paper.pricingModel === 'custom')),
        'Chưa có loại giấy phù hợp trong bộ tính KTS.'
    );
    const params = {
        productW: w,
        productH: h,
        bleed: 0.15,
        productQuantity: qty,
        paperType: String(paperIndex),
        printSides: String(sides),
        printColorMode: '4color',
        printContents: contents,
        variableData: 'no',
        largeSheetSelector: String(stockIndex),
        artPaperPrice: 0,
        dieCuttingType: 'none',
        holePunchingType: 'none',
        creasingType: 'none',
        mountingType: 'none',
        laminationType: lam === 2 ? 'laminate_2' : lam === 1 ? 'laminate_1' : 'none',
        laminationFilm: film,
        foilStamping: 'none',
    };
    if (art) params.artPaperPrice = art.cost;
    params.printColorMode = color;
    const results = [];
    calculatePaperOptions(params, paper, w + 0.3, h + 0.3, results, 0, false, config);
    const valid = results
        .filter((r) => Number.isFinite(r.costPerProduct) && r.productsPerSheet > 0)
        .sort((a, b) => a.costPerProduct - b.costPerProduct);
    const best = valid.find((r) => r.cutSheetH <= 48) || valid[0];
    must(best, 'Khổ in không phù hợp với cấu hình KTS hiện tại.');
    const quote = calculateCustomerQuote(
        best,
        params,
        { holePunching: 0, creasing: 0, mounting: 0 },
        { moldCost: 0, laborCustomerPrice: 0 },
        null,
        config
    );
    must(!quote.error, quote.error || 'Không tính được giá KTS.');
    const sheets = Math.ceil(qty / best.productsPerSheet),
        d = best.debug;
    const floor = calculateFloorPrice({
        pricingModel: paper.pricingModel,
        totalA4Pages: quote.totalA4PagesRaw,
        paperCost: qty * best.paperCostPerProduct,
        otherCost: qty * best.laminationCostPerProduct,
        quantity: qty,
        printContents: contents,
        config,
    });
    return {
        cost: sheets * d.totalCostPerSheet,
        sale: Math.max(quote.totalCustomerCost, floor.active ? floor.total : 0),
        printCost: sheets * d.printCostPerSheet,
        printSale: quote.totalPrintCost,
        quote,
        best,
        sheets,
        params,
    };
}
export function paperQuote(
    printConfig,
    w,
    h,
    qty,
    paperIndex,
    stockIndex,
    press = null,
    art = null
) {
    const paper = art
        ? { name: art.name, pricingModel: 'custom' }
        : printConfig.PAPER_STOCK_DATA[paperIndex];
    must(art || paper?.pricingModel === 'ream', 'Chọn giấy theo ram trong danh mục KTS.');
    must(!paper.hidden, 'Giấy đã ẩn trong KTS. Vui lòng chọn lại giấy.');
    const stock = press
        ? { w: press.best.largeSheetW, h: press.best.largeSheetH }
        : art || printConfig.STANDARD_LARGE_SHEET_SIZES[stockIndex];
    must(stock, 'Chưa chọn khổ giấy hợp lệ.');
    const yieldPer = press
        ? press.best.productsPerSheet
        : Math.max(
              Math.floor(stock.w / w) * Math.floor(stock.h / h),
              Math.floor(stock.w / h) * Math.floor(stock.h / w)
          );
    must(yieldPer > 0, 'Khổ áo/lót không lọt giấy nguyên đã chọn.');
    const whole = press
            ? Math.ceil(press.sheets / press.best.numCuttableSheets)
            : Math.ceil(qty / yieldPer),
        unit = art ? art.cost : largeSheetPrice(paper, stock, printConfig, 0);
    must(Number.isFinite(unit) && unit > 0, 'Giá vốn giấy phải là số dương.');
    const cost = whole * unit;
    return {
        cost,
        sheets: whole,
        yieldPer,
        stock: `${stock.w}×${stock.h}`,
        paperName: paper.name,
        unit,
        source: art ? 'Mỹ thuật · giá vốn/tờ' : 'KTS · giá vốn/ram',
        pricePerReam: paper.pricePerReam,
        areaCm: press ? press.sheets * press.best.cutSheetW * press.best.cutSheetH : qty * w * h,
    };
}
