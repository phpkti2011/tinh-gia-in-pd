import { useId } from 'react';

export default function PaperCutDiagram({ paper, title, svgRef }) {
    const patternId = useId().replaceAll(':', '');
    const c = paper.cutting;
    if (!c) return <p>Chưa có dữ liệu sơ đồ cắt giấy.</p>;
    const printed = c.kind === 'press';
    const unit = printed ? 'tờ máy' : 'phôi';
    return (
        <div className="space-y-3">
            <p className="font-semibold text-cyan-300">
                {title} · {paper.paperName} · tờ nguyên {c.stockW} × {c.stockH} cm
            </p>
            <svg
                ref={svgRef}
                xmlns="http://www.w3.org/2000/svg"
                role="img"
                aria-label={`Sơ đồ cắt ${title.toLowerCase()}`}
                viewBox={`-5 -8 ${c.stockW + 10} ${c.stockH + 18}`}
                className="w-full max-h-[620px] rounded-lg bg-gray-900"
            >
                <rect x="-5" y="-8" width={c.stockW + 10} height={c.stockH + 18} fill="#111827" />
                <text x={c.stockW / 2} y="-3" fill="#fbbf24" textAnchor="middle" fontSize="2.5">
                    Ngang {c.stockW} cm · Dài {c.stockH} cm
                </text>
                <rect
                    width={c.stockW}
                    height={c.stockH}
                    fill="#374151"
                    stroke="#e5e7eb"
                    strokeWidth="0.3"
                />
                {printed ? (
                    c.pieces?.map((p, i) => (
                        <g key={i}>
                            <rect
                                x={p.x}
                                y={p.y}
                                width={p.w}
                                height={p.h}
                                fill="#0e7490"
                                stroke="#e5e7eb"
                                strokeWidth="0.15"
                            />
                            <text
                                x={p.x + p.w / 2}
                                y={p.y + p.h / 2}
                                fill="white"
                                textAnchor="middle"
                                fontSize="2"
                            >
                                {p.w} × {p.h}
                            </text>
                        </g>
                    ))
                ) : (
                    <>
                        <defs>
                            <pattern
                                id={patternId}
                                width={c.pieceW}
                                height={c.pieceH}
                                patternUnits="userSpaceOnUse"
                            >
                                <rect
                                    width={c.pieceW}
                                    height={c.pieceH}
                                    fill="#0e7490"
                                    stroke="#e5e7eb"
                                    strokeWidth="0.15"
                                />
                                <text
                                    x={c.pieceW / 2}
                                    y={c.pieceH / 2}
                                    fill="white"
                                    textAnchor="middle"
                                    fontSize={Math.min(2.5, c.pieceW / 6, c.pieceH / 4)}
                                >
                                    {c.pieceW} × {c.pieceH}
                                </text>
                            </pattern>
                        </defs>
                        <rect
                            width={c.columns * c.pieceW}
                            height={c.rows * c.pieceH}
                            fill={`url(#${patternId})`}
                        />
                    </>
                )}
                <text
                    x={c.stockW / 2}
                    y={c.stockH + 5}
                    fill="#e5e7eb"
                    textAnchor="middle"
                    fontSize="2.3"
                >
                    {c.perSheet} {unit}/tờ nguyên · kích thước: cm
                </text>
            </svg>
            <p>
                Cần {c.required} {unit} · {c.perSheet} {unit}/tờ nguyên → dùng {paper.sheets} tờ
                nguyên, dư {paper.sheets * c.perSheet - c.required} {unit}.
            </p>
            {printed ? (
                <p className="text-sm text-gray-400">
                    Giấy có in: sơ đồ cắt tờ nguyên thành tờ máy theo phương án KTS. Mỗi tờ máy bình{' '}
                    {c.productsPerPressSheet} phôi; đây là bước cắt tờ máy, chưa phải đường xén
                    thành phẩm.
                </p>
            ) : (
                <p className="text-sm text-gray-400">
                    Cắt {c.columns} cột × {c.rows} hàng theo chiều phôi ghi trên hình. Màu xám là
                    giấy dư. Phương án khớp định mức giấy đang tính giá.
                </p>
            )}
        </div>
    );
}
