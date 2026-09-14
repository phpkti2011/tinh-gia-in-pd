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

// Xếp tem TRÒN / OVAL — TRỘN hàng thẳng và hàng so le để tối đa số con.
//
// Mỗi hàng nằm ở 1 trong 2 vị trí ngang: thẳng (lệch 0) hoặc so le (lệch dW/2).
//   - 2 hàng CÙNG vị trí  → phải cách nhau dH
//   - 2 hàng KHÁC vị trí  → chỉ cần cách dH×√3/2 (tiết kiệm ~13% chiều cao)
//   - hàng thẳng chứa cols_full con, hàng so le chứa cols_staggered con
// ⇒ mỗi hàng so le thường mất 1 con nhưng tiết kiệm chiều cao. Trộn khéo thì
//   nhét thêm được cả một hàng, hơn CẢ lưới thuần lẫn so le thuần.
//   Vd tròn 90mm trên vùng in 314×340: lưới 9, so le 10, TRỘN 11 (3+3+2+3).
//
// Hằng số √3 suy từ hình học ellipse: hai ellipse lệch ngang nửa bề rộng thì
// khoảng cách dọc tối thiểu là √3 × nửa chiều cao. itemW = itemH ⇒ đúng công
// thức hình tròn cũ.
//
// Cách này BAO TRÙM 2 kiểu cũ: s = 0 là lưới thẳng, s xen kẽ tối đa là so le
// thuần — nên số con chỉ có thể tăng hoặc giữ nguyên, không bao giờ giảm.
function calculateStaggeredLayout(itemW, itemH, areaW, areaH, gap) {
    if (itemW <= 0 || itemH <= 0 || itemW > areaW || itemH > areaH) return { count: 0 };
    const dW = itemW + gap;
    const dH = itemH + gap;
    const vertSpacing = (dH * Math.sqrt(3)) / 2;
    if (vertSpacing <= 0) return { count: 0 };

    const cols_full = Math.floor((areaW + gap) / dW);
    const cols_staggered = Math.floor((areaW - dW / 2 + gap) / dW);
    if (cols_full <= 0) return { count: 0 };

    const maxRows = Math.floor((areaH - itemH) / vertSpacing) + 1;

    // Quy hoạch động: minH[k][s][o] = chiều cao nhỏ nhất để xếp k hàng, trong đó
    // s hàng ở vị trí so le, hàng cuối ở vị trí o (0 = thẳng, 1 = so le).
    // Truy vết `par` để dựng lại vị trí THẬT của từng hàng.
    const INF = Infinity;
    const minH = [];
    const par = [];
    for (let k = 0; k <= maxRows; k++) {
        minH.push(Array.from({ length: maxRows + 2 }, () => [INF, INF]));
        par.push(Array.from({ length: maxRows + 2 }, () => [null, null]));
    }
    minH[1][0][0] = itemH;
    minH[1][1][1] = itemH;

    for (let k = 1; k < maxRows; k++) {
        for (let s = 0; s <= k; s++) {
            for (let o = 0; o < 2; o++) {
                const h = minH[k][s][o];
                if (h === INF) continue;
                for (let o2 = 0; o2 < 2; o2++) {
                    const nh = h + (o === o2 ? dH : vertSpacing);
                    if (nh > areaH + 1e-9) continue;
                    const s2 = s + o2;
                    if (nh < minH[k + 1][s2][o2] - 1e-12) {
                        minH[k + 1][s2][o2] = nh;
                        par[k + 1][s2][o2] = { k, s, o };
                    }
                }
            }
        }
    }

    let best = null;
    for (let k = 1; k <= maxRows; k++) {
        for (let s = 0; s <= k; s++) {
            for (let o = 0; o < 2; o++) {
                if (minH[k][s][o] > areaH + 1e-9) continue;
                const count = (k - s) * cols_full + s * cols_staggered;
                // Hoà số con thì ưu tiên nhiều hàng hơn (xếp xen kẽ dày hơn) —
                // giữ đúng kiểu so le cổ điển ở các ca mà so le vốn đã tối ưu.
                if (!best || count > best.count || (count === best.count && k > best.k)) {
                    best = { count, k, s, o };
                }
            }
        }
    }
    if (!best || best.count <= 0) return { count: 0 };

    // Truy vết ngược ra dãy vị trí của từng hàng.
    const offsets = [];
    let cur = { k: best.k, s: best.s, o: best.o };
    while (cur) {
        offsets.unshift(cur.o);
        cur = par[cur.k][cur.s][cur.o];
    }

    const buildPlan = (offs) => {
        const plan = [];
        let y = 0;
        for (let i = 0; i < offs.length; i++) {
            if (i > 0) y += offs[i] === offs[i - 1] ? dH : vertSpacing;
            plan.push({
                y,
                offsetX: offs[i] === 1 ? dW / 2 : 0,
                cols: offs[i] === 1 ? cols_staggered : cols_full,
            });
        }
        return plan;
    };
    const countOf = (plan) => plan.reduce((a, r) => a + r.cols, 0);

    // Lật toàn bộ (thẳng ↔ so le) cũng là một cách xếp hợp lệ, cùng chiều cao.
    // Chọn bản nhiều con hơn; hoà thì lấy bản BẮT ĐẦU BẰNG HÀNG THẲNG cho đẹp.
    let rowPlan = buildPlan(offsets);
    const flipped = buildPlan(offsets.map((o) => 1 - o));
    if (
        countOf(flipped) > countOf(rowPlan) ||
        (countOf(flipped) === countOf(rowPlan) && offsets[0] === 1)
    ) {
        rowPlan = flipped;
    }

    const planCount = countOf(rowPlan);
    return {
        type: 'hexagonal',
        count: planCount,
        rows: rowPlan.length,
        cols_full,
        cols_staggered,
        // Giữ field cũ cho nhánh vẽ / test cũ; rowPlan mới mới là nguồn chính xác.
        pattern: rowPlan[0] && rowPlan[0].offsetX > 0 ? 'staggered_first' : 'full_first',
        rowPlan,
        itemW,
        itemH,
    };
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

    if (shape === 'circle' || shape === 'oval') {
        // Tròn: dùng đường kính (hộp vuông bao ngoài). Oval: giữ đúng W×H.
        const iw = shape === 'circle' ? Math.max(stickerW, stickerH) : stickerW;
        const ih = shape === 'circle' ? Math.max(stickerW, stickerH) : stickerH;

        // Ứng viên xếp trộn (đã bao trùm lưới thẳng + so le thuần).
        // `swapped` = tính trong hệ toạ độ xoay 90° của VÙNG IN → so le theo trục
        // còn lại. Khác hẳn việc xoay CON TEM (chỉ có nghĩa với oval).
        // Phần vẽ sơ đồ dựa vào cờ này để hoán đổi x/y, nên phải tách bạch.
        const mk = (w2, h2, swapped) => {
            const aw = swapped ? pa.h : pa.w;
            const ah = swapped ? pa.w : pa.h;
            return {
                ...calculateStaggeredLayout(w2, h2, aw, ah, gap),
                swapped,
                orientation: swapped ? 'horizontal' : 'vertical',
            };
        };
        const cands = [mk(iw, ih, false), mk(iw, ih, true)];
        if (iw !== ih) cands.push(mk(ih, iw, false), mk(ih, iw, true));
        // Oval còn có thể lợi hơn khi xếp theo hộp chữ nhật bao ngoài (guillotine).
        if (shape === 'oval') {
            const packed = packRectangles(stickerW, stickerH, pa.w, pa.h, gap);
            if (packed.count > 0) {
                cands.push({
                    type: 'packed',
                    count: packed.count,
                    blocks: packed.blocks,
                    itemW: stickerW,
                    itemH: stickerH,
                    orientation: 'mixed',
                });
            }
        }

        const best = cands.reduce((a, b) => (b.count > a.count ? b : a), { count: 0 });
        if (!best || best.count <= 0) return { count: 0, printableW: pa.w, printableH: pa.h };
        return { ...best, printableW: pa.w, printableH: pa.h };
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
