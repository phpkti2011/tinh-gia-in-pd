// Decal engine — pricing helpers + public pricing API.
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004.
// TASK-DECAL-WHOLESHEET: tính NGUYÊN TỜ (ceil) cho toàn bộ (in + vật liệu + cán màng),
//   giống mô hình plugin 4.0.0 — revert Formula A (tờ lẻ) của TASK-0006.
//   Khổ giấy in khác gốc → nhân (1 + percent/100) lên TOÀN BỘ giá mỗi tờ, trong đó
//   percent lấy từ khổ khớp trong config.printSheetSizes (khổ gốc = 0%).
// Xem docs/pricing-rules/decal-reference-cases.md cho chi tiết.
//
// Pure functions: chỉ phụ thuộc input + config object.

import { findPrintSheet } from './layout.js';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Progressive pricing — each tier is priced independently
// (NOT cumulative total; each range has its own per-sheet price).
function calculateProgressivePrice(numSheets, config) {
    let totalCost = 0,
        remaining = numSheets,
        prevLimit = 0;
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

// % tăng giá của khổ giấy in khớp (so với khổ gốc). Không khớp (khổ tùy chọn) → 0%.
function getSizePercent(config, sheetW, sheetH) {
    const size = findPrintSheet(config, sheetW, sheetH);
    return size && typeof size.percent === 'number' ? size.percent : 0;
}

// Get demi cut surcharge percent
function getDemiCutSurchargePercent(stickerCount, config) {
    for (const tier of config.demiCutSurchargeTiers) {
        if (stickerCount <= tier.upTo) return tier.percent;
    }
    return config.demiCutSurchargeTiers[config.demiCutSurchargeTiers.length - 1]?.percent || 0;
}

// Áp chiết khấu % cho 1 dòng giá, chặn theo giá sàn/tờ (không giảm dưới sàn, không tăng giá gốc).
//   floorTotal = sheets × minPricePerSheet
//   final = max(base×(1−d/100), min(base, floorTotal))
//   floored = true khi mức giảm bị chặn ở sàn (d>0 và giảm thô < final).
export function applyDiscount(base, sheets, discountPercent, minPricePerSheet) {
    const d = Number(discountPercent) || 0;
    const min = Number(minPricePerSheet) || 0;
    const n = Number(sheets) || 0;
    if (d <= 0) return { price: base, floored: false };
    const floorTotal = n * min;
    const rawDiscount = base * (1 - d / 100);
    const final = Math.max(rawDiscount, Math.min(base, floorTotal));
    return { price: final, floored: rawDiscount < final - 1e-6 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Calculate price for single sticker mode — NGUYÊN TỜ (ceil) cho toàn bộ.
//   sheets   = ceil(quantity / stickersPerSheet)
//   giá tờ   = progressive(sheets) + vật liệu×sheets + cán×sheets
//   × (1 + percent/100)  — percent theo khổ giấy in (khổ gốc = 0%).
export function calculateSingleStickerPrice(
    quantity,
    decalType,
    isLaminated,
    stickersPerSheet,
    sheetW,
    sheetH,
    config
) {
    if (stickersPerSheet <= 0) return 0;
    const sheets = Math.ceil(quantity / stickersPerSheet);

    const printCost = calculateProgressivePrice(sheets, config);
    const materialCost = (config.decalCosts[decalType] || 0) * sheets;
    const lamCost = isLaminated ? config.laminationCost * sheets : 0;

    const percent = getSizePercent(config, sheetW, sheetH);
    return (printCost + materialCost + lamCost) * (1 + percent / 100);
}

// Calculate price for sticker sheet mode — NGUYÊN TỜ + % khổ + phụ phí bế demi.
export function calculateSheetPrice(
    quantity,
    decalType,
    isLaminated,
    sheetsPerPrintSheet,
    stickersOnSheet,
    sheetW,
    sheetH,
    config
) {
    if (sheetsPerPrintSheet <= 0) return 0;
    const numPrintSheets = Math.ceil(quantity / sheetsPerPrintSheet);

    const printCost = calculateProgressivePrice(numPrintSheets, config);
    const materialCost = (config.decalCosts[decalType] || 0) * numPrintSheets;
    const lamCost = isLaminated ? config.laminationCost * numPrintSheets : 0;

    const percent = getSizePercent(config, sheetW, sheetH);
    const sheetPrice = (printCost + materialCost + lamCost) * (1 + percent / 100);

    const surchargePercent = getDemiCutSurchargePercent(stickersOnSheet, config);
    return sheetPrice * (1 + surchargePercent / 100);
}
