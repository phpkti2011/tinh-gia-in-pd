// React 18+ auto JSX transform — không cần import React.
import { useEffect } from 'react';
import NumberField from '../common/NumberField';

export default function InputPanel({ config, params, onChange, isAutoCalculating }) {
    // Handler cho select + checkbox. Number field dùng NumberField shared để fix
    // leading-zero bug (xem src/components/common/NumberField.jsx).
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        const newValue = type === 'checkbox' ? checked : value;
        onChange(name, newValue);
    };

    // Ép kim — danh sách khuôn (mỗi khuôn: w, h, special, impressions). Cập nhật mảng
    // rồi đẩy lên qua onChange('foilMolds', ...) — parent setParams merge như field khác.
    const foilMolds = params.foilMolds || [];
    const updateMold = (index, key, value) => {
        onChange(
            'foilMolds',
            foilMolds.map((m, i) => (i === index ? { ...m, [key]: value } : m))
        );
    };
    const addMold = () => {
        onChange('foilMolds', [
            ...foilMolds,
            {
                w: parseFloat(params.productW) || 0,
                h: parseFloat(params.productH) || 0,
                special: false,
                impressions: 1,
            },
        ]);
    };
    const removeMold = (index) => {
        onChange(
            'foilMolds',
            foilMolds.filter((_, i) => i !== index)
        );
    };

    const paperData = config.PAPER_STOCK_DATA || [];
    const selectedPaper = paperData[params.paperType];
    const model = selectedPaper ? selectedPaper.pricingModel : '';
    const isArtPaper = model === 'custom';
    const isPerSheet = model === 'per_sheet';
    const isSqm = model === 'sqm';

    const sheetOptions = isArtPaper
        ? config.ART_PAPER_LARGE_SHEET_SIZES || []
        : config.STANDARD_LARGE_SHEET_SIZES || [];
    const showLargeSheetGroup = !isSqm && !isPerSheet;
    const showCustomSheetGroup =
        showLargeSheetGroup &&
        sheetOptions[params.largeSheetSelector] &&
        sheetOptions[params.largeSheetSelector].w === 'custom';

    const isSidesDisabled = isSqm || isPerSheet || params.mountingType === 'yes';

    // BUG fix: khi chuyển sang decal/per_sheet/bồi, select "Số mặt in" bị disable
    // với display value=1, nhưng state `params.printSides` giữ nguyên giá trị cũ
    // (vd '2') → engine đọc 2 mặt sai. Auto reset về '1' cho khớp với display.
    useEffect(() => {
        if (isSidesDisabled && String(params.printSides) !== '1') {
            onChange('printSides', '1');
        }
    }, [isSidesDisabled, params.printSides, onChange]);

    return (
        <div className="lg:col-span-1" id="controls">
            <div className="input-group">
                <h2>
                    <span className="text-blue-400">1.</span> Thông Số Sản Phẩm
                </h2>
                <div className="mb-4">
                    <label htmlFor="paperType">Loại giấy / Decal</label>
                    <select
                        id="paperType"
                        name="paperType"
                        value={params.paperType}
                        onChange={handleChange}
                    >
                        {paperData.map((paper, index) => (
                            <option key={index} value={index}>
                                {paper.name}
                            </option>
                        ))}
                    </select>
                </div>
                {isArtPaper && (
                    <div id="artPaperPriceGroup" className="mb-4">
                        <label htmlFor="artPaperPrice">Giá 1 tờ giấy mỹ thuật</label>
                        <div className="relative">
                            <NumberField
                                id="artPaperPrice"
                                value={params.artPaperPrice}
                                onCommit={(v) => onChange('artPaperPrice', v)}
                                step={100}
                            />
                            <span className="unit">VNĐ</span>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="productW">Rộng (W)</label>
                        <div className="relative">
                            <NumberField
                                id="productW"
                                value={params.productW}
                                onCommit={(v) => onChange('productW', v)}
                                step={0.1}
                            />
                            <span className="unit">cm</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="productH">Cao (H)</label>
                        <div className="relative">
                            <NumberField
                                id="productH"
                                value={params.productH}
                                onCommit={(v) => onChange('productH', v)}
                                step={0.1}
                            />
                            <span className="unit">cm</span>
                        </div>
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="bleed">Bù xén (tràn lề) mỗi cạnh</label>
                    <div className="relative">
                        <NumberField
                            id="bleed"
                            value={params.bleed}
                            onCommit={(v) => onChange('bleed', v)}
                            step={0.05}
                        />
                        <span className="unit">cm</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="productQuantity">Số lượng cần in</label>
                        <div className="relative">
                            <NumberField
                                id="productQuantity"
                                value={params.productQuantity}
                                onCommit={(v) => onChange('productQuantity', v)}
                                step={100}
                            />
                            <span className="unit">SP</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="printSides">Số mặt in</label>
                        <select
                            id="printSides"
                            name="printSides"
                            value={isSidesDisabled ? 1 : params.printSides}
                            disabled={isSidesDisabled}
                            onChange={handleChange}
                        >
                            <option value="1">1 mặt</option>
                            <option value="2">2 mặt</option>
                        </select>
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="printContents">Số nội dung in</label>
                    <div className="relative">
                        <NumberField
                            id="printContents"
                            value={params.printContents}
                            onCommit={(v) => onChange('printContents', v)}
                            step={1}
                        />
                        <span className="unit">Nội dung</span>
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="variableData">Dữ liệu biến đổi</label>
                    <select
                        id="variableData"
                        name="variableData"
                        value={params.variableData}
                        onChange={handleChange}
                    >
                        <option value="no">Không</option>
                        <option value="yes">Có</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="printColorMode">Chế độ màu</label>
                    <select
                        id="printColorMode"
                        name="printColorMode"
                        value={params.printColorMode}
                        onChange={handleChange}
                    >
                        <option value="4color">In 4 màu (CMYK)</option>
                        <option value="1color">In 1 màu (Đen)</option>
                    </select>
                    {params.printColorMode === '1color' && (
                        <p className="mt-1 text-xs text-yellow-400">
                            ⚠ In 1 màu đen chỉ in chữ &amp; đối tượng đen — KHÔNG in nền đen kín (full
                            đen).
                        </p>
                    )}
                </div>
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-blue-400">2.</span> Thông Số Giấy In
                </h2>
                {showLargeSheetGroup && (
                    <div id="largeSheetGroup" className="mb-4">
                        <label htmlFor="largeSheetSelector">Khổ giấy lớn</label>
                        <select
                            id="largeSheetSelector"
                            name="largeSheetSelector"
                            value={params.largeSheetSelector}
                            onChange={handleChange}
                        >
                            {sheetOptions &&
                                sheetOptions.map((sheet, index) => (
                                    <option key={index} value={index}>
                                        {sheet.name}
                                    </option>
                                ))}
                        </select>
                    </div>
                )}
                {showCustomSheetGroup && (
                    <div id="customSheetSizeGroup" className="mt-4 grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="customSheetW">Rộng (W)</label>
                            <div className="relative">
                                <NumberField
                                    id="customSheetW"
                                    value={params.customSheetW}
                                    onCommit={(v) => onChange('customSheetW', v)}
                                    step={1}
                                />
                                <span className="unit">cm</span>
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
                                <span className="unit">cm</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-blue-400">3.</span> Thành Phẩm
                </h2>
                <div className="mb-4">
                    <label htmlFor="mountingType">Bồi thành phẩm</label>
                    <select
                        id="mountingType"
                        name="mountingType"
                        value={params.mountingType}
                        onChange={handleChange}
                    >
                        <option value="none">Không bồi</option>
                        <option value="yes">Có bồi</option>
                    </select>
                </div>
                <div className="mb-4">
                    <label htmlFor="laminationType">Cán màng</label>
                    <select
                        id="laminationType"
                        name="laminationType"
                        value={params.laminationType}
                        onChange={handleChange}
                    >
                        <option value="none">Không cán màng</option>
                        <option value="laminate_1">Cán màng 1 mặt</option>
                        <option value="laminate_2">Cán màng 2 mặt</option>
                    </select>
                </div>
                <div className="mb-4">
                    <label htmlFor="creasingType">Cấn</label>
                    <select
                        id="creasingType"
                        name="creasingType"
                        value={params.creasingType}
                        onChange={handleChange}
                    >
                        <option value="none">Không cấn</option>
                        <option value="co_can">Có cấn (1 lượt/SP)</option>
                    </select>
                    {params.creasingType === 'co_can' && (
                        <p className="mt-2 text-xs text-yellow-400">
                            Lưu ý: Chỉ tính cho các đường cấn song song. Các đường cấn vuông góc
                            phải tính thành chi phí bế.
                        </p>
                    )}
                </div>
                <div className="mb-4">
                    <label htmlFor="holePunchingType">Đục lỗ</label>
                    <select
                        id="holePunchingType"
                        name="holePunchingType"
                        value={params.holePunchingType}
                        onChange={handleChange}
                    >
                        <option value="none">Không đục lỗ</option>
                        <option value="1_vi_tri">1-2 lỗ (1 vị trí)</option>
                        <option value="2_vi_tri">1-2 lỗ (2 vị trí)</option>
                    </select>
                </div>
                <div className="mb-4">
                    <label htmlFor="foilStamping">Ép kim (nhũ)</label>
                    <select
                        id="foilStamping"
                        name="foilStamping"
                        value={params.foilStamping}
                        onChange={handleChange}
                    >
                        <option value="none">Không ép kim</option>
                        <option value="yes">Có ép kim</option>
                    </select>
                </div>
                {params.foilStamping === 'yes' && (
                    <div className="ml-4 mb-4 space-y-3 border-l-2 border-yellow-500/50 pl-4">
                        <p className="text-xs text-gray-400">
                            <span className="text-gray-300 font-semibold">Số lần ép</span> = số lần
                            thay đổi vị trí ép (mỗi lần đặt máy dập 1 vị trí). VD: cùng khuôn ép 2 vị
                            trí khác nhau = 2 lần; ép 2 mặt = 2 lần; ép 2 mặt × 2 vị trí/mặt = 4 lần.
                            Mỗi lần ép thêm trên cùng khuôn tính 50% công. Khuôn / màu nhũ khác nhau
                            → thêm khuôn mới.
                        </p>
                        {foilMolds.map((mold, index) => (
                            <div
                                key={index}
                                className="rounded-md border border-gray-600 bg-gray-900/40 p-3 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-semibold text-yellow-300">
                                        Khuôn {index + 1}
                                    </span>
                                    {foilMolds.length > 1 && (
                                        <button
                                            type="button"
                                            onClick={() => removeMold(index)}
                                            className="text-xs text-red-400 hover:text-red-300"
                                        >
                                            ✕ Xóa
                                        </button>
                                    )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label>Rộng ép kim (W)</label>
                                        <div className="relative">
                                            <NumberField
                                                value={mold.w}
                                                onCommit={(v) => updateMold(index, 'w', v)}
                                                step={0.1}
                                            />
                                            <span className="unit">cm</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label>Cao ép kim (H)</label>
                                        <div className="relative">
                                            <NumberField
                                                value={mold.h}
                                                onCommit={(v) => updateMold(index, 'h', v)}
                                                step={0.1}
                                            />
                                            <span className="unit">cm</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4 items-end">
                                    <div>
                                        <label>Số lần ép</label>
                                        <div className="relative">
                                            <NumberField
                                                value={mold.impressions}
                                                onCommit={(v) =>
                                                    updateMold(index, 'impressions', v)
                                                }
                                                step={1}
                                                min={1}
                                            />
                                            <span className="unit">lần</span>
                                        </div>
                                    </div>
                                    <label className="flex items-center cursor-pointer pb-2">
                                        <input
                                            type="checkbox"
                                            checked={!!mold.special}
                                            onChange={(e) =>
                                                updateMold(index, 'special', e.target.checked)
                                            }
                                            className="bg-gray-700 rounded mr-2"
                                        />
                                        <span>Nhũ màu đặc biệt</span>
                                    </label>
                                </div>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addMold}
                            className="w-full rounded-md border border-dashed border-yellow-500/60 py-2 text-sm font-semibold text-yellow-300 hover:bg-yellow-500/10"
                        >
                            ＋ Thêm khuôn
                        </button>
                    </div>
                )}
                <div className="border-t border-gray-600 pt-4">
                    <label htmlFor="dieCuttingType" className="text-lg font-semibold text-cyan-400">
                        Bế Thành Phẩm
                    </label>
                    <select
                        id="dieCuttingType"
                        name="dieCuttingType"
                        value={params.dieCuttingType}
                        onChange={handleChange}
                        className="mt-2"
                    >
                        <option value="none">Không bế (Chỉ xén)</option>
                        <option value="digital">Bế Kỹ Thuật Số (Không khuôn)</option>
                        <option value="mold">Bế Khuôn (Có khuôn)</option>
                    </select>
                    {params.dieCuttingType === 'mold' && (
                        <div id="moldOptions" className="mt-4 space-y-4">
                            <label htmlFor="moldType">Loại khuôn</label>
                            <select
                                id="moldType"
                                name="moldType"
                                value={params.moldType}
                                onChange={handleChange}
                            >
                                <option value="simple">Hình dạng đơn giản</option>
                                <option value="envelope">Bao thư</option>
                                <option value="box">Hộp</option>
                                <option value="bag">Túi giấy</option>
                                <option value="tag">Tag treo</option>
                            </select>
                            {params.moldType === 'tag' && (
                                <div id="tagHoleOption">
                                    <label className="flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            name="tagHasHole"
                                            checked={params.tagHasHole}
                                            onChange={handleChange}
                                            className="bg-gray-700 rounded mr-2"
                                        />
                                        <span>Tag có đục lỗ (tính vào khuôn)</span>
                                    </label>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 text-center">
                <p
                    className={`font-semibold ${isAutoCalculating ? 'text-green-400' : 'text-blue-400 animate-pulse'}`}
                >
                    ⚡ Hệ thống đang tự động tính toán
                </p>
                <p className="text-xs text-gray-400 mt-1">
                    Kết quả cập nhật ngay khi bạn nhập liệu
                </p>
            </div>
        </div>
    );
}
