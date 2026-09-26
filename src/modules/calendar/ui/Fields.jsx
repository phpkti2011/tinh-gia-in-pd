export const fieldClass =
    'w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400';
export const buttonClass =
    'rounded-lg border border-gray-600 px-3 py-2 text-sm hover:bg-gray-700 disabled:opacity-40';
export function NumberField({ label, value, onChange, min = 0, step = 'any' }) {
    return (
        <label className="block text-sm text-gray-300">
            {label}
            <input
                aria-label={label}
                type="number"
                min={min}
                step={step}
                value={Number.isNaN(value) ? '' : value}
                onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
                className={fieldClass}
            />
        </label>
    );
}
export function SelectField({ label, value, onChange, children }) {
    return (
        <label className="block text-sm text-gray-300">
            {label}
            <select
                aria-label={label}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={fieldClass}
            >
                {children}
            </select>
        </label>
    );
}
export function Section({ title, children }) {
    return (
        <section className="bg-gray-800 border border-gray-700 rounded-xl p-4 space-y-4">
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            {children}
        </section>
    );
}
