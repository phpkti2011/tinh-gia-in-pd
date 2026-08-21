const fmt = (v) => (v != null && !isNaN(v) ? Math.round(v).toLocaleString('vi-VN') + ' đ' : '—');

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

// Bảng giá tham khảo cỡ đang chọn (tròn · decal giấy · không cán) theo 3 mốc SL.
function ReferenceTable({ config, size }) {
    const c = config.CHEAP_DECAL_CONFIG || {};
    const rows = c.priceTable?.[size];
    if (!rows) return null;
    return (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mt-4">
            <h3 className="text-base font-semibold text-gray-300 mb-3 text-center border-b border-gray-700 pb-2">
                Bảng giá tham khảo — Cỡ {size} (tròn · decal giấy · không cán)
            </h3>
            <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                    <thead>
                        <tr>
                            <th className="p-2 bg-gray-700 text-gray-300 text-center">Số lượng</th>
                            <th className="p-2 bg-gray-700 text-gray-300 text-right">Thành tiền</th>
                            <th className="p-2 bg-gray-700 text-gray-300 text-right">
                                Đơn giá/nhãn
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {(c.quantities || []).map((q, i) => (
                            <tr
                                key={q}
                                className="border-b border-gray-700/50 hover:bg-gray-700/30"
                            >
                                <td className="p-2 text-center text-gray-200">
                                    {q.toLocaleString('vi-VN')} nhãn
                                </td>
                                <td className="p-2 text-right text-green-400 font-semibold">
                                    {fmt(rows[i])}
                                </td>
                                <td className="p-2 text-right text-gray-300">{fmt(rows[i] / q)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default function CheapDecalResultPanel({ result, config, isCalculating }) {
    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập thông số để xem báo giá decal nhãn.
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
        shapeName,
        materialName,
        basePrice,
        squareSurcharge,
        materialFee,
        laminationFee,
        rushFee,
        total,
        unitPrice,
        sheets,
        leadTimeNote,
    } = result;

    return (
        <div
            className="transition-opacity duration-300"
            style={{ opacity: isCalculating ? 0.5 : 1 }}
        >
            <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                <p className="text-sm text-gray-400 mb-1">Thành tiền</p>
                <p className="text-4xl font-bold text-yellow-300">{fmt(total)}</p>
                <p className="mt-2 text-lg text-yellow-200">
                    Đơn giá: <span className="font-bold">{fmt(unitPrice)}</span> / nhãn
                </p>
                <div className="mt-3 flex flex-wrap gap-2 justify-center text-xs">
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">{sizeName}</span>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">
                        {quantity.toLocaleString('vi-VN')} nhãn
                    </span>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">{shapeName}</span>
                    <span className="px-2 py-1 rounded bg-gray-700 text-gray-200">
                        {materialName}
                    </span>
                </div>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                    Chi Tiết Báo Giá
                </h3>
                <div className="space-y-2">
                    <Row label="Giá cơ bản (tròn · giấy)" value={fmt(basePrice)} strong />
                    {squareSurcharge > 0 && (
                        <Row label="Phụ thu nhãn vuông (+10%)" value={fmt(squareSurcharge)} />
                    )}
                    {materialFee > 0 && <Row label="Phụ thu decal nhựa" value={fmt(materialFee)} />}
                    {laminationFee > 0 && <Row label="Phí cán màng" value={fmt(laminationFee)} />}
                    {rushFee > 0 && <Row label="Phụ phí lấy trong ngày" value={fmt(rushFee)} />}
                    <div className="flex justify-between items-baseline border-t border-gray-600 pt-3 mt-1">
                        <span className="text-base font-semibold text-gray-200">Thành tiền</span>
                        <span className="text-xl font-bold text-yellow-300">{fmt(total)}</span>
                    </div>
                    <p className="text-xs text-gray-500 pt-2">
                        ≈ {sheets.toLocaleString('vi-VN')} tờ in. {leadTimeNote}
                    </p>
                </div>
            </div>

            <ReferenceTable config={config} size={size} />
        </div>
    );
}
