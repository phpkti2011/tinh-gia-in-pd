import { useState } from 'react';
import CalendarDiagrams from './CalendarDiagrams';
import { buttonClass } from './Fields';
const money = (n) => (n == null ? 'Chưa đủ giá' : Math.round(n).toLocaleString('vi-VN') + ' đ');

export default function CalendarResult({ result: r, input, config }) {
    const [copied, setCopied] = useState('');
    const copy = async () => {
        try {
            await navigator.clipboard.writeText(
                `Lịch bàn ${r.lay.W} × ${r.lay.H} cm · ${input.n} cuốn\n${input.leaves} tờ/cuốn, in ${input.sides} mặt\nĐơn giá: ${money(r.unit)}\nTổng báo khách: ${money(r.sale)}`
            );
            setCopied('Đã sao chép');
        } catch {
            setCopied('Chưa sao chép được, vui lòng thử lại.');
        }
    };
    return (
        <div className="space-y-4">
            {!r.complete && (
                <div
                    role="status"
                    className="bg-amber-950 border border-amber-700 text-amber-200 rounded-xl p-4"
                >
                    {r.reasons.map((reason) => (
                        <p key={reason}>{reason}</p>
                    ))}
                    <p className="text-sm mt-2">
                        Các khoản bên dưới dùng để kiểm tra; chưa xuất tổng báo khách.
                    </p>
                </div>
            )}
            <section className="bg-gray-800 rounded-xl p-5 border border-cyan-800">
                <div className="flex flex-wrap justify-between gap-4">
                    <div>
                        <p className="text-gray-400 text-sm">Tổng báo khách · {input.n} cuốn</p>
                        <p className="text-3xl text-cyan-300 font-bold mt-1">{money(r.sale)}</p>
                        <p className="text-gray-300 mt-1">{money(r.unit)} / cuốn</p>
                    </div>
                    <div className="text-right">
                        <p className="text-gray-400 text-sm">Tổng giá vốn</p>
                        <p className="text-xl font-semibold">{money(r.cost)}</p>
                        <button
                            className={buttonClass + ' mt-3'}
                            disabled={!r.complete}
                            onClick={copy}
                        >
                            Sao chép báo giá
                        </button>
                        <p className="text-xs" role="status">
                            {copied}
                        </p>
                    </div>
                </div>
            </section>
            <section className="bg-gray-800 rounded-xl p-4 border border-gray-700 overflow-x-auto">
                <h2 className="font-semibold mb-3 text-lg">Chi tiết giá vốn và báo khách</h2>
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-400 border-b border-gray-600">
                            <th className="text-left py-2">Hạng mục</th>
                            <th className="text-right px-3">Giá vốn</th>
                            <th className="text-right">Báo khách</th>
                        </tr>
                    </thead>
                    <tbody>
                        {r.rows.map((row) => (
                            <tr key={row.id} className="border-b border-gray-700">
                                <td className="py-3">
                                    <div>{row.name}</div>
                                    <div className="text-xs text-gray-400 mt-1 min-w-40">
                                        {row.detail}
                                    </div>
                                </td>
                                <td className="text-right px-3 whitespace-nowrap">
                                    {money(row.cost)}
                                </td>
                                <td className="text-right whitespace-nowrap">{money(row.sale)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="mt-4 text-sm text-gray-300">
                    Riêng phần đế: vốn {money(r.baseCost)} · khách {money(r.baseSale)}. Đây là tổng
                    phụ đã nằm trong tổng lịch.
                </p>
                {input.foil && (
                    <p className="text-xs text-gray-400 mt-2">
                        Ép kim dùng tổng phí KTS cho cả cột vốn và khách; chưa có bảng giá vốn ép
                        kim riêng.
                    </p>
                )}
            </section>
            <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-800 rounded-xl p-4">
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
                <div className="bg-gray-800 rounded-xl p-4">
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
