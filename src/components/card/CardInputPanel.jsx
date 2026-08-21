// React 18+ auto JSX transform — không cần import React.
import NumberField from '../common/NumberField';

export default function CardInputPanel({ config, params, onChange }) {
    const c = config.CARD_CONFIG || {};
    const handleSelect = (e) => onChange(e.target.name, e.target.value);

    const segment =
        (c.segments || []).find((s) => s.id === params.segment) || (c.segments || [])[0];
    const multiplier = segment?.multiplier || 1;

    const addons = params.addons || {};
    const toggleAddon = (id) => onChange('addons', { ...addons, [id]: !addons[id] });

    // Giá BÁN của add-on theo nhóm khách (làm tròn) — KHÔNG hiện giá gốc.
    const addonSell = (base) => Math.round((base || 0) * multiplier);

    return (
        <div id="card-controls">
            <div className="input-group">
                <h2>
                    <span className="text-indigo-400">1.</span> Thông Số Thẻ
                </h2>

                <div className="mb-4">
                    <label htmlFor="qty">Số lượng thẻ</label>
                    <div className="relative">
                        <NumberField
                            id="qty"
                            value={params.qty}
                            onCommit={(v) => onChange('qty', v)}
                            step={1}
                            min={1}
                        />
                        <span className="unit">thẻ</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-400">
                        Dưới {c.moq} thẻ tính theo cơ sở {c.moq} thẻ. Trên{' '}
                        {c.maxQty?.toLocaleString('vi-VN')} thẻ → liên hệ báo giá.
                    </p>
                </div>

                <div className="mb-4">
                    <label htmlFor="product">Loại thẻ</label>
                    <select
                        id="product"
                        name="product"
                        value={params.product}
                        onChange={handleSelect}
                    >
                        {(c.products || []).map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-2">
                    <label htmlFor="segment">Nhóm khách hàng</label>
                    <select
                        id="segment"
                        name="segment"
                        value={params.segment}
                        onChange={handleSelect}
                    >
                        {(c.segments || []).map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-indigo-400">2.</span> Dịch Vụ Gia Tăng
                </h2>
                <div className="space-y-2">
                    {(c.addons || []).map((a) => (
                        <label
                            key={a.id}
                            className="flex items-center gap-3 text-gray-200 cursor-pointer select-none"
                        >
                            <input
                                type="checkbox"
                                checked={!!addons[a.id]}
                                onChange={() => toggleAddon(a.id)}
                                className="w-4 h-4 accent-indigo-500"
                            />
                            <span>
                                {a.name}
                                <span className="text-gray-400 text-sm">
                                    {' '}
                                    (+{addonSell(a.base).toLocaleString('vi-VN')}đ)
                                </span>
                            </span>
                        </label>
                    ))}
                </div>
            </div>
        </div>
    );
}
