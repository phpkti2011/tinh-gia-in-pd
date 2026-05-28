function calculateFormexCost(totalArea, formexTypeKey, config) {
    const formexOption = config.FORMEX_OPTIONS[formexTypeKey];
    if (!formexOption || formexOption.price === 0) return 0;
    const basePrice = formexOption.price;
    let discount = 0;
    for (const tier of config.FORMEX_DISCOUNT_TIERS) {
        if (totalArea >= tier.minArea && totalArea < tier.maxArea) {
            discount = tier.discount;
            break;
        }
    }
    return totalArea * basePrice * (1 - discount);
}

function calculateFinishingCost(totalArea, params, config) {
    const fp = config.FINISHING_PRICES;
    let cost = 0;
    const parts = [];
    if (params.edgeTaping) {
        const tapingCost = Math.max(totalArea * fp.edgeTapingPricePerSqm, config.MIN_EDGE_TAPING_PRICE || 0);
        cost += tapingCost;
        parts.push(`Dán biên: ${tapingCost.toLocaleString()}đ`);
    }
    if (params.grommetsCheck && params.grommetsCount > 0) {
        const grommetCost = Math.max(params.grommetsCount * fp.grommetPricePerPiece, config.MIN_GROMMET_PRICE || 0);
        cost += grommetCost;
        parts.push(`Đóng ${params.grommetsCount} khoen: ${grommetCost.toLocaleString()}đ`);
    }
    if (params.dieCutting) {
        const dc = fp.dieCutting;
        let dieCost = 0;
        if (totalArea <= dc.tier1LimitSqm) dieCost = totalArea * dc.tier1PricePerSqm;
        else if (totalArea <= dc.tier2LimitSqm) dieCost = dc.tier1LimitSqm * dc.tier1PricePerSqm + (totalArea - dc.tier1LimitSqm) * dc.tier2PricePerSqm;
        else dieCost = dc.tier1LimitSqm * dc.tier1PricePerSqm + (dc.tier2LimitSqm - dc.tier1LimitSqm) * dc.tier2PricePerSqm + (totalArea - dc.tier2LimitSqm) * dc.tier3PricePerSqm;
        cost += dieCost;
        parts.push(`Bế: ${dieCost.toLocaleString()}đ`);
    }
    return { cost, desc: parts.join(', ') };
}

// Tính giá 1 tấm trên 1 khổ cuộn cụ thể, trả về chi tiết
function calcItemOnRoll(printW, printH, rollOption, laminationTypeKey, config) {
    const printedArea = printW * printH;
    const unprintedArea = (rollOption.width - printW) * printH;
    const printCost = Math.max(printedArea * rollOption.printPrice, config.MIN_PRINT_PRICE || 0);
    const materialWasteCost = unprintedArea * rollOption.materialPrice;
    let totalCost = printCost + materialWasteCost;
    let laminationChoice = null;
    if (laminationTypeKey && laminationTypeKey !== 'none') {
        const lamType = config.LAMINATION_TYPES[laminationTypeKey];
        if (lamType) {
            const validLam = lamType.options.filter(lo => lo.width >= printW).sort((a, b) => a.price - b.price);
            if (validLam.length > 0) {
                const lo = validLam[0];
                totalCost += Math.max(printedArea * lo.price, config.MIN_LAMINATION_PRICE || 0);
                laminationChoice = { width: lo.width, price: lo.price };
            }
        }
    }
    return { totalCost, printedArea, unprintedArea, laminationChoice };
}

// Tối ưu 1 item (W, H) trên 1 khổ cuộn: thử cả 2 hướng xoay
function optimizeItemOnRoll(wM, hM, rollOption, laminationTypeKey, config) {
    let bestResult = null;
    let bestRotated = false;
    // Hướng gốc: W nằm ngang trên cuộn
    if (wM <= rollOption.width) {
        const r = calcItemOnRoll(wM, hM, rollOption, laminationTypeKey, config);
        bestResult = r;
        bestRotated = false;
    }
    // Hướng xoay: H nằm ngang trên cuộn
    if (hM <= rollOption.width) {
        const r = calcItemOnRoll(hM, wM, rollOption, laminationTypeKey, config);
        if (!bestResult || r.totalCost < bestResult.totalCost) {
            bestResult = r;
            bestRotated = true;
        }
    }
    if (!bestResult) return null;
    return {
        ...bestResult,
        rotated: bestRotated,
        printWidth: bestRotated ? hM : wM,
        printHeight: bestRotated ? wM : hM,
    };
}

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
