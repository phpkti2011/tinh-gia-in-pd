import { useState } from 'react';
import { MATERIAL_LABELS } from '../config/defaultConfig';
import { validateCalendarConfig } from '../config/schema';
import { NumberField, SelectField, Section, fieldClass, buttonClass } from './Fields';

const GEOMETRY_FIELDS = [
    ['stockW', 'Cạnh nạp tấm carton (cm)'],
    ['stockH', 'Chiều dài tấm carton (cm)'],
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
    ['lamSides', 'Số mặt cán áo (0–2)'],
    ['baseMin', 'Giá carton tối thiểu khi làm 1 đế (đ)'],
];

export default function CalendarSettings({ config, onSave, onCancel, onReload, syncReady }) {
    const [draft, setDraft] = useState(() => structuredClone(config)),
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
                tiers: [{ from: 1, cost: 0, sale: 0 }],
            });
            c.pricesConfirmed = false;
        });
    const save = async () => {
        const valid = validateCalendarConfig(draft);
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
                        Giá báo khách giấy lót = tổng giá vốn giấy lót × hệ số bên dưới. Khoản này
                        cộng một lần vào giá đế, không tính theo bậc số lượng.
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
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {GEOMETRY_FIELDS.map(([key, label]) => (
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
                        ))}
                    </div>
                    <p className="text-sm text-gray-400">
                        Bù 4 mm nghĩa là (W + 4 mm) × (H + 4 mm), không cộng 8 mm. Các phần trừ lót
                        và mép in áo độc lập với bù carton.
                    </p>
                </Section>
                {Object.entries(MATERIAL_LABELS).map(([key, [title, costLabel, saleLabel]]) => (
                    <Section key={key} title={`Bảng giá ${title.toLowerCase()}`}>
                        <p className="text-sm text-gray-400">
                            {key === 'carton'
                                ? 'Vốn tra theo số tấm nguyên; báo khách tra theo số cuốn.'
                                : 'Tra bậc theo số cuốn.'}{' '}
                            Mốc “Từ” áp dụng tới trước mốc tiếp theo. Bậc cuối không giới hạn.
                        </p>
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
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr>
                                                <th>Từ số lượng</th>
                                                <th>{costLabel}</th>
                                                <th>{saleLabel}</th>
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
