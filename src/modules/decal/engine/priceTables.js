// Decal engine — sinh bảng giá (price table generators).
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004.
// KHÔNG đổi behavior. Pure functions, không React/DOM/IO.

import { calculateSingleStickerPrice, calculateSheetPrice } from './pricing.js';

// Generate full price table for single sticker mode
export function generateSinglePriceTable(
    stickersPerSheet,
    decalType,
    sheetW,
    sheetH,
    config,
    customQuantity
) {
    const decalsToDisplay =
        decalType === 'Decal giấy' || decalType === 'Decal nhựa'
            ? ['Decal giấy', 'Decal nhựa']
            : [decalType];
    const quantities = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
    const rows = [];

    if (customQuantity > 0) {
        for (const dt of decalsToDisplay) {
            rows.push({
                quantity: customQuantity,
                decalType: dt,
                laminated: true,
                price: calculateSingleStickerPrice(
                    customQuantity,
                    dt,
                    true,
                    stickersPerSheet,
                    sheetW,
                    sheetH,
                    config
                ),
                isCustom: true,
            });
            rows.push({
                quantity: customQuantity,
                decalType: dt,
                laminated: false,
                price: calculateSingleStickerPrice(
                    customQuantity,
                    dt,
                    false,
                    stickersPerSheet,
                    sheetW,
                    sheetH,
                    config
                ),
                isCustom: true,
            });
        }
    }

    for (const qty of quantities) {
        for (const dt of decalsToDisplay) {
            rows.push({
                quantity: qty,
                decalType: dt,
                laminated: true,
                price: calculateSingleStickerPrice(
                    qty,
                    dt,
                    true,
                    stickersPerSheet,
                    sheetW,
                    sheetH,
                    config
                ),
            });
            rows.push({
                quantity: qty,
                decalType: dt,
                laminated: false,
                price: calculateSingleStickerPrice(
                    qty,
                    dt,
                    false,
                    stickersPerSheet,
                    sheetW,
                    sheetH,
                    config
                ),
            });
        }
    }
    return rows;
}

// Generate full price table for sticker sheet mode
export function generateSheetPriceTable(
    sheetsPerPrintSheet,
    stickersOnSheet,
    decalType,
    sheetW,
    sheetH,
    config,
    customQuantity
) {
    const decalsToDisplay =
        decalType === 'Decal giấy' || decalType === 'Decal nhựa'
            ? ['Decal giấy', 'Decal nhựa']
            : [decalType];
    const quantities = Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
    const rows = [];

    if (customQuantity > 0) {
        for (const dt of decalsToDisplay) {
            rows.push({
                quantity: customQuantity,
                decalType: dt,
                laminated: true,
                price: calculateSheetPrice(
                    customQuantity,
                    dt,
                    true,
                    sheetsPerPrintSheet,
                    stickersOnSheet,
                    sheetW,
                    sheetH,
                    config
                ),
                isCustom: true,
            });
            rows.push({
                quantity: customQuantity,
                decalType: dt,
                laminated: false,
                price: calculateSheetPrice(
                    customQuantity,
                    dt,
                    false,
                    sheetsPerPrintSheet,
                    stickersOnSheet,
                    sheetW,
                    sheetH,
                    config
                ),
                isCustom: true,
            });
        }
    }

    for (const qty of quantities) {
        for (const dt of decalsToDisplay) {
            rows.push({
                quantity: qty,
                decalType: dt,
                laminated: true,
                price: calculateSheetPrice(
                    qty,
                    dt,
                    true,
                    sheetsPerPrintSheet,
                    stickersOnSheet,
                    sheetW,
                    sheetH,
                    config
                ),
            });
            rows.push({
                quantity: qty,
                decalType: dt,
                laminated: false,
                price: calculateSheetPrice(
                    qty,
                    dt,
                    false,
                    sheetsPerPrintSheet,
                    stickersOnSheet,
                    sheetW,
                    sheetH,
                    config
                ),
            });
        }
    }
    return rows;
}
