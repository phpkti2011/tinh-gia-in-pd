// Small-print engine — option pipeline orchestrators.
//   - processSheet (atom: 1 result/call, push vào allResults qua ref)
//   - calculatePaperOptions (cho paper pricingModel='ream' hoặc 'custom')
//   - calculatePerSheetOptions (cho paper pricingModel='per_sheet' như Decal xi)
//   - calculateDecalOptions (cho paper pricingModel='sqm' — decal materials)
//
// Tách từ src/utils/calculator.js ở TASK-0009.
// KHÔNG đổi behavior. Vẫn mutate allResults qua ref param (API contract cũ).

import {
    getClicks,
    getCustomerA4Factor,
    getPrintableArea,
    calculateImposition,
    calculateMaxCuttableSheetsLayout,
} from './layout.js';
import { calculateLamination } from './finishing.js';
import { largeSheetPrice as calcLargeSheetPrice, blankSheetCostPerCutSheet } from './paper.js';
import { printedSheetsPerSet, blankSheetsPerSet } from './mounting.js';
import { perSheetVariants } from '../config/paperStock.js';

// Atom: tính 1 result cho 1 (cut sheet × printer) combination, push vào allResults
export function processSheet(
    pressW,
    pressH,
    largeSheet,
    printer,
    params,
    productWithBleedW,
    productWithBleedH,
    allResults,
    largeSheetPrice,
    spacing,
    isDigitalCutting,
    config,
    isCustom = false
) {
    if (!printer || pressW > printer.maxW || pressH > printer.maxH) return;
    if (
        (pressW > largeSheet.w || pressH > largeSheet.h) &&
        (pressW > largeSheet.h || pressH > largeSheet.w)
    )
        return;

    const clickPrice = printer.prices[params.printColorMode] || printer.prices['4color'];
    if (!clickPrice) return;

    const printableArea = getPrintableArea(
        pressW,
        pressH,
        printer,
        isDigitalCutting,
        config,
        isCustom
    );
    const currentSpacing = isCustom ? 0 : spacing;
    const imposition = calculateImposition(
        printableArea.w,
        printableArea.h,
        productWithBleedW,
        productWithBleedH,
        currentSpacing
    );
    const productsPerSheet = imposition.total;
    if (productsPerSheet === 0) return;

    const { count: numCuttableSheets, layout: cuttableSheetLayout } =
        calculateMaxCuttableSheetsLayout(largeSheet.w, largeSheet.h, pressW, pressH);
    if (numCuttableSheets === 0) return;

    const clicks = getClicks(pressH, printer);
    if (clicks === Infinity) return;

    // Khi bồi, mỗi tờ giấy chỉ in được 1 mặt ⇒ số tờ GIẤY IN = số mặt in, và có thêm
    // (số lớp − số mặt in) tờ giấy TRẮNG. Trang in KHÔNG đổi: 2 tờ × 1 mặt = 1 tờ × 2 mặt.
    // Xem engine/mounting.js. Không bồi ⇒ hệ số 1 và 0 ⇒ mọi con số cũ y nguyên.
    const sheetsPerSet = printedSheetsPerSet(params.mountingType, params.printSides);
    const blanksPerSet = blankSheetsPerSet(params.mountingType, params.printSides);
    const baseSheetPaperCost =
        numCuttableSheets > 0 ? largeSheetPrice / numCuttableSheets : Infinity;
    const paperCostPerSheet = baseSheetPaperCost * sheetsPerSet;
    const blankPaperCostPerSheet =
        blanksPerSet > 0
            ? blankSheetCostPerCutSheet(
                  (config.PAPER_STOCK_DATA || [])[params.blankPaperType],
                  { largeSheet, numCuttableSheets, cutW: pressW, cutH: pressH },
                  config
              ) * blanksPerSet
            : 0;
    const printCostPerSheet = clicks * clickPrice * params.printSides;
    const lamination = calculateLamination(
        pressH,
        imposition.actualPrintW,
        productsPerSheet,
        params.laminationType,
        config,
        params.laminationFilm
    );
    const totalCostPerSheet =
        paperCostPerSheet + blankPaperCostPerSheet + printCostPerSheet + lamination.costPerSheet;

    const costPerProduct = productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
    // paperCostPerProduct CỐ Ý chỉ gồm giấy IN (đã nhân theo số mặt): panel dùng nó cho
    // dòng "Đơn giá IN / trang". Giấy trắng là vật tư bồi nên đứng riêng.
    const paperCostPerProduct =
        productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
    const blankPaperCostPerProduct =
        productsPerSheet > 0 ? blankPaperCostPerSheet / productsPerSheet : 0;
    const printCostPerProduct =
        productsPerSheet > 0 ? printCostPerSheet / productsPerSheet : Infinity;

    allResults.push({
        printer,
        largeSheetName: `${largeSheet.w}x${largeSheet.h}`,
        layoutDesc: imposition.layout,
        actualPrintW: imposition.actualPrintW,
        actualPrintH: imposition.actualPrintH,
        numCuttableSheets,
        cuttableSheetLayout,
        cutSheetW: pressW,
        cutSheetH: pressH,
        cutSheetSize: `${pressW.toFixed(2)} x ${pressH.toFixed(2)}`,
        printableArea: `${printableArea.w.toFixed(2)} x ${printableArea.h.toFixed(2)}`,
        clicks,
        productsPerSheet,
        paperCostPerProduct,
        blankPaperCostPerProduct,
        printCostPerProduct,
        laminationCostPerProduct: lamination.costPerProduct,
        laminationWarning: lamination.warning,
        costPerProduct,
        debug: {
            paperCostPerSheet,
            blankPaperCostPerSheet,
            sheetsPerSet,
            blanksPerSet,
            printCostPerSheet,
            laminationCostPerSheet: lamination.costPerSheet,
            totalCostPerSheet,
            costPerProduct,
        },
        largeSheetW: largeSheet.w,
        largeSheetH: largeSheet.h,
        isDecal: false,
        isCustom: isCustom,
    });
}

// Decal materials (pricingModel='sqm') — tính theo m²
export function calculateDecalOptions(
    params,
    selectedPaper,
    productWithBleedW,
    productWithBleedH,
    allResults,
    spacing,
    isDigitalCutting,
    config
) {
    const decalWidths = [32.2, 33.0];
    const pricePerSqm = selectedPaper.pricePerSqm;

    for (const printerKey in config.PRINTER_CONFIG) {
        const printer = config.PRINTER_CONFIG[printerKey];
        for (const pressW of decalWidths) {
            if (pressW > printer.maxW) continue;
            const decalSheets =
                Array.isArray(config.DECAL_SHEET_SIZES) && config.DECAL_SHEET_SIZES.length > 0
                    ? config.DECAL_SHEET_SIZES
                    : config.COMMON_SHEET_SIZES;
            for (const commonSheet of decalSheets) {
                const pressH = commonSheet.h;
                if (pressH > printer.maxH) continue;

                const clickPrice =
                    printer.prices[params.printColorMode] || printer.prices['4color'];
                if (!clickPrice) continue;
                const printableArea = getPrintableArea(
                    pressW,
                    pressH,
                    printer,
                    isDigitalCutting,
                    config,
                    false
                );
                const imposition = calculateImposition(
                    printableArea.w,
                    printableArea.h,
                    productWithBleedW,
                    productWithBleedH,
                    spacing
                );
                const productsPerSheet = imposition.total;
                if (productsPerSheet === 0) continue;
                const clicks = getClicks(pressH, printer);
                if (clicks === Infinity) continue;
                const sheetAreaM2 = (pressW * pressH) / 10000;
                const paperCostPerSheet = sheetAreaM2 * pricePerSqm;
                const printCostPerSheet = clicks * clickPrice * params.printSides;
                const lamination = calculateLamination(
                    pressH,
                    imposition.actualPrintW,
                    productsPerSheet,
                    params.laminationType,
                    config,
                    params.laminationFilm
                );
                const totalCostPerSheet =
                    paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;
                const costPerProduct =
                    productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
                const paperCostPerProduct =
                    productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
                const printCostPerProduct =
                    productsPerSheet > 0 ? printCostPerSheet / productsPerSheet : Infinity;
                allResults.push({
                    printer,
                    largeSheetName: `Decal (m²)`,
                    layoutDesc: imposition.layout,
                    actualPrintW: imposition.actualPrintW,
                    actualPrintH: imposition.actualPrintH,
                    numCuttableSheets: 'N/A',
                    cutSheetW: pressW,
                    cutSheetH: pressH,
                    // Hệ số quy đổi trang A4 CHO GIÁ BÁO KHÁCH — tra theo ĐÚNG máy đang xét
                    // (printer.customerA4Tiers, admin tự chỉnh riêng từng máy trong Cài Đặt),
                    // fallback về số nhập ở "Khổ Decal Có Sẵn Tại Kho" nếu máy chưa cấu hình.
                    // Tách biệt hoàn toàn với "clicks" (chỉ dùng tính GIÁ VỐN ở
                    // printCostPerSheet bên dưới) — 2 máy có thể ra hệ số giá khách khác nhau
                    // dù cùng 1 khổ giấy.
                    a4Factor: getCustomerA4Factor(pressH, printer) ?? commonSheet.a4Factor,
                    cutSheetSize: `${pressW.toFixed(2)} x ${pressH.toFixed(2)}`,
                    printableArea: `${printableArea.w.toFixed(2)} x ${printableArea.h.toFixed(2)}`,
                    clicks,
                    productsPerSheet,
                    paperCostPerProduct,
                    printCostPerProduct,
                    laminationCostPerProduct: lamination.costPerProduct,
                    laminationWarning: lamination.warning,
                    costPerProduct,
                    debug: {
                        paperCostPerSheet,
                        printCostPerSheet,
                        laminationCostPerSheet: lamination.costPerSheet,
                        totalCostPerSheet,
                        costPerProduct,
                    },
                    largeSheetW: pressW,
                    largeSheetH: pressH,
                    isDecal: true,
                    isCustom: false,
                });
            }
        }
    }
}

// Per-sheet papers (pricingModel='per_sheet' — e.g. Decal xi bạc fixed 33×48)
export function calculatePerSheetOptions(
    params,
    selectedPaper,
    productWithBleedW,
    productWithBleedH,
    allResults,
    spacing,
    isDigitalCutting,
    config
) {
    // Một giấy khổ cố định có thể có NHIỀU khổ, mỗi khổ một giá (33×48 = 5.500đ/tờ,
    // 33×64 = 7.000đ/tờ…). Thử HẾT rồi để bảng xếp hạng ở App.jsx chọn rẻ nhất — đúng
    // cách giấy ram đã làm với COMMON_SHEET_SIZES. Giấy cũ chỉ có cặp
    // { sheetSize, sheetPrice } ⇒ perSheetVariants trả đúng 1 khổ ⇒ giá không đổi.
    //
    // KHÔNG thử khổ XOAY (48×33) như processSheet làm cho giấy ram: tờ khổ cố định là tờ
    // xưởng MUA SẴN, nạp máy một chiều; và mọi khổ thật đều có rộng ≈ 33 = maxW của cả 2
    // máy nên bản xoay bị loại ngay ở dòng maxW bên dưới.
    for (const variant of perSheetVariants(selectedPaper)) {
        const pressW = variant.w;
        const pressH = variant.h;
        const paperCostPerSheet = variant.price;

        for (const printerKey in config.PRINTER_CONFIG) {
            const printer = config.PRINTER_CONFIG[printerKey];
            if (pressW > printer.maxW || pressH > printer.maxH) continue;
            const clickPrice = printer.prices[params.printColorMode] || printer.prices['4color'];
            if (!clickPrice) continue;
            const printableArea = getPrintableArea(
                pressW,
                pressH,
                printer,
                isDigitalCutting,
                config,
                false
            );
            const imposition = calculateImposition(
                printableArea.w,
                printableArea.h,
                productWithBleedW,
                productWithBleedH,
                spacing
            );
            const productsPerSheet = imposition.total;
            if (productsPerSheet === 0) continue;
            const clicks = getClicks(pressH, printer);
            if (clicks === Infinity) continue;
            const printCostPerSheet = clicks * clickPrice * params.printSides;
            const lamination = calculateLamination(
                pressH,
                imposition.actualPrintW,
                productsPerSheet,
                params.laminationType,
                config,
                params.laminationFilm
            );
            const totalCostPerSheet =
                paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;
            const costPerProduct =
                productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
            const paperCostPerProduct =
                productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
            const printCostPerProduct =
                productsPerSheet > 0 ? printCostPerSheet / productsPerSheet : Infinity;
            allResults.push({
                printer,
                largeSheetName: `Tờ ${pressW}x${pressH}`,
                layoutDesc: imposition.layout,
                actualPrintW: imposition.actualPrintW,
                actualPrintH: imposition.actualPrintH,
                numCuttableSheets: 1,
                // Khổ cố định, không cắt ra từ tờ lớn nên không có sơ đồ cắt.
                // Dùng [] chứ KHÔNG dùng null: LargeSheetVisualizer nhận null sẽ vỡ
                // (default param chỉ kích hoạt với undefined). Giống nhánh decal cuộn.
                cuttableSheetLayout: [],
                cutSheetW: pressW,
                cutSheetH: pressH,
                cutSheetSize: `${pressW.toFixed(1)} x ${pressH.toFixed(1)}`,
                printableArea: `${printableArea.w.toFixed(2)} x ${printableArea.h.toFixed(2)}`,
                clicks,
                productsPerSheet,
                paperCostPerProduct,
                printCostPerProduct,
                laminationCostPerProduct: lamination.costPerProduct,
                laminationWarning: lamination.warning,
                costPerProduct,
                debug: {
                    paperCostPerSheet,
                    printCostPerSheet,
                    laminationCostPerSheet: lamination.costPerSheet,
                    totalCostPerSheet,
                    costPerProduct,
                },
                largeSheetW: pressW,
                largeSheetH: pressH,
                isDecal: true,
                isCustom: false,
            });
        }
    }
}

// Paper với pricingModel='ream' hoặc 'custom' (mainstream — C150-C300, F250-F300, B300, Ivory, mỹ thuật)
export function calculatePaperOptions(
    params,
    selectedPaper,
    productWithBleedW,
    productWithBleedH,
    allResults,
    spacing,
    isDigitalCutting,
    config
) {
    let largeSheet;
    const isArtPaper = selectedPaper.pricingModel === 'custom';
    const sheetOptions = isArtPaper
        ? config.ART_PAPER_LARGE_SHEET_SIZES
        : config.STANDARD_LARGE_SHEET_SIZES;
    const selectedSheetData = sheetOptions[params.largeSheetSelector];

    if (!selectedSheetData) return;

    if (selectedSheetData.w === 'custom') {
        if (
            isNaN(params.customSheetW) ||
            isNaN(params.customSheetH) ||
            params.customSheetW <= 0 ||
            params.customSheetH <= 0
        )
            return;
        largeSheet = {
            name: `Tùy chọn ${params.customSheetW}x${params.customSheetH} cm`,
            w: params.customSheetW,
            h: params.customSheetH,
        };
    } else {
        largeSheet = selectedSheetData;
    }

    // Công thức đã chuyển sang engine/paper.js để dùng chung với giấy lót/giấy giữa
    // của thành phẩm bồi. null = giá không hợp lệ → bỏ qua phương án này (như cũ).
    const largeSheetPrice = calcLargeSheetPrice(
        selectedPaper,
        largeSheet,
        config,
        params.artPaperPrice
    );
    if (largeSheetPrice == null) return;

    const isLargeProduct = productWithBleedW > 48 || productWithBleedH > 48;
    let sheetsToProcess = [];

    if (
        isLargeProduct &&
        !isArtPaper &&
        !selectedPaper.name.toLowerCase().includes('decal') &&
        selectedPaper.pricingModel !== 'per_sheet'
    ) {
        const width_margin = config.PRINTABLE_AREA_CONFIG.custom_width_margin;
        const height_margin = config.PRINTABLE_AREA_CONFIG.custom_height_margin;
        const printerConfig = Object.values(config.PRINTER_CONFIG)[0];
        const pressW_standard = printerConfig ? printerConfig.maxW - width_margin : 32.2;
        const pressH_max = printerConfig ? printerConfig.maxH : 120.0;

        const printable_w = pressW_standard;

        if (productWithBleedW <= printable_w && productWithBleedH + height_margin <= pressH_max) {
            let custom_w = pressW_standard + width_margin;
            let custom_h = productWithBleedH + height_margin;
            sheetsToProcess.push({ w: custom_w, h: custom_h, isCustom: true });
        }

        if (productWithBleedH <= printable_w && productWithBleedW + height_margin <= pressH_max) {
            let custom_w = pressW_standard + width_margin;
            let custom_h = productWithBleedW + height_margin;
            if (
                !sheetsToProcess.some(
                    (s) => Math.abs(s.w - custom_w) < 0.01 && Math.abs(s.h - custom_h) < 0.01
                )
            ) {
                sheetsToProcess.push({ w: custom_w, h: custom_h, isCustom: true });
            }
        }
    } else {
        config.COMMON_SHEET_SIZES.forEach((sheet) => {
            sheetsToProcess.push({ w: sheet.w, h: sheet.h, isCustom: false });
        });
    }

    for (const printerKey in config.PRINTER_CONFIG) {
        const printer = config.PRINTER_CONFIG[printerKey];
        sheetsToProcess.forEach((sheet) => {
            processSheet(
                sheet.w,
                sheet.h,
                largeSheet,
                printer,
                params,
                productWithBleedW,
                productWithBleedH,
                allResults,
                largeSheetPrice,
                spacing,
                isDigitalCutting,
                config,
                sheet.isCustom
            );
            if (sheet.w !== sheet.h && !sheet.isCustom) {
                processSheet(
                    sheet.h,
                    sheet.w,
                    largeSheet,
                    printer,
                    params,
                    productWithBleedW,
                    productWithBleedH,
                    allResults,
                    largeSheetPrice,
                    spacing,
                    isDigitalCutting,
                    config,
                    sheet.isCustom
                );
            }
        });
    }
}
