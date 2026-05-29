import React, { useState, useEffect, useRef } from 'react';
import { saveDecalConfig } from '../../utils/configStorage';

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
    return <input type="number" value={localStr} step={step} className={className} onChange={handleChange} onBlur={handleBlur}/>;
}

export default function DecalSettingsPanel({ config, onSave, onCancel }) {
    const [password, setPassword] = useState('');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    const [localConfig, setLocalConfig] = useState(() => JSON.parse(JSON.stringify(config)));

    const handlePasswordCheck = (e) => {
        if (e.key === 'Enter' || e.type === 'click') {
            if (password === 'TEMP_ADMIN_PASSWORD_PLACEHOLDER') {
                setIsAuthenticated(true);
                setErrorMsg('');
            } else {
                setErrorMsg('Mật khẩu không đúng!');
            }
        }
    };

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
        setLocalConfig(prev => {
            const newConfig = { ...prev };
            const keys = path.split('.');
            let current = newConfig;
            for (let i = 0; i < keys.length - 1; i++) {
                current[keys[i]] = Array.isArray(current[keys[i]]) ? [...current[keys[i]]] : { ...current[keys[i]] };
                current = current[keys[i]];
            }
            current[keys[keys.length - 1]] = numValue;
            return newConfig;
        });
    };

    const inputCls = "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500";
    const inputClsPr = inputCls + " pr-12";
    const inputClsSm = "w-36 bg-gray-900 border border-gray-700 rounded px-2 py-1 pr-8 text-white focus:outline-none focus:border-blue-500 text-sm";
    const labelCls = "text-gray-400 text-sm block mb-1";

    const fi = (path, configValue, step, cls) =>
        <NumInput configValue={configValue} step={step} className={cls || inputClsPr} onCommit={(val) => updateNestedField(path, val)}/>;

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-white mb-6">Xac Thuc Quan Tri Vien</h2>
                    <div className="relative mb-4">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyUp={handlePasswordCheck}
                            placeholder="Nhap mat khau..."
                            className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-3 pr-12 text-white focus:outline-none focus:border-blue-500 text-center text-lg tracking-widest"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            tabIndex={-1}
                        >
                            {showPassword ? '\u{1F648}' : '\u{1F441}'}
                        </button>
                    </div>
                    {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
                    <button onClick={handlePasswordCheck} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200">Xac Nhan</button>
                    <button onClick={onCancel} className="mt-4 text-gray-400 hover:text-white underline">Quay Lai</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">Cai Dat Decal</h2>
                <div className="space-x-4">
                    <button onClick={onCancel} className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition">Huy</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50">Luu Cai Dat</button>
                </div>
            </div>

            <div className="space-y-10">

                {/* Section 1: Cai Dat Chung */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Cai Dat Chung</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Chieu rong in co so</label>
                            {fi("basePrintWidth", localConfig.basePrintWidth)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Chieu cao in co so</label>
                            {fi("basePrintHeight", localConfig.basePrintHeight)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Le canh ngan</label>
                            {fi("marginShortSide", localConfig.marginShortSide)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Le canh dai</label>
                            {fi("marginLongSide", localConfig.marginLongSide)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>He so quy doi dien tich</label>
                            {fi("areaConversionFactor", localConfig.areaConversionFactor, "0.01")}
                            <span className="absolute right-3 top-[32px] text-gray-500"></span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Khoang cach sticker</label>
                            {fi("stickerGap", localConfig.stickerGap)}
                            <span className="absolute right-3 top-[32px] text-gray-500">mm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phi can mang</label>
                            {fi("laminationCost", localConfig.laminationCost)}
                            <span className="absolute right-3 top-[32px] text-gray-500">d/to</span>
                        </div>
                    </div>
                </section>

                {/* Section 2: Phu Phi Be Demi */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Phu Phi Be Demi</h3>
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
                                                    const val = e.target.value === '' ? Infinity : parseFloat(e.target.value);
                                                    if (e.target.value === '' || !isNaN(val)) updateNestedField(`demiCutSurchargeTiers.${idx}.upTo`, val);
                                                }}
                                            />
                                        </td>
                                        <td className="py-2">
                                            <div className="relative inline-block">
                                                <NumInput configValue={tier.percent} step="1" className={inputClsSm} onCommit={(val) => updateNestedField(`demiCutSurchargeTiers.${idx}.percent`, val)}/>
                                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">%</span>
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
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Phi Bu Theo Loai Decal</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Object.keys(localConfig.decalCosts).map((decalType) => (
                            <div key={decalType} className="relative">
                                <label className={labelCls}>{decalType}</label>
                                <NumInput
                                    configValue={localConfig.decalCosts[decalType]}
                                    step="100"
                                    className={inputClsPr}
                                    onCommit={(val) => updateNestedField(`decalCosts.${decalType}`, val)}
                                />
                                <span className="absolute right-3 top-[32px] text-gray-500">d/to</span>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Section 4: Bang Gia In Luy Tien */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Bang Gia In Luy Tien</h3>
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
                                                    const val = e.target.value === '' ? Infinity : parseFloat(e.target.value);
                                                    if (e.target.value === '' || !isNaN(val)) updateNestedField(`progressiveTiers.${idx}.upTo`, val);
                                                }}
                                            />
                                        </td>
                                        <td className="py-2">
                                            <div className="relative inline-block">
                                                <NumInput configValue={tier.price} step="100" className={inputClsSm} onCommit={(val) => updateNestedField(`progressiveTiers.${idx}.price`, val)}/>
                                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">d</span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

            </div>

            <div className="flex justify-end mt-10 pt-6 border-t border-gray-700 space-x-4">
                <button onClick={onCancel} className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition">Huy</button>
                <button onClick={handleSave} className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50">Luu Cai Dat</button>
            </div>
        </div>
    );
}
