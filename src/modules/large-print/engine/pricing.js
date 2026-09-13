// Large-print engine — main pricing orchestrator.
//
// Tách từ src/utils/largePrintCalculator.js ở TASK-0016.
// Pure function — không React/DOM/IO.
//
// Pipeline:
//   1. items = params.items || [single item từ width/height/quantity]
//   2. grandTotalArea = tổng (w/100 × h/100 × qty) cho tất cả items (mét²)
//   3. materialType + blocked = thành phẩm vật liệu này KHÔNG làm được
//      → effLaminationKey / effFormexKey / effParams
//   4. formexCost = calculateFormexCost(grandTotalArea, effFormexKey)
//   5. finishing = calculateFinishingCost(grandTotalArea, effParams)
//   6. standeeCost = lookup từ STANDEE_OPTIONS bằng standeeKey
//   7. Loop MATERIAL_TYPES[materialTypeKey].options (các khổ cuộn):
//      - Tối ưu từng item (thử 2 hướng xoay, chọn rẻ hơn)
//      - Cộng tất cả items → rollTotalCost
//      - Cộng formex/finishing/standee → totalWithExtras
//      - Pick roll có totalWithExtras NHỎ NHẤT
//   8. Trả về object 14 fields hoặc null

import { optimizeItemOnRoll } from './layout.js';
import { calculateFormexCost, calculateFinishingCost } from './finishing.js';
// Import thẳng file, KHÔNG qua config/index.js — barrel kéo cả defaultConfig.js
// vào bundle engine trong khi engine vốn nhận config qua tham số.
import { getBlockedFinishing } from '../config/finishingOps.js';

export function calculateLargePrint(params, config) {
    const { materialTypeKey, laminationTypeKey, formexTypeKey } = params;
    const items = params.items || [
        {
            width: params.width,
            height: params.height,
            quantity: parseInt(params.quantity, 10) || 1,
        },
    ];

    // Tính tổng diện tích tất cả tấm (cho formex, finishing)
    let grandTotalArea = 0;
    for (const item of items) {
        const w = item.width / 100,
            h = item.height / 100;
        grandTotalArea += w * h * (item.quantity || 1);
    }

    // Giảm % ĐƠN GIÁ IN theo bậc tổng diện tích (single-band, giống chiết khấu Formex).
    let printDiscount = 0;
    for (const tier of config.PRINT_DISCOUNT_TIERS || []) {
        if (grandTotalArea >= tier.minArea && grandTotalArea < tier.maxArea) {
            printDiscount = tier.discount || 0;
            break;
        }
    }

    // Vật liệu phải resolve TRƯỚC formex/finishing vì luật "thành phẩm theo vật
    // liệu" (vd bạt Hiflex không cán màng được) quyết định input của 2 bước đó.
    const materialType = config.MATERIAL_TYPES[materialTypeKey];
    if (!materialType) return null;

    // Engine là nơi chốt cuối: params cũ KHÔNG bị xoá (user đổi vật liệu qua lại
    // là khôi phục lựa chọn), chỉ bị bỏ qua khi tính tiền. UI chỉ khoá control
    // cho dễ hiểu — giá vẫn đúng kể cả khi params còn sót lựa chọn cũ.
    const blocked = getBlockedFinishing(config, materialTypeKey);
    const effLaminationKey = blocked.has('lamination') ? 'none' : laminationTypeKey;
    const effFormexKey = blocked.has('formex') ? 'none' : formexTypeKey;
    const effParams = {
        ...params,
        edgeTaping: params.edgeTaping && !blocked.has('edgeTaping'),
        grommetsCheck: params.grommetsCheck && !blocked.has('grommets'),
        dieCutting: params.dieCutting && !blocked.has('dieCutting'),
    };

    const formexCost = calculateFormexCost(grandTotalArea, effFormexKey, config);
    const finishing = calculateFinishingCost(grandTotalArea, effParams, config);

    // Standee
    let standeeCost = 0,
        standeeName = '';
    if (params.standeeKey && params.standeeKey !== 'none' && config.STANDEE_OPTIONS) {
        const standee = config.STANDEE_OPTIONS.find((s) => s.key === params.standeeKey);
        if (standee) {
            standeeCost = standee.price;
            standeeName = standee.name;
        }
    }

    // Thử từng khổ cuộn, tối ưu tất cả items
    let bestRollResult = null;

    for (const rollOption of materialType.options) {
        let rollTotalCost = 0;
        let rollItemDetails = [];
        let allFit = true;

        for (const item of items) {
            const wM = item.width / 100,
                hM = item.height / 100;
            const qty = item.quantity || 1;
            const optimized = optimizeItemOnRoll(
                wM,
                hM,
                rollOption,
                effLaminationKey,
                config,
                printDiscount
            );
            if (!optimized) {
                allFit = false;
                break;
            }

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
    let totalPrintedArea = 0,
        totalUnprintedArea = 0,
        totalPanels = 0;
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
        printDiscount,
        standeeCost,
        standeeName,
        finishingCost: finishing.cost,
        finishingDesc: finishing.desc,
        printedArea: totalPrintedArea,
        unprintedArea: totalUnprintedArea,
        materialChoice: {
            width: bestRollResult.rollWidth,
            printPrice: bestRollResult.rollPrintPrice,
            materialPrice: bestRollResult.rollMaterialPrice,
        },
        laminationChoice: bestRollResult.itemDetails[0]?.laminationChoice || null,
    };
}
