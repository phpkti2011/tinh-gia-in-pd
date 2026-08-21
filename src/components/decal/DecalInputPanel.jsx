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
        <div className="lg:col-span-1" id="decal-controls">
            {/* Mode toggle */}
            <div className="input-group">
                <div className="flex gap-1">
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
            </div>

            {/* Print sheet size */}
            <div className="input-group">
                <h2 className="!text-base !mb-2">
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

            {/* === SINGLE MODE === */}
            {isSingleMode && (
                <>
                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">2.</span> Kích Thước Tem
                        </h2>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label htmlFor="stickerW">Rộng (W)</label>
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
                                <label htmlFor="stickerH">Cao (H)</label>
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
                    </div>

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">3.</span> Số Lượng Tùy Chỉnh
                        </h2>
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

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">4.</span> Loại Decal
                        </h2>
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

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">5.</span> Hình Dạng
                        </h2>
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
                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">2.</span> Kích Thước Tờ Sticker
                        </h2>
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
                            <div className="grid grid-cols-2 gap-3">
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
                    </div>

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">3.</span> Số Sticker / Tờ
                        </h2>
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
                        <p className="text-xs text-gray-500 mt-1">
                            Số sticker trên mỗi tờ (dùng tính phụ phí bế demi)
                        </p>
                    </div>

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">4.</span> Số Lượng Tờ Tùy Chỉnh
                        </h2>
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

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">5.</span> Loại Decal
                        </h2>
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

                    <div className="input-group">
                        <h2 className="!text-base !mb-2">
                            <span className="text-blue-400">6.</span> Cán Màng
                        </h2>
                        <label className="flex items-center cursor-pointer text-sm">
                            <input
                                type="checkbox"
                                name="sheetLamination"
                                checked={params.sheetLamination}
                                onChange={handleChange}
                                className="bg-gray-700 rounded mr-2"
                            />
                            <span>Có cán màng</span>
                        </label>
                    </div>
                </>
            )}
        </div>
    );
}
