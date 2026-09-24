// @vitest-environment jsdom
//
// GIÁ SÀN trên màn kết quả In KTS khổ nhỏ (config v1.8.0).
//
// Giá sàn vừa LÀ "Giá Tối Thiểu", vừa KẸP giá báo khách: khách = max(bảng giá, sàn).
// Nhờ vậy Giá Tối Thiểu không bao giờ lớn hơn Giá Báo Khách — yêu cầu gốc của chủ tiệm.
//
// Ba ràng buộc chốt ở đây:
//   1. Đơn TRÊN sàn không được đổi một đồng — phần lớn đơn của tiệm nằm ở đây.
//   2. Đơn DƯỚI sàn bị nâng thật, và các dòng chi tiết vẫn cộng ra đúng tổng (nếu không
//      nhân viên sẽ thấy bảng kê không khớp).
//   3. Nhân viên KHÔNG thấy chữ "giá sàn"; chỉ admin thấy lý do nâng.
//
// Chạy engine thật như các test ResultPanel khác.

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

let mockIsAdmin = false;

vi.mock('../../src/auth/useAuth', () => ({
    useAuth: () => ({
        user: { id: 'u1' },
        session: null,
        loading: false,
        error: null,
        signIn: async () => {},
        signOut: async () => {},
    }),
}));

vi.mock('../../src/auth/useUserRole', () => ({
    useUserRole: () => ({
        isAdmin: mockIsAdmin,
        role: mockIsAdmin ? 'admin' : 'staff',
        loading: false,
        error: null,
        refreshRole: () => {},
    }),
}));

import ResultPanel from '../../src/components/smallprint/ResultPanel.jsx';
import {
    calculatePaperOptions,
    calculatePerSheetOptions,
} from '../../src/modules/small-print/engine/options.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { calculateFloorPrice } from '../../src/modules/small-print/engine/floorPrice.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

beforeEach(() => {
    mockIsAdmin = false;
});
afterEach(() => cleanup());

const C300 = 3;
const DECAL_XI = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'per_sheet');

const baseParams = {
    paperType: String(C300),
    productQuantity: 500,
    printSides: 1,
    printColorMode: '4color',
    laminationType: 'none',
    laminationFilm: '',
    plasticThickness: 'none',
    plasticSize: '',
    printContents: 1,
    variableData: 'no',
    largeSheetSelector: '0',
    customSheetW: 70,
    customSheetH: 100,
    artPaperPrice: 0,
    productW: 9,
    productH: 5.5,
    bleed: 0.15,
    mountingType: 'none',
    blankPaperType: '3',
    dieCuttingType: 'none',
    moldType: 'simple',
    foilStamping: 'none',
    customFinishingType: 'none',
};

const NO_FIN = { holePunching: 0, creasing: 0, mounting: 0 };
const NO_DIE = { moldCost: 0, laborCustomerPrice: 0 };

function setup(overrides = {}, props = {}) {
    const params = { ...baseParams, ...overrides };
    const paper = DEFAULT_CONFIG.PAPER_STOCK_DATA[Number(params.paperType)];
    const w = params.productW + params.bleed * 2;
    const h = params.productH + params.bleed * 2;

    const all = [];
    const run =
        paper.pricingModel === 'per_sheet' ? calculatePerSheetOptions : calculatePaperOptions;
    run(params, paper, w, h, all, 0, false, DEFAULT_CONFIG);
    all.sort((a, b) => a.costPerProduct - b.costPerProduct);
    const best = all.find((r) => r.cutSheetH <= 48) || all[0];

    const quote = calculateCustomerQuote(best, params, NO_FIN, NO_DIE, null, DEFAULT_CONFIG);

    const floor = calculateFloorPrice({
        pricingModel: paper.pricingModel,
        totalA4Pages: quote.totalA4PagesRaw,
        paperCost:
            params.productQuantity *
            ((best.paperCostPerProduct || 0) + (best.blankPaperCostPerProduct || 0)),
        otherCost:
            params.productQuantity * (best.laminationCostPerProduct || 0) +
            (props.customFinishingCost || 0),
        quantity: params.productQuantity,
        printContents: params.printContents,
        config: DEFAULT_CONFIG,
    });

    render(
        <ResultPanel
            results={[best]}
            quote={quote}
            params={params}
            config={DEFAULT_CONFIG}
            isCalculating={false}
            finishingCustomerPrices={NO_FIN}
            dieCuttingCustomerPrice={NO_DIE}
            {...props}
        />
    );
    return { quote, floor };
}

const body = () => document.body.textContent.replace(/\s+/g, ' ');
const numOf = (testId) => Number(screen.getByTestId(testId).textContent.replace(/[^\d]/g, ''));

describe('Đơn TRÊN sàn — không đổi một đồng', () => {
    it('C300 500 cái: tổng báo khách y hệt bảng giá', () => {
        const { quote } = setup();
        expect(numOf('customer-total')).toBe(Math.round(quote.totalCustomerCost / 1000) * 1000);
    });

    it('không có dòng phụ thu tối thiểu', () => {
        setup();
        expect(body()).not.toContain('Phụ thu tối thiểu');
    });

    it('admin cũng không thấy dòng giải thích nâng giá', () => {
        mockIsAdmin = true;
        setup();
        expect(body()).not.toContain('đã nâng');
    });
});

describe('Đơn DƯỚI sàn — nâng thật lên sàn', () => {
    // Decal xi bạc, in 1 mặt, 10.000 cái: bảng giá ra 4.032.000đ nhưng sàn là 4.256.000đ
    // (1.100đ × 960 trang + tiền giấy thật). Đúng ca chủ tiệm lo: đơn số lượng lớn, đơn
    // giá tụt xuống bậc thấp nhất trong khi tiền giấy thì không giảm.
    const duoiSan = { paperType: String(DECAL_XI), productQuantity: 10000, printSides: 1 };

    it('bảng giá THẤP HƠN sàn — tiền đề của mấy test dưới', () => {
        const { quote, floor } = setup(duoiSan);
        expect(quote.totalCustomerCost).toBeLessThan(floor.total);
    });

    it('tổng báo khách được nâng lên đúng mức sàn', () => {
        const { floor } = setup(duoiSan);
        expect(numOf('customer-total')).toBe(Math.round(floor.total / 1000) * 1000);
    });

    it('có dòng phụ thu, và các dòng chi tiết cộng lại ra đúng tổng', () => {
        const { quote, floor } = setup(duoiSan);
        expect(body()).toContain('Phụ thu tối thiểu');

        const topUp = floor.total - quote.totalCustomerCost;
        expect(body()).toContain(Math.round(topUp).toLocaleString('vi-VN'));
    });

    it('Giá Tối Thiểu = mức sàn, và KHÔNG lớn hơn tổng báo khách', () => {
        mockIsAdmin = true;
        const { floor } = setup(duoiSan);

        expect(numOf('min-price')).toBe(Math.round(floor.total));
        expect(numOf('min-price')).toBeLessThanOrEqual(numOf('customer-total'));
    });
});

describe('Nhân viên không thấy chữ giá sàn', () => {
    const duoiSan = { paperType: String(DECAL_XI), productQuantity: 10000, printSides: 1 };

    it('staff: thấy dòng phụ thu nhưng KHÔNG thấy chữ "giá sàn"', () => {
        setup(duoiSan);
        expect(body()).toContain('Phụ thu tối thiểu');
        expect(body()).not.toContain('giá sàn');
        expect(body()).not.toContain('đã nâng');
    });

    it('admin: thấy đầy đủ số bảng giá gốc và mức đã nâng', () => {
        mockIsAdmin = true;
        const { quote } = setup(duoiSan);

        expect(body()).toContain('giá sàn');
        expect(body()).toContain('đã nâng');
        expect(body()).toContain(Math.round(quote.totalCustomerCost).toLocaleString('vi-VN'));
    });
});

describe('Mức sàn hiện đúng theo loại giấy', () => {
    const ref = DEFAULT_CONFIG.PAPER_REFERENCE_CONFIG;

    it('giấy ram → mức đã gồm giấy', () => {
        mockIsAdmin = true;
        setup();
        expect(body()).toContain('đã gồm giấy');
        expect(body()).toContain(ref.minPrintPricePerPage.toLocaleString('vi-VN'));
    });

    it('decal xi (theo tờ) → mức chỉ in, giấy tính riêng', () => {
        mockIsAdmin = true;
        setup({ paperType: String(DECAL_XI), productQuantity: 10000 });
        expect(body()).toContain('chỉ in, giấy tính riêng');
        expect(body()).toContain(ref.minPrintOnlyPricePerPage.toLocaleString('vi-VN'));
    });
});

describe('Gia công thêm phải vào cả hai con số', () => {
    // Lỗi cũ: baseCost ở panel đầu trang QUÊN customFinishingCost, trong khi bảng so sánh
    // ngay dưới lại có cộng — đơn có gia công thêm bị hụt tiền ở panel.
    it('truyền customFinishingCost → "Giá vốn × biên" tăng lên', () => {
        mockIsAdmin = true;
        setup({}, { customFinishingCost: 0 });
        const khong = numOf('cost-plus-margin');
        cleanup();

        mockIsAdmin = true;
        setup({}, { customFinishingCost: 500000 });
        expect(numOf('cost-plus-margin')).toBeGreaterThan(khong);
    });

    it('truyền customFinishingCost → Giá Tối Thiểu cũng tăng', () => {
        mockIsAdmin = true;
        setup({}, { customFinishingCost: 0 });
        const khong = numOf('min-price');
        cleanup();

        mockIsAdmin = true;
        setup({}, { customFinishingCost: 500000 });
        expect(numOf('min-price')).toBe(khong + 500000);
    });
});

describe('Tắt sàn là mọi giá về như cũ', () => {
    it('sàn = 0 → không kẹp, tổng y hệt bảng giá', () => {
        const off = structuredClone(DEFAULT_CONFIG);
        off.PAPER_REFERENCE_CONFIG.minPrintPricePerPage = 0;
        off.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage = 0;

        const params = { ...baseParams, paperType: String(DECAL_XI), productQuantity: 10000 };
        const paper = off.PAPER_STOCK_DATA[DECAL_XI];
        const all = [];
        calculatePerSheetOptions(params, paper, 9.3, 5.8, all, 0, false, off);
        all.sort((a, b) => a.costPerProduct - b.costPerProduct);
        const best = all.find((r) => r.cutSheetH <= 48) || all[0];
        const quote = calculateCustomerQuote(best, params, NO_FIN, NO_DIE, null, off);

        render(
            <ResultPanel
                results={[best]}
                quote={quote}
                params={params}
                config={off}
                isCalculating={false}
                finishingCustomerPrices={NO_FIN}
                dieCuttingCustomerPrice={NO_DIE}
            />
        );

        expect(body()).not.toContain('Phụ thu tối thiểu');
        expect(numOf('customer-total')).toBe(Math.round(quote.totalCustomerCost / 1000) * 1000);
    });
});
