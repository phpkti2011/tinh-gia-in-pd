// Decal pricing engine — public API surface (barrel export).
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004.
// Tất cả golden tests (decal.golden.test.js, decal.extra.golden.test.js)
// phải pass khi import qua đường dẫn này hoặc qua compat shim cũ.
//
// Excel reference gap (xem docs/pricing-rules/decal-reference-cases.md)
// KHÔNG fix ở task này — sẽ làm ở task riêng sau.

export { calculateStickersPerSheet, calculateSheetsPerPrintSheet } from './layout.js';

export { calculateSingleStickerPrice, calculateSheetPrice } from './pricing.js';

export { generateSinglePriceTable, generateSheetPriceTable } from './priceTables.js';
