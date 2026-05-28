// Get printable area from sheet dimensions and margins
function getPrintableArea(sheetW, sheetH, config) {
    const mShort = config.marginShortSide;
    const mLong = config.marginLongSide;
    let pw, ph;
    if (sheetW < sheetH) { pw = sheetW - mShort; ph = sheetH - mLong; }
    else if (sheetH < sheetW) { pw = sheetW - mLong; ph = sheetH - mShort; }
    else { pw = sheetW - mShort; ph = sheetH - mLong; }
    return { w: Math.max(0, pw), h: Math.max(0, ph) };
}

// Grid layout for rectangle/oval stickers
function calculateGridLayout(itemW, itemH, areaW, areaH, gap) {
    if (itemW > areaW || itemH > areaH) return { count: 0 };
    const cols = Math.floor((areaW + gap) / (itemW + gap));
    const rows = Math.floor((areaH + gap) / (itemH + gap));
    return { count: cols * rows, cols, rows, itemW, itemH, type: 'grid' };
}

// Hexagonal layout for circle stickers
function calculateHexagonalLayout(diameter, areaW, areaH, gap) {
    const d = diameter + gap;
    const r = d / 2;
    if (diameter > areaW || diameter > areaH) return { count: 0 };
    const vertSpacing = d * Math.sqrt(3) / 2;
    if (vertSpacing === 0) return { count: 0 };
    const cols_full = Math.floor((areaW + gap) / d);
    const cols_staggered = Math.floor((areaW - r + gap) / d);
    const rows = Math.floor((areaH - diameter) / vertSpacing) + 1;
    let count1 = 0;
    if (rows > 0) count1 = Math.ceil(rows / 2) * cols_full + Math.floor(rows / 2) * cols_staggered;
    let count2 = 0;
    if (rows > 0) count2 = Math.floor(rows / 2) * cols_full + Math.ceil(rows / 2) * cols_staggered;
    const best = count1 >= count2
        ? { type: 'hexagonal', count: count1, rows, cols_full, cols_staggered, pattern: 'full_first', itemW: diameter, itemH: diameter }
        : { type: 'hexagonal', count: count2, rows, cols_full, cols_staggered, pattern: 'staggered_first', itemW: diameter, itemH: diameter };
    return best;
}

// Calculate stickers per sheet, trying both orientations
export function calculateStickersPerSheet(stickerW, stickerH, sheetW, sheetH, shape, config) {
    const pa = getPrintableArea(sheetW, sheetH, config);
    const gap = config.stickerGap;

    if (shape === 'circle') {
        const diameter = Math.max(stickerW, stickerH);
        const lv = calculateHexagonalLayout(diameter, pa.w, pa.h, gap);
        const lh = calculateHexagonalLayout(diameter, pa.h, pa.w, gap);
        return lv.count >= lh.count
            ? { ...lv, orientation: 'vertical', printableW: pa.w, printableH: pa.h }
            : { ...lh, orientation: 'horizontal', printableW: pa.w, printableH: pa.h };
    } else {
        const lv = calculateGridLayout(stickerW, stickerH, pa.w, pa.h, gap);
        const lh = calculateGridLayout(stickerH, stickerW, pa.w, pa.h, gap);
        return lv.count >= lh.count
            ? { ...lv, orientation: 'vertical', printableW: pa.w, printableH: pa.h }
            : { ...lh, orientation: 'horizontal', printableW: pa.w, printableH: pa.h };
    }
}

// Progressive pricing - each tier is priced independently (NOT cumulative total, each range has its own per-sheet price)
function calculateProgressivePrice(numSheets, config) {
    let totalCost = 0, remaining = numSheets, prevLimit = 0;
    for (const tier of config.progressiveTiers) {
        if (remaining <= 0) break;
        const tierRange = tier.upTo - prevLimit;
        const sheetsInTier = Math.min(remaining, tierRange);
        totalCost += sheetsInTier * tier.price;
        remaining -= sheetsInTier;
        prevLimit = tier.upTo;
    }
    return totalCost;
}

// Price multiplier for non-base sheet sizes
function getPriceMultiplier(sheetW, sheetH, config) {
    const baseArea = config.basePrintWidth * config.basePrintHeight;
    const currentArea = sheetW * sheetH;
    if (baseArea <= 0 || currentArea <= 0 || baseArea === currentArea) return 1;
    return (currentArea / baseArea) * config.areaConversionFactor;
}

// Calculate price for single sticker mode
export function calculateSingleStickerPrice(quantity, decalType, isLaminated, stickersPerSheet, sheetW, sheetH, config) {
    if (stickersPerSheet <= 0) return 0;
    const numSheets = Math.ceil(quantity / stickersPerSheet);
    const multiplier = getPriceMultiplier(sheetW, sheetH, config);
    const baseCost = calculateProgressivePrice(numSheets, config);
    const scaled = baseCost * multiplier;
    const decalExtra = (config.decalCosts[decalType] || 0) * numSheets;
    const lamCost = isLaminated ? config.laminationCost * numSheets : 0;
    return scaled + decalExtra + lamCost;
}

// Get demi cut surcharge percent
function getDemiCutSurchargePercent(stickerCount, config) {
    for (const tier of config.demiCutSurchargeTiers) {
        if (stickerCount <= tier.upTo) return tier.percent;
    }
    return config.demiCutSurchargeTiers[config.demiCutSurchargeTiers.length - 1]?.percent || 0;
}

// Calculate sticker sheet items per print sheet
export function calculateSheetsPerPrintSheet(sheetW, sheetH, printSheetW, printSheetH, config) {
    const pa = getPrintableArea(printSheetW, printSheetH, config);
    const gap = config.stickerGap;
    // Thử 2 hướng xoay item, vùng in cố định
    const lv = calculateGridLayout(sheetW, sheetH, pa.w, pa.h, gap);
    const lh = calculateGridLayout(sheetH, sheetW, pa.w, pa.h, gap);
    return lv.count >= lh.count
        ? { count: lv.count, orientation: 'vertical', printableW: pa.w, printableH: pa.h }
        : { count: lh.count, orientation: 'horizontal', printableW: pa.w, printableH: pa.h };
}

// Calculate price for sticker sheet mode
export function calculateSheetPrice(quantity, decalType, isLaminated, sheetsPerPrintSheet, stickersOnSheet, sheetW, sheetH, config) {
    if (sheetsPerPrintSheet <= 0) return 0;
    const numPrintSheets = Math.ceil(quantity / sheetsPerPrintSheet);
    const multiplier = getPriceMultiplier(sheetW, sheetH, config);
    const baseCost = calculateProgressivePrice(numPrintSheets, config);
    const scaled = baseCost * multiplier;
    const decalExtra = (config.decalCosts[decalType] || 0) * numPrintSheets;
    const lamCost = isLaminated ? config.laminationCost * numPrintSheets : 0;
    const totalPrintCost = scaled + decalExtra + lamCost;
    const surchargePercent = getDemiCutSurchargePercent(stickersOnSheet, config);
    return totalPrintCost * (1 + surchargePercent / 100);
}

// Generate full price table for single sticker mode
export function generateSinglePriceTable(stickersPerSheet, decalType, sheetW, sheetH, config, customQuantity) {
    const decalsToDisplay = (decalType === 'Decal giấy' || decalType === 'Decal nhựa')
        ? ['Decal giấy', 'Decal nhựa'] : [decalType];
    const quantities = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
    const rows = [];

    if (customQuantity > 0) {
        for (const dt of decalsToDisplay) {
            rows.push({ quantity: customQuantity, decalType: dt, laminated: true, price: calculateSingleStickerPrice(customQuantity, dt, true, stickersPerSheet, sheetW, sheetH, config), isCustom: true });
            rows.push({ quantity: customQuantity, decalType: dt, laminated: false, price: calculateSingleStickerPrice(customQuantity, dt, false, stickersPerSheet, sheetW, sheetH, config), isCustom: true });
        }
    }

    for (const qty of quantities) {
        for (const dt of decalsToDisplay) {
            rows.push({ quantity: qty, decalType: dt, laminated: true, price: calculateSingleStickerPrice(qty, dt, true, stickersPerSheet, sheetW, sheetH, config) });
            rows.push({ quantity: qty, decalType: dt, laminated: false, price: calculateSingleStickerPrice(qty, dt, false, stickersPerSheet, sheetW, sheetH, config) });
        }
    }
    return rows;
}

// Generate full price table for sticker sheet mode
export function generateSheetPriceTable(sheetsPerPrintSheet, stickersOnSheet, decalType, sheetW, sheetH, config, customQuantity) {
    const decalsToDisplay = (decalType === 'Decal giấy' || decalType === 'Decal nhựa')
        ? ['Decal giấy', 'Decal nhựa'] : [decalType];
    const quantities = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
    const rows = [];

    if (customQuantity > 0) {
        for (const dt of decalsToDisplay) {
            rows.push({ quantity: customQuantity, decalType: dt, laminated: true, price: calculateSheetPrice(customQuantity, dt, true, sheetsPerPrintSheet, stickersOnSheet, sheetW, sheetH, config), isCustom: true });
            rows.push({ quantity: customQuantity, decalType: dt, laminated: false, price: calculateSheetPrice(customQuantity, dt, false, sheetsPerPrintSheet, stickersOnSheet, sheetW, sheetH, config), isCustom: true });
        }
    }

    for (const qty of quantities) {
        for (const dt of decalsToDisplay) {
            rows.push({ quantity: qty, decalType: dt, laminated: true, price: calculateSheetPrice(qty, dt, true, sheetsPerPrintSheet, stickersOnSheet, sheetW, sheetH, config) });
            rows.push({ quantity: qty, decalType: dt, laminated: false, price: calculateSheetPrice(qty, dt, false, sheetsPerPrintSheet, stickersOnSheet, sheetW, sheetH, config) });
        }
    }
    return rows;
}
