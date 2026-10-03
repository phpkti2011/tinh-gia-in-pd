// Small-print engine — adapter "một phần in KTS" cho các module gọi chéo (lịch bàn, bao thư).
//
// Chuyển nguyên văn từ modules/calendar/engine/smallPrintAdapter.js để bao thư dùng chung
// mà không phụ thuộc vào module lịch. Lịch vẫn import qua file cũ (re-export).
//
//   kts(...)        — giấy + in cho một khổ thành phẩm: chọn phương án rẻ nhất như màn KTS,
//                     báo khách qua calculateCustomerQuote và nâng lên giá sàn nếu có.
//   paperQuote(...) — CHỈ giấy trắng theo giá ram: số tờ nguyên × giá vốn/tờ, không click,
//                     không giá sàn. Dùng cho phần không in (lót lịch, mặt sau bao thư).
//
// Tham số cuối `opts` là phần mở rộng cho bao thư: `gap` = khoảng cách bình giữa các
// thành phẩm (cm). Mặc định 0 nên kết quả lịch không đổi; bao thư bế khuôn dùng 0.4 như
// nhánh mold của màn KTS (App.jsx SmallPrintModule).

import { largeSheetPrice } from './paper.js';
import { calculatePaperOptions, calculateDecalOptions } from './options.js';
import { calculateCustomerQuote } from './quote.js';
import { calculateFloorPrice } from './floorPrice.js';

function must(ok, message) {
    if (!ok) throw new Error(message);
}

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
    film = '',
    opts = {}
) {
    const gap = Number.isFinite(opts.gap) && opts.gap > 0 ? opts.gap : 0;
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
            (['ream', 'sqm'].includes(paper.pricingModel) ||
                (art && paper.pricingModel === 'custom')),
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
    (paper.pricingModel === 'sqm' ? calculateDecalOptions : calculatePaperOptions)(
        params,
        paper,
        w + 0.3,
        h + 0.3,
        results,
        gap,
        opts.digitalCutting === true,
        config
    );
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
    must(art || ['ream', 'sqm'].includes(paper?.pricingModel), 'Chọn giấy hợp lệ trong danh mục.');
    must(!paper.hidden, 'Giấy đã ẩn trong KTS. Vui lòng chọn lại giấy.');
    const stock = press
        ? { w: press.best.largeSheetW, h: press.best.largeSheetH }
        : art ||
          (paper.pricingModel === 'sqm'
              ? {
                    w: (printConfig.DECAL_SHEET_SIZES?.length
                        ? printConfig.DECAL_SHEET_SIZES
                        : printConfig.COMMON_SHEET_SIZES)[stockIndex]?.w,
                    h: (printConfig.DECAL_SHEET_SIZES?.length
                        ? printConfig.DECAL_SHEET_SIZES
                        : printConfig.COMMON_SHEET_SIZES)[stockIndex]?.h,
                }
              : printConfig.STANDARD_LARGE_SHEET_SIZES[stockIndex]);
    must(stock, 'Chưa chọn khổ giấy hợp lệ.');
    const yieldPer = press
        ? press.best.productsPerSheet
        : Math.max(
              Math.floor(stock.w / w) * Math.floor(stock.h / h),
              Math.floor(stock.w / h) * Math.floor(stock.h / w)
          );
    must(yieldPer > 0, 'Khổ áo/lót không lọt giấy nguyên đã chọn.');
    const whole = press
            ? Math.ceil(
                  press.sheets / (paper.pricingModel === 'sqm' ? 1 : press.best.numCuttableSheets)
              )
            : Math.ceil(qty / yieldPer),
        unit = art
            ? art.cost
            : paper.pricingModel === 'sqm'
              ? ((stock.w * stock.h) / 10000) * paper.pricePerSqm
              : largeSheetPrice(paper, stock, printConfig, 0);
    must(Number.isFinite(unit) && unit > 0, 'Giá vốn giấy phải là số dương.');
    const cost = whole * unit;
    const rotated =
        !press &&
        Math.floor(stock.w / h) * Math.floor(stock.h / w) >
            Math.floor(stock.w / w) * Math.floor(stock.h / h);
    const pieceW = rotated ? h : w,
        pieceH = rotated ? w : h;
    const cutting = press
        ? {
              stockW: stock.w,
              stockH: stock.h,
              kind: 'press',
              pieces:
                  paper.pricingModel === 'sqm'
                      ? [{ x: 0, y: 0, w: stock.w, h: stock.h }]
                      : press.best.cuttableSheetLayout,
              perSheet: paper.pricingModel === 'sqm' ? 1 : press.best.numCuttableSheets,
              required: press.sheets,
              productsPerPressSheet: press.best.productsPerSheet,
          }
        : {
              stockW: stock.w,
              stockH: stock.h,
              kind: 'blank',
              pieceW,
              pieceH,
              columns: Math.floor(stock.w / pieceW),
              rows: Math.floor(stock.h / pieceH),
              perSheet: yieldPer,
              required: qty,
          };
    return {
        cutting,
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
