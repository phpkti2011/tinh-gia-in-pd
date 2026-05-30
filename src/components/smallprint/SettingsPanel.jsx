import React, { useState, useEffect, useRef } from 'react';
import { saveConfig } from '../../utils/configStorage';

function NumInput({ configValue, onCommit, isPercentage = false, className, step }) {
    const displayNum = isPercentage ? parseFloat((configValue * 100).toFixed(2)) : configValue;
    const [localStr, setLocalStr] = useState(String(displayNum));
    const prevConfig = useRef(configValue);

    useEffect(() => {
        if (prevConfig.current !== configValue) {
            prevConfig.current = configValue;
            setLocalStr(String(isPercentage ? parseFloat((configValue * 100).toFixed(2)) : configValue));
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
            setLocalStr(String(isPercentage ? parseFloat((configValue * 100).toFixed(2)) : configValue));
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

    // fi() là render function (không phải component) — tránh remount mỗi re-render
    const fi = (path, configValue, isPercentage, step, cls) =>
        <NumInput configValue={configValue} isPercentage={isPercentage || false} step={step} className={cls || inputClsPr} onCommit={(val) => updateNestedField(path, val)}/>;

    const inputCls = "w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500";
    const inputClsPr = inputCls + " pr-12";
    const inputClsSm = "w-36 bg-gray-900 border border-gray-700 rounded px-2 py-1 pr-8 text-white focus:outline-none focus:border-blue-500 text-sm";
    const labelCls = "text-gray-400 text-sm block mb-1";

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 w-full max-w-md text-center">
                    <h2 className="text-2xl font-bold text-white mb-6">Xác Thực Quản Trị Viên</h2>
                    <div className="relative mb-4">
                        <input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onKeyUp={handlePasswordCheck}
                            placeholder="Nhập mật khẩu..."
                            className="w-full bg-gray-900 border border-gray-600 rounded px-4 py-3 pr-12 text-white focus:outline-none focus:border-blue-500 text-center text-lg tracking-widest"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(v => !v)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                            tabIndex={-1}
                        >
                            {showPassword ? '🙈' : '👁'}
                        </button>
                    </div>
                    {errorMsg && <p className="text-red-500 mb-4">{errorMsg}</p>}
                    <button onClick={handlePasswordCheck} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded transition duration-200">Xác Nhận</button>
                    <button onClick={onCancel} className="mt-4 text-gray-400 hover:text-white underline">Quay Lại</button>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex justify-between items-center mb-8 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài Đặt Thông Số Hệ Thống</h2>
                <div className="space-x-4">
                    <button onClick={onCancel} className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition">Hủy</button>
                    <button onClick={handleSave} className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50">Lưu Cài Đặt</button>
                </div>
            </div>

            <div className="space-y-10">

                {/* 1. Máy in */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Thông Số Máy In</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Click C2060 (4 màu)</label>
                            {fi("PRINTER_CONFIG.C2060.prices.4color", localConfig.PRINTER_CONFIG.C2060.prices['4color'])}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Click C6085 (4 màu)</label>
                            {fi("PRINTER_CONFIG.C6085.prices.4color", localConfig.PRINTER_CONFIG.C6085.prices['4color'])}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Click C6085 (1 màu / Đen)</label>
                            {fi("PRINTER_CONFIG.C6085.prices.1color", localConfig.PRINTER_CONFIG.C6085.prices['1color'])}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Giá Cán Màng / m tới</label>
                            {fi("LAMINATION_CONFIG.PRICE_PER_METER", localConfig.LAMINATION_CONFIG.PRICE_PER_METER)}
                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                        </div>
                    </div>
                </section>

                {/* 2. Vùng in */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Cài Đặt Vùng In (cm)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Lề bế KTS (tổng)</label>
                            {fi("PRINTABLE_AREA_CONFIG.digital_cut_margin_total", localConfig.PRINTABLE_AREA_CONFIG.digital_cut_margin_total)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề rộng (thường)</label>
                            {fi("PRINTABLE_AREA_CONFIG.regular_cut_width_margin_total", localConfig.PRINTABLE_AREA_CONFIG.regular_cut_width_margin_total)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề cao (VK)</label>
                            {fi("PRINTABLE_AREA_CONFIG.vk_point_height_margin", localConfig.PRINTABLE_AREA_CONFIG.vk_point_height_margin)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề cao (thường)</label>
                            {fi("PRINTABLE_AREA_CONFIG.non_vk_point_height_margin", localConfig.PRINTABLE_AREA_CONFIG.non_vk_point_height_margin)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề rộng (tùy chỉnh)</label>
                            {fi("PRINTABLE_AREA_CONFIG.custom_width_margin", localConfig.PRINTABLE_AREA_CONFIG.custom_width_margin)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Lề cao (tùy chỉnh)</label>
                            {fi("PRINTABLE_AREA_CONFIG.custom_height_margin", localConfig.PRINTABLE_AREA_CONFIG.custom_height_margin)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                    </div>
                </section>

                {/* 3. Giá giấy */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Giấy / Decal</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {localConfig.PAPER_STOCK_DATA.map((paper, idx) => {
                            if (paper.pricingModel === 'custom') return null;
                            const isReam = paper.pricingModel === 'ream';
                            const isSqm = paper.pricingModel === 'sqm';
                            const isSheet = paper.pricingModel === 'per_sheet';
                            return (
                                <div key={idx} className="space-y-2">
                                    <div className="font-semibold text-yellow-400 text-sm">{paper.name}</div>
                                    {isReam && (
                                        <div className="relative">
                                            <label className={labelCls}>Giá / ram (500 tờ)</label>
                                            <NumInput configValue={paper.pricePerReam} step="1000" onCommit={(val) => updateNestedField(`PAPER_STOCK_DATA.${idx}.pricePerReam`, val)} className={inputClsPr}/>
                                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                                        </div>
                                    )}
                                    {isSqm && (
                                        <div className="relative">
                                            <label className={labelCls}>Giá / m²</label>
                                            <NumInput configValue={paper.pricePerSqm} step="100" onCommit={(val) => updateNestedField(`PAPER_STOCK_DATA.${idx}.pricePerSqm`, val)} className={inputClsPr}/>
                                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                                        </div>
                                    )}
                                    {isSheet && (
                                        <div className="relative">
                                            <label className={labelCls}>Giá / tờ</label>
                                            <NumInput configValue={paper.sheetPrice} step="100" onCommit={(val) => updateNestedField(`PAPER_STOCK_DATA.${idx}.sheetPrice`, val)} className={inputClsPr}/>
                                            <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                                        </div>
                                    )}
                                    <div className="relative">
                                        <label className={labelCls}>Phụ thu KH / trang A4</label>
                                        <NumInput configValue={paper.customerSurcharge} step="100" onCommit={(val) => updateNestedField(`PAPER_STOCK_DATA.${idx}.customerSurcharge`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">VNĐ</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 4. Bảng giá khách hàng */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Bảng Giá Khách Hàng (theo trang A4)</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-gray-400 border-b border-gray-700">
                                    <th className="text-left py-2 pr-4">Số trang A4</th>
                                    <th className="text-left py-2 pr-4">Loại</th>
                                    <th className="text-left py-2 pr-4">Giá in</th>
                                    <th className="text-left py-2">Giá cán màng</th>
                                </tr>
                            </thead>
                            <tbody>
                                {localConfig.CUSTOMER_PRICE_TIERS.map((tier, idx) => {
                                    const rangeStr = tier.max === Infinity ? `≥ ${tier.min}` : `${tier.min} – ${tier.max}`;
                                    const unit = tier.type === 'package' ? 'Trọn gói' : '/trang';
                                    return (
                                        <tr key={idx} className="border-b border-gray-700/50">
                                            <td className="py-2 pr-4 text-yellow-400 font-medium whitespace-nowrap">{rangeStr}</td>
                                            <td className="py-2 pr-4 text-gray-400">{unit}</td>
                                            <td className="py-2 pr-4">
                                                <div className="relative">
                                                    <NumInput configValue={tier.print} step="100" onCommit={(val) => updateNestedField(`CUSTOMER_PRICE_TIERS.${idx}.print`, val)} className={inputClsSm}/>
                                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">đ</span>
                                                </div>
                                            </td>
                                            <td className="py-2">
                                                <div className="relative">
                                                    <NumInput configValue={tier.laminate} step="100" onCommit={(val) => updateNestedField(`CUSTOMER_PRICE_TIERS.${idx}.laminate`, val)} className={inputClsSm}/>
                                                    <span className="absolute right-2 top-[6px] text-gray-500 text-xs">đ</span>
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
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Cài Đặt Lợi Nhuận Tối Thiểu</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {localConfig.PROFIT_MARGIN_TIERS.map((tier, index) => {
                            const rangeStr = tier.max_cost === Infinity
                                ? `> ${(localConfig.PROFIT_MARGIN_TIERS[index-1]?.max_cost || 0).toLocaleString('vi-VN')} VNĐ`
                                : `≤ ${(tier.max_cost || 0).toLocaleString('vi-VN')} VNĐ`;
                            return (
                                <div key={index} className="relative">
                                    <label className={labelCls}>Giá vốn {rangeStr}</label>
                                    <NumInput configValue={tier.margin} isPercentage={true} step="0.01" onCommit={(val) => updateNestedField(`PROFIT_MARGIN_TIERS.${index}.margin`, val)} className={inputClsPr}/>
                                    <span className="absolute right-3 top-[32px] text-gray-500">%</span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 6. Đục lỗ */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Đục Lỗ</h3>
                    {['1_vi_tri', '2_vi_tri'].map(key => (
                        <div key={key} className="mb-6">
                            <div className="font-semibold text-yellow-400 mb-3">{key === '1_vi_tri' ? '1–2 lỗ (1 vị trí)' : '1–2 lỗ (2 vị trí)'}</div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {localConfig.HOLE_PUNCHING_CONFIG[key].cost_tiers.map((tier, idx) => {
                                    const rangeStr = tier.max_qty === Infinity ? `> ${localConfig.HOLE_PUNCHING_CONFIG[key].cost_tiers[idx-1]?.max_qty || 0} SP` : `≤ ${tier.max_qty} SP`;
                                    const unit = tier.type === 'package' ? 'Trọn gói' : '/SP';
                                    return (
                                        <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                            <div className="text-gray-300 text-xs font-medium">{rangeStr} — {unit}</div>
                                            <div className="relative">
                                                <label className={labelCls}>Giá vốn</label>
                                                <NumInput configValue={tier.price} step="100" onCommit={(val) => updateNestedField(`HOLE_PUNCHING_CONFIG.${key}.cost_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                                <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                            </div>
                                            <div className="relative">
                                                <label className={labelCls}>Giá KH</label>
                                                <NumInput configValue={localConfig.HOLE_PUNCHING_CONFIG[key].customer_tiers[idx].price} step="100" onCommit={(val) => updateNestedField(`HOLE_PUNCHING_CONFIG.${key}.customer_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                                <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </section>

                {/* 7. Cấn */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Cấn</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localConfig.CREASING_CONFIG.co_can.cost_tiers.map((tier, idx) => {
                            const rangeStr = tier.max_qty === Infinity ? `> ${localConfig.CREASING_CONFIG.co_can.cost_tiers[idx-1]?.max_qty || 0} SP` : `≤ ${tier.max_qty} SP`;
                            const unit = tier.type === 'package' ? 'Trọn gói' : '/SP';
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">{rangeStr} — {unit}</div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput configValue={tier.price} step="100" onCommit={(val) => updateNestedField(`CREASING_CONFIG.co_can.cost_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput configValue={localConfig.CREASING_CONFIG.co_can.customer_tiers[idx].price} step="100" onCommit={(val) => updateNestedField(`CREASING_CONFIG.co_can.customer_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 8. Bồi */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Bồi Thành Phẩm</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {localConfig.MOUNTING_CONFIG.yes.cost_tiers.map((tier, idx) => {
                            const rangeStr = tier.max_qty === Infinity ? `> ${localConfig.MOUNTING_CONFIG.yes.cost_tiers[idx-1]?.max_qty || 0} SP` : `≤ ${tier.max_qty} SP`;
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">{rangeStr}</div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput configValue={tier.price} step="100" onCommit={(val) => updateNestedField(`MOUNTING_CONFIG.yes.cost_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput configValue={localConfig.MOUNTING_CONFIG.yes.customer_tiers[idx].price} step="100" onCommit={(val) => updateNestedField(`MOUNTING_CONFIG.yes.customer_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 9. Bế KTS */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Bế Kỹ Thuật Số</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localConfig.DIGITAL_DIE_CUTTING_CONFIG.cost_tiers.map((tier, idx) => {
                            const rangeStr = `≤ ${tier.max_qty} SP`;
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">{rangeStr} — Trọn gói</div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput configValue={tier.price} step="100" onCommit={(val) => updateNestedField(`DIGITAL_DIE_CUTTING_CONFIG.cost_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput configValue={localConfig.DIGITAL_DIE_CUTTING_CONFIG.customer_tiers[idx].price} step="100" onCommit={(val) => updateNestedField(`DIGITAL_DIE_CUTTING_CONFIG.customer_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 10. Bế khuôn - công bế */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Công Bế Khuôn</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {localConfig.DIE_CUTTING_LABOR_CONFIG.cost_tiers.map((tier, idx) => {
                            const rangeStr = tier.max_qty === Infinity ? `> ${localConfig.DIE_CUTTING_LABOR_CONFIG.cost_tiers[idx-1]?.max_qty || 0} SP` : `≤ ${tier.max_qty} SP`;
                            return (
                                <div key={idx} className="space-y-2 p-3 bg-gray-900/50 rounded">
                                    <div className="text-gray-300 text-xs font-medium">{rangeStr} — Trọn gói</div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá vốn</label>
                                        <NumInput configValue={tier.price} step="100" onCommit={(val) => updateNestedField(`DIE_CUTTING_LABOR_CONFIG.cost_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                    <div className="relative">
                                        <label className={labelCls}>Giá KH</label>
                                        <NumInput configValue={localConfig.DIE_CUTTING_LABOR_CONFIG.customer_tiers[idx].price} step="100" onCommit={(val) => updateNestedField(`DIE_CUTTING_LABOR_CONFIG.customer_tiers.${idx}.price`, val)} className={inputClsPr}/>
                                        <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* 11. Dữ liệu biến đổi */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Dữ Liệu Biến Đổi</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>≤ 500 SP (trọn gói)</label>
                            {fi("VARIABLE_DATA_CONFIG.price_500", localConfig.VARIABLE_DATA_CONFIG.price_500)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>≤ 1.000 SP (trọn gói)</label>
                            {fi("VARIABLE_DATA_CONFIG.price_1000", localConfig.VARIABLE_DATA_CONFIG.price_1000)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>{'>'} 1.000 SP (giá cơ bản)</label>
                            {fi("VARIABLE_DATA_CONFIG.price_over_1000_base", localConfig.VARIABLE_DATA_CONFIG.price_over_1000_base)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Mỗi thêm 1.000 SP</label>
                            {fi("VARIABLE_DATA_CONFIG.price_over_1000_progressive", localConfig.VARIABLE_DATA_CONFIG.price_over_1000_progressive)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                    </div>
                </section>

                {/* 12. Ép kim */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Giá Ép Kim (Nhũ)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="relative">
                            <label className={labelCls}>Đơn giá / cm²</label>
                            {fi("EP_KIM_CONFIG.pricePerArea", localConfig.EP_KIM_CONFIG.pricePerArea)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Đơn giá khuôn / cm²</label>
                            {fi("EP_KIM_CONFIG.moldPerArea", localConfig.EP_KIM_CONFIG.moldPerArea)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Giá tối thiểu / lượt (thường)</label>
                            {fi("EP_KIM_CONFIG.minPriceNormal", localConfig.EP_KIM_CONFIG.minPriceNormal)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Giá tối thiểu / lượt (nhũ ĐB)</label>
                            {fi("EP_KIM_CONFIG.minPriceSpecial", localConfig.EP_KIM_CONFIG.minPriceSpecial)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Tổng tối thiểu (khuôn nhỏ)</label>
                            {fi("EP_KIM_CONFIG.minTotalSmall", localConfig.EP_KIM_CONFIG.minTotalSmall)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phí ship (khuôn nhỏ)</label>
                            {fi("EP_KIM_CONFIG.shippingSmall", localConfig.EP_KIM_CONFIG.shippingSmall)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Tổng tối thiểu (khuôn lớn)</label>
                            {fi("EP_KIM_CONFIG.minTotalLarge", localConfig.EP_KIM_CONFIG.minTotalLarge)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Phí ship (khuôn lớn)</label>
                            {fi("EP_KIM_CONFIG.shippingLarge", localConfig.EP_KIM_CONFIG.shippingLarge)}
                            <span className="absolute right-3 top-[32px] text-gray-500">đ</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Ngưỡng W khuôn nhỏ</label>
                            {fi("EP_KIM_CONFIG.thresholdW", localConfig.EP_KIM_CONFIG.thresholdW)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Ngưỡng H khuôn nhỏ</label>
                            {fi("EP_KIM_CONFIG.thresholdH", localConfig.EP_KIM_CONFIG.thresholdH)}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Bù hao chiều cuộn</label>
                            {fi("EP_KIM_CONFIG.foilPadWidth", localConfig.EP_KIM_CONFIG.foilPadWidth, false, "0.1")}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                        <div className="relative">
                            <label className={labelCls}>Bù hao chiều mét tới</label>
                            {fi("EP_KIM_CONFIG.foilPadLength", localConfig.EP_KIM_CONFIG.foilPadLength, false, "0.1")}
                            <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                        </div>
                    </div>
                </section>

                {/* 13. Khổ decal kho */}
                <section>
                    <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">Khổ Decal Có Sẵn Tại Kho</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        {localConfig.DECAL_SHEET_SIZES.map((sheet, idx) => (
                            <React.Fragment key={idx}>
                                <div className="col-span-full font-semibold text-yellow-400 mt-2">Khổ {idx + 1}: {sheet.w} x {sheet.h} cm</div>
                                <div className="relative">
                                    <label className={labelCls}>Rộng (W)</label>
                                    <NumInput configValue={sheet.w} step="0.1" onCommit={(val) => updateNestedField(`DECAL_SHEET_SIZES.${idx}.w`, val)} className={inputClsPr}/>
                                    <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                                </div>
                                <div className="relative">
                                    <label className={labelCls}>Dài (H)</label>
                                    <NumInput configValue={sheet.h} step="0.1" onCommit={(val) => updateNestedField(`DECAL_SHEET_SIZES.${idx}.h`, val)} className={inputClsPr}/>
                                    <span className="absolute right-3 top-[32px] text-gray-500">cm</span>
                                </div>
                            </React.Fragment>
                        ))}
                    </div>
                </section>

            </div>

            <div className="flex justify-end mt-10 pt-6 border-t border-gray-700 space-x-4">
                <button onClick={onCancel} className="px-6 py-2 rounded font-semibold bg-gray-600 hover:bg-gray-500 text-white transition">Hủy</button>
                <button onClick={handleSave} className="px-6 py-2 rounded font-semibold bg-green-600 hover:bg-green-500 text-white transition shadow-lg shadow-green-900/50">Lưu Cài Đặt</button>
            </div>
        </div>
    );
}
