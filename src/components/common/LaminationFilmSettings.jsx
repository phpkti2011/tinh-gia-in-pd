import { DEFAULT_LAMINATION_FILMS, newFilmId } from '../../utils/laminationFilm';

// Bảng khai LOẠI MÀNG cho tab Cài Đặt — dùng chung cho 6 module có cán màng.
//
// `films` là mảng {id, name, percent}; `onChange(nextArray)` do panel tự ghi vào
// đúng chỗ trong config của module đó (mỗi module một danh sách riêng).
//
// Phụ thu % cộng trên TIỀN CÁN MÀNG. Mờ/Bóng để 0% ⇒ giá không đổi.
// id sinh một lần rồi giữ nguyên: admin đổi tên không làm hỏng báo giá đã lưu.
export default function LaminationFilmSettings({ films, onChange, title = 'Loại màng cán' }) {
    const list = Array.isArray(films) ? films : [];

    const update = (i, field, val) =>
        onChange(list.map((f, idx) => (idx === i ? { ...f, [field]: val } : f)));
    const add = () => onChange([...list, { id: newFilmId(), name: 'Loại màng mới', percent: 0 }]);
    const del = (i) => onChange(list.filter((_, idx) => idx !== i));
    const seed = () => onChange(DEFAULT_LAMINATION_FILMS.map((f) => ({ ...f })));

    const inputCls =
        'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500';
    const btn = 'px-3 py-1 rounded text-sm font-medium';

    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-cyan-400 font-bold">{title}</h3>
                <button
                    onClick={add}
                    className={btn + ' bg-green-600 hover:bg-green-700 text-white'}
                >
                    + Thêm loại màng
                </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
                Nhân viên phải chọn loại màng khi báo giá, để quy cách gửi xưởng ghi rõ cán mờ hay
                cán bóng. Phụ thu % cộng trên tiền cán màng — để <strong>0</strong> thì giá không
                đổi.
            </p>

            {list.length === 0 ? (
                <div className="text-xs text-gray-500">
                    Chưa khai loại màng nào — hệ thống đang dùng mặc định Mờ / Bóng (0%).{' '}
                    <button onClick={seed} className="text-cyan-400 underline">
                        Khai vào bảng để sửa
                    </button>
                </div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className="px-3 py-2 text-left text-gray-400 text-xs uppercase">
                                Tên loại màng
                            </th>
                            <th className="px-3 py-2 text-left text-gray-400 text-xs uppercase">
                                Phụ thu (%)
                            </th>
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((f, i) => (
                            <tr key={f.id || i} className="border-b border-gray-700/50">
                                <td className="px-3 py-2">
                                    <input
                                        type="text"
                                        value={f.name ?? ''}
                                        onChange={(e) => update(i, 'name', e.target.value)}
                                        className={inputCls}
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <input
                                        type="number"
                                        step={1}
                                        value={f.percent ?? 0}
                                        onChange={(e) =>
                                            update(i, 'percent', parseFloat(e.target.value) || 0)
                                        }
                                        className="bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-24 focus:outline-none focus:border-blue-500"
                                    />
                                </td>
                                <td className="px-3 py-2">
                                    <button
                                        onClick={() => del(i)}
                                        className={btn + ' bg-red-600 hover:bg-red-700 text-white'}
                                    >
                                        Xóa
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </section>
    );
}
