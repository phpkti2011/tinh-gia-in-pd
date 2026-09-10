import { useState, useEffect, useRef } from 'react';
import { saveDecalConfig } from '../../utils/configStorage';
import { restoreInfinity } from '../../utils/restoreInfinity';
import PriceConfigHistoryPanel from '../admin/PriceConfigHistoryPanel';

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

export default function DecalSettingsPanel({ config, onSave, onCancel }) {
    // P2-03: Password gate đã chuyển sang <AdminGate> ở App.jsx.
    // JSON round-trip mất Infinity (→ null). restoreInfinity restore lại cho các
    // key upper-bound để schema validation không fail khi save.
    const [localConfig, setLocalConfig] = useState(() =>
        restoreInfinity(JSON.parse(JSON.stringify(config)))
    );

    const handleSave = () => {
        try {
            // TASK-0005.5: saveDecalConfig giờ trả về false nếu config fail
            // schema validation. Không gọi onSave (tránh update React state với
            // config xấu) và hiển thị lỗi cho admin.
            const ok = saveDecalConfig(localConfig);
            if (!ok) {
                alert('Cấu hình decal không hợp lệ, không lưu. Mở Console để xem chi tiết lỗi.');
                return;
            }
            alert('Đã lưu cài đặt! Chương trình sẽ tính toán lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    const updateNestedField = (path, numValue) => {
        setLocalConfig((prev) => {
            const newConfig = { ...prev };
            const keys = path.split('.');
            let current = newConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = Array.isArray(current[keys[i]])
                    ? [...current[keys[i]]]
                    : { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = numValue;
            return newConfig;
        });
    };

    // printSheetSizes (kho giay in) — them/xoa/sua ten. W/H/% sua qua updateNestedField.
    const addPrintSheet = () =>
        setLocalConfig((prev) => ({
            ...prev,
            printSheetSizes: [
                ...(prev.printSheetSizes || []),
                { label: 'Kho moi', w: 330, h: 330, percent: 0, minPriceByMaterial: {} },
            ],
        }));
    const delPrintSheet = (idx) =>
        setLocalConfig((prev) => ({
            ...prev,
            printSheetSizes: (prev.printSheetSizes || []).filter((_, i) => i !== idx),
        }));
    const updatePrintSheetLabel = (idx, label) =>
        setLocalConfig((prev) => ({
            ...prev,
            printSheetSizes: (prev.printSheetSizes || []).map((s, i) =>
                i === idx ? { ...s, label } : s
            ),
        }));
    // Tick = loại decal KHÔNG có ở khổ này → thêm/bỏ trong unavailableMaterials.
    const toggleMaterialAvailability = (idx, material) =>
        setLocalConfig((prev) => ({
            ...prev,
            printSheetSizes: (prev.printSheetSizes || []).map((s, i) => {
                if (i !== idx) return s;
                const off = s.unavailableMaterials || [];
                return {
                    ...s,
                    unavailableMaterials: off.includes(material)
                        ? off.filter((m) => m !== material)
                        : [...off, material],
                };
            }),
        }));

    // machines (may be) — them/xoa/sua ten. Le sua qua updateNestedField.
    const addMachine = () =>
        setLocalConfig((prev) => ({
            ...prev,
            machines: [
                ...(prev.machines || []),
                {
                    name: 'May moi',
                    marginTop: 20,
                    marginBottom: 20,
                    marginLeft: 14,
                    marginRight: 14,
                },
            ],
        }));
    const delMachine = (idx) =>
        setLocalConfig((prev) => ({
            ...prev,
            machines: (prev.machines || []).filter((_, i) => i !== idx),
        }));
    const updateMachineName = (idx, name) =>
        setLocalConfig((prev) => ({
            ...prev,
            machines: (prev.machines || []).map((m, i) => (i === idx ? { ...m, name } : m)),
        }));

    const inputCls =
        'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500';
    const inputClsPr = inputCls + ' pr-12';
    const inputClsSm =
        'w-36 bg-gray-900 border border-gray-700 rounded px-2 py-1 pr-8 text-white focus:outline-none focus:border-blue-500 text-sm';
    const labelCls = 'text-gray-400 text-sm block mb-1';

    const fi = (path, configValue, step, cls) => (
        <NumInput
            configValue={configValue}
            step={step}
            className={cls || inputClsPr}
            onCommit={(val) => updateNestedField(path, val)}
        />
    );

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">Cai Dat Decal</h2>
                <div className="space-x-4">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition"
                    >
                        Huy
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50"
                    >
                        Luu Cai Dat
                    </button>
                </div>
            </div>

            <div className="space-y-10">
                {/* Section 1: Cai Dat Chung */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Cai Dat Chung
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Chieu rong in co so</label>
                            {fi('basePrintWidth', localConfig.basePrintWidth)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Chieu cao in co so</label>
                            {fi('basePrintHeight', localConfig.basePrintHeight)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Khoang cach sticker</label>
                            {fi('stickerGap', localConfig.stickerGap)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phi can mang</label>
                            {fi('laminationCost', localConfig.laminationCost)}
                            <span className="absolute right-3 top-[32px] text-gray-500">d/to</span>
                        </div>
                    </div>
                </section>

                {/* Section 1a: May Be (vung be) */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">May Be (vung be)</h3>
                        <button
                            onClick={addMachine}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Them may
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Moi may co le vung be rieng 4 canh (Tren/Duoi/Trai/Phai, mm). Le nho hon =
                        vung be rong hon = nhieu tem/to hon = re hon. Bang gia hien tat ca may de so
                        sanh.
                    </p>
                    <div className="space-y-3">
                        {(localConfig.machines || []).map((m, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-3">
                                    <label className={labelCls}>Ten may</label>
                                    <input
                                        type="text"
                                        defaultValue={m.name}
                                        className={inputCls}
                                        onBlur={(e) => updateMachineName(idx, e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>Tren</label>
                                    {fi(
                                        `machines.${idx}.marginTop`,
                                        m.marginTop ?? 0,
                                        '1',
                                        inputCls
                                    )}
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>Duoi</label>
                                    {fi(
                                        `machines.${idx}.marginBottom`,
                                        m.marginBottom ?? 0,
                                        '1',
                                        inputCls
                                    )}
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>Trai</label>
                                    {fi(
                                        `machines.${idx}.marginLeft`,
                                        m.marginLeft ?? 0,
                                        '1',
                                        inputCls
                                    )}
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>Phai</label>
                                    {fi(
                                        `machines.${idx}.marginRight`,
                                        m.marginRight ?? 0,
                                        '1',
                                        inputCls
                                    )}
                                </div>
                                <div className="col-span-1">
                                    <button
                                        onClick={() => delMachine(idx)}
                                        className="w-full px-2 py-2 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Xoa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 1b: Kho Giay In */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Kho Giay In (% tang gia)
                        </h3>
                        <button
                            onClick={addPrintSheet}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Them kho
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        % tang gia so voi kho goc 330×330 (kho goc = 0%). Le vung be tinh theo MAY
                        (o tren). Gia san/to nhap o bang "Gia San" ben duoi.
                    </p>
                    <div className="space-y-2">
                        {(localConfig.printSheetSizes || []).map((s, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-4">
                                    <label className={labelCls}>Ten kho</label>
                                    <input
                                        type="text"
                                        defaultValue={s.label}
                                        className={inputCls}
                                        onBlur={(e) => updatePrintSheetLabel(idx, e.target.value)}
                                    />
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>Rong (W)</label>
                                    {fi(`printSheetSizes.${idx}.w`, s.w, '1', inputClsPr)}
                                    <span className="absolute right-2 top-[32px] text-gray-500 text-xs">
                                        mm
                                    </span>
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>Cao (H)</label>
                                    {fi(`printSheetSizes.${idx}.h`, s.h, '1', inputClsPr)}
                                    <span className="absolute right-2 top-[32px] text-gray-500 text-xs">
                                        mm
                                    </span>
                                </div>
                                <div className="col-span-2 relative">
                                    <label className={labelCls}>% tang</label>
                                    {fi(
                                        `printSheetSizes.${idx}.percent`,
                                        s.percent ?? 0,
                                        '1',
                                        inputCls
                                    )}
                                </div>
                                <div className="col-span-2">
                                    <button
                                        onClick={() => delPrintSheet(idx)}
                                        className="w-full px-2 py-2 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Xoa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 1c: Gia San Moi To (vat lieu × kho) */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Gia San Moi To (vat lieu × kho)
                    </h3>
                    <p className="text-xs text-gray-500 mb-3">
                        Gia toi thieu moi to in cho tung loai decal o tung kho — chiet khau khong
                        giam duoi muc nay (0 = khong san). Don vi: d/to.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Loai decal</th>
                                    {(localConfig.printSheetSizes || []).map((s, i) => (
                                        <th key={i} className="text-left py-2 pr-4">
                                            {s.label}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {Object.keys(localConfig.decalCosts).map((material) => (
                                    <tr key={material} className="border-b border-gray-700/50">
                                        <td className="py-2 pr-4 text-gray-300 whitespace-nowrap">
                                            {material}
                                        </td>
                                        {(localConfig.printSheetSizes || []).map((s, i) => {
                                            const off = (s.unavailableMaterials || []).includes(
                                                material
                                            );
                                            return (
                                                <td key={i} className="py-2 pr-4">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="checkbox"
                                                            checked={off}
                                                            title="Tick = khổ này KHÔNG có loại decal này"
                                                            className="w-4 h-4 accent-green-500 cursor-pointer flex-shrink-0"
                                                            onChange={() =>
                                                                toggleMaterialAvailability(
                                                                    i,
                                                                    material
                                                                )
                                                            }
                                                        />
                                                        {off ? (
                                                            <span className="w-36 px-2 py-1 rounded bg-black/70 text-gray-500 text-xs text-center select-none">
                                                                Không có
                                                            </span>
                                                        ) : (
                                                            <NumInput
                                                                configValue={
                                                                    s.minPriceByMaterial?.[
                                                                        material
                                                                    ] ?? 0
                                                                }
                                                                step="1000"
                                                                className={inputClsSm}
                                                                onCommit={(val) =>
                                                                    updateNestedField(
                                                                        `printSheetSizes.${i}.minPriceByMaterial.${material}`,
                                                                        val
                                                                    )
                                                                }
                                                            />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 2: Phu Phi Be Demi */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Phu Phi Be Demi
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Den (so sticker)</th>
                                    <th className="text-left py-2">Phu phi (%)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localConfig.demiCutSurchargeTiers.map((tier, idx) => (
                                    <tr key={idx} className="border-b border-gray-700/50">
                                        <td className="py-2 pr-4">
                                            <input
                                                type="number"
                                                value={tier.upTo === Infinity ? '' : tier.upTo}
                                                placeholder="Khong gioi han"
                                                className={inputClsSm}
                                                onChange={(e) => {
                                                    const val =
                                                        e.target.value === ''
                                                            ? Infinity
                                                            : parseFloat(e.target.value);
                                                    if (e.target.value === '' || !isNaN(val))
                                                        updateNestedField(
                                                            `demiCutSurchargeTiers.${idx}.upTo`,
                                                            val
                                                        );
                                                }}
                                            />
                                        </td>
                                        <td className="py-2">
                                            <div className="relative inline-block">
                                                <NumInput
                                                    configValue={tier.percent}
                                                    step="1"
                                                    className={inputClsSm}
                                                    onCommit={(val) =>
                                                        updateNestedField(
                                                            `demiCutSurchargeTiers.${idx}.percent`,
                                                            val
                                                        )
                                                    }
                                                />
                                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                    %
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Section 3: Phi Bu Theo Loai Decal */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Phi Bu Theo Loai Decal
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(localConfig.decalCosts).map((decalType) => (
                            <div key={decalType} className="relative">
                                <label className={labelCls}>{decalType}</label>
                                <NumInput
                                    configValue={localConfig.decalCosts[decalType]}
                                    step="100"
                                    className={inputClsPr}
                                    onCommit={(val) =>
                                        updateNestedField(`decalCosts.${decalType}`, val)
                                    }
                                />
                                <span className="absolute right-3 top-[32px] text-gray-500">
                                    d/to
                                </span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 4: Bang Gia In Luy Tien */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Bang Gia In Luy Tien
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Den (so to)</th>
                                    <th className="text-left py-2">Don gia (d)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localConfig.progressiveTiers.map((tier, idx) => (
                                    <tr key={idx} className="border-b border-gray-700/50">
                                        <td className="py-2 pr-4">
                                            <input
                                                type="number"
                                                value={tier.upTo === Infinity ? '' : tier.upTo}
                                                placeholder="Khong gioi han"
                                                className={inputClsSm}
                                                onChange={(e) => {
                                                    const val =
                                                        e.target.value === ''
                                                            ? Infinity
                                                            : parseFloat(e.target.value);
                                                    if (e.target.value === '' || !isNaN(val))
                                                        updateNestedField(
                                                            `progressiveTiers.${idx}.upTo`,
                                                            val
                                                        );
                                                }}
                                            />
                                        </td>
                                        <td className="py-2">
                                            <div className="relative inline-block">
                                                <NumInput
                                                    configValue={tier.price}
                                                    step="100"
                                                    className={inputClsSm}
                                                    onCommit={(val) =>
                                                        updateNestedField(
                                                            `progressiveTiers.${idx}.price`,
                                                            val
                                                        )
                                                    }
                                                />
                                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                    d
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <PriceConfigHistoryPanel moduleKey="decal" />

            <div className="flex justify-end mt-10 pt-6 border-t border-gray-700 space-x-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition"
                >
                    Huy
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50"
                >
                    Luu Cai Dat
                </button>
            </div>
        </div>
    );
}
