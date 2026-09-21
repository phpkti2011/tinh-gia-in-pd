// UV DTF — bảng giá riêng cho hàng CÓ BẾ (config v1.1.0).
//
// Luật: có bế → dùng dieCutPriceTiers nếu đã cài; thiếu field / mảng rỗng → rơi về
// priceTiers (giá y hệt hàng không bế). Bảng bế THAY THẾ đơn giá/mét, KHÔNG cộng thêm.
//
// dieCutPriceTiers CỐ Ý không nằm trong config mặc định: loadConfigFromCloud merge nông
// {...default, ...saved}, nên để field trong default sẽ nhét bảng giá gốc vào xưởng vốn
// đã có bảng giá riêng — báo giá có bế rẻ đi một nửa mà không ai thấy.

import { describe, it, expect } from 'vitest';
import { calculateUvDtf } from '../../src/utils/uvdtfCalculator.js';
import { UVDTF_DEFAULT_CONFIG } from '../../src/modules/uvdtf/config/defaultConfig.js';
import { validateUvDtfConfig } from '../../src/modules/uvdtf/config/schema.js';
import { restoreInfinity } from '../../src/utils/restoreInfinity.js';
import {
    getActiveTiers,
    hasDieCutTiers,
    seedDieCutTiers,
} from '../../src/modules/uvdtf/config/priceTiers.js';

const config = UVDTF_DEFAULT_CONFIG;

// Bảng bế đắt hơn hẳn để khác biệt nhìn thấy ngay.
const DIE_TIERS = [
    { maxMeters: 2, price: 640000 },
    { maxMeters: 5, price: 590000 },
    { maxMeters: 10, price: 530000 },
    { maxMeters: Infinity, price: 480000 },
];
const withDie = (tiers = DIE_TIERS) => ({ ...config, dieCutPriceTiers: tiers });

// 50×90mm × 1000 tem → totalMeters ≈ 29.5 ⇒ rơi bậc cuối ở cả hai bảng.
const bigOrder = { widthMM: 50, heightMM: 90, quantity: 1000 };
// 50×90mm × 10 tem → totalMeters = 0.108 ⇒ bậc đầu.
const tinyOrder = { widthMM: 50, heightMM: 90, quantity: 10 };

describe('Config mặc định KHÔNG chứa bảng bế', () => {
    it('không có key dieCutPriceTiers', () => {
        expect(UVDTF_DEFAULT_CONFIG.dieCutPriceTiers).toBeUndefined();
    });
});

describe('getActiveTiers — luật chọn bảng', () => {
    it('không bế → luôn bảng gốc, kể cả khi ĐÃ có bảng bế', () => {
        const r = getActiveTiers(withDie(), false);
        expect(r.tiers).toBe(config.priceTiers);
        expect(r.usingDieCutTable).toBe(false);
    });

    it('có bế + đã có bảng bế → dùng bảng bế', () => {
        const cfg = withDie();
        const r = getActiveTiers(cfg, true);
        expect(r.tiers).toBe(cfg.dieCutPriceTiers);
        expect(r.usingDieCutTable).toBe(true);
    });

    it('có bế + thiếu field → rơi về bảng gốc', () => {
        const r = getActiveTiers(config, true);
        expect(r.tiers).toBe(config.priceTiers);
        expect(r.usingDieCutTable).toBe(false);
    });

    it('có bế + mảng rỗng → rơi về bảng gốc (xoá hết bậc = dùng chung)', () => {
        expect(getActiveTiers(withDie([]), true).usingDieCutTable).toBe(false);
    });

    it('hasDieCutTiers: thiếu / rỗng / sai kiểu → false', () => {
        expect(hasDieCutTiers(config)).toBe(false);
        expect(hasDieCutTiers(withDie([]))).toBe(false);
        expect(hasDieCutTiers(withDie('x'))).toBe(false);
        expect(hasDieCutTiers(withDie())).toBe(true);
    });
});

describe('Bảng bế THAY THẾ đơn giá, không cộng thêm', () => {
    const cfg = withDie();
    const off = calculateUvDtf(bigOrder, cfg);
    const on = calculateUvDtf({ ...bigOrder, dieCut: true }, cfg);

    it('mọi thứ hình học giữ nguyên, chỉ đơn giá và tổng tiền khác', () => {
        expect(on.totalMeters).toBe(off.totalMeters);
        expect(on.billableMeters).toBe(off.billableMeters);
        expect(on.rotated).toBe(off.rotated);
        expect(on.itemsAcross).toBe(off.itemsAcross);
        expect(on.totalLengthCM).toBe(off.totalLengthCM);
    });

    it('đơn giá lấy từ bảng bế (bậc cuối 480.000)', () => {
        expect(off.pricePerMeter).toBe(280000);
        expect(on.pricePerMeter).toBe(480000);
    });

    it('tổng tiền = mét tới × đơn giá bảng bế, KHÔNG phải giá gốc cộng phụ thu', () => {
        expect(on.totalPrice).toBeCloseTo(on.billableMeters * 480000, 6);
        expect(on.totalPrice).toBeGreaterThan(off.totalPrice);
    });

    it('cờ báo đúng bảng đang dùng', () => {
        expect(on.dieCut).toBe(true);
        expect(on.usingDieCutTable).toBe(true);
        expect(off.dieCut).toBe(false);
        expect(off.usingDieCutTable).toBe(false);
    });
});

describe('Chưa cài bảng bế → giá y hệt không bế', () => {
    it('cùng totalPrice, nhưng usingDieCutTable = false để UI nói thật', () => {
        const off = calculateUvDtf(bigOrder, config);
        const on = calculateUvDtf({ ...bigOrder, dieCut: true }, config);
        expect(on.totalPrice).toBe(off.totalPrice);
        expect(on.dieCut).toBe(true);
        expect(on.usingDieCutTable).toBe(false);
    });

    it('mảng rỗng cũng vậy', () => {
        const on = calculateUvDtf({ ...bigOrder, dieCut: true }, withDie([]));
        expect(on.pricePerMeter).toBe(280000);
        expect(on.usingDieCutTable).toBe(false);
    });
});

describe('Kiểu dữ liệu của params.dieCut', () => {
    it('thiếu hẳn params.dieCut (params cũ) → y hệt dieCut: false', () => {
        const a = calculateUvDtf(bigOrder, withDie());
        const b = calculateUvDtf({ ...bigOrder, dieCut: false }, withDie());
        expect(a).toEqual(b);
        expect(a.dieCut).toBe(false);
    });

    it('engine chỉ nhận boolean: chuỗi "no" LÀ truthy nên panel phải quy đổi trước', () => {
        // Chốt lại hành vi thật của engine để ai đọc test biết vì sao
        // UvdtfInputPanel quy đổi 'yes'/'no' → boolean ngay tại onChange.
        const r = calculateUvDtf({ ...bigOrder, dieCut: 'no' }, withDie());
        expect(r.dieCut).toBe(true);
    });
});

describe('Bậc của bảng bế tính độc lập với bảng gốc', () => {
    it('cùng đơn hàng rơi vào bậc khác nhau ở hai bảng', () => {
        // Bảng bế chỉ có 1 bậc ∞ → đơn nhỏ vẫn ăn giá bậc cuối, khác bảng gốc.
        const cfg = withDie([{ maxMeters: Infinity, price: 700000 }]);
        expect(calculateUvDtf(tinyOrder, cfg).pricePerMeter).toBe(440000);
        expect(calculateUvDtf({ ...tinyOrder, dieCut: true }, cfg).pricePerMeter).toBe(700000);
    });

    it('đúng biên maxMeters vẫn lấy bậc đó (<=, không phải <)', () => {
        // Lấy mốc từ CHÍNH engine chứ không gõ tay 0.108: totalLengthCM/100 trong
        // IEEE-754 ra 0.10800000000000001, gõ 0.108 là test hỏng chứ không phải code sai.
        const exact = calculateUvDtf(tinyOrder, config).totalMeters;
        const cfg = withDie([
            { maxMeters: exact, price: 999000 },
            { maxMeters: Infinity, price: 100000 },
        ]);
        expect(calculateUvDtf({ ...tinyOrder, dieCut: true }, cfg).pricePerMeter).toBe(999000);
    });

    it('bảng bế thiếu dòng vô hạn → rơi về bậc CUỐI', () => {
        const cfg = withDie([
            { maxMeters: 1, price: 999000 },
            { maxMeters: 2, price: 888000 },
        ]);
        // bigOrder ≈ 29.5m, không bậc nào khớp → lấy bậc cuối.
        expect(calculateUvDtf({ ...bigOrder, dieCut: true }, cfg).pricePerMeter).toBe(888000);
    });
});

describe('seedDieCutTiers — bảng để admin sửa', () => {
    it('chưa có bảng bế → chép từ priceTiers CỦA XƯỞNG ĐÓ', () => {
        const shop = { ...config, priceTiers: [{ maxMeters: 2, price: 845000 }] };
        expect(seedDieCutTiers(shop)).toEqual([{ maxMeters: 2, price: 845000 }]);
    });

    it('trả object MỚI, không dùng chung reference với priceTiers', () => {
        const seeded = seedDieCutTiers(config);
        expect(seeded[0]).not.toBe(config.priceTiers[0]);
        seeded[0].price = 1;
        expect(config.priceTiers[0].price).toBe(440000);
    });

    it('đã có bảng bế → giữ nguyên bảng đó', () => {
        expect(seedDieCutTiers(withDie())).toEqual(DIE_TIERS);
    });

    it('vá luôn field rác pricePerMeter khi chép', () => {
        const legacy = { ...config, priceTiers: [{ maxMeters: 2, pricePerMeter: 845000 }] };
        expect(seedDieCutTiers(legacy)).toEqual([{ maxMeters: 2, price: 845000 }]);
    });
});

describe('Lưu / đọc lại', () => {
    it('restoreInfinity khôi phục maxMeters = Infinity cho bảng bế', () => {
        const fromJson = JSON.parse(JSON.stringify(withDie()));
        expect(fromJson.dieCutPriceTiers[3].maxMeters).toBeNull();
        expect(restoreInfinity(fromJson).dieCutPriceTiers[3].maxMeters).toBe(Infinity);
    });

    it('schema: thiếu field → hợp lệ', () => {
        expect(validateUvDtfConfig(config).isValid).toBe(true);
    });

    it('schema: mảng rỗng → hợp lệ (khác priceTiers vốn bắt buộc có bậc)', () => {
        expect(validateUvDtfConfig(withDie([])).isValid).toBe(true);
    });

    it('schema: sai kiểu → báo lỗi đúng tên bảng, không đổ tội cho priceTiers', () => {
        const r = validateUvDtfConfig(withDie([{ maxMeters: '2', price: 1 }]));
        expect(r.isValid).toBe(false);
        expect(r.errors.some((e) => e.includes('dieCutPriceTiers[0].maxMeters'))).toBe(true);
        expect(r.errors.some((e) => e.startsWith('priceTiers['))).toBe(false);
    });

    it('schema: không phải array → báo lỗi', () => {
        expect(validateUvDtfConfig(withDie('x')).isValid).toBe(false);
    });
});
