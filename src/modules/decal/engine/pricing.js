// Decal engine — pricing helpers + public pricing API.
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004.
// TASK-0006: calculateSingleStickerPrice đã align với Excel reference
//   - base = progressive(ceil) + (ceil − raw) × priceOfTierContaining(ceil)  (Formula A)
//   - lam  = laminationCost × raw  (raw sheet count, không ceil)
//   - decalExtra: GIỮ ceil (chưa có Excel reference cho Decal nhựa — fix sau)
// calculateSheetPrice CHƯA fix — vẫn dùng integer ceil như cũ.
// Xem docs/pricing-rules/decal-reference-cases.md cho chi tiết.
//
// Pure functions: chỉ phụ thuộc input + config object.

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Progressive pricing — each tier is priced independently
// (NOT cumulative total; each range has its own per-sheet price).
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

// Get demi cut surcharge percent
function getDemiCutSurchargePercent(stickerCount, config) {
    for (const tier of config.demiCutSurchargeTiers) {
        if (stickerCount <= tier.upTo) return tier.percent;
    }
    return config.demiCutSurchargeTiers[config.demiCutSurchargeTiers.length - 1]?.percent || 0;
}

// TASK-0006: Tìm giá tier mà một sheet count rơi vào (= tier marginal).
// Dùng cho Formula A: cộng fractional adjustment ở tier hiện đang ở.
function findTierPriceAt(sheetCount, config) {
    for (const tier of config.progressiveTiers) {
        if (sheetCount <= tier.upTo) return tier.price;
    }
    return config.progressiveTiers[config.progressiveTiers.length - 1]?.price || 0;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Calculate price for single sticker mode
// TASK-0006: align với Excel reference cho Case C (19.500 tem 100×70).
//   base = progressive(ceil) + (ceil − raw) × priceOfTierContaining(ceil)
//   lam  = laminationCost × raw
//   decalExtra = decalCost × ceil  (chưa có Excel ref cho Decal nhựa — fix sau)
// Khi raw integer (ceil = raw): fractional adjustment = 0 → identical với old.
export function calculateSingleStickerPrice(quantity, decalType, isLaminated, stickersPerSheet, sheetW, sheetH, config) {
    if (stickersPerSheet <= 0) return 0;
    const rawSheets = quantity / stickersPerSheet;
    const ceilSheets = Math.ceil(rawSheets);
    const multiplier = getPriceMultiplier(sheetW, sheetH, config);

    // Formula A: progressive(ceil) + (ceil − raw) × marginal tier price.
    const progressiveBase = calculateProgressivePrice(ceilSheets, config);
    const fractionalAdjustment = (ceilSheets - rawSheets) * findTierPriceAt(ceilSheets, config);
    const baseCost = progressiveBase + fractionalAdjustment;
    const scaled = baseCost * multiplier;

    // decalExtra GIỮ ceil — chờ Excel ref cho Decal nhựa (xem decal-reference-cases.md).
    const decalExtra = (config.decalCosts[decalType] || 0) * ceilSheets;

    // lam dùng RAW theo Excel ref: 2437,5 × 500 = 1.218.750 (Case C).
    const lamCost = isLaminated ? config.laminationCost * rawSheets : 0;

    return scaled + decalExtra + lamCost;
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
