// Decal engine — layout helpers + public layout API.
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004 (extract decal engine).
// KHÔNG đổi behavior — chỉ tổ chức lại theo cấu trúc module mới.
//
// Pure functions: chỉ phụ thuộc input + config object, không React/DOM/IO.

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Get printable area from sheet dimensions and margins
function getPrintableArea(sheetW, sheetH, config) {
    const mShort = config.marginShortSide;
    const mLong = config.marginLongSide;
    let pw, ph;
    if (sheetW < sheetH) {
        pw = sheetW - mShort;
        ph = sheetH - mLong;
    } else if (sheetH < sheetW) {
        pw = sheetW - mLong;
        ph = sheetH - mShort;
    } else {
        pw = sheetW - mShort;
        ph = sheetH - mLong;
    }
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
    const vertSpacing = (d * Math.sqrt(3)) / 2;
    if (vertSpacing === 0) return { count: 0 };
    const cols_full = Math.floor((areaW + gap) / d);
    const cols_staggered = Math.floor((areaW - r + gap) / d);
    const rows = Math.floor((areaH - diameter) / vertSpacing) + 1;
    let count1 = 0;
    if (rows > 0) count1 = Math.ceil(rows / 2) * cols_full + Math.floor(rows / 2) * cols_staggered;
    let count2 = 0;
    if (rows > 0) count2 = Math.floor(rows / 2) * cols_full + Math.ceil(rows / 2) * cols_staggered;
    const best =
        count1 >= count2
            ? {
                  type: 'hexagonal',
                  count: count1,
                  rows,
                  cols_full,
                  cols_staggered,
                  pattern: 'full_first',
                  itemW: diameter,
                  itemH: diameter,
              }
            : {
                  type: 'hexagonal',
                  count: count2,
                  rows,
                  cols_full,
                  cols_staggered,
                  pattern: 'staggered_first',
                  itemW: diameter,
                  itemH: diameter,
              };
    return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

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
