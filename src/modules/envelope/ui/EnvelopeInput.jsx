import { NumberField, SelectField, Section, buttonClass } from './Fields';
import { allowedPapers } from '../config/schema';
import { CONSTRUCTION_LABELS, FLAP_EDGE_LABELS, convertUnit } from '../engine/layout';
import ArtPaperPicker from './ArtPaperPicker';
import { ENVELOPE_SIZE_PRESETS, ENVELOPE_CUT_LABELS } from '../config/defaultConfig';

export default function EnvelopeInput({
    input: s,
    config,
    printConfig,
    errors = {},
    onChange,
    canViewCost = false,
}) {
    const set = (key, value) => onChange({ ...s, [key]: value });
    // Đổi đơn vị phải QUY ĐỔI giá trị đang nhập (35 cm → 350 mm), không giữ nguyên con số.
    const changeUnit = (unit) => {
        if (unit === s.unit) return;
        onChange({
            ...s,
            unit,
            w: convertUnit(s.w, s.unit, unit),
            h: convertUnit(s.h, s.unit, unit),
            flap: convertUnit(s.flap, s.unit, unit),
            tab: convertUnit(s.tab, s.unit, unit),
        });
    };
    const dim = (key, label) => (
        <NumberField
            label={`${label} (${s.unit})`}
            value={s[key]}
            error={errors[key]}
            onChange={(v) =>
                onChange({
                    ...s,
                    [key]: v,
                    ...(['w', 'h'].includes(key) ? { sizePreset: 'custom' } : {}),
                })
            }
        />
    );
    const papers = allowedPapers(config, printConfig);
    const presets = config.sizePresets ?? ENVELOPE_SIZE_PRESETS;
    // Nếu admin sửa/xóa khổ đang chọn, giữ kích thước đơn và hiển thị Tùy chỉnh.
    const selectedPreset = presets.find(
        (p) =>
            p.id === s.sizePreset &&
            convertUnit(p.w, 'mm', s.unit) === s.w &&
            convertUnit(p.h, 'mm', s.unit) === s.h
    );
    return (
        <div id="envelope-controls">
            <Section title="1. Kích thước bao thư">
                <SelectField
                    label="Khổ bao thư chuẩn"
                    value={selectedPreset?.id ?? 'custom'}
                    onChange={(id) => {
                        const preset = presets.find((p) => p.id === id);
                        onChange({
                            ...s,
                            sizePreset: id,
                            ...(preset
                                ? {
                                      w: convertUnit(preset.w, 'mm', s.unit),
                                      h: convertUnit(preset.h, 'mm', s.unit),
                                  }
                                : {}),
                        });
                    }}
                >
                    <option value="custom">Tùy chỉnh</option>
                    {presets.map((p) => (
                        <option key={p.id} value={p.id}>
                            {p.name?.trim() ? `${p.name.trim()} · ` : ''}
                            {p.w} × {p.h} mm
                        </option>
                    ))}
                </SelectField>
                <SelectField label="Đơn vị nhập" value={s.unit} onChange={changeUnit}>
                    <option value="mm">mm</option>
                    <option value="cm">cm</option>
                </SelectField>
                <div className="grid grid-cols-2 gap-3">
                    {dim('w', 'Ngang thành phẩm W')}
                    {dim('h', 'Cao thành phẩm H')}
                    {dim('flap', 'Dài nắp N')}
                    {dim('tab', 'Rộng tay dán T')}
                </div>
                <p className="text-xs text-gray-400">
                    Nắp đo từ đường gấp đến mép ngoài. Một chiều rộng tay dán dùng chung cho các tay
                    dán. W và H giữ đúng thứ tự nhập, không tự đảo cạnh dài/ngắn.
                </p>
            </Section>
            <Section title="2. Kiểu khuôn">
                <SelectField
                    label="Vị trí nắp"
                    value={s.flapEdge}
                    error={errors.flapEdge}
                    onChange={(v) => set('flapEdge', v)}
                >
                    {Object.entries(FLAP_EDGE_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>
                            {label}
                        </option>
                    ))}
                </SelectField>
                <SelectField
                    label="Kiểu khuôn"
                    value={s.construction}
                    error={errors.construction}
                    onChange={(v) =>
                        onChange({
                            ...s,
                            construction: v,
                            backPrint: v === 'split' ? s.backPrint : null,
                        })
                    }
                >
                    {Object.entries(CONSTRUCTION_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>
                            {label}
                        </option>
                    ))}
                </SelectField>
                {s.construction === 'split' && (
                    <SelectField
                        label="In mặt sau"
                        value={s.backPrint === null ? '' : s.backPrint ? 'yes' : 'no'}
                        error={errors.backPrint}
                        onChange={(v) => set('backPrint', v === '' ? null : v === 'yes')}
                    >
                        <option value="">— Chọn có in hay không —</option>
                        <option value="yes">Có in mặt sau</option>
                        <option value="no">Không in mặt sau (chỉ tính giấy)</option>
                    </SelectField>
                )}
                <p className="text-xs text-gray-400">
                    Khuôn tách: phần trước gồm mặt trước, nắp và ba tay dán; mặt sau là miếng rời
                    nhỏ hơn 3 mm mỗi chiều.
                </p>
            </Section>
            <Section title="3. Số lượng và in KTS">
                <NumberField
                    label="Số lượng bao thư"
                    value={s.quantity}
                    min={1}
                    step={1}
                    error={errors.quantity}
                    onChange={(v) => set('quantity', v)}
                />
                <SelectField
                    label="Giấy bao thư"
                    value={s.paperSource === 'art' ? 'art' : String(s.paper)}
                    error={errors.paper}
                    onChange={(v) =>
                        onChange({
                            ...s,
                            paperSource: v === 'art' ? 'art' : 'ream',
                            ...(v === 'art' ? {} : { paper: Number(v) }),
                        })
                    }
                >
                    {papers.map(({ paper, index }) => (
                        <option key={index} value={String(index)}>
                            {paper.name}
                        </option>
                    ))}
                    <option value="art">Giấy mỹ thuật</option>
                </SelectField>
                {s.paperSource === 'art' ? (
                    <ArtPaperPicker
                        input={s}
                        config={config}
                        printConfig={printConfig}
                        canViewCost={canViewCost}
                        onChange={onChange}
                    />
                ) : (
                    <>
                        <div className="grid grid-cols-2 gap-3">
                            <SelectField
                                label="Khổ giấy"
                                value={s.stock}
                                onChange={(v) => set('stock', Number(v))}
                            >
                                {(printConfig.STANDARD_LARGE_SHEET_SIZES || []).map((p, i) => (
                                    <option key={i} value={i}>
                                        {p.name || `${p.w} × ${p.h} cm`}
                                    </option>
                                ))}
                            </SelectField>
                        </div>
                    </>
                )}
                <SelectField label="Màu in" value={s.color} onChange={(v) => set('color', v)}>
                    <option value="4color">4 màu</option>
                    <option value="1color">Đen trắng</option>
                </SelectField>
                <p className="text-xs text-gray-400">
                    In 1 mặt trên khổ trải. Giá giấy, click và bảng giá khách đọc từ In KTS khổ nhỏ;
                    phí dán theo bậc trong Cài Đặt bao thư.
                </p>
            </Section>
            <Section title="4. Thành phẩm">
                <label className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        checked={s.flapTape ?? false}
                        onChange={(e) => set('flapTape', e.target.checked)}
                    />
                    Dán keo 2 mặt nắp
                </label>
                <p className="text-xs text-gray-400">
                    Tính theo chiều dài cạnh đặt nắp × số bao thư, không theo chiều cao nắp. Đơn giá
                    lấy từ Cài Đặt bao thư.
                </p>
                <SelectField
                    label="Hình thức bế"
                    value={s.dieCuttingType ?? 'mold'}
                    onChange={(v) => set('dieCuttingType', v)}
                >
                    {Object.entries(ENVELOPE_CUT_LABELS).map(([key, label]) => (
                        <option key={key} value={key}>
                            {label}
                        </option>
                    ))}
                </SelectField>
                <p className="text-xs text-gray-400">
                    Giá khuôn bao thư và công bế lấy từ In KTS khổ nhỏ, theo số tờ máy. Mặt sau rời
                    cắt thẳng, không tính thêm bế.
                </p>
            </Section>
            <Section title="5. Ép nhũ">
                <label className="flex gap-2 items-center">
                    <input
                        type="checkbox"
                        checked={s.foil}
                        onChange={(e) => set('foil', e.target.checked)}
                    />
                    Ép nhũ bao thư
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
                            Giá và cài đặt ép nhũ được quản lý tại In KTS khổ nhỏ; tính theo số bao
                            thư.
                        </p>
                    </div>
                )}
            </Section>
        </div>
    );
}
