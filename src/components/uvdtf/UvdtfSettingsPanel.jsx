import { useState, useRef, useEffect } from 'react';
import { saveUvdtfConfig } from '../../utils/configStorage';

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

const inputCls = "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500";
const inputClsPr = inputCls + " pr-12";
const labelCls = "text-gray-400 text-sm block mb-1";
const btnCls = "px-3 py-1 rounded text-sm font-medium";
const btnAdd = btnCls + " bg-green-600 hover:bg-green-700 text-white";
const btnDel = btnCls + " bg-red-600 hover:bg-red-700 text-white";
const sectionTitle = "text-cyan-400 font-bold text-lg mb-3 border-b border-gray-700 pb-1";
const thCls = "px-3 py-2 text-left text-gray-400 text-xs uppercase";
const tdCls = "px-3 py-2";
const numCls = "bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-28 focus:outline-none focus:border-blue-500";

export default function UvdtfSettingsPanel({ config, onSave, onCancel }) {
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
                setErrorMsg('Sai password!');
            }
        }
    };

    const handleSave = () => {
        try {
            saveUvdtfConfig(localConfig);
            alert('Luu thanh cong! Chuong trinh se tinh toan lai voi gia moi.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Loi luu cau hinh!');
        }
    };

    const updateConfig = (updater) => {
        setLocalConfig(prev => {
            const c = JSON.parse(JSON.stringify(prev));
            updater(c);
            return c;
        });
    };

    // --- priceTiers helpers ---
    const updateTier = (idx, field, val) => updateConfig(c => { c.priceTiers[idx][field] = val; });
    const addTier = () => updateConfig(c => { c.priceTiers.push({ maxMeters: Infinity, pricePerMeter: 0 }); });
    const delTier = (idx) => updateConfig(c => { c.priceTiers.splice(idx, 1); });

    // ========== RENDER ==========
    if (!isAuthenticated) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-md">
                    <h2 className="text-xl font-bold text-cyan-400 mb-4">Cai dat UV DTF</h2>
                    <label className={labelCls}>Nhap mat khau quan tri:</label>
                    <div className="relative mb-3">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            onKeyDown={handlePasswordCheck}
                            className={inputClsPr}
                            placeholder="Mat khau..."
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(p => !p)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm px-2"
                        >
                            {showPassword ? 'An' : 'Hien'}
                        </button>
                    </div>
                    {errorMsg && <p className="text-red-400 text-sm mb-3">{errorMsg}</p>}
                    <div className="flex gap-3">
                        <button onClick={handlePasswordCheck} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Xac nhan</button>
                        <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium">Huy</button>
                    </div>
                </div>
            </div>
        );
    }

    const tiers = localConfig.priceTiers || [];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-cyan-400">Cai dat UV DTF</h2>
                    <div className="flex gap-3">
                        <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Luu</button>
                        <button onClick={onCancel} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium">Huy</button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto px-6 py-4 space-y-8 flex-1">

                    {/* ===== THONG SO CHUNG ===== */}
                    <section>
                        <h3 className={sectionTitle}>Thong So Chung</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className={labelCls}>Kho vat lieu</label>
                                <NumInput
                                    configValue={localConfig.materialWidthCM}
                                    step={0.1}
                                    className={inputClsPr}
                                    onCommit={v => updateConfig(c => { c.materialWidthCM = v; })}
                                />
                                <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Vung in</label>
                                <NumInput
                                    configValue={localConfig.printableWidthCM}
                                    step={0.1}
                                    className={inputClsPr}
                                    onCommit={v => updateConfig(c => { c.printableWidthCM = v; })}
                                />
                                <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Padding moi item</label>
                                <NumInput
                                    configValue={localConfig.paddingCM}
                                    step={0.1}
                                    className={inputClsPr}
                                    onCommit={v => updateConfig(c => { c.paddingCM = v; })}
                                />
                                <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Met toi toi thieu</label>
                                <NumInput
                                    configValue={localConfig.minBillableMeters}
                                    step={0.1}
                                    className={inputClsPr}
                                    onCommit={v => updateConfig(c => { c.minBillableMeters = v; })}
                                />
                                <span className="absolute right-3 top-[32px] text-gray-500">m</span>
                            </div>
                        </div>
                    </section>

                    {/* ===== BANG GIA THEO MET TOI ===== */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className={sectionTitle + " mb-0 border-0 pb-0"}>Bang Gia Theo Met Toi</h3>
                            <button onClick={addTier} className={btnAdd}>+ Them bac</button>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-gray-700">
                                    <th className={thCls}>Den (met)</th>
                                    <th className={thCls}>Don gia (d/m)</th>
                                    <th className={thCls}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tiers.map((tier, i) => (
                                    <tr key={i} className="border-b border-gray-700/50">
                                        <td className={tdCls}>
                                            <input
                                                type="number"
                                                value={tier.maxMeters === Infinity ? '' : tier.maxMeters}
                                                placeholder="(vo han)"
                                                step={1}
                                                className={numCls}
                                                onChange={e => {
                                                    const val = e.target.value;
                                                    if (val === '' || val.trim() === '') {
                                                        updateTier(i, 'maxMeters', Infinity);
                                                    } else {
                                                        const parsed = parseFloat(val);
                                                        if (!isNaN(parsed)) updateTier(i, 'maxMeters', parsed);
                                                    }
                                                }}
                                            />
                                        </td>
                                        <td className={tdCls}>
                                            <NumInput
                                                configValue={tier.pricePerMeter}
                                                step={1000}
                                                className={numCls}
                                                onCommit={v => updateTier(i, 'pricePerMeter', v)}
                                            />
                                        </td>
                                        <td className={tdCls}>
                                            <button onClick={() => delTier(i)} className={btnDel}>Xoa</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
                    <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Luu cai dat</button>
                    <button onClick={onCancel} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium">Huy</button>
                </div>
            </div>
        </div>
    );
}
