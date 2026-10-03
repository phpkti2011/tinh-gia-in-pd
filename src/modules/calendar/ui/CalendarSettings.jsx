import { useState } from 'react';
import { materialAllowed, artAllowed, isPlasticDecal } from '../config/wrapperMaterials';
import { DEFAULT_CONFIG } from '../../small-print/config/defaultConfig';
import { MATERIAL_LABELS, DEFAULT_CARTON_SHEET } from '../config/defaultConfig';
import { validateCalendarConfig } from '../config/schema';
import { normalizeCalendarConfig, withStockMirror } from '../config/normalize';
import {
    NumberField,
    SelectField,
    Section,
    fieldClass,
    buttonClass,
    formatPerCm2,
    formatRatio,
} from './Fields';

const GEOMETRY_FIELDS = [
    ['machine', 'Khổ ngang máy cắt (cm)'],
    ['allowance', 'Bù mỗi kích thước carton (mm)'],
    ['strip', 'Rộng thanh chân (cm)'],
    ['largeCount', 'Số mặt carton / đế'],
    ['smallCount', 'Số thanh chân / đế'],
    ['trim', 'Xén biên tấm carton (cm)'],
    ['gap', 'Khoảng cách phôi carton (cm)'],
    ['wrapPadW', 'Áo: cộng chiều ngang (cm)'],
    ['wrapFactor', 'Áo: hệ số nhân H'],
    ['wrapPadH', 'Áo: cộng chiều dài (cm)'],
    ['wrapCopies', 'Số áo / đế'],
    ['wrapPrintInset', 'Áo: chừa mỗi mép in (mm)'],
    ['linerReduceW', 'Lót: trừ chiều ngang (mm)'],
    ['linerFactor', 'Lót: hệ số nhân H'],
    ['linerPadH', 'Lót: phần cộng 1 (cm)'],
    ['linerBaseH', 'Lót: phần cộng 2 (cm)'],
    ['linerReduceH', 'Lót: trừ chiều dài (mm)'],
    ['lamSides', 'Số mặt cán áo C150 / decal (1–2)'],
    ['baseMin', 'Giá carton tối thiểu khi làm 1 đế (đ)'],
];

const GEOMETRY_GROUPS = [
    {
        title: 'Carton — phôi đế và máy cắt',
        keys: [
            'machine',
            'allowance',
            'strip',
            'largeCount',
            'smallCount',
            'trim',
            'gap',
            'baseMin',
        ],
    },
    {
        title: 'Áo bọc — khổ giấy và vùng in',
        keys: ['wrapPadW', 'wrapFactor', 'wrapPadH', 'wrapCopies', 'wrapPrintInset', 'lamSides'],
    },
    {
        title: 'Giấy lót — khổ giấy bên trong',
        keys: ['linerReduceW', 'linerFactor', 'linerPadH', 'linerBaseH', 'linerReduceH'],
    },
];

function GeometryFormula({ group, geometry: g, cartons }) {
    const n = (value) =>
        Number.isFinite(value) ? value.toLocaleString('vi-VN', { maximumFractionDigits: 6 }) : '…';
    return (
        <div className="rounded-lg border border-cyan-800 bg-gray-900/60 p-4 text-sm text-cyan-100 space-y-2">
            <p className="font-semibold">Công thức đang áp dụng · kích thước tính bằng cm</p>
            {group === 0 ? (
                <>
                    <p>
                        Mặt carton: (W + {n(g.allowance / 10)}) × (H + {n(g.allowance / 10)}) cm ·{' '}
                        {n(g.largeCount)} mặt/đế.
                    </p>
                    <p>
                        Thanh chân: (W + {n(g.allowance / 10)}) × ({n(g.strip)} +{' '}
                        {n(g.allowance / 10)}) cm · {n(g.smallCount)} thanh/đế.
                    </p>
                    <p>
                        Tấm dùng để xếp phôi: (ngang − 2 × {n(g.trim)}) × (dài − 2 × {n(g.trim)})
                        cm; khoảng cách phôi {n(g.gap)} cm. Ngang và dài lấy theo{' '}
                        <strong>loại carton đang chọn</strong> ở màn tính giá — khai trong “Bảng giá
                        carton lạnh” bên dưới.
                    </p>
                    <p className="text-gray-300">
                        Khổ đang khai:{' '}
                        {cartons.map((p) => `${p.name} ${n(p.w)} × ${n(p.h)} cm`).join(' · ')}.
                    </p>
                    <p className="text-gray-300">
                        Bù {n(g.allowance)} mm = {n(g.allowance / 10)} cm, cộng một lần vào mỗi kích
                        thước. Cạnh nạp không được vượt khổ ngang máy. Giá tối thiểu carton chỉ áp
                        cho giá khách khi làm đúng 1 đế.
                    </p>
                </>
            ) : group === 1 ? (
                <>
                    <p>Ngang áo = W + {n(g.wrapPadW)} cm.</p>
                    <p>
                        Dài áo = {n(g.wrapFactor)} × H + {n(g.wrapPadH)} cm.
                    </p>
                    <p>
                        Vùng in áo = (ngang áo − 2 × {n(g.wrapPrintInset / 10)}) × (dài áo − 2 ×{' '}
                        {n(g.wrapPrintInset / 10)}) cm.
                    </p>
                    <p>
                        Số áo = số đế × {n(g.wrapCopies)}; áo C150/decal cán{' '}
                        {n(Math.max(1, g.lamSides))} mặt. Áo mỹ thuật không cán màng.
                    </p>
                    <p className="text-gray-300">
                        Chừa {n(g.wrapPrintInset)} mm ở mỗi mép in nên trừ hai mép trên mỗi chiều.
                        Khổ giấy áo vẫn giữ nguyên.
                    </p>
                </>
            ) : (
                <>
                    <p>Ngang lót = W − {n(g.linerReduceW / 10)} cm.</p>
                    <p>
                        Dài lót = {n(g.linerFactor)} × H + {n(g.linerPadH)} + {n(g.linerBaseH)} −{' '}
                        {n(g.linerReduceH / 10)} cm.
                    </p>
                    <p>Số lót = số đế × {n(g.linerCopies)}.</p>
                    <p className="text-gray-300">
                        Các khoản trừ mm được chia 10 để đổi sang cm; trừ một lần mỗi chiều. Định
                        mức số lót và hệ số bán nằm trong mục Giá giấy lót trong.
                    </p>
                </>
            )}
        </div>
    );
}

export default function CalendarSettings({
    config,
    printConfig = DEFAULT_CONFIG,
    onSave,
    onCancel,
    onReload,
    syncReady,
}) {
    const [draft, setDraft] = useState(() =>
            structuredClone(
                normalizeCalendarConfig({
                    ...config,
                    allowedMaterials:
                        config.allowedMaterials ??
                        Object.fromEntries(
                            ['wrap', 'liner'].map((role) => [
                                role,
                                [
                                    ...printConfig.PAPER_STOCK_DATA.filter((p) =>
                                        materialAllowed(config, role, p)
                                    ).map((p) => p.name),
                                    ...(artAllowed(config, role) ? ['art'] : []),
                                    ...(role === 'liner' &&
                                    !printConfig.PAPER_STOCK_DATA.some((p) => p.name === 'F120')
                                        ? ['F120']
                                        : []),
                                ],
                            ])
                        ),
                })
            )
        ),
        [status, setStatus] = useState(''),
        [saving, setSaving] = useState(false);
    const update = (fn) =>
        setDraft((prev) => {
            const next = structuredClone(prev);
            fn(next);
            return next;
        });
    const addType = (key) =>
        update((c) => {
            let n = c.materials[key].length + 1;
            while (c.materials[key].some((p) => p.name === `${MATERIAL_LABELS[key][0]} ${n}`)) n++;
            c.materials[key].push({
                name: `${MATERIAL_LABELS[key][0]} ${n}`,
                ...(key === 'carton'
                    ? {
                          w: c.materials.carton[0]?.w ?? DEFAULT_CARTON_SHEET.w,
                          h: c.materials.carton[0]?.h ?? DEFAULT_CARTON_SHEET.h,
                      }
                    : {}),
                tiers: [{ from: 1, cost: 0, sale: 0 }],
            });
            c.pricesConfirmed = false;
        });
    const save = async () => {
        // Bản sao geometry.stockW/stockH chạy theo loại carton đầu tiên; phải cập nhật
        // TRƯỚC khi kiểm tra, nếu không lỗi sẽ phát ra từ ô đã gỡ khỏi giao diện.
        const next = withStockMirror(draft);
        const valid = validateCalendarConfig(next);
        if (!valid.isValid) {
            setStatus(valid.errors.join(' '));
            return;
        }
        setSaving(true);
        setStatus('Đang lưu…');
        try {
            const r = await onSave(next);
            setStatus(
                r.cloud
                    ? 'Đã lưu và đồng bộ bảng giá lịch.'
                    : r.local
                      ? `Đã giữ bản nháp; chưa đồng bộ và chưa áp dụng để báo giá. Phần mềm sẽ tự thử đồng bộ lại. ${r.error || ''}`
                      : `Chưa lưu được. ${r.error || ''}`
            );
        } catch (error) {
            setStatus(error.message);
        } finally {
            setSaving(false);
        }
    };
    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt giá lịch bàn</h2>
                <div className="flex items-center gap-3">
                    {onReload && (
                        <button disabled={saving} className={buttonClass} onClick={onReload}>
                            Nạp bảng giá đã đồng bộ để chỉnh lại
                        </button>
                    )}
                    <button disabled={saving} className={buttonClass} onClick={onCancel}>
                        Về tính giá
                    </button>
                    <button
                        disabled={saving}
                        className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium disabled:opacity-40"
                        onClick={save}
                    >
                        Lưu cài đặt lịch
                    </button>
                </div>
            </div>
            {status && (
                <p role="status" className="border border-gray-600 rounded-lg p-3 mb-4 text-sm">
                    {syncReady && status.startsWith('Đã giữ bản nháp')
                        ? 'Bản nháp đã được tự động đồng bộ với máy chủ.'
                        : status}
                </p>
            )}
            <fieldset disabled={saving} className="space-y-5">
                <Section title="Vật liệu được phép dùng cho áo và lót">
                    <p className="text-sm text-gray-300">
                        Tích riêng cho từng phần. Lót mặc định C150, F120. Giá giấy lấy từ danh mục
                        hiện hành; muốn dùng giấy mới, khai báo giấy và giá trước. Giấy dày từ C200
                        thường không phù hợp bồi đế.
                    </p>
                    {['wrap', 'liner'].map((role) => (
                        <div key={role} className="space-y-3">
                            <h3 className="font-semibold text-cyan-300">
                                {role === 'wrap' ? 'Giấy áo' : 'Giấy lót'}
                            </h3>
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {[
                                    ...printConfig.PAPER_STOCK_DATA.filter(
                                        (p) =>
                                            !p.hidden &&
                                            (p.pricingModel === 'ream' || isPlasticDecal(p))
                                    ).map((p) => p.name),
                                    'art',
                                ].map((name) => (
                                    <label key={name} className="flex gap-2 items-center">
                                        <input
                                            type="checkbox"
                                            checked={draft.allowedMaterials[role].includes(name)}
                                            onChange={(e) =>
                                                update((c) => {
                                                    c.allowedMaterials[role] = e.target.checked
                                                        ? [...c.allowedMaterials[role], name]
                                                        : c.allowedMaterials[role].filter(
                                                              (n) => n !== name
                                                          );
                                                })
                                            }
                                        />
                                        {role === 'wrap' ? 'Áo' : 'Lót'}:{' '}
                                        {name === 'art' ? 'Giấy mỹ thuật' : name}
                                    </label>
                                ))}
                            </div>
                        </div>
                    ))}
                    {!printConfig.PAPER_STOCK_DATA.some((p) => /^F\s*120$/i.test(p.name)) && (
                        <p className="text-amber-300 text-sm">
                            Chưa thấy F120 trong bảng KTS đang tải. Nếu đã thêm F120, hãy kiểm tra
                            đã lưu và đồng bộ bảng KTS, rồi nạp lại bảng giá lịch.
                        </p>
                    )}
                </Section>
                <Section title="Quy tắc bán giấy áo">
                    <div className="grid md:grid-cols-2 gap-4">
                        <SelectField
                            label="Áo có in: cách báo khách"
                            value={draft.wrapperSale.printed}
                            onChange={(v) =>
                                update((c) => {
                                    c.wrapperSale.printed = v;
                                })
                            }
                        >
                            <option value="unset">Chưa thiết lập</option>
                            <option value="kts-total">
                                Giấy + in: toàn bộ giá KTS theo vùng in
                            </option>
                            <option value="print-plus-paper">
                                Tiền in KTS + giấy áo theo hệ số vốn
                            </option>
                        </SelectField>
                        <SelectField
                            label="Áo không in: cách bán giấy"
                            value={draft.wrapperSale.blank}
                            onChange={(v) =>
                                update((c) => {
                                    c.wrapperSale.blank = v;
                                })
                            }
                        >
                            <option value="unset">Chưa thiết lập</option>
                            <option value="cost-factor">Giá vốn giấy × hệ số</option>
                            <option value="included">Đã gộp trong đơn giá đế/carton</option>
                        </SelectField>
                        <NumberField
                            label="Hệ số giá bán giấy áo trên vốn"
                            value={draft.wrapperSale.paperFactor}
                            onChange={(v) =>
                                update((c) => {
                                    c.wrapperSale.paperFactor = v;
                                })
                            }
                        />
                    </div>
                    <p className="text-sm text-gray-400">
                        Cán màng tính riêng. Giá ram KTS chỉ là giá vốn; không dùng giá ram làm giá
                        báo khách. Chọn “toàn bộ giá KTS” thì không cộng giấy/in thêm lần nữa.
                    </p>
                </Section>
                <Section title="Giá giấy lót trong">
                    <p className="text-sm text-gray-300">
                        Lót không in: giá khách = giá vốn giấy × hệ số bên dưới. Lót có in dùng tổng
                        giá giấy + in KTS, không cộng lại hệ số này. Cán lót tính riêng theo loại
                        màng đã chọn, cộng một lần vào giá đế.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        <NumberField
                            label="Lót: hệ số giá bán trên vốn"
                            value={draft.geometry.linerSaleFactor}
                            onChange={(value) =>
                                update((c) => {
                                    c.geometry.linerSaleFactor = value;
                                })
                            }
                        />
                        <NumberField
                            label="Số lót / đế"
                            min={1}
                            step={1}
                            value={draft.geometry.linerCopies}
                            onChange={(value) =>
                                update((c) => {
                                    c.geometry.linerCopies = value;
                                })
                            }
                        />
                    </div>
                    <p className="text-sm text-cyan-300">
                        Ví dụ tổng vốn giấy lót 10.000 đ → giá báo khách{' '}
                        {Number.isFinite(draft.geometry.linerSaleFactor)
                            ? (10000 * draft.geometry.linerSaleFactor).toLocaleString('vi-VN') +
                              ' đ'
                            : '—'}
                        .
                    </p>
                    <div className="text-sm text-gray-400 space-y-2">
                        <p>
                            <strong className="text-gray-200">Giấy ram:</strong> lấy giá vốn từ bảng
                            giá ram của In KTS khổ nhỏ. Sửa giá ram tại Cài Đặt của module KTS.
                        </p>
                        <p>
                            <strong className="text-gray-200">Giấy mỹ thuật:</strong> nhập giá vốn
                            mỗi tờ trong{' '}
                            <a className="text-cyan-400 underline" href="#calendar-art-papers">
                                Danh mục giấy mỹ thuật
                            </a>{' '}
                            bên dưới, hoặc ô giá giấy lót khi tính đơn hàng (admin).
                        </p>
                        <p>
                            Chọn giấy lót riêng ở mục “4. Giấy lót trong” trên màn Tính Giá. Giá vốn
                            dựa vào số tờ giấy nguyên cần dùng theo khổ lót và khổ giấy đã chọn.
                        </p>
                    </div>
                </Section>
                <Section title="Kích thước và định mức">
                    <p className="text-sm text-gray-300">
                        W là chiều ngang, H là chiều cao của lịch theo hướng ngang/dọc đã chọn ở màn
                        tính giá. Công thức bên dưới cập nhật theo thông số đang nhập; 10 mm = 1 cm.
                    </p>
                    {GEOMETRY_GROUPS.map((group, index) => (
                        <div
                            key={group.title}
                            className="border border-gray-600 rounded-xl p-4 sm:p-5 space-y-4"
                        >
                            <h3 className="text-lg font-semibold text-cyan-300">{group.title}</h3>
                            <GeometryFormula
                                group={index}
                                geometry={draft.geometry}
                                cartons={draft.materials.carton}
                            />
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {group.keys.map((key) => {
                                    const label = GEOMETRY_FIELDS.find(([id]) => id === key)[1];
                                    return (
                                        <NumberField
                                            key={key}
                                            label={label}
                                            value={draft.geometry[key]}
                                            onChange={(v) =>
                                                update((c) => {
                                                    c.geometry[key] = v;
                                                })
                                            }
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </Section>
                {Object.entries(MATERIAL_LABELS).map(([key, [title, costLabel, saleLabel]]) => (
                    <Section key={key} title={`Bảng giá ${title.toLowerCase()}`}>
                        <p className="text-sm text-gray-400">
                            {key === 'carton'
                                ? 'Vốn tra theo số tấm nguyên; báo khách tra theo số cuốn.'
                                : 'Tra bậc theo số cuốn.'}{' '}
                            Mốc “Từ” áp dụng tới trước mốc tiếp theo. Bậc cuối không giới hạn.
                        </p>
                        {key === 'carton' && (
                            <p className="text-sm text-gray-400">
                                Mỗi loại carton khai khổ tấm nguyên của riêng nó.{' '}
                                <strong>Ngang</strong> là cạnh đưa vào máy cắt, phải ≤ khổ ngang máy
                                ({draft.geometry.machine} cm) — phần mềm không tự xoay tấm nguyên.
                                Loại đang chọn ở màn tính giá quyết định sơ đồ cắt và số tấm.
                            </p>
                        )}
                        {draft.materials[key].map((material, i) => (
                            <div
                                key={i}
                                className="border border-gray-600 rounded-lg p-3 space-y-3"
                            >
                                <div className="flex gap-3">
                                    <label className="flex-1 text-sm">
                                        Tên loại {title.toLowerCase()} {i + 1}
                                        <input
                                            aria-label={`Tên ${key} ${i + 1}`}
                                            className={fieldClass}
                                            value={material.name}
                                            onChange={(e) =>
                                                update((c) => {
                                                    c.materials[key][i].name = e.target.value;
                                                })
                                            }
                                        />
                                    </label>
                                    <button
                                        disabled={draft.materials[key].length === 1}
                                        className={buttonClass}
                                        onClick={() =>
                                            update((c) => {
                                                c.materials[key].splice(i, 1);
                                            })
                                        }
                                    >
                                        Xóa loại
                                    </button>
                                </div>
                                {key === 'carton' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <NumberField
                                            label={`Ngang tấm carton ${i + 1} (cm)`}
                                            value={material.w}
                                            onChange={(v) =>
                                                update((c) => {
                                                    c.materials.carton[i].w = v;
                                                })
                                            }
                                        />
                                        <NumberField
                                            label={`Dài tấm carton ${i + 1} (cm)`}
                                            value={material.h}
                                            onChange={(v) =>
                                                update((c) => {
                                                    c.materials.carton[i].h = v;
                                                })
                                            }
                                        />
                                    </div>
                                )}
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Từ số lượng</th>
                                                <th>{costLabel}</th>
                                                <th>{saleLabel}</th>
                                                {key === 'carton' && (
                                                    <>
                                                        <th>Vốn / cm² tấm nguyên</th>
                                                        <th>Khách / Vốn</th>
                                                    </>
                                                )}
                                                <th />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {material.tiers.map((tier, j) => (
                                                <tr key={j}>
                                                    {['from', 'cost', 'sale'].map((field) => (
                                                        <td key={field} className="p-1">
                                                            <input
                                                                aria-label={`${key} ${i + 1} bậc ${j + 1} ${field}`}
                                                                className={fieldClass + ' min-w-24'}
                                                                type="number"
                                                                min={field === 'from' ? 1 : 0}
                                                                step={field === 'from' ? 1 : 'any'}
                                                                value={
                                                                    Number.isNaN(tier[field])
                                                                        ? ''
                                                                        : tier[field]
                                                                }
                                                                onChange={(e) =>
                                                                    update((c) => {
                                                                        c.materials[key][i].tiers[
                                                                            j
                                                                        ][field] =
                                                                            e.target.value === ''
                                                                                ? NaN
                                                                                : Number(
                                                                                      e.target.value
                                                                                  );
                                                                    })
                                                                }
                                                            />
                                                        </td>
                                                    ))}
                                                    {key === 'carton' &&
                                                        (() => {
                                                            const area = material.w * material.h;
                                                            const unit =
                                                                area > 0 &&
                                                                Number.isFinite(tier.cost)
                                                                    ? tier.cost / area
                                                                    : NaN;
                                                            return (
                                                                <>
                                                                    <td
                                                                        className="p-1 text-right"
                                                                        data-testid={`carton-${i}-tier-${j}-cost-per-cm2`}
                                                                    >
                                                                        {formatPerCm2(unit)}
                                                                    </td>
                                                                    <td
                                                                        className="p-1 text-right"
                                                                        data-testid={`carton-${i}-tier-${j}-ratio`}
                                                                    >
                                                                        {formatRatio(
                                                                            unit > 0 &&
                                                                                Number.isFinite(
                                                                                    tier.sale
                                                                                )
                                                                                ? tier.sale / unit
                                                                                : NaN
                                                                        )}
                                                                    </td>
                                                                </>
                                                            );
                                                        })()}
                                                    <td>
                                                        <button
                                                            className={buttonClass}
                                                            disabled={j === 0}
                                                            onClick={() =>
                                                                update((c) => {
                                                                    c.materials[key][
                                                                        i
                                                                    ].tiers.splice(j, 1);
                                                                })
                                                            }
                                                        >
                                                            Xóa bậc
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <button
                                    className={buttonClass}
                                    onClick={() =>
                                        update((c) => {
                                            const rows = c.materials[key][i].tiers,
                                                last = rows[rows.length - 1];
                                            rows.push({
                                                ...last,
                                                from: last.from < 100 ? 100 : last.from + 100,
                                            });
                                        })
                                    }
                                >
                                    + Thêm bậc {title.toLowerCase()}
                                </button>
                                {key === 'carton' && (
                                    <p className="text-xs text-gray-400">
                                        Hai cột bên phải chỉ để <strong>đối chiếu</strong>, không
                                        nhập được. <strong>Vốn / cm²</strong> = vốn một tấm ÷ (ngang
                                        × dài) của tấm <strong>nguyên</strong> — chưa trừ hao khi
                                        cắt phôi và chưa tính phần bù {draft.geometry.allowance} mm
                                        mỗi chiều, nên vốn thật trên mỗi cm²{' '}
                                        <strong>thành phẩm</strong> luôn cao hơn con số này.{' '}
                                        <strong>Khách / Vốn</strong> là số lần giá khách mỗi cm²
                                        thành phẩm so với vốn mỗi cm² tấm nguyên.
                                    </p>
                                )}
                            </div>
                        ))}
                        <button className={buttonClass} onClick={() => addType(key)}>
                            + Thêm loại {title.toLowerCase()}
                        </button>
                    </Section>
                ))}
                <div id="calendar-art-papers">
                    <Section title="Danh mục giấy mỹ thuật">
                        {draft.artPapers.map((p, i) => (
                            <div
                                key={i}
                                className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 border-b border-gray-600 pb-3"
                            >
                                <label className="text-sm">
                                    Tên giấy
                                    <input
                                        aria-label={`Tên giấy mỹ thuật ${i + 1}`}
                                        className={fieldClass}
                                        value={p.name}
                                        onChange={(e) =>
                                            update((c) => {
                                                c.artPapers[i].name = e.target.value;
                                            })
                                        }
                                    />
                                </label>
                                {[
                                    ['w', 'Ngang (cm)'],
                                    ['h', 'Dài (cm)'],
                                    ['cost', 'Vốn / tờ (đ)'],
                                ].map(([key, label]) => (
                                    <NumberField
                                        key={key}
                                        label={`${label} · giấy ${i + 1}`}
                                        value={p[key]}
                                        onChange={(v) =>
                                            update((c) => {
                                                c.artPapers[i][key] = v;
                                            })
                                        }
                                    />
                                ))}
                                <button
                                    className={buttonClass}
                                    disabled={draft.artPapers.length === 1}
                                    onClick={() =>
                                        update((c) => {
                                            c.artPapers.splice(i, 1);
                                        })
                                    }
                                >
                                    Xóa giấy
                                </button>
                            </div>
                        ))}
                        <button
                            className={buttonClass}
                            onClick={() =>
                                update((c) => {
                                    let n = c.artPapers.length + 1;
                                    while (c.artPapers.some((p) => p.name === `Giấy mỹ thuật ${n}`))
                                        n++;
                                    c.artPapers.push({
                                        name: `Giấy mỹ thuật ${n}`,
                                        w: 70,
                                        h: 100,
                                        cost: 0,
                                    });
                                    c.pricesConfirmed = false;
                                })
                            }
                        >
                            + Thêm giấy mỹ thuật
                        </button>
                        <p className="text-sm text-gray-400">
                            Đây là thông số điền sẵn. Khi tính giá, áo và lót có ô khổ chuẩn/tùy
                            chọn và giá tờ riêng.
                        </p>
                    </Section>
                </div>
                <Section title="Xác nhận bảng giá">
                    <label className="flex gap-3 items-start">
                        <input
                            type="checkbox"
                            checked={draft.pricesConfirmed}
                            onChange={(e) =>
                                update((c) => {
                                    c.pricesConfirmed = e.target.checked;
                                })
                            }
                        />
                        <span>
                            Tôi đã kiểm tra giá vật tư lịch và dùng bảng giá này để báo khách.
                        </span>
                    </label>
                    <p className="text-sm text-gray-400">
                        Các giá vật tư ban đầu chỉ là mẫu từ bản demo. Giá giấy ram, in tờ lịch/in
                        áo và ép kim được đọc từ cài đặt KTS khổ nhỏ.
                    </p>
                </Section>
            </fieldset>
            <button
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium mt-6"
                onClick={save}
            >
                Lưu cài đặt lịch
            </button>
        </div>
    );
}
