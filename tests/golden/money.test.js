// Làm tròn tổng tiền báo khách lên hàng nghìn — src/utils/money.js
//
// Luật người dùng chốt: "từ 500 trở lên làm tròn lên 1.000".
// Tức là NỬA LÊN, không phải kiểu làm tròn chẵn (banker's rounding) của một số
// ngôn ngữ — 568.500 phải ra 569.000 chứ không phải 568.000.

import { describe, it, expect } from 'vitest';
import {
    roundToThousand,
    formatVndRounded,
    formatVndRoundedSpaced,
    unitFromRoundedTotal,
    ROUND_STEP,
} from '../../src/utils/money.js';

describe('roundToThousand', () => {
    it('đuôi ĐÚNG 500 thì lên — ca người dùng nêu', () => {
        expect(roundToThousand(568500)).toBe(569000);
        expect(roundToThousand(500)).toBe(1000);
        expect(roundToThousand(1500)).toBe(2000);
        // Nếu lỡ dùng làm tròn chẵn thì 2500 sẽ ra 2000 — chặn luôn ở đây.
        expect(roundToThousand(2500)).toBe(3000);
    });

    it('đuôi dưới 500 thì xuống', () => {
        expect(roundToThousand(568400)).toBe(568000);
        expect(roundToThousand(499)).toBe(0);
        expect(roundToThousand(1499)).toBe(1000);
    });

    it('đã tròn thì giữ nguyên', () => {
        expect(roundToThousand(568000)).toBe(568000);
        expect(roundToThousand(0)).toBe(0);
        expect(roundToThousand(1000)).toBe(1000);
    });

    it('số âm cũng theo đúng luật (không bị -0)', () => {
        expect(roundToThousand(-568500)).toBe(-569000);
        expect(roundToThousand(-400)).toBe(-0);
        expect(Object.is(roundToThousand(-400), -0) || roundToThousand(-400) === 0).toBe(true);
    });

    it('dữ liệu rác → null, không làm vỡ', () => {
        for (const bad of [null, undefined, NaN, Infinity, -Infinity, '568500', {}]) {
            expect(roundToThousand(bad)).toBeNull();
        }
    });

    it('bước làm tròn là 1.000', () => {
        expect(ROUND_STEP).toBe(1000);
    });
});

describe('Định dạng tiền', () => {
    it('formatVndRounded — kiểu VN, không khoảng trắng', () => {
        expect(formatVndRounded(568500)).toBe('569.000đ');
        expect(formatVndRounded(121750)).toBe('122.000đ');
        expect(formatVndRounded(null)).toBeNull();
    });

    it('formatVndRoundedSpaced — có khoảng trắng, rác thì "—"', () => {
        expect(formatVndRoundedSpaced(568500)).toBe('569.000 đ');
        expect(formatVndRoundedSpaced(NaN)).toBe('—');
        expect(formatVndRoundedSpaced(undefined)).toBe('—');
    });
});

describe('Không bao giờ lệch quá 500đ so với số thật', () => {
    it('quét nhiều mức giá', () => {
        for (let n = 0; n <= 2_000_000; n += 137) {
            expect(Math.abs(roundToThousand(n) - n)).toBeLessThanOrEqual(500);
        }
    });
});

// Người dùng nêu: Catalogue hiện "Tổng 480.000đ" nhưng "Đơn giá 160.133đ/cuốn"
// cho 3 cuốn. 480.000 ÷ 3 = 160.000 — con số đang hiện không khớp nhau vì đơn giá
// bị chia từ tổng THẬT (480.400đ). Đơn giá "chia đều" phải chia từ tổng ĐÃ TRÒN.
describe('unitFromRoundedTotal — đơn giá chia từ TỔNG ĐÃ TRÒN', () => {
    it('ca người dùng nêu: 480.400đ / 3 cuốn → 160.000đ (không phải 160.133đ)', () => {
        expect(unitFromRoundedTotal(480400, 3)).toBe(160000);
        // Chứng minh đây đúng là con số cũ bị sai lệch.
        expect(Math.round(480400 / 3)).toBe(160133);
    });

    it('tổng lẻ 500 vẫn ra đơn giá lẻ tới hàng đồng, KHÔNG bị tròn nghìn', () => {
        expect(unitFromRoundedTotal(568500, 1000)).toBe(569);
        expect(unitFromRoundedTotal(568400, 1000)).toBe(568);
    });

    it('tổng đã tròn thì đơn giá y như chia trực tiếp', () => {
        expect(unitFromRoundedTotal(1250000, 500)).toBe(2500);
        expect(unitFromRoundedTotal(480000, 3)).toBe(160000);
    });

    it('bất biến: đơn giá × số lượng = ĐÚNG tổng đang hiện', () => {
        for (const [total, qty] of [
            [480400, 3],
            [568500, 1000],
            [121750, 7],
            [999999, 13],
            [0, 5],
        ]) {
            expect(unitFromRoundedTotal(total, qty) * qty).toBeCloseTo(roundToThousand(total), 6);
        }
    });

    it('số lượng ≤ 0 hoặc sai kiểu → null (caller tự hiện "—")', () => {
        for (const bad of [0, -3, null, undefined, NaN, Infinity, '3', {}]) {
            expect(unitFromRoundedTotal(480400, bad)).toBeNull();
        }
    });

    it('tổng rác → null', () => {
        for (const bad of [null, undefined, NaN, Infinity, '480400', {}]) {
            expect(unitFromRoundedTotal(bad, 3)).toBeNull();
        }
    });
});
