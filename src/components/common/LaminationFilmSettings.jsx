import {
    DEFAULT_LAMINATION_FILMS,
    filmUsesExtra,
    findKtsFilm,
    mergeKtsFilms,
    newFilmId,
} from '../../utils/laminationFilm';

// Bảng khai LOẠI MÀNG cho tab Cài Đặt — dùng chung cho 6 module có cán màng.
//
// `films` là mảng {id, name, percent, extra?, extraCost?}; `onChange(nextArray)` do panel tự
// ghi vào đúng chỗ trong config của module đó (mỗi module một danh sách riêng).
//
// Phụ thu bằng TIỀN CHÊNH: giá màng = giá Mờ/Bóng (tra bậc như cũ) + `extra` mỗi đơn vị.
// Đơn vị do module quyết (`extraLabel`: đ/trang A4, đ/tờ, đ/cái…). `extraCostLabel` chỉ In KTS
// truyền — ô chênh GIÁ VỐN (đ/m dài màng).
//
// Màng khai từ trước (chỉ có `percent`) vẫn tính % cho tới khi admin nhập tiền chênh — để giá
// đang chạy không đổi một đồng lúc deploy. Ô tiền chênh để TRỐNG = quay lại % cũ.
// id sinh một lần rồi giữ nguyên: admin đổi tên không làm hỏng báo giá đã lưu.
//
// `ktsSync` + `ktsFilms` (bảng màng In KTS ĐANG CHẠY): màng trùng tên với In KTS luôn lấy tiền
// chênh theo In KTS — ô bị khoá, sửa giá ở In KTS thì ở đây (và khi báo giá) tự theo; màng In KTS
// mới thêm tự xuất hiện. Không truyền `ktsFilms` thì chỉ còn nút bấm lấy một lần như trước.
export default function LaminationFilmSettings({
    films: filmsProp,
    onChange,
    title = 'Loại màng cán',
    extraLabel = 'đ/đơn vị',
    extraCostLabel = null,
    extraHint = null,
    ktsSync = false,
    ktsFilms = null,
}) {
    const followKts = ktsSync && Array.isArray(ktsFilms);
    const ownFilms = Array.isArray(filmsProp) ? filmsProp : [];
    const list = followKts ? mergeKtsFilms(ownFilms, ktsFilms) : ownFilms;

    const update = (i, patch) =>
        onChange(list.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
    // Ô trống ⇒ xoá field (không lưu null) ⇒ màng quay về chế độ % cũ.
    const setAmount = (i, field, raw) => {
        if (raw === '') {
            const next = { ...list[i] };
            delete next[field];
            if (field === 'extra') delete next.extraCost;
            onChange(list.map((f, idx) => (idx === i ? next : f)));
            return;
        }
        const n = Number(raw);
        if (!Number.isFinite(n)) return;
        const patch = { [field]: n };
        // Nhập chênh vốn trước chênh báo khách ⇒ coi như chuyển hẳn sang tiền chênh.
        if (field === 'extraCost' && !filmUsesExtra(list[i])) patch.extra = 0;
        update(i, patch);
    };
    const add = () =>
        onChange([
            ...list,
            {
                id: newFilmId(),
                name: 'Loại màng mới',
                percent: 0,
                extra: 0,
                ...(extraCostLabel ? { extraCost: 0 } : {}),
            },
        ]);
    const del = (i) => onChange(list.filter((_, idx) => idx !== i));
    const seed = () => onChange(DEFAULT_LAMINATION_FILMS.map((f) => ({ ...f })));
    const syncKts = () => onChange(mergeKtsFilms(list, ktsFilms));

    const inputCls =
        'w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500';
    const numCls =
        'bg-gray-900 border border-gray-700 rounded px-2 py-1 text-white w-32 focus:outline-none focus:border-blue-500 disabled:opacity-40';
    const btn = 'px-3 py-1 rounded text-sm font-medium';
    const th = 'px-3 py-2 text-left text-gray-400 text-xs uppercase';

    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-cyan-400 font-bold">{title}</h3>
                <div className="flex gap-2">
                    {ktsSync && !extraCostLabel && (
                        <button
                            onClick={syncKts}
                            title="Thêm các màng còn thiếu và điền tiền chênh báo khách theo bảng In KTS khổ nhỏ (chưa lưu cho tới khi bấm Lưu)"
                            className={btn + ' bg-blue-600 hover:bg-blue-700 text-white'}
                        >
                            Lấy giá màng theo In KTS
                        </button>
                    )}
                    <button
                        onClick={add}
                        className={btn + ' bg-green-600 hover:bg-green-700 text-white'}
                    >
                        + Thêm loại màng
                    </button>
                </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
                Nhân viên phải chọn loại màng khi báo giá, để quy cách gửi xưởng ghi rõ cán mờ hay
                cán bóng. Giá màng đặc biệt = giá cán Mờ/Bóng (vẫn tra theo bậc số lượng){' '}
                <strong>+ tiền chênh</strong> ({extraLabel}). Tiền chênh không đổi theo bậc, nên đơn
                ít hay nhiều đều chênh đúng một khoản như nhau. Mờ/Bóng để <strong>0</strong>.
                {extraHint ? ` ${extraHint}` : ''}
            </p>
            {extraCostLabel && (
                <p className="text-xs text-yellow-300/80 mb-3">
                    Nhập cả chênh giá vốn ({extraCostLabel}); để 0 thì giá vốn không tăng theo và
                    lợi nhuận hiển thị sẽ cao hơn thật.
                </p>
            )}

            {list.length === 0 ? (
                <div className="text-xs text-gray-500">
                    Chưa khai loại màng nào — hệ thống đang dùng mặc định Mờ / Bóng (không chênh).{' '}
                    <button onClick={seed} className="text-cyan-400 underline">
                        Khai vào bảng để sửa
                    </button>
                </div>
            ) : (
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b border-gray-700">
                            <th className={th}>Tên loại màng</th>
                            <th className={th}>Chênh báo khách ({extraLabel})</th>
                            {extraCostLabel && <th className={th}>Chênh vốn ({extraCostLabel})</th>}
                            <th className="px-3 py-2"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {list.map((f, i) => {
                            const amountMode = filmUsesExtra(f);
                            const kts = followKts ? findKtsFilm(ktsFilms, f) : null;
                            const ktsLocked = filmUsesExtra(kts);
                            const pct = Number(f.percent);
                            const legacyPct = !amountMode && Number.isFinite(pct) && pct !== 0;
                            return (
                                <tr key={f.id || i} className="border-b border-gray-700/50">
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            aria-label={`Tên loại màng ${i + 1}`}
                                            value={f.name ?? ''}
                                            disabled={!!kts}
                                            onChange={(e) => update(i, { name: e.target.value })}
                                            className={inputCls}
                                        />
                                        {kts && (
                                            <p className="text-xs text-cyan-300/80 mt-1">
                                                {ktsLocked
                                                    ? 'Lấy theo In KTS khổ nhỏ — muốn đổi giá thì sửa ở In KTS.'
                                                    : 'Có trong bảng In KTS khổ nhỏ.'}
                                            </p>
                                        )}
                                        {legacyPct && !ktsLocked && (
                                            <p className="text-xs text-yellow-300 mt-1">
                                                Đang tính theo % cũ: +{pct}% tiền cán. Nhập tiền
                                                chênh để thay.
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            min={0}
                                            step={50}
                                            aria-label={`Chênh báo khách ${f.name ?? ''}`}
                                            placeholder={legacyPct ? 'chưa nhập' : '0'}
                                            value={amountMode ? f.extra : ''}
                                            disabled={ktsLocked}
                                            title={
                                                ktsLocked
                                                    ? 'Theo bảng giá màng In KTS khổ nhỏ'
                                                    : undefined
                                            }
                                            onChange={(e) => setAmount(i, 'extra', e.target.value)}
                                            className={numCls}
                                        />
                                    </td>
                                    {extraCostLabel && (
                                        <td className="px-3 py-2">
                                            <input
                                                type="number"
                                                min={0}
                                                step={50}
                                                aria-label={`Chênh vốn ${f.name ?? ''}`}
                                                placeholder={legacyPct ? 'chưa nhập' : '0'}
                                                value={amountMode ? (f.extraCost ?? '') : ''}
                                                onChange={(e) =>
                                                    setAmount(i, 'extraCost', e.target.value)
                                                }
                                                className={numCls}
                                            />
                                        </td>
                                    )}
                                    <td className="px-3 py-2">
                                        <button
                                            onClick={() => del(i)}
                                            disabled={!!kts}
                                            title={
                                                kts
                                                    ? 'Màng lấy theo In KTS — xoá ở In KTS khổ nhỏ'
                                                    : undefined
                                            }
                                            className={
                                                btn +
                                                ' bg-red-600 hover:bg-red-700 text-white disabled:opacity-40 disabled:cursor-not-allowed'
                                            }
                                        >
                                            Xóa
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </section>
    );
}
