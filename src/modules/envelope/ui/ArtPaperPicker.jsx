import { ENVELOPE_ART_PAPERS } from '../config/defaultConfig';
import { envelopeArtPaper } from '../config/schema';
import { NumberField, SelectField } from './Fields';

export default function ArtPaperPicker({ input, config, printConfig, canViewCost, onChange }) {
    const papers = config.artPapers ?? ENVELOPE_ART_PAPERS;
    const art = envelopeArtPaper(canViewCost ? input : { ...input, artInput: null }, config);
    const update = (key, value) => onChange({ ...input, artInput: { ...art, [key]: value } });
    const sizes = (printConfig.ART_PAPER_LARGE_SHEET_SIZES ?? []).filter(
        (p) => Number.isFinite(p.w) && Number.isFinite(p.h)
    );
    const sizeIndex = sizes.findIndex((p) => p.w === art?.w && p.h === art?.h);
    return (
        <div className="space-y-3">
            <SelectField
                label="Loại giấy mỹ thuật"
                value={input.artIndex ?? 0}
                onChange={(value) =>
                    onChange({ ...input, artIndex: Number(value), artInput: null })
                }
            >
                {papers.map((p, i) => (
                    <option key={i} value={i}>
                        {p.name}
                    </option>
                ))}
            </SelectField>
            {canViewCost ? (
                <>
                    <SelectField
                        label="Khổ giấy mỹ thuật"
                        value={sizeIndex < 0 ? 'custom' : String(sizeIndex)}
                        onChange={(value) =>
                            onChange({
                                ...input,
                                artInput: {
                                    ...art,
                                    ...(value === 'custom'
                                        ? { w: NaN, h: NaN }
                                        : { w: sizes[Number(value)].w, h: sizes[Number(value)].h }),
                                },
                            })
                        }
                    >
                        {sizes.map((p, i) => (
                            <option key={i} value={i}>
                                {p.name || `${p.w} × ${p.h} cm`}
                            </option>
                        ))}
                        <option value="custom">Khổ tùy chọn</option>
                    </SelectField>
                    <div className="grid grid-cols-2 gap-3">
                        <NumberField
                            label="Ngang giấy mỹ thuật (cm)"
                            value={art?.w ?? NaN}
                            onChange={(v) => update('w', v)}
                        />
                        <NumberField
                            label="Dài giấy mỹ thuật (cm)"
                            value={art?.h ?? NaN}
                            onChange={(v) => update('h', v)}
                        />
                    </div>
                    <NumberField
                        label="Giá vốn mỗi tờ mỹ thuật (đ)"
                        value={art?.cost ?? NaN}
                        onChange={(v) => update('cost', v)}
                    />
                    <p className="text-xs text-gray-400">
                        Thông số này dùng cho đơn hiện tại. Để dùng chung cho mọi người, lưu loại
                        giấy và giá trong Cài Đặt bao thư.
                    </p>
                </>
            ) : (
                <p className="text-sm text-gray-300">
                    Khổ giấy: {art?.w} × {art?.h} cm · dùng giá admin đã cài đặt.
                </p>
            )}
            {!(art?.cost > 0) && (
                <p role="status" className="text-sm text-amber-300">
                    Chưa có giá giấy mỹ thuật. Admin cần nhập giá mỗi tờ trong Cài Đặt.
                </p>
            )}
        </div>
    );
}
