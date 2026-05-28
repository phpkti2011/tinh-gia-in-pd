export function getClicks(h, printer) {
    for (const tier of printer.clickTiers) {
        if (h <= tier.maxH) return tier.clicks;
    }
    return Infinity;
}

export function getProfitMargin(cost, config) {
    const tier = config.PROFIT_MARGIN_TIERS.find(t => cost <= t.max_cost);
    return tier ? tier.margin : 0; 
}

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

export function calculateLamination(pressH, actualPrintW, productsPerSheet, laminationType, config) {
    let cost = 0;
    let warning = null;
    const sides = laminationType === 'laminate_2' ? 2 : 1;
    if (laminationType === 'laminate_1' || laminationType === 'laminate_2') {
        if (actualPrintW > config.LAMINATION_CONFIG.WIDTH) {
            warning = `KHÔNG THỂ CÁN MÀNG (Vùng in ${actualPrintW.toFixed(1)}cm > rộng màng ${config.LAMINATION_CONFIG.WIDTH}cm)`;
            cost = 0;
        } else {
            cost = (pressH / 100) * config.LAMINATION_CONFIG.PRICE_PER_METER * sides;
            if (Math.abs(actualPrintW - config.LAMINATION_CONFIG.WIDTH) < 0.01) {
                warning = `Lưu ý: Vùng in ${actualPrintW.toFixed(1)}cm bằng rộng màng, dễ bị hụt.`;
            }
        }
    }
    return { costPerSheet: cost, costPerProduct: productsPerSheet > 0 ? cost / productsPerSheet : 0, warning: warning, };
}

export function calculateVariableDataCost(quantity, config) {
    if (quantity <= 0) return 0;
    const cfg = config.VARIABLE_DATA_CONFIG;
    if (quantity <= 500) return cfg.price_500;
    if (quantity <= 1000) return cfg.price_1000;
    
    const additionalSteps = Math.floor((quantity - 1001) / cfg.progressive_step);
    return cfg.price_over_1000_base + (additionalSteps * cfg.price_over_1000_progressive);
}

export function calculatePrintContentSurcharge(totalCost, quantity, contentCount, config) {
    if (contentCount <= 1 || quantity <= 0) return { surcharge: 0, reason: '' };

    const qtyPerContent = quantity / contentCount;
    const cfg = config.PRINT_CONTENT_CONFIG;

    if (Math.abs(qtyPerContent - 1) < 0.001) {
        const surcharge = totalCost * cfg.single_content_surcharge;
        return { surcharge, reason: `+${(cfg.single_content_surcharge * 100).toFixed(0)}% (mỗi nội dung 1 cái)` };
    }

    const tier = cfg.tiers.find(t => contentCount >= t.min && contentCount <= t.max);
    if (tier) {
        const surcharge = totalCost * tier.surcharge;
        return { surcharge, reason: `+${(tier.surcharge * 100).toFixed(0)}% (${contentCount} nội dung)` };
    }

    return { surcharge: 0, reason: '' };
}

export function calculateFinishingCost(quantity, type, configData) {
    if (quantity <= 0 || type === 'none' || !configData) {
        return { cost: 0, customerPrice: 0 };
    }

    const costTiers = Array.isArray(configData.cost_tiers) ? configData.cost_tiers : [];
    const customerTiers = Array.isArray(configData.customer_tiers) ? configData.customer_tiers : [];

    const costTier = costTiers.find(t => quantity <= t.max_qty);
    const customerTier = customerTiers.find(t => quantity <= t.max_qty);

    let cost = 0;
    let customerPrice = 0;

    if (costTier) {
        cost = costTier.type === 'package' ? costTier.price : quantity * costTier.price;
    }
    if (customerTier) {
        customerPrice = customerTier.type === 'package' ? customerTier.price : quantity * customerTier.price;
    }

    return { cost, customerPrice };
}

export function calculateDieCuttingCosts(params, printSheetCount, isDecal, config) {
    const { dieCuttingType, moldType, productW, productH, tagHasHole } = params;
    
    let moldCost = 0, laborCost = 0, laborCustomerPrice = 0;

    if (dieCuttingType === 'none') return { moldCost, laborCost, laborCustomerPrice };

    if (dieCuttingType === 'digital') {
        const digitalCost = calculateFinishingCost(printSheetCount, 'digital', config.DIGITAL_DIE_CUTTING_CONFIG);
        laborCost = digitalCost.cost;
        laborCustomerPrice = digitalCost.customerPrice;
    }

    if (dieCuttingType === 'mold') {
        // 1. Calculate Mold Cost
        const cfg = config.DIE_CUTTING_MOLD_COST_CONFIG;
         if (!cfg) return { moldCost: 0, laborCost: 0, laborCustomerPrice: 0 };

        switch(moldType) {
            case 'simple':
                if (!cfg.simple) break;
                if (productW > cfg.simple.base_size || productH > cfg.simple.base_size) {
                    const largerW = Math.max(productW, cfg.simple.base_size);
                    const largerH = Math.max(productH, cfg.simple.base_size);
                    if (cfg.simple.base_size > 0) {
                         moldCost = (cfg.simple.base_price / (cfg.simple.base_size * cfg.simple.base_size)) * (largerW * largerH);
                    }
                } else {
                    moldCost = cfg.simple.base_price;
                }
                break;
            case 'envelope':
                 if (!cfg.envelope) break; 
                moldCost = (productW * productH) > cfg.envelope.threshold_area ? cfg.envelope.large_price : cfg.envelope.small_price;
                break;
            case 'box':
                 if (!cfg.box) break;
                 moldCost = (productW * productH) > cfg.box.threshold_area ? cfg.box.large_price : cfg.box.small_price;
                break;
            case 'bag':
                  if (!cfg.bag) break; 
                 moldCost = (productW * productH) > cfg.bag.threshold_area ? cfg.bag.large_price : cfg.bag.small_price;
                break;
            case 'tag':
                  if (!cfg.tag) break; 
                 const spacing = 0.4; // 4mm
                 const pressW = 32.2; 
                 const numAcross = (productW + spacing > 0) ? Math.floor((pressW + spacing) / (productW + spacing)) : 0;
                 const numDown = 3; 
                 const numOnMold = numAcross * numDown;
                 moldCost = productW * productH * numOnMold * cfg.tag.price_per_cm2;
                 if (tagHasHole) {
                     moldCost += cfg.tag.hole_price * numOnMold;
                 }
                break;
        }

        // 2. Calculate Labor Cost
        const laborCosts = calculateFinishingCost(printSheetCount, 'labor', config.DIE_CUTTING_LABOR_CONFIG);
        laborCost = laborCosts.cost;
        laborCustomerPrice = laborCosts.customerPrice;
        
        // Apply Surcharges
        const laborCfg = config.DIE_CUTTING_LABOR_CONFIG;
         if (laborCfg) {
            if (isDecal) {
                laborCost *= (1 + laborCfg.decal_surcharge);
                laborCustomerPrice *= (1 + laborCfg.decal_surcharge);
            }
            if (cfg && cfg.tag && moldType === 'tag' && productW < cfg.tag.threshold_w && productH < cfg.tag.threshold_h) {
                 laborCost *= (1 + laborCfg.small_tag_surcharge);
                 laborCustomerPrice *= (1 + laborCfg.small_tag_surcharge);
            }
        }
    }
    
    return { moldCost, laborCost, laborCustomerPrice };
}

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

export function processSheet(pressW, pressH, largeSheet, printer, params, productWithBleedW, productWithBleedH, allResults, largeSheetPrice, spacing, isDigitalCutting, config, isCustom = false) {
     if (!printer || pressW > printer.maxW || pressH > printer.maxH) return;
    if ((pressW > largeSheet.w || pressH > largeSheet.h) && (pressW > largeSheet.h || pressH > largeSheet.w)) return;

    const clickPrice = printer.prices[params.printColorMode] || printer.prices['4color']; 
    if (!clickPrice) return;
    
    const printableArea = getPrintableArea(pressW, pressH, printer, isDigitalCutting, config, isCustom);
    const currentSpacing = isCustom ? 0 : spacing; 
    const imposition = calculateImposition(printableArea.w, printableArea.h, productWithBleedW, productWithBleedH, currentSpacing);
    const productsPerSheet = imposition.total;
    if (productsPerSheet === 0) return;
    
    const { count: numCuttableSheets, layout: cuttableSheetLayout } = calculateMaxCuttableSheetsLayout(largeSheet.w, largeSheet.h, pressW, pressH);
    if (numCuttableSheets === 0) return;
    
    const clicks = getClicks(pressH, printer);
    if (clicks === Infinity) return;
    
    const paperCostPerSheet = numCuttableSheets > 0 ? largeSheetPrice / numCuttableSheets : Infinity;
    const printCostPerSheet = clicks * clickPrice * params.printSides;
    const lamination = calculateLamination(pressH, imposition.actualPrintW, productsPerSheet, params.laminationType, config);
    const totalCostPerSheet = paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;
    
    const costPerProduct = productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
    const paperCostPerProduct = productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
    const printCostPerProduct = productsPerSheet > 0 ? printCostPerSheet / productsPerSheet : Infinity;

    allResults.push({ printer, largeSheetName: `${largeSheet.w}x${largeSheet.h}`, layoutDesc: imposition.layout, actualPrintW: imposition.actualPrintW, actualPrintH: imposition.actualPrintH, numCuttableSheets, cuttableSheetLayout, cutSheetW: pressW, cutSheetH: pressH, cutSheetSize: `${pressW.toFixed(2)} x ${pressH.toFixed(2)}`, printableArea: `${printableArea.w.toFixed(2)} x ${printableArea.h.toFixed(2)}`, clicks, productsPerSheet, paperCostPerProduct, printCostPerProduct, laminationCostPerProduct: lamination.costPerProduct, laminationWarning: lamination.warning, costPerProduct, debug: { paperCostPerSheet, printCostPerSheet, laminationCostPerSheet: lamination.costPerSheet, totalCostPerSheet, costPerProduct }, largeSheetW: largeSheet.w, largeSheetH: largeSheet.h, isDecal: false, isCustom: isCustom });
}

export function calculateDecalOptions(params, selectedPaper, productWithBleedW, productWithBleedH, allResults, spacing, isDigitalCutting, config) {
    const decalWidths = [32.2, 33.0];
    const pricePerSqm = selectedPaper.pricePerSqm;
    const printersToUse = Object.entries(config.PRINTER_CONFIG)
                                .filter(([key, printer]) => printer.name === 'C2060') 
                                .reduce((obj, [key, printer]) => { obj[key] = printer; return obj; }, {});

    for (const printerKey in printersToUse) {
        const printer = printersToUse[printerKey];
        for (const pressW of decalWidths) {
             if (pressW > printer.maxW) continue;
            const decalSheets = Array.isArray(config.DECAL_SHEET_SIZES) && config.DECAL_SHEET_SIZES.length > 0 ? config.DECAL_SHEET_SIZES : config.COMMON_SHEET_SIZES;
            for (const commonSheet of decalSheets) {
                const pressH = commonSheet.h;
                if (pressH > printer.maxH) continue; 

                const clickPrice = printer.prices[params.printColorMode] || printer.prices['4color']; 
                if (!clickPrice) continue;
                const printableArea = getPrintableArea(pressW, pressH, printer, isDigitalCutting, config, false); 
                const imposition = calculateImposition(printableArea.w, printableArea.h, productWithBleedW, productWithBleedH, spacing);
                const productsPerSheet = imposition.total;
                if (productsPerSheet === 0) continue;
                const clicks = getClicks(pressH, printer);
                if (clicks === Infinity) continue;
                const sheetAreaM2 = (pressW * pressH) / 10000;
                const paperCostPerSheet = sheetAreaM2 * pricePerSqm;
                const printCostPerSheet = clicks * clickPrice * params.printSides;
                const lamination = calculateLamination(pressH, imposition.actualPrintW, productsPerSheet, params.laminationType, config);
                const totalCostPerSheet = paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;
                const costPerProduct = productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
                const paperCostPerProduct = productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
                const printCostPerProduct = productsPerSheet > 0 ? printCostPerSheet / productsPerSheet : Infinity;
                allResults.push({ printer, largeSheetName: `Decal (m²)`, layoutDesc: imposition.layout, actualPrintW: imposition.actualPrintW, actualPrintH: imposition.actualPrintH, numCuttableSheets: 'N/A', cutSheetW: pressW, cutSheetH: pressH, cutSheetSize: `${pressW.toFixed(2)} x ${pressH.toFixed(2)}`, printableArea: `${printableArea.w.toFixed(2)} x ${printableArea.h.toFixed(2)}`, clicks, productsPerSheet, paperCostPerProduct, printCostPerProduct, laminationCostPerProduct: lamination.costPerProduct, laminationWarning: lamination.warning, costPerProduct, debug: { paperCostPerSheet, printCostPerSheet, laminationCostPerSheet: lamination.costPerSheet, totalCostPerSheet, costPerProduct }, largeSheetW: pressW, largeSheetH: pressH, isDecal: true, isCustom: false }); 
            }
        }
    }
}

export function calculatePerSheetOptions(params, selectedPaper, productWithBleedW, productWithBleedH, allResults, spacing, isDigitalCutting, config) {
    if (!selectedPaper.sheetSize || typeof selectedPaper.sheetSize.w !== 'number' || typeof selectedPaper.sheetSize.h !== 'number') return;
    const pressW = selectedPaper.sheetSize.w;
    const pressH = selectedPaper.sheetSize.h;
    const paperCostPerSheet = selectedPaper.sheetPrice;
     const printersToUse = Object.entries(config.PRINTER_CONFIG)
                                 .filter(([key, printer]) => printer.name === 'C2060') 
                                 .reduce((obj, [key, printer]) => { obj[key] = printer; return obj; }, {});

    for (const printerKey in printersToUse) {
        const printer = printersToUse[printerKey];
        if (pressW > printer.maxW || pressH > printer.maxH) continue; 
         const clickPrice = printer.prices[params.printColorMode] || printer.prices['4color']; 
        if (!clickPrice) continue;
        const printableArea = getPrintableArea(pressW, pressH, printer, isDigitalCutting, config, false); 
        const imposition = calculateImposition(printableArea.w, printableArea.h, productWithBleedW, productWithBleedH, spacing);
        const productsPerSheet = imposition.total;
        if (productsPerSheet === 0) continue;
        const clicks = getClicks(pressH, printer);
        if (clicks === Infinity) continue;
        const printCostPerSheet = clicks * clickPrice * params.printSides;
        const lamination = calculateLamination(pressH, imposition.actualPrintW, productsPerSheet, params.laminationType, config);
        const totalCostPerSheet = paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;
        const costPerProduct = productsPerSheet > 0 ? totalCostPerSheet / productsPerSheet : Infinity;
        const paperCostPerProduct = productsPerSheet > 0 ? paperCostPerSheet / productsPerSheet : Infinity;
        const printCostPerProduct = productsPerSheet > 0 ? printCostPerSheet / productsPerSheet : Infinity;
        allResults.push({ printer, largeSheetName: `Tờ ${pressW}x${pressH}`, layoutDesc: imposition.layout, actualPrintW: imposition.actualPrintW, actualPrintH: imposition.actualPrintH, numCuttableSheets: 1, cuttableSheetLayout: null, cutSheetW: pressW, cutSheetH: pressH, cutSheetSize: `${pressW.toFixed(1)} x ${pressH.toFixed(1)}`, printableArea: `${printableArea.w.toFixed(2)} x ${printableArea.h.toFixed(2)}`, clicks, productsPerSheet, paperCostPerProduct, printCostPerProduct, laminationCostPerProduct: lamination.costPerProduct, laminationWarning: lamination.warning, costPerProduct, debug: { paperCostPerSheet, printCostPerSheet, laminationCostPerSheet: lamination.costPerSheet, totalCostPerSheet, costPerProduct }, largeSheetW: pressW, largeSheetH: pressH, isDecal: true, isCustom: false }); 
    }
}

export function calculatePaperOptions(params, selectedPaper, productWithBleedW, productWithBleedH, allResults, spacing, isDigitalCutting, config) {
    let largeSheet;
    const isArtPaper = selectedPaper.pricingModel === 'custom';
    const sheetOptions = isArtPaper ? config.ART_PAPER_LARGE_SHEET_SIZES : config.STANDARD_LARGE_SHEET_SIZES;
    const selectedSheetData = sheetOptions[params.largeSheetSelector];
     
     if (!selectedSheetData) return;

    if (selectedSheetData.w === 'custom') {
         if (isNaN(params.customSheetW) || isNaN(params.customSheetH) || params.customSheetW <= 0 || params.customSheetH <= 0) return;
        largeSheet = { name: `Tùy chọn ${params.customSheetW}x${params.customSheetH} cm`, w: params.customSheetW, h: params.customSheetH, };
    } else {
        largeSheet = selectedSheetData;
    }

    let largeSheetPrice;
    if (isArtPaper) {
         if (isNaN(params.artPaperPrice) || params.artPaperPrice < 0) return;
        largeSheetPrice = params.artPaperPrice;
    } else {
        if (isNaN(selectedPaper.pricePerReam) || selectedPaper.pricePerReam <= 0) return;
        const pricePerSheet65x86 = selectedPaper.pricePerReam / 500;
        const baseArea = config.STANDARD_LARGE_SHEET_SIZES[0].w * config.STANDARD_LARGE_SHEET_SIZES[0].h;
        const targetArea = largeSheet.w * largeSheet.h;
        largeSheetPrice = baseArea > 0 ? (pricePerSheet65x86 / baseArea) * targetArea : 0;
    }

    const isLargeProduct = productWithBleedW > 48 || productWithBleedH > 48;
    let sheetsToProcess = [];

    if (isLargeProduct && !isArtPaper && !selectedPaper.name.toLowerCase().includes('decal') && selectedPaper.pricingModel !== 'per_sheet') { 
        const width_margin = config.PRINTABLE_AREA_CONFIG.custom_width_margin;
        const height_margin = config.PRINTABLE_AREA_CONFIG.custom_height_margin;
        const printerConfig = Object.values(config.PRINTER_CONFIG)[0]; 
        const pressW_standard = printerConfig ? printerConfig.maxW - width_margin : 32.2; 
        const pressH_max = printerConfig ? printerConfig.maxH : 120.0; 

        const printable_w = pressW_standard; 

        if (productWithBleedW <= printable_w && (productWithBleedH + height_margin) <= pressH_max) {
            let custom_w = pressW_standard + width_margin; 
            let custom_h = productWithBleedH + height_margin;
            sheetsToProcess.push({ w: custom_w, h: custom_h, isCustom: true });
        }
        
        if (productWithBleedH <= printable_w && (productWithBleedW + height_margin) <= pressH_max) {
             let custom_w = pressW_standard + width_margin; 
             let custom_h = productWithBleedW + height_margin;
             if (!sheetsToProcess.some(s => Math.abs(s.w - custom_w) < 0.01 && Math.abs(s.h - custom_h) < 0.01)) { 
                 sheetsToProcess.push({ w: custom_w, h: custom_h, isCustom: true });
             }
        }
    } else {
        config.COMMON_SHEET_SIZES.forEach(sheet => {
             sheetsToProcess.push({ w: sheet.w, h: sheet.h, isCustom: false });
         });
    }

    for (const printerKey in config.PRINTER_CONFIG) {
        const printer = config.PRINTER_CONFIG[printerKey];
        sheetsToProcess.forEach(sheet => {
            processSheet(sheet.w, sheet.h, largeSheet, printer, params, productWithBleedW, productWithBleedH, allResults, largeSheetPrice, spacing, isDigitalCutting, config, sheet.isCustom);
            if (sheet.w !== sheet.h && !sheet.isCustom) {
                 processSheet(sheet.h, sheet.w, largeSheet, printer, params, productWithBleedW, productWithBleedH, allResults, largeSheetPrice, spacing, isDigitalCutting, config, sheet.isCustom);
            }
        });
    }
}

export function calculateFoilStamping(params, config) {
    if (params.foilStamping !== 'yes') return { totalCost: 0, impressionPrice: 0, moldCost: 0, rollsInfo: null };

    const cfg = config.EP_KIM_CONFIG;
    const H = params.foilCustomSize ? (parseFloat(params.foilH) || 0) : (parseFloat(params.productH) || 0);
    const W = params.foilCustomSize ? (parseFloat(params.foilW) || 0) : (parseFloat(params.productW) || 0);
    const quantity = parseInt(params.productQuantity, 10) || 0;
    const isSpecial = params.foilSpecialColor || false;

    if (H <= 0 || W <= 0 || quantity <= 0) return { totalCost: 0, impressionPrice: 0, moldCost: 0, rollsInfo: null };

    const areaForCalc = (H + 1) * (W + 1);
    const sizeThreshold = cfg.thresholdW * cfg.thresholdH;
    const isSmall = areaForCalc <= sizeThreshold;

    // A. Chi phí ép kim
    const rawPricePerImpression = areaForCalc * cfg.pricePerArea;
    const minPricePerImpression = isSpecial ? cfg.minPriceSpecial : cfg.minPriceNormal;
    const pricePerImpression = Math.max(rawPricePerImpression, minPricePerImpression);
    const totalImpressionPriceRaw = pricePerImpression * quantity;
    const minTotalStampingPrice = isSmall ? cfg.minTotalSmall : cfg.minTotalLarge;
    const finalImpressionPrice = Math.max(totalImpressionPriceRaw, minTotalStampingPrice);

    // B. Chi phí làm khuôn
    const moldShippingFee = isSmall ? cfg.shippingSmall : cfg.shippingLarge;
    const moldMakingCost = (areaForCalc * cfg.moldPerArea) + moldShippingFee;

    const totalCost = finalImpressionPrice + moldMakingCost;

    // C. Ước tính cuộn nhũ
    const rollLengthCm = cfg.foilRollLengthM * 100;
    const opt1FoilWidth = H + cfg.foilPadWidth;
    const opt1ImprLen = W + cfg.foilPadLength;
    const opt1PerRoll = opt1ImprLen > 0 ? Math.floor(rollLengthCm / opt1ImprLen) : 0;
    const opt1Rolls = opt1PerRoll > 0 ? Math.ceil(quantity / opt1PerRoll) : Infinity;

    const opt2FoilWidth = W + cfg.foilPadWidth;
    const opt2ImprLen = H + cfg.foilPadLength;
    const opt2PerRoll = opt2ImprLen > 0 ? Math.floor(rollLengthCm / opt2ImprLen) : 0;
    const opt2Rolls = opt2PerRoll > 0 ? Math.ceil(quantity / opt2PerRoll) : Infinity;

    return {
        totalCost,
        impressionPrice: finalImpressionPrice,
        moldCost: moldMakingCost,
        pricePerImpression,
        areaForCalc,
        isSmall,
        rollsInfo: {
            opt1: { foilWidth: opt1FoilWidth, imprLen: opt1ImprLen, perRoll: opt1PerRoll, rolls: opt1Rolls },
            opt2: { foilWidth: opt2FoilWidth, imprLen: opt2ImprLen, perRoll: opt2PerRoll, rolls: opt2Rolls },
            bestRolls: Math.min(opt1Rolls, opt2Rolls)
        }
    };
}
