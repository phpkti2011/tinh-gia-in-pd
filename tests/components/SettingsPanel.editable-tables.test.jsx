// @vitest-environment jsdom
//
// Test cho các bảng vừa mở cho admin sửa trong tab Cài Đặt (In KTS khổ nhỏ).
// Mục tiêu: chứng minh admin đổi được số mà KHÔNG phải sửa code, và các chốt
// chặn hoạt động (không xoá được dòng cuối của bảng schema bắt buộc non-empty).
//
// Mock configStorage.saveConfig để không đụng localStorage/Supabase thật.
// Mock PriceConfigHistoryPanel để không kéo theo Supabase client (Node 20 thiếu
// WebSocket → import supabase-js sẽ throw).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';

const mockSaveConfig = vi.fn(() => true);

vi.mock('../../src/utils/configStorage', () => ({
    saveConfig: (...args) => mockSaveConfig(...args),
}));

vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({
    default: () => null,
}));

import SettingsPanel from '../../src/components/smallprint/SettingsPanel.jsx';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

// Lấy config đã lưu ở lần bấm "Lưu Cài Đặt" gần nhất.
function renderPanel() {
    const onSave = vi.fn();
    render(<SettingsPanel config={DEFAULT_CONFIG} onSave={onSave} onCancel={() => {}} />);
    const save = () => {
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        return mockSaveConfig.mock.calls.at(-1)[0];
    };
    return { onSave, save };
}

// Tìm <section> theo tiêu đề để giới hạn phạm vi query.
function section(titleRegex) {
    const heading = screen.getByText(titleRegex);
    return heading.closest('section');
}

beforeEach(() => {
    mockSaveConfig.mockClear();
    mockSaveConfig.mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Cài Đặt — các bảng mới mở cho admin', () => {
    it('render đủ 7 khối mới', () => {
        renderPanel();
        expect(screen.getByText(/Khổ Tối Đa & Điểm VK/i)).toBeTruthy();
        expect(screen.getByText(/Bảng Quy Đổi A4 \(giấy thường/i)).toBeTruthy();
        expect(screen.getByText(/Khổ Tờ In Thông Dụng/i)).toBeTruthy();
        expect(screen.getByText(/Khổ Tờ Lớn Chuẩn/i)).toBeTruthy();
        expect(screen.getByText(/Khổ Giấy Mỹ Thuật/i)).toBeTruthy();
        expect(screen.getByText(/Giấy Chuẩn & Điều Chỉnh Giá/i)).toBeTruthy();
        expect(screen.getByText(/Phụ Thu Nhiều Nội Dung/i)).toBeTruthy();
    });

    describe('Bảng quy đổi A4 — mỗi máy một cột', () => {
        const A4_SECTION = /Bảng Quy Đổi A4 \(giấy thường/i;
        const ratesOf = (cfg, printerKey) => cfg.PRINTER_CONFIG[printerKey].a4ConversionRates;

        it('có cột riêng cho từng máy', () => {
            renderPanel();
            const sec = section(A4_SECTION);
            const headers = within(sec).getAllByRole('columnheader');
            expect(headers.map((h) => h.textContent)).toEqual([
                'Chiều cao tờ',
                'C2060',
                'C6085',
                '',
            ]);
        });

        it('đổi hệ số của C2060 KHÔNG động tới C6085', () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            // Dòng đầu sau khi sort theo chiều cao = mốc 21.2
            const row = within(sec).getAllByRole('row')[1];
            const inputs = within(row).getAllByRole('spinbutton');
            // [0] = chiều cao, [1] = C2060, [2] = C6085
            fireEvent.change(inputs[1], { target: { value: '1.2' } });
            const cfg = save();
            expect(ratesOf(cfg, 'C2060')['21.2']).toBe(1.2);
            expect(ratesOf(cfg, 'C6085')['21.2']).toBe(1);
        });

        it('đổi hệ số của C6085 KHÔNG động tới C2060', () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            const row = within(sec).getAllByRole('row')[1];
            const inputs = within(row).getAllByRole('spinbutton');
            fireEvent.change(inputs[2], { target: { value: '0.9' } });
            const cfg = save();
            expect(ratesOf(cfg, 'C6085')['21.2']).toBe(0.9);
            expect(ratesOf(cfg, 'C2060')['21.2']).toBe(1);
        });

        it('đổi chiều cao → đổi khoá cho CẢ HAI máy, đúng định dạng 1 chữ số thập phân', () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            const row = within(sec).getAllByRole('row')[1];
            fireEvent.blur(within(row).getAllByRole('spinbutton')[0], { target: { value: '22' } });
            const cfg = save();
            for (const p of ['C2060', 'C6085']) {
                expect(ratesOf(cfg, p)['22.0']).toBe(1);
                expect(ratesOf(cfg, p)['21.2']).toBeUndefined();
            }
        });

        it('đổi chiều cao trùng mốc đã có → bỏ qua, không ghi đè mất dòng kia', () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            const row = within(sec).getAllByRole('row')[1]; // 21.2
            fireEvent.blur(within(row).getAllByRole('spinbutton')[0], {
                target: { value: '28.3' },
            });
            const cfg = save();
            expect(ratesOf(cfg, 'C2060')['21.2']).toBe(1);
            expect(ratesOf(cfg, 'C2060')['28.3']).toBe(1.35);
        });

        it('thêm mốc áp cho cả hai máy', () => {
            const { save } = renderPanel();
            const before = Object.keys(
                DEFAULT_CONFIG.PRINTER_CONFIG.C2060.a4ConversionRates
            ).length;
            const sec = section(A4_SECTION);
            fireEvent.click(within(sec).getByText('+ Thêm mốc'));
            const cfg = save();
            expect(Object.keys(ratesOf(cfg, 'C2060')).length).toBe(before + 1);
            expect(Object.keys(ratesOf(cfg, 'C6085')).length).toBe(before + 1);
        });

        it('xoá mốc áp cho cả hai máy', () => {
            const { save } = renderPanel();
            const before = Object.keys(
                DEFAULT_CONFIG.PRINTER_CONFIG.C2060.a4ConversionRates
            ).length;
            const sec = section(A4_SECTION);
            fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            const cfg = save();
            expect(Object.keys(ratesOf(cfg, 'C2060')).length).toBe(before - 1);
            expect(Object.keys(ratesOf(cfg, 'C6085')).length).toBe(before - 1);
        });

        it('mốc cao hơn khổ máy hiện "vượt khổ máy" thay vì ô nhập', () => {
            renderPanel();
            const sec = section(A4_SECTION);
            // 109cm > maxH C6085 (76) nhưng ≤ maxH C2060 (120)
            expect(within(sec).getAllByText('vượt khổ máy')).toHaveLength(1);
        });
    });

    describe('Khổ tối đa & điểm VK theo máy', () => {
        it('đổi khổ ngang tối đa của C2060', () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Tối Đa & Điểm VK/i);
            const inputs = within(sec).getAllByRole('spinbutton');
            fireEvent.change(inputs[0], { target: { value: '34.5' } });
            expect(save().PRINTER_CONFIG.C2060.maxW).toBe(34.5);
        });

        it('nhập điểm VK dạng danh sách cách nhau dấu phẩy', () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Tối Đa & Điểm VK/i);
            const textInputs = within(sec).getAllByRole('textbox');
            fireEvent.blur(textInputs[0], { target: { value: '33, 40, 48' } });
            expect(save().PRINTER_CONFIG.C2060.vkPoints).toEqual([33, 40, 48]);
        });

        it('bỏ qua phần tử không phải số khi nhập điểm VK', () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Tối Đa & Điểm VK/i);
            const textInputs = within(sec).getAllByRole('textbox');
            fireEvent.blur(textInputs[0], { target: { value: '33, abc, 48, ' } });
            expect(save().PRINTER_CONFIG.C2060.vkPoints).toEqual([33, 48]);
        });
    });

    describe('Khổ tờ in thông dụng', () => {
        it('thêm và xoá khổ', () => {
            const { save } = renderPanel();
            const before = DEFAULT_CONFIG.COMMON_SHEET_SIZES.length;
            const sec = section(/Khổ Tờ In Thông Dụng/i);
            fireEvent.click(within(sec).getByText('+ Thêm khổ'));
            expect(save().COMMON_SHEET_SIZES.length).toBe(before + 1);
            fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            expect(save().COMMON_SHEET_SIZES.length).toBe(before);
        });
    });

    describe('Giấy chuẩn & điều chỉnh giá', () => {
        it('đổi giấy chuẩn qua dropdown', () => {
            const { save } = renderPanel();
            const sec = section(/Giấy Chuẩn & Điều Chỉnh Giá/i);
            fireEvent.change(within(sec).getByRole('combobox'), { target: { value: 'C250' } });
            expect(save().PAPER_REFERENCE_CONFIG.referencePaperName).toBe('C250');
        });

        it('dropdown chỉ liệt kê giấy tính theo ram', () => {
            renderPanel();
            const sec = section(/Giấy Chuẩn & Điều Chỉnh Giá/i);
            const opts = within(sec)
                .getAllByRole('option')
                .map((o) => o.getAttribute('value'));
            const reamNames = DEFAULT_CONFIG.PAPER_STOCK_DATA.filter(
                (p) => p.pricingModel === 'ream'
            ).map((p) => p.name);
            expect(opts).toEqual(reamNames);
            expect(opts).not.toContain('Giấy mỹ thuật');
        });

        it('đổi tỉ lệ chia sẻ — nhập 70 lưu thành 0.7', () => {
            const { save } = renderPanel();
            const sec = section(/Giấy Chuẩn & Điều Chỉnh Giá/i);
            const inputs = within(sec).getAllByRole('spinbutton');
            fireEvent.change(inputs[0], { target: { value: '70' } });
            expect(save().PAPER_REFERENCE_CONFIG.adjustmentRatio).toBeCloseTo(0.7, 10);
        });

        it('đổi phụ thu giấy mỹ thuật', () => {
            const { save } = renderPanel();
            const sec = section(/Giấy Chuẩn & Điều Chỉnh Giá/i);
            const inputs = within(sec).getAllByRole('spinbutton');
            fireEvent.change(inputs[2], { target: { value: '95000' } });
            expect(save().ART_PAPER_SURCHARGE).toBe(95000);
        });
    });

    describe('Phụ thu nhiều nội dung', () => {
        it('đổi mức phụ thu của một bậc — nhập 15 lưu thành 0.15', () => {
            const { save } = renderPanel();
            const sec = section(/Phụ Thu Nhiều Nội Dung/i);
            const row = within(sec).getAllByRole('row')[1];
            const inputs = within(row).getAllByRole('spinbutton');
            fireEvent.change(inputs[inputs.length - 1], { target: { value: '15' } });
            expect(save().PRINT_CONTENT_CONFIG.tiers[0].surcharge).toBeCloseTo(0.15, 10);
        });

        it('bậc cuối có max vô hạn hiển thị "trở lên", không phải ô nhập', () => {
            renderPanel();
            const sec = section(/Phụ Thu Nhiều Nội Dung/i);
            expect(within(sec).getByText('trở lên')).toBeTruthy();
        });
    });

    describe('Chốt chặn schema — không xoá được dòng cuối', () => {
        it('bảng quy đổi A4 còn 1 mốc thì nút Xóa biến mất', () => {
            renderPanel();
            const sec = section(/Bảng Quy Đổi A4 \(giấy thường/i);
            const total = Object.keys(DEFAULT_CONFIG.PRINTER_CONFIG.C2060.a4ConversionRates).length;
            for (let i = 0; i < total - 1; i++) {
                fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            }
            expect(within(sec).queryByText('Xóa')).toBeNull();
        });

        it('khổ tờ in còn 1 dòng thì nút Xóa biến mất', () => {
            renderPanel();
            const sec = section(/Khổ Tờ In Thông Dụng/i);
            const total = DEFAULT_CONFIG.COMMON_SHEET_SIZES.length;
            for (let i = 0; i < total - 1; i++) {
                fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            }
            expect(within(sec).queryByText('Xóa')).toBeNull();
        });
    });

    describe('Tên loại giấy', () => {
        it('sửa được tên giấy từ Cài Đặt', () => {
            const { save } = renderPanel();
            const sec = section(/Giá Giấy \/ Decal/i);
            const nameInput = within(sec).getAllByRole('textbox')[0];
            fireEvent.blur(nameInput, { target: { value: 'C150 loại mới' } });
            expect(save().PAPER_STOCK_DATA[0].name).toBe('C150 loại mới');
        });

        it('để trống thì giữ nguyên tên cũ', () => {
            const { save } = renderPanel();
            const sec = section(/Giá Giấy \/ Decal/i);
            const nameInput = within(sec).getAllByRole('textbox')[0];
            const before = DEFAULT_CONFIG.PAPER_STOCK_DATA[0].name;
            fireEvent.blur(nameInput, { target: { value: '   ' } });
            expect(save().PAPER_STOCK_DATA[0].name).toBe(before);
        });
    });

    describe('Khổ giấy mỹ thuật', () => {
        it('dòng "Tùy chọn" không cho sửa số, hiện ghi chú thay thế', () => {
            renderPanel();
            const sec = section(/Khổ Giấy Mỹ Thuật/i);
            expect(within(sec).getByText(/Admin nhập tay ở màn tính giá/i)).toBeTruthy();
        });

        it('đổi tên một khổ', () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Giấy Mỹ Thuật/i);
            const nameInput = within(sec).getAllByRole('textbox')[0];
            fireEvent.blur(nameInput, { target: { value: 'Khổ 80 x 110 cm' } });
            expect(save().ART_PAPER_LARGE_SHEET_SIZES[0].name).toBe('Khổ 80 x 110 cm');
        });
    });
});
