const fmt = (v) => (v != null && !isNaN(v) ? Math.round(v).toLocaleString('vi-VN') + ' đ' : '—');

function Row({ label, value, strong, negative }) {
    return (
        <div className="flex justify-between items-baseline border-b border-gray-700/40 pb-1.5">
            <span className="text-sm text-gray-300">{label}</span>
            <span
                className={
                    negative
                        ? 'font-semibold text-emerald-400'
                        : strong
                          ? 'font-bold text-white'
                          : 'font-semibold text-gray-100'
                }
            >
                {value}
            </span>
        </div>
    );
}

// Bảng giá tham khảo của khổ đang chọn (tổng baseline theo mốc).
function ReferenceTable({ config, size }) {
    const c = config.FLYER_CONFIG || {};
    const rows = c.priceTable?.[size];
    if (!rows) return null;
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center border-b border-gray-700 pb-2">
                Bảng giá tham khảo — {size} (baseline C150 · 2 mặt)
            </h3>
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto">
                <table className="w-full text-xs text-left">
                    <thead className="sticky top-0">
                        <tr>
                            <th className="p-2 bg-gray-700 text-gray-300 text-center">
                                Số lượng (tờ)
                            </th>
                            <th className="p-2 bg-gray-700 text-gray-300 text-right">Tổng (mốc)</th>
                            <th className="p-2 bg-gray-700 text-gray-300 text-right">
                                Đơn giá / tờ
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((r) => (
                            <tr
                                key={r.qty}
                                className="border-b border-gray-700/50 hover:bg-gray-700/30"
                            >
                                <td className="p-2 text-center text-gray-200">
                                    {r.qty.toLocaleString('vi-VN')}
                                </td>
                                <td className="p-2 text-right text-green-400 font-semibold">
                                    {fmt(r.price)}
                                </td>
                                <td className="p-2 text-right text-gray-300">
                                    {fmt(r.price / r.qty)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function FlyerResultPanel({ result, config, isCalculating }) {
    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập thông số để xem báo giá tờ rơi.
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

    const {
        size,
        sizeName,
        quantity,
        paperName,
        sidesName,
        unitPrice,
        sourceQty,
        baseRule,
        basePrice,
        oneSideDiscount,
        paperFee,
        contentFee,
        laminationFee,
        creasingFee,
        total,
        requiresManualQuote,
    } = result;

    const totalText = requiresManualQuote ? `${fmt(total)} + phí cấn` : fmt(total);

    return (
        <div
            className="transition-opacity duration-300"
            style={{ opacity: isCalculating ? 0.5 : 1 }}
        >
            <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                <p className="text-sm text-gray-400 mb-1">Thành tiền dự kiến</p>
                <p className="text-4xl font-bold text-yellow-300">{totalText}</p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">{sizeName}</span>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">
                        {quantity.toLocaleString('vi-VN')} tờ
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">{paperName}</span>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">{sidesName}</span>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                    Chi Tiết Báo Giá
                </h3>
                <div className="space-y-2">
                    <Row label="Giá in cơ bản" value={fmt(basePrice)} strong />
                    {oneSideDiscount > 0 && (
                        <Row label="Giảm in 1 mặt" value={'− ' + fmt(oneSideDiscount)} negative />
                    )}
                    {paperFee > 0 && <Row label="Phụ thu giấy" value={fmt(paperFee)} />}
                    {contentFee > 0 && (
                        <Row label="Phụ thu nội dung (3-5)" value={fmt(contentFee)} />
                    )}
                    {laminationFee > 0 && <Row label="Phí cán màng" value={fmt(laminationFee)} />}
                    <Row
                        label="Phí cấn gấp"
                        value={requiresManualQuote ? 'Cần xác nhận' : fmt(creasingFee)}
                    />
                    <div className="flex justify-between items-baseline border-t border-gray-600 pt-3 mt-1">
                        <span className="text-base font-semibold text-gray-200">Thành tiền</span>
                        <span className="text-xl font-bold text-yellow-300">{totalText}</span>
                    </div>
                    <p className="text-xs text-gray-500 pt-2">
                        Đơn giá đang áp dụng: mốc {sourceQty?.toLocaleString('vi-VN')} tờ ≈{' '}
                        {fmt(unitPrice)}/tờ. {baseRule}
                        {requiresManualQuote &&
                            ' · Phí cấn 3-5 đường (trên 2.000 tờ) cần P&D xác nhận riêng.'}
                    </p>
                </div>
            </div>

            <ReferenceTable config={config} size={size} />
        </div>
    );
}
