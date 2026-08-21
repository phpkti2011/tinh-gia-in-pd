import { useState, useRef, useEffect } from 'react';
import { saveCheapDecalConfig } from '../../utils/configStorage';

function NumInput({ configValue, onCommit, className, step }) {
    const [localStr, setLocalStr] = useState(String(configValue));
    const prev = useRef(configValue);
    useEffect(() => {
        if (prev.current !== configValue) {
            prev.current = configValue;
            setLocalStr(String(configValue));
        }
    }, [configValue]);
    const handleChange = (e) => {
        setLocalStr(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!isNaN(parsed)) onCommit(parsed);
    };
    const handleBlur = () => {
        const parsed = parseFloat(localStr);
        if (isNaN(parsed)) setLocalStr(String(configValue));
        else onCommit(parsed);
    };
    return (
        <input
            type="number"
            value={localStr}
            step={step}
            className={className}
            onChange={handleChange}
            onBlur={handleBlur}
        />
    );
}

const TextInput = ({ value, onCommit, className }) => (
    <input
        type="text"
        defaultValue={value}
        className={className}
        onBlur={(e) => onCommit(e.target.value)}
    />
);

const labelCls = 'text-gray-400 text-sm block mb-1';
const inputCls =
    'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-rose-500';
const cellCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-28 text-right focus:outline-none focus:border-rose-500';
const nameCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24 focus:outline-none focus:border-rose-500';

export default function CheapDecalSettingsPanel({ config, onSave, onCancel }) {
    const [localConfig, setLocalConfig] = useState(() => JSON.parse(JSON.stringify(config)));

    const updateConfig = (updater) => {
        setLocalConfig((prev) => {
            const cfg = JSON.parse(JSON.stringify(prev));
            updater(cfg);
            return cfg;
        });
    };

    const handleSave = () => {
        try {
            if (!saveCheapDecalConfig(localConfig)) {
                alert('Cấu hình decal giá rẻ không hợp lệ, không lưu. Mở Console để xem lỗi.');
                return;
            }
            alert('Lưu thành công! Chương trình sẽ tính lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const c = localConfig.CHEAP_DECAL_CONFIG || {};
    const sizes = c.sizes || [];
    const quantities = c.quantities || [];

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">
                    ⚙ Cài đặt Bảng giá Decal Nhãn Giá Rẻ
                </h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium"
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
                    <h3 className="text-rose-400 font-bold mb-3">
                        Bảng giá GỐC (TỔNG, tròn · decal giấy · không cán) + phụ phí/nhãn theo cỡ
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-left text-gray-400">Cỡ</th>
                                    <th className="px-2 py-2 text-right text-gray-400">nhãn/tờ</th>
                                    {quantities.map((q) => (
                                        <th key={q} className="px-2 py-2 text-right text-gray-400">
                                            {q.toLocaleString('vi-VN')}
                                        </th>
                                    ))}
                                    <th className="px-2 py-2 text-right text-rose-300">
                                        +nhựa/nhãn
                                    </th>
                                    <th className="px-2 py-2 text-right text-rose-300">
                                        +cán/nhãn
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sizes.map((s, si) => (
                                    <tr key={s.id} className="border-t border-gray-700/50">
                                        <td className="px-1 py-1">
                                            <TextInput
                                                value={s.name}
                                                className={nameCls}
                                                onCommit={(v) =>
                                                    updateConfig((cfg) => {
                                                        cfg.CHEAP_DECAL_CONFIG.sizes[si].name = v;
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <NumInput
                                                configValue={s.perSheet ?? 0}
                                                step={1}
                                                className={cellCls}
                                                onCommit={(v) =>
                                                    updateConfig((cfg) => {
                                                        cfg.CHEAP_DECAL_CONFIG.sizes[si].perSheet =
                                                            v;
                                                    })
                                                }
                                            />
                                        </td>
                                        {quantities.map((q, qi) => (
                                            <td key={q} className="px-1 py-1">
                                                <NumInput
                                                    configValue={c.priceTable?.[s.id]?.[qi] ?? 0}
                                                    step={10000}
                                                    className={cellCls}
                                                    onCommit={(v) =>
                                                        updateConfig((cfg) => {
                                                            cfg.CHEAP_DECAL_CONFIG.priceTable[s.id][
                                                                qi
                                                            ] = v;
                                                        })
                                                    }
                                                />
                                            </td>
                                        ))}
                                        <td className="px-1 py-1">
                                            <NumInput
                                                configValue={c.materialSurcharge?.[s.id] ?? 0}
                                                step={1}
                                                className={cellCls}
                                                onCommit={(v) =>
                                                    updateConfig((cfg) => {
                                                        cfg.CHEAP_DECAL_CONFIG.materialSurcharge[
                                                            s.id
                                                        ] = v;
                                                    })
                                                }
                                            />
                                        </td>
                                        <td className="px-1 py-1">
                                            <NumInput
                                                configValue={c.laminationSurcharge?.[s.id] ?? 0}
                                                step={1}
                                                className={cellCls}
                                                onCommit={(v) =>
                                                    updateConfig((cfg) => {
                                                        cfg.CHEAP_DECAL_CONFIG.laminationSurcharge[
                                                            s.id
                                                        ] = v;
                                                    })
                                                }
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h3 className="text-rose-400 font-bold mb-3">
                        Phụ phí lấy trong ngày (theo số lượng)
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {quantities.map((q) => (
                            <div key={q}>
                                <label className={labelCls}>{q.toLocaleString('vi-VN')} nhãn</label>
                                <NumInput
                                    configValue={c.rushFee?.[q] ?? 0}
                                    step={10000}
                                    className={inputCls}
                                    onCommit={(v) =>
                                        updateConfig((cfg) => {
                                            cfg.CHEAP_DECAL_CONFIG.rushFee[q] = v;
                                        })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-rose-400 font-bold mb-3">Khác</h3>
                    <div className="max-w-xs">
                        <label className={labelCls}>Phụ thu nhãn vuông (%)</label>
                        <NumInput
                            configValue={c.squareSurchargePct ?? 0}
                            step={1}
                            className={inputCls}
                            onCommit={(v) =>
                                updateConfig((cfg) => {
                                    cfg.CHEAP_DECAL_CONFIG.squareSurchargePct = v;
                                })
                            }
                        />
                    </div>
                </section>
            </div>
        </div>
    );
}
