// Large-print engine — main pricing orchestrator.
//
// Tách từ src/utils/largePrintCalculator.js ở TASK-0016.
// Pure function — không React/DOM/IO.
//
// Pipeline:
//   1. items = params.items || [single item từ width/height/quantity]
//   2. grandTotalArea = tổng (w/100 × h/100 × qty) cho tất cả items (mét²)
//   3. formexCost = calculateFormexCost(grandTotalArea, formexTypeKey)
//   4. finishing = calculateFinishingCost(grandTotalArea, params)
//   5. standeeCost = lookup từ STANDEE_OPTIONS bằng standeeKey
//   6. Loop MATERIAL_TYPES[materialTypeKey].options (các khổ cuộn):
//      - Tối ưu từng item (thử 2 hướng xoay, chọn rẻ hơn)
//      - Cộng tất cả items → rollTotalCost
//      - Cộng formex/finishing/standee → totalWithExtras
//      - Pick roll có totalWithExtras NHỎ NHẤT
//   7. Trả về object 13 fields hoặc null

import { optimizeItemOnRoll } from './layout.js';
import { calculateFormexCost, calculateFinishingCost } from './finishing.js';

export function calculateLargePrint(params, config) {
    const { materialTypeKey, laminationTypeKey, formexTypeKey } = params;
    const items = params.items || [{ width: params.width, height: params.height, quantity: parseInt(params.quantity, 10) || 1 }];

    // Tính tổng diện tích tất cả tấm (cho formex, finishing)
    let grandTotalArea = 0;
    for (const item of items) {
        const w = item.width / 100, h = item.height / 100;
        grandTotalArea += w * h * (item.quantity || 1);
    }

    const formexCost = calculateFormexCost(grandTotalArea, formexTypeKey, config);
    const finishing = calculateFinishingCost(grandTotalArea, params, config);

    // Standee
    let standeeCost = 0, standeeName = '';
    if (params.standeeKey && params.standeeKey !== 'none' && config.STANDEE_OPTIONS) {
        const standee = config.STANDEE_OPTIONS.find(s => s.key === params.standeeKey);
        if (standee) { standeeCost = standee.price; standeeName = standee.name; }
    }

    const materialType = config.MATERIAL_TYPES[materialTypeKey];
    if (!materialType) return null;

    // Thử từng khổ cuộn, tối ưu tất cả items
    let bestRollResult = null;

    for (const rollOption of materialType.options) {
        let rollTotalCost = 0;
        let rollItemDetails = [];
        let allFit = true;

        for (const item of items) {
            const wM = item.width / 100, hM = item.height / 100;
            const qty = item.quantity || 1;
            const optimized = optimizeItemOnRoll(wM, hM, rollOption, laminationTypeKey, config);
            if (!optimized) { allFit = false; break; }

            const itemTotal = optimized.totalCost * qty;
            rollTotalCost += itemTotal;
            rollItemDetails.push({
                originalW: item.width,
                originalH: item.height,
                quantity: qty,
                rotated: optimized.rotated,
                printWidth: optimized.printWidth,
                printHeight: optimized.printHeight,
                printedArea: optimized.printedArea,
                unprintedArea: optimized.unprintedArea,
                unitCost: optimized.totalCost,
                totalCost: itemTotal,
                laminationChoice: optimized.laminationChoice,
            });
        }

        if (!allFit) continue;

        // Cộng formex, finishing, standee
        const totalWithExtras = rollTotalCost + formexCost + finishing.cost + standeeCost;

        if (!bestRollResult || totalWithExtras < bestRollResult.totalCost) {
            bestRollResult = {
                totalCost: totalWithExtras,
                rollWidth: rollOption.width,
                rollPrintPrice: rollOption.printPrice,
                rollMaterialPrice: rollOption.materialPrice,
                itemDetails: rollItemDetails,
            };
        }
    }

    if (!bestRollResult) return null;

    // Tính tổng diện tích
    let totalPrintedArea = 0, totalUnprintedArea = 0, totalPanels = 0;
    for (const d of bestRollResult.itemDetails) {
        totalPrintedArea += d.printedArea * d.quantity;
        totalUnprintedArea += d.unprintedArea * d.quantity;
        totalPanels += d.quantity;
    }

    return {
        totalCost: bestRollResult.totalCost,
        rollWidth: bestRollResult.rollWidth,
        itemDetails: bestRollResult.itemDetails,
        totalPanels,
        formexCost,
        standeeCost,
        standeeName,
        finishingCost: finishing.cost,
        finishingDesc: finishing.desc,
        printedArea: totalPrintedArea,
        unprintedArea: totalUnprintedArea,
        materialChoice: { width: bestRollResult.rollWidth, printPrice: bestRollResult.rollPrintPrice, materialPrice: bestRollResult.rollMaterialPrice },
        laminationChoice: bestRollResult.itemDetails[0]?.laminationChoice || null,
    };
}
