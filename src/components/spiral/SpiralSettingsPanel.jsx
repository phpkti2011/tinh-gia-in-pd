import { useState, useRef, useEffect } from 'react';
import { saveSpiralConfig } from '../../utils/configStorage';
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

function MaxInput({ tier, onCommit, className }) {
    return (
        <input
            type="number"
            value={tier.max === Infinity ? '' : tier.max}
            placeholder="(∞)"
            step={1}
            className={className}
            onChange={(e) => {
                const val = e.target.value;
                if (val.trim() === '') onCommit(Infinity);
                else {
                    const parsed = parseFloat(val);
                    if (!isNaN(parsed)) onCommit(parsed);
                }
            }}
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

export default function SpiralSettingsPanel({ config, onSave, onCancel }) {
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
            const ok = saveSpiralConfig(localConfig);
            if (!ok) {
                alert('Cấu hình sổ lò xo không hợp lệ, không lưu. Mở Console để xem lỗi.');
                return;
            }
            alert('Lưu thành công! Chương trình sẽ tính lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const s = localConfig.SPIRAL_CONFIG || {};
    const coilTiers = s.coilTiers || [];
    const thicknessTiers = s.thicknessTiers || [];

    const updCoil = (i, f, v) => updateConfig((c) => (c.SPIRAL_CONFIG.coilTiers[i][f] = v));
    const addCoil = () =>
        updateConfig((c) =>
            c.SPIRAL_CONFIG.coilTiers.push({ min: 1, max: Infinity, price: 0, type: 'per_book' })
        );
    const delCoil = (i) => updateConfig((c) => c.SPIRAL_CONFIG.coilTiers.splice(i, 1));

    const updTh = (i, f, v) => updateConfig((c) => (c.SPIRAL_CONFIG.thicknessTiers[i][f] = v));
    const addTh = () =>
        updateConfig((c) =>
            c.SPIRAL_CONFIG.thicknessTiers.push({ min: 1, max: Infinity, surcharge: 0 })
        );
    const delTh = (i) => updateConfig((c) => c.SPIRAL_CONFIG.thicknessTiers.splice(i, 1));

    const linerTypes = s.linerTypes || [];
    const ensureLiners = (c) => (c.SPIRAL_CONFIG.linerTypes = c.SPIRAL_CONFIG.linerTypes || []);
    const updLiner = (i, f, v) => updateConfig((c) => (c.SPIRAL_CONFIG.linerTypes[i][f] = v));
    const addLinerType = () =>
        updateConfig((c) => {
            ensureLiners(c);
            c.SPIRAL_CONFIG.linerTypes.push({
                name: 'Loại mới',
                costPerBook: 0,
                tiers: [{ min: 1, max: Infinity, price: 0, type: 'per_book' }],
            });
        });
    const delLinerType = (i) => updateConfig((c) => c.SPIRAL_CONFIG.linerTypes.splice(i, 1));
    const updLinerTier = (li, ti, f, v) =>
        updateConfig((c) => (c.SPIRAL_CONFIG.linerTypes[li].tiers[ti][f] = v));
    const addLinerTier = (li) =>
        updateConfig((c) =>
            c.SPIRAL_CONFIG.linerTypes[li].tiers.push({
                min: 1,
                max: Infinity,
                price: 0,
                type: 'per_book',
            })
        );
    const delLinerTier = (li, ti) =>
        updateConfig((c) => c.SPIRAL_CONFIG.linerTypes[li].tiers.splice(ti, 1));

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt Sổ đóng lò xo</h2>
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
                    Bảng giá giấy & mức giá theo trang A4 dùng chung với “In KTS Khổ Nhỏ”. Dưới đây
                    là phí đóng lò xo riêng.
                </p>

                <div className="relative max-w-xs">
                    <label className={labelCls}>Giá vốn lò xo / cuốn</label>
                    <NumInput
                        configValue={s.costPerBook ?? 0}
                        step={100}
                        className={inputCls}
                        onCommit={(v) => updateConfig((c) => (c.SPIRAL_CONFIG.costPerBook = v))}
                    />
                    <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                </div>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-cyan-400 font-bold">
                            Giá đóng lò xo (khách) — theo SỐ CUỐN
                        </h3>
                        <button
                            onClick={addCoil}
                            className={btnCls + ' bg-green-600 hover:bg-green-700 text-white'}
                        >
                            + Thêm bậc
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className={thCls}>Từ (cuốn)</th>
                                <th className={thCls}>Đến (∞)</th>
                                <th className={thCls}>Đơn giá</th>
                                <th className={thCls}>Loại</th>
                                <th className={thCls}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {coilTiers.map((tier, i) => (
                                <tr key={i} className="border-b border-gray-700/50">
                                    <td className={tdCls}>
                                        <NumInput
                                            configValue={tier.min}
                                            step={1}
                                            className={numCls}
                                            onCommit={(v) => updCoil(i, 'min', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <MaxInput
                                            tier={tier}
                                            className={numCls}
                                            onCommit={(v) => updCoil(i, 'max', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <NumInput
                                            configValue={tier.price}
                                            step={1000}
                                            className={numCls}
                                            onCommit={(v) => updCoil(i, 'price', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <select
                                            value={tier.type}
                                            onChange={(e) => updCoil(i, 'type', e.target.value)}
                                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                        >
                                            <option value="per_book">đ/cuốn</option>
                                            <option value="package">Trọn gói</option>
                                        </select>
                                    </td>
                                    <td className={tdCls}>
                                        <button
                                            onClick={() => delCoil(i)}
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
                </section>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-cyan-400 font-bold">
                            Phụ giá theo ĐỘ DÀY — tổng số tờ / cuốn
                        </h3>
                        <button
                            onClick={addTh}
                            className={btnCls + ' bg-green-600 hover:bg-green-700 text-white'}
                        >
                            + Thêm bậc
                        </button>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-gray-700">
                                <th className={thCls}>Từ (tờ)</th>
                                <th className={thCls}>Đến (∞)</th>
                                <th className={thCls}>Phụ giá / cuốn</th>
                                <th className={thCls}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {thicknessTiers.map((tier, i) => (
                                <tr key={i} className="border-b border-gray-700/50">
                                    <td className={tdCls}>
                                        <NumInput
                                            configValue={tier.min}
                                            step={1}
                                            className={numCls}
                                            onCommit={(v) => updTh(i, 'min', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <MaxInput
                                            tier={tier}
                                            className={numCls}
                                            onCommit={(v) => updTh(i, 'max', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <NumInput
                                            configValue={tier.surcharge}
                                            step={500}
                                            className={numCls}
                                            onCommit={(v) => updTh(i, 'surcharge', v)}
                                        />
                                    </td>
                                    <td className={tdCls}>
                                        <button
                                            onClick={() => delTh(i)}
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
                        Độ dày = tổng số tờ/cuốn (bìa + ruột). Để 0 nếu không phụ giá theo độ dày.
                    </p>
                </section>

                <section>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-cyan-400 font-bold">
                            Bìa lót ngoài — giá theo SỐ CUỐN
                        </h3>
                        <button
                            onClick={addLinerType}
                            className={btnCls + ' bg-green-600 hover:bg-green-700 text-white'}
                        >
                            + Thêm loại
                        </button>
                    </div>
                    <div className="space-y-4">
                        {linerTypes.map((lt, li) => (
                            <div
                                key={li}
                                className="rounded-lg border border-gray-700 bg-gray-900/40 p-3"
                            >
                                <div className="flex items-end gap-3 mb-2">
                                    <div className="flex-1">
                                        <label className={labelCls}>Tên loại</label>
                                        <input
                                            type="text"
                                            value={lt.name}
                                            onChange={(e) => updLiner(li, 'name', e.target.value)}
                                            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Giá vốn/cuốn</label>
                                        <NumInput
                                            configValue={lt.costPerBook ?? 0}
                                            step={100}
                                            className={numCls}
                                            onCommit={(v) => updLiner(li, 'costPerBook', v)}
                                        />
                                    </div>
                                    <button
                                        onClick={() => delLinerType(li)}
                                        className={
                                            btnCls + ' bg-red-600 hover:bg-red-700 text-white'
                                        }
                                    >
                                        Xóa loại
                                    </button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-700">
                                            <th className={thCls}>Từ (cuốn)</th>
                                            <th className={thCls}>Đến (∞)</th>
                                            <th className={thCls}>Đơn giá</th>
                                            <th className={thCls}>Loại</th>
                                            <th className={thCls}>
                                                <button
                                                    onClick={() => addLinerTier(li)}
                                                    className="text-green-400 hover:text-green-300 text-xs"
                                                >
                                                    + Bậc
                                                </button>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(lt.tiers || []).map((tier, ti) => (
                                            <tr key={ti} className="border-b border-gray-700/50">
                                                <td className={tdCls}>
                                                    <NumInput
                                                        configValue={tier.min}
                                                        step={1}
                                                        className={numCls}
                                                        onCommit={(v) =>
                                                            updLinerTier(li, ti, 'min', v)
                                                        }
                                                    />
                                                </td>
                                                <td className={tdCls}>
                                                    <MaxInput
                                                        tier={tier}
                                                        className={numCls}
                                                        onCommit={(v) =>
                                                            updLinerTier(li, ti, 'max', v)
                                                        }
                                                    />
                                                </td>
                                                <td className={tdCls}>
                                                    <NumInput
                                                        configValue={tier.price}
                                                        step={500}
                                                        className={numCls}
                                                        onCommit={(v) =>
                                                            updLinerTier(li, ti, 'price', v)
                                                        }
                                                    />
                                                </td>
                                                <td className={tdCls}>
                                                    <select
                                                        value={tier.type}
                                                        onChange={(e) =>
                                                            updLinerTier(
                                                                li,
                                                                ti,
                                                                'type',
                                                                e.target.value
                                                            )
                                                        }
                                                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white focus:outline-none focus:border-blue-500"
                                                    >
                                                        <option value="per_book">đ/cuốn</option>
                                                        <option value="package">Trọn gói</option>
                                                    </select>
                                                </td>
                                                <td className={tdCls}>
                                                    <button
                                                        onClick={() => delLinerTier(li, ti)}
                                                        className={
                                                            btnCls +
                                                            ' bg-red-600 hover:bg-red-700 text-white'
                                                        }
                                                    >
                                                        Xóa
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                        {linerTypes.length === 0 && (
                            <p className="text-xs text-gray-500">
                                Chưa có loại bìa lót. Bấm “+ Thêm loại”.
                            </p>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
