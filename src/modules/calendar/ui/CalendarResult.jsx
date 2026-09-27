import { useState } from 'react';
import CalendarDiagrams from './CalendarDiagrams';
import { buttonClass } from './Fields';
const money = (n) => (n == null ? 'Chưa đủ giá' : Math.round(n).toLocaleString('vi-VN') + ' đ');

export default function CalendarResult({
    result: r,
    input,
    config,
    canViewCost = false,
    onBeforeCopy,
}) {
    const [copied, setCopied] = useState('');
    const [checking, setChecking] = useState(false);
    const copy = async () => {
        if (!r.complete || checking) return;
        setChecking(true);
        try {
            if (!onBeforeCopy || !(await onBeforeCopy())) return;
            await navigator.clipboard.writeText(
                `Lịch bàn ${r.lay.W} × ${r.lay.H} cm · ${input.n} cuốn\n${input.leaves} tờ/cuốn, in ${input.sides} mặt\nĐơn giá: ${money(r.unit)}\nTổng báo khách: ${money(r.sale)}`
            );
            setCopied('Đã sao chép');
        } catch {
            setCopied('Chưa sao chép được, vui lòng thử lại.');
        } finally {
            setChecking(false);
        }
    };
    return (
        <div className="space-y-6">
            {!r.complete && (
                <div
                    role="status"
                    className="bg-yellow-900/20 border border-yellow-600/40 text-yellow-200 rounded-lg p-4 text-sm"
                >
                    {r.reasons.map((reason) => (
                        <p key={reason}>{reason}</p>
                    ))}
                    <p className="text-sm mt-2">
                        Các khoản bên dưới dùng để kiểm tra; chưa xuất tổng báo khách.
                    </p>
                </div>
            )}
            <section className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 text-center">
                <p className="text-sm text-gray-400 mb-1">Tổng báo giá khách · {input.n} cuốn</p>
                <p className="text-4xl font-bold text-yellow-300">{money(r.sale)}</p>
                <p className="mt-2 text-lg text-yellow-200">
                    Đơn giá: <span className="font-bold">{money(r.unit)}</span> / cuốn
                </p>
                <div className="mt-3 flex justify-center">
                    <button
                        className={buttonClass}
                        disabled={!r.complete || checking}
                        onClick={copy}
                    >
                        Sao chép báo giá
                    </button>
                </div>
                <p className="text-xs" role="status">
                    {checking ? 'Đang kiểm tra bảng giá mới nhất…' : copied}
                </p>
                {canViewCost && (
                    <p className="mt-2 text-sm text-cyan-300">
                        Giá vốn: <span className="font-semibold">{money(r.cost)}</span>
                    </p>
                )}
            </section>
            <section className="bg-gray-800 p-6 rounded-lg border border-gray-700 overflow-x-auto">
                <h2 className="text-lg font-semibold text-gray-300 mb-4 border-b border-gray-700 pb-2">
                    Chi Tiết Tính Toán
                </h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-gray-700 text-gray-300 border-b border-gray-600">
                            <th className="text-left p-3">Hạng mục</th>
                            {canViewCost && <th className="text-right p-3">Giá vốn</th>}
                            <th className="text-right p-3">Báo khách</th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.rows.map((row) => (
                            <tr key={row.id} className="border-b border-gray-700">
                                <td className="p-3">
                                    <div>{row.name}</div>
                                    <div className="text-xs text-gray-400 mt-1 min-w-40">
                                        {canViewCost
                                            ? row.detail
                                            : row.id === 'liner'
                                              ? `${r.liner.paperName} · ${r.linerW} × ${r.linerH} cm · ${r.liner.sheets} tờ ${r.liner.stock}`
                                              : row.id === 'carton'
                                                ? `${config.materials.carton[input.selected.carton].name} · ${r.lay.count} tấm ${config.geometry.stockW} × ${config.geometry.stockH} cm`
                                                : row.detail}
                                    </div>
                                </td>
                                {canViewCost && (
                                    <td className="text-right p-3 whitespace-nowrap">
                                        {money(row.cost)}
                                    </td>
                                )}
                                <td className="text-right p-3 whitespace-nowrap font-semibold">
                                    {money(row.sale)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-4 text-sm text-gray-300">
                    Riêng phần đế: {canViewCost && <>vốn {money(r.baseCost)} · </>}khách{' '}
                    {money(r.baseSale)}. Đây là tổng phụ đã nằm trong tổng lịch.
                </p>
                {canViewCost && input.foil && (
                    <p className="text-xs text-gray-400 mt-2">
                        Ép kim dùng tổng phí KTS cho cả cột vốn và khách; chưa có bảng giá vốn ép
                        kim riêng.
                    </p>
                )}
            </section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3">
                    <p className="text-gray-400">Carton cần mua</p>
                    <strong className="text-xl">{r.lay.count} tấm lớn</strong>
                    <p>
                        Cần {r.lay.needL} mặt + {r.lay.needS} chân.
                    </p>
                    <p>
                        Dư {r.lay.producedL - r.lay.needL} mặt + {r.lay.producedS - r.lay.needS}{' '}
                        chân.
                    </p>
                </div>
                <div className="rounded-lg border border-gray-700 bg-gray-900/40 p-3">
                    <p>
                        Áo: {r.wrapW} × {r.wrapH} cm
                    </p>
                    <p>
                        Lót: {r.linerW} × {r.linerH} cm
                    </p>
                    {input.wrapperPrint && (
                        <p>
                            Vùng in: {r.wrapPrintW} × {r.wrapPrintH} cm
                        </p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                        {r.lay.optimal
                            ? 'Số tấm đạt cận dưới theo diện tích.'
                            : 'Phương án cắt khả thi; chưa bảo đảm số tấm ít nhất toàn cục.'}
                    </p>
                </div>
            </div>
            <CalendarDiagrams result={r} config={config} />
        </div>
    );
}
