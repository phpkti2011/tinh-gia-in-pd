// @vitest-environment jsdom
//
// Cài Đặt In KTS — mục "Dán Thành Phẩm" (GLUING_TYPES, config 1.9.0).
//
// Admin thêm / đổi tên / xoá kiểu dán; mỗi kiểu có bảng bậc số lượng, mỗi bậc chọn trọn gói
// hoặc theo sản phẩm. Lưu qua panel rồi đưa thẳng config đã lưu vào engine để chắc bảng
// vừa sửa tính ra đúng tiền.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import SettingsPanel from '../../src/components/smallprint/SettingsPanel';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
import { validateSmallPrintConfig } from '../../src/modules/small-print/config/schema';
import { calculateGluingCost } from '../../src/modules/small-print/engine/pricing';

const save = vi.hoisted(() => vi.fn(() => true));
vi.mock('../../src/utils/configStorage', () => ({ saveConfig: (...args) => save(...args) }));
vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({ default: () => null }));

afterEach(() => {
    cleanup();
    save.mockClear();
});

const PEEL = 'glue-peel-seal';
const DOUBLE = 'glue-double-sided-yellow';
const DEFAULT_TYPES = DEFAULT_CONFIG.GLUING_TYPES;

const renderPanel = (config = DEFAULT_CONFIG) =>
    render(<SettingsPanel config={config} onSave={vi.fn()} onCancel={() => {}} />);
const region = () => within(screen.getByRole('region', { name: 'Dán Thành Phẩm' }));
const group = (n) => within(region().getByRole('group', { name: `Kiểu dán ${n}` }));
const edit = (n, label, value) =>
    fireEvent.change(group(n).getByLabelText(label), { target: { value } });
const clickSave = async () => {
    fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
    await act(async () => {});
};
const saved = () => save.mock.calls.at(-1)[0];

describe('Cài Đặt — Dán Thành Phẩm', () => {
    it('hiện hai kiểu dán mặc định với bảng bậc; lưu không sửa gì giữ nguyên bảng giá', async () => {
        renderPanel();
        expect(group(1).getByLabelText('Tên kiểu dán').value).toBe('Dán keo phá màng');
        expect(group(2).getByLabelText('Tên kiểu dán').value).toBe('Dán keo 2 mặt vàng');
        expect(group(1).getByLabelText('Ngưỡng SL — bậc 1').value).toBe('100');
        expect(group(1).getByLabelText('Cách tính — bậc 1').value).toBe('package');
        expect(group(1).getByLabelText('Giá vốn (đ) — bậc 1').value).toBe('30000');
        expect(group(1).getByLabelText('Giá khách (đ) — bậc 1').value).toBe('60000');
        expect(group(1).getByLabelText('Không giới hạn — bậc 2').checked).toBe(true);
        expect(group(1).getByLabelText('Ngưỡng SL — bậc 2').disabled).toBe(true);
        await clickSave();
        expect(saved().GLUING_TYPES).toEqual(DEFAULT_TYPES);
    });

    it('thêm kiểu dán: chưa nhập giá thì chặn lưu; nhập đủ → lưu, engine tính được kiểu mới', async () => {
        renderPanel();
        fireEvent.click(region().getByText('+ Thêm kiểu dán'));
        expect(group(3).getByLabelText('Tên kiểu dán').value).toBe('Kiểu dán mới');
        await clickSave();
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toContain('Nhập giá');

        fireEvent.change(group(3).getByLabelText('Tên kiểu dán'), {
            target: { value: 'Dán keo sữa' },
        });
        edit(3, 'Giá vốn (đ) — bậc 1', '150');
        edit(3, 'Giá khách (đ) — bậc 1', '300');
        expect(screen.queryByRole('alert')).toBeNull();
        await clickSave();

        const cfg = saved();
        expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        expect(cfg.GLUING_TYPES).toHaveLength(3);
        expect(cfg.GLUING_TYPES.slice(0, 2)).toEqual(DEFAULT_TYPES);
        const added = cfg.GLUING_TYPES[2];
        expect(added.name).toBe('Dán keo sữa');
        expect(added.id.startsWith('glue-')).toBe(true);
        expect(calculateGluingCost(200, [{ typeId: added.id }], cfg.GLUING_TYPES)).toMatchObject({
            cost: 30000,
            customerPrice: 60000,
            missingCount: 0,
        });
    });

    it('thêm hai kiểu liên tiếp → tên mặc định không trùng nhau', () => {
        renderPanel();
        fireEvent.click(region().getByText('+ Thêm kiểu dán'));
        fireEvent.click(region().getByText('+ Thêm kiểu dán'));
        expect(group(3).getByLabelText('Tên kiểu dán').value).toBe('Kiểu dán mới');
        expect(group(4).getByLabelText('Tên kiểu dán').value).toBe('Kiểu dán mới 2');
    });

    it('đổi tên kiểu dán giữ nguyên id (đơn đang mở không mất lựa chọn)', async () => {
        renderPanel();
        fireEvent.change(group(1).getByLabelText('Tên kiểu dán'), {
            target: { value: 'Dán băng keo phá màng 1 cm' },
        });
        await clickSave();
        expect(saved().GLUING_TYPES[0]).toMatchObject({
            id: PEEL,
            name: 'Dán băng keo phá màng 1 cm',
        });
    });

    it('trùng tên hoặc tên trống → chặn lưu, báo lỗi ngay tại mục dán', async () => {
        renderPanel();
        fireEvent.change(group(2).getByLabelText('Tên kiểu dán'), {
            target: { value: 'dán keo PHÁ MÀNG' },
        });
        await clickSave();
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toContain('trùng');
        fireEvent.change(group(2).getByLabelText('Tên kiểu dán'), { target: { value: '' } });
        await clickSave();
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toContain('Nhập tên');
    });

    it('thêm bậc: chèn trước bậc không giới hạn, mốc = mốc trước + 100, áp cho cả vốn lẫn khách', async () => {
        renderPanel();
        fireEvent.click(group(1).getByText('+ Thêm mức giá'));
        expect(group(1).getByLabelText('Ngưỡng SL — bậc 2').value).toBe('200');
        expect(group(1).getByLabelText('Không giới hạn — bậc 3').checked).toBe(true);
        await clickSave();
        expect(save).not.toHaveBeenCalled();

        edit(1, 'Ngưỡng SL — bậc 2', '300');
        edit(1, 'Cách tính — bậc 2', 'package');
        edit(1, 'Giá vốn (đ) — bậc 2', '50000');
        edit(1, 'Giá khách (đ) — bậc 2', '90000');
        await clickSave();

        const type = saved().GLUING_TYPES[0];
        expect(type.cost_tiers.map((t) => [t.max_qty, t.type, t.price])).toEqual([
            [100, 'package', 30000],
            [300, 'package', 50000],
            [Infinity, 'per_piece', 300],
        ]);
        expect(type.customer_tiers.map((t) => [t.max_qty, t.type, t.price])).toEqual([
            [100, 'package', 60000],
            [300, 'package', 90000],
            [Infinity, 'per_piece', 600],
        ]);
        const price = (qty) =>
            calculateGluingCost(qty, [{ typeId: PEEL }], saved().GLUING_TYPES).customerPrice;
        expect([price(100), price(101), price(300), price(301)]).toEqual([
            60000,
            90000,
            90000,
            301 * 600,
        ]);
    });

    it('đổi bậc trọn gói → theo sản phẩm và đổi mốc: hai bảng cùng đổi, giá giữ nguyên', async () => {
        renderPanel();
        edit(2, 'Cách tính — bậc 1', 'per_piece');
        edit(2, 'Ngưỡng SL — bậc 1', '50');
        await clickSave();
        const type = saved().GLUING_TYPES[1];
        expect(type.cost_tiers[0]).toEqual({ max_qty: 50, price: 40000, type: 'per_piece' });
        expect(type.customer_tiers[0]).toEqual({ max_qty: 50, price: 80000, type: 'per_piece' });
        expect(saved().GLUING_TYPES[0]).toEqual(DEFAULT_TYPES[0]);
    });

    it('xóa bậc: hai bảng cùng giảm; còn một bậc thì nút xóa bị khoá', async () => {
        renderPanel();
        fireEvent.click(group(1).getByText('Xóa bậc 1'));
        expect(group(1).getByText('Xóa bậc 1').disabled).toBe(true);
        await clickSave();
        const type = saved().GLUING_TYPES[0];
        expect(type.cost_tiers).toEqual([{ max_qty: Infinity, price: 300, type: 'per_piece' }]);
        expect(type.customer_tiers).toEqual([{ max_qty: Infinity, price: 600, type: 'per_piece' }]);
    });

    it('bỏ "không giới hạn" ở bậc cuối → có cảnh báo vượt bậc; vẫn lưu được', async () => {
        renderPanel();
        expect(region().queryByText(/Bậc cuối đang có giới hạn/)).toBeNull();
        fireEvent.click(group(1).getByLabelText('Không giới hạn — bậc 2'));
        expect(group(1).getByLabelText('Ngưỡng SL — bậc 2').value).toBe('200');
        expect(group(1).getByText(/Bậc cuối đang có giới hạn/)).toBeTruthy();
        await clickSave();
        const types = saved().GLUING_TYPES;
        expect(types[0].cost_tiers[1].max_qty).toBe(200);
        expect(types[0].customer_tiers[1].max_qty).toBe(200);
        expect(calculateGluingCost(201, [{ typeId: PEEL }], types)).toMatchObject({
            customerPrice: 0,
            uncoveredCount: 1,
        });
    });

    it('xóa kiểu dán: còn một kiểu; xóa hết → lưu mảng rỗng (ô dán ẩn ở màn tính giá)', async () => {
        renderPanel();
        fireEvent.click(group(1).getByText('Xóa kiểu dán'));
        await clickSave();
        expect(saved().GLUING_TYPES.map((t) => t.id)).toEqual([DOUBLE]);
        fireEvent.click(group(1).getByText('Xóa kiểu dán'));
        expect(region().getByText(/Chưa có kiểu dán nào/)).toBeTruthy();
        await clickSave();
        expect(saved().GLUING_TYPES).toEqual([]);
        expect(validateSmallPrintConfig(saved()).isValid).toBe(true);
    });

    it('config cũ không có GLUING_TYPES → mục vẫn mở được, thêm kiểu mới rồi lưu', async () => {
        const old = { ...DEFAULT_CONFIG };
        delete old.GLUING_TYPES;
        renderPanel(old);
        expect(region().getByText(/Chưa có kiểu dán nào/)).toBeTruthy();
        fireEvent.click(region().getByText('+ Thêm kiểu dán'));
        edit(1, 'Giá vốn (đ) — bậc 1', '100');
        edit(1, 'Giá khách (đ) — bậc 1', '250');
        await clickSave();
        expect(saved().GLUING_TYPES).toHaveLength(1);
        expect(saved().GLUING_TYPES[0].customer_tiers[0].price).toBe(250);
    });
});
