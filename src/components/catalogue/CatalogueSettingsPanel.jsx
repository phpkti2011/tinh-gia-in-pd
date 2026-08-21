import { useState, useRef, useEffect } from 'react';
import { saveCatalogueConfig } from '../../utils/configStorage';
import { restoreInfinity } from '../../utils/restoreInfinity';

function NumInput({ configValue, onCommit, className, step }) {
    const [localStr, setLocalStr] = useState(String(configValue));
    const prevConfig = useRef(configValue);
    useEffect(() => {
        if (prevConfig.current !== configValue) {
            prevConfig.current = configValue;
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

const inputCls =
    'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500 pr-12';
const labelCls = 'text-gray-400 text-sm block mb-1';
const thCls = 'px-2 py-2 text-left text-gray-400 text-xs uppercase';
const tdCls = 'px-2 py-2';
const numCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24 focus:outline-none focus:border-blue-500';
const btnCls = 'px-3 py-1 rounded text-sm font-medium';

export default function CatalogueSettingsPanel({ config, onSave, onCancel }) {
    const [localConfig, setLocalConfig] = useState(() =>
        restoreInfinity(JSON.parse(JSON.stringify(config)))
    );

    const updateConfig = (updater) => {
        setLocalConfig((prev) => {
            const c = restoreInfinity(JSON.parse(JSON.stringify(prev)));
            updater(c);
            return c;
        });
    };

    const handleSave = () => {
        try {
            const ok = saveCatalogueConfig(localConfig);
            if (!ok) {
                alert('Cấu hình catalogue không hợp lệ, không lưu. Mở Console để xem lỗi.');
                return;
            }
            alert('Lưu thành công! Chương trình sẽ tính lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const staple = localConfig.STAPLE_CONFIG || {};
    const tiers = staple.tiers || [];

    const updateTier = (idx, field, val) =>
        updateConfig((c) => {
            c.STAPLE_CONFIG.tiers[idx][field] = val;
        });
    const addTier = () =>
        updateConfig((c) => {
            c.STAPLE_CONFIG.tiers.push({ min: 1, max: Infinity, price: 0, type: 'per_book' });
        });
    const delTier = (idx) =>
        updateConfig((c) => {
            c.STAPLE_CONFIG.tiers.splice(idx, 1);
        });

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt Catalogue bấm kim</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
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

            <div className="space-y-6">
                <p className="text-xs text-gray-400">
                    Bảng giá giấy & mức giá theo trang A4 dùng chung với “In KTS Khổ Nhỏ” — chỉnh ở
                    đó. Dưới đây là phí bấm kim riêng của catalogue.
                </p>

                <div className="relative max-w-xs">
                    <label className={labelCls}>Giá vốn bấm kim / cuốn</label>
                    <NumInput
                        configValue={staple.costPerBook ?? 0}
                        step={100}
                        className={inputCls}
                        onCommit={(v) =>
                            updateConfig((c) => {
                                c.STAPLE_CONFIG.costPerBook = v;
                            })
                        }
                    />
                    <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                </div>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-cyan-400 font-bold">
                            Bảng giá bấm kim (báo khách) — theo SỐ CUỐN
                        </h3>
                        <button
                            onClick={addTier}
                            className={btnCls + ' bg-green-600 hover:bg-green-700 text-white'}
                        >
                            + Thêm bậc
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className={thCls}>Từ (cuốn)</th>
                                <th className={thCls}>Đến (trống = ∞)</th>
                                <th className={thCls}>Đơn giá</th>
                                <th className={thCls}>Loại</th>
                                <th className={thCls}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {tiers.map((tier, i) => (
                                <tr key={i} className="border-b border-gray-700/50">
                                    <td className={tdCls}>
                                        <NumInput
                                            configValue={tier.min}
                                            step={1}
                                            className={numCls}
                                            onCommit={(v) => updateTier(i, 'min', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <input
                                            type="number"
                                            value={tier.max === Infinity ? '' : tier.max}
                                            placeholder="(∞)"
                                            step={1}
                                            className={numCls}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val.trim() === '') {
                                                    updateTier(i, 'max', Infinity);
                                                } else {
                                                    const parsed = parseFloat(val);
                                                    if (!isNaN(parsed))
                                                        updateTier(i, 'max', parsed);
                                                }
                                            }}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <NumInput
                                            configValue={tier.price}
                                            step={1000}
                                            className={numCls}
                                            onCommit={(v) => updateTier(i, 'price', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <select
                                            value={tier.type}
                                            onChange={(e) => updateTier(i, 'type', e.target.value)}
                                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="per_book">đ/cuốn</option>
                                            <option value="package">Trọn gói</option>
                                        </select>
                                    </td>
                                    <td className={tdCls}>
                                        <button
                                            onClick={() => delTier(i)}
                                            className={
                                                btnCls + ' bg-red-600 hover:bg-red-700 text-white'
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <p className="mt-2 text-xs text-gray-500">
                        “Trọn gói” = tính 1 lần cho cả đơn; “đ/cuốn” = đơn giá × số cuốn. Các bậc
                        nên liền mạch (từ = đến bậc trước + 1).
                    </p>
                </section>
            </div>
        </div>
    );
}
