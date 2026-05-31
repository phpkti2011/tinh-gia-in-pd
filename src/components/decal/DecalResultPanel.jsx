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

    const { count, cols, rows, type, orientation, itemW, itemH, printableW, printableH,
            cols_full, cols_staggered, pattern } = layout;
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
            const vertSpacing = d * Math.sqrt(3) / 2;
            // Content size for centering
            const contentH = rows > 0 ? (rows - 1) * vertSpacing + sw : 0;
            const fullW = cols_full > 0 ? (cols_full - 1) * d + sw : 0;
            const stagW = cols_staggered > 0 && rows > 1 ? (cols_staggered - 1) * d + r + sw / 2 : 0;
            const contentW = Math.max(fullW, stagW);
            const fCW = orientation === 'vertical' ? contentW : contentH;
            const fCH = orientation === 'vertical' ? contentH : contentW;
            const offX = paLeft + (paW - fCW) / 2;
            const offY = paTop + (paH - fCH) / 2;

            let idx = 0;
            for (let i = 0; i < rows; i++) {
                const isStaggered = (pattern === 'full_first' && i % 2 !== 0) || (pattern === 'staggered_first' && i % 2 === 0);
                const numCols = isStaggered ? cols_staggered : cols_full;
                for (let j = 0; j < numCols; j++) {
                    idx++;
                    const xOff = isStaggered ? r : 0;
                    const cx = j * d + sw / 2 + xOff;
                    const cy = i * vertSpacing + sw / 2;
                    const drawX = orientation === 'vertical' ? cx : cy;
                    const drawY = orientation === 'vertical' ? cy : cx;
                    items.push(
                        <div key={idx} style={{
                            position: 'absolute', left: offX + drawX - sw / 2, top: offY + drawY - sh / 2,
                            width: sw, height: sh, borderRadius: '50%',
                            background: 'rgba(59,130,246,0.5)', border: '1px solid rgba(96,165,250,0.8)',
                        }} />
                    );
                }
            }
        } else {
            // Grid layout — itemW/itemH đã được xoay trong calculator, không cần hoán đổi lại
            const contentW = cols > 0 ? cols * sw + (cols - 1) * g : 0;
            const contentH = rows > 0 ? rows * sh + (rows - 1) * g : 0;
            const offX = paLeft + (paW - contentW) / 2;
            const offY = paTop + (paH - contentH) / 2;

            let idx = 0;
            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    idx++;
                    if (idx > count) break;
                    const x = offX + c * (sw + g);
                    const y = offY + r * (sh + g);
                    const isCircleShape = shape === 'circle' || shape === 'oval';
                    items.push(
                        <div key={idx} style={{
                            position: 'absolute', left: x, top: y,
                            width: sw, height: sh,
                            borderRadius: isCircleShape ? '50%' : '2px',
                            background: 'rgba(59,130,246,0.5)', border: '1px solid rgba(96,165,250,0.8)',
                        }} />
                    );
                }
            }
        }
        return items;
    }, [layout, scale, gap, shape, orientation, paLeft, paTop, paW, paH]);

    const modeLabel = mode === 'sheet'
        ? `Xếp được: ${sheetsPerPrintSheet} tờ decal / tờ in`
        : `Xếp được: ${count} con / tờ in`;

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center">Sơ Đồ Xếp Hình</h3>
            <div className="relative border-2 border-gray-500 rounded-sm shadow-lg select-none overflow-hidden"
                style={{ width: visW, height: visH, background: '#374151' }}>
                <div className="absolute top-1 left-2 text-[10px] text-gray-400 font-mono z-10">
                    {sheetW} × {sheetH} mm
                </div>
                <div className="absolute border border-dashed border-red-400/50"
                    style={{ left: paLeft, top: paTop, width: paW, height: paH, background: 'rgba(75,85,99,0.4)' }}>
                    <div className="absolute -top-3.5 left-0 text-[9px] text-red-400/70 whitespace-nowrap">
                        Vùng in {printableW}×{printableH} mm
                    </div>
                </div>
                {stickers}
            </div>
            <div className="mt-3 text-center space-y-1">
                <p className="text-gray-300 font-medium">
                    {modeLabel.split(':')[0]}: <span className="text-yellow-400 font-bold">{modeLabel.split(':')[1]}</span>
                </p>
                <p className="text-xs text-gray-500">
                    KT sticker: {itemW} × {itemH} mm · Khoảng cách: {gap} mm
                    {orientation && ` · ${orientation === 'vertical' ? 'Dọc' : 'Ngang'}`}
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

    // Tính grid tờ sticker trên tờ in
    const sw = (orientation === 'vertical' ? itemW : itemH) * scale;
    const sh = (orientation === 'vertical' ? itemH : itemW) * scale;
    const g = gap * scale;
    const cols = Math.floor((paW + g) / (sw + g));
    const rows = Math.floor((paH + g) / (sh + g));
    const contentW = cols > 0 ? cols * sw + (cols - 1) * g : 0;
    const contentH = rows > 0 ? rows * sh + (rows - 1) * g : 0;
    const offX = paLeft + (paW - contentW) / 2;
    const offY = paTop + (paH - contentH) / 2;

    // Mock stickers bên trong mỗi tờ (4 cột x 5 hàng)
    const mockCols = 4, mockRows = 5;
    const mockGap = 2 * scale;

    const sheets = [];
    let idx = 0;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            idx++;
            if (idx > count) break;
            const x = offX + c * (sw + g);
            const y = offY + r * (sh + g);
            const mw = (sw - (mockCols + 1) * mockGap) / mockCols;
            const mh = (sh - (mockRows + 1) * mockGap) / mockRows;
            const mockStickers = [];
            if (mw > 1 && mh > 1) {
                for (let mr = 0; mr < mockRows; mr++) {
                    for (let mc = 0; mc < mockCols; mc++) {
                        mockStickers.push(
                            <div key={`${mr}-${mc}`} style={{
                                position: 'absolute',
                                left: mockGap + mc * (mw + mockGap),
                                top: mockGap + mr * (mh + mockGap),
                                width: mw, height: mh,
                                background: 'rgba(255,255,255,0.5)',
                                borderRadius: '1px',
                            }} />
                        );
                    }
                }
            }
            sheets.push(
                <div key={idx} style={{
                    position: 'absolute', left: x, top: y, width: sw, height: sh,
                    background: 'rgba(107,114,128,0.6)',
                    border: '1px solid rgba(55,65,81,0.7)',
                    borderRadius: '2px',
                }}>
                    {mockStickers}
                </div>
            );
        }
    }

    return (
        <div className="flex flex-col items-center">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center">Sơ Đồ Xếp Tờ Sticker</h3>
            <div className="relative border-2 border-gray-500 rounded-sm shadow-lg select-none overflow-hidden"
                style={{ width: visW, height: visH, background: '#374151' }}>
                <div className="absolute top-1 left-2 text-[10px] text-gray-400 font-mono z-10">
                    Tờ in: {sheetW} × {sheetH} mm
                </div>
                <div className="absolute border border-dashed border-red-400/50"
                    style={{ left: paLeft, top: paTop, width: paW, height: paH, background: 'rgba(75,85,99,0.4)' }}>
                    <div className="absolute -top-3.5 left-0 text-[9px] text-red-400/70 whitespace-nowrap">
                        Vùng in {printableW}×{printableH} mm
                    </div>
                </div>
                {sheets}
            </div>
            <div className="mt-3 text-center space-y-1">
                <p className="text-gray-300 font-medium">
                    Xếp được: <span className="text-yellow-400 font-bold">{count} tờ</span> / tờ in lớn
                </p>
                <p className="text-xs text-gray-500">
                    KT tờ sticker: {itemW} × {itemH} mm · {orientation === 'vertical' ? 'Dọc' : 'Ngang'}
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

function PriceTable({ priceTable }) {
    if (!priceTable || priceTable.length === 0) {
        return <p className="text-gray-500 text-center italic py-4">Không có dữ liệu giá.</p>;
    }

    const fmt = (v) => v != null && !isNaN(v) ? Math.round(v).toLocaleString('vi-VN') + ' đ' : '—';

    const groups = [];
    let cur = null;
    priceTable.forEach((row) => {
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
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center border-b border-gray-700 pb-2">Bảng Giá Decal</h3>
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full text-xs table-auto text-left">
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Số Lượng</th>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Loại Decal</th>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Thành Phẩm</th>
                            <th className="p-2 border-b border-gray-700 bg-gray-700 text-gray-300 text-right font-semibold">Thành Tiền</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tableRows.map((row, idx) => {
                            const isCus = row.isCustom;
                            const cls = isCus ? 'bg-blue-900/30 border-b border-blue-500/30' : 'border-b border-gray-700/50 hover:bg-gray-700/30';
                            return (
                                <tr key={idx} className={`transition-colors ${cls}`}>
                                    {row.isFirst && (
                                        <td className={`p-2 text-center font-bold ${isCus ? 'text-yellow-300' : 'text-gray-200'}`} rowSpan={row.groupSize}>
                                            {row.quantity.toLocaleString('vi-VN')}
                                            {isCus && <span className="block text-[9px] text-yellow-400/80 font-normal">(tùy chỉnh)</span>}
                                        </td>
                                    )}
                                    <td className="p-2 text-center text-gray-300">{row.decalType}</td>
                                    <td className="p-2 text-center text-gray-300">{row.laminated ? 'Có cán màng' : 'Không cán'}</td>
                                    <td className={`p-2 text-right font-semibold ${isCus ? 'text-yellow-300' : 'text-green-400'}`}>{fmt(row.price)}</td>
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
    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">Nhập kích thước để xem báo giá.</p>
                </div>
            </div>
        );
    }

    const vizParams = { ...params, stickerGap: config.stickerGap };

    return (
        <div className="transition-opacity duration-300" style={{ opacity: isCalculating ? 0.5 : 1 }}>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                {result.mode === 'sheet'
                    ? <SheetLayoutVisualization result={result} params={vizParams} />
                    : <LayoutVisualization result={result} params={vizParams} />
                }
            </div>
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <PriceTable priceTable={result.priceTable} />
            </div>
        </div>
    );
}
