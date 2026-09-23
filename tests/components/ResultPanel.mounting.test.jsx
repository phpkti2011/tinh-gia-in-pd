// @vitest-environment jsdom
//
// Dòng tiền BỒI trên màn kết quả In KTS khổ nhỏ (config 1.5.0):
//   - Nhãn công bồi nói rõ mấy lớp (trước đây luôn ghi "Bồi carton", giờ lớp kia có thể
//     là tờ giấy chọn được nên "carton" không còn đúng).
//   - Có dòng riêng cho tiền giấy trắng, kèm số tờ/bộ — để người báo giá thấy vì sao đắt.
//
// Chạy engine thật như các test ResultPanel khác. Mock useAuth/useUserRole để không kéo
// Supabase client vào.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

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
        isAdmin: false,
        role: 'staff',
        loading: false,
        error: null,
        refreshRole: () => {},
    }),
}));

import ResultPanel from '../../src/components/smallprint/ResultPanel.jsx';
import { calculatePaperOptions, calculateFinishingCost } from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

afterEach(() => cleanup());

const baseParams = {
    paperType: '3',
    productQuantity: 500,
    printSides: 2,
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

function renderPanel(overrides = {}) {
    const params = { ...baseParams, ...overrides };
    const all = [];
    calculatePaperOptions(
        params,
        DEFAULT_CONFIG.PAPER_STOCK_DATA[3],
        9.3,
        5.8,
        all,
        0,
        false,
        DEFAULT_CONFIG
    );
    all.sort((a, b) => a.costPerProduct - b.costPerProduct);
    const best = all.find((r) => r.cutSheetH <= 48) || all[0];

    // Y hệt App.jsx: công bồi tính theo SỐ TỜ IN.
    const totalPrintSheets = Math.ceil(params.productQuantity / best.productsPerSheet);
    const mounting = calculateFinishingCost(
        totalPrintSheets,
        params.mountingType,
        DEFAULT_CONFIG.MOUNTING_CONFIG?.[params.mountingType]
    );
    const finishingCustomerPrices = {
        holePunching: 0,
        creasing: 0,
        mounting: mounting.customerPrice,
    };
    const dieCuttingCustomerPrice = { moldCost: 0, laborCustomerPrice: 0 };
    const quote = calculateCustomerQuote(
        best,
        params,
        finishingCustomerPrices,
        dieCuttingCustomerPrice,
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
            mountingCost={mounting.cost}
            // Panel TỰ tính lại báo giá cho dòng đang chọn trong bảng so sánh, nên
            // phải truyền prop này chứ không chỉ truyền `quote`.
            finishingCustomerPrices={finishingCustomerPrices}
            dieCuttingCustomerPrice={dieCuttingCustomerPrice}
        />
    );
    return quote;
}

const body = () => document.body.textContent.replace(/\s+/g, ' ');

describe('Nhãn công bồi', () => {
    it('bồi 2 lớp → "Công bồi 2 lớp", KHÔNG còn "Bồi carton"', () => {
        renderPanel({ mountingType: 'yes', printSides: 2 });
        expect(body()).toContain('Công bồi 2 lớp');
        expect(body()).not.toContain('Bồi carton');
    });

    it('bồi 3 lớp → "Công bồi 3 lớp"', () => {
        renderPanel({ mountingType: '3_lop', printSides: 2 });
        expect(body()).toContain('Công bồi 3 lớp');
        expect(body()).not.toContain('Công bồi 2 lớp');
    });

    it('không bồi → không có dòng công bồi nào', () => {
        renderPanel();
        expect(body()).not.toContain('Công bồi');
    });
});

describe('Dòng tiền giấy trắng', () => {
    it('bồi 3 lớp 2 mặt → hiện dòng giấy trắng, ghi 1 tờ/bộ', () => {
        const quote = renderPanel({ mountingType: '3_lop', printSides: 2 });
        expect(quote.totalBlankPaperCost).toBeGreaterThan(0);
        expect(body()).toContain('Giấy trắng bồi (1 tờ/bộ)');
    });

    it('bồi 2 lớp 1 mặt → cũng hiện, 1 tờ/bộ', () => {
        renderPanel({ mountingType: 'yes', printSides: 1 });
        expect(body()).toContain('Giấy trắng bồi (1 tờ/bộ)');
    });

    it('bồi 2 lớp 2 mặt → KHÔNG có tờ trắng nên ẩn dòng', () => {
        renderPanel({ mountingType: 'yes', printSides: 2 });
        expect(body()).not.toContain('Giấy trắng bồi');
    });

    it('không bồi → ẩn dòng', () => {
        renderPanel();
        expect(body()).not.toContain('Giấy trắng bồi');
    });
});
