import { useState, useRef, useEffect } from 'react';

const ITEM_COLORS = [
    'bg-blue-600',
    'bg-green-600',
    'bg-pink-600',
    'bg-orange-600',
    'bg-purple-600',
    'bg-red-600',
    'bg-indigo-600',
    'bg-teal-600',
];
const ITEM_COLORS_ALT = [
    'bg-blue-700',
    'bg-green-700',
    'bg-pink-700',
    'bg-orange-700',
    'bg-purple-700',
    'bg-red-700',
    'bg-indigo-700',
    'bg-teal-700',
];

export default function LPResultPanel({
    result,
    params,
    config,
    isCalculating,
    onChange: _onChange,
}) {
    const [showStickyBar, setShowStickyBar] = useState(false);
    const priceSectionRef = useRef(null);

    useEffect(() => {
        const el = priceSectionRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            ([entry]) => setShowStickyBar(!entry.isIntersecting),
            { threshold: 0 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [result]);

    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Chưa có dữ liệu tính toán. Thay đổi thông số để xem kết quả.
                    </p>
                </div>
            </div>
        );
    }

    const {
        totalCost,
        rollWidth,
        itemDetails,
        totalPanels,
        formexCost,
        standeeCost,
        finishingCost,
        printedArea,
        unprintedArea,
        laminationChoice,
    } = result;

    const cm = (m) => (m * 100).toFixed(1);

    // Build flat list of all panels for visualization
    const allPanels = [];
    itemDetails.forEach((detail, groupIdx) => {
        for (let q = 0; q < detail.quantity; q++) {
            allPanels.push({ ...detail, groupIdx, panelNum: q + 1 });
        }
    });

    return (
        <div
            className="transition-opacity duration-300"
            style={{ opacity: isCalculating ? 0.5 : 1 }}
        >
            {/* Sticky bar */}
            {showStickyBar && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-yellow-500/50 shadow-lg px-3 py-2">
                    <div className="max-w-screen-2xl mx-auto flex items-center gap-4 flex-wrap">
                        <span className="text-gray-400 text-sm">
                            {totalPanels} tấm ·{' '}
                            {config.MATERIAL_TYPES[params.materialTypeKey]?.name} · khổ{' '}
                            {cm(rollWidth)}cm
                        </span>
                        <div className="text-center ml-auto">
                            <span className="text-xl font-bold text-yellow-300">
                                {totalCost.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Main price box */}
            <div
                ref={priceSectionRef}
                className="bg-gray-800 p-4 rounded-lg border border-yellow-500 mb-4 border-dashed"
            >
                <div className="text-center">
                    <p className="text-sm text-gray-400">
                        {totalPanels} tấm ·{' '}
                        {itemDetails.length > 1
                            ? `${itemDetails.length} loại kích thước`
                            : `${itemDetails[0].originalW}×${itemDetails[0].originalH} cm`}
                    </p>
                    <p className="text-3xl font-bold text-yellow-300 mt-1">
                        {totalCost.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ
                    </p>
                </div>
            </div>

            {/* Chi tiết từng loại tấm */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 mb-4">
                <h3 className="text-base font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">
                    Chi Tiết
                </h3>

                {/* Thông tin chung */}
                <div className="grid grid-cols-2 gap-3 text-center mb-3">
                    <div>
                        <p className="text-xs text-gray-400">Vật liệu đề xuất</p>
                        <p className="text-sm font-semibold text-blue-400">
                            {config.MATERIAL_TYPES[params.materialTypeKey]?.name} — {cm(rollWidth)}
                            cm
                        </p>
                    </div>
                    <div>
                        <p className="text-xs text-gray-400">Diện tích in / thừa</p>
                        <p className="text-sm font-semibold">
                            <span className="text-blue-300">{printedArea.toFixed(2)}</span> /{' '}
                            <span className="text-gray-400">{unprintedArea.toFixed(2)}</span> m²
                        </p>
                    </div>
                    {laminationChoice && (
                        <div>
                            <p className="text-xs text-gray-400">Cán màng</p>
                            <p className="text-sm font-semibold">
                                {config.LAMINATION_TYPES[params.laminationTypeKey]?.name} —{' '}
                                {cm(laminationChoice.width)}cm
                            </p>
                        </div>
                    )}
                    {formexCost > 0 && (
                        <div>
                            <p className="text-xs text-gray-400">Bồi Formex</p>
                            <p className="text-sm font-semibold text-green-400">
                                {formexCost.toLocaleString('vi-VN')} đ
                            </p>
                        </div>
                    )}
                    {finishingCost > 0 && (
                        <div>
                            <p className="text-xs text-gray-400">Gia công</p>
                            <p className="text-sm font-semibold text-purple-400">
                                {finishingCost.toLocaleString('vi-VN')} đ
                            </p>
                        </div>
                    )}
                    {standeeCost > 0 && (
                        <div>
                            <p className="text-xs text-gray-400">Standee</p>
                            <p className="text-sm font-semibold text-orange-400">
                                {standeeCost.toLocaleString('vi-VN')} đ
                            </p>
                        </div>
                    )}
                </div>

                {/* Bảng chi tiết từng loại tấm */}
                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="text-gray-400 border-b border-gray-700">
                                <th className="py-1 text-left">#</th>
                                <th className="py-1 text-left">KT gốc</th>
                                <th className="py-1 text-left">KT in</th>
                                <th className="py-1 text-center">SL</th>
                                <th className="py-1 text-right">Đơn giá</th>
                                <th className="py-1 text-right">Thành tiền</th>
                            </tr>
                        </thead>
                        <tbody>
                            {itemDetails.map((d, idx) => (
                                <tr key={idx} className="border-b border-gray-700/50">
                                    <td className="py-1">
                                        <span
                                            className={`inline-block w-3 h-3 rounded-sm ${ITEM_COLORS[idx % ITEM_COLORS.length]}`}
                                        ></span>
                                    </td>
                                    <td className="py-1">
                                        {d.originalW}×{d.originalH} cm
                                    </td>
                                    <td className="py-1 text-cyan-400">
                                        {cm(d.printWidth)}×{cm(d.printHeight)}
                                        {d.rotated && (
                                            <span className="text-orange-400 ml-1">↻</span>
                                        )}
                                    </td>
                                    <td className="py-1 text-center">{d.quantity}</td>
                                    <td className="py-1 text-right">
                                        {d.unitCost.toLocaleString('vi-VN', {
                                            maximumFractionDigits: 0,
                                        })}
                                    </td>
                                    <td className="py-1 text-right font-semibold">
                                        {d.totalCost.toLocaleString('vi-VN', {
                                            maximumFractionDigits: 0,
                                        })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Sơ đồ trên cuộn */}
            <div className="bg-gray-800 p-4 rounded-lg border border-gray-600 mb-4">
                <h3 className="text-base font-bold text-gray-300 mb-3 border-b border-gray-700 pb-2">
                    Sơ Đồ Vật Liệu — {totalPanels} tấm trên cuộn {cm(rollWidth)} cm
                </h3>
                <div className="overflow-x-auto">
                    {/* Thanh khổ cuộn */}
                    <div
                        className="border border-gray-500 rounded overflow-hidden"
                        style={{ minWidth: '300px' }}
                    >
                        <div
                            className="flex"
                            style={{ height: '20px', backgroundColor: '#1f2937' }}
                        >
                            <div
                                className="flex items-center justify-center text-white text-xs font-medium border-r border-gray-500"
                                style={{ width: '100%', backgroundColor: '#1e40af' }}
                            >
                                Khổ cuộn: {cm(rollWidth)} cm
                            </div>
                        </div>
                        {/* Từng tấm */}
                        <div className="flex flex-col">
                            {allPanels.slice(0, 15).map((panel, i) => {
                                const pctWidth = ((panel.printWidth / rollWidth) * 100).toFixed(1);
                                const wasteW = rollWidth - panel.printWidth;
                                const maxH = 120 / Math.min(allPanels.length, 15);
                                const rowH = Math.max(Math.min(maxH, 40), 22);
                                const colorIdx = panel.groupIdx % ITEM_COLORS.length;
                                const bgClass =
                                    i % 2 === 0 ? ITEM_COLORS[colorIdx] : ITEM_COLORS_ALT[colorIdx];
                                return (
                                    <div key={i} className="flex" style={{ height: `${rowH}px` }}>
                                        <div
                                            className={`flex items-center justify-center text-white text-xs font-medium border-b border-black/20 ${bgClass}`}
                                            style={{ width: `${pctWidth}%` }}
                                        >
                                            <span className="truncate px-1">
                                                {itemDetails.length > 1
                                                    ? `#${panel.groupIdx + 1} `
                                                    : ''}
                                                {panel.originalW}×{panel.originalH}
                                                {panel.rotated ? ' ↻' : ''}
                                            </span>
                                        </div>
                                        {wasteW > 0.001 && (
                                            <div className="flex-1 border-b border-gray-700 bg-gray-800/50 flex items-center justify-center text-gray-600 text-xs">
                                                {rowH >= 24 && `${cm(wasteW)}cm`}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                            {allPanels.length > 15 && (
                                <div className="flex items-center justify-center text-gray-500 text-xs py-2 bg-gray-900/50 border-t border-gray-700">
                                    ... và {allPanels.length - 15} tấm nữa
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-2">
                        <span>Tổng in: {printedArea.toFixed(2)} m²</span>
                        <span>Phế liệu: {unprintedArea.toFixed(2)} m²</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
