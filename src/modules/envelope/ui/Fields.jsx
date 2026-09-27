import { useId } from 'react';

// Ô nhập dùng riêng cho bao thư (cùng kiểu dáng lịch bàn, thêm báo lỗi ngay tại ô).
export const fieldClass =
    'w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-gray-200';
export const buttonClass =
    'bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 py-2 rounded text-sm font-medium transition disabled:opacity-40';

function ErrorText({ error }) {
    return error ? <p className="text-xs text-red-400 mt-1">{error}</p> : null;
}

export function NumberField({ label, value, onChange, min = 0, step = 'any', error }) {
    const id = useId();
    const unit = label.match(/\((cm|mm|đ)\)$/)?.[1];
    return (
        <div>
            <label htmlFor={id}>{unit ? label.replace(/\s*\((cm|mm|đ)\)$/, '') : label}</label>
            <div className="relative">
                <input
                    id={id}
                    aria-label={label}
                    aria-invalid={Boolean(error)}
                    type="number"
                    min={min}
                    step={step}
                    value={Number.isNaN(value) ? '' : value}
                    onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                    className={
                        (unit ? fieldClass + ' pr-12' : fieldClass) +
                        (error ? ' border-red-500' : '')
                    }
                />
                {unit && <span className="unit">{unit}</span>}
            </div>
            <ErrorText error={error} />
        </div>
    );
}

export function SelectField({ label, value, onChange, children, error }) {
    const id = useId();
    return (
        <div>
            <label htmlFor={id}>{label}</label>
            <select
                id={id}
                aria-label={label}
                aria-invalid={Boolean(error)}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={fieldClass + (error ? ' border-red-500' : '')}
            >
                {children}
            </select>
            <ErrorText error={error} />
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
                        <span className="text-lime-400">{numbered[1]}</span> {numbered[2]}
                    </>
                ) : (
                    title
                )}
            </h2>
            <div className="space-y-4">{children}</div>
        </section>
    );
}
