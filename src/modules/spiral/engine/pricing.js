// Sổ đóng lò xo (spiral / coil binding) — engine tính giá.
//
// Clone từ catalogue nhưng: in TỪNG TỜ ĐƠN tại khổ thành phẩm (không gấp đôi);
// nhập số trang RUỘT, bìa = 2 tờ; in 1/2 mặt riêng cho bìa & ruột; đóng lò xo
// (bậc số cuốn + phụ giá độ dày = tổng số tờ). Dùng chung printConfig (In KTS).

import {
    calculatePaperOptions,
    calculatePerSheetOptions,
    calculateDecalOptions,
    calculateCustomerQuote,
} from '../../small-print/engine/index.js';

const err = (message) => ({ error: message });

// Chạy 1 "section" (bìa hoặc ruột): `leaves` tờ/cuốn, in `printSides` mặt, `colorMode` màu.
function sectionQuote(paperType, leaves, quantity, base, config, printSides = '2', colorMode = '4color') {
    const spParams = {
        productW: base.pieceW_cm,
        productH: base.pieceH_cm,
        bleed: 0,
        productQuantity: 1,
        paperType: String(paperType),
        printSides: String(printSides),
        printColorMode: colorMode || '4color',
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
    const genArgs = [spParams, selectedPaper, base.pieceW_cm, base.pieceH_cm, allResults, 0, false, config];
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

    // Số tờ in = ghép các tờ khác nhau lên tờ in (imposition 2-up…): ceil(leaves × qty / pps).
    // (KHÔNG phải leaves × ceil(qty/pps) — cách đó bỏ phí vị trí ghép → A4 bị nhân đôi.)
    const sectionSheets = Math.ceil((leaves * quantity) / mainResult.productsPerSheet);
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
        leaves,
        sides: Number(printSides),
        colorMode: colorMode || '4color',
        sectionSheets,
        productsPerSheet: mainResult.productsPerSheet,
        paperCostPerSheet: mainResult.debug?.paperCostPerSheet ?? 0,
        // A4 quy đổi theo NỘI DUNG: không tính ô ghép bỏ trống ở tờ in cuối chưa đầy.
        // (Nếu dùng quote.totalA4PagesRaw = factor × ceil(leaves×qty/pps) × mặt thì bìa A5 2 tờ
        //  trên tờ 4-up bị tính = 4 A4 = khổ A4, sai. Đúng phải = 2.)
        a4:
            Math.round(
                quote.conversionFactor *
                    ((leaves * quantity) / mainResult.productsPerSheet) *
                    (Number(printSides) || 1) *
                    10000
            ) / 10000,
        factor: quote.conversionFactor,
        paperAdjustment: quote.paperAdjustment || 0,
        paperAdjustmentReason: quote.paperAdjustmentReason || '',
        paperSurcharge: quote.totalPaperSurcharge || 0,
        artPaperCost: quote.totalArtPaperCustomerCost || 0,
        costPerSheet: mainResult.debug?.totalCostPerSheet ?? 0,
    };
}

export function calculateSpiral(params, config) {
    const numPages = parseInt(params.numPages, 10); // số trang RUỘT
    const finishedW = parseFloat(params.finishedW);
    const finishedH = parseFloat(params.finishedH);
    const quantity = parseInt(params.quantity, 10);
    const coverSides = params.coverSides === '1' ? '1' : '2';
    const innerSides = params.innerSides === '1' ? '1' : '2';
    const coverColorMode = params.coverColorMode || '4color';
    const innerColorMode = params.innerColorMode || '4color';

    // 1. Validate
    if (!Number.isFinite(numPages) || numPages < 1) {
        return err('Số trang ruột không hợp lệ (≥ 1).');
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

    // 2. Kích thước in = khổ thành phẩm (+2mm bù xén). KHÔNG gấp đôi.
    const pieceW_cm = (finishedW + 2) / 10;
    const pieceH_cm = (finishedH + 2) / 10;

    // Guard: vượt khổ in tối đa của máy.
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

    // 3. Số tờ (leaves) từng section.
    const base = { pieceW_cm, pieceH_cm, artPaperPrice: params.artPaperPrice };
    const coverLeaves = 2; // bìa trước + sau
    const innerLeaves = innerSides === '2' ? Math.ceil(numPages / 2) : numPages;

    const cover = sectionQuote(
        params.coverPaperType,
        coverLeaves,
        quantity,
        base,
        config,
        coverSides,
        coverColorMode
    );
    if (cover.error) return err(cover.error);
    let inner = null;
    if (innerLeaves > 0) {
        inner = sectionQuote(
            params.innerPaperType,
            innerLeaves,
            quantity,
            base,
            config,
            innerSides,
            innerColorMode
        );
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
    // Giá in 1 màu ĐEN = giá 4 màu × (1 − %), sàn đ/trang (per_page). Màu bìa/ruột RIÊNG.
    const oneColorDisc = (config.ONE_COLOR_DISCOUNT_PERCENT ?? 0) / 100;
    const oneColorMinPP = config.ONE_COLOR_MIN_PRICE_PER_PAGE ?? 0;
    const rateFor = (cm) => {
        if (cm !== '1color') return tier.print;
        const r = tier.print * (1 - oneColorDisc);
        return isPerPage ? Math.max(r, oneColorMinPP) : r;
    };
    const printPrice = isPerPage
        ? coverA4 * rateFor(coverColorMode) + innerA4 * rateFor(innerColorMode)
        : rateFor(coverColorMode === innerColorMode ? coverColorMode : '4color');
    const sameColor = coverColorMode === innerColorMode;
    const unitPriceText = !isPerPage
        ? 'Trọn gói'
        : sameColor
          ? `${rateFor(coverColorMode).toLocaleString('vi-VN')}đ/trang${coverColorMode === '1color' ? ' (1 màu đen)' : ''}`
          : `4 màu ${tier.print.toLocaleString('vi-VN')}đ + 1 màu đen ${rateFor('1color').toLocaleString('vi-VN')}đ /trang`;

    // 5. Cán màng — chọn RIÊNG cho bìa & ruột, mỗi phần 0/1/2 mặt. Đơn giá cán = bậc giá gộp.
    let coverLam = parseInt(params.coverLam, 10);
    let innerLam = parseInt(params.innerLam, 10);
    if (Number.isNaN(coverLam) && Number.isNaN(innerLam)) {
        // Tương thích ngược laminationMode cũ (cover1 / all / none).
        const m = params.laminationMode;
        coverLam = m === 'cover1' || m === 'all' ? 1 : 0;
        innerLam = m === 'all' ? 1 : 0;
    }
    coverLam = Math.max(0, Math.min(2, coverLam || 0));
    innerLam = Math.max(0, Math.min(2, innerLam || 0));
    const lamRate = tier.laminate || 0;
    // per_page: theo trang A4 × số mặt cán. package: phí phẳng × số mặt cán.
    const lamCost = isPerPage
        ? (coverA4 * coverLam + innerA4 * innerLam) * lamRate
        : (coverLam + innerLam) * lamRate;
    const lamParts = [];
    if (coverLam) lamParts.push(`Bìa cán ${coverLam} mặt`);
    if (innerLam) lamParts.push(`Ruột cán ${innerLam} mặt`);
    const lamLabel = lamParts.length ? lamParts.join(' + ') : 'Không cán';

    // 6. Giấy (tách bìa/ruột) — cộng dồn.
    // Ruột in 1 mặt dùng gấp đôi giấy. Chiết khấu giấy chỉ tính trên phần NỘI DUNG
    // (tương đương 2 mặt), KHÔNG nhân đôi theo số tờ. Phần giấy dư tính phụ thu riêng (7c).
    let innerAdj = inner ? inner.paperAdjustment : 0;
    let extraPaperCustomer = 0;
    if (inner && innerSides === '1') {
        const sheets2 = Math.ceil((Math.ceil(numPages / 2) * quantity) / inner.productsPerSheet);
        const extraSheets = Math.max(0, inner.sectionSheets - sheets2);
        if (inner.sectionSheets > 0) {
            innerAdj = inner.paperAdjustment * (sheets2 / inner.sectionSheets);
        }
        // Không cộng phụ thu nếu ruột là giấy mỹ thuật (artPaperCost đã tự nhân đôi theo số tờ).
        if (inner.artPaperCost === 0) {
            extraPaperCustomer = extraSheets * inner.paperCostPerSheet;
        }
    }
    const paperAdjustment = cover.paperAdjustment + innerAdj;
    const paperSurcharge = cover.paperSurcharge + (inner ? inner.paperSurcharge : 0);
    const artPaperCost = cover.artPaperCost + (inner ? inner.artPaperCost : 0);

    // 7. Đóng lò xo (bậc số cuốn + phụ giá độ dày = tổng số tờ/cuốn).
    const spiral = config.SPIRAL_CONFIG || {};
    const totalLeaves = coverLeaves + innerLeaves;
    const coilTier = (spiral.coilTiers || []).find((t) => quantity >= t.min && quantity <= t.max);
    let coilBase = 0;
    let coilUnitText = '—';
    if (coilTier) {
        coilBase = coilTier.type === 'package' ? coilTier.price : coilTier.price * quantity;
        coilUnitText =
            coilTier.type === 'package'
                ? 'Trọn gói'
                : `${coilTier.price.toLocaleString('vi-VN')}đ/cuốn`;
    }
    const thTier = (spiral.thicknessTiers || []).find(
        (t) => totalLeaves >= t.min && totalLeaves <= t.max
    );
    const thicknessAdd = (thTier?.surcharge || 0) * quantity;
    const coilCustomer = coilBase + thicknessAdd;
    const coilCost = (spiral.costPerBook || 0) * quantity;

    // 7b. Bìa lót ngoài (theo bậc số cuốn). KHÔNG tính vào độ dày.
    let linerCustomer = 0;
    let linerCost = 0;
    let linerName = '';
    let linerUnitText = '';
    const li = parseInt(params.linerType, 10);
    const linerT = Number.isInteger(li) && li >= 0 ? (spiral.linerTypes || [])[li] : null;
    if (linerT) {
        linerName = linerT.name;
        const t = (linerT.tiers || []).find((x) => quantity >= x.min && quantity <= x.max);
        if (t) {
            linerCustomer = t.type === 'package' ? t.price : t.price * quantity;
            linerUnitText =
                t.type === 'package' ? 'Trọn gói' : `${t.price.toLocaleString('vi-VN')}đ/cuốn`;
        }
        linerCost = (linerT.costPerBook || 0) * quantity;
    }

    // 8. Tổng + đơn giá/cuốn + giá vốn.
    const totalPrintSheets = cover.sectionSheets + (inner ? inner.sectionSheets : 0);
    const giaVon =
        cover.costPerSheet * cover.sectionSheets +
        (inner ? inner.costPerSheet * inner.sectionSheets : 0) +
        coilCost +
        linerCost;
    const totalCustomerCost =
        printPrice +
        lamCost +
        paperSurcharge +
        artPaperCost -
        paperAdjustment +
        coilCustomer +
        linerCustomer +
        extraPaperCustomer;
    const unitPerBook = totalCustomerCost / quantity;

    return {
        error: null,
        pieceW_mm: finishedW + 2,
        pieceH_mm: finishedH + 2,
        pieceW_cm,
        pieceH_cm,
        pressSheetSize: cover.mainResult.cutSheetSize,
        productsPerSheet: cover.mainResult.productsPerSheet,
        cover: {
            paperName: cover.paperName,
            leaves: cover.leaves,
            sides: cover.sides,
            colorMode: cover.colorMode,
            sheets: cover.sectionSheets,
            a4: coverA4,
        },
        inner: inner
            ? {
                  paperName: inner.paperName,
                  leaves: inner.leaves,
                  sides: inner.sides,
                  colorMode: inner.colorMode,
                  sheets: inner.sectionSheets,
                  a4: innerA4,
              }
            : null,
        totalLeaves,
        totalPrintSheets,
        totalA4Pages,
        coverA4,
        innerA4,
        conversionFactor: cover.factor,
        unitPriceText,
        printPrice,
        printPricePerPage: totalA4Pages > 0 ? printPrice / totalA4Pages : 0,
        lamLabel,
        lamCost,
        paperAdjustment,
        paperAdjustmentReason: cover.paperAdjustmentReason || inner?.paperAdjustmentReason || '',
        paperSurcharge,
        artPaperCost,
        coilCustomer,
        coilUnitText,
        thicknessAdd,
        linerName,
        linerCustomer,
        linerUnitText,
        extraPaperCustomer,
        giaVon,
        totalCustomerCost,
        unitPerBook,
    };
}
