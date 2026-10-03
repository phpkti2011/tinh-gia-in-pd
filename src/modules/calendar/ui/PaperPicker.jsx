import {
    materialAllowed,
    artAllowed,
    isPlasticDecal,
    decalStocks,
} from '../config/wrapperMaterials';
import { artInput } from '../engine/pricing';
import { NumberField, SelectField, buttonClass } from './Fields';

export default function PaperPicker({
    role,
    input,
    config,
    printConfig,
    onChange,
    canViewCost = false,
}) {
    const label = role === 'wrap' ? 'áo' : 'lót';
    const set = (key, value) => onChange({ ...input, [role + key]: value });
    const art = artInput(input, config, printConfig, role);
    const updateArt = (key, value) => set('ArtInput', { ...art, [key]: value });
    const stockPaper = printConfig.PAPER_STOCK_DATA[input[role + 'Paper']];
    const stocks = isPlasticDecal(stockPaper)
        ? decalStocks(printConfig)
        : printConfig.STANDARD_LARGE_SHEET_SIZES;
    return (
        <div className="space-y-3">
            <SelectField
                label={`Vật liệu giấy ${label}`}
                value={input[role + 'Source'] === 'art' ? 'art' : String(input[role + 'Paper'])}
                onChange={(v) =>
                    onChange({
                        ...input,
                        [role + 'Source']: v === 'art' ? 'art' : 'ream',
                        ...(v === 'art'
                            ? {}
                            : {
                                  [role + 'Paper']: Number(v),
                                  [role + 'Stock']: isPlasticDecal(
                                      printConfig.PAPER_STOCK_DATA[Number(v)]
                                  )
                                      ? Math.max(
                                            0,
                                            decalStocks(printConfig).findIndex((p) => p.h === 48)
                                        )
                                      : 0,
                              }),
                    })
                }
            >
                {printConfig.PAPER_STOCK_DATA.map((p, i) =>
                    materialAllowed(config, role, p) ? (
                        <option key={i} value={String(i)}>
                            {p.name}
                        </option>
                    ) : null
                )}
                {artAllowed(config, role) && <option value="art">Giấy mỹ thuật</option>}
            </SelectField>
            {input[role + 'Source'] === 'ream' ? (
                <div className="grid grid-cols-2 gap-3">
                    {role === 'wrap' && input.wrapperPrint && isPlasticDecal(stockPaper) ? (
                        <p className="text-sm text-gray-400 col-span-2">
                            Khổ decal có in được chọn tự động theo phương án in; xem khổ thực tế
                            trong sơ đồ cắt giấy áo.
                        </p>
                    ) : (
                        <SelectField
                            label={`Khổ giấy ${label}`}
                            value={input[role + 'Stock']}
                            onChange={(v) => set('Stock', Number(v))}
                        >
                            {stocks.map((p, i) => (
                                <option key={i} value={i}>
                                    {p.name || `${p.w} × ${p.h} cm`}
                                </option>
                            ))}
                        </SelectField>
                    )}
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
                    {canViewCost && (
                        <NumberField
                            label={`Giá vốn 1 tờ mỹ thuật ${label} (đ)`}
                            value={art.cost}
                            onChange={(v) => updateArt('cost', v)}
                        />
                    )}
                </>
            )}
            {role === 'wrap' &&
                (input.wrapSource === 'art' ? (
                    <div className="space-y-2">
                        <NumberField
                            label="Định lượng giấy mỹ thuật áo (gsm)"
                            value={input.wrapGsm ?? NaN}
                            min={1}
                            onChange={(v) => onChange({ ...input, wrapGsm: v })}
                        />
                        <p className="text-sm text-amber-300">
                            Chỉ dùng giấy mỹ thuật dưới 150 gsm để bồi đế. Kiểm tra định lượng trước
                            khi nhận đơn. Giấy mỹ thuật không cán màng.
                        </p>
                    </div>
                ) : (
                    <p className="text-sm text-cyan-300">
                        Áo giấy thường hoặc decal nhựa bắt buộc cán màng. Ưu tiên C150; giấy dày từ
                        C200 thường không phù hợp bồi áo.
                    </p>
                ))}
            {role === 'liner' && artAllowed(config, role) && input.wrapSource === 'art' && (
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
                    : canViewCost
                      ? 'Giấy lót không in: giá bán bằng vốn × ' +
                        config.geometry.linerSaleFactor +
                        ', cộng một lần vào giá đế.'
                      : 'Giấy lót, in và cán được tính riêng theo lựa chọn, cộng vào giá đế.'}
            </p>
        </div>
    );
}
