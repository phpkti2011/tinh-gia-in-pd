import { MATERIAL_LABELS } from '../config/defaultConfig';
import { NumberField, SelectField, Section, buttonClass } from './Fields';
import PaperPicker from './PaperPicker';

export default function CalendarInput({ input: s, config, printConfig, onChange }) {
    const set = (key, value) => onChange({ ...s, [key]: value });
    const number = (key, label, min = 0, step = 'any') => (
        <NumberField
            label={label}
            value={s[key]}
            min={min}
            step={step}
            onChange={(v) => set(key, v)}
        />
    );
    const color = (key, label) => (
        <SelectField label={label} value={s[key]} onChange={(v) => set(key, v)}>
            <option value="4color">4 màu</option>
            <option value="1color">Đen trắng</option>
        </SelectField>
    );
    return (
        <div id="calendar-controls">
            <Section title="1. Quy cách lịch bàn">
                {number('n', 'Số cuốn', 1, 1)}
                <div className="grid grid-cols-2 gap-3">
                    {number('a', 'Cạnh A đế (cm)')}
                    {number('b', 'Cạnh B đế (cm)')}
                </div>
                <SelectField
                    label="Hướng lịch"
                    value={s.orientation}
                    onChange={(v) => set('orientation', v)}
                >
                    <option value="landscape">Khổ ngang</option>
                    <option value="portrait">Khổ đứng</option>
                </SelectField>
                <p className="text-xs text-gray-400">
                    Khổ ngang lấy cạnh lớn làm W; khổ đứng lấy cạnh nhỏ làm W. H là chiều cao mỗi
                    mặt đế.
                </p>
            </Section>
            <Section title="2. Tờ lịch in KTS">
                <div className="grid grid-cols-2 gap-3">
                    {number('leaves', 'Số tờ / cuốn', 1, 1)}
                    <SelectField
                        label="Mặt in tờ lịch"
                        value={s.sides}
                        onChange={(v) => set('sides', Number(v))}
                    >
                        <option value="1">1 mặt</option>
                        <option value="2">2 mặt</option>
                    </SelectField>
                    {number('leafW', 'Ngang tờ lịch (cm)')}
                    {number('leafH', 'Cao tờ lịch (cm)')}
                </div>
                <SelectField
                    label="Giấy tờ lịch"
                    value={s.paper}
                    onChange={(v) => set('paper', Number(v))}
                >
                    {printConfig.PAPER_STOCK_DATA.map((p, i) =>
                        p.pricingModel === 'ream' && !p.hidden ? (
                            <option key={i} value={i}>
                                {p.name}
                            </option>
                        ) : null
                    )}
                </SelectField>
                <div className="grid grid-cols-2 gap-3">
                    {color('leafColor', 'Màu in tờ lịch')}
                    <SelectField
                        label="Cán tờ lịch"
                        value={s.leafLam}
                        onChange={(v) => set('leafLam', Number(v))}
                    >
                        <option value="0">Không cán</option>
                        <option value="1">1 mặt</option>
                        <option value="2">2 mặt</option>
                    </SelectField>
                </div>
                {s.leafLam > 0 && (
                    <SelectField
                        label="Màng cán tờ lịch"
                        value={s.leafFilm}
                        onChange={(v) => set('leafFilm', v)}
                    >
                        <option value="">Mặc định KTS</option>
                        {(printConfig.LAMINATION_FILMS || []).map((p) => (
                            <option key={p.id} value={p.id}>
                                {p.name}
                            </option>
                        ))}
                    </SelectField>
                )}
                <p className="text-xs text-gray-400">
                    Mỗi tờ trong cuốn là một nội dung. Giá đọc từ bảng KTS hiện tại.
                </p>
            </Section>
            <Section title="3. Giấy áo ngoài">
                <PaperPicker
                    role="wrap"
                    input={s}
                    config={config}
                    printConfig={printConfig}
                    onChange={onChange}
                />
                <label className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        checked={s.wrapperPrint}
                        onChange={(e) => set('wrapperPrint', e.target.checked)}
                    />
                    In áo ngoài
                </label>
                {s.wrapperPrint && color('wrapColor', 'Màu in áo')}
                <p className="text-xs text-gray-400">
                    Vùng in chừa {config.geometry.wrapPrintInset} mm ở cả bốn mép; giá giấy tính đủ
                    khổ áo.
                </p>
            </Section>
            <Section title="4. Giấy lót trong">
                <PaperPicker
                    role="liner"
                    input={s}
                    config={config}
                    printConfig={printConfig}
                    onChange={onChange}
                />
            </Section>
            <Section title="5. Vật tư và gia công">
                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(MATERIAL_LABELS).map(([key, [name]]) => (
                        <SelectField
                            key={key}
                            label={name}
                            value={s.selected[key]}
                            onChange={(v) => set('selected', { ...s.selected, [key]: Number(v) })}
                        >
                            {config.materials[key].map((p, i) => (
                                <option key={i} value={i}>
                                    {p.name}
                                </option>
                            ))}
                        </SelectField>
                    ))}
                </div>
                <label className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        checked={s.foil}
                        onChange={(e) => set('foil', e.target.checked)}
                    />
                    Ép kim đế lịch
                </label>
                {s.foil && (
                    <div className="space-y-3">
                        {s.molds.map((m, i) => {
                            const mold = (key, value) =>
                                set(
                                    'molds',
                                    s.molds.map((t, j) => (i === j ? { ...t, [key]: value } : t))
                                );
                            return (
                                <div
                                    key={i}
                                    className="border border-gray-600 rounded-lg p-3 space-y-2"
                                >
                                    <h3>Khuôn {i + 1}</h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <NumberField
                                            label={`Ngang khuôn ${i + 1} (cm)`}
                                            value={m.w}
                                            onChange={(v) => mold('w', v)}
                                        />
                                        <NumberField
                                            label={`Cao khuôn ${i + 1} (cm)`}
                                            value={m.h}
                                            onChange={(v) => mold('h', v)}
                                        />
                                    </div>
                                    <NumberField
                                        label={`Số lần ép khuôn ${i + 1}`}
                                        value={m.impressions}
                                        min={1}
                                        step={1}
                                        onChange={(v) => mold('impressions', v)}
                                    />
                                    <label className="flex gap-2">
                                        <input
                                            type="checkbox"
                                            checked={m.special}
                                            onChange={(e) => mold('special', e.target.checked)}
                                        />
                                        Màu đặc biệt
                                    </label>
                                    <button
                                        type="button"
                                        className={buttonClass}
                                        disabled={s.molds.length === 1}
                                        onClick={() =>
                                            set(
                                                'molds',
                                                s.molds.filter((_, j) => j !== i)
                                            )
                                        }
                                    >
                                        Xóa khuôn {i + 1}
                                    </button>
                                </div>
                            );
                        })}
                        <button
                            type="button"
                            className={buttonClass}
                            onClick={() =>
                                set('molds', [
                                    ...s.molds,
                                    { w: 6, h: 3, impressions: 1, special: false },
                                ])
                            }
                        >
                            + Thêm khuôn
                        </button>
                        <p className="text-xs text-gray-400">
                            Giá và cài đặt ép kim được quản lý tại In KTS khổ nhỏ.
                        </p>
                    </div>
                )}
            </Section>
        </div>
    );
}
