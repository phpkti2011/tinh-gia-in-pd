// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

const SIZE_PRESETS = [
    { label: 'A4', w: 210, h: 297 },
    { label: 'A5', w: 148, h: 210 },
    { label: 'A6', w: 105, h: 148 },
];

export default function CatalogueInputPanel({ config, params, onChange }) {
    const handleSelect = (e) => onChange(e.target.name, e.target.value);
    const applyPreset = (p) => {
        onChange('finishedW', p.w);
        onChange('finishedH', p.h);
    };

    const paperData = config.PAPER_STOCK_DATA || [];
    const coverPaper = paperData[parseInt(params.coverPaperType, 10)];
    const innerPaper = paperData[parseInt(params.innerPaperType, 10)];
    const isArtPaper =
        (coverPaper && coverPaper.pricingModel === 'custom') ||
        (innerPaper && innerPaper.pricingModel === 'custom');

    const pageRem = params.coverSingleSide ? 2 : 0;
    const pagesInvalid =
        params.numPages === '' ||
        isNaN(parseInt(params.numPages, 10)) ||
        params.numPages % 4 !== pageRem;

    return (
        <div id="catalogue-controls">
            <div className="input-group">
                <h2>
                    <span className="text-red-400">1.</span> Thông Số Catalogue
                </h2>

                <div className="mb-4">
                    <label htmlFor="numPages">
                        Số trang {params.coverSingleSide ? '(chia 4 dư 2)' : '(chia hết cho 4)'}
                    </label>
                    <div className="relative">
                        <NumberField
                            id="numPages"
                            value={params.numPages}
                            onCommit={(v) => onChange('numPages', v)}
                            step={params.coverSingleSide ? 2 : 4}
                            min={2}
                        />
                        <span className="unit">trang</span>
                    </div>
                    {pagesInvalid && (
                        <p className="mt-1 text-xs text-red-400">
                            {params.coverSingleSide
                                ? 'Số trang phải chia hết cho 4 dư 2 (in bìa 1 mặt).'
                                : 'Số trang phải chia hết cho 4.'}
                        </p>
                    )}
                    <label className="mt-2 flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            name="coverSingleSide"
                            checked={!!params.coverSingleSide}
                            onChange={(e) => onChange('coverSingleSide', e.target.checked)}
                            className="bg-gray-700 rounded mr-2"
                        />
                        <span className="text-sm">In bìa 1 mặt (bìa chỉ in mặt ngoài)</span>
                    </label>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="finishedW">Rộng thành phẩm</label>
                        <div className="relative">
                            <NumberField
                                id="finishedW"
                                value={params.finishedW}
                                onCommit={(v) => onChange('finishedW', v)}
                                step={1}
                                min={1}
                            />
                            <span className="unit">mm</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="finishedH">Cao thành phẩm</label>
                        <div className="relative">
                            <NumberField
                                id="finishedH"
                                value={params.finishedH}
                                onCommit={(v) => onChange('finishedH', v)}
                                step={1}
                                min={1}
                            />
                            <span className="unit">mm</span>
                        </div>
                    </div>
                </div>

                <div className="mb-2 flex items-center gap-2">
                    <span className="text-xs text-gray-500">Khổ nhanh:</span>
                    {SIZE_PRESETS.map((p) => {
                        const active =
                            Number(params.finishedW) === p.w && Number(params.finishedH) === p.h;
                        return (
                            <button
                                key={p.label}
                                type="button"
                                onClick={() => applyPreset(p)}
                                className={`px-3 py-1 rounded text-sm font-medium border transition ${
                                    active
                                        ? 'bg-red-500/20 border-red-500 text-red-300'
                                        : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'
                                }`}
                            >
                                {p.label}
                            </button>
                        );
                    })}
                </div>
                <p className="mb-4 text-xs text-yellow-400/90">
                    Lưu ý: khổ thành phẩm thực tế thường nhỏ hơn kích thước danh nghĩa ~1–2mm mỗi
                    chiều (vd A4 không chính xác 210×297; A5, A6 tương tự) — nên nhập đúng kích thước
                    thành phẩm cần in.
                </p>

                <div className="mb-4">
                    <label htmlFor="orientation">Hướng thành phẩm</label>
                    <select
                        id="orientation"
                        name="orientation"
                        value={params.orientation}
                        onChange={handleSelect}
                    >
                        <option value="portrait">Đứng (dọc)</option>
                        <option value="landscape">Ngang</option>
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="quantity">Số lượng</label>
                    <div className="relative">
                        <NumberField
                            id="quantity"
                            value={params.quantity}
                            onCommit={(v) => onChange('quantity', v)}
                            step={1}
                            min={1}
                        />
                        <span className="unit">cuốn</span>
                    </div>
                </div>
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-red-400">2.</span> Giấy In (dùng chung giá In KTS)
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="coverPaperType">Giấy bìa (4 trang)</label>
                        <select
                            id="coverPaperType"
                            name="coverPaperType"
                            value={params.coverPaperType}
                            onChange={handleSelect}
                        >
                            {paperData.map((paper, index) => (
                                <option key={index} value={index}>
                                    {paper.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="innerPaperType">Giấy ruột</label>
                        <select
                            id="innerPaperType"
                            name="innerPaperType"
                            value={params.innerPaperType}
                            onChange={handleSelect}
                        >
                            {paperData.map((paper, index) => (
                                <option key={index} value={index}>
                                    {paper.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                {isArtPaper && (
                    <div className="mb-4">
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
                <div className="mb-4">
                    <label htmlFor="laminationMode">Cán màng</label>
                    <select
                        id="laminationMode"
                        name="laminationMode"
                        value={params.laminationMode}
                        onChange={handleSelect}
                    >
                        <option value="none">Không cán màng</option>
                        <option value="cover1">Bìa cán 1 mặt (ruột không cán)</option>
                        <option value="all">Cán toàn bộ (bìa + ruột)</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="printColorMode">Chế độ màu</label>
                    <select
                        id="printColorMode"
                        name="printColorMode"
                        value={params.printColorMode}
                        onChange={handleSelect}
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
        </div>
    );
}
