// @vitest-environment jsdom
//
// Ô "Dán thành phẩm" ở màn tính giá In KTS khổ nhỏ (config 1.9.0).
//
// Một đơn có thể dán nhiều kiểu keo: nút "＋ Thêm kiểu dán" thêm một dòng, mỗi dòng chọn một
// kiểu trong GLUING_TYPES. Danh sách đi lên qua onChange('gluingLines', [...]) như foilMolds.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import InputPanel from '../../src/components/smallprint/InputPanel.jsx';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

const PEEL = 'glue-peel-seal';
const DOUBLE = 'glue-double-sided-yellow';

const baseParams = {
    paperType: '3',
    artPaperPrice: 10000,
    productW: 9,
    productH: 5.5,
    bleed: 0.15,
    productQuantity: 500,
    printSides: '2',
    printContents: 1,
    variableData: 'no',
    largeSheetSelector: '0',
    customSheetW: 70,
    customSheetH: 100,
    mountingType: 'none',
    blankPaperType: '3',
    laminationType: 'none',
    laminationFilm: '',
    plasticThickness: 'none',
    plasticSize: '',
    creasingType: 'none',
    holePunchingType: 'none',
    customFinishingType: 'none',
    gluingLines: [],
    dieCuttingType: 'none',
    moldType: 'simple',
    tagHasHole: false,
    printColorMode: '4color',
    foilStamping: 'none',
    foilMolds: [{ w: 9, h: 5.5, special: false, impressions: 1 }],
};

function renderPanel(params = {}, config = DEFAULT_CONFIG) {
    const onChange = vi.fn();
    render(
        <InputPanel
            config={config}
            params={{ ...baseParams, ...params }}
            onChange={onChange}
            isAutoCalculating={false}
        />
    );
    return { onChange };
}

const optionTexts = (select) => Array.from(select.options).map((o) => o.textContent.trim());
const ADD = '＋ Thêm kiểu dán';

afterEach(() => cleanup());

describe('Ô Dán thành phẩm', () => {
    it('chưa có dòng nào: chỉ có nút thêm; bấm → thêm dòng với kiểu dán đầu tiên', () => {
        const { onChange } = renderPanel();
        expect(screen.getByText('Dán thành phẩm')).toBeTruthy();
        expect(screen.queryByLabelText('Kiểu dán 1')).toBeNull();
        fireEvent.click(screen.getByText(ADD));
        expect(onChange).toHaveBeenCalledWith('gluingLines', [{ typeId: PEEL }]);
    });

    it('một đơn nhiều kiểu dán: mỗi dòng một ô chọn, liệt kê đủ kiểu trong Cài Đặt', () => {
        renderPanel({ gluingLines: [{ typeId: PEEL }, { typeId: DOUBLE }] });
        const first = screen.getByLabelText('Kiểu dán 1');
        const second = screen.getByLabelText('Kiểu dán 2');
        expect(first.value).toBe(PEEL);
        expect(second.value).toBe(DOUBLE);
        expect(optionTexts(first)).toEqual(['Dán keo phá màng', 'Dán keo 2 mặt vàng']);
        expect(optionTexts(second)).toEqual(['Dán keo phá màng', 'Dán keo 2 mặt vàng']);
    });

    it('thêm dòng thứ ba giữ nguyên hai dòng cũ; đổi kiểu chỉ đổi đúng dòng đó', () => {
        const { onChange } = renderPanel({ gluingLines: [{ typeId: PEEL }, { typeId: DOUBLE }] });
        fireEvent.click(screen.getByText(ADD));
        expect(onChange).toHaveBeenLastCalledWith('gluingLines', [
            { typeId: PEEL },
            { typeId: DOUBLE },
            { typeId: PEEL },
        ]);
        fireEvent.change(screen.getByLabelText('Kiểu dán 2'), { target: { value: PEEL } });
        expect(onChange).toHaveBeenLastCalledWith('gluingLines', [
            { typeId: PEEL },
            { typeId: PEEL },
        ]);
    });

    it('xóa dòng 1 → còn dòng 2; xóa được cả dòng cuối cùng (không dán)', () => {
        const { onChange } = renderPanel({ gluingLines: [{ typeId: PEEL }, { typeId: DOUBLE }] });
        fireEvent.click(screen.getByLabelText('Xóa kiểu dán 1'));
        expect(onChange).toHaveBeenLastCalledWith('gluingLines', [{ typeId: DOUBLE }]);
        cleanup();
        const single = renderPanel({ gluingLines: [{ typeId: DOUBLE }] });
        fireEvent.click(screen.getByLabelText('Xóa kiểu dán 1'));
        expect(single.onChange).toHaveBeenLastCalledWith('gluingLines', []);
    });

    it('kiểu dán đã bị xoá trong Cài Đặt → giữ dòng, hiện ô "chọn lại" và ghi chú', () => {
        const { onChange } = renderPanel({ gluingLines: [{ typeId: 'glue-da-xoa' }] });
        const select = screen.getByLabelText('Kiểu dán 1');
        expect(select.value).toBe('');
        expect(optionTexts(select)).toEqual([
            '— Chọn kiểu dán —',
            'Dán keo phá màng',
            'Dán keo 2 mặt vàng',
        ]);
        expect(screen.getByText(/đã bị xoá trong Cài Đặt/)).toBeTruthy();
        fireEvent.change(select, { target: { value: DOUBLE } });
        expect(onChange).toHaveBeenLastCalledWith('gluingLines', [{ typeId: DOUBLE }]);
    });

    it('admin xoá hết kiểu dán hoặc config cũ không có GLUING_TYPES → ô ẩn hẳn', () => {
        renderPanel({}, { ...DEFAULT_CONFIG, GLUING_TYPES: [] });
        expect(screen.queryByText('Dán thành phẩm')).toBeNull();
        expect(screen.queryByText(ADD)).toBeNull();
        cleanup();
        const old = { ...DEFAULT_CONFIG };
        delete old.GLUING_TYPES;
        renderPanel({}, old);
        expect(screen.queryByText(ADD)).toBeNull();
    });

    it('params cũ chưa có gluingLines → không nổ, vẫn thêm được dòng', () => {
        const { onChange } = renderPanel({ gluingLines: undefined });
        fireEvent.click(screen.getByText(ADD));
        expect(onChange).toHaveBeenCalledWith('gluingLines', [{ typeId: PEEL }]);
    });

    it('kiểu dán admin thêm trong Cài Đặt xuất hiện trong ô chọn', () => {
        const config = structuredClone(DEFAULT_CONFIG);
        config.GLUING_TYPES.push({
            id: 'glue-sua',
            name: 'Dán keo sữa',
            cost_tiers: [{ max_qty: Infinity, price: 100, type: 'per_piece' }],
            customer_tiers: [{ max_qty: Infinity, price: 200, type: 'per_piece' }],
        });
        renderPanel({ gluingLines: [{ typeId: 'glue-sua' }] }, config);
        const select = screen.getByLabelText('Kiểu dán 1');
        expect(select.value).toBe('glue-sua');
        expect(optionTexts(select)).toContain('Dán keo sữa');
    });
});
