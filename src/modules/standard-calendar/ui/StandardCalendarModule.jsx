import { useMemo, useState } from 'react';
import CopyButton from '../../../components/common/CopyButton';
import { STANDARD_CALENDAR_PRODUCTS } from '../config/index.js';
import {
    buildStandardCalendarQuoteText,
    standardCalendarPrice,
    standardCalendarRows,
} from '../engine/pricing.js';

const money = (n) => Math.round(n).toLocaleString('vi-VN') + ' đ';
const num = (n) => n.toLocaleString('vi-VN');

function explain(r) {
    if (r.type === 'exact') return `Đúng bậc giá ${num(r.tierQty)} cuốn.`;
    const [low, high] = r.betweenQty;
    return `Số lượng nằm giữa bậc ${num(low)} và ${num(high)} cuốn — áp đơn giá bậc ${num(r.tierQty)} cuốn.`;
}

export default function StandardCalendarModule({ onBack, heading = 'Tính Giá Lịch Khổ Chuẩn' }) {
    const [productIndex, setProductIndex] = useState(0);
    const [qtyText, setQtyText] = useState('10');
    const [showTable, setShowTable] = useState(false);

    const product = STANDARD_CALENDAR_PRODUCTS[productIndex];
    // Ô trống → NaN → "không hợp lệ" (Number('') là 0 nên phải chặn riêng).
    const qty = qtyText.trim() === '' ? NaN : Number(qtyText);
    const result = useMemo(() => standardCalendarPrice(product.tiers, qty), [product, qty]);
    const rows = useMemo(() => standardCalendarRows(product.tiers), [product]);
    const quoteText = buildStandardCalendarQuoteText(product, result);
    const priced = result.type === 'exact' || result.type === 'range';

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">{heading}</h1>
                <p className="text-gray-400 mt-2">
                    Chọn quy cách, nhập số lượng — giá trọn gói theo bảng giá lịch để bàn 2026
                </p>
            </header>

            <section
                className="bg-gray-800 p-4 md:p-6 rounded-lg mb-6"
                aria-labelledby="std-cal-products"
            >
                <h2 id="std-cal-products" className="text-lg font-semibold text-white mb-4">
                    Chọn quy cách sản phẩm
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
                    {STANDARD_CALENDAR_PRODUCTS.map((p, i) => {
                        const active = i === productIndex;
                        return (
                            <button
                                key={p.id}
                                type="button"
                                aria-pressed={active}
                                onClick={() => setProductIndex(i)}
                                className={`rounded-lg border-2 p-2 text-left transition bg-gray-900/40 ${
                                    active
                                        ? 'border-cyan-400 ring-2 ring-cyan-400/30'
                                        : 'border-gray-700 hover:border-gray-500'
                                }`}
                            >
                                <img
                                    src={p.image}
                                    alt={`Minh họa lịch ${p.name}`}
                                    loading="lazy"
                                    className="w-full aspect-[4/3] object-contain rounded bg-white"
                                />
                                <span
                                    className={`block mt-2 text-center text-sm font-semibold ${
                                        active ? 'text-cyan-300' : 'text-gray-200'
                                    }`}
                                >
                                    {p.name}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <section className="lg:col-span-1 bg-gray-800 p-6 rounded-lg space-y-4">
                    <div className="flex gap-4 items-center">
                        <img
                            src={product.image}
                            alt=""
                            className="w-28 aspect-[4/3] object-contain rounded bg-white shrink-0"
                        />
                        <div>
                            <h2 className="text-lg font-semibold text-white">{product.name}</h2>
                            <p className="text-sm text-gray-400 mt-1">{product.desc}</p>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="std-cal-qty">Số lượng (cuốn)</label>
                        <div className="relative">
                            <input
                                id="std-cal-qty"
                                type="number"
                                inputMode="numeric"
                                min={1}
                                step={1}
                                value={qtyText}
                                onChange={(e) => setQtyText(e.target.value)}
                                placeholder="Nhập số lượng"
                                className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 pr-14 text-gray-200"
                            />
                            <span className="unit">cuốn</span>
                        </div>
                    </div>
                </section>

                <section className="lg:col-span-2 space-y-6">
                    <div
                        role="status"
                        className="bg-gray-800 p-6 rounded-lg border-2 border-dashed border-yellow-500 text-center"
                    >
                        {priced && (
                            <>
                                <p className="text-sm text-gray-400 mb-1">
                                    Tổng báo giá khách · {num(result.qty)} cuốn
                                </p>
                                <p className="text-4xl font-bold text-yellow-300">
                                    {money(result.total)}
                                </p>
                                <p className="mt-2 text-lg text-yellow-200">
                                    Đơn giá: <span className="font-bold">{money(result.unit)}</span>{' '}
                                    / cuốn
                                </p>
                                <p className="mt-2 text-sm text-gray-400">{explain(result)}</p>
                                <div className="mt-3 flex justify-center">
                                    <CopyButton text={quoteText} label="Sao chép báo giá" />
                                </div>
                            </>
                        )}
                        {result.type === 'over' && (
                            <>
                                <p className="text-sm font-semibold text-orange-300 mb-1">
                                    Cần báo giá riêng
                                </p>
                                <p className="text-3xl font-bold text-white">
                                    Trên {num(result.maxQty)} cuốn
                                </p>
                                <p className="mt-2 text-sm text-gray-400">
                                    Bảng giá chỉ có tới {num(result.maxQty)} cuốn. Liên hệ admin để
                                    báo giá số lượng này.
                                </p>
                            </>
                        )}
                        {result.type === 'invalid' && (
                            <>
                                <p className="text-sm font-semibold text-red-300 mb-1">
                                    Số lượng không hợp lệ
                                </p>
                                <p className="text-sm text-gray-400">
                                    Vui lòng nhập số nguyên từ 1 cuốn trở lên.
                                </p>
                            </>
                        )}
                    </div>

                    {priced && result.cheaperTier && (
                        <div className="bg-yellow-900/20 border border-yellow-600/40 text-yellow-200 rounded-lg p-4 text-sm">
                            Lưu ý: đặt <b>{num(result.cheaperTier.qty)} cuốn</b> chỉ{' '}
                            <b>{money(result.cheaperTier.total)}</b>, rẻ hơn{' '}
                            <b>{money(result.total - result.cheaperTier.total)}</b> so với{' '}
                            {num(result.qty)} cuốn. Có thể gợi ý khách đặt tròn bậc này.
                        </div>
                    )}

                    <div className="bg-gray-800 rounded-lg">
                        <button
                            type="button"
                            aria-expanded={showTable}
                            onClick={() => setShowTable((v) => !v)}
                            className="w-full flex justify-between items-center px-6 py-4 text-left text-white font-semibold"
                        >
                            <span>Bảng giá theo số lượng — {product.name}</span>
                            <span className="text-gray-400">{showTable ? '▲' : '▼'}</span>
                        </button>
                        {showTable && (
                            <div className="px-6 pb-6 overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-gray-400 border-b border-gray-700">
                                        <tr>
                                            <th className="py-2 pr-4">Số lượng</th>
                                            <th className="py-2 pr-4 text-right">Đơn giá / cuốn</th>
                                            <th className="py-2 text-right">Tổng</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {rows.map((row) => (
                                            <tr
                                                key={row.qty}
                                                className={`border-b border-gray-700/50 ${
                                                    priced && row.qty === result.tierQty
                                                        ? 'bg-yellow-500/10 text-yellow-200'
                                                        : 'text-gray-200'
                                                }`}
                                            >
                                                <td className="py-2 pr-4">{num(row.qty)} cuốn</td>
                                                <td className="py-2 pr-4 text-right">
                                                    {money(row.unit)}
                                                </td>
                                                <td className="py-2 text-right">
                                                    {money(row.total)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <p className="text-xs text-gray-500 mt-3">
                                    Số lượng không nằm đúng bậc: dưới 70% khoảng giữa hai bậc thì áp
                                    đơn giá bậc dưới, từ 70% trở lên áp đơn giá bậc trên.
                                </p>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
