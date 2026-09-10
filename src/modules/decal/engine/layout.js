// Decal engine — layout helpers + public layout API.
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004 (extract decal engine).
// KHÔNG đổi behavior — chỉ tổ chức lại theo cấu trúc module mới.
//
// Pure functions: chỉ phụ thuộc input + config object, không React/DOM/IO.

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Tìm khổ giấy in khớp w&h trong printSheetSizes (để lấy percent riêng của khổ).
export function findPrintSheet(config, w, h) {
    return (config.printSheetSizes || []).find((s) => s.w === w && s.h === h) || null;
}

// Get printable area from sheet dimensions and margins (vùng bế).
// - Máy khai báo 4 cạnh (marginTop/Bottom/Left/Right) → trừ từng cạnh:
//     pw = W − trái − phải ; ph = H − trên − dưới.
// - Ngược lại (không máy / máy kiểu cũ / global) → giữ logic cũ short/long (gộp 1 số/trục).
function getPrintableArea(sheetW, sheetH, config, machine) {
    if (machine && typeof machine.marginTop === 'number') {
        const left = machine.marginLeft || 0;
        const right = machine.marginRight || 0;
        const top = machine.marginTop || 0;
        const bottom = machine.marginBottom || 0;
        return {
            w: Math.max(0, sheetW - left - right),
            h: Math.max(0, sheetH - top - bottom),
        };
    }
    const mShort =
        machine && typeof machine.marginShort === 'number'
            ? machine.marginShort
            : config.marginShortSide;
    const mLong =
        machine && typeof machine.marginLong === 'number'
            ? machine.marginLong
            : config.marginLongSide;
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

// Uniform grid trong 1 vùng (đếm số ô + cols/rows). Không xoay.
function uniformGrid(iw, ih, areaW, areaH, gap) {
    if (iw <= 0 || ih <= 0 || iw > areaW || ih > areaH) return { count: 0, cols: 0, rows: 0 };
    const cols = Math.floor((areaW + gap) / (iw + gap));
    const rows = Math.floor((areaH + gap) / (ih + gap));
    return { count: cols * rows, cols, rows };
}

// Xếp tem HỖN HỢP (guillotine đệ quy có giới hạn depth) — tối đa số con trong vùng in.
// Trả { count, blocks:[{x,y,iw,ih,cols,rows}] } (toạ độ mm, gốc góc trên-trái vùng in).
// Luôn ≥ lưới đồng nhất (best khởi tạo từ lưới, extras ≥ 0). Cho phép xoay 90° từng khối.
export function packRectangles(w, h, areaW, areaH, gap, depth = 4) {
    if (areaW <= 0 || areaH <= 0) return { count: 0, blocks: [] };
    let best = { count: 0, blocks: [] };
    const orientations =
        w === h
            ? [[w, h]]
            : [
                  [w, h],
                  [h, w],
              ];
    for (const [iw, ih] of orientations) {
        const g = uniformGrid(iw, ih, areaW, areaH, gap);
        if (g.count <= 0) continue;
        const mainBlock = { x: 0, y: 0, iw, ih, cols: g.cols, rows: g.rows };
        let count = g.count;
        let blocks = [mainBlock];
        if (depth > 0) {
            const usedW = g.cols * (iw + gap) - gap;
            const usedH = g.rows * (ih + gap) - gap;
            const rightW = areaW - usedW - gap;
            const bottomH = areaH - usedH - gap;
            if (rightW > 0) {
                const r = packRectangles(w, h, rightW, areaH, gap, depth - 1);
                count += r.count;
                blocks = blocks.concat(r.blocks.map((b) => ({ ...b, x: b.x + usedW + gap })));
            }
            if (bottomH > 0) {
                const r = packRectangles(w, h, usedW, bottomH, gap, depth - 1);
                count += r.count;
                blocks = blocks.concat(r.blocks.map((b) => ({ ...b, y: b.y + usedH + gap })));
            }
        }
        if (count > best.count) best = { count, blocks };
    }
    return best;
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
export function calculateStickersPerSheet(
    stickerW,
    stickerH,
    sheetW,
    sheetH,
    shape,
    config,
    machine
) {
    const pa = getPrintableArea(sheetW, sheetH, config, machine);
    const gap = config.stickerGap;

    if (shape === 'circle') {
        const diameter = Math.max(stickerW, stickerH);
        const lv = calculateHexagonalLayout(diameter, pa.w, pa.h, gap);
        const lh = calculateHexagonalLayout(diameter, pa.h, pa.w, gap);
        return lv.count >= lh.count
            ? { ...lv, orientation: 'vertical', printableW: pa.w, printableH: pa.h }
            : { ...lh, orientation: 'horizontal', printableW: pa.w, printableH: pa.h };
    } else {
        // Xếp hỗn hợp (guillotine) — tối đa số con/tờ.
        const packed = packRectangles(stickerW, stickerH, pa.w, pa.h, gap);
        const base = {
            count: packed.count,
            blocks: packed.blocks,
            printableW: pa.w,
            printableH: pa.h,
        };
        if (packed.blocks.length === 1) {
            const b = packed.blocks[0];
            return {
                ...base,
                type: 'grid',
                cols: b.cols,
                rows: b.rows,
                itemW: b.iw,
                itemH: b.ih,
                orientation: b.iw === stickerW ? 'vertical' : 'horizontal',
            };
        }
        return {
            ...base,
            type: 'packed',
            itemW: stickerW,
            itemH: stickerH,
            orientation: 'mixed',
        };
    }
}

// Calculate sticker sheet items per print sheet
export function calculateSheetsPerPrintSheet(
    sheetW,
    sheetH,
    printSheetW,
    printSheetH,
    config,
    machine
) {
    const pa = getPrintableArea(printSheetW, printSheetH, config, machine);
    const gap = config.stickerGap;
    // Xếp hỗn hợp (guillotine) — tối đa số tờ sticker/tờ in.
    const packed = packRectangles(sheetW, sheetH, pa.w, pa.h, gap);
    const orientation =
        packed.blocks.length === 1
            ? packed.blocks[0].iw === sheetW
                ? 'vertical'
                : 'horizontal'
            : 'mixed';
    return {
        count: packed.count,
        blocks: packed.blocks,
        orientation,
        printableW: pa.w,
        printableH: pa.h,
    };
}
