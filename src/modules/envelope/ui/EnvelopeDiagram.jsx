import { useRef } from 'react';
import { buttonClass } from './Fields';
import { saveSvg } from '../../../components/common/saveSvg';
import { describeEnvelope, formatLength, PART_LABELS } from '../engine/layout';

// Hình mô tả khổ trải để người dùng KIỂM TRA vị trí nắp/tay dán trước khi báo giá.
// Vẽ từ describeEnvelopePanels (mm) — cùng nguồn với kích thước chuyển sang KTS.
const FILL = { flap: '#a16207', front: '#0e7490', back: '#155e75', tab: '#78350f' };
const fillFor = (id) => (id.startsWith('tab') ? FILL.tab : FILL[id] || FILL.front);
const LEGEND = [
    ['Nắp', FILL.flap],
    ['Mặt trước', FILL.front],
    ['Mặt sau', FILL.back],
    ['Tay dán', FILL.tab],
];

// Bo hai góc ngoài của nắp/tay dán; cạnh gắn mặt trước giữ thẳng để gấp.
// Chỉ thay hình minh họa, không thay hộp bao dùng tính giấy/in.
function panelOutline(p, front) {
    const { x, y, w, h } = p;
    const r = Math.min(6, w / 2, h / 2);
    const rounded = p.id === 'flap' || p.id.startsWith('tab');
    const left = rounded && x + w <= front.x + 1e-6;
    const right = rounded && x >= front.x + front.w - 1e-6;
    const top = rounded && y + h <= front.y + 1e-6;
    const bottom = rounded && y >= front.y + front.h - 1e-6;
    const tl = left || top ? r : 0;
    const tr = right || top ? r : 0;
    const br = right || bottom ? r : 0;
    const bl = left || bottom ? r : 0;
    return `M ${x + tl} ${y} H ${x + w - tr} Q ${x + w} ${y} ${x + w} ${y + tr}
        V ${y + h - br} Q ${x + w} ${y + h} ${x + w - br} ${y + h}
        H ${x + bl} Q ${x} ${y + h} ${x} ${y + h - bl}
        V ${y + tl} Q ${x} ${y} ${x + tl} ${y} Z`;
}

function PartSvg({ part, unit, svgRef }) {
    const front = part.panels.find((p) => p.id === 'front');
    const longest = Math.max(part.widthMm, part.heightMm);
    const pad = longest * 0.14,
        font = longest / 28;
    const vw = part.widthMm + 2 * pad,
        vh = part.heightMm + 2 * pad;
    const label = PART_LABELS[part.id];
    return (
        <svg
            ref={svgRef}
            xmlns="http://www.w3.org/2000/svg"
            viewBox={`${-pad} ${-pad} ${vw} ${vh}`}
            role="img"
            aria-label={`Khổ trải ${label.toLowerCase()}`}
            className="w-full max-h-[520px] rounded-lg bg-gray-900"
        >
            <rect x={-pad} y={-pad} width={vw} height={vh} fill="#111827" />
            {part.panels.map((p, i) => {
                const text = `${p.label} ${formatLength(p.w, unit)}×${formatLength(p.h, unit)}`;
                const fits = p.w >= font * text.length * 0.55 && p.h >= font * 1.4;
                const short = !fits && p.w >= font * 3 && p.h >= font * 1.4;
                return (
                    <g key={i}>
                        <path
                            d={panelOutline(p, front)}
                            fill={fillFor(p.id)}
                            stroke="#111827"
                            strokeWidth={font / 12}
                        />
                        {(fits || short) && (
                            <text
                                x={p.x + p.w / 2}
                                y={p.y + p.h / 2}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize={font * 0.8}
                            >
                                {fits ? text : p.label}
                            </text>
                        )}
                    </g>
                );
            })}
            {part.folds.map((f, i) => (
                <line
                    key={i}
                    x1={f.x1}
                    y1={f.y1}
                    x2={f.x2}
                    y2={f.y2}
                    stroke="#f9fafb"
                    strokeDasharray={`${font / 2} ${font / 3}`}
                    strokeWidth={font / 10}
                />
            ))}
            <rect
                width={part.widthMm}
                height={part.heightMm}
                fill="none"
                stroke="#e5e7eb"
                strokeWidth={font / 8}
            />
            <text
                x={part.widthMm / 2}
                y={-pad / 2.2}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize={font}
            >
                {`Ngang ${formatLength(part.widthMm, unit)} ${unit}`}
            </text>
            <text
                transform={`translate(${-pad / 2.2} ${part.heightMm / 2}) rotate(-90)`}
                textAnchor="middle"
                fill="#fbbf24"
                fontSize={font}
            >
                {`Cao ${formatLength(part.heightMm, unit)} ${unit}`}
            </text>
        </svg>
    );
}

export default function EnvelopeDiagram({ layout, panels, unit = 'mm' }) {
    const refs = useRef([]);
    const text = describeEnvelope(layout, unit);
    return (
        <section className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <div className="border-b border-gray-700 pb-3">
                <h2 className="text-lg font-semibold text-gray-300">Mô Tả Bao Thư</h2>
                <p className="text-sm text-gray-200 mt-2">{text.summary}</p>
                <ul className="text-sm text-gray-300 mt-1 list-disc pl-5">
                    {text.parts.map((line) => (
                        <li key={line}>{line}</li>
                    ))}
                </ul>
            </div>
            <div className={`grid gap-4 ${panels.length > 1 ? 'md:grid-cols-2' : ''}`}>
                {panels.map((part, i) => (
                    <div key={part.id} className="space-y-2">
                        <div className="flex justify-between items-center gap-2">
                            <h3 className="font-medium text-gray-200">
                                {PART_LABELS[part.id]} · {formatLength(part.widthMm, unit)} ×{' '}
                                {formatLength(part.heightMm, unit)} {unit}
                            </h3>
                            <button
                                type="button"
                                className={buttonClass}
                                onClick={() =>
                                    saveSvg(refs.current[i], `kho-trai-bao-thu-${part.id}.svg`)
                                }
                            >
                                Tải hình SVG
                            </button>
                        </div>
                        <PartSvg
                            part={part}
                            unit={unit}
                            svgRef={(el) => {
                                refs.current[i] = el;
                            }}
                        />
                    </div>
                ))}
            </div>
            <div className="flex flex-wrap gap-4 text-xs text-gray-300">
                {LEGEND.map(([name, color]) => (
                    <span key={name} className="flex items-center gap-1">
                        <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ backgroundColor: color }}
                        />
                        {name}
                    </span>
                ))}
                <span>Nét đứt: đường gấp</span>
            </div>
            <p className="text-xs text-gray-400">
                Hình minh hoạ vị trí nắp và tay dán; không thay file khuôn bế. Kích thước khuôn chưa
                gồm bleed và biên in.
            </p>
        </section>
    );
}
