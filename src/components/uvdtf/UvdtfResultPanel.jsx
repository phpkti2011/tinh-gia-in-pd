import { useMemo } from 'react';

const fmt = (v) => v != null && !isNaN(v) ? Math.round(v).toLocaleString('vi-VN') + ' đ' : '—';

function MeterVisualization({ result, config }) {
    const {
        finalItemW, finalItemH, itemsAcross, itemsPerMeter, rowsPerMeter,
        originalW, originalH, rotated,
    } = result;

    // finalItemW/H đang ở đơn vị CM (đã bao gồm padding)
    const printableWidthCM = config.printableWidthCM;

    // Kích thước nội dung thực tế (cm)
    const contentW = itemsAcross * finalItemW; // không cần +gap vì finalItemW đã bao gồm padding
    const contentH = rowsPerMeter * finalItemH;
    const sheetW = Math.max(contentW, printableWidthCM);

    // Scale để fit chiều rộng 100%, max 500px cao
    const MAX_VIS_W = 450;
    const MAX_VIS_H = 600;
    const scaleW = MAX_VIS_W / sheetW;
    const scaleH = contentH > 0 ? MAX_VIS_H / contentH : scaleW;
    const scale = Math.min(scaleW, scaleH);

    const visW = sheetW * scale;
    const visH = contentH * scale;
    const sw = finalItemW * scale - 2; // -2px cho border
    const sh = finalItemH * scale - 2;

    const items = useMemo(() => {
        const rects = [];
        let idx = 0;
        for (let r = 0; r < rowsPerMeter; r++) {
            for (let c = 0; c < itemsAcross; c++) {
                idx++;
                if (idx > itemsPerMeter) break;
                const x = c * finalItemW * scale;
                const y = r * finalItemH * scale;
                const fontSize = Math.max(8, Math.min(12, sw / 7));
                rects.push(
                    <div key={idx} style={{
                        position: 'absolute', left: x + 1, top: y + 1,
                        width: Math.max(sw, 4), height: Math.max(sh, 4),
                        background: '#3b82f6',
                        border: '1px solid #60a5fa',
                        borderRadius: '2px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        overflow: 'hidden',
                    }}>
                        {sw > 30 && sh > 16 && (
                            <span className="text-white font-medium" style={{ fontSize, lineHeight: 1, whiteSpace: 'nowrap' }}>
                                {(originalW / 10).toFixed(1)}x{(originalH / 10).toFixed(1)}cm
                            </span>
                        )}
                    </div>
                );
            }
        }
        return rects;
    }, [sw, sh, scale, finalItemW, finalItemH, itemsAcross, rowsPerMeter, itemsPerMeter, originalW, originalH]);

    // Phần thừa bên phải
    const wasteW = sheetW - contentW;
    const wasteWpx = wasteW * scale;

    return (
        <div className="flex flex-col items-center">
            <p className="text-sm text-gray-300 mb-2">
                Số lượng sản phẩm trên 1 mét tới mô phỏng: <span className="text-yellow-400 font-bold">{itemsPerMeter}</span> sản phẩm
            </p>
            <div className="relative border-2 border-gray-400 rounded select-none overflow-hidden"
                style={{ width: visW, height: visH, background: '#e5e7eb' }}>
                {items}
                {/* Vùng thừa */}
                {wasteWpx > 2 && (
                    <div style={{
                        position: 'absolute', right: 0, top: 0, width: wasteWpx, height: '100%',
                        background: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(156,163,175,0.3) 4px, rgba(156,163,175,0.3) 8px)',
                        borderLeft: '1px dashed #9ca3af',
                    }} />
                )}
            </div>
            <p className="text-xs text-gray-500 mt-2">
                KT tem: {(originalW / 10).toFixed(1)} × {(originalH / 10).toFixed(1)} cm
                {rotated && ' · Đã xoay'}
                {' · '}{itemsAcross} cột × {rowsPerMeter} hàng
                {' · '}Khổ in: {printableWidthCM} cm
            </p>
        </div>
    );
}

export default function UvdtfResultPanel({ result, params: _params, config, isCalculating }) {
    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập kích thước để xem báo giá UV DTF.
                    </p>
                </div>
            </div>
        );
    }

    const {
        totalLengthCM, totalMeters, pricePerMeter, billableMeters,
        totalPrice, rotated, finalItemW, finalItemH, itemsAcross,
        itemsPerMeter, rowsPerMeter, originalW, originalH,
    } = result;

    return (
        <div className="transition-opacity duration-300" style={{ opacity: isCalculating ? 0.5 : 1 }}>
            {/* Price box */}
            <div className="bg-gray-800 p-4 rounded-lg border-2 border-dashed border-yellow-500 mb-4">
                <div className="text-center mb-3">
                    <p className="text-sm text-gray-400 mb-1">Thành tiền</p>
                    <p className="text-3xl font-bold text-yellow-400">{fmt(totalPrice)}</p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div>
                        <p className="text-gray-500 text-xs">Mét tới</p>
                        <p className="text-gray-200 font-semibold">{billableMeters} m</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Đơn giá</p>
                        <p className="text-gray-200 font-semibold">{fmt(pricePerMeter)}/m</p>
                    </div>
                    <div>
                        <p className="text-gray-500 text-xs">Cách xếp</p>
                        <p className="text-gray-200 font-semibold">{rotated ? 'Xoay' : 'Không xoay'}</p>
                    </div>
                </div>
            </div>

            {/* Chi tiết */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
                <h3 className="text-base font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
                    Chi Tiết Tính Toán
                </h3>
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-400">Kích thước gốc</span>
                        <span className="text-gray-200">{originalW} × {originalH} mm</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Kích thước xếp</span>
                        <span className="text-gray-200">
                            {finalItemW} × {finalItemH} mm
                            {rotated && <span className="text-yellow-400 ml-1">(đã xoay)</span>}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Số cột ngang</span>
                        <span className="text-gray-200">{itemsAcross}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Sản phẩm / mét tới</span>
                        <span className="text-gray-200">{itemsPerMeter} ({itemsAcross} cột × {rowsPerMeter} hàng)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Tổng chiều dài thực</span>
                        <span className="text-gray-200">{totalLengthCM} cm ({totalMeters} m)</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Mét tới tính tiền</span>
                        <span className="text-yellow-400 font-semibold">{billableMeters} m</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-400">Đơn giá / mét</span>
                        <span className="text-gray-200">{fmt(pricePerMeter)}</span>
                    </div>
                    <div className="flex justify-between border-t border-gray-700 pt-2">
                        <span className="text-gray-300 font-semibold">Tổng tiền</span>
                        <span className="text-yellow-400 font-bold text-lg">{fmt(totalPrice)}</span>
                    </div>
                </div>
            </div>

            {/* Sơ đồ mô phỏng */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
                <MeterVisualization result={result} config={config} />
            </div>
        </div>
    );
}
