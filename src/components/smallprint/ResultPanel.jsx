import React, { useState, useRef, useEffect } from 'react';
import { getPrintableArea, getProfitMargin, calculatePrintContentSurcharge } from '../../utils/calculator';
import { LargeSheetVisualizer, PrintSheetVisualizer } from './SheetVisualizer';
import { useAuth } from '../../auth/useAuth';
import { useUserRole } from '../../auth/useUserRole';

export default function ResultPanel({ results, quote, params, config, isCalculating, errorMsg, finishingCustomerPrices, dieCuttingCustomerPrice, holePunchingCost, creasingCost, mountingCost, moldCost, laborCost, variableDataCost, foilResult, onChange }) {
    // P2-03: Admin reveal (giá vốn / giá tối thiểu) giờ dựa vào Supabase role.
    // Trước: hardcoded ADMIN_PASSWORD + inline input. Sau: tự động hiện khi user
    // đã login admin (qua AdminGate ở tab Settings). Không có login inline trên
    // tab tính giá — staff thấy báo giá khách bình thường; admin thấy thêm
    // cost columns + "Giá tối thiểu" panel khi session admin còn hiệu lực.
    const { user } = useAuth();
    const { isAdmin } = useUserRole(user);

    const [selectedResult, setSelectedResult] = useState(null);
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
    }, [results]);

    const validResults = results;
    const bestPreferredOption = validResults.find(r => r.cutSheetH <= 48);
    const absoluteBestOption = validResults[0];
    const mainResult = bestPreferredOption || absoluteBestOption;
    // Phương án đang hiển thị sơ đồ: ưu tiên phương án user chọn, mặc định là tốt nhất
    const displayResult = selectedResult || mainResult;

    if (errorMsg || validResults.length === 0) {
        return (
            <div className="lg:col-span-3 h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">{errorMsg || "Chưa có dữ liệu tính toán. Thay đổi thông số để xem kết quả."}</p>
                </div>
            </div>
        );
    }

    const { productQuantity, printContents, bleed, dieCuttingType, productW, productH } = params;
    const productWithBleedW = parseFloat(productW) + (parseFloat(bleed) * 2);
    const productWithBleedH = parseFloat(productH) + (parseFloat(bleed) * 2);
    const printableArea = getPrintableArea(displayResult.cutSheetW, displayResult.cutSheetH, displayResult.printer, dieCuttingType === 'digital', config, displayResult.isCustom);

    // Layout logic data prep — dùng displayResult cho sơ đồ
    const productsPerSheet = displayResult.productsPerSheet;
    const totalPrintSheetsNeeded = Math.ceil(productQuantity / productsPerSheet);

    // Cost calcs — dùng absoluteBestOption (rẻ nhất tuyệt đối) cho giá tối thiểu
    const foilCost = foilResult ? foilResult.totalCost : 0;
    const totalManufacturingCost = productQuantity * absoluteBestOption.costPerProduct;
    const baseCost = totalManufacturingCost + variableDataCost + holePunchingCost + creasingCost + mountingCost + moldCost + laborCost + foilCost;
    const { surcharge } = calculatePrintContentSurcharge(baseCost, productQuantity, printContents, config);
    const finalTotalCost = baseCost + surcharge;

    const minPrice = finalTotalCost * (1 + getProfitMargin(finalTotalCost, config));
    const isShowingMinPrice = minPrice >= 300000;

    const selectedPaperInfo = (config.PAPER_STOCK_DATA || [])[params.paperType];

    return (
        <div className="lg:col-span-3 transition-opacity duration-300" style={{ opacity: isCalculating ? 0.5 : 1 }}>

            {/* P2-03: Admin badge — hiển thị status khi đã login admin (qua tab Settings).
                Không có inline login: muốn unlock cost view → vào tab Cài Đặt → AdminGate xử lý. */}
            {isAdmin && (
                <div className="flex justify-end mb-2">
                    <span className="text-xs text-green-400">🔓 Admin mode</span>
                </div>
            )}

            {/* Phương án tối ưu nhất — chỉ admin */}
            <div className={`bg-gray-800 p-6 rounded-lg border border-green-500 mb-8 ${(!isShowingMinPrice || !isAdmin) ? 'hidden' : ''}`}>
                <h2 className="text-2xl font-bold text-green-400 mb-4 text-center border-b border-gray-700 pb-2">🏆 Giá Tối Thiểu</h2>

                <div className="text-center mb-6">
                    <p className="text-base text-gray-400">Giá bán tối thiểu cho {productQuantity.toLocaleString('vi-VN')} sản phẩm</p>
                    <p className="text-4xl font-bold text-cyan-300 mt-2">{minPrice.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} VNĐ</p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div><p className="text-sm text-gray-400">Máy in</p><p className="text-2xl font-bold text-cyan-400">{absoluteBestOption.printer.name}</p></div>
                    <div><p className="text-sm text-gray-400">Khổ giấy lớn</p><p className="text-xl font-semibold">{absoluteBestOption.largeSheetName}</p></div>
                    <div><p className="text-sm text-gray-400">Khổ giấy cắt</p><p className="text-xl font-semibold text-yellow-400">{absoluteBestOption.cutSheetSize}</p></div>
                    <div><p className="text-sm text-gray-400">Giá vốn / SP</p><p className="text-2xl font-bold text-green-400">{absoluteBestOption.costPerProduct.toFixed(0)}</p></div>
                    <div><p className="text-sm text-gray-400">Vùng in máy</p><p className="text-base font-mono mt-1">{absoluteBestOption.printableArea}</p></div>
                    <div><p className="text-sm text-gray-400">Vùng in SP</p><p className="text-base font-mono mt-1">{absoluteBestOption.actualPrintW.toFixed(2)} x {absoluteBestOption.actualPrintH.toFixed(2)}</p></div>
                    <div className="md:col-span-2"><p className="text-sm text-gray-400">SP / Tờ in</p><p className="text-2xl font-semibold">{absoluteBestOption.productsPerSheet} sp</p></div>
                </div>

                {absoluteBestOption.laminationWarning && (
                    <div className="mt-4 text-center">
                        <p className={`font-semibold ${absoluteBestOption.laminationWarning.startsWith('KHÔNG') ? 'text-red-500' : 'text-yellow-400'}`}>
                            {absoluteBestOption.laminationWarning}
                        </p>
                    </div>
                )}

                {selectedPaperInfo && (
                    <div className="mt-6 pt-4 border-t border-gray-600 text-center">
                        <p className="text-lg font-semibold text-gray-200">{selectedPaperInfo.name}</p>
                        {selectedPaperInfo.description && <p className="text-sm text-gray-400 mt-1">{selectedPaperInfo.description}</p>}
                    </div>
                )}
            </div>

            {/* Sticky bar — hiện khi scroll qua phần giá, có input chỉnh thông số */}
            {showStickyBar && quote && !quote.error && (
                <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-b border-yellow-500/50 shadow-lg px-3 py-2">
                    <div className="max-w-screen-2xl mx-auto flex items-center gap-3 flex-wrap">
                        {/* Inputs */}
                        <div className="flex items-center gap-2 flex-wrap flex-1">
                            <div className="flex items-center gap-1">
                                <label className="text-xs text-gray-500">SL:</label>
                                <input type="number" value={params.productQuantity} onChange={(e) => { const v = parseInt(e.target.value, 10); if (!isNaN(v)) onChange('productQuantity', v); }} className="w-20 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="flex items-center gap-1">
                                <label className="text-xs text-gray-500">W:</label>
                                <input type="number" value={params.productW} step="0.1" onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange('productW', v); }} className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="flex items-center gap-1">
                                <label className="text-xs text-gray-500">H:</label>
                                <input type="number" value={params.productH} step="0.1" onChange={(e) => { const v = parseFloat(e.target.value); if (!isNaN(v)) onChange('productH', v); }} className="w-16 bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500" />
                            </div>
                            <div className="flex items-center gap-1">
                                <label className="text-xs text-gray-500">Giấy:</label>
                                <select value={params.paperType} onChange={(e) => onChange('paperType', e.target.value)} className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-white text-sm focus:outline-none focus:border-blue-500 max-w-[140px]">
                                    {(config.PAPER_STOCK_DATA || []).map((paper, idx) => (
                                        <option key={idx} value={idx}>{paper.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        {/* Giá */}
                        <div className="flex items-center gap-4">
                            {isAdmin && (
                                <div className="text-center">
                                    <span className="text-xs text-gray-500 block">Giá tối thiểu</span>
                                    <span className="text-lg font-bold text-cyan-300">{minPrice.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} đ</span>
                                </div>
                            )}
                            <div className="text-center">
                                <span className="text-xs text-gray-500 block">Giá</span>
                                <span className="text-xl font-bold text-yellow-300">{quote.totalCustomerCost.toLocaleString('vi-VN')} đ</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Báo giá khách */}
            {quote && (
                <div ref={priceSectionRef} className="bg-gray-800 p-6 rounded-lg border border-yellow-500 mb-8 border-dashed">
                    <h3 className="text-2xl font-bold text-yellow-300 mb-4 text-center border-b border-gray-700 pb-2">Giá</h3>
                    {quote.error ? (
                        <p className="text-center text-red-400">{quote.error}</p>
                    ) : (
                        <div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center items-center mb-6">
                                <div><p className="text-sm text-gray-400">Tổng trang A4</p><p className="text-2xl font-semibold">{quote.totalA4Pages}</p></div>
                                <div><p className="text-sm text-gray-400">Đơn giá in/trang</p><p className="text-xl font-semibold">{quote.unitPriceText}</p></div>
                                <div className="md:col-span-1"><p className="text-sm text-gray-400">Tiền In + Cán Màng</p><p className="text-xl font-semibold text-green-400">{quote.totalPrintCost.toLocaleString('vi-VN')} + {quote.totalLaminationCost.toLocaleString('vi-VN')}</p></div>
                                {quote.foilStampingCost > 0 && (
                                    <div className="md:col-span-1"><p className="text-sm text-gray-400">Ép Kim (nhũ)</p><p className="text-xl font-semibold text-yellow-400">{quote.foilStampingCost.toLocaleString('vi-VN')}</p></div>
                                )}
                            </div>
                            <div className="text-center border-t border-gray-600 pt-4 mt-2">
                                <p className="text-lg text-gray-300">Tổng Cộng Báo Khách</p>
                                <p className="text-4xl font-bold text-yellow-300 mt-2">{quote.totalCustomerCost.toLocaleString('vi-VN')} VNĐ</p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Bảng so sánh — đặt TRƯỚC sơ đồ để click chọn trước khi xem sơ đồ */}
            <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto mb-8">
                <h2 className="text-2xl font-bold text-gray-300 mb-1 border-b border-gray-700 pb-2">Bảng So Sánh Các Phương Án</h2>
                <p className="text-xs text-gray-500 mb-4">Click vào một hàng để xem sơ đồ cho phương án đó</p>
                <table className="w-full text-sm table-auto text-left">
                    <thead>
                        <tr>
                            <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold rounded-tl-md">Máy in</th>
                            <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Khổ lớn</th>
                            <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Khổ cắt</th>
                            <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Vùng in máy</th>
                            <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold rounded-tr-md">SP / Tờ</th>
                            {isAdmin && (
                                <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Giá vốn/SP</th>
                            )}
                            {isAdmin && (
                                <th className="p-3 border-b border-gray-700 bg-gray-700 text-gray-300 text-center font-semibold">Giá tối thiểu</th>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {validResults.slice(0, 10).map((res, idx) => {
                            const isSelected = res === displayResult;
                            const isBest = res === mainResult;

                            let rowClass = 'transition-colors border-b border-gray-700/50 cursor-pointer ';
                            if (isSelected) rowClass += 'bg-blue-700/40 ring-1 ring-inset ring-blue-400';
                            else if (isBest) rowClass += 'bg-green-900/30 hover:bg-green-900/50';
                            else rowClass += 'hover:bg-gray-700/50';

                            const totalForRowManufacturingCost = res.costPerProduct * productQuantity;
                            const rowBaseCost = totalForRowManufacturingCost + variableDataCost + holePunchingCost + creasingCost + mountingCost + moldCost + laborCost + foilCost;
                            const { surcharge: rowSurcharge } = calculatePrintContentSurcharge(rowBaseCost, productQuantity, params.printContents, config);
                            const totalForRow = rowBaseCost + rowSurcharge;
                            const totalForRowWithProfit = isFinite(totalForRow) ? totalForRow * (1 + getProfitMargin(totalForRow, config)) : 0;

                            const title = isAdmin
                                ? `Chi tiết:\nGiấy: ${res.paperCostPerProduct.toFixed(0)} đ/sp\nIn: ${res.printCostPerProduct.toFixed(0)} đ/sp\nMàng: ${res.laminationCostPerProduct.toFixed(0)} đ/sp`
                                : undefined;

                            return (
                                <tr
                                    key={idx}
                                    className={rowClass}
                                    title={title}
                                    onClick={() => setSelectedResult(res === displayResult && !isBest ? mainResult : res)}
                                >
                                    <td className="p-3 text-center text-cyan-400 font-medium">
                                        {isBest && <span className="mr-1 text-green-400">★</span>}
                                        {res.printer.name}
                                    </td>
                                    <td className="p-3 text-center text-gray-300">{res.largeSheetName}</td>
                                    <td className="p-3 text-center text-yellow-200">{res.cutSheetSize}</td>
                                    <td className="p-3 text-center font-mono text-gray-400 max-w-[120px] truncate">{res.printableArea}</td>
                                    <td className="p-3 text-center text-gray-200 font-semibold">{res.productsPerSheet}</td>
                                    {isAdmin && (
                                        <td className={`p-3 text-center font-bold ${res === absoluteBestOption ? 'text-green-400' : 'text-yellow-400'}`}>{res.costPerProduct.toFixed(0)}</td>
                                    )}
                                    {isAdmin && (
                                        <td className="p-3 text-center font-bold text-gray-300">{isFinite(totalForRowWithProfit) ? totalForRowWithProfit.toLocaleString('vi-VN', { maximumFractionDigits: 0 }) : 'Lỗi'}</td>
                                    )}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Sơ đồ — hiển thị theo phương án đang chọn */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="flex flex-col items-center">
                    <h3 className="text-xl font-semibold mb-1 text-center text-gray-300">Sơ đồ cắt từ giấy lớn</h3>
                    {selectedResult && selectedResult !== mainResult && (
                        <p className="text-xs text-blue-400 mb-3">Phương án: {displayResult.printer.name} — {displayResult.cutSheetSize} cm</p>
                    )}
                    <LargeSheetVisualizer
                        largeW={displayResult.largeSheetW}
                        largeH={displayResult.largeSheetH}
                        cutW={displayResult.cutSheetW}
                        cutH={displayResult.cutSheetH}
                        layouts={displayResult.cuttableSheetLayout}
                        neededPrintSheets={totalPrintSheetsNeeded}
                    />
                </div>
                <div className="flex flex-col items-center">
                    <h3 className="text-xl font-semibold mb-1 text-center text-gray-300">Sơ đồ xếp sản phẩm trên tờ in</h3>
                    {selectedResult && selectedResult !== mainResult && (
                        <p className="text-xs text-blue-400 mb-3">&nbsp;</p>
                    )}
                    <PrintSheetVisualizer
                        printW={displayResult.cutSheetW}
                        printH={displayResult.cutSheetH}
                        printableArea={printableArea}
                        prodW={productWithBleedW}
                        prodH={productWithBleedH}
                        productsPerSheet={productsPerSheet}
                        spacing={displayResult.isCustom ? 0 : (dieCuttingType === 'none' ? 0 : (dieCuttingType === 'mold' ? 0.4 : 0.6))}
                    />
                </div>
            </div>

            {/* Ép kim — chi tiết + ước tính cuộn nhũ */}
            {foilResult && foilResult.totalCost > 0 && foilResult.rollsInfo && (() => {
                const cfg = config.EP_KIM_CONFIG;
                const H = params.foilCustomSize ? (parseFloat(params.foilH) || 0) : (parseFloat(params.productH) || 0);
                const W = params.foilCustomSize ? (parseFloat(params.foilW) || 0) : (parseFloat(params.productW) || 0);
                const qty = params.productQuantity;
                const ri = foilResult.rollsInfo;
                const best1 = ri.opt1.rolls <= ri.opt2.rolls;
                const best2 = ri.opt2.rolls <= ri.opt1.rolls;

                const FoilOption = ({ num, title, desc, opt, foilW, isBest, prodDispW, prodDispH }) => {
                    // Cuộn nhũ chạy ngang: chiều cuộn (foilW) = chiều cao sơ đồ, chiều mét tới (imprLen) = chiều ngang
                    const maxDim = Math.max(opt.imprLen, foilW);
                    const scale = maxDim > 0 ? 90 / maxDim : 1;
                    // Sản phẩm bên trong: hiển thị đúng hướng xoay
                    const prodVisW = prodDispW * scale;
                    const prodVisH = prodDispH * scale;
                    const rollVisH = foilW * scale;
                    return (
                        <div className={`p-4 rounded-lg border ${isBest ? 'border-green-500 bg-green-900/20' : 'border-gray-600 bg-gray-900/30'}`}>
                            <h4 className="text-center font-semibold text-blue-400 mb-1">
                                Phương án {num}: {title}
                                {isBest && <span className="ml-2 text-xs bg-green-600 text-white px-2 py-0.5 rounded-full">Tối ưu</span>}
                            </h4>
                            <p className="text-center text-xs text-gray-500 mb-3">{desc}</p>
                            {/* Sơ đồ minh họa cuộn nhũ */}
                            <div className="flex justify-center mb-3">
                                <div className="flex items-center gap-2 px-3 py-2 rounded" style={{ background: 'linear-gradient(45deg, #d4af37, #ffd700, #d4af37)', minWidth: '200px', justifyContent: 'center', height: `${Math.max(rollVisH + 16, 50)}px` }}>
                                    <div className="flex flex-col items-center justify-center border border-dashed border-gray-800 bg-white/90 text-gray-800 text-xs" style={{ width: `${Math.max(prodVisW, 30)}px`, height: `${Math.max(prodVisH, 30)}px` }}>
                                        <span>{prodDispW}x{prodDispH}</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center border border-dashed border-gray-800 bg-white/70 text-gray-800 text-xs" style={{ width: `${Math.max(prodVisW, 30)}px`, height: `${Math.max(prodVisH, 30)}px`, opacity: 0.7 }}>
                                        <span>{prodDispW}x{prodDispH}</span>
                                    </div>
                                </div>
                            </div>
                            {/* Diễn giải */}
                            <div className="text-sm space-y-1 text-gray-300">
                                <p>1. Chiều rộng cuộn nhũ = <span className="font-mono text-yellow-300">{foilW.toFixed(1)} cm</span></p>
                                <p>2. Chiều dài nhũ / lượt ép = <span className="font-mono text-yellow-300">{opt.imprLen.toFixed(1)} cm</span></p>
                                <p>3. Số lượt ép / cuộn = <span className="font-mono text-yellow-300">{cfg.foilRollLengthM}m / {opt.imprLen.toFixed(1)}cm = {opt.perRoll} lượt</span></p>
                                <p className="font-semibold text-blue-300">4. Tổng số cuộn cần = <span className="font-mono">{qty} / {opt.perRoll} = {isFinite(opt.rolls) ? opt.rolls : '∞'} cuộn</span></p>
                            </div>
                        </div>
                    );
                };

                return (
                    <div className="bg-gray-800 p-6 rounded-lg border border-yellow-600/50 mb-8">
                        <h2 className="text-xl font-bold text-yellow-400 mb-2 text-center border-b border-gray-700 pb-2">Ép Kim (Nhũ) — Chi Tiết</h2>

                        {/* Bảng giá ép kim */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6 mt-4">
                            <div><p className="text-xs text-gray-400">Diện tích tính giá</p><p className="text-lg font-semibold">{foilResult.areaForCalc.toFixed(1)} cm²</p></div>
                            <div><p className="text-xs text-gray-400">Giá ép kim</p><p className="text-lg font-semibold text-yellow-300">{foilResult.impressionPrice.toLocaleString('vi-VN')} đ</p></div>
                            <div><p className="text-xs text-gray-400">Giá khuôn (gồm ship)</p><p className="text-lg font-semibold text-yellow-300">{foilResult.moldCost.toLocaleString('vi-VN')} đ</p></div>
                            <div><p className="text-xs text-gray-400">Tổng ép kim</p><p className="text-lg font-bold text-yellow-400">{foilResult.totalCost.toLocaleString('vi-VN')} đ</p></div>
                        </div>

                        <p className="text-xs text-gray-500 text-center mb-1">
                            Kích thước ép: {W} x {H} cm | {foilResult.isSmall ? `Khuôn nhỏ (≤ ${cfg.thresholdW}x${cfg.thresholdH})` : `Khuôn lớn (> ${cfg.thresholdW}x${cfg.thresholdH})`} | Giá / lượt: {foilResult.pricePerImpression.toLocaleString('vi-VN')} đ
                        </p>

                        {/* Ước tính cuộn nhũ */}
                        <h3 className="text-lg font-semibold text-gray-300 mt-6 mb-4 text-center">Ước Tính Số Cuộn Nhũ (Dài {cfg.foilRollLengthM}m)</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FoilOption num={1} title="Chạy theo chiều ngang" desc={`Chiều cuộn = H+${cfg.foilPadWidth}cm. Mét tới = W+${cfg.foilPadLength}cm`} opt={ri.opt1} foilW={ri.opt1.foilWidth} isBest={best1} prodDispW={W} prodDispH={H} />
                            <FoilOption num={2} title="Chạy theo chiều dọc" desc={`Chiều cuộn = W+${cfg.foilPadWidth}cm. Mét tới = H+${cfg.foilPadLength}cm`} opt={ri.opt2} foilW={ri.opt2.foilWidth} isBest={best2} prodDispW={H} prodDispH={W} />
                        </div>
                    </div>
                );
            })()}

        </div>
    );
}
