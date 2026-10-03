import { emptyGluingTier, emptyGluingType } from '../../modules/small-print/config/gluingTypes';

// Cài Đặt — DÁN THÀNH PHẨM (GLUING_TYPES). Component điều khiển từ ngoài như
// DigitalDieCutSettings: nhận nguyên mảng kiểu dán, trả mảng mới qua onChange.
//
// Mỗi kiểu dán có bảng bậc theo SỐ THÀNH PHẨM; mốc và cách tính ghi vào CẢ bảng vốn lẫn bảng
// khách (hai bảng luôn cùng mốc), giá thì sửa riêng từng bảng. Ô số để trống → NaN, bị
// validateGluingTypes chặn lúc Lưu — không lưu nhầm 0 đ.

const inputClass = 'w-full p-2 rounded bg-gray-700 text-white border border-gray-600';
const numberOrNaN = (text) => (text === '' ? NaN : Number(text));

export default function GluingSettings({ value, onChange }) {
    const types = Array.isArray(value) ? value : [];
    const editType = (t, edit) => {
        const copy = structuredClone(types);
        edit(copy[t]);
        onChange(copy);
    };
    const editTier = (t, i, field, next) =>
        editType(t, (type) => {
            if (field === 'max_qty' || field === 'type') {
                type.cost_tiers[i][field] = next;
                if (type.customer_tiers[i]) type.customer_tiers[i][field] = next;
            } else if (type[field][i]) type[field][i].price = next;
        });
    // Bậc mới chèn TRƯỚC dòng "không giới hạn" để dòng đó luôn nằm cuối.
    const addTier = (t) =>
        editType(t, (type) => {
            const last = type.cost_tiers.length - 1;
            const insertAt = type.cost_tiers[last]?.max_qty === Infinity ? last : last + 1;
            const previous = type.cost_tiers[insertAt - 1]?.max_qty ?? 0;
            const max = Number.isFinite(previous) ? previous + 100 : NaN;
            type.cost_tiers.splice(insertAt, 0, emptyGluingTier(max));
            type.customer_tiers.splice(insertAt, 0, emptyGluingTier(max));
        });
    const removeTier = (t, i) =>
        editType(t, (type) => {
            type.cost_tiers.splice(i, 1);
            type.customer_tiers.splice(i, 1);
        });
    const addType = () => {
        const taken = new Set(types.map((type) => String(type.name).trim().toLowerCase()));
        let name = 'Kiểu dán mới';
        for (let n = 2; taken.has(name.toLowerCase()); n++) name = `Kiểu dán mới ${n}`;
        onChange([...types, emptyGluingType(name)]);
    };

    return (
        <section aria-label="Dán Thành Phẩm">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-600">
                <h3 className="text-lg font-semibold text-cyan-400">Dán Thành Phẩm</h3>
                <button
                    type="button"
                    onClick={addType}
                    className="px-3 py-1 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                >
                    + Thêm kiểu dán
                </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">
                Mỗi kiểu dán (keo phá màng, keo 2 mặt vàng…) có bảng giá theo bậc số lượng thành
                phẩm: từ sau mốc trước đến mốc hiện tại. Mỗi bậc chọn “Trọn gói” (một giá cho cả
                đơn) hoặc “/SP” (giá nhân số lượng). Ở màn tính giá, một đơn thêm được nhiều dòng
                dán; mỗi dòng tính cho toàn bộ số lượng.
            </p>
            {types.length === 0 && (
                <p className="text-gray-500 text-sm">
                    Chưa có kiểu dán nào — ô “Dán thành phẩm” đang ẩn ở màn tính giá.
                </p>
            )}
            <div className="space-y-4">
                {types.map((type, t) => {
                    const lastMax = type.cost_tiers.at(-1)?.max_qty;
                    return (
                        <fieldset
                            key={type.id}
                            aria-label={`Kiểu dán ${t + 1}`}
                            className="p-4 bg-gray-900/50 rounded-lg border border-gray-700"
                        >
                            <div className="flex items-end gap-3 mb-3">
                                <label className="flex-1 text-gray-400 text-sm">
                                    Tên kiểu dán
                                    <input
                                        type="text"
                                        className={inputClass}
                                        value={type.name}
                                        onChange={(e) =>
                                            editType(t, (x) => {
                                                x.name = e.target.value;
                                            })
                                        }
                                    />
                                </label>
                                <button
                                    type="button"
                                    onClick={() => onChange(types.filter((_, j) => j !== t))}
                                    className="pb-2 text-sm text-red-400 hover:text-red-300"
                                >
                                    Xóa kiểu dán
                                </button>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-700">
                                            <th className="text-left py-1.5 pr-3">Ngưỡng SL</th>
                                            <th className="text-left py-1.5 pr-3">Cách tính</th>
                                            <th className="text-left py-1.5 pr-3">Giá vốn (đ)</th>
                                            <th className="text-left py-1.5 pr-3">Giá khách (đ)</th>
                                            <th className="py-1.5" />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {type.cost_tiers.map((tier, i) => {
                                            const isLast = i === type.cost_tiers.length - 1;
                                            const unlimited = tier.max_qty === Infinity;
                                            const previous = type.cost_tiers[i - 1]?.max_qty ?? 0;
                                            return (
                                                <tr key={i} className="border-b border-gray-700/50">
                                                    <td className="py-1.5 pr-3">
                                                        <div className="flex items-center gap-2">
                                                            <input
                                                                aria-label={`Ngưỡng SL — bậc ${i + 1}`}
                                                                className={inputClass + ' min-w-24'}
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                disabled={unlimited}
                                                                value={
                                                                    Number.isFinite(tier.max_qty)
                                                                        ? tier.max_qty
                                                                        : ''
                                                                }
                                                                onChange={(e) =>
                                                                    editTier(
                                                                        t,
                                                                        i,
                                                                        'max_qty',
                                                                        numberOrNaN(e.target.value)
                                                                    )
                                                                }
                                                            />
                                                            {isLast && (
                                                                <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                                                                    <input
                                                                        type="checkbox"
                                                                        aria-label={`Không giới hạn — bậc ${i + 1}`}
                                                                        checked={unlimited}
                                                                        onChange={(e) =>
                                                                            editTier(
                                                                                t,
                                                                                i,
                                                                                'max_qty',
                                                                                e.target.checked
                                                                                    ? Infinity
                                                                                    : (Number.isFinite(
                                                                                          previous
                                                                                      )
                                                                                          ? previous
                                                                                          : 0) + 100
                                                                            )
                                                                        }
                                                                    />
                                                                    Không giới hạn
                                                                </label>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-1.5 pr-3">
                                                        <select
                                                            aria-label={`Cách tính — bậc ${i + 1}`}
                                                            className={inputClass}
                                                            value={tier.type}
                                                            onChange={(e) =>
                                                                editTier(
                                                                    t,
                                                                    i,
                                                                    'type',
                                                                    e.target.value
                                                                )
                                                            }
                                                        >
                                                            <option value="package">
                                                                Trọn gói
                                                            </option>
                                                            <option value="per_piece">/SP</option>
                                                        </select>
                                                    </td>
                                                    {['cost_tiers', 'customer_tiers'].map((key) => (
                                                        <td key={key} className="py-1.5 pr-3">
                                                            <input
                                                                aria-label={`${key === 'cost_tiers' ? 'Giá vốn' : 'Giá khách'} (đ) — bậc ${i + 1}`}
                                                                className={inputClass + ' min-w-28'}
                                                                type="number"
                                                                min="0"
                                                                step="any"
                                                                value={
                                                                    Number.isFinite(
                                                                        type[key][i]?.price
                                                                    )
                                                                        ? type[key][i].price
                                                                        : ''
                                                                }
                                                                onChange={(e) =>
                                                                    editTier(
                                                                        t,
                                                                        i,
                                                                        key,
                                                                        numberOrNaN(e.target.value)
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                    ))}
                                                    <td className="py-1.5">
                                                        <button
                                                            type="button"
                                                            className="text-red-400 hover:text-red-300 text-xs whitespace-nowrap disabled:opacity-40"
                                                            disabled={type.cost_tiers.length === 1}
                                                            onClick={() => removeTier(t, i)}
                                                        >
                                                            Xóa bậc {i + 1}
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            {Number.isFinite(lastMax) && (
                                <p className="mt-2 text-xs text-yellow-400">
                                    Bậc cuối đang có giới hạn: đơn trên {lastMax} sản phẩm sẽ KHÔNG
                                    được tính tiền dán (màn kết quả có cảnh báo). Tick “Không giới
                                    hạn” nếu bậc cuối áp cho mọi số lượng lớn hơn.
                                </p>
                            )}
                            <button
                                type="button"
                                onClick={() => addTier(t)}
                                className="mt-2 text-xs font-medium text-blue-400 hover:text-blue-300"
                            >
                                + Thêm mức giá
                            </button>
                        </fieldset>
                    );
                })}
            </div>
        </section>
    );
}
