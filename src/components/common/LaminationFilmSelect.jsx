import { getLaminationFilms } from '../../utils/laminationFilm';

// Ô chọn LOẠI MÀNG (mờ / bóng / …) — dùng chung cho mọi module có cán màng.
//
// Cố ý KHÔNG có giá trị mặc định: nhân viên buộc phải chọn thì xưởng mới biết
// cán mờ hay bóng. Chưa chọn thì chuỗi "Copy quy cách" ghi thẳng
// "(CHƯA CHỌN mờ/bóng)" để xưởng hỏi lại — và GIÁ KHÔNG ĐỔI (hệ số nhân = 1).
//
// Chỉ render khi đã bật cán màng; caller tự lo điều kiện đó.
export default function LaminationFilmSelect({ id, label = 'Loại màng', films, value, onChange }) {
    const list = getLaminationFilms(films);
    const unset = !value;
    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <select
                id={id}
                name={id}
                value={value || ''}
                onChange={(e) => onChange(e.target.name, e.target.value)}
                className={unset ? 'border-yellow-500' : undefined}
            >
                <option value="">— chọn loại màng —</option>
                {list.map((f) => (
                    <option key={f.id} value={f.id}>
                        {f.name}
                        {f.percent ? ` (+${f.percent}%)` : ''}
                    </option>
                ))}
            </select>
            {unset && (
                <p className="mt-1 text-xs text-yellow-400">
                    Chưa chọn loại màng — quy cách gửi xưởng sẽ ghi rõ là chưa chọn.
                </p>
            )}
        </div>
    );
}
