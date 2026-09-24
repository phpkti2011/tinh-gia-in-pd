// @vitest-environment jsdom
//
// Cảnh báo "nghịch bậc" trong mục Bảng Giá Khách Hàng (tab Cài Đặt, In KTS khổ nhỏ).
//
// Bảng giá của tiệm có chỗ đơn giá tụt xuống bậc sau nhanh hơn số trang tăng lên, nên
// khách đặt THÊM một trang lại TRẢ ÍT HƠN — nặng nhất là vách 1.000 → 1.001 trang, hụt
// 398.200đ. Trước đây không có gì trên màn hình chỉ ra điều đó.
//
// Ba ràng buộc chốt ở đây:
//   - Cảnh báo chạy theo TỪNG PHÍM gõ: sửa đơn giá là thấy dòng đỏ mất ngay tại chỗ.
//   - Bậc đang gõ dở (đơn giá 0) KHÔNG được nháy đỏ.
//   - THUẦN CẢNH BÁO: vẫn lưu được, và không sửa một đồng giá nào.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';

const mockSaveConfig = vi.fn(() => true);

vi.mock('../../src/utils/configStorage', () => ({
    saveConfig: (...args) => mockSaveConfig(...args),
}));

vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({
    default: () => null,
}));

import SettingsPanel from '../../src/components/smallprint/SettingsPanel.jsx';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

function renderPanel(config = DEFAULT_CONFIG) {
    render(<SettingsPanel config={config} onSave={vi.fn()} onCancel={() => {}} />);
    const save = async () => {
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        return mockSaveConfig.mock.calls.at(-1)[0];
    };
    const warnings = () => screen.queryAllByTestId('tier-warning');
    // Ô "Số trang A4" là text node trực tiếp nên khớp được bằng regex, kể cả khi có ⚠.
    const rowFor = (re) => screen.getByText(re).closest('tr');
    const printInput = (re) => within(rowFor(re)).getAllByRole('spinbutton')[0];
    return { save, warnings, rowFor, printInput };
}

beforeEach(() => {
    mockSaveConfig.mockClear();
    mockSaveConfig.mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Bảng giá mặc định — chỉ đúng chỗ đang nghịch', () => {
    it('tiêu đề mục đếm đủ 7 chỗ', () => {
        renderPanel();
        expect(screen.getByText(/7 chỗ nghịch bậc/)).toBeTruthy();
    });

    it('hiện 7 dòng cảnh báo', () => {
        const { warnings } = renderPanel();
        expect(warnings()).toHaveLength(7);
    });

    it('dòng nặng nhất nêu đủ cả hai số tiền và mức hụt', () => {
        const { warnings } = renderPanel();
        const txt = warnings()
            .map((el) => el.textContent)
            .find((t) => t.includes('1.000 trang'));

        expect(txt).toContain('2.200.000');
        expect(txt).toContain('1.001 trang');
        expect(txt).toContain('1.801.800');
        expect(txt).toContain('398.200');
    });

    it('bậc bị nghịch được đánh dấu ⚠ ngay ở ô số trang', () => {
        const { rowFor } = renderPanel();
        expect(rowFor(/560 – 1000/).textContent).toContain('⚠');
        // Bậc lành lặn thì không.
        expect(rowFor(/16 – 50/).textContent).not.toContain('⚠');
    });

    it('nói rõ chỉ soát cột Giá in — hết cảnh báo KHÔNG có nghĩa bảng giá đúng', () => {
        renderPanel();
        expect(screen.getByText(/Cột cán màng không soát được/)).toBeTruthy();
    });
});

describe('Sửa giá là cảnh báo cập nhật ngay', () => {
    it('nâng đơn giá bậc 1001–2000 → dòng cảnh báo vách 1.000 biến mất', () => {
        const { warnings, printInput } = renderPanel();
        // 1.001 × 2.300 = 2.302.300 > 1.000 × 2.200 = 2.200.000.
        fireEvent.change(printInput(/1001 – 2000/), { target: { value: '2300' } });

        expect(warnings()).toHaveLength(6);
        expect(warnings().some((el) => el.textContent.includes('1.000 trang'))).toBe(false);
        expect(screen.getByText(/6 chỗ nghịch bậc/)).toBeTruthy();
    });

    it('bảng giá tăng đều → không còn chữ nghịch bậc nào', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.CUSTOMER_PRICE_TIERS = [
            { min: 1, max: 100, print: 3000, laminate: 1000, type: 'per_page' },
            { min: 101, max: 500, print: 3000, laminate: 800, type: 'per_page' },
            { min: 501, max: Infinity, print: 2999, laminate: 600, type: 'per_page' },
        ];
        const { warnings } = renderPanel(cfg);

        expect(warnings()).toHaveLength(0);
        expect(screen.queryByText(/nghịch bậc/)).toBeNull();
    });
});

describe('Đang gõ dở không nháy đỏ', () => {
    it('xoá trắng ô Giá in → số cảnh báo KHÔNG đổi (không commit giá rỗng)', () => {
        const { warnings, printInput } = renderPanel();
        fireEvent.change(printInput(/1001 – 2000/), { target: { value: '' } });
        expect(warnings()).toHaveLength(7);
    });

    it('đơn giá về 0 → hai vách kề bậc đó im lặng, không đẻ cảnh báo mới', () => {
        const { warnings, printInput } = renderPanel();
        fireEvent.change(printInput(/1001 – 2000/), { target: { value: '0' } });
        // Bỏ qua cả vách 1.000 → 1.001 lẫn vách 2.000 → 2.001.
        expect(warnings()).toHaveLength(5);
    });
});

describe('Thuần cảnh báo — không đụng tới giá', () => {
    it('đang có cảnh báo vẫn lưu được, bảng giá ra y nguyên', async () => {
        const { save, warnings } = renderPanel();
        expect(warnings()).toHaveLength(7);

        const saved = await save();
        expect(saved.CUSTOMER_PRICE_TIERS).toEqual(DEFAULT_CONFIG.CUSTOMER_PRICE_TIERS);
    });
});
