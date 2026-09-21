// Khổ in tối đa của máy (config v1.3.0) — In Khổ Lớn.
//
// Luật: khổ in tại xưởng = min(MACHINE_MAX_PRINT_WIDTH_M, khổ cuộn lớn nhất của vật liệu).
// Tấm luôn xoay được ⇒ chỉ CẠNH NGẮN phải lọt. Cả 2 chiều đều lớn hơn ⇒ KHÔNG báo giá.
//
// Hai ràng buộc quan trọng nhất ở file này:
//   1. Mốc là "LỚN HƠN": tấm đúng 160cm vẫn in được và vẫn ra giá (Case E golden là
//      60×160 — nếu đổi thành >= thì case đó gãy).
//   2. Khổ máy chặn CẢ CÁCH XẾP, không chỉ chặn báo giá. Không có phần đó thì tấm
//      80×180 vẫn lọt guard (cạnh ngắn 80) rồi được xếp XOAY trên cuộn 1m8 vì waste = 0
//      nên rẻ nhất — tức báo giá cho phương án đặt 180cm ngang qua máy 160cm.

import { describe, it, expect } from 'vitest';
import { calculateLargePrint } from '../../src/utils/largePrintCalculator.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

const config = LARGE_PRINT_DEFAULT_CONFIG;

const base = {
    quantity: 1,
    laminationTypeKey: 'none',
    formexTypeKey: 'none',
    edgeTaping: false,
    grommetsCheck: false,
    grommetsCount: 0,
    dieCutting: false,
    standeeKey: 'none',
};

const sheet = (w, h, materialTypeKey = 'hiflex', cfgItems = null) => ({
    ...base,
    materialTypeKey,
    items: cfgItems || [{ width: w, height: h, quantity: 1 }],
});

// Config không có field khổ máy — mô phỏng config dựng tay / lưu trước v1.3.0.
function withoutMachineLimit() {
    const c = structuredClone(config);
    delete c.MACHINE_MAX_PRINT_WIDTH_M;
    return c;
}

describe('Mặc định: máy in được 1.6m', () => {
    it('config mặc định khai đúng 1.6', () => {
        expect(config.MACHINE_MAX_PRINT_WIDTH_M).toBe(1.6);
    });
});

describe('Cả 2 chiều > khổ máy → không báo giá', () => {
    it('bạt 170×170 → outsource, không có totalCost', () => {
        const r = calculateLargePrint(sheet(170, 170), config);
        expect(r.outsource).toBe(true);
        expect(r.totalCost).toBeUndefined();
        expect(r.error).toMatch(/IN GIA CÔNG Ở NGOÀI/);
        expect(r.error).toMatch(/160 cm/);
        expect(r.error).toMatch(/170×170 cm/);
    });

    it('bạt 161×161 (vừa quá mốc) → outsource', () => {
        expect(calculateLargePrint(sheet(161, 161), config).outsource).toBe(true);
    });

    it('bạt 160×160 (ĐÚNG mốc) → vẫn ra giá, vì luật là "lớn hơn"', () => {
        const r = calculateLargePrint(sheet(160, 160), config);
        expect(r.error).toBeUndefined();
        expect(typeof r.totalCost).toBe('number');
    });

    it('bạt 170×100 → xoay được nên vẫn ra giá bình thường', () => {
        const r = calculateLargePrint(sheet(170, 100), config);
        expect(r.error).toBeUndefined();
        expect(typeof r.totalCost).toBe('number');
    });
});

describe('Vượt khổ CUỘN vật liệu ≠ vượt khổ máy', () => {
    // PP cuộn lớn nhất 1.52m < khổ máy 1.6m ⇒ PP bị chặn bởi cuộn, không phải máy.
    it('PP 155×155 → lỗi khổ cuộn, KHÔNG phải "in gia công ngoài"', () => {
        const r = calculateLargePrint(sheet(155, 155, 'pp_co_keo'), config);
        expect(r.outsource).toBe(false);
        expect(r.error).toMatch(/khổ cuộn lớn nhất của PP Có Keo \(152 cm\)/);
        expect(r.error).toMatch(/đổi vật liệu/);
    });

    it('cùng kích thước đó trên bạt (cuộn 1m8) thì in được', () => {
        const r = calculateLargePrint(sheet(155, 155), config);
        expect(r.error).toBeUndefined();
        expect(typeof r.totalCost).toBe('number');
    });

    it('vượt cả hai → báo theo khổ MÁY (đổi vật liệu cũng không cứu được)', () => {
        const r = calculateLargePrint(sheet(400, 400, 'pp_co_keo'), config);
        expect(r.outsource).toBe(true);
        expect(r.error).toMatch(/khổ in tối đa của máy/);
    });
});

describe('Nhiều tấm', () => {
    it('chỉ tấm thứ 2 quá khổ → chặn cả đơn, nêu đích danh tấm đó', () => {
        const r = calculateLargePrint(
            sheet(0, 0, 'hiflex', [
                { width: 100, height: 100, quantity: 1 },
                { width: 170, height: 170, quantity: 1 },
            ]),
            config
        );
        expect(r.outsource).toBe(true);
        expect(r.error).toMatch(/Tấm 170×170 cm/);
        expect(r.error).not.toMatch(/100×100/);
    });

    it('2 tấm cùng quá khổ → liệt kê cả hai', () => {
        const r = calculateLargePrint(
            sheet(0, 0, 'hiflex', [
                { width: 170, height: 170, quantity: 1 },
                { width: 200, height: 200, quantity: 1 },
            ]),
            config
        );
        expect(r.error).toMatch(/2 tấm \(170×170 cm, 200×200 cm\)/);
    });
});

describe('Khổ máy chặn CẢ CÁCH XẾP tấm (không chỉ chặn báo giá)', () => {
    // 80×180: cạnh ngắn 80 nên lọt guard. Cuộn 1m8 xoay ngang được 180cm ⇒ waste = 0
    // ⇒ rẻ nhất. Máy 1m6 không đặt nổi 180cm ngang, nên phải chạy dọc cuộn 1m0.
    const preset80x180 = sheet(80, 180);

    it('máy 1m6: xếp dọc cuộn 1m0 → 178.920đ', () => {
        const r = calculateLargePrint(preset80x180, config);
        expect(r.totalCost).toBeCloseTo(178920, 0);
        expect(r.rollWidth).toBe(1.0);
        expect(r.itemDetails[0].rotated).toBe(false);
    });

    it('bỏ giới hạn máy: quay lại phương án cũ xoay trên cuộn 1m8 → 172.800đ', () => {
        const r = calculateLargePrint(preset80x180, withoutMachineLimit());
        expect(r.totalCost).toBeCloseTo(172800, 0);
        expect(r.rollWidth).toBe(1.8);
        expect(r.itemDetails[0].rotated).toBe(true);
    });
});

describe('Fallback dễ dãi khi thiếu / hỏng field', () => {
    it('thiếu field → chỉ còn ràng buộc khổ cuộn: bạt 170×170 ra giá bình thường', () => {
        const r = calculateLargePrint(sheet(170, 170), withoutMachineLimit());
        expect(r.error).toBeUndefined();
        expect(typeof r.totalCost).toBe('number');
    });

    it('thiếu field → bạt 200×200 vẫn chặn theo cuộn 1m8, báo lỗi khổ cuộn', () => {
        const r = calculateLargePrint(sheet(200, 200), withoutMachineLimit());
        expect(r.outsource).toBe(false);
        expect(r.error).toMatch(/khổ cuộn lớn nhất của Bạt Hiflex \(180 cm\)/);
    });

    it.each([0, -1, '1.6', null])('giá trị hỏng (%s) → coi như thiếu field', (bad) => {
        const c = structuredClone(config);
        c.MACHINE_MAX_PRINT_WIDTH_M = bad;
        const r = calculateLargePrint(sheet(170, 170), c);
        expect(r.error).toBeUndefined();
        expect(typeof r.totalCost).toBe('number');
    });
});

describe('Không đụng các đường cũ', () => {
    it('vật liệu lạ vẫn trả null (không phải object lỗi)', () => {
        expect(calculateLargePrint(sheet(100, 100, 'khong_co_that'), config)).toBeNull();
    });

    it('vật liệu không có khổ cuộn nào → rơi về null như cũ', () => {
        const c = structuredClone(config);
        c.MATERIAL_TYPES.hiflex.options = [];
        expect(calculateLargePrint(sheet(100, 100), c)).toBeNull();
    });
});
