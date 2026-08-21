// Catalogue bấm kim (saddle stitch) — engine tính giá.
//
// TÁCH BÌA / RUỘT: bìa = 4 trang (giấy riêng), ruột = numPages − 4 (giấy riêng).
// Mỗi phần tính tiền giấy riêng (điều chỉnh/phụ thu). Giá IN gộp volume: bậc giá
// theo TỔNG trang A4 (bìa + ruột). Cán màng cán 1 mặt/tờ: bìa / toàn bộ.
//
// TÁI DÙNG engine "In KTS Khổ Nhỏ": mỗi section chạy calculatePaperOptions +
// calculateCustomerQuote để lấy đúng khổ tờ in + điều chỉnh giấy + hệ số A4; phần
// in gộp và cán màng được tính lại theo bậc giá của TỔNG trang A4.
//
// `config` = printConfig (In KTS) đã gộp thêm STAPLE_CONFIG.

import {
    calculatePaperOptions,
    calculatePerSheetOptions,
    calculateDecalOptions,
    calculateCustomerQuote,
} from '../../small-print/engine/index.js';

const err = (message) => ({ error: message });

// Chạy 1 "section" (bìa hoặc ruột) qua engine small-print để lấy khổ tờ in, số tờ
// in, trang A4 và điều chỉnh giấy — dùng đúng math của In KTS.
function sectionQuote(paperType, signatures, quantity, base, config, printSides = '2') {
    const spParams = {
        productW: base.pieceW_cm,
        productH: base.pieceH_cm,
        bleed: 0,
        productQuantity: 1,
        paperType: String(paperType),
        printSides: String(printSides),
        printColorMode: base.printColorMode || '4color',
        dieCuttingType: 'none',
        holePunchingType: 'none',
        creasingType: 'none',
        mountingType: 'none',
        laminationType: 'none',
        printContents: 1,
        variableData: 'no',
        largeSheetSelector: '0',
        artPaperPrice: base.artPaperPrice ?? 0,
    };
    const selectedPaper = config.PAPER_STOCK_DATA[parseInt(paperType, 10)];
    if (!selectedPaper) return { error: 'Loại giấy không hợp lệ.' };

    const allResults = [];
    const genArgs = [
        spParams,
        selectedPaper,
        base.pieceW_cm,
        base.pieceH_cm,
        allResults,
        0,
        false,
        config,
    ];
    const model = selectedPaper.pricingModel;
    if (model === 'sqm') calculateDecalOptions(...genArgs);
    else if (model === 'per_sheet') calculatePerSheetOptions(...genArgs);
    else calculatePaperOptions(...genArgs);

    if (allResults.length === 0) return { error: 'Không tìm thấy khổ tờ in phù hợp.' };
    allResults.sort((a, b) => a.costPerProduct - b.costPerProduct);
    const uniqueResults = allResults.filter(
        (v, i, a) =>
            a.findIndex(
                (t) =>
                    t.printer.name === v.printer.name &&
                    t.largeSheetName === v.largeSheetName &&
                    t.cutSheetSize === v.cutSheetSize &&
                    t.productsPerSheet === v.productsPerSheet
            ) === i
    );
    const validResults = uniqueResults.filter((r) => isFinite(r.costPerProduct));
    if (validResults.length === 0) return { error: 'Không tính được chi phí tờ in hợp lệ.' };
    const mainResult = validResults.find((r) => r.cutSheetH <= 48) || validResults[0];
    if (!mainResult || mainResult.productsPerSheet <= 0) {
        return { error: 'Lỗi: số sản phẩm / tờ in không hợp lệ.' };
    }

    const sectionSheets = signatures * Math.ceil(quantity / mainResult.productsPerSheet);
    const quote = calculateCustomerQuote(
        mainResult,
        { ...spParams, productQuantity: sectionSheets * mainResult.productsPerSheet },
        { holePunching: 0, creasing: 0, mounting: 0 },
        { moldCost: 0, laborCustomerPrice: 0 },
        null,
        config
    );
    if (quote.error) return { error: quote.error };

    return {
        paperName: selectedPaper.name,
        mainResult,
        sectionSheets,
        a4: quote.totalA4PagesRaw,
        factor: quote.conversionFactor,
        paperAdjustment: quote.paperAdjustment || 0,
        paperAdjustmentReason: quote.paperAdjustmentReason || '',
        paperSurcharge: quote.totalPaperSurcharge || 0,
        artPaperCost: quote.totalArtPaperCustomerCost || 0,
        costPerSheet: mainResult.debug?.totalCostPerSheet ?? 0,
    };
}

export function calculateCatalogue(params, config) {
    const numPages = parseInt(params.numPages, 10);
    const finishedW = parseFloat(params.finishedW);
    const finishedH = parseFloat(params.finishedH);
    const quantity = parseInt(params.quantity, 10);
    const orientation = params.orientation || 'portrait';
    const laminationMode = params.laminationMode || 'none';
    const coverSingleSide = !!params.coverSingleSide;
    // Bìa 2 mặt = 4 trang (numPages%4===0); bìa 1 mặt = 2 trang (numPages%4===2).
    const coverPages = coverSingleSide ? 2 : 4;
    const coverSides = coverSingleSide ? '1' : '2';
    const pageRem = coverSingleSide ? 2 : 0;

    // 1. Validate
    if (!Number.isFinite(numPages) || numPages < coverPages || numPages % 4 !== pageRem) {
        return err(
            coverSingleSide
                ? 'Số trang phải chia hết cho 4 dư 2 (in bìa 1 mặt).'
                : 'Số trang phải chia hết cho 4 (tối thiểu 4).'
        );
    }
    if (
        !Number.isFinite(finishedW) ||
        finishedW <= 0 ||
        !Number.isFinite(finishedH) ||
        finishedH <= 0
    ) {
        return err('Kích thước thành phẩm không hợp lệ.');
    }
    if (!Number.isFinite(quantity) || quantity < 1) {
        return err('Số lượng cuốn không hợp lệ.');
    }
    const paperData = config.PAPER_STOCK_DATA || [];
    if (!paperData[parseInt(params.coverPaperType, 10)]) return err('Giấy bìa không hợp lệ.');
    if (!paperData[parseInt(params.innerPaperType, 10)]) return err('Giấy ruột không hợp lệ.');

    // 2. Kích thước spread (mm → cm) — dùng chung cho bìa & ruột.
    const short = Math.min(finishedW, finishedH);
    const long = Math.max(finishedW, finishedH);
    const landscape = orientation === 'landscape';
    const pageW = landscape ? long : short;
    const pageH = landscape ? short : long;
    const pieceW_mm = pageW * 2 + 2;
    const pieceH_mm = pageH + 2;
    const pieceW_cm = pieceW_mm / 10;
    const pieceH_cm = pieceH_mm / 10;

    // Guard: spread vượt khổ in tối đa của máy.
    const printerConfig = Object.values(config.PRINTER_CONFIG || {})[0];
    if (printerConfig) {
        const pa = config.PRINTABLE_AREA_CONFIG || {};
        const printableW = printerConfig.maxW - (pa.custom_width_margin || 0);
        const maxH = printerConfig.maxH;
        const shortDim = Math.min(pieceW_cm, pieceH_cm);
        const longDim = Math.max(pieceW_cm, pieceH_cm);
        if (shortDim > printableW || longDim + (pa.custom_height_margin || 0) > maxH) {
            return err('Khổ thành phẩm vượt quá khổ in tối đa của máy.');
        }
    }

    // 3. Chạy từng section.
    const base = { pieceW_cm, pieceH_cm, printColorMode: params.printColorMode, artPaperPrice: params.artPaperPrice };
    const coverSigs = 1;
    const innerSigs = (numPages - coverPages) / 4;

    const cover = sectionQuote(params.coverPaperType, coverSigs, quantity, base, config, coverSides);
    if (cover.error) return err(cover.error);
    let inner = null;
    if (innerSigs > 0) {
        inner = sectionQuote(params.innerPaperType, innerSigs, quantity, base, config, '2');
        if (inner.error) return err(inner.error);
    }

    // 4. Gộp trang A4 → bậc giá in (volume).
    const coverA4 = cover.a4;
    const innerA4 = inner ? inner.a4 : 0;
    const totalA4Pages = coverA4 + innerA4;
    const tier = (config.CUSTOMER_PRICE_TIERS || []).find(
        (t) => totalA4Pages >= t.min && totalA4Pages <= t.max
    );
    if (!tier) return err(`Không tìm thấy mức giá cho ${totalA4Pages} trang A4.`);
    const isPerPage = tier.type === 'per_page';
    // Giá in 1 màu ĐEN = giá 4 màu × (1 − %), sàn đ/trang (per_page). 1 màu chung cả cuốn.
    const oneColorDisc = (config.ONE_COLOR_DISCOUNT_PERCENT ?? 0) / 100;
    const oneColorMinPP = config.ONE_COLOR_MIN_PRICE_PER_PAGE ?? 0;
    const oneColor = params.printColorMode === '1color';
    const printRate = !oneColor
        ? tier.print
        : isPerPage
          ? Math.max(tier.print * (1 - oneColorDisc), oneColorMinPP)
          : tier.print * (1 - oneColorDisc);
    const printPrice = isPerPage ? totalA4Pages * printRate : printRate;
    const unitPriceText =
        (isPerPage ? `${printRate.toLocaleString('vi-VN')}đ/trang` : 'Trọn gói') +
        (oneColor ? ' (1 màu đen)' : '');

    // 5. Cán màng (cán 1 mặt/tờ), dùng đơn giá cán của bậc giá gộp.
    const lamRate = tier.laminate || 0;
    let lamCost = 0;
    let lamLabel = 'Không cán';
    if (laminationMode === 'cover1') {
        lamCost = isPerPage ? coverA4 * lamRate : lamRate;
        lamLabel = 'Bìa cán 1 mặt';
    } else if (laminationMode === 'all') {
        lamCost = isPerPage ? totalA4Pages * lamRate : lamRate;
        lamLabel = 'Cán toàn bộ';
    }

    // 6. Giấy (tách bìa/ruột) — cộng dồn.
    const paperAdjustment = cover.paperAdjustment + (inner ? inner.paperAdjustment : 0);
    const paperSurcharge = cover.paperSurcharge + (inner ? inner.paperSurcharge : 0);
    const artPaperCost = cover.artPaperCost + (inner ? inner.artPaperCost : 0);

    // 7. Bấm kim (theo BẬC số cuốn) + tổng + đơn giá/cuốn.
    const staple = config.STAPLE_CONFIG || {};
    const stapleTier = (staple.tiers || []).find((t) => quantity >= t.min && quantity <= t.max);
    let stapleCustomer = 0;
    let stapleUnitText = '—';
    if (stapleTier) {
        stapleCustomer =
            stapleTier.type === 'package' ? stapleTier.price : stapleTier.price * quantity;
        stapleUnitText =
            stapleTier.type === 'package'
                ? 'Trọn gói'
                : `${stapleTier.price.toLocaleString('vi-VN')}đ/cuốn`;
    }
    const stapleCost = (staple.costPerBook || 0) * quantity;

    const totalPrintSheets = cover.sectionSheets + (inner ? inner.sectionSheets : 0);
    const giaVon =
        cover.costPerSheet * cover.sectionSheets +
        (inner ? inner.costPerSheet * inner.sectionSheets : 0) +
        stapleCost;

    const totalCustomerCost =
        printPrice + lamCost + paperSurcharge + artPaperCost - paperAdjustment + stapleCustomer;
    const unitPerBook = totalCustomerCost / quantity;

    return {
        error: null,
        // Kích thước
        pieceW_mm,
        pieceH_mm,
        pieceW_cm,
        pieceH_cm,
        pressSheetSize: cover.mainResult.cutSheetSize,
        productsPerSheet: cover.mainResult.productsPerSheet,
        // Section
        cover: {
            paperName: cover.paperName,
            signatures: coverSigs,
            sheets: cover.sectionSheets,
            a4: coverA4,
            pressSheetSize: cover.mainResult.cutSheetSize,
        },
        inner: inner
            ? {
                  paperName: inner.paperName,
                  signatures: innerSigs,
                  sheets: inner.sectionSheets,
                  a4: innerA4,
                  pressSheetSize: inner.mainResult.cutSheetSize,
              }
            : null,
        // Số lượng
        signaturesPerBook: coverSigs + innerSigs,
        totalPrintSheets,
        coverSingleSide,
        // A4 + giá
        totalA4Pages,
        coverA4,
        innerA4,
        conversionFactor: cover.factor,
        unitPriceText,
        printPrice,
        printPricePerPage: totalA4Pages > 0 ? printPrice / totalA4Pages : 0,
        // Cán màng
        laminationMode,
        lamLabel,
        lamCost,
        // Giấy
        paperAdjustment,
        paperAdjustmentReason: cover.paperAdjustmentReason || inner?.paperAdjustmentReason || '',
        paperSurcharge,
        artPaperCost,
        // Bấm kim + tổng
        stapleCustomer,
        stapleUnitText,
        giaVon,
        totalCustomerCost,
        unitPerBook,
    };
}
