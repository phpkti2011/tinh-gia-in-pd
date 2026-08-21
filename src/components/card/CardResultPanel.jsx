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

// LƯU Ý: KHÔNG hiển thị giá gốc / hệ số cho khách (DECISIONS.md D-003).
export default function CardResultPanel({ result, config, isCalculating }) {
    const c = config.CARD_CONFIG || {};

    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập thông số để xem báo giá thẻ nhựa.
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

    const notes = (
        <div className="bg-gray-800 p-5 rounded-lg border border-gray-700 mt-4">
            <p className="text-sm font-semibold text-gray-300 mb-2">Lưu ý báo giá</p>
            <ul className="text-xs text-gray-400 space-y-1 list-disc list-inside">
                <li>
                    Giá tự động theo số lượng & loại thẻ; dịch vụ gia tăng đã tính theo nhóm khách.
                </li>
                <li>
                    Thẻ gỗ 4.000–4.999 và số lượng trên {c.maxQty?.toLocaleString('vi-VN')} thẻ →
                    liên hệ báo giá.
                </li>
                <li>
                    Giá cuối có thể thay đổi với yêu cầu đặc biệt (thiết kế, quy cách phi tiêu
                    chuẩn).
                </li>
            </ul>
        </div>
    );

    // Liên hệ báo giá.
    if (result.isContact) {
        return (
            <div
                className="transition-opacity duration-300"
                style={{ opacity: isCalculating ? 0.5 : 1 }}
            >
                <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                    <span className="inline-block text-xs px-3 py-1 rounded-full bg-yellow-500/20 text-yellow-300 mb-3">
                        {result.status}
                    </span>
                    <p className="text-4xl font-bold text-yellow-300">LIÊN HỆ</p>
                    {result.hotline && (
                        <p className="mt-2 text-lg text-yellow-200">
                            Hotline: <span className="font-bold">{result.hotline}</span>
                        </p>
                    )}
                </div>
                <div className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-2">
                    <Row label="Sản phẩm" value={result.productName} />
                    <Row label="Nhóm khách hàng" value={result.segmentName} />
                    <Row
                        label="Số lượng"
                        value={
                            result.qty != null ? `${result.qty.toLocaleString('vi-VN')} thẻ` : '—'
                        }
                    />
                    <Row label="Mốc giá áp dụng" value={result.tierLabel} />
                    <Row label="Tổng tiền" value="—" />
                </div>
                {notes}
            </div>
        );
    }

    return (
        <div
            className="transition-opacity duration-300"
            style={{ opacity: isCalculating ? 0.5 : 1 }}
        >
            <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                <span className="inline-block text-xs px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 mb-3">
                    {result.status}
                </span>
                <p className="text-sm text-gray-400 mb-1">Đơn giá bán</p>
                <p className="text-4xl font-bold text-yellow-300">{fmt(result.unit)} / thẻ</p>
                <p className="mt-2 text-lg text-yellow-200">
                    Tổng tiền: <span className="font-bold">{fmt(result.total)}</span>
                </p>
            </div>

            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                    Chi Tiết Báo Giá
                </h3>
                <div className="space-y-2">
                    <Row label="Sản phẩm" value={result.productName} />
                    <Row label="Mốc giá áp dụng" value={result.tierLabel} />
                    <Row label="Nhóm khách hàng" value={result.segmentName} />
                    <Row label="Số lượng" value={`${result.qty.toLocaleString('vi-VN')} thẻ`} />
                    <Row label="Đơn giá" value={`${fmt(result.unit)} / thẻ`} />
                    <div className="flex justify-between items-baseline border-t border-gray-600 pt-3 mt-1">
                        <span className="text-base font-semibold text-gray-200">Tổng tiền</span>
                        <span className="text-xl font-bold text-yellow-300">
                            {fmt(result.total)}
                        </span>
                    </div>
                </div>
            </div>
            {notes}
        </div>
    );
}
