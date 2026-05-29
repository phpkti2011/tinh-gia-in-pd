// Small-print engine — geometry, printable area, sheet cuts.
//
// Tách từ src/utils/calculator.js ở TASK-0009.
// KHÔNG đổi behavior — pure functions, không React/DOM/IO.

// Get number of clicks (printer tier lookup theo chiều cao tờ in)
export function getClicks(h, printer) {
    for (const tier of printer.clickTiers) {
        if (h <= tier.maxH) return tier.clicks;
    }
    return Infinity;
}

// Get printable area sau khi trừ margins theo mode (custom / digital / VK / non-VK)
export function getPrintableArea(w, h, printer, isDigitalCutting, config, isCustom = false) {
    const cfg = config.PRINTABLE_AREA_CONFIG;
    let printableH = h;
    let printableW = w;

    if (isCustom) {
        printableW -= cfg.custom_width_margin;
        printableH -= cfg.custom_height_margin;
    } else if (isDigitalCutting) {
        printableH -= cfg.digital_cut_margin_total;
        printableW -= cfg.digital_cut_margin_total;
    } else {
         if (printer && printer.vkPoints.some(p => Math.abs(p - h) < 0.01)) {
            printableH -= cfg.vk_point_height_margin;
        } else {
            printableH -= cfg.non_vk_point_height_margin;
        }
        printableW -= cfg.regular_cut_width_margin_total;
    }
    return { w: Math.max(0, printableW), h: Math.max(0, printableH) };
}

// Imposition — xếp item trên vùng in, thử cả 2 hướng xoay
export function calculateImposition(areaW, areaH, prodW, prodH, spacing) {
    if (areaW <= 0 || areaH <= 0 || prodW <= 0 || prodH <= 0) {
         return { total: 0, layout: 'N/A', actualPrintW: 0, actualPrintH: 0 };
    }
    const itemW = prodW + spacing;
    const itemH = prodH + spacing;

    // Case 1: Normal orientation
    const fitW1 = (areaW + spacing) < itemW ? 0 : Math.floor((areaW + spacing) / itemW);
    const fitH1 = (areaH + spacing) < itemH ? 0 : Math.floor((areaH + spacing) / itemH);
    const total1 = fitW1 * fitH1;

    // Case 2: Rotated orientation
    const fitW2 = (areaW + spacing) < itemH ? 0 : Math.floor((areaW + spacing) / itemH);
    const fitH2 = (areaH + spacing) < itemW ? 0 : Math.floor((areaH + spacing) / itemW);
    const total2 = fitW2 * fitH2;

    if (total1 >= total2 && total1 > 0) {
        return {
            total: total1,
            layout: `${fitH1}x${fitW1}`,
            actualPrintW: fitW1 * prodW + Math.max(0, fitW1 - 1) * spacing,
            actualPrintH: fitH1 * prodH + Math.max(0, fitH1 - 1) * spacing
        };
    } else if (total2 > 0) {
        return {
            total: total2,
            layout: `${fitH2}x${fitW2}`,
            actualPrintW: fitW2 * prodH + Math.max(0, fitW2 - 1) * spacing,
            actualPrintH: fitH2 * prodW + Math.max(0, fitH2 - 1) * spacing,
        };
    } else {
        return { total: 0, layout: '0x0', actualPrintW: 0, actualPrintH: 0 };
    }
}

// Tối ưu số tờ in cắt được từ 1 tờ lớn (geometric optimization)
export function calculateMaxCuttableSheetsLayout(largeW, largeH, cutW, cutH) {
    if (cutW <= 0 || cutH <= 0 || largeW <= 0 || largeH <= 0) return { count: 0, layout: [] };

    const solveSimple = (L, W, itemW, itemH) => {
        const rects = [];
        if (itemW <= 0 || itemH <= 0 || itemW > L || itemH > W) return rects;
        const n_w = Math.floor(L / itemW);
        const n_h = Math.floor(W / itemH);
        for(let i=0; i<n_w; i++) {
            for(let j=0; j<n_h; j++) {
                rects.push({x: i*itemW, y: j*itemH, w: itemW, h: itemH});
            }
        }
        return rects;
    };

    const solveMixed = (L, W, mainW, mainH, remW, remH) => {
        const rects = [];
        if (mainW <= 0 || mainH <= 0 || mainW > L || mainH > W) return rects;

        const n_w_main = Math.floor(L / mainW);
        const n_h_main = Math.floor(W / mainH);
        for (let i = 0; i < n_w_main; i++) {
            for (let j = 0; j < n_h_main; j++) {
                rects.push({ x: i * mainW, y: j * mainH, w: mainW, h: mainH });
            }
        }

        const rem1_L = L - n_w_main * mainW;
        const rem1_W = W;
        const rem1_startX = n_w_main * mainW;
        if (rem1_L > 0) {
            const sideRects1 = solveSimple(rem1_L, rem1_W, remW, remH);
            const sideRects2 = solveSimple(rem1_L, rem1_W, remH, remW);
            const bestSideRects = sideRects1.length >= sideRects2.length ? sideRects1 : sideRects2;
            bestSideRects.forEach(r => rects.push({ ...r, x: r.x + rem1_startX }));
        }

        const rem2_L = n_w_main * mainW;
        const rem2_W = W - n_h_main * mainH;
        const rem2_startY = n_h_main * mainH;
        if (rem2_W > 0) {
            const bottomRects1 = solveSimple(rem2_L, rem2_W, remW, remH);
            const bottomRects2 = solveSimple(rem2_L, rem2_W, remH, remW);
            const bestBottomRects = bottomRects1.length >= bottomRects2.length ? bottomRects1 : bottomRects2;
            bestBottomRects.forEach(r => rects.push({ ...r, y: r.y + rem2_startY }));
        }

        return rects;
    };

    const layouts = [
        solveSimple(largeW, largeH, cutW, cutH),
        solveSimple(largeW, largeH, cutH, cutW),
        solveMixed(largeW, largeH, cutW, cutH, cutH, cutW),
        solveMixed(largeW, largeH, cutH, cutW, cutW, cutH),
        solveSimple(largeH, largeW, cutW, cutH).map(r => ({x: r.y, y: r.x, w: r.h, h: r.w})),
        solveSimple(largeH, largeW, cutH, cutW).map(r => ({x: r.y, y: r.x, w: r.h, h: r.w})),
        solveMixed(largeH, largeW, cutW, cutH, cutH, cutW).map(r => ({x: r.y, y: r.x, w: r.h, h: r.w})),
        solveMixed(largeH, largeW, cutH, cutW, cutW, cutH).map(r => ({x: r.y, y: r.x, w: r.h, h: r.w}))
    ];

    let bestLayout = [];
    for(const layout of layouts) {
        if(layout.length > bestLayout.length) {
            bestLayout = layout;
        }
    }

    return { count: bestLayout.length, layout: bestLayout };
}
