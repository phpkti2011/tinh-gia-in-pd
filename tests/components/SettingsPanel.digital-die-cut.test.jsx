// @vitest-environment jsdom
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, within } from '@testing-library/react';
import SettingsPanel from '../../src/components/smallprint/SettingsPanel';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
import { calculateDieCuttingCosts } from '../../src/modules/small-print/engine/finishing';
import { validateDigitalDieCutTiers } from '../../src/modules/small-print/config/digitalDieCutTiers';
const save = vi.hoisted(() => vi.fn(() => true));
vi.mock('../../src/utils/configStorage', () => ({ saveConfig: (...args) => save(...args) }));
vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({ default: () => null }));
afterEach(() => {
    cleanup();
    save.mockClear();
});
const change = (label, value) =>
    fireEvent.change(
        within(screen.getByRole('region', { name: 'Giá Bế Kỹ Thuật Số' })).getByLabelText(label),
        { target: { value } }
    );
describe('Bậc bế kỹ thuật số', () => {
    it('công bế khuôn thêm trước bậc không giới hạn, lưu/xóa độc lập với bế KTS', async () => {
        render(<SettingsPanel config={DEFAULT_CONFIG} onSave={vi.fn()} onCancel={() => {}} />);
        const section = within(screen.getByRole('region', { name: 'Giá Công Bế Khuôn' }));
        const edit = (label, value) =>
            fireEvent.change(section.getByLabelText(label), { target: { value } });
        fireEvent.click(section.getByText('+ Thêm bậc công bế khuôn'));
        expect(section.getByLabelText('Không giới hạn số tờ — bậc 4').checked).toBe(true);
        edit('Đến số tờ máy — bậc 3', '2000');
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        expect(save).not.toHaveBeenCalled();
        edit('Giá vốn (đ) — bậc 3', '200');
        edit('Giá khách (đ) — bậc 3', '300');
        edit('Cách tính — bậc 3', 'per_piece');
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        const cfg = save.mock.calls.at(-1)[0];
        expect(cfg.DIGITAL_DIE_CUTTING_CONFIG).toEqual(DEFAULT_CONFIG.DIGITAL_DIE_CUTTING_CONFIG);
        expect(cfg.DIE_CUTTING_LABOR_CONFIG.decal_surcharge).toBe(0.25);
        const params = { dieCuttingType: 'mold', moldType: 'envelope', productW: 22, productH: 12 };
        expect(calculateDieCuttingCosts(params, 2000, false, cfg)).toMatchObject({
            laborCost: 400000,
            laborCustomerPrice: 600000,
        });
        expect(calculateDieCuttingCosts(params, 2001, false, cfg)).toMatchObject({
            laborCost: 225000,
            laborCustomerPrice: 450000,
        });
        fireEvent.click(section.getByText('Xóa bậc 3'));
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        expect(save.mock.calls.at(-1)[0].DIE_CUTTING_LABOR_CONFIG).toEqual(
            DEFAULT_CONFIG.DIE_CUTTING_LABOR_CONFIG
        );
    });
    it('thêm bậc 2000, nhập đủ giá mới lưu; tính đúng và xóa đồng bộ', async () => {
        render(<SettingsPanel config={DEFAULT_CONFIG} onSave={vi.fn()} onCancel={() => {}} />);
        fireEvent.click(screen.getByText('+ Thêm bậc bế kỹ thuật số'));
        change('Đến số tờ máy — bậc 6', '2000');
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('alert').textContent).toContain('Nhập giá');
        change('Giá vốn (đ) — bậc 6', '400000');
        change('Giá khách (đ) — bậc 6', '700000');
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        const config = save.mock.calls.at(-1)[0];
        expect(
            calculateDieCuttingCosts({ dieCuttingType: 'digital' }, 2000, false, config)
        ).toMatchObject({ moldCost: 0, laborCost: 400000, laborCustomerPrice: 700000 });
        change('Cách tính — bậc 6', 'per_piece');
        change('Giá vốn (đ) — bậc 6', '200');
        change('Giá khách (đ) — bậc 6', '350');
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        expect(
            calculateDieCuttingCosts(
                { dieCuttingType: 'digital' },
                2000,
                false,
                save.mock.calls.at(-1)[0]
            )
        ).toMatchObject({ laborCost: 400000, laborCustomerPrice: 700000 });
        fireEvent.click(screen.getByText('Xóa bậc 6'));
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        const last = save.mock.calls.at(-1)[0].DIGITAL_DIE_CUTTING_CONFIG;
        expect(last.cost_tiers).toHaveLength(5);
        expect(last.customer_tiers).toHaveLength(5);
    });
    it('không chấp nhận mốc trùng, giảm, giá trống hoặc âm', () => {
        expect(validateDigitalDieCutTiers(DEFAULT_CONFIG.DIGITAL_DIE_CUTTING_CONFIG)).toEqual([]);
        for (const patch of [
            { max_qty: 10 },
            { max_qty: 0 },
            { max_qty: 10.5 },
            { price: NaN },
            { price: -1 },
        ]) {
            const cfg = structuredClone(DEFAULT_CONFIG.DIGITAL_DIE_CUTTING_CONFIG);
            Object.assign(cfg.cost_tiers[1], patch);
            // 10.5 là số lẻ, không phải số tờ hợp lệ.
            expect(validateDigitalDieCutTiers(cfg).length).toBeGreaterThan(0);
        }
    });
});
