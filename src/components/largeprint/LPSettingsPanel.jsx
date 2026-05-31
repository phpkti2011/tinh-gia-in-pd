import { useState, useRef, useEffect } from 'react';
import { saveLargePrintConfig } from '../../utils/configStorage';

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

export default function LPSettingsPanel({ config, onSave, onCancel }) {
    // P2-03: Password gate đã chuyển sang <AdminGate> ở App.jsx.
    const [localConfig, setLocalConfig] = useState(() => JSON.parse(JSON.stringify(config)));

    const handleSave = () => {
        try {
            // TASK-0017: saveLargePrintConfig giờ trả false nếu config fail
            // schema validation. Không gọi onSave (tránh update React state
            // với config xấu) và hiển thị lỗi cho admin.
            const ok = saveLargePrintConfig(localConfig);
            if (!ok) {
                alert('Cấu hình in khổ lớn không hợp lệ, không lưu. Mở Console để xem chi tiết lỗi.');
                return;
            }
            alert('Đã lưu cài đặt! Chương trình sẽ tính toán lại với giá mới.');
            onSave(localConfig);
        } catch (e) {
            console.error(e);
            alert('Lỗi lưu cấu hình!');
        }
    };

    // --- Deep update helpers ---
    const updateConfig = (updater) => {
        setLocalConfig(prev => {
            const c = JSON.parse(JSON.stringify(prev));
            updater(c);
            return c;
        });
    };

    // --- MATERIAL_TYPES helpers ---
    const updateMatName = (key, name) => updateConfig(c => { c.MATERIAL_TYPES[key].name = name; });
    const updateMatOption = (key, idx, field, val) => updateConfig(c => { c.MATERIAL_TYPES[key].options[idx][field] = val; });
    const addMatOption = (key) => updateConfig(c => { c.MATERIAL_TYPES[key].options.push({ width: 1.07, printPrice: 0, materialPrice: 0 }); });
    const delMatOption = (key, idx) => updateConfig(c => { c.MATERIAL_TYPES[key].options.splice(idx, 1); });
    const addMaterial = () => {
        const matKey = prompt('Nhập key vật liệu (vd: decal_den):');
        if (!matKey || matKey.trim() === '') return;
        const k = matKey.trim();
        if (localConfig.MATERIAL_TYPES[k]) { alert('Key đã tồn tại!'); return; }
        const matName = prompt('Nhập tên hiển thị (vd: Decal Đen):');
        if (!matName) return;
        updateConfig(c => { c.MATERIAL_TYPES[k] = { name: matName.trim(), options: [{ width: 1.07, printPrice: 0, materialPrice: 0 }] }; });
    };
    const delMaterial = (key) => {
        if (!confirm(`Xóa vật liệu "${localConfig.MATERIAL_TYPES[key].name}"?`)) return;
        updateConfig(c => { delete c.MATERIAL_TYPES[key]; });
    };

    // --- LAMINATION_TYPES helpers ---
    const updateLamName = (key, name) => updateConfig(c => { c.LAMINATION_TYPES[key].name = name; });
    const updateLamOption = (key, idx, field, val) => updateConfig(c => { c.LAMINATION_TYPES[key].options[idx][field] = val; });
    const addLamOption = (key) => updateConfig(c => { c.LAMINATION_TYPES[key].options.push({ width: 1.07, price: 0 }); });
    const delLamOption = (key, idx) => updateConfig(c => { c.LAMINATION_TYPES[key].options.splice(idx, 1); });
    const addLamination = () => {
        const k = prompt('Nhập key cán màng (vd: mang_bong):');
        if (!k || k.trim() === '') return;
        const key = k.trim();
        if (localConfig.LAMINATION_TYPES[key]) { alert('Key đã tồn tại!'); return; }
        const name = prompt('Nhập tên hiển thị:');
        if (!name) return;
        updateConfig(c => { c.LAMINATION_TYPES[key] = { name: name.trim(), options: [{ width: 1.07, price: 0 }] }; });
    };
    const delLamination = (key) => {
        if (!confirm(`Xóa cán màng "${localConfig.LAMINATION_TYPES[key].name}"?`)) return;
        updateConfig(c => { delete c.LAMINATION_TYPES[key]; });
    };

    // --- FORMEX helpers ---
    const updateFormex = (key, val) => updateConfig(c => { c.FORMEX_OPTIONS[key].price = val; });

    // --- FORMEX_DISCOUNT_TIERS helpers ---
    const updateDiscountTier = (idx, field, val) => updateConfig(c => { c.FORMEX_DISCOUNT_TIERS[idx][field] = val; });
    const addDiscountTier = () => updateConfig(c => { c.FORMEX_DISCOUNT_TIERS.push({ minArea: 0, maxArea: Infinity, discount: 0 }); });
    const delDiscountTier = (idx) => updateConfig(c => { c.FORMEX_DISCOUNT_TIERS.splice(idx, 1); });

    // --- FINISHING_PRICES helpers ---
    const updateFinishing = (field, val) => updateConfig(c => { c.FINISHING_PRICES[field] = val; });
    const updateDieCut = (field, val) => updateConfig(c => { c.FINISHING_PRICES.dieCutting[field] = val; });

    // ========== RENDER ==========
    const mat = localConfig.MATERIAL_TYPES;
    const lam = localConfig.LAMINATION_TYPES;
    const formex = localConfig.FORMEX_OPTIONS;
    const discTiers = localConfig.FORMEX_DISCOUNT_TIERS;
    const fin = localConfig.FINISHING_PRICES;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold text-cyan-400">Cài đặt In Khổ Lớn</h2>
                    <div className="flex gap-3">
                        <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Lưu</button>
                        <button onClick={onCancel} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium">Hủy</button>
                    </div>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto px-6 py-4 space-y-8 flex-1">

                    {/* ===== VẬT LIỆU ===== */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className={sectionTitle + " mb-0 border-0 pb-0"}>Vật liệu</h3>
                            <button onClick={addMaterial} className={btnAdd}>+ Thêm vật liệu</button>
                        </div>
                        {Object.entries(mat).map(([key, m]) => (
                            <div key={key} className="bg-gray-750 bg-opacity-50 border border-gray-700 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <label className={labelCls + " mb-0 whitespace-nowrap"}>Tên:</label>
                                    <input value={m.name} onChange={e => updateMatName(key, e.target.value)} className={inputCls + " max-w-xs"} />
                                    <span className="text-gray-500 text-xs">({key})</span>
                                    <button onClick={() => delMaterial(key)} className={btnDel + " ml-auto"}>Xóa vật liệu</button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-gray-700">
                                        <th className={thCls}>Khổ (m)</th>
                                        <th className={thCls}>Giá in (đ/m²)</th>
                                        <th className={thCls}>Giá vật liệu (đ/m²)</th>
                                        <th className={thCls}></th>
                                    </tr></thead>
                                    <tbody>
                                        {m.options.map((opt, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                                <td className={tdCls}><NumInput configValue={opt.width} step={0.01} className={numCls} onCommit={v => updateMatOption(key, i, 'width', v)} /></td>
                                                <td className={tdCls}><NumInput configValue={opt.printPrice} step={1000} className={numCls} onCommit={v => updateMatOption(key, i, 'printPrice', v)} /></td>
                                                <td className={tdCls}><NumInput configValue={opt.materialPrice} step={1000} className={numCls} onCommit={v => updateMatOption(key, i, 'materialPrice', v)} /></td>
                                                <td className={tdCls}><button onClick={() => delMatOption(key, i)} className={btnDel}>Xóa</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button onClick={() => addMatOption(key)} className={btnAdd + " mt-2"}>+ Thêm khổ</button>
                            </div>
                        ))}
                    </section>

                    {/* ===== CÁN MÀNG ===== */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className={sectionTitle + " mb-0 border-0 pb-0"}>Cán màng</h3>
                            <button onClick={addLamination} className={btnAdd}>+ Thêm cán màng</button>
                        </div>
                        {Object.entries(lam).map(([key, l]) => (
                            <div key={key} className="bg-gray-750 bg-opacity-50 border border-gray-700 rounded-lg p-4 mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <label className={labelCls + " mb-0 whitespace-nowrap"}>Tên:</label>
                                    <input value={l.name} onChange={e => updateLamName(key, e.target.value)} className={inputCls + " max-w-xs"} />
                                    <span className="text-gray-500 text-xs">({key})</span>
                                    <button onClick={() => delLamination(key)} className={btnDel + " ml-auto"}>Xóa</button>
                                </div>
                                <table className="w-full text-sm">
                                    <thead><tr className="border-b border-gray-700">
                                        <th className={thCls}>Khổ (m)</th>
                                        <th className={thCls}>Giá (đ/m²)</th>
                                        <th className={thCls}></th>
                                    </tr></thead>
                                    <tbody>
                                        {l.options.map((opt, i) => (
                                            <tr key={i} className="border-b border-gray-700/50">
                                                <td className={tdCls}><NumInput configValue={opt.width} step={0.01} className={numCls} onCommit={v => updateLamOption(key, i, 'width', v)} /></td>
                                                <td className={tdCls}><NumInput configValue={opt.price} step={1000} className={numCls} onCommit={v => updateLamOption(key, i, 'price', v)} /></td>
                                                <td className={tdCls}><button onClick={() => delLamOption(key, i)} className={btnDel}>Xóa</button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button onClick={() => addLamOption(key)} className={btnAdd + " mt-2"}>+ Thêm khổ</button>
                            </div>
                        ))}
                    </section>

                    {/* ===== GIÁ TỐI THIỂU ===== */}
                    <section>
                        <h3 className={sectionTitle}>Giá Tối Thiểu</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="relative">
                                <label className={labelCls}>Giá in tối thiểu</label>
                                <NumInput configValue={localConfig.MIN_PRINT_PRICE || 0} step={1000} className={inputClsPr} onCommit={v => updateConfig(c => { c.MIN_PRINT_PRICE = v; })} />
                                <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Giá cán màng tối thiểu</label>
                                <NumInput configValue={localConfig.MIN_LAMINATION_PRICE || 0} step={1000} className={inputClsPr} onCommit={v => updateConfig(c => { c.MIN_LAMINATION_PRICE = v; })} />
                                <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Giá dán biên tối thiểu</label>
                                <NumInput configValue={localConfig.MIN_EDGE_TAPING_PRICE || 0} step={1000} className={inputClsPr} onCommit={v => updateConfig(c => { c.MIN_EDGE_TAPING_PRICE = v; })} />
                                <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Giá đóng khoen tối thiểu</label>
                                <NumInput configValue={localConfig.MIN_GROMMET_PRICE || 0} step={1000} className={inputClsPr} onCommit={v => updateConfig(c => { c.MIN_GROMMET_PRICE = v; })} />
                                <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                            </div>
                        </div>
                    </section>

                    {/* ===== STANDEE ===== */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className={sectionTitle + " mb-0 border-0 pb-0"}>Standee</h3>
                            <button onClick={() => updateConfig(c => {
                                if (!c.STANDEE_OPTIONS) c.STANDEE_OPTIONS = [];
                                const id = 'standee_' + Date.now();
                                c.STANDEE_OPTIONS.push({ key: id, name: 'Standee mới', price: 0 });
                            })} className={btnAdd}>+ Thêm loại</button>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {(localConfig.STANDEE_OPTIONS || []).map((opt, idx) => (
                                <div key={opt.key} className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-2">
                                    <div>
                                        <label className={labelCls}>Tên</label>
                                        <input type="text" value={opt.name} className={inputCls}
                                            onChange={e => updateConfig(c => { c.STANDEE_OPTIONS[idx].name = e.target.value; })} />
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá</label>
                                        <NumInput configValue={opt.price} step={1000} className={inputClsPr}
                                            onCommit={v => updateConfig(c => { c.STANDEE_OPTIONS[idx].price = v; })} />
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                    <button onClick={() => updateConfig(c => { c.STANDEE_OPTIONS.splice(idx, 1); })}
                                        className={btnCls + " bg-red-600 hover:bg-red-700 text-white text-xs mt-1"}>Xóa</button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ===== FORMEX ===== */}
                    <section>
                        <h3 className={sectionTitle}>Formex</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(formex).filter(([k]) => k !== 'none').map(([key, f]) => (
                                <div key={key} className="bg-gray-750 bg-opacity-50 border border-gray-700 rounded-lg p-4">
                                    <label className={labelCls}>{f.name}</label>
                                    <NumInput configValue={f.price} step={1000} className={numCls} onCommit={v => updateFormex(key, v)} />
                                    <span className="text-gray-500 text-xs ml-2">đ/m²</span>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ===== CHIẾT KHẤU FORMEX ===== */}
                    <section>
                        <div className="flex items-center justify-between mb-3">
                            <h3 className={sectionTitle + " mb-0 border-0 pb-0"}>Chiết khấu Formex theo diện tích</h3>
                            <button onClick={addDiscountTier} className={btnAdd}>+ Thêm bậc</button>
                        </div>
                        <table className="w-full text-sm">
                            <thead><tr className="border-b border-gray-700">
                                <th className={thCls}>Từ (m²)</th>
                                <th className={thCls}>Đến (m²)</th>
                                <th className={thCls}>Chiết khấu (%)</th>
                                <th className={thCls}></th>
                            </tr></thead>
                            <tbody>
                                {discTiers.map((t, i) => (
                                    <tr key={i} className="border-b border-gray-700/50">
                                        <td className={tdCls}><NumInput configValue={t.minArea} step={1} className={numCls} onCommit={v => updateDiscountTier(i, 'minArea', v)} /></td>
                                        <td className={tdCls}>
                                            {t.maxArea === Infinity
                                                ? <span className="text-gray-400 italic">∞</span>
                                                : <NumInput configValue={t.maxArea} step={1} className={numCls} onCommit={v => updateDiscountTier(i, 'maxArea', v)} />
                                            }
                                        </td>
                                        <td className={tdCls}><NumInput configValue={parseFloat((t.discount * 100).toFixed(2))} step={1} className={numCls} onCommit={v => updateDiscountTier(i, 'discount', v / 100)} /></td>
                                        <td className={tdCls}><button onClick={() => delDiscountTier(i)} className={btnDel}>Xóa</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>

                    {/* ===== GIÁ THÀNH PHẨM ===== */}
                    <section>
                        <h3 className={sectionTitle}>Giá thành phẩm</h3>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className={labelCls}>Viền xung quanh (đ/m²)</label>
                                    <NumInput configValue={fin.edgeTapingPricePerSqm} step={1000} className={numCls} onCommit={v => updateFinishing('edgeTapingPricePerSqm', v)} />
                                </div>
                                <div>
                                    <label className={labelCls}>Mắt cáo (đ/cái)</label>
                                    <NumInput configValue={fin.grommetPricePerPiece} step={500} className={numCls} onCommit={v => updateFinishing('grommetPricePerPiece', v)} />
                                </div>
                            </div>

                            <div>
                                <h4 className="text-gray-300 font-semibold mb-2">Cắt bế (dieCutting)</h4>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className={labelCls}>Bậc 1: giới hạn (m²)</label>
                                        <NumInput configValue={fin.dieCutting.tier1LimitSqm} step={1} className={numCls} onCommit={v => updateDieCut('tier1LimitSqm', v)} />
                                        <label className={labelCls + " mt-2"}>Giá bậc 1 (đ/m²)</label>
                                        <NumInput configValue={fin.dieCutting.tier1PricePerSqm} step={1000} className={numCls} onCommit={v => updateDieCut('tier1PricePerSqm', v)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Bậc 2: giới hạn (m²)</label>
                                        <NumInput configValue={fin.dieCutting.tier2LimitSqm} step={1} className={numCls} onCommit={v => updateDieCut('tier2LimitSqm', v)} />
                                        <label className={labelCls + " mt-2"}>Giá bậc 2 (đ/m²)</label>
                                        <NumInput configValue={fin.dieCutting.tier2PricePerSqm} step={1000} className={numCls} onCommit={v => updateDieCut('tier2PricePerSqm', v)} />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Giá bậc 3 (đ/m²)</label>
                                        <NumInput configValue={fin.dieCutting.tier3PricePerSqm} step={1000} className={numCls} onCommit={v => updateDieCut('tier3PricePerSqm', v)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-700">
                    <button onClick={handleSave} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium">Lưu cài đặt</button>
                    <button onClick={onCancel} className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium">Hủy</button>
                </div>
            </div>
        </div>
    );
}
