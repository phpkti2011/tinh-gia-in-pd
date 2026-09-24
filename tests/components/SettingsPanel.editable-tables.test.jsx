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
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';

const mockSaveConfig = vi.fn(() => true);

vi.mock('../../src/utils/configStorage', () => ({
    saveConfig: (...args) => mockSaveConfig(...args),
}));

vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({
    default: () => null,
}));

import SettingsPanel from '../../src/components/smallprint/SettingsPanel.jsx';
import {
    DEFAULT_CONFIG,
    validateSmallPrintConfig,
} from '../../src/modules/small-print/config/index.js';

// Lấy config đã lưu ở lần bấm "Lưu Cài Đặt" gần nhất.
function renderPanel() {
    const onSave = vi.fn();
    render(<SettingsPanel config={DEFAULT_CONFIG} onSave={onSave} onCancel={() => {}} />);
    // Lưu giờ là đường bất đồng bộ (chờ kết quả Supabase) và nút bị khoá trong
    // lúc lưu để tránh bấm 2 lần → 2 version. Phải đợi trạng thái lắng xuống
    // rồi mới bấm tiếp.
    const save = async () => {
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
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
    it('render đủ 7 khối mới', async () => {
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

        it('có cột riêng cho từng máy', async () => {
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

        it('đổi hệ số của C2060 KHÔNG động tới C6085', async () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            // Dòng đầu sau khi sort theo chiều cao = mốc 21.2
            const row = within(sec).getAllByRole('row')[1];
            const inputs = within(row).getAllByRole('spinbutton');
            // [0] = chiều cao, [1] = C2060, [2] = C6085
            fireEvent.change(inputs[1], { target: { value: '1.2' } });
            const cfg = await save();
            expect(ratesOf(cfg, 'C2060')['21.2']).toBe(1.2);
            expect(ratesOf(cfg, 'C6085')['21.2']).toBe(1);
        });

        it('đổi hệ số của C6085 KHÔNG động tới C2060', async () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            const row = within(sec).getAllByRole('row')[1];
            const inputs = within(row).getAllByRole('spinbutton');
            fireEvent.change(inputs[2], { target: { value: '0.9' } });
            const cfg = await save();
            expect(ratesOf(cfg, 'C6085')['21.2']).toBe(0.9);
            expect(ratesOf(cfg, 'C2060')['21.2']).toBe(1);
        });

        it('đổi chiều cao → đổi khoá cho CẢ HAI máy, đúng định dạng 1 chữ số thập phân', async () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            const row = within(sec).getAllByRole('row')[1];
            fireEvent.blur(within(row).getAllByRole('spinbutton')[0], { target: { value: '22' } });
            const cfg = await save();
            for (const p of ['C2060', 'C6085']) {
                expect(ratesOf(cfg, p)['22.0']).toBe(1);
                expect(ratesOf(cfg, p)['21.2']).toBeUndefined();
            }
        });

        it('đổi chiều cao trùng mốc đã có → bỏ qua, không ghi đè mất dòng kia', async () => {
            const { save } = renderPanel();
            const sec = section(A4_SECTION);
            const row = within(sec).getAllByRole('row')[1]; // 21.2
            fireEvent.blur(within(row).getAllByRole('spinbutton')[0], {
                target: { value: '28.3' },
            });
            const cfg = await save();
            expect(ratesOf(cfg, 'C2060')['21.2']).toBe(1);
            expect(ratesOf(cfg, 'C2060')['28.3']).toBe(1.35);
        });

        it('thêm mốc áp cho cả hai máy', async () => {
            const { save } = renderPanel();
            const before = Object.keys(
                DEFAULT_CONFIG.PRINTER_CONFIG.C2060.a4ConversionRates
            ).length;
            const sec = section(A4_SECTION);
            fireEvent.click(within(sec).getByText('+ Thêm mốc'));
            const cfg = await save();
            expect(Object.keys(ratesOf(cfg, 'C2060')).length).toBe(before + 1);
            expect(Object.keys(ratesOf(cfg, 'C6085')).length).toBe(before + 1);
        });

        it('xoá mốc áp cho cả hai máy', async () => {
            const { save } = renderPanel();
            const before = Object.keys(
                DEFAULT_CONFIG.PRINTER_CONFIG.C2060.a4ConversionRates
            ).length;
            const sec = section(A4_SECTION);
            fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            const cfg = await save();
            expect(Object.keys(ratesOf(cfg, 'C2060')).length).toBe(before - 1);
            expect(Object.keys(ratesOf(cfg, 'C6085')).length).toBe(before - 1);
        });

        it('mốc cao hơn khổ máy hiện "vượt khổ máy" thay vì ô nhập', async () => {
            renderPanel();
            const sec = section(A4_SECTION);
            // 109cm > maxH C6085 (76) nhưng ≤ maxH C2060 (120)
            expect(within(sec).getAllByText('vượt khổ máy')).toHaveLength(1);
        });
    });

    describe('Khổ tối đa & điểm VK theo máy', () => {
        it('đổi khổ ngang tối đa của C2060', async () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Tối Đa & Điểm VK/i);
            const inputs = within(sec).getAllByRole('spinbutton');
            fireEvent.change(inputs[0], { target: { value: '34.5' } });
            expect((await save()).PRINTER_CONFIG.C2060.maxW).toBe(34.5);
        });

        it('nhập điểm VK dạng danh sách cách nhau dấu phẩy', async () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Tối Đa & Điểm VK/i);
            const textInputs = within(sec).getAllByRole('textbox');
            fireEvent.blur(textInputs[0], { target: { value: '33, 40, 48' } });
            expect((await save()).PRINTER_CONFIG.C2060.vkPoints).toEqual([33, 40, 48]);
        });

        it('bỏ qua phần tử không phải số khi nhập điểm VK', async () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Tối Đa & Điểm VK/i);
            const textInputs = within(sec).getAllByRole('textbox');
            fireEvent.blur(textInputs[0], { target: { value: '33, abc, 48, ' } });
            expect((await save()).PRINTER_CONFIG.C2060.vkPoints).toEqual([33, 48]);
        });
    });

    describe('Khổ tờ in thông dụng', () => {
        it('thêm và xoá khổ', async () => {
            const { save } = renderPanel();
            const before = DEFAULT_CONFIG.COMMON_SHEET_SIZES.length;
            const sec = section(/Khổ Tờ In Thông Dụng/i);
            fireEvent.click(within(sec).getByText('+ Thêm khổ'));
            expect((await save()).COMMON_SHEET_SIZES.length).toBe(before + 1);
            fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            expect((await save()).COMMON_SHEET_SIZES.length).toBe(before);
        });
    });

    describe('Giấy chuẩn & điều chỉnh giá', () => {
        it('đổi giấy chuẩn qua dropdown', async () => {
            const { save } = renderPanel();
            const sec = section(/Giấy Chuẩn & Điều Chỉnh Giá/i);
            fireEvent.change(within(sec).getByRole('combobox'), { target: { value: 'C250' } });
            expect((await save()).PAPER_REFERENCE_CONFIG.referencePaperName).toBe('C250');
        });

        it('dropdown chỉ liệt kê giấy tính theo ram', async () => {
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

        // BÁM NHÃN, không bám thứ tự: mục này còn được thêm ô (v1.8.0 thêm mức giá sàn
        // thứ hai), bám inputs[i] là mỗi lần thêm ô lại gãy test không liên quan.
        const fieldByLabel = (re) => {
            const sec = section(/Giấy Chuẩn & Điều Chỉnh Giá/i);
            const label = within(sec).getByText(re);
            return within(label.closest('div')).getByRole('spinbutton');
        };

        it('đổi tỉ lệ chia sẻ — nhập 70 lưu thành 0.7', async () => {
            const { save } = renderPanel();
            fireEvent.change(fieldByLabel(/Tỉ lệ chia sẻ chênh lệch/i), {
                target: { value: '70' },
            });
            expect((await save()).PAPER_REFERENCE_CONFIG.adjustmentRatio).toBeCloseTo(0.7, 10);
        });

        it('đổi phụ thu giấy mỹ thuật', async () => {
            const { save } = renderPanel();
            fireEvent.change(fieldByLabel(/Phụ thu giấy mỹ thuật/i), {
                target: { value: '95000' },
            });
            expect((await save()).ART_PAPER_SURCHARGE).toBe(95000);
        });

        it('đổi hai mức giá sàn — ram và chỉ in, độc lập nhau', async () => {
            const { save } = renderPanel();
            fireEvent.change(fieldByLabel(/Giá sàn — giấy theo ram/i), {
                target: { value: '1700' },
            });
            fireEvent.change(fieldByLabel(/Giá sàn — giấy m²/i), {
                target: { value: '1250' },
            });

            const saved = await save();
            expect(saved.PAPER_REFERENCE_CONFIG.minPrintPricePerPage).toBe(1700);
            expect(saved.PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage).toBe(1250);
        });

        it('đặt sàn về 0 để TẮT — phải lưu được, không bị schema chặn', async () => {
            const { save } = renderPanel();
            fireEvent.change(fieldByLabel(/Giá sàn — giấy m²/i), { target: { value: '0' } });
            expect((await save()).PAPER_REFERENCE_CONFIG.minPrintOnlyPricePerPage).toBe(0);
        });
    });

    describe('Phụ thu nhiều nội dung', () => {
        it('đổi mức phụ thu của một bậc — nhập 15 lưu thành 0.15', async () => {
            const { save } = renderPanel();
            const sec = section(/Phụ Thu Nhiều Nội Dung/i);
            const row = within(sec).getAllByRole('row')[1];
            const inputs = within(row).getAllByRole('spinbutton');
            fireEvent.change(inputs[inputs.length - 1], { target: { value: '15' } });
            expect((await save()).PRINT_CONTENT_CONFIG.tiers[0].surcharge).toBeCloseTo(0.15, 10);
        });

        it('bậc cuối có max vô hạn hiển thị "trở lên", không phải ô nhập', async () => {
            renderPanel();
            const sec = section(/Phụ Thu Nhiều Nội Dung/i);
            expect(within(sec).getByText('trở lên')).toBeTruthy();
        });
    });

    describe('Chốt chặn schema — không xoá được dòng cuối', () => {
        it('bảng quy đổi A4 còn 1 mốc thì nút Xóa biến mất', async () => {
            renderPanel();
            const sec = section(/Bảng Quy Đổi A4 \(giấy thường/i);
            const total = Object.keys(DEFAULT_CONFIG.PRINTER_CONFIG.C2060.a4ConversionRates).length;
            for (let i = 0; i < total - 1; i++) {
                fireEvent.click(within(sec).getAllByText('Xóa')[0]);
            }
            expect(within(sec).queryByText('Xóa')).toBeNull();
        });

        it('khổ tờ in còn 1 dòng thì nút Xóa biến mất', async () => {
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
        it('sửa được tên giấy từ Cài Đặt', async () => {
            const { save } = renderPanel();
            const sec = section(/Giá Giấy \/ Decal/i);
            const nameInput = within(sec).getAllByRole('textbox')[0];
            fireEvent.blur(nameInput, { target: { value: 'C150 loại mới' } });
            expect((await save()).PAPER_STOCK_DATA[0].name).toBe('C150 loại mới');
        });

        it('để trống thì giữ nguyên tên cũ', async () => {
            const { save } = renderPanel();
            const sec = section(/Giá Giấy \/ Decal/i);
            const nameInput = within(sec).getAllByRole('textbox')[0];
            const before = DEFAULT_CONFIG.PAPER_STOCK_DATA[0].name;
            fireEvent.blur(nameInput, { target: { value: '   ' } });
            expect((await save()).PAPER_STOCK_DATA[0].name).toBe(before);
        });
    });

    describe('Khổ giấy mỹ thuật', () => {
        it('dòng "Tùy chọn" không cho sửa số, hiện ghi chú thay thế', async () => {
            renderPanel();
            const sec = section(/Khổ Giấy Mỹ Thuật/i);
            expect(within(sec).getByText(/Admin nhập tay ở màn tính giá/i)).toBeTruthy();
        });

        it('đổi tên một khổ', async () => {
            const { save } = renderPanel();
            const sec = section(/Khổ Giấy Mỹ Thuật/i);
            const nameInput = within(sec).getAllByRole('textbox')[0];
            fireEvent.blur(nameInput, { target: { value: 'Khổ 80 x 110 cm' } });
            expect((await save()).ART_PAPER_LARGE_SHEET_SIZES[0].name).toBe('Khổ 80 x 110 cm');
        });
    });

    // Ép plastic (1.4.0). Bảng: hàng [0] header, [1..9] 9 bậc, [10] dòng sàn.
    // Ô số mỗi hàng bậc: [max_qty, a6, a5, a4, a3, cccd] (dòng ∞ không có ô max_qty).
    // Dưới bảng: mỗi độ dày 1 ô % + 5 checkbox khổ.
    describe('Ép plastic — bảng giá khổ × bậc SL, sàn admin, độ dày tick khổ', () => {
        const sec = () => section(/^Ép Plastic/);

        it('render 5 cột khổ, 9 bậc + dòng sàn, dòng ∞ hiện "trở lên"', async () => {
            renderPanel();
            const s = sec();
            expect(within(s).getByDisplayValue('CCCD (67 x 97 mm)')).toBeTruthy();
            expect(within(s).getByText('trở lên')).toBeTruthy();
            expect(within(s).getByText(/Giá tối thiểu \/ tấm/)).toBeTruthy();
            expect(within(s).getAllByRole('row')).toHaveLength(11);
            expect(within(s).getByDisplayValue('80 mic')).toBeTruthy();
            expect(within(s).getByDisplayValue('125 mic')).toBeTruthy();
        });

        it('sửa ô A4 bậc 1 → tiers[0].price.a4 = 16000, ô khác giữ nguyên', async () => {
            const { save } = renderPanel();
            const row1 = within(sec()).getAllByRole('row')[1];
            const cells = within(row1).getAllByRole('spinbutton');
            expect(cells).toHaveLength(6);
            fireEvent.change(cells[3], { target: { value: '16000' } });
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.tiers[0].price.a4).toBe(16000);
            expect(pl.tiers[0].price.a5).toBe(10000);
            expect(pl.tiers[1].price.a4).toBe(12000);
        });

        it('sửa dòng sàn A3 → minPrice.a3 = 3000', async () => {
            const { save } = renderPanel();
            const rows = within(sec()).getAllByRole('row');
            const cells = within(rows[rows.length - 1]).getAllByRole('spinbutton');
            expect(cells).toHaveLength(5);
            fireEvent.change(cells[3], { target: { value: '3000' } });
            expect((await save()).PLASTIC_LAMINATION_CONFIG.minPrice.a3).toBe(3000);
        });

        it('+ Thêm khổ → có mặt ở sizes, minPrice và mọi tiers[].price, id tiền tố sz_', async () => {
            const { save } = renderPanel();
            fireEvent.click(within(sec()).getByText('+ Thêm khổ'));
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.sizes).toHaveLength(6);
            const id = pl.sizes[5].id;
            expect(id.startsWith('sz_')).toBe(true);
            expect(pl.minPrice[id]).toBe(0);
            pl.tiers.forEach((t) => expect(t.price[id]).toBe(0));
        });

        it('xoá khổ A6 → mất ở sizes, minPrice, tiers[].price và thicknesses[].sizeIds', async () => {
            const { save } = renderPanel();
            fireEvent.click(within(sec()).getAllByTitle('Xóa khổ')[0]);
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.sizes.map((s) => s.id)).toEqual(['a5', 'a4', 'a3', 'cccd']);
            expect(pl.minPrice.a6).toBeUndefined();
            pl.tiers.forEach((t) => expect(t.price.a6).toBeUndefined());
            expect(pl.thicknesses[0].sizeIds).toEqual(['a5', 'a4', 'a3']);
            expect(validateSmallPrintConfig(await save()).isValid).toBe(true);
        });

        it('+ Thêm mức SL → chèn trước dòng ∞, ngưỡng 2001, giá copy dòng trên', async () => {
            const { save } = renderPanel();
            fireEvent.click(within(sec()).getByText('+ Thêm mức SL'));
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.tiers).toHaveLength(10);
            expect(pl.tiers[8].max_qty).toBe(2001);
            expect(pl.tiers[8].price.a4).toBe(2000);
            expect(pl.tiers[9].max_qty).toBe(Infinity);
        });

        it('xoá bậc tới khi còn 1 → nút Xóa biến mất, dòng còn lại là ∞', async () => {
            const { save } = renderPanel();
            for (let i = 0; i < 8; i++) {
                fireEvent.click(within(sec()).getAllByText('Xóa')[0]);
            }
            expect(within(sec()).queryByText('Xóa')).toBeNull();
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.tiers).toHaveLength(1);
            expect(pl.tiers[0].max_qty).toBe(Infinity);
        });

        it('xoá đúng dòng ∞ → dòng cuối còn lại tự thành ∞', async () => {
            const { save } = renderPanel();
            fireEvent.click(within(sec()).getAllByText('Xóa')[8]);
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.tiers).toHaveLength(8);
            expect(pl.tiers[7].max_qty).toBe(Infinity);
            expect(pl.tiers[7].price.a4).toBe(2000);
        });

        it('+ Thêm độ dày, tick CCCD, nhập 20% → thicknesses[2] đúng, % lưu số thô', async () => {
            const { save } = renderPanel();
            fireEvent.click(within(sec()).getByText('+ Thêm độ dày'));
            const s = sec();
            const boxes = within(s).getAllByRole('checkbox');
            expect(boxes).toHaveLength(15);
            fireEvent.click(boxes[14]);
            const pct = within(s).getAllByRole('spinbutton').at(-1);
            fireEvent.change(pct, { target: { value: '20' } });
            const saved = await save();
            const pl = saved.PLASTIC_LAMINATION_CONFIG;
            expect(pl.thicknesses).toHaveLength(3);
            expect(pl.thicknesses[2].id.startsWith('mic_')).toBe(true);
            expect(pl.thicknesses[2].sizeIds).toEqual(['cccd']);
            expect(pl.thicknesses[2].percent).toBe(20);
            expect(validateSmallPrintConfig(saved).isValid).toBe(true);
        });

        it('bỏ tick A4 ở 80 mic → sizeIds còn a6/a5/a3; tick lại → về đúng thứ tự cột', async () => {
            const { save } = renderPanel();
            const boxes = within(sec()).getAllByRole('checkbox');
            expect(boxes[2].checked).toBe(true);
            fireEvent.click(boxes[2]);
            expect((await save()).PLASTIC_LAMINATION_CONFIG.thicknesses[0].sizeIds).toEqual([
                'a6',
                'a5',
                'a3',
            ]);
            fireEvent.click(within(sec()).getAllByRole('checkbox')[2]);
            expect((await save()).PLASTIC_LAMINATION_CONFIG.thicknesses[0].sizeIds).toEqual([
                'a6',
                'a5',
                'a4',
                'a3',
            ]);
        });

        it('xoá độ dày 125 mic', async () => {
            const { save } = renderPanel();
            fireEvent.click(within(sec()).getAllByText('Xóa độ dày')[1]);
            const pl = (await save()).PLASTIC_LAMINATION_CONFIG;
            expect(pl.thicknesses.map((t) => t.id)).toEqual(['mic80']);
        });
    });
});
