// Large-print engine — per-item per-roll layout & cost computation.
//
// Tách từ src/utils/largePrintCalculator.js ở TASK-0016.
// KHÔNG đổi behavior — pure functions, không React/DOM/IO.
//
// Internal helpers: được export để pricing.js (cùng module) import,
// nhưng KHÔNG re-export ra index.js (giữ private contract như bản gốc).

// Tính giá 1 tấm trên 1 khổ cuộn cụ thể, trả về chi tiết
export function calcItemOnRoll(printW, printH, rollOption, laminationTypeKey, config) {
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
export function optimizeItemOnRoll(wM, hM, rollOption, laminationTypeKey, config) {
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
