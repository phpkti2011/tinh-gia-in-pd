import { useState, useRef, useEffect } from 'react';
import { saveFlyerConfig } from '../../utils/configStorage';

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

const labelCls = 'text-gray-400 text-sm block mb-1';
const inputCls =
    'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-amber-500';
const cellCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-28 text-right focus:outline-none focus:border-amber-500';
const btnCls = 'px-3 py-1 rounded text-sm font-medium';
const btnAdd = btnCls + ' bg-green-600 hover:bg-green-700 text-white';
const btnDel = btnCls + ' bg-red-600 hover:bg-red-700 text-white';

export default function FlyerSettingsPanel({ config, onSave, onCancel }) {
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
            if (!saveFlyerConfig(localConfig)) {
                alert('Cấu hình tờ rơi không hợp lệ, không lưu. Mở Console để xem lỗi.');
                return;
            }
            alert('Lưu thành công! Chương trình sẽ tính lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const c = localConfig.FLYER_CONFIG || {};
    const sizeIds = (c.sizes || []).map((s) => s.id);

    const setRow = (sizeId, i, field, v) =>
        updateConfig((cfg) => {
            cfg.FLYER_CONFIG.priceTable[sizeId][i][field] = v;
        });
    const addRow = (sizeId) =>
        updateConfig((cfg) => {
            cfg.FLYER_CONFIG.priceTable[sizeId].push({ qty: 0, price: 0 });
        });
    const delRow = (sizeId, i) =>
        updateConfig((cfg) => {
            cfg.FLYER_CONFIG.priceTable[sizeId].splice(i, 1);
        });

    const PriceTableEditor = ({ sizeId }) => (
        <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
                <h4 className="text-gray-300 font-semibold">Khổ {sizeId}</h4>
                <button onClick={() => addRow(sizeId)} className={btnAdd}>
                    + Thêm mốc
                </button>
            </div>
            <table className="w-full text-xs">
                <thead>
                    <tr className="border-b border-gray-700">
                        <th className="px-2 py-1 text-left text-gray-400">Số lượng (tờ)</th>
                        <th className="px-2 py-1 text-left text-gray-400">Tổng (đ)</th>
                        <th className="px-2 py-1"></th>
                    </tr>
                </thead>
                <tbody>
                    {(c.priceTable?.[sizeId] || []).map((r, i) => (
                        <tr key={i} className="border-b border-gray-700/50">
                            <td className="px-2 py-1">
                                <NumInput
                                    configValue={r.qty}
                                    step={10}
                                    className={cellCls}
                                    onCommit={(v) => setRow(sizeId, i, 'qty', v)}
                                />
                            </td>
                            <td className="px-2 py-1">
                                <NumInput
                                    configValue={r.price}
                                    step={10000}
                                    className={cellCls}
                                    onCommit={(v) => setRow(sizeId, i, 'price', v)}
                                />
                            </td>
                            <td className="px-2 py-1">
                                <button onClick={() => delRow(sizeId, i)} className={btnDel}>
                                    Xóa
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt Bảng giá Tờ Rơi</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium"
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
                    <h3 className="text-amber-400 font-bold mb-3">
                        Bảng giá GỐC (tổng, baseline C150 · 2 mặt · không cán)
                    </h3>
                    {sizeIds.map((sid) => (
                        <PriceTableEditor key={sid} sizeId={sid} />
                    ))}
                </section>

                <section>
                    <h3 className="text-amber-400 font-bold mb-3">Phụ thu giấy / tờ theo khổ</h3>
                    <div className="overflow-x-auto">
                        <table className="text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-left text-gray-400">
                                        Giấy \ Khổ
                                    </th>
                                    {sizeIds.map((sid) => (
                                        <th
                                            key={sid}
                                            className="px-2 py-2 text-right text-gray-400"
                                        >
                                            {sid}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(c.paperTypes || []).map((p) => (
                                    <tr key={p.id} className="border-t border-gray-700/50">
                                        <td className="px-2 py-1 text-gray-200">{p.name}</td>
                                        {sizeIds.map((sid) => (
                                            <td key={sid} className="px-1 py-1">
                                                <NumInput
                                                    configValue={
                                                        c.paperSurcharge?.[p.id]?.[sid] ?? 0
                                                    }
                                                    step={50}
                                                    className={cellCls}
                                                    onCommit={(v) =>
                                                        updateConfig((cfg) => {
                                                            if (
                                                                !cfg.FLYER_CONFIG.paperSurcharge[
                                                                    p.id
                                                                ]
                                                            )
                                                                cfg.FLYER_CONFIG.paperSurcharge[
                                                                    p.id
                                                                ] = {};
                                                            cfg.FLYER_CONFIG.paperSurcharge[p.id][
                                                                sid
                                                            ] = v;
                                                        })
                                                    }
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                <section>
                    <h3 className="text-amber-400 font-bold mb-3">Phụ thu cán màng / tờ</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {sizeIds.map((sid) => (
                            <div key={sid}>
                                <label className={labelCls}>Khổ {sid}</label>
                                <NumInput
                                    configValue={c.laminationSurcharge?.[sid] ?? 0}
                                    step={50}
                                    className={inputCls}
                                    onCommit={(v) =>
                                        updateConfig((cfg) => {
                                            cfg.FLYER_CONFIG.laminationSurcharge[sid] = v;
                                        })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>

                <section>
                    <h3 className="text-amber-400 font-bold mb-3">
                        Phí cấn gấp (phẳng/đơn theo bậc SL)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-left text-gray-400">
                                        Đến SL (tờ)
                                    </th>
                                    <th className="px-2 py-2 text-right text-gray-400">
                                        1-2 đường
                                    </th>
                                    <th className="px-2 py-2 text-right text-gray-400">
                                        3-5 đường
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {(c.creasing?.bands || []).map((b, i) => (
                                    <tr key={i} className="border-t border-gray-700/50">
                                        <td className="px-1 py-1">
                                            <NumInput
                                                configValue={b.maxQty}
                                                step={100}
                                                className={cellCls}
                                                onCommit={(v) =>
                                                    updateConfig((cfg) => {
                                                        cfg.FLYER_CONFIG.creasing.bands[i].maxQty =
                                                            v;
                                                    })
                                                }
                                            />
                                        </td>
                                        {['1-2', '3-5'].map((k) => (
                                            <td key={k} className="px-1 py-1">
                                                <NumInput
                                                    configValue={b.prices?.[k] ?? 0}
                                                    step={10000}
                                                    className={cellCls}
                                                    onCommit={(v) =>
                                                        updateConfig((cfg) => {
                                                            cfg.FLYER_CONFIG.creasing.bands[
                                                                i
                                                            ].prices[k] = v;
                                                        })
                                                    }
                                                />
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="mt-3 max-w-xs">
                        <label className={labelCls}>Trên mốc cao nhất · 1-2 đường (đ/tờ)</label>
                        <NumInput
                            configValue={c.creasing?.overMax?.['1-2']?.perSheet ?? 0}
                            step={10}
                            className={inputCls}
                            onCommit={(v) =>
                                updateConfig((cfg) => {
                                    cfg.FLYER_CONFIG.creasing.overMax['1-2'].perSheet = v;
                                })
                            }
                        />
                        <p className="mt-1 text-xs text-gray-500">
                            3-5 đường trên mốc cao nhất → cần P&D xác nhận riêng (không tính tự
                            động).
                        </p>
                    </div>
                </section>

                <section>
                    <h3 className="text-amber-400 font-bold mb-3">Hệ số & tối thiểu</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelCls}>Giảm in 1 mặt (%)</label>
                            <NumInput
                                configValue={c.oneSideDiscountPct ?? 0}
                                step={1}
                                className={inputCls}
                                onCommit={(v) =>
                                    updateConfig((cfg) => {
                                        cfg.FLYER_CONFIG.oneSideDiscountPct = v;
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Phụ thu 3-5 nội dung (%)</label>
                            <NumInput
                                configValue={c.contentSurchargePct ?? 0}
                                step={1}
                                className={inputCls}
                                onCommit={(v) =>
                                    updateConfig((cfg) => {
                                        cfg.FLYER_CONFIG.contentSurchargePct = v;
                                    })
                                }
                            />
                        </div>
                        <div>
                            <label className={labelCls}>Ngưỡng lấy mốc trên (%)</label>
                            <NumInput
                                configValue={c.upperThresholdPct ?? 0}
                                step={1}
                                className={inputCls}
                                onCommit={(v) =>
                                    updateConfig((cfg) => {
                                        cfg.FLYER_CONFIG.upperThresholdPct = v;
                                    })
                                }
                            />
                        </div>
                        {(c.sizes || []).map((s, i) => (
                            <div key={s.id}>
                                <label className={labelCls}>SL tối thiểu · {s.id} (tờ)</label>
                                <NumInput
                                    configValue={s.min}
                                    step={10}
                                    className={inputCls}
                                    onCommit={(v) =>
                                        updateConfig((cfg) => {
                                            cfg.FLYER_CONFIG.sizes[i].min = v;
                                        })
                                    }
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
