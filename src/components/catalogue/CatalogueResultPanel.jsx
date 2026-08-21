import { useAuth } from '../../auth/useAuth';
import { useUserRole } from '../../auth/useUserRole';

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

function SectionCard({ title, section }) {
    return (
        <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3">
            <p className="text-sm font-semibold text-red-300 mb-2">{title}</p>
            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between">
                    <span className="text-gray-400">Giấy</span>
                    <span className="text-gray-100">{section.paperName}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Số tờ gấp / cuốn</span>
                    <span className="text-gray-100">{section.signatures}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Tổng số tờ in</span>
                    <span className="text-gray-100">
                        {section.sheets.toLocaleString('vi-VN')}
                    </span>
                </div>
                <div className="flex justify-between">
                    <span className="text-gray-400">Trang A4</span>
                    <span className="text-gray-100">{section.a4.toLocaleString('vi-VN')}</span>
                </div>
            </div>
        </div>
    );
}

export default function CatalogueResultPanel({ result, config: _config, isCalculating }) {
    const { user } = useAuth();
    const { isAdmin } = useUserRole(user);

    if (!result) {
        return (
            <div className="h-full min-h-[400px]">
                <div className="h-full flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-gray-600 shadow-inner">
                    <p className="text-gray-400 text-center p-8 animate-pulse">
                        Nhập thông số để xem báo giá catalogue.
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
        pieceW_mm,
        pieceH_mm,
        pieceW_cm,
        pieceH_cm,
        pressSheetSize,
        productsPerSheet,
        cover,
        inner,
        coverSingleSide,
        signaturesPerBook,
        totalPrintSheets,
        totalA4Pages,
        coverA4,
        innerA4,
        unitPriceText,
        printPrice,
        printPricePerPage,
        lamLabel,
        lamCost,
        paperAdjustment,
        paperAdjustmentReason,
        paperSurcharge,
        artPaperCost,
        stapleCustomer,
        stapleUnitText,
        giaVon,
        totalCustomerCost,
        unitPerBook,
    } = result;

    return (
        <div className="transition-opacity duration-300" style={{ opacity: isCalculating ? 0.5 : 1 }}>
            {/* Tổng + đơn giá/cuốn */}
            <div className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 mb-6 text-center">
                <p className="text-sm text-gray-400 mb-1">Tổng báo giá khách (đã gồm bấm kim)</p>
                <p className="text-4xl font-bold text-yellow-300">{fmt(totalCustomerCost)}</p>
                <p className="mt-2 text-lg text-yellow-200">
                    Đơn giá: <span className="font-bold">{fmt(unitPerBook)}</span> / cuốn
                </p>
                {isAdmin && (
                    <p className="mt-1 text-sm text-cyan-300">
                        Giá vốn: <span className="font-semibold">{fmt(giaVon)}</span>
                    </p>
                )}
            </div>

            {/* Bìa / Ruột */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <SectionCard
                    title={`Bìa (${coverSingleSide ? '2 trang · in 1 mặt' : '4 trang · in 2 mặt'})`}
                    section={cover}
                />
                {inner ? (
                    <SectionCard title="Ruột" section={inner} />
                ) : (
                    <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3 flex items-center justify-center text-sm text-gray-500">
                        Không có ruột (chỉ 4 trang bìa)
                    </div>
                )}
            </div>

            {/* Chi tiết */}
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h3 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                    Chi Tiết Tính Toán
                </h3>
                <div className="space-y-2">
                    <Row
                        label="Khổ trang in (spread)"
                        value={`${pieceW_mm} × ${pieceH_mm} mm (${pieceW_cm.toFixed(1)} × ${pieceH_cm.toFixed(1)} cm)`}
                    />
                    <Row
                        label="Khổ tờ in (tự chọn)"
                        value={`${pressSheetSize} cm · ${productsPerSheet} sp/tờ`}
                    />
                    <Row label="Tổng số tờ gấp / cuốn" value={signaturesPerBook} />
                    <Row label="Tổng số tờ in" value={totalPrintSheets.toLocaleString('vi-VN')} strong />
                    <Row
                        label="Số trang A4 quy đổi (gộp)"
                        value={`${totalA4Pages.toLocaleString('vi-VN')} (bìa ${coverA4.toLocaleString('vi-VN')} + ruột ${innerA4.toLocaleString('vi-VN')})`}
                        strong
                    />
                    <Row label="Đơn giá in" value={unitPriceText} />
                    {printPricePerPage > 0 && (
                        <Row
                            label="Đơn giá in / trang (quy đổi)"
                            value={`${Math.round(printPricePerPage).toLocaleString('vi-VN')} đ/trang`}
                        />
                    )}
                    <Row label="Tiền in" value={fmt(printPrice)} />
                    {lamCost > 0 && <Row label={`Cán màng (${lamLabel})`} value={fmt(lamCost)} />}
                    {artPaperCost > 0 && <Row label="Giấy mỹ thuật" value={fmt(artPaperCost)} />}
                    {paperSurcharge > 0 && (
                        <Row label="Phụ thu vật liệu" value={fmt(paperSurcharge)} />
                    )}
                    {paperAdjustment > 0 && (
                        <Row
                            label={`Giảm giá giấy${paperAdjustmentReason ? ` (${paperAdjustmentReason})` : ''}`}
                            value={'− ' + fmt(paperAdjustment)}
                        />
                    )}
                    {paperAdjustment < 0 && (
                        <Row
                            label={`Phụ thu giấy cao cấp${paperAdjustmentReason ? ` (${paperAdjustmentReason})` : ''}`}
                            value={'+ ' + fmt(-paperAdjustment)}
                        />
                    )}
                    <Row
                        label={`Phí bấm kim${stapleUnitText && stapleUnitText !== '—' ? ` (${stapleUnitText})` : ''}`}
                        value={fmt(stapleCustomer)}
                    />
                    <div className="flex justify-between items-baseline border-t border-gray-600 pt-3 mt-1">
                        <span className="text-base font-semibold text-gray-200">
                            Tổng cộng (đã gồm bấm kim)
                        </span>
                        <span className="text-xl font-bold text-yellow-300">
                            {fmt(totalCustomerCost)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
