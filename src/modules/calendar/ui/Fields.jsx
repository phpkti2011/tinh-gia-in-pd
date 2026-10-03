import { useId } from 'react';

export const fieldClass =
    'w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-200';
export const buttonClass =
    'bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 py-2 rounded text-sm font-medium transition disabled:opacity-40';
// Vốn mỗi cm² thường là số lẻ nhỏ; giữ thêm số thập phân khi dưới 1 đồng để còn đọc được.
export const formatPerCm2 = (v) =>
    Number.isFinite(v) && v > 0
        ? v.toLocaleString('vi-VN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: v < 1 ? 4 : 2,
          })
        : '—';
export const formatRatio = (v) =>
    Number.isFinite(v) && v > 0 ? v.toLocaleString('vi-VN', { maximumFractionDigits: 2 }) : '—';

export function NumberField({ label, value, onChange, min = 0, step = 'any' }) {
    const id = useId();
    const unit = label.match(/\((cm|mm|đ)\)$/)?.[1];
    return (
        <div>
            <label htmlFor={id}>{unit ? label.replace(/\s*\((cm|mm|đ)\)$/, '') : label}</label>
            <div className="relative">
                <input
                    id={id}
                    aria-label={label}
                    type="number"
                    min={min}
                    step={step}
                    value={Number.isNaN(value) ? '' : value}
                    onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                    className={unit ? fieldClass + ' pr-12' : fieldClass}
                />
                {unit && <span className="unit">{unit}</span>}
            </div>
        </div>
    );
}
export function SelectField({ label, value, onChange, children }) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <select
                id={id}
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={fieldClass}
            >
                {children}
            </select>
        </div>
    );
}
export function Section({ title, children }) {
    const numbered = title.match(/^(\d+\.)\s*(.*)$/);
    return (
        <section className="input-group">
            <h2>
                {numbered ? (
                    <>
                        <span className="text-cyan-400">{numbered[1]}</span> {numbered[2]}
                    </>
                ) : (
                    title
                )}
            </h2>
            <div className="space-y-4">{children}</div>
        </section>
    );
}
