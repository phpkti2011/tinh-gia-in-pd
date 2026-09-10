import { useMemo } from 'react';

// P3-LINT.2: wrapper guard pattern.
// Trước: LayoutVisualization có `if (!layout) return null` rồi gọi useMemo →
// vi phạm rules-of-hooks (hooks must be called same order every render).
// Sau: outer wrapper guard, inner content component chỉ render khi guards
// pass → useMemo trong inner luôn được gọi same order. Behavior identical.
function LayoutVisualization({ result, params }) {
    const { layout, sheetW, sheetH } = result;
    if (!layout || !sheetW || !sheetH || layout.count <= 0) return null;
    return <LayoutVisualizationContent result={result} params={params} />;
}

function LayoutVisualizationContent({ result, params }) {
    const { layout, sheetW, sheetH, mode, sheetsPerPrintSheet } = result;

    const {
        count,
        cols,
        rows,
        type,
        orientation,
        itemW,
        itemH,
        printableW,
        printableH,
        cols_full,
        cols_staggered,
        pattern,
    } = layout;
    const gap = params?.stickerGap || 2;
    const shape = params?.shape || 'rectangle';

    const MAX_VIS_W = 320;
    const MAX_VIS_H = 280;
    const scale = Math.min(MAX_VIS_W / sheetW, MAX_VIS_H / sheetH);
    const visW = sheetW * scale;
    const visH = sheetH * scale;
    const paW = printableW * scale;
    const paH = printableH * scale;
    const paLeft = (visW - paW) / 2;
    const paTop = (visH - paH) / 2;

    const stickers = useMemo(() => {
        const items = [];
        const g = gap * scale;
        const sw = itemW * scale;
        const sh = itemH * scale;

        if (type === 'hexagonal') {
            const d = (itemW + gap) * scale;
            const r = d / 2;
            const vertSpacing = (d * Math.sqrt(3)) / 2;
            // Content size for centering
            const contentH = rows > 0 ? (rows - 1) * vertSpacing + sw : 0;
            const fullW = cols_full > 0 ? (cols_full - 1) * d + sw : 0;
            const stagW =
                cols_staggered > 0 && rows > 1 ? (cols_staggered - 1) * d + r + sw / 2 : 0;
            const contentW = Math.max(fullW, stagW);
            const fCW = orientation === 'vertical' ? contentW : contentH;
            const fCH = orientation === 'vertical' ? contentH : contentW;
            const offX = paLeft + (paW - fCW) / 2;
            const offY = paTop + (paH - fCH) / 2;

            let idx = 0;
            for (let i = 0; i < rows; i++) {
                const isStaggered =
                    (pattern === 'full_first' && i % 2 !== 0) ||
                    (pattern === 'staggered_first' && i % 2 === 0);
                const numCols = isStaggered ? cols_staggered : cols_full;
                for (let j = 0; j < numCols; j++) {
                    idx++;
                    const xOff = isStaggered ? r : 0;
                    const cx = j * d + sw / 2 + xOff;
                    const cy = i * vertSpacing + sw / 2;
                    const drawX = orientation === 'vertical' ? cx : cy;
                    const drawY = orientation === 'vertical' ? cy : cx;
                    items.push(
                        <div
                            key={idx}
                            style={{
                                position: 'absolute',
                                left: offX + drawX - sw / 2,
                                top: offY + drawY - sh / 2,
                                width: sw,
                                height: sh,
                                borderRadius: '50%',
                                background: 'rgba(59,130,246,0.5)',
                                border: '1px solid rgba(96,165,250,0.8)',
                            }}
                        />
                    );
                }
            }
        } else {
            // Xếp hỗn hợp: vẽ theo từng khối (block) tại offset trong vùng in (gốc góc trên-trái).
            // Fallback: nếu không có blocks thì dựng 1 khối từ cols/rows/itemW/itemH (canh giữa).
            const isCircleShape = shape === 'circle' || shape === 'oval';
            let blocks = layout.blocks;
            let originX = paLeft;
            let originY = paTop;
            if (!blocks || blocks.length === 0) {
                blocks = [{ x: 0, y: 0, iw: itemW, ih: itemH, cols, rows }];
                const contentW = cols > 0 ? cols * sw + (cols - 1) * g : 0;
                const contentH = rows > 0 ? rows * sh + (rows - 1) * g : 0;
                originX = paLeft + (paW - contentW) / 2;
                originY = paTop + (paH - contentH) / 2;
            }
            let idx = 0;
            for (const b of blocks) {
                const bw = b.iw * scale;
                const bh = b.ih * scale;
                for (let r = 0; r < b.rows; r++) {
                    for (let c = 0; c < b.cols; c++) {
                        idx++;
                        const x = originX + (b.x * scale + c * (bw + g));
                        const y = originY + (b.y * scale + r * (bh + g));
                        items.push(
                            <div
                                key={idx}
                                style={{
                                    position: 'absolute',
                                    left: x,
                                    top: y,
                                    width: bw,
                                    height: bh,
                                    borderRadius: isCircleShape ? '50%' : '2px',
                                    background: 'rgba(59,130,246,0.5)',
                                    border: '1px solid rgba(96,165,250,0.8)',
                                }}
                            />
                        );
                    }
                }
            }
        }
        return items;
    }, [
        layout,
        scale,
        gap,
        shape,
        orientation,
        paLeft,
        paTop,
        paW,
        paH,
        cols,
        rows,
        itemW,
        itemH,
        type,
        cols_full,
        cols_staggered,
        pattern,
    ]);

    const modeLabel =
        mode === 'sheet'
            ? `Xếp được: ${sheetsPerPrintSheet} tờ decal / tờ in`
            : `Xếp được: ${count} con / tờ in`;

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center">
                Sơ Đồ Xếp Hình
            </h3>
            <div
                className="relative border-2 border-gray-500 rounded-sm shadow-lg select-none overflow-hidden"
                style={{ width: visW, height: visH, background: '#374151' }}
            >
                <div className="absolute top-1 left-2 text-[10px] text-gray-400 font-mono z-10">
                    {sheetW} × {sheetH} mm
                </div>
                <div
                    className="absolute border border-dashed border-red-400/50"
                    style={{
                        left: paLeft,
                        top: paTop,
                        width: paW,
                        height: paH,
                        background: 'rgba(75,85,99,0.4)',
                    }}
                >
                    <div className="absolute -top-3.5 left-0 text-[9px] text-red-400/70 whitespace-nowrap">
                        Vùng in {printableW}×{printableH} mm
                    </div>
                </div>
                {stickers}
            </div>
            <div className="mt-3 text-center space-y-1">
                <p className="text-gray-300 font-medium">
                    {modeLabel.split(':')[0]}:{' '}
                    <span className="text-yellow-400 font-bold">{modeLabel.split(':')[1]}</span>
                </p>
                <p className="text-xs text-gray-500">
                    KT sticker: {itemW} × {itemH} mm · Khoảng cách: {gap} mm
                    {orientation &&
                        ` · ${orientation === 'vertical' ? 'Dọc' : orientation === 'horizontal' ? 'Ngang' : 'Hỗn hợp'}`}
                </p>
                <div className="flex gap-4 justify-center items-center mt-1">
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 border-dashed border border-red-400/50 bg-gray-600/40 inline-block mr-1 rounded-sm"></span>
                        Vùng in
                    </span>
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 border border-blue-500/80 bg-blue-500/50 inline-block mr-1 rounded-sm"></span>
                        Sticker
                    </span>
                </div>
            </div>
        </div>
    );
}

// Sơ đồ cho chế độ Tờ Sticker — vẽ tờ sticker (A4) trên tờ in lớn, bên trong mỗi tờ có mock sticker nhỏ
function SheetLayoutVisualization({ result, params }) {
    const { layout, sheetW, sheetH } = result;
    if (!layout || !sheetW || !sheetH || layout.count <= 0) return null;

    const { count, orientation, itemW, itemH, printableW, printableH } = layout;
    const gap = params?.stickerGap || 2;

    const MAX_VIS_W = 320;
    const MAX_VIS_H = 280;
    const scale = Math.min(MAX_VIS_W / sheetW, MAX_VIS_H / sheetH);
    const visW = sheetW * scale;
    const visH = sheetH * scale;
    const paW = printableW * scale;
    const paH = printableH * scale;
    const paLeft = (visW - paW) / 2;
    const paTop = (visH - paH) / 2;

    const g = gap * scale;
    // Mock stickers bên trong mỗi tờ (4 cột x 5 hàng)
    const mockCols = 4,
        mockRows = 5;
    const mockGap = 2 * scale;

    // Vẽ theo khối (block) xếp hỗn hợp; gốc góc trên-trái vùng in. Fallback 1 khối canh giữa.
    let blocks = layout.blocks;
    let originX = paLeft;
    let originY = paTop;
    if (!blocks || blocks.length === 0) {
        const fiw = orientation === 'vertical' ? itemW : itemH;
        const fih = orientation === 'vertical' ? itemH : itemW;
        const fcols = Math.floor((paW + g) / (fiw * scale + g));
        const frows = Math.floor((paH + g) / (fih * scale + g));
        blocks = [{ x: 0, y: 0, iw: fiw, ih: fih, cols: fcols, rows: frows }];
        const contentW = fcols > 0 ? fcols * fiw * scale + (fcols - 1) * g : 0;
        const contentH = frows > 0 ? frows * fih * scale + (frows - 1) * g : 0;
        originX = paLeft + (paW - contentW) / 2;
        originY = paTop + (paH - contentH) / 2;
    }

    const sheets = [];
    let idx = 0;
    for (const b of blocks) {
        const sw = b.iw * scale;
        const sh = b.ih * scale;
        for (let r = 0; r < b.rows; r++) {
            for (let c = 0; c < b.cols; c++) {
                idx++;
                const x = originX + (b.x * scale + c * (sw + g));
                const y = originY + (b.y * scale + r * (sh + g));
                const mw = (sw - (mockCols + 1) * mockGap) / mockCols;
                const mh = (sh - (mockRows + 1) * mockGap) / mockRows;
                const mockStickers = [];
                if (mw > 1 && mh > 1) {
                    for (let mr = 0; mr < mockRows; mr++) {
                        for (let mc = 0; mc < mockCols; mc++) {
                            mockStickers.push(
                                <div
                                    key={`${mr}-${mc}`}
                                    style={{
                                        position: 'absolute',
                                        left: mockGap + mc * (mw + mockGap),
                                        top: mockGap + mr * (mh + mockGap),
                                        width: mw,
                                        height: mh,
                                        background: 'rgba(255,255,255,0.5)',
                                        borderRadius: '1px',
                                    }}
                                />
                            );
                        }
                    }
                }
                sheets.push(
                    <div
                        key={idx}
                        style={{
                            position: 'absolute',
                            left: x,
                            top: y,
                            width: sw,
                            height: sh,
                            background: 'rgba(107,114,128,0.6)',
                            border: '1px solid rgba(55,65,81,0.7)',
                            borderRadius: '2px',
                        }}
                    >
                        {mockStickers}
                    </div>
                );
            }
        }
    }

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center">
                Sơ Đồ Xếp Tờ Sticker
            </h3>
            <div
                className="relative border-2 border-gray-500 rounded-sm shadow-lg select-none overflow-hidden"
                style={{ width: visW, height: visH, background: '#374151' }}
            >
                <div className="absolute top-1 left-2 text-[10px] text-gray-400 font-mono z-10">
                    Tờ in: {sheetW} × {sheetH} mm
                </div>
                <div
                    className="absolute border border-dashed border-red-400/50"
                    style={{
                        left: paLeft,
                        top: paTop,
                        width: paW,
                        height: paH,
                        background: 'rgba(75,85,99,0.4)',
                    }}
                >
                    <div className="absolute -top-3.5 left-0 text-[9px] text-red-400/70 whitespace-nowrap">
                        Vùng in {printableW}×{printableH} mm
                    </div>
                </div>
                {sheets}
            </div>
            <div className="mt-3 text-center space-y-1">
                <p className="text-gray-300 font-medium">
                    Xếp được: <span className="text-yellow-400 font-bold">{count} tờ</span> / tờ in
                    lớn
                </p>
                <p className="text-xs text-gray-500">
                    KT tờ sticker: {itemW} × {itemH} mm ·{' '}
                    {orientation === 'vertical'
                        ? 'Dọc'
                        : orientation === 'horizontal'
                          ? 'Ngang'
                          : 'Hỗn hợp'}
                </p>
                <div className="flex gap-4 justify-center items-center mt-1">
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 border-dashed border border-red-400/50 bg-gray-600/40 inline-block mr-1 rounded-sm"></span>
                        Vùng in
                    </span>
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 bg-gray-500/60 border border-gray-600 inline-block mr-1 rounded-sm"></span>
                        Tờ sticker
                    </span>
                    <span className="flex items-center text-xs text-gray-400">
                        <span className="w-3 h-3 bg-white/50 inline-block mr-1 rounded-sm"></span>
                        Tem
                    </span>
                </div>
            </div>
        </div>
    );
}

// Bảng giá SO SÁNH nhiều máy bế — mỗi máy 1 cột giá. Zip các priceTable theo index
// (cùng thứ tự hàng: quantity × decalType × lamination).
function ComparisonPriceTable({ machines, mode, discountPercent = 0 }) {
    const list = machines || [];
    const base = list[0]?.priceTable || [];
    if (list.length === 0 || base.length === 0) {
        return (
            <p className="text-gray-500 text-center italic py-4">
                Loại decal đang chọn không có ở khổ này.
            </p>
        );
    }

    const fmt = (v) =>
        v != null && !isNaN(v) ? Math.round(v).toLocaleString('vi-VN') + ' đ' : '—';
    const perSheetLabel = mode === 'sheet' ? 'tờ/tờ in' : 'con/tờ';
    const hasDiscount = discountPercent > 0;

    // Gộp hàng: mỗi hàng lấy giá (đã giảm) + giá gốc + cờ chạm sàn theo từng máy.
    let anyFloored = false;
    const merged = base.map((row, i) => ({
        quantity: row.quantity,
        decalType: row.decalType,
        laminated: row.laminated,
        isCustom: row.isCustom,
        cells: list.map((m) => {
            const r = m.priceTable[i] || {};
            if (r.floored) anyFloored = true;
            return {
                base: r.price,
                price: r.finalPrice != null ? r.finalPrice : r.price,
                floored: !!r.floored,
            };
        }),
    }));

    const groups = [];
    let cur = null;
    merged.forEach((row) => {
        if (!cur || cur.quantity !== row.quantity) {
            cur = { quantity: row.quantity, rows: [row] };
            groups.push(cur);
        } else {
            cur.rows.push(row);
        }
    });
    const tableRows = [];
    groups.forEach((g) => {
        g.rows.forEach((row, i) => {
            tableRows.push({ ...row, isFirst: i === 0, groupSize: g.rows.length });
        });
    });

    return (
        <div className="mt-4">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center border-b border-gray-700 pb-2">
                Bảng Giá Decal {list.length > 1 && '(so sánh theo máy)'}
                {hasDiscount && (
                    <span className="ml-1 text-amber-400">· Đã giảm {discountPercent}%</span>
                )}
            </h3>
            {anyFloored && (
                <div className="mb-3 rounded border border-amber-500/60 bg-amber-900/30 px-3 py-2 text-xs text-amber-300">
                    ⚠ Một số mức giá đã chạm giá tối thiểu — không thể giảm thêm (ô tô đỏ).
                </div>
            )}
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs table-auto text-left">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">
                                Số Lượng
                            </th>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">
                                Loại Decal
                            </th>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">
                                Cán màng
                            </th>
                            {list.map((m, i) => (
                                <th
                                    key={i}
                                    className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-right font-semibold"
                                >
                                    {m.name}
                                    <span className="block text-[9px] text-cyan-400/80 font-normal">
                                        {m.layout?.count ?? 0} {perSheetLabel}
                                    </span>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows.map((row, idx) => {
                            const isCus = row.isCustom;
                            const cls = isCus
                                ? 'bg-blue-900/30 border-b border-blue-500/30'
                                : 'border-b border-gray-700/50 hover:bg-gray-700/30';
                            return (
                                <tr key={idx} className={`transition-colors ${cls}`}>
                                    {row.isFirst && (
                                        <td
                                            className={`p-2 text-center font-bold ${isCus ? 'text-yellow-300' : 'text-gray-200'}`}
                                            rowSpan={row.groupSize}
                                        >
                                            {row.quantity.toLocaleString('vi-VN')}
                                            {isCus && (
                                                <span className="block text-[9px] text-yellow-400/80 font-normal">
                                                    (tùy chỉnh)
                                                </span>
                                            )}
                                        </td>
                                    )}
                                    <td className="p-2 text-center text-gray-300">
                                        {row.decalType}
                                    </td>
                                    <td className="p-2 text-center text-gray-300">
                                        {row.laminated ? 'Có cán màng' : 'Không cán'}
                                    </td>
                                    {row.cells.map((cell, i) => (
                                        <td
                                            key={i}
                                            className={`p-2 text-right font-semibold ${
                                                cell.floored
                                                    ? 'bg-red-900/40 text-red-300'
                                                    : isCus
                                                      ? 'text-yellow-300'
                                                      : 'text-green-400'
                                            }`}
                                        >
                                            {fmt(cell.price)}
                                            {cell.floored && (
                                                <span className="block text-[9px] font-normal text-red-400">
                                                    sàn
                                                </span>
                                            )}
                                            {hasDiscount &&
                                                !cell.floored &&
                                                cell.base != null &&
                                                cell.price < cell.base && (
                                                    <span className="block text-[9px] font-normal text-gray-500 line-through">
                                                        {fmt(cell.base)}
                                                    </span>
                                                )}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function DecalResultPanel({ result, params, config, isCalculating }) {
    if (!result || !result.machines || result.machines.length === 0) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập kích thước để xem báo giá.
                    </p>
                </div>
            </div>
        );
    }

    const vizParams = { ...params, stickerGap: config.stickerGap };

    return (
        <div
            className="transition-opacity duration-300"
            style={{ opacity: isCalculating ? 0.5 : 1 }}
        >
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.machines.map((m, i) => {
                        // Slice per-máy để tái dùng LayoutVisualization/SheetLayoutVisualization.
                        const mResult = {
                            mode: result.mode,
                            layout: m.layout,
                            sheetW: result.sheetW,
                            sheetH: result.sheetH,
                            sheetsPerPrintSheet: m.sheetsPerPrintSheet,
                        };
                        return (
                            <div key={i} className="flex flex-col items-center">
                                <div className="text-sm font-semibold text-cyan-400 mb-1">
                                    Máy: {m.name}
                                </div>
                                {result.mode === 'sheet' ? (
                                    <SheetLayoutVisualization result={mResult} params={vizParams} />
                                ) : (
                                    <LayoutVisualization result={mResult} params={vizParams} />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <ComparisonPriceTable
                    machines={result.machines}
                    mode={result.mode}
                    discountPercent={result.discountPercent || 0}
                />
            </div>
        </div>
    );
}
