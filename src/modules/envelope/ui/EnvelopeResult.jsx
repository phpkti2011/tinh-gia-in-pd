import { useState } from 'react';
import { buttonClass } from './Fields';
import { formatLength, PART_LABELS } from '../engine/layout';

const money = (n) => (n == null ? 'Chưa đủ giá' : Math.round(n).toLocaleString('vi-VN') + ' đ');

export default function EnvelopeResult({ result: r, input, canViewCost = false, onBeforeCopy }) {
    const [copied, setCopied] = useState('');
    const [checking, setChecking] = useState(false);
    const unit = input.unit;
    const { W, H } = r.layout.dimensionsMm;
    const copy = async () => {
        if (!r.complete || checking) return;
        setChecking(true);
        try {
            if (!onBeforeCopy || !(await onBeforeCopy())) return;
            const parts = r.parts
                .map(
                    (p) =>
                        `${p.label}: ${formatLength(p.widthMm, unit)} × ${formatLength(p.heightMm, unit)} ${unit} (${p.printEnabled ? 'có in' : 'chỉ giấy'})`
                )
                .join('\n');
            await navigator.clipboard.writeText(
                `Bao thư ${formatLength(W, unit)} × ${formatLength(H, unit)} ${unit} · ${input.quantity} cái\n${parts}\nĐơn giá: ${money(r.unit)}\nTổng báo khách: ${money(r.sale)}`
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
                <p className="text-sm text-gray-400 mb-1">
                    Tổng báo giá khách · {input.quantity} bao thư
                </p>
                <p className="text-4xl font-bold text-yellow-300">{money(r.sale)}</p>
                <p className="mt-2 text-lg text-yellow-200">
                    Đơn giá: <span className="font-bold">{money(r.unit)}</span> / bao thư
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
            <section className="bg-gray-800 p-6 rounded-lg border border-gray-700">
                <h2 className="text-lg font-semibold text-gray-300 mb-3 border-b border-gray-700 pb-2">
                    Các Phần Chuyển Sang KTS
                </h2>
                <ul className="grid gap-3 md:grid-cols-2">
                    {r.parts.map((p) => (
                        <li
                            key={p.id}
                            className="rounded-lg border border-gray-700 bg-gray-900/40 p-3 text-sm"
                        >
                            <p className="font-medium text-gray-100">{PART_LABELS[p.id]}</p>
                            <p>
                                {p.widthMm} × {p.heightMm} mm
                                {unit === 'cm' && (
                                    <span className="text-gray-400">
                                        {' '}
                                        ({formatLength(p.widthMm, 'cm')} ×{' '}
                                        {formatLength(p.heightMm, 'cm')} cm)
                                    </span>
                                )}
                            </p>
                            <p>{p.quantity.toLocaleString('vi-VN')} cái</p>
                            <span
                                className={`inline-block mt-1 px-2 py-0.5 rounded text-xs ${p.printEnabled ? 'bg-cyan-900/60 text-cyan-200' : 'bg-gray-700 text-gray-200'}`}
                            >
                                {p.printEnabled ? 'Có in' : 'Chỉ tính giấy'}
                            </span>
                        </li>
                    ))}
                </ul>
                <p className="text-xs text-gray-400 mt-3">
                    Kích thước khuôn chưa gồm bleed và biên in. Nắp và tay dán đã nằm trong khổ
                    trải; số lượng là số chi tiết, chưa cộng hao hụt.
                </p>
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
                                        {row.detail}
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
                {canViewCost && input.foil && (
                    <p className="text-xs text-gray-400 mt-2">
                        Ép nhũ dùng tổng phí KTS cho cả cột vốn và khách; chưa có bảng giá vốn ép
                        nhũ riêng.
                    </p>
                )}
            </section>
        </div>
    );
}
