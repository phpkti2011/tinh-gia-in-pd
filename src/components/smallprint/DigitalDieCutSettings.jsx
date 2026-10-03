export default function DigitalDieCutSettings({
    value,
    onChange,
    title = 'Giá Bế Kỹ Thuật Số',
    addLabel = '+ Thêm bậc bế kỹ thuật số',
}) {
    const edit = (index, field, next) => {
        const copy = structuredClone(value);
        if (field === 'max_qty' || field === 'type') {
            copy.cost_tiers[index][field] = next;
            copy.customer_tiers[index][field] = next;
        } else copy[field][index].price = next;
        onChange(copy);
    };
    const inputClass = 'w-full p-2 rounded bg-gray-700 text-white border border-gray-600';
    return (
        <section aria-label={title}>
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                {title}
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                Bậc tính theo số tờ máy, từ sau mốc trước đến mốc hiện tại. Nhập mốc tăng dần, giá
                vốn và giá khách cho từng bậc. Số lượng vượt bậc cuối cần thêm bậc giá.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {value.cost_tiers.map((tier, i) => (
                    <div key={i} className="space-y-2 p-3 bg-gray-900/50 rounded">
                        <label className="block">
                            Đến số tờ máy — bậc {i + 1}
                            <input
                                className={inputClass}
                                type="number"
                                min="1"
                                step="1"
                                disabled={tier.max_qty === Infinity}
                                value={Number.isFinite(tier.max_qty) ? tier.max_qty : ''}
                                onChange={(e) =>
                                    edit(
                                        i,
                                        'max_qty',
                                        e.target.value === '' ? NaN : Number(e.target.value)
                                    )
                                }
                            />
                        </label>
                        {i === value.cost_tiers.length - 1 && (
                            <label className="flex gap-2 items-center">
                                <input
                                    type="checkbox"
                                    checked={tier.max_qty === Infinity}
                                    onChange={(e) =>
                                        edit(
                                            i,
                                            'max_qty',
                                            e.target.checked
                                                ? Infinity
                                                : (value.cost_tiers[i - 1]?.max_qty ?? 0) + 1000
                                        )
                                    }
                                />
                                Không giới hạn số tờ — bậc {i + 1}
                            </label>
                        )}
                        {tier.max_qty === Infinity && (
                            <p className="text-sm text-gray-400">
                                Trên {value.cost_tiers[i - 1]?.max_qty ?? 0} tờ máy
                            </p>
                        )}
                        <label className="block">
                            Cách tính — bậc {i + 1}
                            <select
                                className={inputClass}
                                value={tier.type === 'per_item' ? 'per_piece' : tier.type}
                                onChange={(e) => edit(i, 'type', e.target.value)}
                            >
                                <option value="package">Trọn gói</option>
                                <option value="per_piece">Mỗi tờ máy</option>
                            </select>
                        </label>
                        {['cost_tiers', 'customer_tiers'].map((key) => (
                            <label key={key} className="block">
                                {key === 'cost_tiers' ? 'Giá vốn' : 'Giá khách'} (đ) — bậc {i + 1}
                                <input
                                    className={inputClass}
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={
                                        Number.isFinite(value[key][i]?.price)
                                            ? value[key][i].price
                                            : ''
                                    }
                                    onChange={(e) =>
                                        edit(
                                            i,
                                            key,
                                            e.target.value === '' ? NaN : Number(e.target.value)
                                        )
                                    }
                                />
                            </label>
                        ))}
                        <button
                            type="button"
                            className="text-red-400 disabled:opacity-40"
                            disabled={value.cost_tiers.length === 1}
                            onClick={() =>
                                onChange({
                                    ...value,
                                    cost_tiers: value.cost_tiers.filter((_, j) => j !== i),
                                    customer_tiers: value.customer_tiers.filter((_, j) => j !== i),
                                })
                            }
                        >
                            Xóa bậc {i + 1}
                        </button>
                    </div>
                ))}
            </div>
            <button
                type="button"
                className="mt-4 px-4 py-2 rounded bg-gray-700 text-cyan-300"
                onClick={() => {
                    const insertAt =
                        value.cost_tiers.at(-1)?.max_qty === Infinity
                            ? value.cost_tiers.length - 1
                            : value.cost_tiers.length;
                    const max = value.cost_tiers[insertAt - 1]?.max_qty ?? 0;
                    const tier = {
                        max_qty: Number.isFinite(max) ? max + 1000 : NaN,
                        price: NaN,
                        type: 'package',
                    };
                    const copy = structuredClone(value);
                    copy.cost_tiers.splice(insertAt, 0, { ...tier });
                    copy.customer_tiers.splice(insertAt, 0, { ...tier });
                    onChange(copy);
                }}
            >
                {addLabel}
            </button>
        </section>
    );
}
