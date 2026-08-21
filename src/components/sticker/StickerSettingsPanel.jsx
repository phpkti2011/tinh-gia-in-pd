import { useState, useRef, useEffect } from 'react';
import { saveStickerConfig } from '../../utils/configStorage';

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

const labelCls = 'text-gray-400 text-sm block mb-1';
const inputCls =
    'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-pink-500';
const cellCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24 text-right focus:outline-none focus:border-pink-500';

export default function StickerSettingsPanel({ config, onSave, onCancel }) {
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
            const ok = saveStickerConfig(localConfig);
            if (!ok) {
                alert('Cấu hình sticker không hợp lệ, không lưu. Mở Console để xem lỗi.');
                return;
            }
            alert('Lưu thành công! Chương trình sẽ tính lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const s = localConfig.STICKER_CONFIG || {};
    const tiers = s.tiers || [];
    const sizeKeys = s.sizeOrder || Object.keys(s.sizes || {});
    const finishKeys = s.finishOrder || Object.keys(s.finishes || {});

    const setUnit = (sizeKey, i, v) =>
        updateConfig((c) => {
            c.STICKER_CONFIG.sizes[sizeKey].units[i] = v;
        });
    const setLaminate = (sizeKey, v) =>
        updateConfig((c) => {
            c.STICKER_CONFIG.sizes[sizeKey].laminateFixed = v;
            if (c.STICKER_CONFIG.finishes?.laminate?.fixedBySize) {
                c.STICKER_CONFIG.finishes.laminate.fixedBySize[sizeKey] = v;
            }
        });
    const setScalar = (field, v) =>
        updateConfig((c) => {
            c.STICKER_CONFIG[field] = v;
        });
    const setFinishPct = (key, v) =>
        updateConfig((c) => {
            c.STICKER_CONFIG.finishes[key].percent = v;
        });

    const scalarFields = [
        ['upperThresholdPct', 'Ngưỡng lấy mốc trên (%)'],
        ['minBillableQty', 'SL tính tiền tối thiểu (tờ)'],
        ['maxQty', 'SL tối đa (trên mức → báo giá riêng)'],
        ['stickerFree', 'Sticker/tờ miễn phụ phí'],
        ['stickerStep', 'Bước sticker cộng phụ phí'],
        ['stickerPctPerStep', 'Phụ phí mỗi bước sticker (%)'],
        ['contentFreeVector', 'Nội dung miễn phí (vector)'],
        ['contentFreeImage', 'Nội dung miễn phí (ảnh)'],
        ['contentPctPerExtra', 'Phụ phí mỗi nội dung vượt (%)'],
        ['cutPathFee', 'Phí vẽ đường cắt (đ)'],
        ['cutPathQtyThreshold', 'Ngưỡng SL áp phí vẽ cắt (tờ)'],
    ];

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt Bảng giá Tờ Sticker</h2>
                <div className="flex gap-3">
                    <button
                        onClick={handleSave}
                        className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded font-medium"
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
                    <h3 className="text-pink-400 font-bold mb-3">
                        Ma trận đơn giá / tờ theo khổ & bậc số lượng (đ)
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="text-xs border-collapse">
                            <thead>
                                <tr>
                                    <th className="px-2 py-2 text-left text-gray-400 sticky left-0 bg-gray-800">
                                        Khổ \ Bậc (tờ)
                                    </th>
                                    {tiers.map((t) => (
                                        <th key={t} className="px-2 py-2 text-right text-gray-400">
                                            {t.toLocaleString('vi-VN')}
                                        </th>
                                    ))}
                                    <th className="px-2 py-2 text-right text-pink-300">
                                        Laminate/tờ
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {sizeKeys.map((k) => (
                                    <tr key={k} className="border-t border-gray-700/50">
                                        <td className="px-2 py-1 text-gray-200 whitespace-nowrap sticky left-0 bg-gray-800">
                                            {s.sizes[k]?.name || k}
                                        </td>
                                        {tiers.map((t, i) => (
                                            <td key={t} className="px-1 py-1">
                                                <NumInput
                                                    configValue={s.sizes[k]?.units[i] ?? 0}
                                                    step={100}
                                                    className={cellCls}
                                                    onCommit={(v) => setUnit(k, i, v)}
                                                />
                                            </td>
                                        ))}
                                        <td className="px-1 py-1">
                                            <NumInput
                                                configValue={s.sizes[k]?.laminateFixed ?? 0}
                                                step={100}
                                                className={cellCls}
                                                onCommit={(v) => setLaminate(k, v)}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        Tổng công bố ở mỗi mốc = đơn giá × số lượng mốc. Cột “Laminate/tờ” = phí cán
                        laminate dày cố định theo khổ.
                    </p>
                </section>

                <section>
                    <h3 className="text-pink-400 font-bold mb-3">Phụ phí % theo loại cán màng</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {finishKeys.map((k) => (
                            <div key={k}>
                                <label className={labelCls}>{s.finishes[k]?.name || k}</label>
                                <NumInput
                                    configValue={s.finishes[k]?.percent ?? 0}
                                    step={1}
                                    className={inputCls}
                                    onCommit={(v) => setFinishPct(k, v)}
                                />
                            </div>
                        ))}
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                        “Màng mờ (laminate dày)” dùng phí cố định/tờ (cột Laminate/tờ ở trên), % nên
                        để 0.
                    </p>
                </section>

                <section>
                    <h3 className="text-pink-400 font-bold mb-3">Hằng số & quy tắc</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {scalarFields.map(([field, label]) => (
                            <div key={field}>
                                <label className={labelCls}>{label}</label>
                                <NumInput
                                    configValue={s[field] ?? 0}
                                    step={1}
                                    className={inputCls}
                                    onCommit={(v) => setScalar(field, v)}
                                />
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}
