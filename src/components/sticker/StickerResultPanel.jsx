const fmt = (v) => (v != null && !isNaN(v) ? Math.round(v).toLocaleString('vi-VN') + ' đ' : '—');
const pct = (v) => `${(+v || 0).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}%`;

function Row({ label, value, strong }) {
    return (
        <div className="flex justify-between items-baseline border-b border-gray-700/40 pb-1.5">
            <span className="text-sm text-gray-300">{label}</span>
            <span className={strong ? 'font-bold text-white' : 'font-semibold text-gray-100'}>
                {value}
            </span>
        </div>
    );
}

// Bảng giá tham khảo của khổ đang chọn (tổng công bố = đơn giá × bậc).
function ReferenceTable({ config, size }) {
    const s = config.STICKER_CONFIG || {};
    const sz = s.sizes?.[size];
    if (!sz) return null;
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center border-b border-gray-700 pb-2">
                Bảng giá tham khảo — {sz.name}
            </h3>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                    <thead className="sticky top-0">
                        <tr>
                            <th className="p-2 bg-gray-700 text-gray-300 text-center">
                                Số lượng (tờ)
                            </th>
                            <th className="p-2 bg-gray-700 text-gray-300 text-right">
                                Đơn giá / tờ
                            </th>
                            <th className="p-2 bg-gray-700 text-gray-300 text-right">Tổng (mốc)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(s.tiers || []).map((t, i) => (
                            <tr
                                key={t}
                                className="border-b border-gray-700/50 hover:bg-gray-700/30"
                            >
                                <td className="p-2 text-center text-gray-200">
                                    {t.toLocaleString('vi-VN')}
                                </td>
                                <td className="p-2 text-right text-gray-300">{fmt(sz.units[i])}</td>
                                <td className="p-2 text-right text-green-400 font-semibold">
                                    {fmt((sz.units[i] || 0) * t)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function StickerResultPanel({ result, config, isCalculating }) {
    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập thông số để xem báo giá tờ sticker.
                    </p>
                </div>
            </div>
        );
    }

    if (result.error) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-red-600/50 shadow-inner">
                    <p className="text-red-400 text-center p-8">{result.error}</p>
                </div>
            </div>
        );
    }

    // Báo giá riêng (qty > mức tối đa).
    if (result.isCustomQuote) {
        return (
            <div
                className="transition-opacity duration-300"
                style={{ opacity: isCalculating ? 0.5 : 1 }}
            >
                <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                    <p className="text-sm text-gray-400 mb-1">Tổng giá dự kiến</p>
                    <p className="text-4xl font-bold text-yellow-300">BÁO GIÁ RIÊNG</p>
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-2">
                    <Row label="Sản phẩm" value={result.sizeName} />
                    <Row label="Số lượng nhập" value={`${result.qty.toLocaleString('vi-VN')} tờ`} />
                    <p className="text-sm text-gray-400 pt-2">
                        Số lượng trên {result.maxQty?.toLocaleString('vi-VN')} tờ cần báo giá riêng.
                        Vui lòng liên hệ Hotline{' '}
                        <span className="font-semibold text-pink-300">{result.hotline}</span>.
                    </p>
                </div>
                <ReferenceTable config={config} size={result.size} />
            </div>
        );
    }

    const {
        sizeName,
        qty,
        billableQty,
        tier,
        tierMode,
        low,
        high,
        threshold,
        unit,
        base,
        stickerPct,
        finishName,
        finishPct,
        finishFixedPerSheet,
        finishFixedFee,
        contentPct,
        fileType,
        cutPathFee,
        totalPct,
        percentSurcharge,
        total,
        unitPerSheet,
        size,
    } = result;
    const s = config.STICKER_CONFIG || {};
    const belowMin = qty < s.minBillableQty;

    return (
        <div
            className="transition-opacity duration-300"
            style={{ opacity: isCalculating ? 0.5 : 1 }}
        >
            <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                <p className="text-sm text-gray-400 mb-1">Tổng giá dự kiến</p>
                <p className="text-4xl font-bold text-yellow-300">{fmt(total)}</p>
                <p className="mt-2 text-lg text-yellow-200">
                    Đơn giá thực tế: <span className="font-bold">{fmt(unitPerSheet)}</span> / tờ
                </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                    Chi Tiết Tính Toán
                </h3>
                <div className="space-y-2">
                    <Row label="Sản phẩm" value={sizeName} />
                    <Row label="Số lượng nhập" value={`${qty.toLocaleString('vi-VN')} tờ`} />
                    <Row
                        label="Số lượng tính tiền"
                        value={`${billableQty.toLocaleString('vi-VN')} tờ${belowMin ? ` (tối thiểu ${s.minBillableQty} tờ)` : ''}`}
                    />
                    <Row
                        label="Mốc giá áp dụng"
                        value={`${tier.toLocaleString('vi-VN')} tờ · ${tierMode}`}
                    />
                    {low != null ? (
                        <Row
                            label="Khoảng xét giá"
                            value={`${low} → ${high} · ngưỡng ${s.upperThresholdPct}% = ${(+threshold).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tờ`}
                        />
                    ) : (
                        <Row label="Khoảng xét giá" value={tierMode} />
                    )}
                    <Row label="Đơn giá áp dụng" value={`${fmt(unit)} / tờ`} />
                    <Row label="Giá cơ bản" value={fmt(base)} strong />
                    <Row label="Phụ phí số sticker" value={pct(stickerPct)} />
                    <Row
                        label="Loại cán màng"
                        value={
                            finishFixedPerSheet > 0
                                ? `${finishName} · ${fmt(finishFixedPerSheet)}/tờ`
                                : finishPct > 0
                                  ? `${finishName} (+${finishPct}%)`
                                  : finishName
                        }
                    />
                    {finishPct > 0 && <Row label="Phụ phí cán màng (%)" value={pct(finishPct)} />}
                    {finishFixedFee > 0 && (
                        <Row label="Phụ phí laminate cố định" value={fmt(finishFixedFee)} />
                    )}
                    <Row label="Phụ phí số nội dung" value={pct(contentPct)} />
                    <Row
                        label="Loại file"
                        value={fileType === 'image' ? 'File ảnh (vẽ đường cắt)' : 'File vector'}
                    />
                    {cutPathFee > 0 && <Row label="Phí vẽ đường cắt" value={fmt(cutPathFee)} />}
                    <Row
                        label={`Tổng phụ phí % (${pct(totalPct)})`}
                        value={fmt(percentSurcharge)}
                    />
                    <div className="flex justify-between items-baseline border-t border-gray-600 pt-3 mt-1">
                        <span className="text-base font-semibold text-gray-200">Tổng cộng</span>
                        <span className="text-xl font-bold text-yellow-300">{fmt(total)}</span>
                    </div>
                    <p className="text-xs text-gray-500 pt-2">
                        Giá chưa gồm VAT, vận chuyển và phí thanh toán.
                    </p>
                </div>
            </div>

            <ReferenceTable config={config} size={size} />
        </div>
    );
}
