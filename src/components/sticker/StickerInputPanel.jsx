// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

export default function StickerInputPanel({ config, params, onChange }) {
    const s = config.STICKER_CONFIG || {};
    const handleSelect = (e) => onChange(e.target.name, e.target.value);

    const sizeKeys = s.sizeOrder || Object.keys(s.sizes || {});
    const finishKeys = s.finishOrder || Object.keys(s.finishes || {});

    const finishLabel = (key) => {
        const f = s.finishes?.[key];
        if (!f) return key;
        if (f.percent > 0) return `${f.name} (+${f.percent}%)`;
        if (f.fixedBySize && Object.keys(f.fixedBySize).length > 0) {
            return `${f.name} (tính theo từng tờ)`;
        }
        return f.name;
    };

    const isImage = params.fileType === 'image';

    return (
        <div id="sticker-controls">
            <div className="input-group">
                <h2>
                    <span className="text-pink-400">1.</span> Thông Số Tờ Sticker
                </h2>

                <div className="mb-4">
                    <label htmlFor="size">Kích thước tờ</label>
                    <select id="size" name="size" value={params.size} onChange={handleSelect}>
                        {sizeKeys.map((k) => (
                            <option key={k} value={k}>
                                {s.sizes?.[k]?.name || k}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="qty">Số lượng tờ cần in</label>
                    <div className="relative">
                        <NumberField
                            id="qty"
                            value={params.qty}
                            onCommit={(v) => onChange('qty', v)}
                            step={1}
                            min={1}
                        />
                        <span className="unit">tờ</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                        Tính tiền tối thiểu {s.minBillableQty} tờ. Trên{' '}
                        {s.maxQty?.toLocaleString('vi-VN')} tờ → báo giá riêng.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                        <label htmlFor="stickers">Số sticker / tờ</label>
                        <div className="relative">
                            <NumberField
                                id="stickers"
                                value={params.stickers}
                                onCommit={(v) => onChange('stickers', v)}
                                step={1}
                                min={1}
                            />
                            <span className="unit">con</span>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="contents">Số nội dung / mẫu</label>
                        <div className="relative">
                            <NumberField
                                id="contents"
                                value={params.contents}
                                onCommit={(v) => onChange('contents', v)}
                                step={1}
                                min={1}
                            />
                            <span className="unit">mẫu</span>
                        </div>
                    </div>
                </div>
                <p className="mb-4 text-xs text-gray-400">
                    0–{s.stickerFree} sticker/tờ không phụ phí; mỗi {s.stickerStep} con vượt = +
                    {s.stickerPctPerStep}%.
                </p>
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-pink-400">2.</span> Gia Công & File
                </h2>
                <div className="mb-4">
                    <label htmlFor="finish">Loại cán màng</label>
                    <select id="finish" name="finish" value={params.finish} onChange={handleSelect}>
                        {finishKeys.map((k) => (
                            <option key={k} value={k}>
                                {finishLabel(k)}
                            </option>
                        ))}
                    </select>
                </div>
                <div className="mb-2">
                    <label htmlFor="fileType">Loại file</label>
                    <select
                        id="fileType"
                        name="fileType"
                        value={params.fileType}
                        onChange={handleSelect}
                    >
                        <option value="vector">File vector (lấy được khuôn cắt)</option>
                        <option value="image">File ảnh (cần vẽ đường cắt)</option>
                    </select>
                </div>
                {isImage && (
                    <p className="mt-1 text-xs text-yellow-400">
                        ⚠ File ảnh: cộng phí vẽ đường cắt {s.cutPathFee?.toLocaleString('vi-VN')}đ
                        nếu số lượng &lt; {s.cutPathQtyThreshold} tờ.
                    </p>
                )}
            </div>
        </div>
    );
}
