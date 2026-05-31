// Small-print engine — customer-facing quote (giá báo khách).
//
// Tách từ src/utils/customerQuote.js ở TASK-0009.
// KHÔNG đổi behavior — nhận bestOption + finishing customer prices,
// quy đổi sang trang A4 + áp CUSTOMER_PRICE_TIERS.

import { calculateVariableDataCost, calculatePrintContentSurcharge } from './pricing.js';

export function calculateCustomerQuote(bestOption, params, finishingCustomerPrices, dieCuttingCustomerPrice, foilResult, config) {
    const { productQuantity: totalQuantity, printSides, laminationType, printContents, variableData } = params;

    const pressH = bestOption.cutSheetH;

    const A4_REFERENCE_HEIGHT = 21.2;
    const A4_CONVERSION_BASE_HEIGHT = 21.0;

    let conversionFactor;
    const h_str = pressH.toFixed(1);

    if (config.A4_CONVERSION_RATES[h_str]) {
        conversionFactor = config.A4_CONVERSION_RATES[h_str];
    }
     else if (pressH > 48) {
         let a4PerSheet_1_side = 0;
         if (pressH <= 76) a4PerSheet_1_side = 3;
         else if (pressH <= 91) a4PerSheet_1_side = 4;
         else a4PerSheet_1_side = 5;
         conversionFactor = a4PerSheet_1_side;
     }
    else if (pressH > A4_REFERENCE_HEIGHT) {
        conversionFactor = pressH / A4_CONVERSION_BASE_HEIGHT;
    }
    else {
         return { error: `Lỗi cấu hình: Không có hệ số A4 cho khổ ${bestOption.cutSheetSize}` };
    }

    const numCutSheets = typeof bestOption.numCuttableSheets === 'number' && bestOption.numCuttableSheets > 0 ? bestOption.numCuttableSheets : 1;
    const totalPrintSheets = Math.ceil(totalQuantity / bestOption.productsPerSheet);

    let totalA4Pages = 0;
    let unitPriceText = 'Lỗi';
    let totalPrintCost = 0;
    let totalLaminationCost = 0;

    if (pressH > 48) {
         totalA4Pages = conversionFactor * totalPrintSheets * printSides;
         const tier = config.CUSTOMER_PRICE_TIERS.find(t => totalA4Pages >= t.min && totalA4Pages <= t.max);
         if (tier) {
             const hasLam = laminationType === 'laminate_1' || laminationType === 'laminate_2';
             const lamSides = laminationType === 'laminate_2' ? 2 : 1;
             if (tier.type === 'per_page') {
                totalPrintCost = totalA4Pages * tier.print;
                totalLaminationCost = hasLam ? totalA4Pages * tier.laminate * lamSides : 0;
                unitPriceText = `${tier.print.toLocaleString('vi-VN')}đ/trang`;
             } else {
                 totalPrintCost = tier.print;
                 totalLaminationCost = hasLam ? tier.laminate * lamSides : 0;
                 unitPriceText = `Trọn gói`;
             }
         } else {
             return { error: `Lỗi cấu hình: Không tìm thấy mức giá cho ${totalA4Pages} trang A4` };
         }
    } else {
         let totalA4PagesRaw = totalPrintSheets * conversionFactor * printSides;
         totalA4Pages = Math.ceil(totalA4PagesRaw);

         if (printSides == 2 && totalA4Pages % 2 !== 0) {
             totalA4Pages++;
         }

         const tier = config.CUSTOMER_PRICE_TIERS.find(t => totalA4Pages >= t.min && totalA4Pages <= t.max);
         if (!tier) {
             return { error: `Không tìm thấy mức giá cho ${totalA4Pages} trang A4` };
         }

         const hasLam2 = laminationType === 'laminate_1' || laminationType === 'laminate_2';
         const lamSides2 = laminationType === 'laminate_2' ? 2 : 1;
         if (tier.type === 'per_page') {
             totalPrintCost = totalA4Pages * tier.print;
             totalLaminationCost = hasLam2 ? totalA4Pages * tier.laminate * lamSides2 : 0;
             unitPriceText = `${tier.print.toLocaleString('vi-VN')}đ/trang`;
         } else {
             totalPrintCost = tier.print;
             totalLaminationCost = hasLam2 ? tier.laminate * lamSides2 : 0;
             unitPriceText = `Trọn gói`;
         }
    }

    const selectedPaper = (config.PAPER_STOCK_DATA || [])[params.paperType];
     if (!selectedPaper) return { error: "Loại giấy không hợp lệ." };
    const paperSurchargePerA4 = selectedPaper.customerSurcharge || 0;
    const totalPaperSurcharge = paperSurchargePerA4 * totalA4Pages;

    let totalArtPaperCustomerCost = 0;
    if(selectedPaper.pricingModel === 'custom') {
        const validNumCutSheets = (typeof numCutSheets === 'number' && numCutSheets > 0) ? numCutSheets : 1;
        const totalLargeSheetsNeeded = Math.ceil(totalPrintSheets / validNumCutSheets);
        const paperMaterialCost = totalLargeSheetsNeeded * params.artPaperPrice;
        totalArtPaperCustomerCost = paperMaterialCost + config.ART_PAPER_SURCHARGE;
    }

    const variableDataCost = variableData === 'yes' ? calculateVariableDataCost(totalQuantity, config) : 0;

    const foilStampingCost = foilResult ? foilResult.totalCost : 0;
    const baseCustomerCost = totalPrintCost + totalLaminationCost + totalArtPaperCustomerCost + totalPaperSurcharge + finishingCustomerPrices.holePunching + finishingCustomerPrices.creasing + finishingCustomerPrices.mounting + dieCuttingCustomerPrice.moldCost + dieCuttingCustomerPrice.laborCustomerPrice + variableDataCost + foilStampingCost;

    const { surcharge: customerSurcharge, reason: customerSurchargeReason } = calculatePrintContentSurcharge(baseCustomerCost, totalQuantity, printContents, config);
    const totalCustomerCost = baseCustomerCost + customerSurcharge;

    return {
        totalA4Pages: totalA4Pages.toLocaleString('vi-VN', { maximumFractionDigits: 0 }),
        unitPriceText: unitPriceText,
        totalPrintCost,
        totalLaminationCost,
        totalArtPaperCustomerCost,
        totalPaperSurcharge,
        foilStampingCost,
        customerSurcharge,
        customerSurchargeReason,
        totalCustomerCost,
        error: null
    };
}
