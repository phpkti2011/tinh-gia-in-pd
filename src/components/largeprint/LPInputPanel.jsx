// React 18+ auto JSX transform — không cần import React.
export default function LPInputPanel({ config, params, onChange }) {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;
        if (type === 'number') {
            newValue = parseFloat(value);
            if (isNaN(newValue)) newValue = 0;
        }
        onChange(name, newValue);
    };

    const items = params.items || [
        {
            width: params.width || 100,
            height: params.height || 100,
            quantity: params.quantity || 1,
        },
    ];

    const updateItem = (idx, field, value) => {
        const newItems = items.map((it, i) => (i === idx ? { ...it, [field]: value } : it));
        onChange('items', newItems);
    };

    const addItem = () => {
        onChange('items', [...items, { width: 100, height: 100, quantity: 1 }]);
    };

    const removeItem = (idx) => {
        if (items.length <= 1) return;
        onChange(
            'items',
            items.filter((_, i) => i !== idx)
        );
    };

    const colors = [
        'text-cyan-400',
        'text-green-400',
        'text-pink-400',
        'text-orange-400',
        'text-purple-400',
        'text-red-400',
        'text-indigo-400',
        'text-teal-400',
    ];

    return (
        <div id="controls" className="h-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full">
                {/* Cột trái */}
                <div className="flex flex-col gap-4">
                    <div className="input-group !mb-0 flex-1">
                        <div className="flex items-center justify-between mb-2">
                            <h2 className="!text-base !mb-0">
                                <span className="text-blue-400">1.</span> Danh Sách Tấm In
                            </h2>
                            <button
                                onClick={addItem}
                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition"
                            >
                                + Thêm tấm
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
                            {items.map((item, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 bg-gray-900/50 rounded p-2"
                                >
                                    <span
                                        className={`text-xs font-bold ${colors[idx % colors.length]} w-4 shrink-0`}
                                    >
                                        {idx + 1}
                                    </span>
                                    <div className="flex-1 grid grid-cols-3 gap-1">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={item.width}
                                                step="1"
                                                min="1"
                                                onChange={(e) =>
                                                    updateItem(
                                                        idx,
                                                        'width',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="!py-1 !px-2 !text-sm"
                                                placeholder="W"
                                            />
                                            <span className="unit !text-xs">cm</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={item.height}
                                                step="1"
                                                min="1"
                                                onChange={(e) =>
                                                    updateItem(
                                                        idx,
                                                        'height',
                                                        parseFloat(e.target.value) || 0
                                                    )
                                                }
                                                className="!py-1 !px-2 !text-sm"
                                                placeholder="H"
                                            />
                                            <span className="unit !text-xs">cm</span>
                                        </div>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={item.quantity}
                                                step="1"
                                                min="1"
                                                onChange={(e) =>
                                                    updateItem(
                                                        idx,
                                                        'quantity',
                                                        parseInt(e.target.value, 10) || 1
                                                    )
                                                }
                                                className="!py-1 !px-2 !text-sm"
                                                placeholder="SL"
                                            />
                                            <span className="unit !text-xs">tấm</span>
                                        </div>
                                    </div>
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(idx)}
                                            className="text-red-500 hover:text-red-400 text-xs shrink-0"
                                            title="Xóa"
                                        >
                                            ✕
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                            Tổng: {items.reduce((s, it) => s + (it.quantity || 1), 0)} tấm
                            {items.length > 1 && ` (${items.length} loại)`}
                            {' · '}Hệ thống tự xoay từng tấm để tối ưu
                        </div>
                    </div>

                    <div className="input-group !mb-0 flex-1">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">2.</span> Vật Liệu
                        </h2>
                        <select
                            id="materialTypeKey"
                            name="materialTypeKey"
                            value={params.materialTypeKey}
                            onChange={handleChange}
                        >
                            {Object.entries(config.MATERIAL_TYPES).map(([key, mat]) => (
                                <option key={key} value={key}>
                                    {mat.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="input-group !mb-0 flex-1">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">3.</span> Cán Màng
                        </h2>
                        <select
                            id="laminationTypeKey"
                            name="laminationTypeKey"
                            value={params.laminationTypeKey}
                            onChange={handleChange}
                        >
                            <option value="none">Không cán màng</option>
                            {Object.entries(config.LAMINATION_TYPES).map(([key, lam]) => (
                                <option key={key} value={key}>
                                    {lam.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Cột phải */}
                <div className="flex flex-col gap-4">
                    <div className="input-group !mb-0 flex-1">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">4.</span> Bồi Formex
                        </h2>
                        <select
                            id="formexTypeKey"
                            name="formexTypeKey"
                            value={params.formexTypeKey}
                            onChange={handleChange}
                        >
                            {Object.entries(config.FORMEX_OPTIONS).map(([key, opt]) => (
                                <option key={key} value={key}>
                                    {opt.name}
                                </option>
                            ))}
                        </select>
                        <p className="text-xs text-yellow-400 mt-1">
                            Giảm: 5-10m² (10%), 10-20m² (15%), {'>'}20m² (20%)
                        </p>
                    </div>

                    <div className="input-group !mb-0 flex-1">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">5.</span> Thành Phẩm
                        </h2>
                        <div className="space-y-2">
                            <label className="flex items-center cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    name="edgeTaping"
                                    checked={params.edgeTaping}
                                    onChange={handleChange}
                                    className="bg-gray-700 rounded mr-2"
                                />
                                <span>Dán biên</span>
                            </label>
                            <label className="flex items-center cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    name="grommetsCheck"
                                    checked={params.grommetsCheck}
                                    onChange={handleChange}
                                    className="bg-gray-700 rounded mr-2"
                                />
                                <span>Đóng khoen</span>
                            </label>
                            {params.grommetsCheck && (
                                <div className="ml-6">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="grommetsCount"
                                            name="grommetsCount"
                                            value={params.grommetsCount}
                                            onChange={handleChange}
                                            step="1"
                                            min="0"
                                        />
                                        <span className="unit">khoen</span>
                                    </div>
                                </div>
                            )}
                            <label className="flex items-center cursor-pointer text-sm">
                                <input
                                    type="checkbox"
                                    name="dieCutting"
                                    checked={params.dieCutting}
                                    onChange={handleChange}
                                    className="bg-gray-700 rounded mr-2"
                                />
                                <span>Bế demi</span>
                            </label>
                        </div>
                    </div>

                    <div className="input-group !mb-0 flex-1">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">6.</span> Standee
                        </h2>
                        <select
                            id="standeeKey"
                            name="standeeKey"
                            value={params.standeeKey}
                            onChange={handleChange}
                        >
                            <option value="none">Không có Standee</option>
                            {(config.STANDEE_OPTIONS || []).map((opt) => (
                                <option key={opt.key} value={opt.key}>
                                    {opt.name} — {opt.price.toLocaleString('vi-VN')}đ
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
}
