// @vitest-environment jsdom
//
// Dán thành phẩm trên màn kết quả In KTS khổ nhỏ (config 1.9.0).
//
// - Mỗi dòng dán hiện một dòng riêng trong bảng kê "Giá", cộng đúng vào tổng báo khách.
// - Giá vốn dán đi vào CẢ "Giá vốn × biên" LẪN Giá Tối Thiểu (giá sàn) như mọi gia công khác.
// - Dòng dán không tính được tiền (vượt bậc cuối / kiểu đã bị xoá) phải có cảnh báo, không
//   lặng lẽ ra 0 đ.
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
import { calculatePaperOptions } from '../../src/modules/small-print/engine/options.js';
import { calculateGluingCost } from '../../src/modules/small-print/engine/pricing.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
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

const PEEL = 'glue-peel-seal';
const DOUBLE = 'glue-double-sided-yellow';

const baseParams = {
    paperType: '3',
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

// lines = danh sách dòng dán; undefined = màn cũ không truyền prop gluingResult.
function setup(lines, types = DEFAULT_CONFIG.GLUING_TYPES, overrides = {}) {
    const params = { ...baseParams, ...overrides, gluingLines: lines || [] };
    const paper = DEFAULT_CONFIG.PAPER_STOCK_DATA[Number(params.paperType)];
    const all = [];
    calculatePaperOptions(
        params,
        paper,
        params.productW + params.bleed * 2,
        params.productH + params.bleed * 2,
        all,
        0,
        false,
        DEFAULT_CONFIG
    );
    all.sort((a, b) => a.costPerProduct - b.costPerProduct);
    const best = all.find((r) => r.cutSheetH <= 48) || all[0];
    const gluingResult = lines
        ? calculateGluingCost(params.productQuantity, lines, types)
        : undefined;
    const finishingCustomerPrices = gluingResult
        ? { ...NO_FIN, gluing: gluingResult.customerPrice }
        : NO_FIN;
    const quote = calculateCustomerQuote(
        best,
        params,
        finishingCustomerPrices,
        NO_DIE,
        null,
        DEFAULT_CONFIG
    );
    render(
        <ResultPanel
            results={[best]}
            quote={quote}
            params={params}
            config={DEFAULT_CONFIG}
            isCalculating={false}
            finishingCustomerPrices={finishingCustomerPrices}
            dieCuttingCustomerPrice={NO_DIE}
            gluingResult={gluingResult}
        />
    );
    return { quote, gluingResult };
}

const body = () => document.body.textContent.replace(/\s+/g, ' ');
const numOf = (testId) => Number(screen.getByTestId(testId).textContent.replace(/[^\d]/g, ''));

describe('Dòng dán trong bảng kê giá khách', () => {
    it('không dán → không có dòng dán, tổng y như cũ, không NaN (kể cả khi thiếu prop)', () => {
        setup([]);
        const withEmpty = numOf('customer-total');
        expect(body()).not.toContain('Dán keo');
        cleanup();
        setup(undefined);
        expect(numOf('customer-total')).toBe(withEmpty);
        expect(body()).not.toContain('NaN');
        expect(body()).not.toContain('Dán keo');
    });

    it('hai kiểu dán cho 500 SP → hai dòng riêng, tổng tăng đúng 300.000 + 400.000', () => {
        setup([]);
        const base = numOf('customer-total');
        cleanup();
        const { gluingResult } = setup([{ typeId: PEEL }, { typeId: DOUBLE }]);
        expect(gluingResult.customerPrice).toBe(700000);
        expect(body()).toContain('Dán keo phá màng300.000 đ');
        expect(body()).toContain('Dán keo 2 mặt vàng400.000 đ');
        expect(numOf('customer-total')).toBe(base + 700000);
    });

    it('hai dòng cùng kiểu (dán hai đường) → hai dòng, mỗi dòng một lần tiền', () => {
        setup([]);
        const base = numOf('customer-total');
        cleanup();
        setup([{ typeId: PEEL }, { typeId: PEEL }], undefined, { productQuantity: 500 });
        expect(body().split('Dán keo phá màng300.000 đ')).toHaveLength(3);
        expect(numOf('customer-total')).toBe(base + 600000);
    });

    it('bậc trọn gói: 50 SP → mỗi dòng đúng một gói 60.000 / 80.000', () => {
        setup([{ typeId: PEEL }, { typeId: DOUBLE }], undefined, { productQuantity: 50 });
        expect(body()).toContain('Dán keo phá màng60.000 đ');
        expect(body()).toContain('Dán keo 2 mặt vàng80.000 đ');
    });
});

describe('Cảnh báo khi dòng dán chưa tính được tiền', () => {
    it('số lượng vượt bậc cuối hữu hạn → cảnh báo, dòng đó không vào bảng kê', () => {
        const capped = structuredClone(DEFAULT_CONFIG.GLUING_TYPES);
        capped[0].cost_tiers[1].max_qty = 200;
        capped[0].customer_tiers[1].max_qty = 200;
        const { gluingResult } = setup([{ typeId: PEEL }], capped);
        expect(gluingResult.uncoveredCount).toBe(1);
        expect(body()).toContain('chưa có bậc giá cho 500 sản phẩm');
        expect(body()).not.toContain('Dán keo phá màng');
    });

    it('kiểu dán đã bị xoá trong Cài Đặt → cảnh báo chọn lại', () => {
        setup([{ typeId: 'glue-da-xoa' }, { typeId: DOUBLE }]);
        expect(body()).toContain('chưa chọn kiểu dán');
        expect(body()).toContain('Dán keo 2 mặt vàng400.000 đ');
    });

    it('đơn bình thường không có cảnh báo nào', () => {
        setup([{ typeId: PEEL }]);
        expect(body()).not.toContain('chưa có bậc giá');
        expect(body()).not.toContain('chưa chọn kiểu dán');
    });
});

describe('Giá vốn dán vào cả hai con số của admin', () => {
    // 500 SP: vốn dán keo phá màng = 500 × 300 = 150.000 đ.
    it('"Giá vốn × biên" tăng khi có dòng dán', () => {
        mockIsAdmin = true;
        setup([]);
        const khong = numOf('cost-plus-margin');
        cleanup();
        mockIsAdmin = true;
        setup([{ typeId: PEEL }]);
        expect(numOf('cost-plus-margin')).toBeGreaterThan(khong);
    });

    it('Giá Tối Thiểu tăng đúng bằng giá vốn dán', () => {
        mockIsAdmin = true;
        setup([]);
        const khong = numOf('min-price');
        cleanup();
        mockIsAdmin = true;
        const { gluingResult } = setup([{ typeId: PEEL }]);
        expect(gluingResult.cost).toBe(150000);
        expect(numOf('min-price')).toBe(khong + 150000);
    });
});
