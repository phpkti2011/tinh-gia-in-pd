import { requireValue as must } from '../config/schema';
// Internal integer grid: 0.1 mm. Round blanks up and stock down, never undercut a part.
const units = (v) => Math.ceil(v * 100 - 1e-8);
let layoutCache = { key: '', value: null };
export function layout(s) {
    const c = s.cfg,
        W = s.orientation === 'landscape' ? Math.max(s.a, s.b) : Math.min(s.a, s.b),
        H = s.orientation === 'landscape' ? Math.min(s.a, s.b) : Math.max(s.a, s.b);
    const key = JSON.stringify([
        s.n,
        W,
        H,
        c.allowance,
        c.strip,
        c.largeCount,
        c.smallCount,
        c.stockW,
        c.stockH,
        c.machine,
        c.trim,
        c.gap,
    ]);
    if (key === layoutCache.key) return layoutCache.value;
    const sw = Math.floor(c.stockW * 100 + 1e-8),
        sh = Math.floor(c.stockH * 100 + 1e-8),
        trim = units(c.trim),
        gap = units(c.gap),
        uw = sw - 2 * trim,
        uh = sh - 2 * trim,
        machine = Math.floor(c.machine * 100 + 1e-8);
    must(sw <= machine, 'Cạnh nạp carton vượt khổ ngang máy. Chỉ dùng cạnh nạp đã cấu hình.');
    must(uw > 0 && uh > 0, 'Xén biên đã dùng hết tấm carton.');
    const l = { w: units(W + c.allowance / 10), h: units(H + c.allowance / 10), id: 'L' },
        b = { w: units(W + c.allowance / 10), h: units(c.strip + c.allowance / 10), id: 'S' };
    must(Math.min(l.w, l.h, b.w, b.h) > 0, 'Phôi carton phải lớn hơn 0.');
    const types = [l, { ...l, w: l.h, h: l.w }, b, { ...b, w: b.h, h: b.w }];
    const needL = s.n * c.largeCount,
        needS = s.n * c.smallCount;
    const heights = [
        ...new Set([
            ...types.map((t) => t.h),
            l.h * 2 + gap,
            l.h * 3 + gap * 2,
            l.w * 2 + gap,
            l.w * 3 + gap * 2,
        ]),
    ].filter((h) => h <= uh && h <= machine);
    const bands = new Map();
    const orders = [];
    function perm(a, left) {
        if (!left.length) {
            orders.push(a);
            return;
        }
        for (const t of left)
            perm(
                [...a, t],
                left.filter((x) => x !== t)
            );
    }
    perm(
        [],
        types.map((_, i) => i)
    );
    for (const h of heights)
        for (const order of orders) {
            const first = types[order[0]],
                max = Math.min(50, Math.floor((uw + gap) / (first.w + gap)));
            for (let firstCount = 0; firstCount <= max; firstCount++) {
                let x = 0,
                    ps = [],
                    nl = 0,
                    ns = 0,
                    columns = [];
                order.forEach((idx, oi) => {
                    const t = types[idx],
                        rows = Math.floor((h + gap) / (t.h + gap));
                    if (rows < 1 || rows > 500) return;
                    const count =
                        oi === 0
                            ? firstCount
                            : Math.min(120, Math.floor((uw - x + gap) / (t.w + gap)));
                    for (let col = 0; col < count; col++) {
                        if (x + t.w > uw || ps.length + rows > 500) return;
                        columns.push({ x, w: t.w, rows, step: t.h + gap });
                        for (let r = 0; r < rows; r++) {
                            ps.push({ x, y: r * (t.h + gap), w: t.w, h: t.h, id: t.id });
                            if (t.id === 'L') nl++;
                            else ns++;
                        }
                        x += t.w + gap;
                    }
                });
                if (!ps.length || ps.length > 500) continue;
                const k = `${h}/${nl}/${ns}`;
                if (!bands.has(k)) bands.set(k, { h, ps, nl, ns, columns });
            }
        }
    must(bands.size, 'Không tìm được dải cắt phù hợp. Kiểm tra kích thước và khổ máy.');
    const all = [...bands.values()],
        patterns = new Map(),
        weights = [0, 0.03, 0.1, 0.3, 0.6, 1, 1.5, 3, 10, 1000];
    for (const weight of weights) {
        const score = (b) => (b.nl * l.w * l.h * weight + b.ns * bArea()) / (b.h + gap);
        function bArea() {
            return b.w * b.h;
        }
        const ordered = [...all].sort((a, b) => score(b) - score(a));
        const starts = [];
        for (const h of heights) {
            const v = ordered.find((b) => b.h === h);
            if (v) starts.push(v);
        }
        starts.push(null);
        for (const start of starts) {
            let y = 0,
                ps = [],
                nl = 0,
                ns = 0,
                cuts = [],
                used = [];
            while (y < uh) {
                let band = y === 0 && start ? start : ordered.find((v) => y + v.h <= uh);
                if (!band || y + band.h > uh || ps.length + band.ps.length > 1200) break;
                ps.push(...band.ps.map((p) => ({ ...p, y: p.y + y })));
                nl += band.nl;
                ns += band.ns;
                used.push({ y, h: band.h, columns: band.columns });
                y += band.h;
                cuts.push(y);
                y += gap;
            }
            if (nl + ns) patterns.set(`${nl}/${ns}`, { ps, nl, ns, cuts, bands: used });
        }
    }
    let candidates = [...patterns.values()];
    candidates = candidates.filter(
        (p) =>
            !candidates.some(
                (q) => q !== p && q.nl >= p.nl && q.ns >= p.ns && (q.nl > p.nl || q.ns > p.ns)
            )
    );
    must(
        candidates.some((p) => p.nl) && candidates.some((p) => p.ns),
        'Có loại phôi không lọt được khổ carton hoặc dải cắt.'
    );
    let best = null;
    const needSheets = (p, nl, ns) =>
        Math.max(
            nl > 0 ? (p.nl ? Math.ceil(nl / p.nl) : Infinity) : 0,
            ns > 0 ? (p.ns ? Math.ceil(ns / p.ns) : Infinity) : 0
        );
    for (let i = 0; i < candidates.length; i++)
        for (let j = i; j < candidates.length; j++) {
            const p = candidates[i],
                q = candidates[j],
                limit = Math.min(
                    2000,
                    Math.max(p.nl ? Math.ceil(needL / p.nl) : 0, p.ns ? Math.ceil(needS / p.ns) : 0)
                );
            for (let a = 0; a <= limit; a++) {
                let z = needSheets(q, Math.max(0, needL - a * p.nl), Math.max(0, needS - a * p.ns));
                if (!Number.isFinite(z)) continue;
                const count = a + z,
                    producedL = a * p.nl + z * q.nl,
                    producedS = a * p.ns + z * q.ns,
                    excess = (producedL - needL) * l.w * l.h + (producedS - needS) * b.w * b.h;
                if (!best || count < best.count || (count === best.count && excess < best.excess)) {
                    best = {
                        count,
                        excess,
                        producedL,
                        producedS,
                        groups: [
                            ...(a ? [{ pattern: p, repeat: a }] : []),
                            ...(z ? [{ pattern: q, repeat: z }] : []),
                        ],
                    };
                }
            }
        }
    must(
        best && best.count > 0,
        'Chưa tìm được phương án đủ phôi trong các phương án cắt đang xét.'
    );
    if (best.groups.length === 2 && best.groups[0].pattern === best.groups[1].pattern)
        best.groups = [{ pattern: best.groups[0].pattern, repeat: best.count }];
    for (const group of best.groups) validatePattern(group.pattern, uw, uh);
    const requiredArea = needL * l.w * l.h + needS * b.w * b.h,
        lower = Math.ceil(requiredArea / (sw * sh));
    const result = {
        ...best,
        W,
        H,
        // Public geometry uses millimetres, including the SVG cutting diagrams.
        groups: best.groups.map((g) => ({
            repeat: g.repeat,
            pattern: {
                ...g.pattern,
                ps: g.pattern.ps.map((p) => ({
                    ...p,
                    x: p.x / 10,
                    y: p.y / 10,
                    w: p.w / 10,
                    h: p.h / 10,
                })),
                cuts: g.pattern.cuts.map((y) => y / 10),
                bands: g.pattern.bands.map((band) => ({
                    ...band,
                    y: band.y / 10,
                    h: band.h / 10,
                    columns: band.columns.map((col) => ({
                        ...col,
                        x: col.x / 10,
                        w: col.w / 10,
                        step: col.step / 10,
                    })),
                })),
            },
        })),
        sw: sw / 10,
        sh: sh / 10,
        trim: trim / 10,
        gap: gap / 10,
        uw: uw / 10,
        uh: uh / 10,
        l: { ...l, w: l.w / 10, h: l.h / 10 },
        b: { ...b, w: b.w / 10, h: b.h / 10 },
        needL,
        needS,
        lower,
        requiredArea: requiredArea / 10000,
        stockArea: (best.count * sw * sh) / 10000,
        optimal: best.count === lower,
    };
    layoutCache = { key, value: result };
    return result;
}
export function validatePattern(p, uw, uh) {
    for (let i = 0; i < p.ps.length; i++) {
        const a = p.ps[i];
        must(a.x >= 0 && a.y >= 0 && a.x + a.w <= uw && a.y + a.h <= uh, 'Phôi vượt biên sơ đồ.');
        for (let j = 0; j < i; j++) {
            const b = p.ps[j];
            must(
                !(a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y),
                'Phôi bị chồng lấn.'
            );
        }
    }
}
