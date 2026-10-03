import { useState, useRef } from 'react';
import { buttonClass } from './Fields';
import PaperCutDiagram from './PaperCutDiagram';

function saveSvg(svg, name) {
    const data = new XMLSerializer().serializeToString(svg);
    const url = URL.createObjectURL(new Blob([data], { type: 'image/svg+xml;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function CalendarDiagrams({ result: r, config }) {
    const [group, setGroup] = useState(0),
        [view, setView] = useState('stand');
    const svg = useRef(null),
        l = r.lay,
        c = config.geometry;
    const index = Math.min(group, l.groups.length - 1),
        g = l.groups[index];
    const planeH = 2 * l.H + 2 * c.strip;
    return (
        <section className="bg-gray-800 p-6 rounded-lg border border-gray-700 space-y-4">
            <div className="flex flex-wrap justify-between gap-3 border-b border-gray-700 pb-3">
                <h2 className="text-lg font-semibold text-gray-300">Sơ Đồ Sản Xuất</h2>
                <div className="flex flex-wrap gap-2">
                    <button
                        className={buttonClass}
                        onClick={() => setView('stand')}
                        aria-pressed={view === 'stand'}
                    >
                        Cấu tạo đế
                    </button>
                    <button
                        className={buttonClass}
                        onClick={() => setView('cut')}
                        aria-pressed={view === 'cut'}
                    >
                        Sơ đồ cắt carton
                    </button>
                    <button
                        className={buttonClass}
                        onClick={() =>
                            saveSvg(
                                svg.current,
                                view === 'cut'
                                    ? 'so-do-cat-carton.svg'
                                    : view === 'wrap'
                                      ? 'so-do-cat-giay-ao.svg'
                                      : view === 'liner'
                                        ? 'so-do-cat-giay-lot.svg'
                                        : 'cau-tao-de-lich.svg'
                            )
                        }
                    >
                        Tải hình SVG
                    </button>
                    <button
                        className={buttonClass}
                        aria-pressed={view === 'wrap'}
                        onClick={() => setView('wrap')}
                    >
                        Cắt giấy áo
                    </button>
                    <button
                        className={buttonClass}
                        aria-pressed={view === 'liner'}
                        onClick={() => setView('liner')}
                    >
                        Cắt giấy lót
                    </button>
                </div>
            </div>
            {view === 'wrap' || view === 'liner' ? (
                <PaperCutDiagram
                    paper={view === 'wrap' ? r.wrap : r.liner}
                    title={view === 'wrap' ? 'Giấy áo' : 'Giấy lót'}
                    svgRef={svg}
                />
            ) : view === 'stand' ? (
                <>
                    <svg
                        ref={svg}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 720 390"
                        role="img"
                        aria-label="Cấu tạo đế lịch và các lớp giấy"
                        className="w-full rounded-lg bg-gray-900"
                    >
                        <rect width="720" height="390" fill="#111827" />
                        <text x="25" y="30" fill="#e5e7eb" fontSize="18">
                            Đế dựng (minh họa)
                        </text>
                        <polygon
                            points="65,300 190,90 315,300"
                            fill="#334155"
                            stroke="#94a3b8"
                            strokeWidth="2"
                        />
                        <polygon
                            points="190,90 260,55 385,265 315,300"
                            fill="#0e7490"
                            stroke="#67e8f9"
                            strokeWidth="2"
                        />
                        <path
                            d="M65 300 L190 323 L315 300"
                            fill="none"
                            stroke="#fbbf24"
                            strokeWidth="6"
                        />
                        <text x="25" y="355" fill="#e5e7eb" fontSize="16">
                            W = {l.W} cm · H = {l.H} cm
                        </text>
                        <text x="420" y="30" fill="#e5e7eb" fontSize="18">
                            Trải carton thành phẩm
                        </text>
                        {[
                            { h: l.H, name: 'Mặt 1', fill: '#0e7490' },
                            { h: c.strip, name: 'Chân 1', fill: '#92400e' },
                            { h: c.strip, name: 'Chân 2', fill: '#92400e' },
                            { h: l.H, name: 'Mặt 2', fill: '#0e7490' },
                        ].map((p, i, arr) => {
                            const y =
                                50 +
                                (arr.slice(0, i).reduce((sum, a) => sum + a.h, 0) / planeH) * 260;
                            const h = (p.h / planeH) * 260;
                            return (
                                <g key={i}>
                                    <rect
                                        x="425"
                                        y={y}
                                        width="235"
                                        height={h}
                                        fill={p.fill}
                                        stroke="#e5e7eb"
                                    />
                                    <text
                                        x="542"
                                        y={y + h / 2 + 4}
                                        textAnchor="middle"
                                        fill="white"
                                        fontSize="12"
                                    >
                                        {p.name} · {l.W} × {p.h} cm
                                    </text>
                                </g>
                            );
                        })}
                        <text x="420" y="335" fill="#fbbf24" fontSize="13">
                            Áo ngoài: {r.wrapW} × {r.wrapH} cm
                        </text>
                        <text x="420" y="358" fill="#c4b5fd" fontSize="13">
                            Lót trong: {r.linerW} × {r.linerH} cm
                        </text>
                    </svg>
                    <p className="text-xs text-gray-400">
                        Áo bọc ngoài → carton lạnh → giấy lót mặt trong. Hình dựng minh họa kết cấu;
                        kích thước áo/lót lấy đúng công thức. Mỗi đế dùng {c.largeCount} mặt và{' '}
                        {c.smallCount} thanh chân. Phôi cắt có cộng bù {c.allowance} mm vào mỗi kích
                        thước.
                    </p>
                </>
            ) : (
                <>
                    <div className="flex flex-wrap gap-2">
                        {l.groups.map((v, i) => (
                            <button
                                key={i}
                                className={buttonClass}
                                aria-pressed={index === i}
                                onClick={() => setGroup(i)}
                            >
                                Mẫu {i + 1} · {v.repeat} tấm
                            </button>
                        ))}
                    </div>
                    <svg
                        ref={svg}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox={`-30 -60 ${l.sw + 100} ${l.sh + 130}`}
                        role="img"
                        aria-label={`Sơ đồ cắt mẫu ${index + 1}`}
                        className="w-full max-h-[620px] rounded-lg bg-gray-900"
                    >
                        <rect
                            x="-30"
                            y="-60"
                            width={l.sw + 100}
                            height={l.sh + 130}
                            fill="#111827"
                        />
                        <text x={l.sw / 2} y="-25" textAnchor="middle" fontSize="19" fill="#fbbf24">
                            ↓ Cạnh nạp {l.sheetW} cm ≤ máy {c.machine} cm ↓
                        </text>
                        <rect
                            width={l.sw}
                            height={l.sh}
                            fill="#273244"
                            stroke="#e5e7eb"
                            strokeWidth="2"
                        />
                        {g.pattern.ps.map((p, i) => (
                            <g key={i}>
                                <rect
                                    x={p.x + l.trim}
                                    y={p.y + l.trim}
                                    width={p.w}
                                    height={p.h}
                                    fill={p.id === 'L' ? '#0e7490' : '#a16207'}
                                    stroke="#111827"
                                    strokeWidth="1.5"
                                />
                                {p.w > 45 && p.h > 20 && (
                                    <text
                                        x={p.x + l.trim + p.w / 2}
                                        y={p.y + l.trim + p.h / 2 + 4}
                                        fill="white"
                                        textAnchor="middle"
                                        fontSize={Math.min(14, p.h / 2.4)}
                                    >
                                        {p.w / 10}×{p.h / 10}
                                    </text>
                                )}
                            </g>
                        ))}
                        {g.pattern.cuts.map((y, i) => (
                            <line
                                key={i}
                                x1={l.trim}
                                x2={l.sw - l.trim}
                                y1={y + l.trim}
                                y2={y + l.trim}
                                stroke="#f9fafb"
                                strokeDasharray="6 4"
                            />
                        ))}
                        <text
                            x={l.sw / 2}
                            y={l.sh + 35}
                            fill="#e5e7eb"
                            textAnchor="middle"
                            fontSize="17"
                        >
                            Tấm {l.sheetW} × {l.sheetH} cm · kích thước phôi: cm
                        </text>
                    </svg>
                    <div className="text-sm space-y-2">
                        <p>
                            <span className="text-cyan-300">Mặt lớn: {g.pattern.nl} phôi/tấm</span>{' '}
                            ·{' '}
                            <span className="text-amber-300">
                                Thanh chân: {g.pattern.ns} phôi/tấm
                            </span>
                        </p>
                        <p>
                            Đưa cạnh {l.sheetW} cm vào máy, cắt lần lượt thành{' '}
                            {g.pattern.bands.length} dải theo chiều {l.sheetH} cm. Chỉ xoay các dải
                            đã tách, không xoay nguyên tấm để nạp cạnh {l.sheetH} cm.
                        </p>
                    </div>
                    <details className="text-sm">
                        <summary className="cursor-pointer text-cyan-300">
                            Xem thứ tự cắt mẫu {index + 1}
                        </summary>
                        <ol className="list-decimal pl-6 space-y-2 mt-3">
                            {g.pattern.bands.map((band, i) => (
                                <li key={i}>
                                    Dải {i + 1}: cao {band.h / 10} cm, từ vị trí{' '}
                                    {(band.y + l.trim) / 10} cm. Xoay dải, cắt các cột rộng{' '}
                                    {[...new Set(band.columns.map((col) => col.w / 10))].join(
                                        ' / '
                                    )}{' '}
                                    cm; chia cột theo các đường phôi trên sơ đồ.
                                </li>
                            ))}
                        </ol>
                        <p className="text-gray-400 mt-3">
                            Xén biên {c.trim} cm; khoảng cách phôi {c.gap} cm. Màu xám là phần dư.
                        </p>
                    </details>
                </>
            )}
        </section>
    );
}
