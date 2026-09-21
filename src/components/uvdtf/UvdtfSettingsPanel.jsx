import { useState, useRef, useEffect } from 'react';
import { useCloudSave } from '../common/useCloudSave';
import SaveStatusBanner from '../common/SaveStatusBanner';
import { saveUvdtfConfig } from '../../utils/configStorage';
import { restoreInfinity } from '../../utils/restoreInfinity';
import PriceConfigHistoryPanel from '../admin/PriceConfigHistoryPanel';
import {
    normalizePriceTiers,
    sortPriceTiers,
    seedDieCutTiers,
} from '../../modules/uvdtf/config/priceTiers';

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
    'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500';
const inputClsPr = inputCls + ' pr-12';
const labelCls = 'text-gray-400 text-sm block mb-1';
const btnCls = 'px-3 py-1 rounded text-sm font-medium';
const btnAdd = btnCls + ' bg-green-600 hover:bg-green-700 text-white';
const btnDel = btnCls + ' bg-red-600 hover:bg-red-700 text-white';
const sectionTitle = 'text-cyan-400 font-bold text-lg mb-3 border-b border-gray-700 pb-1';
const thCls = 'px-3 py-2 text-left text-gray-400 text-xs uppercase';
const tdCls = 'px-3 py-2';
const numCls =
    'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-28 focus:outline-none focus:border-blue-500';

// Một bảng bậc, dùng lại cho cả bảng KHÔNG BẾ lẫn CÓ BẾ.
// CỐ Ý đặt ở module scope, không phải trong thân UvdtfSettingsPanel: định nghĩa bên trong
// thân thì mỗi lần render React coi là component type MỚI và remount cả bảng sau từng phím
// gõ, reset localStr của NumInput.
function TierTable({ title, testId, note, tiers, onUpdate, onAdd, onDel, extraAction }) {
    return (
        <section data-testid={testId}>
            <div className="flex items-center justify-between mb-3">
                <h3 className={sectionTitle + ' mb-0 border-0 pb-0'}>{title}</h3>
                <div className="flex items-center gap-2">
                    {extraAction}
                    <button onClick={onAdd} className={btnAdd}>
                        + Them bac
                    </button>
                </div>
            </div>
            {note && <p className="text-gray-500 text-xs mb-2">{note}</p>}
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
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === '' || val.trim() === '') {
                                            onUpdate(i, 'maxMeters', Infinity);
                                        } else {
                                            const parsed = parseFloat(val);
                                            if (!isNaN(parsed)) onUpdate(i, 'maxMeters', parsed);
                                        }
                                    }}
                                />
                            </td>
                            <td className={tdCls}>
                                <NumInput
                                    configValue={tier.price ?? 0}
                                    step={1000}
                                    className={numCls}
                                    onCommit={(v) => onUpdate(i, 'price', v)}
                                />
                            </td>
                            <td className={tdCls}>
                                <button onClick={() => onDel(i)} className={btnDel}>
                                    Xoa
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    );
}

export default function UvdtfSettingsPanel({ config, onSave, onSaved, onCancel }) {
    // P2-03: Password gate đã chuyển sang <AdminGate> ở App.jsx.
    // JSON round-trip mất Infinity (→ null). restoreInfinity restore lại cho các
    // key upper-bound (maxMeters, ...) để schema validation không fail khi save.
    const [localConfig, setLocalConfig] = useState(() => {
        const c = restoreInfinity(JSON.parse(JSON.stringify(config)));
        // Vá bảng giá bị panel cũ ghi sai tên field (pricePerMeter → price).
        // Xem src/modules/uvdtf/config/priceTiers.js.
        // PHẢI vá bảng không bế TRƯỚC rồi mới mồi bảng có bế, nếu không chép nguyên
        // cả field rác sang bảng mới.
        const priceTiers = normalizePriceTiers(c.priceTiers);
        return { ...c, priceTiers, dieCutPriceTiers: seedDieCutTiers({ ...c, priceTiers }) };
    });

    // Chờ kết quả đẩy lên Supabase rồi mới báo — xem useCloudSave.js.
    const {
        status: saveStatus,
        error: saveError,
        saving,
        save,
    } = useCloudSave({
        saveLocal: saveUvdtfConfig,
        onSave,
        onSaved,
        invalidMessage: 'Cau hinh UV DTF khong hop le, khong luu. Mo Console de xem chi tiet loi.',
    });
    const handleSave = () => {
        // Engine lấy tier ĐẦU TIÊN thoả totalMeters <= maxMeters, nên bậc phải xếp
        // tăng dần và (vô hạn) ở cuối. Không sắp thì bậc thêm sau dòng (vô hạn)
        // chết lặng: bảng nhìn có bậc mới mà báo giá không đổi.
        const baseSorted = sortPriceTiers(localConfig.priceTiers);
        const dieSorted = sortPriceTiers(localConfig.dieCutPriceTiers) || [];
        const out = { ...localConfig, priceTiers: baseSorted, dieCutPriceTiers: dieSorted };
        // Bảng CÓ BẾ y hệt bảng KHÔNG BẾ (hoặc rỗng) ⇒ KHÔNG lưu field, để giá có bế tự
        // bám theo bảng không bế. Lưu bản sao đông cứng là cái bẫy: 6 tháng sau admin
        // tăng giá bảng không bế, giá có bế đứng yên ở số cũ mà không ai thấy.
        // JSON.stringify biến Infinity → null ở CẢ HAI vế nên so sánh vẫn đúng.
        if (dieSorted.length === 0 || JSON.stringify(dieSorted) === JSON.stringify(baseSorted)) {
            delete out.dieCutPriceTiers;
        }
        // State vẫn giữ bảng đã mồi để admin sửa tiếp, dù bản lưu xuống không có field.
        setLocalConfig({ ...out, dieCutPriceTiers: dieSorted });
        return save(out);
    };

    const updateConfig = (updater) => {
        setLocalConfig((prev) => {
            // restoreInfinity giữ maxMeters=Infinity qua JSON round-trip.
            const c = restoreInfinity(JSON.parse(JSON.stringify(prev)));
            updater(c);
            return c;
        });
    };

    // --- priceTiers helpers (tierKey = 'priceTiers' | 'dieCutPriceTiers') ---
    const updateTier = (tierKey, idx, field, val) =>
        updateConfig((c) => {
            c[tierKey][idx][field] = val;
        });
    const addTier = (tierKey) =>
        updateConfig((c) => {
            (c[tierKey] || (c[tierKey] = [])).push({ maxMeters: Infinity, price: 0 });
        });
    const delTier = (tierKey, idx) =>
        updateConfig((c) => {
            c[tierKey].splice(idx, 1);
        });
    // Reset bảng có bế về đúng bảng không bế (dùng khi 2 bảng đã trôi xa nhau).
    const copyBaseToDieCut = () =>
        updateConfig((c) => {
            c.dieCutPriceTiers = (c.priceTiers || []).map((t) => ({ ...t }));
        });

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cai dat UV DTF</h2>
                <div className="flex items-center gap-3">
                    <SaveStatusBanner
                        status={saveStatus}
                        error={saveError}
                        className="max-w-md text-right"
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                    >
                        Luu
                    </button>
                    <button
                        onClick={onCancel}
                        className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
                    >
                        Huy
                    </button>
                </div>
            </div>

            {/* Body */}
            <div className="space-y-8">
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
                                onCommit={(v) =>
                                    updateConfig((c) => {
                                        c.materialWidthCM = v;
                                    })
                                }
                            />
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Vung in</label>
                            <NumInput
                                configValue={localConfig.printableWidthCM}
                                step={0.1}
                                className={inputClsPr}
                                onCommit={(v) =>
                                    updateConfig((c) => {
                                        c.printableWidthCM = v;
                                    })
                                }
                            />
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Padding moi item</label>
                            <NumInput
                                configValue={localConfig.paddingCM}
                                step={0.1}
                                className={inputClsPr}
                                onCommit={(v) =>
                                    updateConfig((c) => {
                                        c.paddingCM = v;
                                    })
                                }
                            />
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Met toi toi thieu</label>
                            <NumInput
                                configValue={localConfig.minBillableMeters}
                                step={0.1}
                                className={inputClsPr}
                                onCommit={(v) =>
                                    updateConfig((c) => {
                                        c.minBillableMeters = v;
                                    })
                                }
                            />
                            <span className="absolute right-3 top-[32px] text-gray-500">m</span>
                        </div>
                    </div>
                </section>

                {/* ===== BANG GIA THEO MET TOI — KHONG BE ===== */}
                <TierTable
                    title="Bang Gia Theo Met Toi (khong be)"
                    testId="tier-table-priceTiers"
                    tiers={localConfig.priceTiers || []}
                    onUpdate={(i, f, v) => updateTier('priceTiers', i, f, v)}
                    onAdd={() => addTier('priceTiers')}
                    onDel={(i) => delTier('priceTiers', i)}
                />

                {/* ===== BANG GIA THEO MET TOI — CO BE ===== */}
                <TierTable
                    title="Bang Gia Theo Met Toi (co be)"
                    testId="tier-table-dieCutPriceTiers"
                    note="Bang nay DOC LAP voi bang tren: sua gia o bang khong be KHONG tu dong doi gia co be. De y het bac giong het bang khong be = hang co be tinh chung bang khong be."
                    tiers={localConfig.dieCutPriceTiers || []}
                    onUpdate={(i, f, v) => updateTier('dieCutPriceTiers', i, f, v)}
                    onAdd={() => addTier('dieCutPriceTiers')}
                    onDel={(i) => delTier('dieCutPriceTiers', i)}
                    extraAction={
                        <button
                            onClick={copyBaseToDieCut}
                            className={btnCls + ' bg-gray-600 hover:bg-gray-700 text-white'}
                        >
                            Chep tu bang khong be
                        </button>
                    }
                />
            </div>

            <div className="mt-8">
                <PriceConfigHistoryPanel moduleKey="uvdtf" />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 mt-6 border-t border-gray-700 pt-4">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                >
                    Luu cai dat
                </button>
                <button
                    onClick={onCancel}
                    className="px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded font-medium"
                >
                    Huy
                </button>
            </div>
        </div>
    );
}
