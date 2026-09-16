// @vitest-environment jsdom
//
// Ép plastic trên màn kết quả In KTS khổ nhỏ (config 1.4.0):
//   - Giá khách: 1 dòng "Ép plastic 80 mic — A4 (đơn giá/tấm)" cho MỌI NGƯỜI.
//   - Sàn bán (minPrice) CHỈ ADMIN: cộng thẳng vào cột "Giá tối thiểu" của bảng
//     so sánh (không nhân lợi nhuận) + dòng "Sàn ép plastic" trong panel 🏆.
//     Nhân viên không được thấy con số sàn ở bất kỳ đâu.
//   - Chưa chọn khổ: cảnh báo vàng, tổng không đổi.
//
// Chạy engine thật (như ResultPanels.rounding.test.jsx) vì panel tự tính lại
// báo giá bên trong. Mock useAuth/useUserRole để không kéo Supabase client.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

const authState = vi.hoisted(() => ({ isAdmin: true }));

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
        isAdmin: authState.isAdmin,
        role: authState.isAdmin ? 'admin' : 'staff',
        loading: false,
        error: null,
        refreshRole: () => {},
    }),
}));

import ResultPanel from '../../src/components/smallprint/ResultPanel.jsx';
import { calculatePaperOptions, calculatePlasticLamination } from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

afterEach(() => {
    cleanup();
    authState.isAdmin = true;
});

const body = () => document.body.textContent.replace(/\s+/g, ' ');
const txt = (el) => el.textContent.replace(/\s+/g, ' ').trim();
const num = (s) => Number(String(s).replace(/[^\d]/g, ''));

// 500 card visit 9×5.5 C300 2 mặt — tổng in 300.000đ (trùng E2E-3 Sub 3.1).
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
    // Y hệt App.jsx: engine ép plastic theo SỐ THÀNH PHẨM.
    const plasticResult = calculatePlasticLamination(
        params.productQuantity,
        params.plasticThickness,
        params.plasticSize,
        DEFAULT_CONFIG.PLASTIC_LAMINATION_CONFIG
    );
    const finishingCustomerPrices = {
        holePunching: 0,
        creasing: 0,
        mounting: 0,
        customFinishing: 0,
        plasticLamination: plasticResult.customerPrice,
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
            errorMsg={null}
            finishingCustomerPrices={finishingCustomerPrices}
            dieCuttingCustomerPrice={dieCuttingCustomerPrice}
            holePunchingCost={0}
            creasingCost={0}
            mountingCost={0}
            customFinishingCost={0}
            customFinishingLabel=""
            moldCost={0}
            laborCost={0}
            variableDataCost={0}
            foilResult={null}
            plasticResult={plasticResult}
            onChange={() => {}}
        />
    );
    return { quote, plasticResult };
}

// Cột "Giá tối thiểu" (admin) của phương án đầu tiên trong bảng so sánh.
function firstRowMinPrice() {
    const rows = screen.getAllByRole('row');
    const cells = within(rows[1]).getAllByRole('cell');
    return num(txt(cells[cells.length - 1]));
}

const total = () => txt(screen.getByText('Tổng Cộng Báo Khách').nextElementSibling);
// Tổng hiển thị đã làm tròn nghìn (money.js) — so với quote thật của cùng phương án.
const fmtTotal = (n) => `${(Math.round(n / 1000) * 1000).toLocaleString('vi-VN')} VNĐ`;

// Tổng nền (không ép plastic) — panel tự chọn phương án in rẻ nhất nên không
// nhét số cứng; mọi test dưới chỉ khẳng định phần CHÊNH do ép plastic.
function baselineTotal() {
    const { quote } = renderPanel();
    cleanup();
    return quote.totalCustomerCost;
}

describe('ResultPanel — ép plastic', () => {
    it('mặc định (không ép) → không có dòng ép plastic, không có sàn, tổng = quote', () => {
        const { quote } = renderPanel();
        expect(quote.plasticLaminationCustomerPrice).toBe(0);
        expect(body()).not.toContain('Ép plastic');
        expect(body()).not.toContain('Sàn ép plastic');
        expect(total()).toBe(fmtTotal(quote.totalCustomerCost));
    });

    it('80 mic A4 × 500 → dòng "Ép plastic 80 mic — A4 (4.500đ/tấm)" 2.250.000đ, tổng +2.250.000', () => {
        const base = baselineTotal();
        const { quote } = renderPanel({ plasticThickness: 'mic80', plasticSize: 'a4' });
        expect(quote.plasticLaminationCustomerPrice).toBe(2250000);
        expect(quote.totalCustomerCost).toBe(base + 2250000);
        expect(body()).toContain('Ép plastic 80 mic — A4 (4.500đ/tấm)');
        expect(body()).toContain('2.250.000 đ');
        expect(total()).toBe(fmtTotal(base + 2250000));
    });

    it('ADMIN: sàn 1.300×500 = 650.000 cộng thẳng vào cột Giá tối thiểu + dòng "Sàn ép plastic"', () => {
        renderPanel();
        const before = firstRowMinPrice();
        cleanup();
        const { plasticResult } = renderPanel({ plasticThickness: 'mic80', plasticSize: 'a4' });
        expect(plasticResult.minPrice).toBe(650000);
        expect(firstRowMinPrice() - before).toBe(650000);
        expect(body()).toContain('Sàn ép plastic');
        expect(body()).toContain('1.300 đ/tấm × 500 = 650.000 đ');
    });

    it('NHÂN VIÊN: thấy dòng giá khách nhưng KHÔNG thấy sàn ở bất kỳ đâu', () => {
        authState.isAdmin = false;
        const base = baselineTotal();
        const { quote } = renderPanel({ plasticThickness: 'mic80', plasticSize: 'a4' });
        expect(body()).toContain('Ép plastic 80 mic — A4 (4.500đ/tấm)');
        expect(body()).not.toContain('Sàn ép plastic');
        expect(body()).not.toContain('650.000');
        expect(body()).not.toContain('Giá tối thiểu');
        expect(quote.totalCustomerCost).toBe(base + 2250000);
        expect(total()).toBe(fmtTotal(base + 2250000));
    });

    it('chọn độ dày mà chưa chọn khổ → cảnh báo vàng, không có dòng tiền, tổng không đổi', () => {
        const base = baselineTotal();
        const { quote } = renderPanel({ plasticThickness: 'mic80', plasticSize: '' });
        expect(body()).toContain('Chưa chọn khổ ép plastic (80 mic)');
        expect(body()).not.toContain('Ép plastic 80 mic —');
        expect(body()).not.toContain('Sàn ép plastic');
        expect(quote.totalCustomerCost).toBe(base);
        expect(total()).toBe(fmtTotal(base));
    });

    it('125 mic CCCD × 500 → 1.000đ/tấm = +500.000đ, sàn 0 nên không có dòng sàn', () => {
        const base = baselineTotal();
        const { quote } = renderPanel({ plasticThickness: 'mic125', plasticSize: 'cccd' });
        expect(body()).toContain('Ép plastic 125 mic — CCCD (67 x 97 mm) (1.000đ/tấm)');
        expect(quote.totalCustomerCost).toBe(base + 500000);
        expect(total()).toBe(fmtTotal(base + 500000));
        expect(body()).not.toContain('Sàn ép plastic');
    });
});
