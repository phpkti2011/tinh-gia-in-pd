// React 18+ auto JSX transform — không cần import React.
export default function CheapDecalInputPanel({ config, params, onChange }) {
    const c = config.CHEAP_DECAL_CONFIG || {};
    const handleSelect = (e) => onChange(e.target.name, e.target.value);

    return (
        <div id="cheapdecal-controls">
            <div className="input-group">
                <h2>
                    <span className="text-rose-400">1.</span> Thông Số Nhãn
                </h2>

                <div className="mb-4">
                    <label htmlFor="size">Cỡ nhãn</label>
                    <select id="size" name="size" value={params.size} onChange={handleSelect}>
                        {(c.sizes || []).map((s) => (
                            <option key={s.id} value={s.id}>
                                {s.name} ({s.perSheet} nhãn/tờ)
                            </option>
                        ))}
                    </select>
                </div>

                <div className="mb-4">
                    <label htmlFor="quantity">Số lượng nhãn</label>
                    <select
                        id="quantity"
                        name="quantity"
                        value={params.quantity}
                        onChange={handleSelect}
                    >
                        {(c.quantities || []).map((q) => (
                            <option key={q} value={q}>
                                {q.toLocaleString('vi-VN')} nhãn
                            </option>
                        ))}
                    </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="shape">Hình dạng</label>
                        <select
                            id="shape"
                            name="shape"
                            value={params.shape}
                            onChange={handleSelect}
                        >
                            {(c.shapes || []).map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="material">Vật liệu</label>
                        <select
                            id="material"
                            name="material"
                            value={params.material}
                            onChange={handleSelect}
                        >
                            {(c.materials || []).map((m) => (
                                <option key={m.id} value={m.id}>
                                    {m.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div className="input-group">
                <h2>
                    <span className="text-rose-400">2.</span> Gia Công & Thời Gian
                </h2>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="lamination">Cán màng</label>
                        <select
                            id="lamination"
                            name="lamination"
                            value={params.lamination}
                            onChange={handleSelect}
                        >
                            <option value="no">Không cán</option>
                            <option value="yes">Có cán màng</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="rush">Lấy trong ngày</label>
                        <select id="rush" name="rush" value={params.rush} onChange={handleSelect}>
                            <option value="no">Không (3–7 ngày)</option>
                            <option value="yes">Có (phụ phí)</option>
                        </select>
                    </div>
                </div>
                <p className="mt-3 text-xs text-gray-400">{c.leadTimeNote}</p>
            </div>
        </div>
    );
}
