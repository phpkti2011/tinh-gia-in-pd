import React, { useMemo } from 'react';

// Tooltip helper component
const Tooltip = ({ children, text }) => (
    <div className="group relative flex justify-center items-center h-full w-full">
        {children}
        <div className="absolute opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs rounded py-1 px-2 pointer-events-none z-10 bottom-full mb-1 border border-gray-600 shadow-xl whitespace-nowrap">
            {text}
            <svg className="absolute text-gray-900 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xmlSpace="preserve"><polygon className="fill-current border-gray-600" points="0,0 127.5,127.5 255,0"/></svg>
        </div>
    </div>
);

export function LargeSheetVisualizer({ largeW, largeH, cutW, cutH, layouts = [], neededPrintSheets }) {
    const isSwapped = (Math.floor(largeW / cutW) * Math.floor(largeH / cutH) < Math.floor(largeW / cutH) * Math.floor(largeH / cutW));
    
    // Fallback simple layout if none provided by complex logic
    let rects = layouts.length > 0 ? layouts : [];
    if (rects.length === 0 && cutW > 0 && cutH > 0) {
        const pW = isSwapped ? cutH : cutW;
        const pH = isSwapped ? cutW : cutH;
        const numCols = Math.floor(largeW / pW);
        const numRows = Math.floor(largeH / pH);
        for (let j = 0; j < numRows; j++) {
            for (let i = 0; i < numCols; i++) {
                rects.push({ x: i * pW, y: j * pH, w: pW, h: pH });
            }
        }
    }

    const { scale, containerH } = useMemo(() => {
        if (!largeW || !largeH) return { scale: 1, containerH: 300 };
        const maxW = 500; 
        const maxH = 400;
        const scaleW = maxW / largeW;
        const scaleH = maxH / largeH;
        const s = Math.min(scaleW, scaleH);
        return { scale: s, containerH: largeH * s };
    }, [largeW, largeH]);

    if (!largeW || !largeH) return <div className="text-gray-500 italic p-4 text-center">Không có dữ liệu khổ lớn</div>;

    const sheetsPerLarge = rects.length || 1;
    const neededLargeSheets = Math.ceil(neededPrintSheets / sheetsPerLarge);

    return (
        <div className="flex flex-col items-center">
            <div 
                className="relative bg-gray-800 border-2 border-gray-500 rounded-sm shadow-2xl relative select-none flex items-center justify-center overflow-hidden" 
                style={{ width: largeW * scale, height: largeH * scale }}
            >
                {/* Background pattern for waste */}
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #1f2937 25%, transparent 25%, transparent 75%, #1f2937 75%, #1f2937), repeating-linear-gradient(45deg, #1f2937 25%, #374151 25%, #374151 75%, #1f2937 75%, #1f2937)', backgroundPosition: '0 0, 10px 10px', backgroundSize: '20px 20px' }}></div>

                {rects.map((r, i) => {
                    const isUsed = i < neededPrintSheets;
                    return (
                        <div 
                            key={i} 
                            className={`absolute border border-blue-500/50 flex items-center justify-center shadow-sm cursor-pointer transition-all duration-300 ${isUsed ? 'bg-blue-500/20 hover:bg-blue-500/40 hover:z-10 hover:border-blue-400 hover:shadow-blue-500/50 shadow-lg scale-95 origin-center rounded-sm' : 'bg-gray-700/50 border-dashed border-gray-600 scale-95'} `}
                            style={{ 
                                left: r.x * scale, 
                                top: r.y * scale, 
                                width: r.w * scale, 
                                height: r.h * scale 
                            }}
                        >
                            <Tooltip text={`Tờ cắt: ${r.w} x ${r.h} cm`}>
                                {isUsed && <span className="text-blue-100 font-bold drop-shadow-md text-sm sm:text-lg">{i + 1}</span>}
                            </Tooltip>
                        </div>
                    )
                })}
            </div>
            
            <div className="mt-6 text-center">
                <p className="text-gray-300 font-medium">Khổ lớn: <span className="text-yellow-400">{largeW} x {largeH} cm</span></p>
                <p className="text-sm font-semibold mt-2 text-gray-400">
                    Cắt được: <span className="text-white bg-gray-700 px-2 py-1 rounded">{sheetsPerLarge} tờ con / 1 lớn</span>
                </p>
                <div className="mt-3 inline-flex bg-blue-900/30 border border-blue-500/30 rounded-full px-4 py-1.5 text-blue-300 text-sm font-semibold shadow-inner">
                    Cầm {neededPrintSheets} tờ con ➔ Xuất kho {neededLargeSheets} tờ lớn
                </div>
            </div>
        </div>
    );
}

export function PrintSheetVisualizer({ printW, printH, printableArea, prodW, prodH, productsPerSheet, spacing }) {
    
    let rects = [];
    const itemW_s = prodW + spacing; 
    const itemH_s = prodH + spacing; 
    
    // Re-run imposition layout algorithm purely for rendering coords
    const paW = printableArea?.w || printW;
    const paH = printableArea?.h || printH;
    
    const fitW1 = itemW_s > 0 ? Math.floor((paW + spacing) / itemW_s) : 0;
    const fitH1 = itemH_s > 0 ? Math.floor((paH + spacing) / itemH_s) : 0;
    const total1 = fitW1 * fitH1;
    
    const fitW2 = itemH_s > 0 ? Math.floor((paW + spacing) / itemH_s) : 0;
    const fitH2 = itemW_s > 0 ? Math.floor((paH + spacing) / itemW_s) : 0;
    const total2 = fitW2 * fitH2; 

    let itemW_final, itemH_final, cols, rows; 
    if (total1 > 0 && total1 >= total2) { 
        itemW_final = prodW; itemH_final = prodH; 
        cols = fitW1; rows = fitH1; 
    } else if (total2 > 0) { 
        itemW_final = prodH; itemH_final = prodW; 
        cols = fitW2; rows = fitH2; 
    } else {
        cols = 0; rows = 0;
    }

    const { scale, containerH } = useMemo(() => {
        if (!printW || !printH) return { scale: 1, containerH: 300 };
        const maxW = 500; 
        const maxH = 400;
        const scaleW = maxW / printW;
        const scaleH = maxH / printH;
        const s = Math.min(scaleW, scaleH);
        return { scale: s, containerH: printH * s };
    }, [printW, printH]);

    if (!printW || !printH) return <div className="text-gray-500 italic p-4 text-center">Không có dữ liệu tờ in</div>;

    const printableScaleW = paW * scale;
    const printableScaleH = paH * scale;
    const printableStartX = ((printW * scale) - printableScaleW) / 2;
    const printableStartY = ((printH * scale) - printableScaleH) / 2;

    const gridW = cols * (itemW_final * scale) + Math.max(0, cols-1) * (spacing * scale); 
    const gridH = rows * (itemH_final * scale) + Math.max(0, rows-1) * (spacing * scale); 
    const gridStartX = printableStartX + (printableScaleW - gridW) / 2; 
    const gridStartY = printableStartY + (printableScaleH - gridH) / 2; 

    let idx = 0;
    for (let j = 0; j < rows; j++) { 
        for (let i = 0; i < cols; i++) { 
            idx++;
            rects.push({
                idx,
                x: gridStartX + i * (itemW_final * scale + spacing * scale),
                y: gridStartY + j * (itemH_final * scale + spacing * scale),
                w: itemW_final * scale,
                h: itemH_final * scale
            });
        }
    }

    return (
        <div className="flex flex-col items-center">
            <div 
                className="relative bg-[#ececec] border border-gray-400 rounded-sm shadow-[0_20px_50px_rgba(0,0,0,0.5)] select-none flex items-center justify-center overflow-hidden" 
                style={{ width: printW * scale, height: printH * scale }}
            >
                {/* Print Sheet dimensions label */}
                <div className="absolute top-1 left-2 text-[10px] text-gray-500 font-mono">Tờ In: {printW}x{printH}</div>

                {/* Printable Area dashed box */}
                <div 
                    className="absolute border-2 border-dashed border-red-400/50 bg-white shadow-inner"
                    style={{ left: printableStartX, top: printableStartY, width: printableScaleW, height: printableScaleH }}
                >
                    <div className="absolute -top-4 -left-0 text-[9px] text-red-500 tracking-wider">VÙNG IN MAXIMUM</div>
                </div>

                {/* Product Layout Grid */}
                {cols === 0 && rows === 0 ? (
                    <div className="absolute bg-black/60 text-white px-4 py-2 rounded-lg font-bold">Không Vừa Thêm Sản Phẩm</div>
                ) : (
                    rects.map(r => (
                        <div 
                            key={r.idx} 
                            className="absolute bg-gradient-to-br from-blue-500/30 to-blue-600/30 border border-blue-600 shadow-md flex items-center justify-center cursor-help hover:from-blue-400/50 hover:to-blue-500/50 transition-colors rounded-sm group overflow-hidden"
                            style={{ 
                                left: r.x, top: r.y, width: r.w, height: r.h 
                            }}
                        >
                            <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <Tooltip text={`Sản phẩm: ${itemW_final} x ${itemH_final} cm`}>
                                <span className="text-blue-900 font-black drop-shadow-[0_1px_1px_rgba(255,255,255,1)] text-xs sm:text-base z-10">{r.idx}</span>
                            </Tooltip>
                        </div>
                    ))
                )}
            </div>

            <div className="mt-6 text-center">
                <p className="text-gray-300 font-medium">Khổ in cắt: <span className="text-yellow-400">{printW} x {printH} cm</span></p>
                <div className="mt-3 flex gap-4 justify-center items-center">
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 rounded-sm border-dashed border border-red-400 bg-white inline-block mr-2"></span>
                        Vùng chạy máy
                    </span>
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 rounded-sm border border-blue-500 bg-blue-500/30 inline-block mr-2"></span>
                        Thành phẩm
                    </span>
                </div>
            </div>
        </div>
    );
}
