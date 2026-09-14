// Xếp tem TRÒN / OVAL tối ưu — trộn hàng thẳng và hàng so le.
//
// Trước đây hình tròn CHỈ chạy kiểu so le thuần, không bao giờ so với lưới
// thẳng, càng không thử trộn. Hệ quả: nhiều cỡ tem bị tính thiếu con/tờ ⇒ báo
// giá cao hơn thực tế.
//
// Test quan trọng nhất ở đây là BẤT BIẾN: kết quả mới luôn ≥ cả lưới thuần lẫn
// so le thuần, trên mọi cỡ tem — chứng minh chỉ tăng, không bao giờ giảm.

import { describe, it, expect } from 'vitest';
import { calculateStickersPerSheet } from '../../src/modules/decal/engine/layout.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/defaultConfig.js';

const config = DECAL_DEFAULT_CONFIG;
const GAP = config.stickerGap;

// 2 máy bế thật trong xưởng (lề khác nhau → vùng in khác nhau).
const GRAPTECH = { marginShort: 28, marginLong: 50 }; // vùng in 302×280
const AVITECH = { marginShort: 16, marginLong: 16 }; // vùng in 314×314

// Hai cách xếp THUẦN — dùng làm mốc so sánh, chép đúng công thức cũ.
function pureGrid(d, W, H, gap) {
    const p = d + gap;
    if (d > W || d > H) return 0;
    return Math.floor((W + gap) / p) * Math.floor((H + gap) / p);
}
function pureStaggered(d, W, H, gap) {
    const p = d + gap;
    if (d > W || d > H) return 0;
    const vs = (p * Math.sqrt(3)) / 2;
    const cf = Math.floor((W + gap) / p);
    const cs = Math.floor((W - p / 2 + gap) / p);
    const rows = Math.floor((H - d) / vs) + 1;
    if (rows <= 0) return 0;
    return Math.max(
        Math.ceil(rows / 2) * cf + Math.floor(rows / 2) * cs,
        Math.floor(rows / 2) * cf + Math.ceil(rows / 2) * cs
    );
}
const bestPure = (d, W, H, gap) =>
    Math.max(
        pureGrid(d, W, H, gap),
        pureGrid(d, H, W, gap),
        pureStaggered(d, W, H, gap),
        pureStaggered(d, H, W, gap)
    );

describe('Ca người dùng báo: tem tròn 90mm trên khổ 330×330', () => {
    it('Graptech: 9 con/tờ (trước chỉ 8)', () => {
        const r = calculateStickersPerSheet(90, 90, 330, 330, 'circle', config, GRAPTECH);
        expect(r.count).toBe(9);
    });

    it('Avitech: 9 con/tờ (trước chỉ 8)', () => {
        const r = calculateStickersPerSheet(90, 90, 330, 330, 'circle', config, AVITECH);
        expect(r.count).toBe(9);
    });

    it('Avitech vùng in rộng hơn nên KHÔNG được ít con hơn Graptech', () => {
        const g = calculateStickersPerSheet(90, 90, 330, 330, 'circle', config, GRAPTECH);
        const a = calculateStickersPerSheet(90, 90, 330, 330, 'circle', config, AVITECH);
        expect(a.count).toBeGreaterThanOrEqual(g.count);
    });
});

describe('Trộn hàng thẳng + hàng so le hơn CẢ hai kiểu thuần', () => {
    // Vùng in 314×342 (khổ 330×358, lề 8mm mỗi cạnh), tem tròn 90mm, gap 2mm.
    // Lưới thuần 9 · so le thuần 10 · TRỘN 11.
    const machine = { marginTop: 8, marginBottom: 8, marginLeft: 8, marginRight: 8 };
    const r = calculateStickersPerSheet(90, 90, 330, 358, 'circle', config, machine);

    it('vùng in đúng 314×342', () => {
        expect(r.printableW).toBe(314);
        expect(r.printableH).toBe(342);
    });

    it('được 11 con — hơn lưới thuần (9) và so le thuần (10)', () => {
        expect(pureGrid(90, 314, 342, GAP)).toBe(9);
        expect(pureStaggered(90, 314, 342, GAP)).toBe(10);
        expect(r.count).toBe(11);
    });

    it('đúng 4 hàng, trong đó CHỈ 1 hàng so le', () => {
        expect(r.rowPlan).toHaveLength(4);
        const staggered = r.rowPlan.filter((row) => row.offsetX > 0);
        expect(staggered).toHaveLength(1);
        expect(r.rowPlan.map((row) => row.cols)).toEqual([3, 2, 3, 3]);
    });
});

describe('Không phá ca cũ — tem tròn 50mm vẫn xếp so le xen kẽ', () => {
    const r = calculateStickersPerSheet(50, 50, 330, 330, 'circle', config, GRAPTECH);

    it('vẫn 30 con, vẫn kiểu so le', () => {
        expect(r.count).toBe(30);
        expect(r.type).toBe('hexagonal');
        expect(r.rows).toBe(6);
    });

    it('các hàng xen kẽ thẳng / so le đúng như trước', () => {
        expect(r.rowPlan.map((row) => row.offsetX > 0)).toEqual([
            false,
            true,
            false,
            true,
            false,
            true,
        ]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// BẤT BIẾN — test quan trọng nhất: chỉ tăng, không bao giờ giảm.
// ─────────────────────────────────────────────────────────────────────────────
describe('Không bao giờ tệ hơn cách tính cũ', () => {
    const areas = [
        [330, 330, GRAPTECH],
        [330, 330, AVITECH],
        [330, 358, { marginTop: 8, marginBottom: 8, marginLeft: 8, marginRight: 8 }],
        [210, 297, AVITECH],
    ];

    it('mọi đường kính 20→140mm đều ≥ lưới thuần VÀ ≥ so le thuần', () => {
        for (const [sw, sh, machine] of areas) {
            for (let d = 20; d <= 140; d += 2) {
                const r = calculateStickersPerSheet(d, d, sw, sh, 'circle', config, machine);
                const mốc = bestPure(d, r.printableW, r.printableH, GAP);
                expect(
                    r.count,
                    `d=${d}mm trên ${r.printableW}×${r.printableH}`
                ).toBeGreaterThanOrEqual(mốc);
            }
        }
    });

    it('có ít nhất vài cỡ thực sự tốt hơn (chứng minh sửa có tác dụng)', () => {
        let better = 0;
        for (let d = 20; d <= 140; d += 5) {
            const r = calculateStickersPerSheet(d, d, 330, 330, 'circle', config, AVITECH);
            if (r.count > pureStaggered(d, r.printableW, r.printableH, GAP)) better++;
        }
        expect(better).toBeGreaterThan(5);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// HÌNH HỌC — số con nhiều hơn chỉ có giá trị nếu tem KHÔNG chồng nhau.
// ─────────────────────────────────────────────────────────────────────────────
describe('Tem không chồng nhau và nằm trong vùng in', () => {
    const check = (d, sw, sh, machine) => {
        const r = calculateStickersPerSheet(d, d, sw, sh, 'circle', config, machine);
        if (!r.rowPlan) return;
        const areaW = r.swapped ? r.printableH : r.printableW;
        const areaH = r.swapped ? r.printableW : r.printableH;

        const centers = [];
        for (const row of r.rowPlan) {
            for (let j = 0; j < row.cols; j++) {
                centers.push({
                    x: row.offsetX + j * (d + GAP) + d / 2,
                    y: row.y + d / 2,
                });
            }
        }
        expect(centers.length, `d=${d}`).toBe(r.count);

        for (const c of centers) {
            expect(c.x - d / 2, `d=${d} lọt trái`).toBeGreaterThanOrEqual(-1e-6);
            expect(c.y - d / 2, `d=${d} lọt trên`).toBeGreaterThanOrEqual(-1e-6);
            expect(c.x + d / 2, `d=${d} tràn phải`).toBeLessThanOrEqual(areaW + 1e-6);
            expect(c.y + d / 2, `d=${d} tràn dưới`).toBeLessThanOrEqual(areaH + 1e-6);
        }

        // Hai tem tròn không chồng: khoảng cách tâm ≥ đường kính (đã trừ sai số).
        for (let i = 0; i < centers.length; i++) {
            for (let j = i + 1; j < centers.length; j++) {
                const dx = centers[i].x - centers[j].x;
                const dy = centers[i].y - centers[j].y;
                expect(
                    Math.hypot(dx, dy),
                    `d=${d} tem ${i}&${j} chồng nhau`
                ).toBeGreaterThanOrEqual(d - 1e-6);
            }
        }
    };

    it('kiểm mọi cỡ trên cả 2 máy', () => {
        for (let d = 20; d <= 140; d += 10) {
            check(d, 330, 330, GRAPTECH);
            check(d, 330, 330, AVITECH);
        }
    });

    it('kiểm ca trộn 314×342', () => {
        check(90, 330, 358, { marginTop: 8, marginBottom: 8, marginLeft: 8, marginRight: 8 });
    });
});

describe('Tem oval', () => {
    it('không tệ hơn cách xếp theo hộp chữ nhật bao ngoài', () => {
        for (const [w, h] of [
            [90, 50],
            [60, 40],
            [120, 70],
        ]) {
            const oval = calculateStickersPerSheet(w, h, 330, 330, 'oval', config, AVITECH);
            const rect = calculateStickersPerSheet(w, h, 330, 330, 'rectangle', config, AVITECH);
            expect(oval.count, `${w}x${h}`).toBeGreaterThanOrEqual(rect.count);
        }
    });
});

describe('Ảnh hưởng giá — ít tờ in hơn', () => {
    it('1000 con tròn 90mm: 125 tờ → 112 tờ', () => {
        const r = calculateStickersPerSheet(90, 90, 330, 330, 'circle', config, AVITECH);
        expect(Math.ceil(1000 / 8)).toBe(125); // cách cũ
        expect(Math.ceil(1000 / r.count)).toBe(112); // cách mới
    });
});

describe('Trường hợp biên', () => {
    it('tem lớn hơn vùng in → 0 con, không nổ', () => {
        const r = calculateStickersPerSheet(400, 400, 330, 330, 'circle', config, AVITECH);
        expect(r.count).toBe(0);
    });

    it('tem vừa khít đúng 1 con', () => {
        const r = calculateStickersPerSheet(310, 310, 330, 330, 'circle', config, AVITECH);
        expect(r.count).toBe(1);
    });
});
