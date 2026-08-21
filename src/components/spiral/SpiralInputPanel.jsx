// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

const SIZE_PRESETS = [
    { label: 'A4', w: 210, h: 297 },
    { label: 'A5', w: 148, h: 210 },
    { label: 'A6', w: 105, h: 148 },
];

export default function SpiralInputPanel({ config, params, onChange }) {
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

    return (
        <div id="spiral-controls">
            <div className="input-group">
                <h2>
                    <span className="text-teal-400">1.</span> Thông Số Sổ Lò Xo
                </h2>

                <div className="mb-4">
                    <label htmlFor="numPages">Số trang ruột</label>
                    <div className="relative">
                        <NumberField
                            id="numPages"
                            value={params.numPages}
                            onCommit={(v) => onChange('numPages', v)}
                            step={2}
                            min={1}
                        />
                        <span className="unit">trang</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                        Mỗi tờ in 2 mặt = 2 trang. Bìa (2 tờ trước+sau) tính riêng.
                    </p>
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
                                        ? 'bg-teal-500/20 border-teal-500 text-teal-300'
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
                    chiều — nhập đúng kích thước thành phẩm cần in.
                </p>

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
                    <span className="text-teal-400">2.</span> Giấy In (dùng chung giá In KTS)
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="coverPaperType">Giấy bìa (2 tờ)</label>
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="coverSides">In bìa</label>
                        <select
                            id="coverSides"
                            name="coverSides"
                            value={params.coverSides}
                            onChange={handleSelect}
                        >
                            <option value="2">2 mặt</option>
                            <option value="1">1 mặt</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="innerSides">In ruột</label>
                        <select
                            id="innerSides"
                            name="innerSides"
                            value={params.innerSides}
                            onChange={handleSelect}
                        >
                            <option value="2">2 mặt</option>
                            <option value="1">1 mặt</option>
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
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="coverLam">Cán màng bìa</label>
                        <select
                            id="coverLam"
                            name="coverLam"
                            value={params.coverLam ?? '0'}
                            onChange={handleSelect}
                        >
                            <option value="0">Không cán</option>
                            <option value="1">Cán 1 mặt</option>
                            <option value="2">Cán 2 mặt</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="innerLam">Cán màng ruột</label>
                        <select
                            id="innerLam"
                            name="innerLam"
                            value={params.innerLam ?? '0'}
                            onChange={handleSelect}
                        >
                            <option value="0">Không cán</option>
                            <option value="1">Cán 1 mặt</option>
                            <option value="2">Cán 2 mặt</option>
                        </select>
                    </div>
                </div>
                <div className="mb-4">
                    <label htmlFor="linerType">Bìa lót ngoài (trước bìa)</label>
                    <select
                        id="linerType"
                        name="linerType"
                        value={params.linerType}
                        onChange={handleSelect}
                    >
                        <option value="">Không</option>
                        {(config.SPIRAL_CONFIG?.linerTypes || []).map((lt, i) => (
                            <option key={i} value={i}>
                                {lt.name}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="coverColorMode">Màu in bìa</label>
                        <select
                            id="coverColorMode"
                            name="coverColorMode"
                            value={params.coverColorMode}
                            onChange={handleSelect}
                        >
                            <option value="4color">In 4 màu (CMYK)</option>
                            <option value="1color">In 1 màu (Đen)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="innerColorMode">Màu in ruột</label>
                        <select
                            id="innerColorMode"
                            name="innerColorMode"
                            value={params.innerColorMode}
                            onChange={handleSelect}
                        >
                            <option value="4color">In 4 màu (CMYK)</option>
                            <option value="1color">In 1 màu (Đen)</option>
                        </select>
                    </div>
                </div>
                {(params.coverColorMode === '1color' || params.innerColorMode === '1color') && (
                    <p className="mt-1 text-xs text-yellow-400">
                        ⚠ In 1 màu đen chỉ in chữ &amp; đối tượng đen — KHÔNG in nền đen kín (full
                        đen).
                    </p>
                )}
            </div>
        </div>
    );
}
