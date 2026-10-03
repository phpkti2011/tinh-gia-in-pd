import { useState } from 'react';
import {
    FEE_MODE_LABELS,
    ENVELOPE_ART_PAPERS,
    ENVELOPE_SIZE_PRESETS,
} from '../config/defaultConfig';
import { validateEnvelopeConfig } from '../config/schema';
import { CONSTRUCTION_LABELS, FLAP_EDGE_LABELS } from '../engine/layout';
import { NumberField, SelectField, Section, fieldClass, buttonClass } from './Fields';

const FEES = [['gluing', 'dán bao thư', 'Giá vốn (đ)', 'Giá khách (đ)']];

function TierEditor({ prefix, tiers, onChange, costLabel, saleLabel }) {
    const edit = (fn) => {
        const next = structuredClone(tiers);
        fn(next);
        onChange(next);
    };
    return (
        <div className="space-y-3">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr>
                            <th>Từ số lượng</th>
                            <th>{costLabel}</th>
                            <th>{saleLabel}</th>
                            <th>Cách tính phí</th>
                            <th />
                        </tr>
                    </thead>
                    <tbody>
                        {tiers.map((tier, j) => (
                            <tr key={j}>
                                {['from', 'cost', 'sale'].map((field) => (
                                    <td key={field} className="p-1">
                                        <input
                                            aria-label={`${prefix} bậc ${j + 1} ${field}`}
                                            className={fieldClass + ' min-w-24'}
                                            type="number"
                                            min={field === 'from' ? 1 : 0}
                                            step={field === 'from' ? 1 : 'any'}
                                            value={Number.isNaN(tier[field]) ? '' : tier[field]}
                                            onChange={(e) =>
                                                edit((rows) => {
                                                    rows[j][field] =
                                                        e.target.value === ''
                                                            ? NaN
                                                            : Number(e.target.value);
                                                })
                                            }
                                        />
                                    </td>
                                ))}
                                <td className="p-1">
                                    <select
                                        aria-label={`${prefix} bậc ${j + 1} cách tính`}
                                        className={fieldClass + ' min-w-44'}
                                        value={tier.mode}
                                        onChange={(e) =>
                                            edit((rows) => {
                                                rows[j].mode = e.target.value;
                                            })
                                        }
                                    >
                                        {Object.entries(FEE_MODE_LABELS).map(([id, label]) => (
                                            <option key={id} value={id}>
                                                {label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <button
                                        className={buttonClass}
                                        disabled={j === 0}
                                        onClick={() =>
                                            edit((rows) => {
                                                rows.splice(j, 1);
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
                    edit((rows) => {
                        const last = rows[rows.length - 1];
                        rows.push({ ...last, from: last.from < 100 ? 100 : last.from + 100 });
                    })
                }
            >
                + Thêm bậc {prefix}
            </button>
        </div>
    );
}

export default function EnvelopeSettings({
    config,
    printConfig,
    onSave,
    onCancel,
    onReload,
    syncReady,
}) {
    const [draft, setDraft] = useState(() =>
            structuredClone({
                ...config,
                artPapers: config.artPapers ?? ENVELOPE_ART_PAPERS,
                sizePresets: config.sizePresets ?? ENVELOPE_SIZE_PRESETS,
                flapTape: {
                    costPerCm: 0,
                    salePerCm: 0,
                    minCost: 0,
                    minSale: 0,
                    ...config.flapTape,
                },
                gluing: {
                    ...config.gluing,
                    tiers: config.gluing.tiers.map((tier) => ({
                        ...tier,
                        mode: tier.mode ?? config.gluing.mode,
                    })),
                },
            })
        ),
        [status, setStatus] = useState(''),
        [saving, setSaving] = useState(false);
    const update = (fn) =>
        setDraft((prev) => {
            const next = structuredClone(prev);
            fn(next);
            return next;
        });
    const reamPapers = (printConfig?.PAPER_STOCK_DATA || [])
        .map((paper, index) => ({ paper, index }))
        .filter(({ paper }) => paper.pricingModel === 'ream' && !paper.hidden);
    const allowedSet = draft.papers.allowed;
    const isAllowed = (index) => allowedSet.length === 0 || allowedSet.includes(index);
    const effective = reamPapers.filter(({ index }) => isAllowed(index));
    const togglePaper = (index, checked) =>
        update((c) => {
            const current = reamPapers.map((p) => p.index).filter(isAllowed);
            const next = checked ? [...current, index] : current.filter((i) => i !== index);
            // Rỗng có nghĩa là mọi giấy ram; luôn giữ ít nhất một giấy được chọn.
            if (!next.length) return;
            c.papers.allowed = [...new Set(next)].sort((a, b) => a - b);
            if (c.papers.allowed.length && !c.papers.allowed.includes(c.papers.defaultPaper))
                c.papers.defaultPaper = c.papers.allowed[0];
            c.pricesConfirmed = false;
        });
    const save = async () => {
        const valid = validateEnvelopeConfig(draft);
        if (!valid.isValid) {
            setStatus(valid.errors.join(' '));
            return;
        }
        setSaving(true);
        setStatus('Đang lưu…');
        try {
            const r = await onSave(draft);
            setStatus(
                r.cloud
                    ? 'Đã lưu và đồng bộ bảng giá bao thư.'
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
    const number = (path, label, min = 0, step = 'any') => {
        const get = (c) => path.reduce((o, k) => o[k], c);
        return (
            <NumberField
                label={label}
                min={min}
                step={step}
                value={get(draft)}
                onChange={(v) =>
                    update((c) => {
                        const parent = path.slice(0, -1).reduce((o, k) => o[k], c);
                        parent[path[path.length - 1]] = v;
                    })
                }
            />
        );
    };
    return (
        <div className="bg-gray-800 rounded-lg p-6 lg:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6 border-b border-gray-700 pb-4">
                <h2 className="text-2xl font-bold text-white">⚙ Cài đặt giá bao thư</h2>
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
                        Lưu cài đặt bao thư
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
                <Section title="Khổ bao thư chuẩn">
                    <p className="text-sm text-gray-400">
                        Thêm, sửa hoặc xóa khổ chọn nhanh. Kích thước lưu bằng mm; màn tính giá tự
                        quy đổi theo đơn vị đang chọn. Xóa hết vẫn dùng được Tùy chỉnh.
                    </p>
                    {draft.sizePresets.map((preset, i) => (
                        <div
                            key={preset.id}
                            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end border border-gray-600 rounded p-3"
                        >
                            <label className="block">
                                Tên khổ chuẩn {i + 1}
                                <input
                                    type="text"
                                    className={fieldClass}
                                    placeholder="VD: Bao thư nhỏ"
                                    value={preset.name ?? ''}
                                    onChange={(e) =>
                                        update((c) => {
                                            c.sizePresets[i].name = e.target.value;
                                        })
                                    }
                                />
                            </label>
                            {number(['sizePresets', i, 'w'], `Ngang khổ chuẩn ${i + 1} (mm)`)}
                            {number(['sizePresets', i, 'h'], `Cao khổ chuẩn ${i + 1} (mm)`)}
                            <button
                                type="button"
                                className={buttonClass}
                                onClick={() =>
                                    update((c) => {
                                        c.sizePresets.splice(i, 1);
                                    })
                                }
                            >
                                Xóa khổ chuẩn {i + 1}
                            </button>
                        </div>
                    ))}
                    {!draft.sizePresets.length && (
                        <p className="text-sm text-gray-300">
                            Chưa có khổ chuẩn. Màn tính giá chỉ hiển thị Tùy chỉnh.
                        </p>
                    )}
                    <button
                        type="button"
                        className={buttonClass}
                        onClick={() => {
                            const id = crypto.randomUUID();
                            update((c) => {
                                c.sizePresets.push({ id, name: '', w: NaN, h: NaN });
                            });
                        }}
                    >
                        + Thêm khổ chuẩn
                    </button>
                </Section>
                <Section title="Giấy bao thư">
                    <p className="text-sm text-gray-400">
                        Chỉ giấy ram trong danh mục KTS. Giá ram, click và bảng giá khách sửa tại
                        Cài Đặt của In KTS khổ nhỏ.
                    </p>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                        {reamPapers.map(({ paper, index }) => (
                            <label key={index} className="flex gap-2 items-center text-sm">
                                <input
                                    type="checkbox"
                                    aria-label={`Cho phép giấy ${paper.name}`}
                                    checked={isAllowed(index)}
                                    disabled={isAllowed(index) && effective.length === 1}
                                    onChange={(e) => togglePaper(index, e.target.checked)}
                                />
                                {paper.name}
                            </label>
                        ))}
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                        <SelectField
                            label="Giấy mặc định"
                            value={draft.papers.defaultPaper}
                            onChange={(v) =>
                                update((c) => {
                                    c.papers.defaultPaper = Number(v);
                                })
                            }
                        >
                            {effective.map(({ paper, index }) => (
                                <option key={index} value={index}>
                                    {paper.name}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Khổ giấy ram mặc định"
                            value={draft.papers.defaultStock}
                            onChange={(v) =>
                                update((c) => {
                                    c.papers.defaultStock = Number(v);
                                })
                            }
                        >
                            {(printConfig?.STANDARD_LARGE_SHEET_SIZES || []).map((p, i) => (
                                <option key={i} value={i}>
                                    {p.name || `${p.w} × ${p.h} cm`}
                                </option>
                            ))}
                        </SelectField>
                    </div>
                </Section>
                <Section title="Giấy mỹ thuật — nhập giá vốn giấy">
                    <p className="text-sm text-gray-400">
                        Nhập khổ nguyên và giá vốn mỗi tờ. Giá khách cho phần có in do bảng giá KTS
                        tính từ giá giấy này; mặt sau không in lấy giá vốn giấy nhân hệ số giá khách
                        bên dưới. Giá 0 là chưa khai báo và không thể báo giá loại giấy đó.
                    </p>
                    {draft.artPapers.map((art, i) => (
                        <div key={i} className="border border-gray-600 rounded p-3 space-y-3">
                            <label className="block">
                                Tên giấy mỹ thuật {i + 1}
                                <input
                                    className={fieldClass}
                                    value={art.name}
                                    onChange={(e) =>
                                        update((c) => {
                                            c.artPapers[i].name = e.target.value;
                                        })
                                    }
                                />
                            </label>
                            <div className="grid md:grid-cols-3 gap-3">
                                {number(['artPapers', i, 'w'], `Ngang giấy mỹ thuật ${i + 1} (cm)`)}
                                {number(['artPapers', i, 'h'], `Dài giấy mỹ thuật ${i + 1} (cm)`)}
                                {number(
                                    ['artPapers', i, 'cost'],
                                    `Giá vốn mỗi tờ mỹ thuật ${i + 1} (đ)`
                                )}
                            </div>
                            <button
                                className={buttonClass}
                                disabled={draft.artPapers.length === 1}
                                onClick={() =>
                                    update((c) => {
                                        c.artPapers.splice(i, 1);
                                    })
                                }
                            >
                                Xóa giấy mỹ thuật {i + 1}
                            </button>
                        </div>
                    ))}
                    <button
                        className={buttonClass}
                        onClick={() =>
                            update((c) => {
                                c.artPapers.push({
                                    name: 'Giấy mỹ thuật mới',
                                    w: 70,
                                    h: 100,
                                    cost: 0,
                                });
                            })
                        }
                    >
                        + Thêm giấy mỹ thuật
                    </button>
                </Section>
                <Section title="Giá trị điền sẵn khi nhập">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        <SelectField
                            label="Đơn vị mặc định"
                            value={draft.defaults.unit}
                            onChange={(v) =>
                                update((c) => {
                                    c.defaults.unit = v;
                                })
                            }
                        >
                            <option value="mm">mm</option>
                            <option value="cm">cm</option>
                        </SelectField>
                        <SelectField
                            label="Kiểu khuôn mặc định"
                            value={draft.defaults.construction}
                            onChange={(v) =>
                                update((c) => {
                                    c.defaults.construction = v;
                                })
                            }
                        >
                            {Object.entries(CONSTRUCTION_LABELS).map(([id, label]) => (
                                <option key={id} value={id}>
                                    {label}
                                </option>
                            ))}
                        </SelectField>
                        <SelectField
                            label="Vị trí nắp mặc định"
                            value={draft.defaults.flapEdge}
                            onChange={(v) =>
                                update((c) => {
                                    c.defaults.flapEdge = v;
                                })
                            }
                        >
                            {Object.entries(FLAP_EDGE_LABELS).map(([id, label]) => (
                                <option key={id} value={id}>
                                    {label}
                                </option>
                            ))}
                        </SelectField>
                        {number(['defaults', 'flapMm'], 'Dài nắp mặc định (mm)')}
                        {number(['defaults', 'tabMm'], 'Rộng tay dán mặc định (mm)')}
                        <SelectField
                            label="Màu in mặc định"
                            value={draft.defaults.color}
                            onChange={(v) =>
                                update((c) => {
                                    c.defaults.color = v;
                                })
                            }
                        >
                            <option value="4color">4 màu</option>
                            <option value="1color">Đen trắng</option>
                        </SelectField>
                    </div>
                </Section>
                {FEES.map(([key, title, costLabel, saleLabel]) => (
                    <Section key={key} title={`Phí ${title} — giá vốn và giá khách`}>
                        <p className="text-sm text-gray-400">
                            Tra bậc theo số bao thư. Mốc “Từ” áp dụng tới trước mốc tiếp theo; bậc
                            cuối không giới hạn. “Mỗi bao thư” nhân với số lượng; “Trọn gói” áp một
                            lần cho cả đơn. Cột Giá vốn tính chi phí sản xuất; cột Giá khách tính
                            tiền báo khách. Mỗi dòng có cách tính riêng. Ví dụ mốc 1 và 101 tương
                            ứng bậc đầu từ 1–100 bao; muốn đổi giá từ 201 bao thì thêm mốc 201.
                        </p>
                        <TierEditor
                            prefix={title}
                            tiers={draft[key].tiers}
                            costLabel={costLabel}
                            saleLabel={saleLabel}
                            onChange={(tiers) =>
                                update((c) => {
                                    c[key].tiers = tiers;
                                })
                            }
                        />
                    </Section>
                ))}
                <Section title="Dán keo 2 mặt nắp — giá vốn và giá khách">
                    <p className="text-sm text-gray-400">
                        Phí = chiều dài cạnh đặt nắp (cm) × số bao thư × đơn giá. Nắp ở cạnh 22 cm,
                        cao 3 cm: tính 22 cm keo mỗi bao. Khoản này cộng riêng với phí dán thân bao
                        thư khi chọn dán keo nắp. Nhập cả hai giá lớn hơn 0 để sử dụng.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {number(['flapTape', 'costPerCm'], 'Dán keo nắp — giá vốn (đ/cm)')}
                        {number(['flapTape', 'salePerCm'], 'Dán keo nắp — giá khách (đ/cm)')}
                        {number(
                            ['flapTape', 'minCost'],
                            'Dán keo nắp — giá vốn tối thiểu mỗi đơn (đ)'
                        )}
                        {number(
                            ['flapTape', 'minSale'],
                            'Dán keo nắp — giá khách tối thiểu mỗi đơn (đ)'
                        )}
                    </div>
                    <p className="text-sm text-gray-400">
                        Nếu phí theo chiều dài thấp hơn mức tối thiểu, lấy mức tối thiểu; không cộng
                        thêm hai khoản. Ví dụ phí keo 30.000 đ, giá khách tối thiểu 100.000 đ thì
                        báo khách phí keo 100.000 đ. Nhập 0 để không áp mức tối thiểu.
                    </p>
                </Section>
                <Section title="Giá bế — giá vốn và giá khách từ In KTS khổ nhỏ">
                    <p className="text-sm text-gray-300">
                        Bế có khuôn dùng giá khuôn bao thư và bảng công bế; bế kỹ thuật số dùng bảng
                        bế kỹ thuật số. Công bế có giá vốn và giá khách riêng; tiền khuôn dùng chung
                        cho cả hai. Sửa các mức giá tại Cài Đặt của In KTS khổ nhỏ.
                    </p>
                </Section>
                <Section title="Ép nhũ — dùng chung mức phí KTS cho giá vốn và giá khách">
                    <p className="text-sm text-gray-300">
                        Phí ép nhũ hiện lấy từ Cài Đặt của In KTS khổ nhỏ và cộng cùng một số tiền
                        vào giá vốn và giá khách.
                    </p>
                </Section>
                <Section title="Phí cố định mỗi đơn — giá vốn và giá khách">
                    <p className="text-sm text-gray-400">
                        Áp một lần cho cả đơn bao thư. Không áp riêng cho phần mặt sau; mặt sau
                        không in vẫn có tiền in bằng 0.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {number(['orderMin', 'fixedCost'], 'Phí cố định — chỉ tính giá vốn (đ)')}
                        {number(['orderMin', 'fixedSale'], 'Phí cố định — giá khách (đ)')}
                    </div>
                </Section>
                <Section title="Giá tối thiểu mỗi đơn — chỉ áp dụng giá khách">
                    <p className="text-sm text-gray-400">
                        Nâng tổng báo khách lên mức này nếu thấp hơn. Không cộng vào giá vốn. Giá
                        vốn là chi phí sản xuất, được tính riêng với mức báo khách tối thiểu.
                    </p>
                    <div className="grid sm:grid-cols-2 gap-4">
                        {number(['orderMin', 'minSale'], 'Tổng báo khách tối thiểu (đ)')}
                    </div>
                </Section>
                <Section title="Giấy mặt sau không in — hệ số tính giá khách từ giá vốn">
                    <p className="text-sm text-gray-300">
                        Giá vốn mặt sau rời không in = số tờ nguyên × giá vốn/tờ (giấy ram từ KTS
                        hoặc giấy mỹ thuật đã nhập ở trên). Giá báo khách = vốn giấy × hệ số bên
                        dưới; tiền in bằng 0, không áp giá sàn in.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                        {number(['backPaperFactor'], 'Hệ số giá khách / giá vốn giấy mặt sau')}
                    </div>
                    <p className="text-sm text-cyan-300">
                        Ví dụ vốn giấy mặt sau 10.000 đ → báo khách{' '}
                        {Number.isFinite(draft.backPaperFactor)
                            ? (10000 * draft.backPaperFactor).toLocaleString('vi-VN') + ' đ'
                            : '—'}
                        .
                    </p>
                </Section>
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
                            Tôi đã kiểm tra giá dán, giấy và dùng bảng giá này để báo khách.
                        </span>
                    </label>
                    <p className="text-sm text-gray-400">
                        Các bậc phí ban đầu chỉ là số mẫu. Giá giấy, in và ép nhũ được đọc từ cài
                        đặt KTS khổ nhỏ.
                    </p>
                </Section>
            </fieldset>
            <button
                disabled={saving}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium mt-6"
                onClick={save}
            >
                Lưu cài đặt bao thư
            </button>
        </div>
    );
}
