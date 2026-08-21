import { useState, useRef, useEffect } from 'react';
import { saveCardConfig } from '../../utils/configStorage';

// NumInput: nullable=true cho phép để trống → commit null (ô giá thẻ gỗ 4.000–4.999).
function NumInput({ configValue, onCommit, className, step, nullable }) {
    const toStr = (v) => (v == null ? '' : String(v));
    const [localStr, setLocalStr] = useState(toStr(configValue));
    const prev = useRef(configValue);
    useEffect(() => {
        if (prev.current !== configValue) {
            prev.current = configValue;
            setLocalStr(toStr(configValue));
        }
    }, [configValue]);
    const handleChange = (e) => {
        const v = e.target.value;
        setLocalStr(v);
        if (v.trim() === '') {
            if (nullable) onCommit(null);
            return;
        }
        const parsed = parseFloat(v);
        if (!isNaN(parsed)) onCommit(parsed);
    };
    const handleBlur = () => {
        if (localStr.trim() === '') {
            if (nullable) onCommit(null);
            else setLocalStr(toStr(configValue));
            return;
        }
        const parsed = parseFloat(localStr);
        if (isNaN(parsed)) setLocalStr(toStr(configValue));
        else onCommit(parsed);
    };
    return (
        <input
            type="number"
            value={localStr}
            step={step}
            placeholder={nullable ? '(trống)' : ''}
            className={className}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
}

const labelCls = 'text-gray-400 text-sm block mb-1';
const inputCls =
    'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-indigo-500';
const cellCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24 text-right focus:outline-none focus:border-indigo-500';

export default function CardSettingsPanel({ config, onSave, onCancel }) {
    const [localConfig, setLocalConfig] = useState(() => JSON.parse(JSON.stringify(config)));

    const updateConfig = (updater) => {
        setLocalConfig((prev) => {
            const c = JSON.parse(JSON.stringify(prev));
            updater(c);
            return c;
        });
    };

    const handleSave = () => {
        try {
            const ok = saveCardConfig(localConfig);
            if (!ok) {
                alert('Cấu hình thẻ nhựa không hợp lệ, không lưu. Mở Console để xem lỗi.');
                return;
            }
            alert('Lưu thành công! Chương trình sẽ tính lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const c = localConfig.CARD_CONFIG || {};
    const stdProducts = (c.products || []).filter((p) => p.table === 'standard');
    const woodProducts = (c.products || []).filter((p) => p.table === 'wood');

    const setPrice = (tierKey, rowIdx, prodId, v) =>
        updateConfig((cfg) => {
            cfg.CARD_CONFIG[tierKey][rowIdx].prices[prodId] = v;
        });
    const setScalar = (field, v) =>
        updateConfig((cfg) => {
            cfg.CARD_CONFIG[field] = v;
        });
    const setAddon = (i, v) =>
        updateConfig((cfg) => {
            cfg.CARD_CONFIG.addons[i].base = v;
        });
    const setSegment = (i, v) =>
        updateConfig((cfg) => {
            cfg.CARD_CONFIG.segments[i].multiplier = v;
        });
    const setLowProfit = (q, v) =>
        updateConfig((cfg) => {
            cfg.CARD_CONFIG.lowQtyProfit[q] = v;
        });

    const TierMatrix = ({ tierKey, products, nullable }) => (
        <div className="overflow-x-auto">
            <table className="text-xs border-collapse">
                <thead>
                    <tr>
                        <th className="px-2 py-2 text-left text-gray-400 sticky left-0 bg-gray-800">
                            Bậc \ Loại
                        </th>
                        {products.map((p) => (
                            <th key={p.id} className="px-2 py-2 text-right text-gray-400">
                                {p.name}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {(c[tierKey] || []).map((t, ri) => (
                        <tr key={t.label + ri} className="border-t border-gray-700/50">
                            <td className="px-2 py-1 text-gray-200 whitespace-nowrap sticky left-0 bg-gray-800">
                                {t.label}
                            </td>
                            {products.map((p) => (
                                <td key={p.id} className="px-1 py-1">
                                    <NumInput
                                        configValue={t.prices?.[p.id] ?? null}
                                        step={100}
                                        nullable={nullable}
                                        className={cellCls}
                                        onCommit={(v) => setPrice(tierKey, ri, p.id, v)}
                                    />
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const scalarFields = [
        ['shipping', 'Phí ship / đơn (đ)'],
        ['minProfit', 'Lợi nhuận tối thiểu / đơn (đ)'],
        ['minOrderAdd', 'Sàn đơn hàng cộng vào giá gốc (đ)'],
        ['roundTo', 'Làm tròn CEIL bội (đ)'],
        ['maxQty', 'SL tối đa (trên → liên hệ)'],
        ['moq', 'MOQ nhà cung cấp (thẻ)'],
    ];

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt Bảng giá Thẻ Nhựa</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded font-medium"
                    >
                        Lưu
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
                    >
                        Hủy
                    </button>
                </div>
            </div>

            <div className="space-y-8">
                <section>
                    <h3 className="text-indigo-400 font-bold mb-3">
                        Bảng giá GỐC — thẻ nhựa (đ/thẻ theo bậc SL)
                    </h3>
                    <TierMatrix tierKey="standardTiers" products={stdProducts} nullable={false} />
                </section>

                <section>
                    <h3 className="text-indigo-400 font-bold mb-3">
                        Bảng giá GỐC — thẻ gỗ (để trống = liên hệ báo giá)
                    </h3>
                    <TierMatrix tierKey="woodTiers" products={woodProducts} nullable={true} />
                </section>

                <section>
                    <h3 className="text-indigo-400 font-bold mb-3">Dịch vụ gia tăng (giá gốc)</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {(c.addons || []).map((a, i) => (
                            <div key={a.id}>
                                <label className={labelCls}>{a.name}</label>
                                <NumInput
                                    configValue={a.base ?? 0}
                                    step={100}
                                    className={inputCls}
                                    onCommit={(v) => setAddon(i, v)}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-indigo-400 font-bold mb-3">Hệ số nhóm khách</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(c.segments || []).map((sg, i) => (
                            <div key={sg.id}>
                                <label className={labelCls}>{sg.name}</label>
                                <NumInput
                                    configValue={sg.multiplier ?? 1}
                                    step={0.1}
                                    className={inputCls}
                                    onCommit={(v) => setSegment(i, v)}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-indigo-400 font-bold mb-3">Hằng số</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {scalarFields.map(([field, label]) => (
                            <div key={field}>
                                <label className={labelCls}>{label}</label>
                                <NumInput
                                    configValue={c[field] ?? 0}
                                    step={100}
                                    className={inputCls}
                                    onCommit={(v) => setScalar(field, v)}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-indigo-400 font-bold mb-3">
                        Lợi nhuận / đơn theo SL thấp (1–9 thẻ)
                    </h3>
                    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
                        {Object.keys(c.lowQtyProfit || {})
                            .sort((a, b) => Number(a) - Number(b))
                            .map((q) => (
                                <div key={q}>
                                    <label className={labelCls}>{q} thẻ</label>
                                    <NumInput
                                        configValue={c.lowQtyProfit[q] ?? 0}
                                        step={10000}
                                        className={inputCls}
                                        onCommit={(v) => setLowProfit(q, v)}
                                    />
                                </div>
                            ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
