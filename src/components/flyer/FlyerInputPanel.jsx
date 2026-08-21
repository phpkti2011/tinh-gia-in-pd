// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

export default function FlyerInputPanel({ config, params, onChange }) {
    const c = config.FLYER_CONFIG || {};
    const handleSelect = (e) => onChange(e.target.name, e.target.value);

    const size = (c.sizes || []).find((s) => s.id === params.size) || (c.sizes || [])[0];
    const minQty = size?.min || 1;

    // Đổi khổ: nếu SL hiện < min mới thì nâng lên min (giống webapp gốc).
    const onSizeChange = (e) => {
        const newSize = e.target.value;
        onChange('size', newSize);
        const s = (c.sizes || []).find((x) => x.id === newSize);
        if (s && Number(params.quantity) < s.min) onChange('quantity', s.min);
    };

    const Select = ({ id, label, options }) => (
        <div>
            <label htmlFor={id}>{label}</label>
            <select id={id} name={id} value={params[id]} onChange={handleSelect}>
                {(options || []).map((o) => (
                    <option key={o.id} value={o.id}>
                        {o.name}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <div id="flyer-controls">
            <div className="input-group">
                <h2>
                    <span className="text-amber-400">1.</span> Thông Số Tờ Rơi
                </h2>

                <div className="mb-4">
                    <label htmlFor="size">Kích thước</label>
                    <select id="size" name="size" value={params.size} onChange={onSizeChange}>
                        {(c.sizes || []).map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="quantity">Số lượng tờ</label>
                    <div className="relative">
                        <NumberField
                            id="quantity"
                            value={params.quantity}
                            onCommit={(v) => onChange('quantity', v)}
                            step={1}
                            min={minQty}
                        />
                        <span className="unit">tờ</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                        {size?.name} tối thiểu {minQty} tờ.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <Select id="paper" label="Loại giấy" options={c.paperTypes} />
                    <Select id="sides" label="In mặt" options={c.sidesOptions} />
                </div>
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-amber-400">2.</span> Gia Công & Nội Dung
                </h2>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <Select id="lamination" label="Cán màng" options={c.laminationOptions} />
                    <Select id="creasing" label="Cấn gấp" options={c.creasingOptions} />
                </div>
                <Select id="contents" label="Số nội dung / mẫu" options={c.contentOptions} />
                {params.lamination === 'yes' && (
                    <p className="mt-2 text-xs text-gray-400">
                        Cán màng +{c.laminationSurcharge?.A5}đ/tờ (A5) · +
                        {c.laminationSurcharge?.A4}đ/tờ (A4).
                    </p>
                )}
            </div>
        </div>
    );
}
