import { useState, useEffect, useRef } from 'react';
import { saveConfig } from '../../utils/configStorage';
import { restoreInfinity } from '../../utils/restoreInfinity';
import { computeA4Factor } from '../../utils/customerQuote';
import PriceConfigHistoryPanel from '../admin/PriceConfigHistoryPanel';

// Làm tròn 2 số lẻ cho hệ số quy đổi A4 tự tính (thân thiện, admin sửa được).
const round2 = (f) => Math.round(f * 100) / 100;

function NumInput({ configValue, onCommit, isPercentage = false, className, step }) {
    const displayNum = isPercentage ? parseFloat((configValue * 100).toFixed(2)) : configValue;
    const [localStr, setLocalStr] = useState(String(displayNum));
    const prevConfig = useRef(configValue);

    useEffect(() => {
        if (prevConfig.current !== configValue) {
            prevConfig.current = configValue;
            setLocalStr(
                String(isPercentage ? parseFloat((configValue * 100).toFixed(2)) : configValue)
            );
        }
    }, [configValue, isPercentage]);

    const handleChange = (e) => {
        setLocalStr(e.target.value);
        const parsed = parseFloat(e.target.value);
        if (!isNaN(parsed)) onCommit(isPercentage ? parsed / 100 : parsed);
    };

    const handleBlur = () => {
        const parsed = parseFloat(localStr);
        if (isNaN(parsed)) {
            setLocalStr(
                String(isPercentage ? parseFloat((configValue * 100).toFixed(2)) : configValue)
            );
        } else {
            onCommit(isPercentage ? parsed / 100 : parsed);
        }
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

export default function SettingsPanel({ config, onSave, onCancel }) {
    // P2-03: Password gate cũ đã được xoá. Auth/role check giờ thực hiện ngoài
    // component qua <AdminGate> wrapper ở App.jsx — chỉ admin
    // (useUserRole.isAdmin === true) mới render được panel này.
    // JSON round-trip mất Infinity (→ null). restoreInfinity trả về Infinity cho
    // các key upper-bound (max, max_cost, max_qty, upTo, ...) → schema validation
    // ở saveConfig sẽ pass. Không dùng restoreInfinity: PROFIT_MARGIN_TIERS[last]
    // .max_cost + CUSTOMER_PRICE_TIERS[last].max sẽ = null → fail schema check.
    const [localConfig, setLocalConfig] = useState(() =>
        restoreInfinity(JSON.parse(JSON.stringify(config)))
    );

    const handleSave = () => {
        try {
            // TASK-0010: saveConfig giờ trả về false nếu config fail schema
            // validation. Không gọi onSave (tránh update React state với
            // config xấu) và hiển thị lỗi cho admin.
            const ok = saveConfig(localConfig);
            if (!ok) {
                alert('Cấu hình in KTS không hợp lệ, không lưu. Mở Console để xem chi tiết lỗi.');
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

    // DECAL_SHEET_SIZES (khổ decal có sẵn tại kho) — add/del. W sửa qua updateNestedField,
    // H qua updateDecalHeight (tự tính lại a4Factor), a4Factor sửa tay qua updateNestedField.
    const addDecalSize = () =>
        setLocalConfig((prev) => {
            const f = computeA4Factor(33, prev);
            return {
                ...prev,
                DECAL_SHEET_SIZES: [
                    ...(prev.DECAL_SHEET_SIZES || []),
                    { w: 32.2, h: 33, a4Factor: f != null ? round2(f) : 1.5 },
                ],
            };
        });
    const delDecalSize = (idx) =>
        setLocalConfig((prev) => ({
            ...prev,
            DECAL_SHEET_SIZES: (prev.DECAL_SHEET_SIZES || []).filter((_, i) => i !== idx),
        }));
    // Đổi chiều cao khổ → tự tính lại hệ số quy đổi A4 theo công thức (giữ giá trị cũ nếu không suy ra được).
    const updateDecalHeight = (idx, val) =>
        setLocalConfig((prev) => {
            const arr = [...(prev.DECAL_SHEET_SIZES || [])];
            if (!arr[idx]) return prev;
            const f = computeA4Factor(val, prev);
            arr[idx] = { ...arr[idx], h: val, a4Factor: f != null ? round2(f) : arr[idx].a4Factor };
            return { ...prev, DECAL_SHEET_SIZES: arr };
        });

    // Khi mở panel: tự điền a4Factor cho khổ chưa có (config cũ) bằng công thức, để không hiện 0.
    useEffect(() => {
        setLocalConfig((prev) => {
            const arr = prev.DECAL_SHEET_SIZES || [];
            let changed = false;
            const next = arr.map((s) => {
                if (typeof s.a4Factor === 'number' && s.a4Factor > 0) return s;
                const f = computeA4Factor(s.h, prev);
                if (f == null) return s;
                changed = true;
                return { ...s, a4Factor: round2(f) };
            });
            return changed ? { ...prev, DECAL_SHEET_SIZES: next } : prev;
        });
    }, []);

    // STANDARD_SIZES (khổ chuẩn chọn nhanh) — add/edit/del.
    const addStandardSize = () =>
        setLocalConfig((prev) => ({
            ...prev,
            STANDARD_SIZES: [...(prev.STANDARD_SIZES || []), { name: 'Khổ mới', w: 9, h: 5.5 }],
        }));
    const delStandardSize = (idx) =>
        setLocalConfig((prev) => ({
            ...prev,
            STANDARD_SIZES: (prev.STANDARD_SIZES || []).filter((_, i) => i !== idx),
        }));
    const updateStandardName = (idx, name) =>
        setLocalConfig((prev) => ({
            ...prev,
            STANDARD_SIZES: (prev.STANDARD_SIZES || []).map((s, i) =>
                i === idx ? { ...s, name } : s
            ),
        }));

    // DIE_CUTTING_CUSTOM_MOLDS (danh mục khuôn bế tùy chỉnh) — add/del/update.
    // id sinh 1 lần lúc thêm, dùng làm value cho moldType ở InputPanel — không đổi
    // khi sửa tên, để lựa chọn khuôn của đơn hàng đang nhập không bị mất.
    const genMoldId = () => 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const addCustomMold = () =>
        setLocalConfig((prev) => ({
            ...prev,
            DIE_CUTTING_CUSTOM_MOLDS: [
                ...(prev.DIE_CUTTING_CUSTOM_MOLDS || []),
                {
                    id: genMoldId(),
                    name: 'Khuôn mới',
                    pricingMode: 'flat',
                    price: 100000,
                    threshold_area: 0,
                    small_price: 0,
                    large_price: 0,
                    price_per_cm2: 0,
                },
            ],
        }));
    const delCustomMold = (idx) =>
        setLocalConfig((prev) => ({
            ...prev,
            DIE_CUTTING_CUSTOM_MOLDS: (prev.DIE_CUTTING_CUSTOM_MOLDS || []).filter(
                (_, i) => i !== idx
            ),
        }));
    const updateCustomMoldField = (idx, field, value) =>
        setLocalConfig((prev) => ({
            ...prev,
            DIE_CUTTING_CUSTOM_MOLDS: (prev.DIE_CUTTING_CUSTOM_MOLDS || []).map((m, i) =>
                i === idx ? { ...m, [field]: value } : m
            ),
        }));

    // CUSTOM_FINISHING_TYPES (danh mục gia công tùy chỉnh) — 3 cấp: gia công →
    // sub-loại → tier giá. id/key sinh 1 lần lúc thêm, dùng làm value cho
    // dropdown "Gia công thêm" ở InputPanel — không đổi khi sửa tên.
    const genGcId = (prefix) =>
        prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const emptyTier = () => ({ max_qty: Infinity, price: 0, type: 'per_piece' });
    const emptySubType = (name) => ({
        key: genGcId('st'),
        name,
        cost_tiers: [emptyTier()],
        customer_tiers: [emptyTier()],
    });

    const addCustomFinishing = () =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: [
                ...(prev.CUSTOM_FINISHING_TYPES || []),
                { id: genGcId('gc'), name: 'Gia công mới', subTypes: [emptySubType('Loại 1')] },
            ],
        }));
    const delCustomFinishing = (gcIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: (prev.CUSTOM_FINISHING_TYPES || []).filter(
                (_, i) => i !== gcIdx
            ),
        }));
    const updateCustomFinishingName = (gcIdx, name) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx ? { ...gc, name } : gc
            ),
        }));

    const addSubType = (gcIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx
                    ? {
                          ...gc,
                          subTypes: [
                              ...gc.subTypes,
                              emptySubType(`Loại ${gc.subTypes.length + 1}`),
                          ],
                      }
                    : gc
            ),
        }));
    const delSubType = (gcIdx, stIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx ? { ...gc, subTypes: gc.subTypes.filter((_, j) => j !== stIdx) } : gc
            ),
        }));
    const updateSubTypeName = (gcIdx, stIdx, name) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx
                    ? {
                          ...gc,
                          subTypes: gc.subTypes.map((st, j) =>
                              j === stIdx ? { ...st, name } : st
                          ),
                      }
                    : gc
            ),
        }));

    const addTierRow = (gcIdx, stIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx
                    ? {
                          ...gc,
                          subTypes: gc.subTypes.map((st, j) =>
                              j === stIdx
                                  ? {
                                        ...st,
                                        cost_tiers: [...st.cost_tiers, emptyTier()],
                                        customer_tiers: [...st.customer_tiers, emptyTier()],
                                    }
                                  : st
                          ),
                      }
                    : gc
            ),
        }));
    const delTierRow = (gcIdx, stIdx, tierIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx
                    ? {
                          ...gc,
                          subTypes: gc.subTypes.map((st, j) =>
                              j === stIdx
                                  ? {
                                        ...st,
                                        cost_tiers: st.cost_tiers.filter((_, k) => k !== tierIdx),
                                        customer_tiers: st.customer_tiers.filter(
                                            (_, k) => k !== tierIdx
                                        ),
                                    }
                                  : st
                          ),
                      }
                    : gc
            ),
        }));
    const updateTierField = (gcIdx, stIdx, tierIdx, arrName, field, value) =>
        setLocalConfig((prev) => ({
            ...prev,
            CUSTOM_FINISHING_TYPES: prev.CUSTOM_FINISHING_TYPES.map((gc, i) =>
                i === gcIdx
                    ? {
                          ...gc,
                          subTypes: gc.subTypes.map((st, j) =>
                              j === stIdx
                                  ? {
                                        ...st,
                                        [arrName]: st[arrName].map((t, k) =>
                                            k === tierIdx ? { ...t, [field]: value } : t
                                        ),
                                    }
                                  : st
                          ),
                      }
                    : gc
            ),
        }));

    // PRINTER_CONFIG[printer].clickTiers (ngưỡng chiều cao → số click) — quyết
    // định cả giá vốn (số click × đơn giá) LẪN hệ số quy đổi A4 cho khổ decal
    // (options.js dùng clicks làm a4Factor, xem calculateDecalOptions). Mỗi máy
    // có ngưỡng riêng (C2060 nhảy 2 click ở >33cm, C6085 ở >35cm).
    const addClickTier = (printerKey) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    clickTiers: [
                        ...prev.PRINTER_CONFIG[printerKey].clickTiers,
                        { maxH: 0, clicks: 1 },
                    ],
                },
            },
        }));
    const delClickTier = (printerKey, tierIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    clickTiers: prev.PRINTER_CONFIG[printerKey].clickTiers.filter(
                        (_, i) => i !== tierIdx
                    ),
                },
            },
        }));
    const updateClickTierField = (printerKey, tierIdx, field, value) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    clickTiers: prev.PRINTER_CONFIG[printerKey].clickTiers.map((t, i) =>
                        i === tierIdx ? { ...t, [field]: value } : t
                    ),
                },
            },
        }));

    // PRINTER_CONFIG[printer].customerA4Tiers (ngưỡng chiều cao → hệ số quy đổi
    // A4 CHO GIÁ BÁO KHÁCH) — tách biệt hoàn toàn với clickTiers/giá vốn ở trên.
    // Admin tự chỉnh riêng từng máy, không bắt buộc bằng số click.
    const addCustomerA4Tier = (printerKey) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    customerA4Tiers: [
                        ...(prev.PRINTER_CONFIG[printerKey].customerA4Tiers || []),
                        { maxH: 0, factor: 1 },
                    ],
                },
            },
        }));
    const delCustomerA4Tier = (printerKey, tierIdx) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    customerA4Tiers: prev.PRINTER_CONFIG[printerKey].customerA4Tiers.filter(
                        (_, i) => i !== tierIdx
                    ),
                },
            },
        }));
    const updateCustomerA4TierField = (printerKey, tierIdx, field, value) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    customerA4Tiers: prev.PRINTER_CONFIG[printerKey].customerA4Tiers.map((t, i) =>
                        i === tierIdx ? { ...t, [field]: value } : t
                    ),
                },
            },
        }));

    // PRINTER_CONFIG[printer].vkPoints — danh sách chiều cao "điểm VK". Tờ có chiều
    // cao trùng 1 điểm trong danh sách bị trừ lề cao 0.8cm, ngoài danh sách chỉ trừ
    // 0.1cm (xem PRINTABLE_AREA_CONFIG + engine/layout.js getPrintableArea). Ảnh
    // hưởng SỐ CON TRÊN TỜ nên đổi là đổi giá vốn lẫn giá khách.
    const updateVkPoints = (printerKey, str) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINTER_CONFIG: {
                ...prev.PRINTER_CONFIG,
                [printerKey]: {
                    ...prev.PRINTER_CONFIG[printerKey],
                    vkPoints: String(str)
                        .split(',')
                        .map((s) => parseFloat(s.trim()))
                        .filter((n) => !isNaN(n) && n > 0),
                },
            },
        }));

    // Bảng quy đổi A4 cho giấy thường + decal xi bạc — MỖI MÁY MỘT BẢNG RIÊNG
    // (PRINTER_CONFIG[*].a4ConversionRates), hiển thị chung 1 bảng nhiều cột.
    // Object { "<chiều cao>": <hệ số> }, KHÔNG phải array. Khoá phải đúng dạng
    // Number(h).toFixed(1) vì engine tra bằng h.toFixed(1) (engine/a4.js) — sai
    // định dạng thì engine không thấy và rơi xuống công thức h/21.
    // A4_CONVERSION_RATES (bảng chung) giữ lại làm fallback cho máy chưa có bảng
    // riêng (config cũ lưu trước khi tách) và làm mẫu cho máy mới thêm sau này.

    // Danh sách chiều cao dùng chung cho mọi cột = hợp các khoá của mọi máy.
    const a4HeightKeys = () => {
        const keys = new Set();
        Object.values(localConfig.PRINTER_CONFIG || {}).forEach((p) =>
            Object.keys(p.a4ConversionRates || {}).forEach((k) => keys.add(k))
        );
        if (keys.size === 0) {
            Object.keys(localConfig.A4_CONVERSION_RATES || {}).forEach((k) => keys.add(k));
        }
        return [...keys].sort((a, b) => parseFloat(a) - parseFloat(b));
    };

    // Hệ số máy đang dùng cho 1 mốc (fallback bảng chung khi máy chưa có bảng riêng).
    const a4RateOf = (printer, key) => {
        const rates = printer.a4ConversionRates || localConfig.A4_CONVERSION_RATES || {};
        return rates[key] ?? 0;
    };

    // Áp fn lên bảng của TỪNG máy + bảng chung. fn(rates, printerKey) với
    // printerKey = null nghĩa là bảng chung. Máy chưa có bảng riêng được seed từ
    // bảng chung để 2 cột khởi điểm giống hệt nhau (bật tính năng không đổi giá).
    const editA4Rates = (fn) =>
        setLocalConfig((prev) => {
            const shared = prev.A4_CONVERSION_RATES || {};
            const nextPrinters = {};
            for (const [pKey, p] of Object.entries(prev.PRINTER_CONFIG || {})) {
                nextPrinters[pKey] = {
                    ...p,
                    a4ConversionRates: fn({ ...(p.a4ConversionRates || shared) }, pKey),
                };
            }
            return {
                ...prev,
                PRINTER_CONFIG: nextPrinters,
                A4_CONVERSION_RATES: fn({ ...shared }, null),
            };
        });

    // Thêm/xoá/đổi mốc áp cho MỌI máy cùng lúc để các cột luôn thẳng hàng.
    const addA4Rate = () => {
        const existing = new Set(a4HeightKeys());
        let h = 21.2;
        while (existing.has(h.toFixed(1))) h = Math.round((h + 0.1) * 10) / 10;
        const newKey = h.toFixed(1);
        editA4Rates((rates) => {
            rates[newKey] = 1;
            return rates;
        });
    };
    // schema.js liệt kê A4_CONVERSION_RATES trong REQUIRED_OBJECT_GROUPS → rỗng là
    // config bị loại âm thầm khi lưu. Chặn xoá dòng cuối cùng.
    const delA4Rate = (key) => {
        if (a4HeightKeys().length <= 1) return;
        editA4Rates((rates) => {
            delete rates[key];
            return rates;
        });
    };
    const updateA4RateKey = (oldKey, newH) => {
        const h = parseFloat(newH);
        if (!(h > 0)) return;
        const newKey = h.toFixed(1);
        if (newKey === oldKey || a4HeightKeys().includes(newKey)) return;
        editA4Rates((rates) => {
            if (oldKey in rates) {
                rates[newKey] = rates[oldKey];
                delete rates[oldKey];
            }
            return rates;
        });
    };
    // Sửa hệ số CHỈ của 1 máy — bảng chung (printerKey null) không đổi.
    const updateA4RateValue = (printerKey, key, val) =>
        editA4Rates((rates, pKey) => {
            if (pKey === printerKey) rates[key] = val;
            return rates;
        });

    // COMMON_SHEET_SIZES — khổ tờ in engine duyệt qua để tìm phương án tối ưu.
    // schema.js: REQUIRED_NONEMPTY_ARRAYS → chặn xoá dòng cuối.
    const addCommonSheet = () =>
        setLocalConfig((prev) => ({
            ...prev,
            COMMON_SHEET_SIZES: [...(prev.COMMON_SHEET_SIZES || []), { w: 32.2, h: 33.0 }],
        }));
    const delCommonSheet = (idx) =>
        setLocalConfig((prev) => {
            const arr = prev.COMMON_SHEET_SIZES || [];
            if (arr.length <= 1) return prev;
            return { ...prev, COMMON_SHEET_SIZES: arr.filter((_, i) => i !== idx) };
        });

    // STANDARD_LARGE_SHEET_SIZES + ART_PAPER_LARGE_SHEET_SIZES — cùng hình dạng
    // { name, w, h } nên dùng chung handler, truyền listKey.
    // LƯU Ý: ART_PAPER_LARGE_SHEET_SIZES có 1 dòng "Tùy chọn" với w/h = 'custom'
    // (string) — dòng đó admin nhập khổ ở màn tính giá, không sửa số ở đây.
    // Cả 2 đều nằm trong REQUIRED_NONEMPTY_ARRAYS → chặn xoá dòng cuối.
    const addLargeSheet = (listKey) =>
        setLocalConfig((prev) => ({
            ...prev,
            [listKey]: [...(prev[listKey] || []), { name: 'Khổ mới', w: 65, h: 86 }],
        }));
    const delLargeSheet = (listKey, idx) =>
        setLocalConfig((prev) => {
            const arr = prev[listKey] || [];
            if (arr.length <= 1) return prev;
            return { ...prev, [listKey]: arr.filter((_, i) => i !== idx) };
        });
    const updateSheetName = (listKey, idx, name) =>
        setLocalConfig((prev) => ({
            ...prev,
            [listKey]: (prev[listKey] || []).map((s, i) => (i === idx ? { ...s, name } : s)),
        }));

    // PAPER_REFERENCE_CONFIG.referencePaperName là string → updateNestedField chỉ
    // nhận số nên cần setter riêng.
    const updateRefPaperName = (name) =>
        setLocalConfig((prev) => ({
            ...prev,
            PAPER_REFERENCE_CONFIG: {
                ...(prev.PAPER_REFERENCE_CONFIG || {}),
                referencePaperName: name,
            },
        }));

    // PRINT_CONTENT_CONFIG.tiers — phụ thu theo số nội dung in khác nhau trong đơn.
    const addContentTier = () =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINT_CONTENT_CONFIG: {
                ...(prev.PRINT_CONTENT_CONFIG || {}),
                tiers: [
                    ...(prev.PRINT_CONTENT_CONFIG?.tiers || []),
                    { min: 0, max: 0, surcharge: 0 },
                ],
            },
        }));
    const delContentTier = (idx) =>
        setLocalConfig((prev) => ({
            ...prev,
            PRINT_CONTENT_CONFIG: {
                ...(prev.PRINT_CONTENT_CONFIG || {}),
                tiers: (prev.PRINT_CONTENT_CONFIG?.tiers || []).filter((_, i) => i !== idx),
            },
        }));

    // fi() là render function (không phải component) — tránh remount mỗi re-render
    const fi = (path, configValue, isPercentage, step, cls) => (
        <NumInput
            configValue={configValue}
            isPercentage={isPercentage || false}
            step={step}
            className={cls || inputClsPr}
            onCommit={(val) => updateNestedField(path, val)}
        />
    );

    const inputCls =
        'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500';
    const inputClsPr = inputCls + ' pr-12';
    const inputClsSm =
        'w-36 bg-gray-900 border border-gray-700 rounded px-2 py-1 pr-8 text-white focus:outline-none focus:border-blue-500 text-sm';
    const labelCls = 'text-gray-400 text-sm block mb-1';

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài Đặt Thông Số Hệ Thống</h2>
                <div className="space-x-4">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition"
                    >
                        Hủy
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50"
                    >
                        Lưu Cài Đặt
                    </button>
                </div>
            </div>

            <div className="space-y-10">
                {/* 1. Máy in */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Thông Số Máy In
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Click C2060 (4 màu)</label>
                            {fi(
                                'PRINTER_CONFIG.C2060.prices.4color',
                                localConfig.PRINTER_CONFIG.C2060.prices['4color']
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Click C6085 (4 màu)</label>
                            {fi(
                                'PRINTER_CONFIG.C6085.prices.4color',
                                localConfig.PRINTER_CONFIG.C6085.prices['4color']
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Click C6085 (1 màu / Đen)</label>
                            {fi(
                                'PRINTER_CONFIG.C6085.prices.1color',
                                localConfig.PRINTER_CONFIG.C6085.prices['1color']
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Giá màng cuộn / m dài (nội bộ)</label>
                            {fi(
                                'LAMINATION_CONFIG.PRICE_PER_METER',
                                localConfig.LAMINATION_CONFIG.PRICE_PER_METER
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                            <p className="mt-1 text-xs text-gray-500">
                                Chỉ dùng để engine chọn khổ/máy in tối ưu — không ảnh hưởng giá cán
                                màng báo khách (xem bảng "Giá cán màng (báo khách)" bên dưới).
                            </p>
                        </div>
                    </div>
                </section>

                {/* 1b. Ngưỡng click / quy đổi A4 theo máy */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Ngưỡng Chuyển Click (Giá Vốn — theo máy)
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Chiều cao tờ in vượt ngưỡng → nhảy số click (mỗi click = 1 lượt tính tiền
                        in). Chỉ ảnh hưởng GIÁ VỐN nội bộ (mỗi máy tính tiền in theo đúng số click
                        thực tế của máy đó) — KHÔNG ảnh hưởng giá báo khách (xem bảng "Ngưỡng Quy
                        Đổi A4 — Giá Khách" ngay bên dưới, tách riêng). Các dòng nên xếp theo chiều
                        cao tăng dần.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(localConfig.PRINTER_CONFIG).map(([printerKey, printer]) => (
                            <div
                                key={printerKey}
                                className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                            >
                                <div className="text-yellow-400 font-semibold mb-3">
                                    {printer.name}
                                </div>
                                <table className="w-full text-sm mb-3">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-700">
                                            <th className="text-left py-1.5 pr-3">
                                                Chiều cao tối đa
                                            </th>
                                            <th className="text-left py-1.5 pr-3">Số click</th>
                                            <th className="py-1.5"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {printer.clickTiers.map((tier, tierIdx) => (
                                            <tr
                                                key={tierIdx}
                                                className="border-b border-gray-700/50"
                                            >
                                                <td className="py-1.5 pr-3">
                                                    <div className="relative">
                                                        <NumInput
                                                            configValue={tier.maxH}
                                                            step="0.5"
                                                            onCommit={(val) =>
                                                                updateClickTierField(
                                                                    printerKey,
                                                                    tierIdx,
                                                                    'maxH',
                                                                    val
                                                                )
                                                            }
                                                            className={inputClsSm}
                                                        />
                                                        <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                            cm
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-1.5 pr-3">
                                                    <NumInput
                                                        configValue={tier.clicks}
                                                        step="1"
                                                        onCommit={(val) =>
                                                            updateClickTierField(
                                                                printerKey,
                                                                tierIdx,
                                                                'clicks',
                                                                val
                                                            )
                                                        }
                                                        className={inputClsSm}
                                                    />
                                                </td>
                                                <td className="py-1.5">
                                                    {printer.clickTiers.length > 1 && (
                                                        <button
                                                            onClick={() =>
                                                                delClickTier(printerKey, tierIdx)
                                                            }
                                                            className="text-red-400 hover:text-red-300 text-xs"
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button
                                    onClick={() => addClickTier(printerKey)}
                                    className="text-xs font-medium text-blue-400 hover:text-blue-300"
                                >
                                    + Thêm ngưỡng
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 1c. Ngưỡng quy đổi A4 cho giá khách theo máy */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Ngưỡng Quy Đổi A4 (Giá Khách — theo máy)
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Chiều cao tờ in vượt ngưỡng → đổi hệ số quy đổi trang A4 dùng để TÍNH GIÁ
                        BÁO KHÁCH khổ decal. Tách biệt hoàn toàn với bảng "Ngưỡng Chuyển Click" ở
                        trên (giá vốn) — 2 máy có thể cho khách hệ số khác nhau dù cùng khổ giấy,
                        không bắt buộc bằng số click. Các dòng nên xếp theo chiều cao tăng dần.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(localConfig.PRINTER_CONFIG).map(([printerKey, printer]) => (
                            <div
                                key={printerKey}
                                className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                            >
                                <div className="text-yellow-400 font-semibold mb-3">
                                    {printer.name}
                                </div>
                                <table className="w-full text-sm mb-3">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-700">
                                            <th className="text-left py-1.5 pr-3">
                                                Chiều cao tối đa
                                            </th>
                                            <th className="text-left py-1.5 pr-3">Hệ số quy đổi</th>
                                            <th className="py-1.5"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(printer.customerA4Tiers || []).map((tier, tierIdx) => (
                                            <tr
                                                key={tierIdx}
                                                className="border-b border-gray-700/50"
                                            >
                                                <td className="py-1.5 pr-3">
                                                    <div className="relative">
                                                        <NumInput
                                                            configValue={tier.maxH}
                                                            step="0.5"
                                                            onCommit={(val) =>
                                                                updateCustomerA4TierField(
                                                                    printerKey,
                                                                    tierIdx,
                                                                    'maxH',
                                                                    val
                                                                )
                                                            }
                                                            className={inputClsSm}
                                                        />
                                                        <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                            cm
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-1.5 pr-3">
                                                    <NumInput
                                                        configValue={tier.factor}
                                                        step="0.1"
                                                        onCommit={(val) =>
                                                            updateCustomerA4TierField(
                                                                printerKey,
                                                                tierIdx,
                                                                'factor',
                                                                val
                                                            )
                                                        }
                                                        className={inputClsSm}
                                                    />
                                                </td>
                                                <td className="py-1.5">
                                                    {(printer.customerA4Tiers || []).length > 1 && (
                                                        <button
                                                            onClick={() =>
                                                                delCustomerA4Tier(
                                                                    printerKey,
                                                                    tierIdx
                                                                )
                                                            }
                                                            className="text-red-400 hover:text-red-300 text-xs"
                                                        >
                                                            Xóa
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <button
                                    onClick={() => addCustomerA4Tier(printerKey)}
                                    className="text-xs font-medium text-blue-400 hover:text-blue-300"
                                >
                                    + Thêm ngưỡng
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 2. Vùng in */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Cài Đặt Vùng In (cm)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Lề bế KTS (tổng)</label>
                            {fi(
                                'PRINTABLE_AREA_CONFIG.digital_cut_margin_total',
                                localConfig.PRINTABLE_AREA_CONFIG.digital_cut_margin_total
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề rộng (thường)</label>
                            {fi(
                                'PRINTABLE_AREA_CONFIG.regular_cut_width_margin_total',
                                localConfig.PRINTABLE_AREA_CONFIG.regular_cut_width_margin_total
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề cao (VK)</label>
                            {fi(
                                'PRINTABLE_AREA_CONFIG.vk_point_height_margin',
                                localConfig.PRINTABLE_AREA_CONFIG.vk_point_height_margin
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề cao (thường)</label>
                            {fi(
                                'PRINTABLE_AREA_CONFIG.non_vk_point_height_margin',
                                localConfig.PRINTABLE_AREA_CONFIG.non_vk_point_height_margin
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề rộng (tùy chỉnh)</label>
                            {fi(
                                'PRINTABLE_AREA_CONFIG.custom_width_margin',
                                localConfig.PRINTABLE_AREA_CONFIG.custom_width_margin
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề cao (tùy chỉnh)</label>
                            {fi(
                                'PRINTABLE_AREA_CONFIG.custom_height_margin',
                                localConfig.PRINTABLE_AREA_CONFIG.custom_height_margin
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                    </div>
                </section>

                {/* 3. Giá giấy */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Giấy / Decal
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {localConfig.PAPER_STOCK_DATA.map((paper, idx) => {
                            if (paper.pricingModel === 'custom') return null;
                            const isReam = paper.pricingModel === 'ream';
                            const isSqm = paper.pricingModel === 'sqm';
                            const isSheet = paper.pricingModel === 'per_sheet';
                            return (
                                <div key={idx} className="space-y-2">
                                    {/* Tên sửa được: config đã lưu (localStorage/Supabase) ghi đè
                                        PAPER_STOCK_DATA nguyên khối, nên đổi tên trong code sẽ
                                        KHÔNG tới được máy đang chạy. Cho admin tự sửa ở đây.
                                        Engine tra giấy theo INDEX nên đổi tên không ảnh hưởng
                                        tính toán — trừ 2 chỗ so khớp chuỗi: tên giấy chuẩn ở
                                        "Giấy Chuẩn & Điều Chỉnh Giá", và chữ "decal" trong tên
                                        (dùng để loại nhánh tờ oversized). */}
                                    <label className={labelCls}>Tên loại giấy</label>
                                    <input
                                        type="text"
                                        defaultValue={paper.name}
                                        className={
                                            inputCls + ' font-semibold text-yellow-400 text-sm'
                                        }
                                        onBlur={(e) =>
                                            updateNestedField(
                                                `PAPER_STOCK_DATA.${idx}.name`,
                                                e.target.value.trim() || paper.name
                                            )
                                        }
                                    />
                                    {isReam && (
                                        <div className="relative">
                                            <label className={labelCls}>Giá / ram (500 tờ)</label>
                                            <NumInput
                                                configValue={paper.pricePerReam}
                                                step="1000"
                                                onCommit={(val) =>
                                                    updateNestedField(
                                                        `PAPER_STOCK_DATA.${idx}.pricePerReam`,
                                                        val
                                                    )
                                                }
                                                className={inputClsPr}
                                            />
                                            <span className="absolute right-3 top-[32px] text-gray-500">
                                                VNĐ
                                            </span>
                                        </div>
                                    )}
                                    {isSqm && (
                                        <div className="relative">
                                            <label className={labelCls}>Giá / m²</label>
                                            <NumInput
                                                configValue={paper.pricePerSqm}
                                                step="100"
                                                onCommit={(val) =>
                                                    updateNestedField(
                                                        `PAPER_STOCK_DATA.${idx}.pricePerSqm`,
                                                        val
                                                    )
                                                }
                                                className={inputClsPr}
                                            />
                                            <span className="absolute right-3 top-[32px] text-gray-500">
                                                VNĐ
                                            </span>
                                        </div>
                                    )}
                                    {isSheet && (
                                        <div className="relative">
                                            <label className={labelCls}>Giá / tờ</label>
                                            <NumInput
                                                configValue={paper.sheetPrice}
                                                step="100"
                                                onCommit={(val) =>
                                                    updateNestedField(
                                                        `PAPER_STOCK_DATA.${idx}.sheetPrice`,
                                                        val
                                                    )
                                                }
                                                className={inputClsPr}
                                            />
                                            <span className="absolute right-3 top-[32px] text-gray-500">
                                                VNĐ
                                            </span>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <label className={labelCls}>Phụ thu KH / trang A4</label>
                                        <NumInput
                                            configValue={paper.customerSurcharge}
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `PAPER_STOCK_DATA.${idx}.customerSurcharge`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            VNĐ
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 4. Bảng giá khách hàng */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Bảng Giá Khách Hàng (theo trang A4)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                        <div className="relative">
                            <label className={labelCls}>% giảm giá khi in 1 màu đen</label>
                            {fi(
                                'ONE_COLOR_DISCOUNT_PERCENT',
                                localConfig.ONE_COLOR_DISCOUNT_PERCENT ?? 0,
                                false,
                                '1'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">%</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Sàn đơn giá in 1 màu đen</label>
                            {fi(
                                'ONE_COLOR_MIN_PRICE_PER_PAGE',
                                localConfig.ONE_COLOR_MIN_PRICE_PER_PAGE ?? 0,
                                false,
                                '100'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">
                                đ/trang
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Số trang A4</th>
                                    <th className="text-left py-2 pr-4">Loại</th>
                                    <th className="text-left py-2 pr-4">Giá in</th>
                                    <th className="text-left py-2">Giá cán màng (báo khách)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localConfig.CUSTOMER_PRICE_TIERS.map((tier, idx) => {
                                    const rangeStr =
                                        tier.max === Infinity
                                            ? `≥ ${tier.min}`
                                            : `${tier.min} – ${tier.max}`;
                                    const unit = tier.type === 'package' ? 'Trọn gói' : '/trang';
                                    return (
                                        <tr key={idx} className="border-b border-gray-700/50">
                                            <td className="py-2 pr-4 text-yellow-400 font-medium whitespace-nowrap">
                                                {rangeStr}
                                            </td>
                                            <td className="py-2 pr-4 text-gray-400">{unit}</td>
                                            <td className="py-2 pr-4">
                                                <div className="relative">
                                                    <NumInput
                                                        configValue={tier.print}
                                                        step="100"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `CUSTOMER_PRICE_TIERS.${idx}.print`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsSm}
                                                    />
                                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                        đ
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2">
                                                <div className="relative">
                                                    <NumInput
                                                        configValue={tier.laminate}
                                                        step="100"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `CUSTOMER_PRICE_TIERS.${idx}.laminate`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsSm}
                                                    />
                                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                        đ
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 5. Lợi nhuận */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Cài Đặt Lợi Nhuận Tối Thiểu
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {localConfig.PROFIT_MARGIN_TIERS.map((tier, index) => {
                            const rangeStr =
                                tier.max_cost === Infinity
                                    ? `> ${(localConfig.PROFIT_MARGIN_TIERS[index - 1]?.max_cost || 0).toLocaleString('vi-VN')} VNĐ`
                                    : `≤ ${(tier.max_cost || 0).toLocaleString('vi-VN')} VNĐ`;
                            return (
                                <div key={index} className="relative">
                                    <label className={labelCls}>Giá vốn {rangeStr}</label>
                                    <NumInput
                                        configValue={tier.margin}
                                        isPercentage={true}
                                        step="0.01"
                                        onCommit={(val) =>
                                            updateNestedField(
                                                `PROFIT_MARGIN_TIERS.${index}.margin`,
                                                val
                                            )
                                        }
                                        className={inputClsPr}
                                    />
                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                        %
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 6. Đục lỗ */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Đục Lỗ
                    </h3>
                    {['1_vi_tri', '2_vi_tri'].map((key) => (
                        <div key={key} className="mb-6">
                            <div className="font-semibold text-yellow-400 mb-3">
                                {key === '1_vi_tri' ? '1–2 lỗ (1 vị trí)' : '1–2 lỗ (2 vị trí)'}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {localConfig.HOLE_PUNCHING_CONFIG[key].cost_tiers.map(
                                    (tier, idx) => {
                                        const rangeStr =
                                            tier.max_qty === Infinity
                                                ? `> ${localConfig.HOLE_PUNCHING_CONFIG[key].cost_tiers[idx - 1]?.max_qty || 0} SP`
                                                : `≤ ${tier.max_qty} SP`;
                                        const unit = tier.type === 'package' ? 'Trọn gói' : '/SP';
                                        return (
                                            <div
                                                key={idx}
                                                className="space-y-2 p-3 bg-gray-900/50 rounded"
                                            >
                                                <div className="text-gray-300 text-xs font-medium">
                                                    {rangeStr} — {unit}
                                                </div>
                                                <div className="relative">
                                                    <label className={labelCls}>Giá vốn</label>
                                                    <NumInput
                                                        configValue={tier.price}
                                                        step="100"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `HOLE_PUNCHING_CONFIG.${key}.cost_tiers.${idx}.price`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsPr}
                                                    />
                                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                                        đ
                                                    </span>
                                                </div>
                                                <div className="relative">
                                                    <label className={labelCls}>Giá KH</label>
                                                    <NumInput
                                                        configValue={
                                                            localConfig.HOLE_PUNCHING_CONFIG[key]
                                                                .customer_tiers[idx].price
                                                        }
                                                        step="100"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `HOLE_PUNCHING_CONFIG.${key}.customer_tiers.${idx}.price`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsPr}
                                                    />
                                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                                        đ
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        </div>
                    ))}
                </section>

                {/* 7. Cấn */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Cấn
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localConfig.CREASING_CONFIG.co_can.cost_tiers.map((tier, idx) => {
                            const rangeStr =
                                tier.max_qty === Infinity
                                    ? `> ${localConfig.CREASING_CONFIG.co_can.cost_tiers[idx - 1]?.max_qty || 0} SP`
                                    : `≤ ${tier.max_qty} SP`;
                            const unit = tier.type === 'package' ? 'Trọn gói' : '/SP';
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">
                                        {rangeStr} — {unit}
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput
                                            configValue={tier.price}
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `CREASING_CONFIG.co_can.cost_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput
                                            configValue={
                                                localConfig.CREASING_CONFIG.co_can.customer_tiers[
                                                    idx
                                                ].price
                                            }
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `CREASING_CONFIG.co_can.customer_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 8. Bồi */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Bồi Thành Phẩm
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {localConfig.MOUNTING_CONFIG.yes.cost_tiers.map((tier, idx) => {
                            const rangeStr =
                                tier.max_qty === Infinity
                                    ? `> ${localConfig.MOUNTING_CONFIG.yes.cost_tiers[idx - 1]?.max_qty || 0} SP`
                                    : `≤ ${tier.max_qty} SP`;
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">
                                        {rangeStr}
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput
                                            configValue={tier.price}
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `MOUNTING_CONFIG.yes.cost_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput
                                            configValue={
                                                localConfig.MOUNTING_CONFIG.yes.customer_tiers[idx]
                                                    .price
                                            }
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `MOUNTING_CONFIG.yes.customer_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 9. Bế KTS */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Bế Kỹ Thuật Số
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localConfig.DIGITAL_DIE_CUTTING_CONFIG.cost_tiers.map((tier, idx) => {
                            const rangeStr = `≤ ${tier.max_qty} SP`;
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">
                                        {rangeStr} — Trọn gói
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput
                                            configValue={tier.price}
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `DIGITAL_DIE_CUTTING_CONFIG.cost_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput
                                            configValue={
                                                localConfig.DIGITAL_DIE_CUTTING_CONFIG
                                                    .customer_tiers[idx].price
                                            }
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `DIGITAL_DIE_CUTTING_CONFIG.customer_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 10. Bế khuôn - công bế */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Công Bế Khuôn
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localConfig.DIE_CUTTING_LABOR_CONFIG.cost_tiers.map((tier, idx) => {
                            const rangeStr =
                                tier.max_qty === Infinity
                                    ? `> ${localConfig.DIE_CUTTING_LABOR_CONFIG.cost_tiers[idx - 1]?.max_qty || 0} SP`
                                    : `≤ ${tier.max_qty} SP`;
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">
                                        {rangeStr} — Trọn gói
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput
                                            configValue={tier.price}
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `DIE_CUTTING_LABOR_CONFIG.cost_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput
                                            configValue={
                                                localConfig.DIE_CUTTING_LABOR_CONFIG.customer_tiers[
                                                    idx
                                                ].price
                                            }
                                            step="100"
                                            onCommit={(val) =>
                                                updateNestedField(
                                                    `DIE_CUTTING_LABOR_CONFIG.customer_tiers.${idx}.price`,
                                                    val
                                                )
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            đ
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 10b. Bế khuôn - giá khuôn theo hình dạng */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Khuôn Bế (theo hình dạng)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="space-y-2 p-3 bg-gray-900/50 rounded">
                            <div className="text-gray-300 text-xs font-medium">
                                Hình dạng đơn giản
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Ngưỡng cạnh cơ bản</label>
                                {fi(
                                    'DIE_CUTTING_MOLD_COST_CONFIG.simple.base_size',
                                    localConfig.DIE_CUTTING_MOLD_COST_CONFIG.simple.base_size,
                                    false,
                                    '1',
                                    inputClsSm
                                )}
                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                    cm
                                </span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Giá cơ bản</label>
                                {fi(
                                    'DIE_CUTTING_MOLD_COST_CONFIG.simple.base_price',
                                    localConfig.DIE_CUTTING_MOLD_COST_CONFIG.simple.base_price,
                                    false,
                                    '1000',
                                    inputClsSm
                                )}
                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                    đ
                                </span>
                            </div>
                        </div>
                        {[
                            { key: 'envelope', label: 'Bao thư' },
                            { key: 'box', label: 'Hộp' },
                            { key: 'bag', label: 'Túi giấy' },
                        ].map(({ key, label }) => (
                            <div key={key} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                <div className="text-gray-300 text-xs font-medium">{label}</div>
                                <div className="relative">
                                    <label className={labelCls}>Ngưỡng diện tích</label>
                                    {fi(
                                        `DIE_CUTTING_MOLD_COST_CONFIG.${key}.threshold_area`,
                                        localConfig.DIE_CUTTING_MOLD_COST_CONFIG[key]
                                            .threshold_area,
                                        false,
                                        '1',
                                        inputClsSm
                                    )}
                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                        cm²
                                    </span>
                                </div>
                                <div className="relative">
                                    <label className={labelCls}>Giá khuôn nhỏ</label>
                                    {fi(
                                        `DIE_CUTTING_MOLD_COST_CONFIG.${key}.small_price`,
                                        localConfig.DIE_CUTTING_MOLD_COST_CONFIG[key].small_price,
                                        false,
                                        '1000',
                                        inputClsSm
                                    )}
                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                        đ
                                    </span>
                                </div>
                                <div className="relative">
                                    <label className={labelCls}>Giá khuôn lớn</label>
                                    {fi(
                                        `DIE_CUTTING_MOLD_COST_CONFIG.${key}.large_price`,
                                        localConfig.DIE_CUTTING_MOLD_COST_CONFIG[key].large_price,
                                        false,
                                        '1000',
                                        inputClsSm
                                    )}
                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                        đ
                                    </span>
                                </div>
                            </div>
                        ))}
                        <div className="space-y-2 p-3 bg-gray-900/50 rounded">
                            <div className="text-gray-300 text-xs font-medium">Tag treo</div>
                            <div className="relative">
                                <label className={labelCls}>Ngưỡng W</label>
                                {fi(
                                    'DIE_CUTTING_MOLD_COST_CONFIG.tag.threshold_w',
                                    localConfig.DIE_CUTTING_MOLD_COST_CONFIG.tag.threshold_w,
                                    false,
                                    '1',
                                    inputClsSm
                                )}
                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                    cm
                                </span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Ngưỡng H</label>
                                {fi(
                                    'DIE_CUTTING_MOLD_COST_CONFIG.tag.threshold_h',
                                    localConfig.DIE_CUTTING_MOLD_COST_CONFIG.tag.threshold_h,
                                    false,
                                    '1',
                                    inputClsSm
                                )}
                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                    cm
                                </span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Đơn giá / cm²</label>
                                {fi(
                                    'DIE_CUTTING_MOLD_COST_CONFIG.tag.price_per_cm2',
                                    localConfig.DIE_CUTTING_MOLD_COST_CONFIG.tag.price_per_cm2,
                                    false,
                                    '10',
                                    inputClsSm
                                )}
                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                    đ
                                </span>
                            </div>
                            <div className="relative">
                                <label className={labelCls}>Phụ thu đục lỗ</label>
                                {fi(
                                    'DIE_CUTTING_MOLD_COST_CONFIG.tag.hole_price',
                                    localConfig.DIE_CUTTING_MOLD_COST_CONFIG.tag.hole_price,
                                    false,
                                    '1000',
                                    inputClsSm
                                )}
                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                    đ
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* 10c. Khuôn bế tùy chỉnh */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">Khuôn Bế Tùy Chỉnh</h3>
                        <button
                            onClick={addCustomMold}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm khuôn
                        </button>
                    </div>
                    {(localConfig.DIE_CUTTING_CUSTOM_MOLDS || []).length === 0 && (
                        <p className="text-gray-500 text-sm">
                            Chưa có khuôn tùy chỉnh nào. Bấm "+ Thêm khuôn" để tạo khuôn mới ngoài 5
                            loại có sẵn ở trên.
                        </p>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {(localConfig.DIE_CUTTING_CUSTOM_MOLDS || []).map((mold, idx) => (
                            <div key={mold.id} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                <div className="flex items-center justify-between">
                                    <input
                                        type="text"
                                        value={mold.name}
                                        onChange={(e) =>
                                            updateCustomMoldField(idx, 'name', e.target.value)
                                        }
                                        className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm flex-1 mr-2"
                                    />
                                    <button
                                        onClick={() => delCustomMold(idx)}
                                        className="text-red-400 hover:text-red-300 text-xs font-medium"
                                    >
                                        Xóa
                                    </button>
                                </div>
                                <div className="relative">
                                    <label className={labelCls}>Cách tính giá</label>
                                    <select
                                        value={mold.pricingMode}
                                        onChange={(e) =>
                                            updateCustomMoldField(
                                                idx,
                                                'pricingMode',
                                                e.target.value
                                            )
                                        }
                                        className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                    >
                                        <option value="flat">Giá cố định</option>
                                        <option value="threshold">Theo ngưỡng diện tích</option>
                                        <option value="per_area">Đơn giá / cm²</option>
                                    </select>
                                </div>
                                {mold.pricingMode === 'flat' && (
                                    <div className="relative">
                                        <label className={labelCls}>Giá</label>
                                        <NumInput
                                            configValue={mold.price}
                                            step="1000"
                                            onCommit={(val) =>
                                                updateCustomMoldField(idx, 'price', val)
                                            }
                                            className={inputClsSm}
                                        />
                                        <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                            đ
                                        </span>
                                    </div>
                                )}
                                {mold.pricingMode === 'threshold' && (
                                    <>
                                        <div className="relative">
                                            <label className={labelCls}>Ngưỡng diện tích</label>
                                            <NumInput
                                                configValue={mold.threshold_area}
                                                step="1"
                                                onCommit={(val) =>
                                                    updateCustomMoldField(
                                                        idx,
                                                        'threshold_area',
                                                        val
                                                    )
                                                }
                                                className={inputClsSm}
                                            />
                                            <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                cm²
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <label className={labelCls}>Giá nhỏ</label>
                                            <NumInput
                                                configValue={mold.small_price}
                                                step="1000"
                                                onCommit={(val) =>
                                                    updateCustomMoldField(idx, 'small_price', val)
                                                }
                                                className={inputClsSm}
                                            />
                                            <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                đ
                                            </span>
                                        </div>
                                        <div className="relative">
                                            <label className={labelCls}>Giá lớn</label>
                                            <NumInput
                                                configValue={mold.large_price}
                                                step="1000"
                                                onCommit={(val) =>
                                                    updateCustomMoldField(idx, 'large_price', val)
                                                }
                                                className={inputClsSm}
                                            />
                                            <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                đ
                                            </span>
                                        </div>
                                    </>
                                )}
                                {mold.pricingMode === 'per_area' && (
                                    <div className="relative">
                                        <label className={labelCls}>Đơn giá / cm²</label>
                                        <NumInput
                                            configValue={mold.price_per_cm2}
                                            step="10"
                                            onCommit={(val) =>
                                                updateCustomMoldField(idx, 'price_per_cm2', val)
                                            }
                                            className={inputClsSm}
                                        />
                                        <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                            đ
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>

                {/* 10d. Gia công tùy chỉnh */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">Gia Công Tùy Chỉnh</h3>
                        <button
                            onClick={addCustomFinishing}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm gia công
                        </button>
                    </div>
                    {(localConfig.CUSTOM_FINISHING_TYPES || []).length === 0 && (
                        <p className="text-gray-500 text-sm">
                            Chưa có gia công tùy chỉnh nào. Bấm "+ Thêm gia công" để tạo loại gia
                            công mới (vd: cắt góc, đóng ghim...) với khung giá tự thiết lập.
                        </p>
                    )}
                    <div className="space-y-6">
                        {(localConfig.CUSTOM_FINISHING_TYPES || []).map((gc, gcIdx) => (
                            <div
                                key={gc.id}
                                className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                            >
                                <div className="flex items-center justify-between mb-4">
                                    <input
                                        type="text"
                                        value={gc.name}
                                        onChange={(e) =>
                                            updateCustomFinishingName(gcIdx, e.target.value)
                                        }
                                        className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-white font-semibold flex-1 mr-3"
                                    />
                                    <button
                                        onClick={() => delCustomFinishing(gcIdx)}
                                        className="text-red-400 hover:text-red-300 text-sm font-medium whitespace-nowrap"
                                    >
                                        Xóa gia công
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {gc.subTypes.map((st, stIdx) => (
                                        <div
                                            key={st.key}
                                            className="p-3 bg-gray-800/60 rounded border border-gray-700/60"
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <input
                                                    type="text"
                                                    value={st.name}
                                                    onChange={(e) =>
                                                        updateSubTypeName(
                                                            gcIdx,
                                                            stIdx,
                                                            e.target.value
                                                        )
                                                    }
                                                    className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-yellow-400 text-sm font-medium flex-1 mr-3"
                                                />
                                                {gc.subTypes.length > 1 && (
                                                    <button
                                                        onClick={() => delSubType(gcIdx, stIdx)}
                                                        className="text-red-400 hover:text-red-300 text-xs whitespace-nowrap"
                                                    >
                                                        Xóa loại
                                                    </button>
                                                )}
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-gray-400 border-b border-gray-700">
                                                            <th className="text-left py-1.5 pr-3">
                                                                Ngưỡng SL
                                                            </th>
                                                            <th className="text-left py-1.5 pr-3">
                                                                Loại
                                                            </th>
                                                            <th className="text-left py-1.5 pr-3">
                                                                Giá vốn
                                                            </th>
                                                            <th className="text-left py-1.5 pr-3">
                                                                Giá KH
                                                            </th>
                                                            <th className="py-1.5"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {st.cost_tiers.map((tier, tierIdx) => {
                                                            const custTier =
                                                                st.customer_tiers[tierIdx];
                                                            const isUnlimited =
                                                                tier.max_qty === Infinity;
                                                            const updateBoth = (field, value) => {
                                                                updateTierField(
                                                                    gcIdx,
                                                                    stIdx,
                                                                    tierIdx,
                                                                    'cost_tiers',
                                                                    field,
                                                                    value
                                                                );
                                                                updateTierField(
                                                                    gcIdx,
                                                                    stIdx,
                                                                    tierIdx,
                                                                    'customer_tiers',
                                                                    field,
                                                                    value
                                                                );
                                                            };
                                                            return (
                                                                <tr
                                                                    key={tierIdx}
                                                                    className="border-b border-gray-700/50"
                                                                >
                                                                    <td className="py-1.5 pr-3">
                                                                        <div className="flex items-center gap-2">
                                                                            {!isUnlimited && (
                                                                                <NumInput
                                                                                    configValue={
                                                                                        tier.max_qty
                                                                                    }
                                                                                    step="1"
                                                                                    onCommit={(
                                                                                        val
                                                                                    ) =>
                                                                                        updateBoth(
                                                                                            'max_qty',
                                                                                            val
                                                                                        )
                                                                                    }
                                                                                    className={
                                                                                        inputClsSm
                                                                                    }
                                                                                />
                                                                            )}
                                                                            <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={
                                                                                        isUnlimited
                                                                                    }
                                                                                    onChange={(e) =>
                                                                                        updateBoth(
                                                                                            'max_qty',
                                                                                            e.target
                                                                                                .checked
                                                                                                ? Infinity
                                                                                                : 0
                                                                                        )
                                                                                    }
                                                                                />
                                                                                Không giới hạn
                                                                            </label>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 pr-3">
                                                                        <select
                                                                            value={tier.type}
                                                                            onChange={(e) =>
                                                                                updateBoth(
                                                                                    'type',
                                                                                    e.target.value
                                                                                )
                                                                            }
                                                                            className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white text-sm"
                                                                        >
                                                                            <option value="package">
                                                                                Trọn gói
                                                                            </option>
                                                                            <option value="per_piece">
                                                                                /SP
                                                                            </option>
                                                                        </select>
                                                                    </td>
                                                                    <td className="py-1.5 pr-3">
                                                                        <div className="relative">
                                                                            <NumInput
                                                                                configValue={
                                                                                    tier.price
                                                                                }
                                                                                step="1000"
                                                                                onCommit={(val) =>
                                                                                    updateTierField(
                                                                                        gcIdx,
                                                                                        stIdx,
                                                                                        tierIdx,
                                                                                        'cost_tiers',
                                                                                        'price',
                                                                                        val
                                                                                    )
                                                                                }
                                                                                className={
                                                                                    inputClsSm
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5 pr-3">
                                                                        <div className="relative">
                                                                            <NumInput
                                                                                configValue={
                                                                                    custTier?.price ??
                                                                                    0
                                                                                }
                                                                                step="1000"
                                                                                onCommit={(val) =>
                                                                                    updateTierField(
                                                                                        gcIdx,
                                                                                        stIdx,
                                                                                        tierIdx,
                                                                                        'customer_tiers',
                                                                                        'price',
                                                                                        val
                                                                                    )
                                                                                }
                                                                                className={
                                                                                    inputClsSm
                                                                                }
                                                                            />
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-1.5">
                                                                        {st.cost_tiers.length >
                                                                            1 && (
                                                                            <button
                                                                                onClick={() =>
                                                                                    delTierRow(
                                                                                        gcIdx,
                                                                                        stIdx,
                                                                                        tierIdx
                                                                                    )
                                                                                }
                                                                                className="text-red-400 hover:text-red-300 text-xs"
                                                                            >
                                                                                Xóa
                                                                            </button>
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <button
                                                onClick={() => addTierRow(gcIdx, stIdx)}
                                                className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
                                            >
                                                + Thêm mức giá
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => addSubType(gcIdx)}
                                    className="mt-3 px-3 py-1 rounded text-xs font-medium bg-gray-700 hover:bg-gray-600 text-white"
                                >
                                    + Thêm loại con
                                </button>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 11. Dữ liệu biến đổi */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Dữ Liệu Biến Đổi
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>≤ 500 SP (trọn gói)</label>
                            {fi(
                                'VARIABLE_DATA_CONFIG.price_500',
                                localConfig.VARIABLE_DATA_CONFIG.price_500
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>≤ 1.000 SP (trọn gói)</label>
                            {fi(
                                'VARIABLE_DATA_CONFIG.price_1000',
                                localConfig.VARIABLE_DATA_CONFIG.price_1000
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>{'>'} 1.000 SP (giá cơ bản)</label>
                            {fi(
                                'VARIABLE_DATA_CONFIG.price_over_1000_base',
                                localConfig.VARIABLE_DATA_CONFIG.price_over_1000_base
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Mỗi thêm 1.000 SP</label>
                            {fi(
                                'VARIABLE_DATA_CONFIG.price_over_1000_progressive',
                                localConfig.VARIABLE_DATA_CONFIG.price_over_1000_progressive
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                    </div>
                </section>

                {/* 12. Ép kim */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giá Ép Kim (Nhũ)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Đơn giá / cm²</label>
                            {fi(
                                'EP_KIM_CONFIG.pricePerArea',
                                localConfig.EP_KIM_CONFIG.pricePerArea
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Đơn giá khuôn / cm²</label>
                            {fi('EP_KIM_CONFIG.moldPerArea', localConfig.EP_KIM_CONFIG.moldPerArea)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Giá tối thiểu / lượt (thường)</label>
                            {fi(
                                'EP_KIM_CONFIG.minPriceNormal',
                                localConfig.EP_KIM_CONFIG.minPriceNormal
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Giá tối thiểu / lượt (nhũ ĐB)</label>
                            {fi(
                                'EP_KIM_CONFIG.minPriceSpecial',
                                localConfig.EP_KIM_CONFIG.minPriceSpecial
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Tổng tối thiểu (khuôn nhỏ)</label>
                            {fi(
                                'EP_KIM_CONFIG.minTotalSmall',
                                localConfig.EP_KIM_CONFIG.minTotalSmall
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phí ship (khuôn nhỏ)</label>
                            {fi(
                                'EP_KIM_CONFIG.shippingSmall',
                                localConfig.EP_KIM_CONFIG.shippingSmall
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Tổng tối thiểu (khuôn lớn)</label>
                            {fi(
                                'EP_KIM_CONFIG.minTotalLarge',
                                localConfig.EP_KIM_CONFIG.minTotalLarge
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phí ship (khuôn lớn)</label>
                            {fi(
                                'EP_KIM_CONFIG.shippingLarge',
                                localConfig.EP_KIM_CONFIG.shippingLarge
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Ngưỡng W khuôn nhỏ</label>
                            {fi('EP_KIM_CONFIG.thresholdW', localConfig.EP_KIM_CONFIG.thresholdW)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Ngưỡng H khuôn nhỏ</label>
                            {fi('EP_KIM_CONFIG.thresholdH', localConfig.EP_KIM_CONFIG.thresholdH)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Bù hao chiều cuộn</label>
                            {fi(
                                'EP_KIM_CONFIG.foilPadWidth',
                                localConfig.EP_KIM_CONFIG.foilPadWidth,
                                false,
                                '0.1'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Bù hao chiều mét tới</label>
                            {fi(
                                'EP_KIM_CONFIG.foilPadLength',
                                localConfig.EP_KIM_CONFIG.foilPadLength,
                                false,
                                '0.1'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Hệ số lần ép thêm (cùng khuôn)</label>
                            {fi(
                                'EP_KIM_CONFIG.extraImpressionRate',
                                localConfig.EP_KIM_CONFIG.extraImpressionRate,
                                false,
                                '0.05'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">×</span>
                        </div>
                    </div>
                </section>

                {/* 13. Khổ decal kho */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Khổ Decal Có Sẵn Tại Kho
                        </h3>
                        <button
                            onClick={addDecalSize}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm khổ
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Cột "Quy đổi A4" chỉ còn là giá trị dự phòng (khi máy chưa cấu hình bảng
                        riêng) — giá báo khách khổ decal giờ tra theo bảng "Ngưỡng Quy Đổi A4 (Giá
                        Khách — theo máy)" ở trên, mỗi máy 1 hệ số riêng. Giá vốn nội bộ tính theo
                        số click thực tế của từng máy — xem "Ngưỡng Chuyển Click (Giá Vốn — theo
                        máy)".
                    </p>
                    <div className="space-y-2">
                        {(localConfig.DECAL_SHEET_SIZES || []).map((sheet, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-3">
                                    <label className={labelCls}>Khổ {idx + 1} · Rộng (W)</label>
                                    <div className="relative">
                                        <NumInput
                                            configValue={sheet.w}
                                            step="0.1"
                                            onCommit={(val) =>
                                                updateNestedField(`DECAL_SHEET_SIZES.${idx}.w`, val)
                                            }
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            cm
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-3">
                                    <label className={labelCls}>Dài (H)</label>
                                    <div className="relative">
                                        <NumInput
                                            configValue={sheet.h}
                                            step="0.1"
                                            onCommit={(val) => updateDecalHeight(idx, val)}
                                            className={inputClsPr}
                                        />
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            cm
                                        </span>
                                    </div>
                                </div>
                                <div className="col-span-4">
                                    <label className={labelCls}>Quy đổi A4 (trang/tờ)</label>
                                    <NumInput
                                        configValue={sheet.a4Factor ?? 0}
                                        step="0.1"
                                        onCommit={(val) =>
                                            updateNestedField(
                                                `DECAL_SHEET_SIZES.${idx}.a4Factor`,
                                                val
                                            )
                                        }
                                        className={inputCls}
                                    />
                                </div>
                                <div className="col-span-2">
                                    <button
                                        onClick={() => delDecalSize(idx)}
                                        className="w-full px-2 py-2 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 14. Khổ chuẩn (chọn nhanh) */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Khổ Chuẩn (chọn nhanh khổ thành phẩm)
                        </h3>
                        <button
                            onClick={addStandardSize}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm khổ
                        </button>
                    </div>
                    <div className="space-y-2">
                        {(localConfig.STANDARD_SIZES || []).map((s, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5">
                                    <label className={labelCls}>Tên</label>
                                    <input
                                        type="text"
                                        defaultValue={s.name}
                                        className={inputCls}
                                        onBlur={(e) => updateStandardName(idx, e.target.value)}
                                    />
                                </div>
                                <div className="col-span-3 relative">
                                    <label className={labelCls}>Rộng (W)</label>
                                    <NumInput
                                        configValue={s.w}
                                        step="0.1"
                                        onCommit={(val) =>
                                            updateNestedField(`STANDARD_SIZES.${idx}.w`, val)
                                        }
                                        className={inputClsPr}
                                    />
                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                        cm
                                    </span>
                                </div>
                                <div className="col-span-3 relative">
                                    <label className={labelCls}>Cao (H)</label>
                                    <NumInput
                                        configValue={s.h}
                                        step="0.1"
                                        onCommit={(val) =>
                                            updateNestedField(`STANDARD_SIZES.${idx}.h`, val)
                                        }
                                        className={inputClsPr}
                                    />
                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                        cm
                                    </span>
                                </div>
                                <div className="col-span-1">
                                    <button
                                        onClick={() => delStandardSize(idx)}
                                        className="w-full px-2 py-2 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        Xóa
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 15. Khổ tối đa + điểm VK theo máy */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Khổ Tối Đa & Điểm VK (theo máy)
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Khổ tối đa quyết định máy có nhận được tờ in đó hay không — tờ vượt khổ bị
                        loại khỏi danh sách phương án. Điểm VK là danh sách chiều cao bị trừ lề cao
                        nhiều hơn khi tính vùng in (xem "Cài Đặt Vùng In" ở trên), nên ảnh hưởng
                        trực tiếp số con xếp được trên tờ, tức đổi cả giá vốn lẫn giá khách. Nhập
                        nhiều giá trị cách nhau bằng dấu phẩy.
                    </p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {Object.entries(localConfig.PRINTER_CONFIG).map(([printerKey, printer]) => (
                            <div
                                key={printerKey}
                                className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                            >
                                <div className="text-yellow-400 font-semibold mb-3">
                                    {printer.name}
                                </div>
                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div className="relative">
                                        <label className={labelCls}>Khổ ngang tối đa</label>
                                        {fi(
                                            `PRINTER_CONFIG.${printerKey}.maxW`,
                                            printer.maxW,
                                            false,
                                            '0.1'
                                        )}
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            cm
                                        </span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Chiều cao tối đa</label>
                                        {fi(
                                            `PRINTER_CONFIG.${printerKey}.maxH`,
                                            printer.maxH,
                                            false,
                                            '0.1'
                                        )}
                                        <span className="absolute right-3 top-[32px] text-gray-500">
                                            cm
                                        </span>
                                    </div>
                                </div>
                                <label className={labelCls}>Điểm VK (cm, cách nhau dấu phẩy)</label>
                                <input
                                    type="text"
                                    key={(printer.vkPoints || []).join(',')}
                                    defaultValue={(printer.vkPoints || []).join(', ')}
                                    className={inputCls}
                                    onBlur={(e) => updateVkPoints(printerKey, e.target.value)}
                                />
                            </div>
                        ))}
                    </div>
                </section>

                {/* 16. Bảng quy đổi A4 — mỗi máy một cột */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Bảng Quy Đổi A4 (giấy thường & decal xi bạc — theo máy)
                        </h3>
                        <button
                            onClick={addA4Rate}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm mốc
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Một tờ in cao bằng đúng mốc này được tính thành bấy nhiêu trang A4 khi báo
                        giá khách. Dùng cho MỌI loại giấy thường và decal xi bạc; mỗi máy có hệ số
                        riêng nên cùng một khổ vẫn báo giá khác nhau được. Khổ decal cuộn thì tra
                        bảng riêng ở mục "Ngưỡng Quy Đổi A4 (Giá Khách — theo máy)". Chiều cao ngoài
                        bảng: trên 48cm lấy 3 / 4 / 5 theo mốc 76 và 91, từ 21.2 đến 48cm lấy chiều
                        cao chia 21.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Chiều cao tờ</th>
                                    {Object.entries(localConfig.PRINTER_CONFIG || {}).map(
                                        ([pKey, printer]) => (
                                            <th
                                                key={pKey}
                                                className="text-left py-2 pr-4 text-yellow-400"
                                            >
                                                {printer.name}
                                            </th>
                                        )
                                    )}
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {a4HeightKeys().map((rateKey) => (
                                    <tr key={rateKey} className="border-b border-gray-700/50">
                                        <td className="py-2 pr-4">
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    defaultValue={rateKey}
                                                    className={inputClsSm}
                                                    onBlur={(e) =>
                                                        updateA4RateKey(rateKey, e.target.value)
                                                    }
                                                />
                                                <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                    cm
                                                </span>
                                            </div>
                                        </td>
                                        {Object.entries(localConfig.PRINTER_CONFIG || {}).map(
                                            ([pKey, printer]) =>
                                                parseFloat(rateKey) > printer.maxH ? (
                                                    <td
                                                        key={pKey}
                                                        className="py-2 pr-4 text-gray-600 text-xs italic"
                                                    >
                                                        vượt khổ máy
                                                    </td>
                                                ) : (
                                                    <td key={pKey} className="py-2 pr-4">
                                                        <div className="relative">
                                                            <NumInput
                                                                configValue={a4RateOf(
                                                                    printer,
                                                                    rateKey
                                                                )}
                                                                step="0.05"
                                                                onCommit={(val) =>
                                                                    updateA4RateValue(
                                                                        pKey,
                                                                        rateKey,
                                                                        val
                                                                    )
                                                                }
                                                                className={inputClsSm}
                                                            />
                                                            <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                                tr
                                                            </span>
                                                        </div>
                                                    </td>
                                                )
                                        )}
                                        <td className="py-2">
                                            {a4HeightKeys().length > 1 && (
                                                <button
                                                    onClick={() => delA4Rate(rateKey)}
                                                    className="text-red-400 hover:text-red-300 text-xs"
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="mt-2 text-xs text-gray-600">
                        Đổi chiều cao xong bấm ra ngoài ô để lưu; mốc đó đổi cho mọi máy để bảng
                        luôn thẳng cột. Nếu mốc mới trùng mốc đã có thì ô sẽ tự quay về số cũ để
                        không ghi đè mất dòng kia. Thêm hoặc xoá mốc cũng áp cho mọi máy. Ô "vượt
                        khổ máy" nghĩa là máy đó không nhận được tờ cao như vậy nên hệ số vô nghĩa.
                    </p>
                </section>

                {/* 17. Khổ tờ in thông dụng */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Khổ Tờ In Thông Dụng
                        </h3>
                        <button
                            onClick={addCommonSheet}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm khổ
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">
                        Danh sách khổ tờ in mà engine thử để tìm phương án rẻ nhất. Engine tự thử
                        thêm bản xoay ngang của từng khổ, không cần khai báo cả hai chiều.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {(localConfig.COMMON_SHEET_SIZES || []).map((sheet, idx) => (
                            <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                <div className="col-span-5 relative">
                                    <label className={labelCls}>Rộng</label>
                                    <NumInput
                                        configValue={sheet.w}
                                        step="0.1"
                                        onCommit={(val) =>
                                            updateNestedField(`COMMON_SHEET_SIZES.${idx}.w`, val)
                                        }
                                        className={inputClsPr}
                                    />
                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                        cm
                                    </span>
                                </div>
                                <div className="col-span-5 relative">
                                    <label className={labelCls}>Cao</label>
                                    <NumInput
                                        configValue={sheet.h}
                                        step="0.1"
                                        onCommit={(val) =>
                                            updateNestedField(`COMMON_SHEET_SIZES.${idx}.h`, val)
                                        }
                                        className={inputClsPr}
                                    />
                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                        cm
                                    </span>
                                </div>
                                <div className="col-span-2">
                                    {(localConfig.COMMON_SHEET_SIZES || []).length > 1 && (
                                        <button
                                            onClick={() => delCommonSheet(idx)}
                                            className="w-full px-2 py-2 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                                        >
                                            Xóa
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 18. Khổ tờ lớn chuẩn + khổ giấy mỹ thuật */}
                {[
                    {
                        listKey: 'STANDARD_LARGE_SHEET_SIZES',
                        title: 'Khổ Tờ Lớn Chuẩn (giấy tính theo ram)',
                        note: 'Khổ giấy nhập về, engine tính xem 1 tờ lớn cắt được bao nhiêu tờ in. Giá ram quy về khổ 65 × 86 nên đổi khổ ở đây là đổi luôn giá vốn giấy.',
                    },
                    {
                        listKey: 'ART_PAPER_LARGE_SHEET_SIZES',
                        title: 'Khổ Giấy Mỹ Thuật',
                        note: 'Dùng khi khách chọn giấy mỹ thuật. Dòng có khổ "Tùy chọn" để admin nhập tay khổ ngay ở màn tính giá, không sửa số tại đây.',
                    },
                ].map(({ listKey, title, note }) => (
                    <section key={listKey}>
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                            <h3 className="text-lg font-semibold text-cyan-400">{title}</h3>
                            <button
                                onClick={() => addLargeSheet(listKey)}
                                className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                            >
                                + Thêm khổ
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">{note}</p>
                        <div className="space-y-2">
                            {(localConfig[listKey] || []).map((s, idx) => {
                                const isCustomSize =
                                    typeof s.w !== 'number' || typeof s.h !== 'number';
                                return (
                                    <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                                        <div className="col-span-5">
                                            <label className={labelCls}>Tên</label>
                                            <input
                                                type="text"
                                                defaultValue={s.name}
                                                className={inputCls}
                                                onBlur={(e) =>
                                                    updateSheetName(listKey, idx, e.target.value)
                                                }
                                            />
                                        </div>
                                        {isCustomSize ? (
                                            <div className="col-span-6">
                                                <label className={labelCls}>Khổ</label>
                                                <div className="px-3 py-2 rounded bg-gray-900 border border-gray-700 text-gray-500 text-sm">
                                                    Admin nhập tay ở màn tính giá
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="col-span-3 relative">
                                                    <label className={labelCls}>Rộng</label>
                                                    <NumInput
                                                        configValue={s.w}
                                                        step="0.5"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `${listKey}.${idx}.w`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsPr}
                                                    />
                                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                                        cm
                                                    </span>
                                                </div>
                                                <div className="col-span-3 relative">
                                                    <label className={labelCls}>Cao</label>
                                                    <NumInput
                                                        configValue={s.h}
                                                        step="0.5"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `${listKey}.${idx}.h`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsPr}
                                                    />
                                                    <span className="absolute right-3 top-[32px] text-gray-500">
                                                        cm
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                        <div className="col-span-1">
                                            {(localConfig[listKey] || []).length > 1 && (
                                                <button
                                                    onClick={() => delLargeSheet(listKey, idx)}
                                                    className="w-full px-2 py-2 rounded text-sm font-medium bg-red-600 hover:bg-red-700 text-white"
                                                >
                                                    Xóa
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                ))}

                {/* 19. Giấy chuẩn + phụ thu giấy mỹ thuật */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                        Giấy Chuẩn & Điều Chỉnh Giá Theo Giấy
                    </h3>
                    <p className="text-xs text-gray-500 mb-4">
                        Bảng giá khách được thiết kế dựa trên một loại giấy chuẩn. Khi khách chọn
                        giấy khác tính theo ram, engine lấy chênh lệch giá vốn so với giấy chuẩn rồi
                        cộng hoặc trừ vào giá báo khách. Giấy rẻ hơn giấy chuẩn thì trừ, đắt hơn thì
                        cộng thêm.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div>
                            <label className={labelCls}>Giấy chuẩn</label>
                            <select
                                value={
                                    localConfig.PAPER_REFERENCE_CONFIG?.referencePaperName ?? 'C300'
                                }
                                onChange={(e) => updateRefPaperName(e.target.value)}
                                className={inputCls}
                            >
                                {(localConfig.PAPER_STOCK_DATA || [])
                                    .filter((p) => p.pricingModel === 'ream')
                                    .map((p) => (
                                        <option key={p.name} value={p.name}>
                                            {p.name}
                                        </option>
                                    ))}
                            </select>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Tỉ lệ chia sẻ chênh lệch</label>
                            {fi(
                                'PAPER_REFERENCE_CONFIG.adjustmentRatio',
                                localConfig.PAPER_REFERENCE_CONFIG?.adjustmentRatio ?? 1,
                                true,
                                '5'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">%</span>
                            <p className="mt-1 text-xs text-gray-500">
                                100% là khách hưởng trọn phần rẻ hơn. 70% là tiệm giữ lại 30%.
                            </p>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Sàn đơn giá in / trang</label>
                            {fi(
                                'PAPER_REFERENCE_CONFIG.minPrintPricePerPage',
                                localConfig.PAPER_REFERENCE_CONFIG?.minPrintPricePerPage ?? 0,
                                false,
                                '100'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                            <p className="mt-1 text-xs text-gray-500">
                                Chỉ là mức sàn cho ô hiển thị "Đơn giá IN / trang" trong panel Giá
                                Tối Thiểu. Đặt 0 để tắt.
                            </p>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phụ thu giấy mỹ thuật</label>
                            {fi(
                                'ART_PAPER_SURCHARGE',
                                localConfig.ART_PAPER_SURCHARGE ?? 0,
                                false,
                                '10000'
                            )}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                            <p className="mt-1 text-xs text-gray-500">
                                Cộng một lần vào giá khách khi chọn giấy mỹ thuật.
                            </p>
                        </div>
                    </div>
                </section>

                {/* 20. Phụ thu nhiều nội dung */}
                <section>
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-600">
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Phụ Thu Nhiều Nội Dung
                        </h3>
                        <button
                            onClick={addContentTier}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm bậc
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">
                        Một đơn in nhiều mẫu khác nhau tốn công dàn trang và canh máy hơn. Phụ thu
                        tính trên tổng tiền, áp cho cả giá vốn lẫn giá khách.
                    </p>
                    <div className="relative mb-4 max-w-xs">
                        <label className={labelCls}>Mỗi nội dung chỉ in 1 cái</label>
                        {fi(
                            'PRINT_CONTENT_CONFIG.single_content_surcharge',
                            localConfig.PRINT_CONTENT_CONFIG?.single_content_surcharge ?? 0,
                            true,
                            '5'
                        )}
                        <span className="absolute right-3 top-[32px] text-gray-500">%</span>
                        <p className="mt-1 text-xs text-gray-500">
                            Áp riêng khi số nội dung bằng đúng số lượng sản phẩm, bỏ qua bảng bậc
                            bên dưới.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Từ</th>
                                    <th className="text-left py-2 pr-4">Đến</th>
                                    <th className="text-left py-2 pr-4">Phụ thu</th>
                                    <th className="py-2"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {(localConfig.PRINT_CONTENT_CONFIG?.tiers || []).map(
                                    (tier, idx) => (
                                        <tr key={idx} className="border-b border-gray-700/50">
                                            <td className="py-2 pr-4">
                                                <NumInput
                                                    configValue={tier.min}
                                                    step="1"
                                                    onCommit={(val) =>
                                                        updateNestedField(
                                                            `PRINT_CONTENT_CONFIG.tiers.${idx}.min`,
                                                            val
                                                        )
                                                    }
                                                    className={inputClsSm}
                                                />
                                            </td>
                                            <td className="py-2 pr-4">
                                                {tier.max === Infinity ? (
                                                    <span className="text-yellow-400 font-medium">
                                                        trở lên
                                                    </span>
                                                ) : (
                                                    <NumInput
                                                        configValue={tier.max}
                                                        step="1"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `PRINT_CONTENT_CONFIG.tiers.${idx}.max`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsSm}
                                                    />
                                                )}
                                            </td>
                                            <td className="py-2 pr-4">
                                                <div className="relative">
                                                    <NumInput
                                                        configValue={tier.surcharge}
                                                        isPercentage
                                                        step="5"
                                                        onCommit={(val) =>
                                                            updateNestedField(
                                                                `PRINT_CONTENT_CONFIG.tiers.${idx}.surcharge`,
                                                                val
                                                            )
                                                        }
                                                        className={inputClsSm}
                                                    />
                                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">
                                                        %
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2">
                                                <button
                                                    onClick={() => delContentTier(idx)}
                                                    className="text-red-400 hover:text-red-300 text-xs"
                                                >
                                                    Xóa
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>

            <PriceConfigHistoryPanel moduleKey="small-print" />

            <div className="flex justify-end mt-10 pt-6 border-t border-gray-700 space-x-4">
                <button
                    onClick={onCancel}
                    className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition"
                >
                    Hủy
                </button>
                <button
                    onClick={handleSave}
                    className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50"
                >
                    Lưu Cài Đặt
                </button>
            </div>
        </div>
    );
}
