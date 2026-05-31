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
    getPrintableArea,
    calculateImposition,
    calculateMaxCuttableSheetsLayout,
} from './layout.js';
import { calculateLamination } from './finishing.js';

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

    const paperCostPerSheet =
        numCuttableSheets > 0 ? largeSheetPrice / numCuttableSheets : Infinity;
    const printCostPerSheet = clicks * clickPrice * params.printSides;
    const lamination = calculateLamination(
        pressH,
        imposition.actualPrintW,
        productsPerSheet,
        params.laminationType,
        config
    );
    const totalCostPerSheet = paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;

    const costPerProduct = productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
    const paperCostPerProduct =
        productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
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
    const printersToUse = Object.entries(config.PRINTER_CONFIG)
        .filter(([_key, printer]) => printer.name === 'C2060')
        .reduce((obj, [key, printer]) => {
            obj[key] = printer;
            return obj;
        }, {});

    for (const printerKey in printersToUse) {
        const printer = printersToUse[printerKey];
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
                    config
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
    if (
        !selectedPaper.sheetSize ||
        typeof selectedPaper.sheetSize.w !== 'number' ||
        typeof selectedPaper.sheetSize.h !== 'number'
    )
        return;
    const pressW = selectedPaper.sheetSize.w;
    const pressH = selectedPaper.sheetSize.h;
    const paperCostPerSheet = selectedPaper.sheetPrice;
    const printersToUse = Object.entries(config.PRINTER_CONFIG)
        .filter(([_key, printer]) => printer.name === 'C2060')
        .reduce((obj, [key, printer]) => {
            obj[key] = printer;
            return obj;
        }, {});

    for (const printerKey in printersToUse) {
        const printer = printersToUse[printerKey];
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
            config
        );
        const totalCostPerSheet = paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;
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
            cuttableSheetLayout: null,
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

    let largeSheetPrice;
    if (isArtPaper) {
        if (isNaN(params.artPaperPrice) || params.artPaperPrice < 0) return;
        largeSheetPrice = params.artPaperPrice;
    } else {
        if (isNaN(selectedPaper.pricePerReam) || selectedPaper.pricePerReam <= 0) return;
        const pricePerSheet65x86 = selectedPaper.pricePerReam / 500;
        const baseArea =
            config.STANDARD_LARGE_SHEET_SIZES[0].w * config.STANDARD_LARGE_SHEET_SIZES[0].h;
        const targetArea = largeSheet.w * largeSheet.h;
        largeSheetPrice = baseArea > 0 ? (pricePerSheet65x86 / baseArea) * targetArea : 0;
    }

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
