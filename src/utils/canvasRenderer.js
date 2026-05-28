export function drawLargeSheet(canvas, largeW, largeH, cutW, cutH, neededPrintSheets, sheetsPerLarge, layout) { 
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); 
    const canvasW = canvas.width; 
    const canvasH = canvas.height; 
    ctx.clearRect(0, 0, canvasW, canvasH); 
    ctx.fillStyle = "#1f2937"; 
    ctx.fillRect(0,0,canvasW, canvasH); 
    const margin = 60; 
    if (largeW <= 0 || largeH <= 0) return;
    const ratio = Math.min((canvasW - margin) / largeW, (canvasH - margin) / largeH); 
    const drawW = largeW * ratio; 
    const drawH = largeH * ratio; 
    const startX = (canvasW - drawW) / 2; 
    const startY = (canvasH - drawH) / 2; 

    ctx.fillStyle = "#374151"; 
    ctx.strokeStyle = "#9ca3af"; 
    ctx.lineWidth = 1; 
    ctx.fillRect(startX, startY, drawW, drawH); 
    ctx.strokeRect(startX, startY, drawW, drawH); 

    ctx.fillStyle = "rgba(59, 130, 246, 0.2)"; 
    ctx.strokeStyle = "#3b82f6"; 
    ctx.lineWidth = 1.5;

    let totalSheetsOnThisLarge = (typeof sheetsPerLarge === 'number' && sheetsPerLarge > 0) ? sheetsPerLarge : 1;

    if (layout && layout.length > 0) {
        totalSheetsOnThisLarge = layout.length;
        layout.forEach((rect, index) => {
             if (!rect || typeof rect.x !== 'number' || typeof rect.y !== 'number' || typeof rect.w !== 'number' || typeof rect.h !== 'number') return;
            const rectX = startX + rect.x * ratio;
            const rectY = startY + rect.y * ratio;
            const rectW = rect.w * ratio;
            const rectH = rect.h * ratio;
            
            ctx.fillRect(rectX, rectY, rectW, rectH);
            ctx.strokeRect(rectX, rectY, rectW, rectH);
            
            if (index < neededPrintSheets) {
                const fontSize = Math.max(14, Math.min(rectW, rectH) * 0.35); 
                ctx.fillStyle = "#ffffff"; 
                ctx.font = `bold ${fontSize}px Inter`; 
                ctx.textAlign = "center"; 
                ctx.textBaseline = "middle"; 
                ctx.fillText(String(index + 1), rectX + rectW / 2, rectY + rectH / 2);
                ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
            }
        });
    } else {
        if (totalSheetsOnThisLarge > 0 && cutW > 0 && cutH > 0) {
            const isSwapped = (Math.floor(largeW/cutW) * Math.floor(largeH/cutH) < Math.floor(largeW/cutH) * Math.floor(largeH/cutW)); 
            const pW_draw = (isSwapped ? cutH : cutW) * ratio; 
            const pH_draw = (isSwapped ? cutW : cutH) * ratio; 
            const numCols = isSwapped ? (cutH > 0 ? Math.floor(largeW / cutH) : 0) : (cutW > 0 ? Math.floor(largeW / cutW) : 0);
            const numRows = isSwapped ? (cutW > 0 ? Math.floor(largeH / cutW) : 0) : (cutH > 0 ? Math.floor(largeH / cutH) : 0);

            let drawIndex = 0;
            for (let j = 0; j < numRows; j++) { 
                for (let i = 0; i < numCols; i++) { 
                    if (drawIndex >= totalSheetsOnThisLarge) break; 
                    const rectX = startX + i * pW_draw; 
                    const rectY = startY + j * pH_draw; 
                    ctx.fillRect(rectX, rectY, pW_draw, pH_draw); 
                    ctx.strokeRect(rectX, rectY, pW_draw, pH_draw); 
                    drawIndex++; 
                    if (drawIndex <= neededPrintSheets) {
                         const fontSize = Math.max(14, Math.min(pW_draw, pH_draw) * 0.35); 
                         ctx.fillStyle = "#ffffff"; ctx.font = `bold ${fontSize}px Inter`; 
                         ctx.textAlign = "center"; 
                         ctx.textBaseline = "middle"; 
                         ctx.fillText(String(drawIndex), rectX + pW_draw/2, rectY + pH_draw/2); 
                         ctx.fillStyle = "rgba(59, 130, 246, 0.2)";
                    }
                }
                if (drawIndex >= totalSheetsOnThisLarge) break;
            }
        }
    }
    
    const neededLargeSheets = totalSheetsOnThisLarge > 0 ? Math.ceil(neededPrintSheets / totalSheetsOnThisLarge) : 0;
    ctx.fillStyle = "#d1d5db"; 
    ctx.font = "bold 16px Inter"; 
    ctx.textAlign = "center"; 
    ctx.textBaseline = "bottom"; 
    const largeSheetText = totalSheetsOnThisLarge === 1 ? "tờ in" : `tờ lớn (${totalSheetsOnThisLarge} tờ/lớn)`; 
    ctx.fillText(`Cần ${neededPrintSheets} tờ in   ⇒  dùng ${neededLargeSheets} ${largeSheetText}`, canvasW / 2, startY - 30); 
    ctx.font = "14px Inter"; 
    ctx.fillText(`${largeW} cm`, startX + drawW / 2, startY - 10); 
    ctx.save(); 
    ctx.translate(startX - 15, startY + drawH / 2);
    ctx.rotate(-Math.PI / 2); 
    ctx.fillText(`${largeH} cm`, 0, 0); 
    ctx.restore(); 
}

export function drawPrintSheet(canvas, printW, printH, printableArea, prodW, prodH, productsOnThisSheet, productsPerSheet, spacing) { 
    if (!canvas) return;
    const ctx = canvas.getContext('2d'); 
    const canvasW = canvas.width; 
    const canvasH = canvas.height; 
    ctx.clearRect(0, 0, canvasW, canvasH); 
    ctx.fillStyle = "#1f2937"; 
    ctx.fillRect(0,0,canvasW, canvasH); 
    const margin = 60; 
    if (printW <= 0 || printH <= 0) return;
    const ratio = Math.min((canvasW - margin) / printW, (canvasH - margin) / printH); 
    const drawW = printW * ratio; 
    const drawH = printH * ratio; 
    const startX = (canvasW - drawW) / 2; 
    const startY = (canvasH - drawH) / 2; 
    ctx.fillStyle = "#374151"; 
    ctx.strokeStyle = "#9ca3af"; 
    ctx.lineWidth = 2; 
    ctx.fillRect(startX, startY, drawW, drawH); 
    ctx.strokeRect(startX, startY, drawW, drawH); 
     const paW = (printableArea && typeof printableArea.w === 'number') ? printableArea.w : 0;
     const paH = (printableArea && typeof printableArea.h === 'number') ? printableArea.h : 0;
    const printableDrawW = paW * ratio; 
    const printableDrawH = paH * ratio; 
    const printableStartX = startX + (drawW - printableDrawW) / 2; 
    const printableStartY = startY + (drawH - printableDrawH) / 2; 
    ctx.strokeStyle = "rgba(59, 130, 246, 0.7)"; 
    ctx.lineWidth = 1; 
    ctx.setLineDash([5, 3]); 
    ctx.strokeRect(printableStartX, printableStartY, printableDrawW, printableDrawH); 
    ctx.setLineDash([]); 
    const areaW = paW; 
    const areaH = paH; 
     if (prodW <= 0 || prodH <= 0) return;
    const itemW_s = prodW + spacing; 
    const itemH_s = prodH + spacing; 
    const fitW1 = itemW_s > 0 ? Math.floor((areaW + spacing) / itemW_s) : 0;
    const fitH1 = itemH_s > 0 ? Math.floor((areaH + spacing) / itemH_s) : 0;
    const total1 = fitW1 * fitH1;
    const fitW2 = itemH_s > 0 ? Math.floor((areaW + spacing) / itemH_s) : 0;
    const fitH2 = itemW_s > 0 ? Math.floor((areaH + spacing) / itemW_s) : 0;
    const total2 = fitW2 * fitH2; 
    let itemW_final, itemH_final, cols, rows; 
    if (total1 >= total2) { 
        itemW_final = prodW; itemH_final = prodH; 
        cols = fitW1; rows = fitH1; 
    } else { 
        itemW_final = prodH; itemH_final = prodW; 
        cols = fitW2; rows = fitH2; 
    } 
    if (cols === 0 || rows === 0) { 
        ctx.fillStyle = "#d1d5db"; 
        ctx.font = "bold 16px Inter"; 
        ctx.textAlign = "center"; 
        ctx.textBaseline = "middle"; 
        ctx.fillText("Sản phẩm không vừa", canvasW / 2, canvasH / 2); 
        return; 
    } 
    const gridW = cols * (itemW_final * ratio) + Math.max(0, cols-1) * (spacing*ratio) ; 
    const gridH = rows * (itemH_final * ratio) + Math.max(0, rows-1) * (spacing*ratio); 
    const gridStartX = printableStartX + (printableDrawW - gridW) / 2; 
    const gridStartY = printableStartY + (printableDrawH - gridH) / 2; 
    let idx = 0; 
    for (let j = 0; j < rows; j++) { 
        for (let i = 0; i < cols; i++) { 
            idx++; 
            const rectX = gridStartX + i * (itemW_final * ratio + spacing * ratio); 
            const rectY = gridStartY + j * (itemH_final * ratio + spacing * ratio); 
            const rectW = itemW_final * ratio; 
            const rectH = itemH_final * ratio; 
            ctx.fillStyle = "rgba(59, 130, 246, 0.2)"; 
            ctx.strokeStyle = "#3b82f6"; 
            ctx.lineWidth = 1.5; 
            ctx.fillRect(rectX, rectY, rectW, rectH); 
            ctx.strokeRect(rectX, rectY, rectW, rectH); 
            const fontSize = Math.max(12, Math.min(rectW, rectH) * 0.35); 
            ctx.fillStyle = "#ffffff"; 
            ctx.font = `bold ${fontSize}px Inter`; 
            ctx.textAlign = "center"; 
            ctx.textBaseline = "middle"; 
            ctx.fillText(String(idx), rectX + rectW/2, rectY + rectH/2);
        } 
    } 
    ctx.fillStyle = "#d1d5db"; 
    ctx.font = "bold 16px Inter"; 
    ctx.textAlign = "center"; 
    ctx.textBaseline = "bottom"; 
    ctx.fillText(`Tổng sp/tờ: ${productsPerSheet} — Tờ cuối cần: ${productsOnThisSheet} sp`, canvasW / 2, startY - 30); 
    ctx.font = "14px Inter"; 
    ctx.fillText(`${printW.toFixed(2)} cm (Chiều rộng máy)`, startX + drawW / 2, startY - 10); 
    ctx.save(); 
    ctx.translate(startX - 15, startY + drawH / 2); 
    ctx.rotate(-Math.PI / 2); 
    ctx.fillText(`${printH.toFixed(2)} cm (Chiều dài)`, 0, 0); 
    ctx.restore(); 
}
