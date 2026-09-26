import { artInput } from '../engine/pricing';
import { NumberField, SelectField, buttonClass } from './Fields';

export default function PaperPicker({ role, input, config, printConfig, onChange }) {
    const label = role === 'wrap' ? 'áo' : 'lót';
    const set = (key, value) => onChange({ ...input, [role + key]: value });
    const art = artInput(input, config, printConfig, role);
    const updateArt = (key, value) => set('ArtInput', { ...art, [key]: value });
    return (
        <div className="space-y-3">
            <SelectField
                label={`Nguồn giấy ${label}`}
                value={input[role + 'Source']}
                onChange={(v) => set('Source', v)}
            >
                <option value="ream">Giấy ram từ KTS</option>
                <option value="art">Giấy mỹ thuật</option>
            </SelectField>
            {input[role + 'Source'] === 'ream' ? (
                <div className="grid grid-cols-2 gap-3">
                    <SelectField
                        label={`Loại giấy ${label}`}
                        value={input[role + 'Paper']}
                        onChange={(v) => set('Paper', Number(v))}
                    >
                        {printConfig.PAPER_STOCK_DATA.map((p, i) =>
                            p.pricingModel === 'ream' && !p.hidden ? (
                                <option key={i} value={i}>
                                    {p.name}
                                </option>
                            ) : null
                        )}
                    </SelectField>
                    <SelectField
                        label={`Khổ giấy ram ${label}`}
                        value={input[role + 'Stock']}
                        onChange={(v) => set('Stock', Number(v))}
                    >
                        {printConfig.STANDARD_LARGE_SHEET_SIZES.map((p, i) => (
                            <option key={i} value={i}>
                                {p.name || `${p.w} × ${p.h} cm`}
                            </option>
                        ))}
                    </SelectField>
                </div>
            ) : (
                <>
                    <SelectField
                        label={`Loại mỹ thuật ${label}`}
                        value={input[role + 'Art']}
                        onChange={(v) =>
                            onChange({
                                ...input,
                                [role + 'Art']: Number(v),
                                [role + 'ArtInput']: null,
                            })
                        }
                    >
                        {config.artPapers.map((p, i) => (
                            <option key={i} value={i}>
                                {p.name}
                            </option>
                        ))}
                    </SelectField>
                    <SelectField
                        label={`Khổ mỹ thuật ${label}`}
                        value={art.size}
                        onChange={(v) => updateArt('size', v)}
                    >
                        {printConfig.ART_PAPER_LARGE_SHEET_SIZES.map((p, i) =>
                            typeof p.w === 'number' ? (
                                <option key={i} value={String(i)}>
                                    {p.name || `${p.w} × ${p.h} cm`}
                                </option>
                            ) : null
                        )}
                        <option value="custom">Khổ tùy chọn</option>
                    </SelectField>
                    {art.size === 'custom' && (
                        <div className="grid grid-cols-2 gap-3">
                            <NumberField
                                label={`Ngang giấy mỹ thuật ${label} (cm)`}
                                value={art.w}
                                onChange={(v) => updateArt('w', v)}
                            />
                            <NumberField
                                label={`Dài giấy mỹ thuật ${label} (cm)`}
                                value={art.h}
                                onChange={(v) => updateArt('h', v)}
                            />
                        </div>
                    )}
                    <NumberField
                        label={`Giá vốn 1 tờ mỹ thuật ${label} (đ)`}
                        value={art.cost}
                        onChange={(v) => updateArt('cost', v)}
                    />
                </>
            )}
            {role === 'liner' && input.wrapSource === 'art' && (
                <button
                    type="button"
                    className={buttonClass}
                    onClick={() =>
                        onChange({
                            ...input,
                            linerSource: 'art',
                            linerArt: input.wrapArt,
                            linerArtInput: { ...artInput(input, config, printConfig, 'wrap') },
                        })
                    }
                >
                    Dùng giấy mỹ thuật của áo
                </button>
            )}
            <p className="text-xs text-gray-400">
                {role === 'wrap'
                    ? 'Giấy áo và giấy lót được chọn độc lập.'
                    : 'Giấy lót không in; giá bán bằng vốn × ' +
                      config.geometry.linerSaleFactor +
                      ', cộng một lần vào giá đế.'}
            </p>
        </div>
    );
}
