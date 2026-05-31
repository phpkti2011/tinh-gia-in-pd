// React 18+ auto JSX transform — không cần import React.
export default function InputPanel({ config, params, onChange, isAutoCalculating }) {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        let newValue = type === 'checkbox' ? checked : value;
        if (type === 'number') {
            newValue = parseFloat(value);
            if (isNaN(newValue)) newValue = 0;
        }
        onChange(name, newValue);
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
                            <input
                                type="number"
                                id="artPaperPrice"
                                name="artPaperPrice"
                                value={params.artPaperPrice}
                                onChange={handleChange}
                                step="100"
                            />
                            <span className="unit">VNĐ</span>
                        </div>
                    </div>
                )}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="productW">Rộng (W)</label>
                        <div className="relative">
                            <input
                                type="number"
                                id="productW"
                                name="productW"
                                value={params.productW}
                                onChange={handleChange}
                                step="0.1"
                            />
                            <span className="unit">cm</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="productH">Cao (H)</label>
                        <div className="relative">
                            <input
                                type="number"
                                id="productH"
                                name="productH"
                                value={params.productH}
                                onChange={handleChange}
                                step="0.1"
                            />
                            <span className="unit">cm</span>
                        </div>
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="bleed">Bù xén (tràn lề) mỗi cạnh</label>
                    <div className="relative">
                        <input
                            type="number"
                            id="bleed"
                            name="bleed"
                            value={params.bleed}
                            onChange={handleChange}
                            step="0.05"
                        />
                        <span className="unit">cm</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="productQuantity">Số lượng cần in</label>
                        <div className="relative">
                            <input
                                type="number"
                                id="productQuantity"
                                name="productQuantity"
                                value={params.productQuantity}
                                onChange={handleChange}
                                step="100"
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
                        <input
                            type="number"
                            id="printContents"
                            name="printContents"
                            value={params.printContents}
                            onChange={handleChange}
                            step="1"
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
                                <input
                                    type="number"
                                    id="customSheetW"
                                    name="customSheetW"
                                    value={params.customSheetW}
                                    onChange={handleChange}
                                    step="1"
                                />
                                <span className="unit">cm</span>
                            </div>
                        </div>
                        <div>
                            <label htmlFor="customSheetH">Cao (H)</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    id="customSheetH"
                                    name="customSheetH"
                                    value={params.customSheetH}
                                    onChange={handleChange}
                                    step="1"
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
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="foilSpecialColor"
                                checked={params.foilSpecialColor}
                                onChange={handleChange}
                                className="bg-gray-700 rounded mr-2"
                            />
                            <span>Nhũ màu đặc biệt</span>
                        </label>
                        <label className="flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="foilCustomSize"
                                checked={params.foilCustomSize}
                                onChange={handleChange}
                                className="bg-gray-700 rounded mr-2"
                            />
                            <span>Kích thước ép kim khác sản phẩm</span>
                        </label>
                        {params.foilCustomSize && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label htmlFor="foilW">Rộng ép kim (W)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="foilW"
                                            name="foilW"
                                            value={params.foilW}
                                            onChange={handleChange}
                                            step="0.1"
                                        />
                                        <span className="unit">cm</span>
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="foilH">Cao ép kim (H)</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            id="foilH"
                                            name="foilH"
                                            value={params.foilH}
                                            onChange={handleChange}
                                            step="0.1"
                                        />
                                        <span className="unit">cm</span>
                                    </div>
                                </div>
                            </div>
                        )}
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
