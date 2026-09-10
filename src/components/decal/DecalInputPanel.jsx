// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

export default function DecalInputPanel({ config, params, onChange }) {
    // Handler cho select + checkbox. Number field dùng NumberField shared.
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        onChange(name, newValue);
    };

    const isSingleMode = params.mode === 'single';

    const isPrintSheetCustom = !config.printSheetSizes.some(
        (s) => s.w === params.printSheetW && s.h === params.printSheetH
    );

    const printSheetKey = isPrintSheetCustom
        ? 'custom'
        : config.printSheetSizes.findIndex(
              (s) => s.w === params.printSheetW && s.h === params.printSheetH
          );

    const handlePrintSheetChange = (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            onChange('printSheetW', params.printSheetW || 330);
            onChange('printSheetH', params.printSheetH || 330);
        } else {
            const size = config.printSheetSizes[parseInt(val, 10)];
            if (size) {
                onChange('printSheetW', size.w);
                onChange('printSheetH', size.h);
            }
        }
    };

    const isSheetSizeCustom = params.sheetSizeKey === 'custom';

    const handleSheetSizeChange = (e) => {
        const val = e.target.value;
        onChange('sheetSizeKey', val);
        if (val !== 'custom') {
            const idx = parseInt(val, 10);
            const size = config.stickerSheetSizes[idx];
            if (size) {
                onChange('customSheetW', size.w);
                onChange('customSheetH', size.h);
            }
        }
    };

    const decalTypes = Object.keys(config.decalCosts);

    return (
        <div id="decal-controls">
            {/* Mode toggle — gọn, không bọc .input-group để đỡ 1 lớp đệm */}
            <div className="flex gap-1 mb-4">
                <button
                    type="button"
                    onClick={() => onChange('mode', 'single')}
                    className={`flex-1 py-2 px-3 text-sm font-semibold rounded-l-lg transition ${
                        isSingleMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                >
                    Tính Giá Tem Lẻ
                </button>
                <button
                    type="button"
                    onClick={() => onChange('mode', 'sheet')}
                    className={`flex-1 py-2 px-3 text-sm font-semibold rounded-r-lg transition ${
                        !isSingleMode
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                >
                    Tính Giá Tờ Sticker
                </button>
            </div>

            {/* Print sheet size */}
            <div className="input-group">
                <h2>
                    <span className="text-blue-400">1.</span> Khổ In
                </h2>
                <div className="mb-3">
                    <label htmlFor="printSheetSelector">Khổ giấy in</label>
                    <select
                        id="printSheetSelector"
                        value={printSheetKey}
                        onChange={handlePrintSheetChange}
                    >
                        {config.printSheetSizes.map((s, idx) => (
                            <option key={idx} value={idx}>
                                {s.label}
                            </option>
                        ))}
                        <option value="custom">Tùy chọn</option>
                    </select>
                </div>
                {isPrintSheetCustom && (
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="printSheetW">Rộng (W)</label>
                            <div className="relative">
                                <NumberField
                                    id="printSheetW"
                                    value={params.printSheetW}
                                    onCommit={(v) => onChange('printSheetW', v)}
                                    step={1}
                                />
                                <span className="unit">mm</span>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="printSheetH">Cao (H)</label>
                            <div className="relative">
                                <NumberField
                                    id="printSheetH"
                                    value={params.printSheetH}
                                    onCommit={(v) => onChange('printSheetH', v)}
                                    step={1}
                                />
                                <span className="unit">mm</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Thông Số Sản Phẩm — gộp kích thước/số lượng/loại/hình dạng (hoặc tương đương ở chế độ tờ) */}
            <div className="input-group">
                <h2>
                    <span className="text-blue-400">2.</span> Thông Số Sản Phẩm
                </h2>

                {/* === SINGLE MODE === */}
                {isSingleMode && (
                    <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label htmlFor="stickerW">Rộng tem (W)</label>
                                <div className="relative">
                                    <NumberField
                                        id="stickerW"
                                        value={params.stickerW}
                                        onCommit={(v) => onChange('stickerW', v)}
                                        step={1}
                                    />
                                    <span className="unit">mm</span>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="stickerH">Cao tem (H)</label>
                                <div className="relative">
                                    <NumberField
                                        id="stickerH"
                                        value={params.stickerH}
                                        onCommit={(v) => onChange('stickerH', v)}
                                        step={1}
                                    />
                                    <span className="unit">mm</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label htmlFor="customQuantity">SL tùy chỉnh</label>
                                <div className="relative">
                                    <NumberField
                                        id="customQuantity"
                                        value={params.customQuantity}
                                        onCommit={(v) => onChange('customQuantity', v)}
                                        step={1}
                                        min={1}
                                    />
                                    <span className="unit">tem</span>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="decalType">Loại Decal</label>
                                <select
                                    id="decalType"
                                    name="decalType"
                                    value={params.decalType}
                                    onChange={handleChange}
                                >
                                    {decalTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label>Hình Dạng</label>
                            <div className="flex gap-1">
                                {[
                                    { value: 'rectangle', label: 'Chữ Nhật' },
                                    { value: 'circle', label: 'Tròn' },
                                    { value: 'oval', label: 'Oval' },
                                ].map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => onChange('shape', opt.value)}
                                        className={`flex-1 py-1.5 px-2 text-xs font-medium rounded transition ${
                                            params.shape === opt.value
                                                ? 'bg-blue-600 text-white'
                                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                        }`}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* === SHEET MODE === */}
                {!isSingleMode && (
                    <>
                        <div className="mb-3">
                            <label htmlFor="sheetSizeKey">Khổ tờ sticker</label>
                            <select
                                id="sheetSizeKey"
                                name="sheetSizeKey"
                                value={params.sheetSizeKey}
                                onChange={handleSheetSizeChange}
                            >
                                {config.stickerSheetSizes.map((s, idx) => (
                                    <option key={idx} value={idx}>
                                        {s.label}
                                    </option>
                                ))}
                                <option value="custom">Tùy chọn</option>
                            </select>
                        </div>
                        {isSheetSizeCustom && (
                            <div className="grid grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label htmlFor="customSheetW">Rộng (W)</label>
                                    <div className="relative">
                                        <NumberField
                                            id="customSheetW"
                                            value={params.customSheetW}
                                            onCommit={(v) => onChange('customSheetW', v)}
                                            step={1}
                                        />
                                        <span className="unit">mm</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="customSheetH">Cao (H)</label>
                                    <div className="relative">
                                        <NumberField
                                            id="customSheetH"
                                            value={params.customSheetH}
                                            onCommit={(v) => onChange('customSheetH', v)}
                                            step={1}
                                        />
                                        <span className="unit">mm</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3 mb-1">
                            <div>
                                <label htmlFor="sheetStickerCount">Số Sticker/Tờ</label>
                                <div className="relative">
                                    <NumberField
                                        id="sheetStickerCount"
                                        value={params.sheetStickerCount}
                                        onCommit={(v) => onChange('sheetStickerCount', v)}
                                        step={1}
                                        min={1}
                                    />
                                    <span className="unit">sticker</span>
                                </div>
                            </div>
                            <div>
                                <label htmlFor="sheetCustomQuantity">SL Tờ Tùy Chỉnh</label>
                                <div className="relative">
                                    <NumberField
                                        id="sheetCustomQuantity"
                                        value={params.sheetCustomQuantity}
                                        onCommit={(v) => onChange('sheetCustomQuantity', v)}
                                        step={1}
                                        min={1}
                                    />
                                    <span className="unit">tờ</span>
                                </div>
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mb-3">
                            Số sticker trên mỗi tờ (dùng tính phụ phí bế demi)
                        </p>

                        <div className="grid grid-cols-2 gap-3 items-end">
                            <div>
                                <label htmlFor="sheetDecalType">Loại Decal</label>
                                <select
                                    id="sheetDecalType"
                                    name="sheetDecalType"
                                    value={params.sheetDecalType}
                                    onChange={handleChange}
                                >
                                    {decalTypes.map((type) => (
                                        <option key={type} value={type}>
                                            {type}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="sheetLamination">Cán Màng</label>
                                <label className="flex items-center cursor-pointer text-sm h-[42px]">
                                    <input
                                        id="sheetLamination"
                                        type="checkbox"
                                        name="sheetLamination"
                                        checked={params.sheetLamination}
                                        onChange={handleChange}
                                        className="bg-gray-700 rounded mr-2"
                                    />
                                    <span>Có cán màng</span>
                                </label>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Chiết khấu (áp cho cả bảng giá) */}
            <div className="input-group">
                <h2>
                    <span className="text-blue-400">3.</span> Chiết Khấu
                </h2>
                <div className="flex flex-wrap gap-1 mb-2">
                    {[0, 5, 10, 15, 20, 25].map((v) => {
                        const active = (parseFloat(params.discountPercent) || 0) === v;
                        return (
                            <button
                                key={v}
                                type="button"
                                onClick={() => onChange('discountPercent', v)}
                                className={`flex-1 min-w-[44px] py-1.5 px-2 text-sm font-medium rounded transition ${
                                    active
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                                }`}
                            >
                                {v === 0 ? 'Không' : `${v}%`}
                            </button>
                        );
                    })}
                </div>
                <div>
                    <label htmlFor="discountPercent">Tùy nhập (%)</label>
                    <div className="relative">
                        <NumberField
                            id="discountPercent"
                            value={params.discountPercent}
                            onCommit={(v) => onChange('discountPercent', v)}
                            step={1}
                            min={0}
                            max={100}
                        />
                        <span className="unit">%</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
