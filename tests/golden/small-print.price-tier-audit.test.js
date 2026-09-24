// Soát bảng giá khách tìm chỗ "nghịch bậc" — khách đặt THÊM trang lại TRẢ ÍT HƠN.
//
// Hàm thuần, không dựng DOM. Màn Cài Đặt chỉ việc vẽ lại kết quả của nó.
//
// Hai ràng buộc quan trọng nhất ở file này:
//   1. Công thức tiền phải khớp NGUYÊN VĂN engine/quote.js (pages × print, hoặc print
//      phẳng cho bậc trọn gói) — lệch một chỗ là cảnh báo sai số tiền trên màn hình.
//   2. Bậc có đơn giá 0 KHÔNG được sinh cảnh báo: ô nhập số commit theo từng phím nên
//      xoá số để gõ lại là có một nhịp giá = 0.

import { describe, it, expect } from 'vitest';
import {
    tierPrintTotal,
    auditCustomerPriceTiers,
} from '../../src/modules/small-print/config/priceTierAudit.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig.js';

const perPage = (min, max, print) => ({ min, max, print, laminate: 0, type: 'per_page' });
const pkg = (min, max, print) => ({ min, max, print, laminate: 0, type: 'package' });

describe('tierPrintTotal', () => {
    it('per_page → số trang × đơn giá', () => {
        expect(tierPrintTotal(perPage(1, 100, 2500), 80)).toBe(200000);
    });

    it('package → giá phẳng, bao nhiêu trang cũng vậy', () => {
        const t = pkg(11, 15, 80000);
        expect(tierPrintTotal(t, 11)).toBe(80000);
        expect(tierPrintTotal(t, 15)).toBe(80000);
    });

    it('bậc rác → null, không nổ', () => {
        expect(tierPrintTotal(null, 10)).toBeNull();
        expect(tierPrintTotal({ type: 'per_page' }, 10)).toBeNull();
        expect(tierPrintTotal(perPage(1, 10, 2500), undefined)).toBeNull();
    });
});

describe('Bảng giá mặc định — bắt đúng chỗ đang nghịch', () => {
    const found = auditCustomerPriceTiers(DEFAULT_CONFIG.CUSTOMER_PRICE_TIERS);

    // Con số này đổi = có người sửa bảng giá mặc định. Đó là việc cố ý, sửa test theo.
    it('đúng 7 chỗ nghịch', () => {
        expect(found).toHaveLength(7);
    });

    it('chỗ nặng nhất là vách 1.000 → 1.001, hụt 398.200đ', () => {
        const worst = found.find((w) => w.atPages === 1000);
        expect(worst).toMatchObject({
            atPages: 1000,
            total: 2200000,
            nextPages: 1001,
            nextTotal: 1801800,
            drop: 398200,
        });
    });

    it('index trỏ đúng cặp bậc trong mảng gốc', () => {
        const tiers = DEFAULT_CONFIG.CUSTOMER_PRICE_TIERS;
        for (const w of found) {
            expect(tiers[w.index].max).toBe(w.atPages);
            expect(tiers[w.nextIndex].min).toBe(w.nextPages);
        }
    });

    it('bắt cả vách trọn gói → theo trang (559 → 560)', () => {
        expect(found.find((w) => w.atPages === 559)).toMatchObject({
            total: 1250000,
            nextTotal: 1232000,
            drop: 18000,
        });
    });
});

describe('Không kêu oan', () => {
    it('bảng tăng đều → rỗng', () => {
        // 100×3.000 = 300.000 ≤ 101×3.000 = 303.000; 500×3.000 = 1,5tr ≤ 501×2.999.
        expect(
            auditCustomerPriceTiers([
                perPage(1, 100, 3000),
                perPage(101, 500, 3000),
                perPage(501, Infinity, 2999),
            ])
        ).toEqual([]);
    });

    it('bằng nhau đúng vách → rỗng (bằng KHÔNG phải nghịch)', () => {
        // Vách là max của bậc trước đối đầu min của bậc sau: 100×2.020 = 101×2.000 = 202.000.
        expect(auditCustomerPriceTiers([perPage(1, 100, 2020), perPage(101, 500, 2000)])).toEqual(
            []
        );
    });

    it('bậc trọn gói vừa khít → rỗng', () => {
        // 10 × 5.000 = 50.000 = giá trọn gói bậc sau
        expect(auditCustomerPriceTiers([perPage(1, 10, 5000), pkg(11, 15, 50000)])).toEqual([]);
    });

    it('bậc cuối max = Infinity hoặc null → bỏ qua, không nổ', () => {
        expect(auditCustomerPriceTiers([perPage(1, Infinity, 3000), perPage(2, 5, 1)])).toEqual([]);
        expect(auditCustomerPriceTiers([perPage(1, null, 3000), perPage(2, 5, 1)])).toEqual([]);
    });
});

describe('Bắt đúng cả hai chiều trọn gói', () => {
    it('theo trang → trọn gói', () => {
        // 100 × 3.000 = 300.000, bậc sau trọn gói chỉ 250.000
        expect(auditCustomerPriceTiers([perPage(1, 100, 3000), pkg(101, 150, 250000)])).toEqual([
            {
                index: 0,
                atPages: 100,
                total: 300000,
                nextIndex: 1,
                nextPages: 101,
                nextTotal: 250000,
                drop: 50000,
            },
        ]);
    });

    it('trọn gói → theo trang', () => {
        // trọn gói 250.000, bậc sau 101 × 2.000 = 202.000
        const [w] = auditCustomerPriceTiers([pkg(1, 100, 250000), perPage(101, 500, 2000)]);
        expect(w).toMatchObject({ total: 250000, nextTotal: 202000, drop: 48000 });
    });
});

describe('Đang gõ dở không được nháy đỏ', () => {
    it('đơn giá bậc sau = 0 → KHÔNG cảnh báo', () => {
        expect(auditCustomerPriceTiers([perPage(1, 100, 3000), perPage(101, 500, 0)])).toEqual([]);
    });

    it('đơn giá bậc trước = 0 → KHÔNG cảnh báo', () => {
        expect(auditCustomerPriceTiers([perPage(1, 100, 0), perPage(101, 500, 2500)])).toEqual([]);
    });

    it('bỏ qua vách đang gõ nhưng vẫn bắt các vách khác', () => {
        const found = auditCustomerPriceTiers([
            perPage(1, 100, 3000),
            perPage(101, 500, 0), // đang gõ
            perPage(501, 1000, 2500),
            perPage(1001, Infinity, 1000), // 1.000×2.500 = 2.5tr → 1.001×1.000 = 1.001tr
        ]);
        expect(found).toHaveLength(1);
        expect(found[0]).toMatchObject({ index: 2, atPages: 1000, nextIndex: 3 });
    });
});

describe('Mảng lộn xộn / rác', () => {
    it('xếp sai thứ tự min → vẫn bắt đúng, index là VỊ TRÍ GỐC', () => {
        const tiers = [
            perPage(1001, Infinity, 1000), // vị trí 0, nhưng là bậc cuối
            perPage(1, 1000, 2500), // vị trí 1, nhưng là bậc đầu
        ];
        expect(auditCustomerPriceTiers(tiers)).toEqual([
            {
                index: 1,
                atPages: 1000,
                total: 2500000,
                nextIndex: 0,
                nextPages: 1001,
                nextTotal: 1001000,
                drop: 1499000,
            },
        ]);
    });

    it('phần tử rác bị loại, không ném', () => {
        expect(auditCustomerPriceTiers([null, 'x', perPage(1, 10, 100)])).toEqual([]);
        expect(auditCustomerPriceTiers([{ print: 100 }, perPage(1, 10, 100)])).toEqual([]);
    });

    it('không phải mảng / rỗng → rỗng', () => {
        expect(auditCustomerPriceTiers(undefined)).toEqual([]);
        expect(auditCustomerPriceTiers(null)).toEqual([]);
        expect(auditCustomerPriceTiers({})).toEqual([]);
        expect(auditCustomerPriceTiers([])).toEqual([]);
        expect(auditCustomerPriceTiers([perPage(1, 10, 100)])).toEqual([]);
    });
});
