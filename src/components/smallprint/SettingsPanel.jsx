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
                                Chỉ dùng để engine chọn khổ/máy in tối ưu — không ảnh hưởng giá
                                cán màng báo khách (xem bảng "Giá cán màng (báo khách)" bên dưới).
                            </p>
                        </div>
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
                                    <div className="font-semibold text-yellow-400 text-sm">
                                        {paper.name}
                                    </div>
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
                        <h3 className="text-lg font-semibold text-cyan-400">
                            Khuôn Bế Tùy Chỉnh
                        </h3>
                        <button
                            onClick={addCustomMold}
                            className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                        >
                            + Thêm khuôn
                        </button>
                    </div>
                    {(localConfig.DIE_CUTTING_CUSTOM_MOLDS || []).length === 0 && (
                        <p className="text-gray-500 text-sm">
                            Chưa có khuôn tùy chỉnh nào. Bấm "+ Thêm khuôn" để tạo khuôn mới ngoài
                            5 loại có sẵn ở trên.
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
