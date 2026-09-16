// @vitest-environment jsdom
//
// Ô "Ép plastic" ở màn tính giá In KTS khổ nhỏ (config 1.4.0).
// Mục tiêu: nhân viên chỉ chọn được khổ admin đã tick cho độ dày đó; chưa chọn
// khổ thì cảnh báo vàng (tiền ép = 0 — engine lo); config cũ thiếu key → ô ẩn.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import InputPanel from '../../src/components/smallprint/InputPanel.jsx';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

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
    laminationType: 'none',
    laminationFilm: '',
    plasticThickness: 'none',
    plasticSize: '',
    creasingType: 'none',
    holePunchingType: 'none',
    customFinishingType: 'none',
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

afterEach(() => cleanup());

describe('InputPanel — Ép plastic', () => {
    it('liệt kê độ dày admin khai; chưa chọn độ dày thì không có ô khổ', () => {
        renderPanel();
        const th = screen.getByLabelText('Ép plastic');
        expect(optionTexts(th)).toEqual(['Không ép plastic', '80 mic', '125 mic']);
        expect(th.value).toBe('none');
        expect(screen.queryByLabelText('Khổ ép plastic')).toBeNull();
    });

    it('80 mic → khổ chỉ A6/A5/A4/A3 (không CCCD) + cảnh báo vàng chưa chọn khổ', () => {
        renderPanel({ plasticThickness: 'mic80' });
        const sz = screen.getByLabelText('Khổ ép plastic');
        expect(optionTexts(sz)).toEqual(['— chọn khổ —', 'A6', 'A5', 'A4', 'A3']);
        expect(sz.value).toBe('');
        expect(sz.className).toContain('border-yellow-500');
        expect(screen.getByText(/Chưa chọn khổ ép plastic/)).toBeTruthy();
    });

    it('125 mic → chỉ CCCD', () => {
        renderPanel({ plasticThickness: 'mic125' });
        expect(optionTexts(screen.getByLabelText('Khổ ép plastic'))).toEqual([
            '— chọn khổ —',
            'CCCD (67 x 97 mm)',
        ]);
    });

    it('đã chọn khổ → hết cảnh báo, select giữ giá trị', () => {
        renderPanel({ plasticThickness: 'mic80', plasticSize: 'a4' });
        expect(screen.queryByText(/Chưa chọn khổ ép plastic/)).toBeNull();
        expect(screen.getByLabelText('Khổ ép plastic').value).toBe('a4');
    });

    it('đổi select gọi onChange đúng tên field', () => {
        const { onChange } = renderPanel({ plasticThickness: 'mic80' });
        fireEvent.change(screen.getByLabelText('Ép plastic'), { target: { value: 'mic125' } });
        expect(onChange).toHaveBeenCalledWith('plasticThickness', 'mic125');
        fireEvent.change(screen.getByLabelText('Khổ ép plastic'), { target: { value: 'a4' } });
        expect(onChange).toHaveBeenCalledWith('plasticSize', 'a4');
    });

    it('% phụ thu hiện cạnh tên độ dày', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PLASTIC_LAMINATION_CONFIG.thicknesses[1].percent = 20;
        renderPanel({}, cfg);
        expect(optionTexts(screen.getByLabelText('Ép plastic'))).toContain('125 mic (+20%)');
    });

    it('độ dày chưa tick khổ nào → ghi chú xám, không cảnh báo vàng', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PLASTIC_LAMINATION_CONFIG.thicknesses[1].sizeIds = [];
        renderPanel({ plasticThickness: 'mic125' }, cfg);
        expect(screen.getByText(/chưa được tick khổ nào/)).toBeTruthy();
        expect(screen.queryByText(/Chưa chọn khổ ép plastic/)).toBeNull();
    });

    it('config cũ thiếu PLASTIC_LAMINATION_CONFIG → không render ô Ép plastic', () => {
        const cfg = { ...DEFAULT_CONFIG };
        delete cfg.PLASTIC_LAMINATION_CONFIG;
        renderPanel({}, cfg);
        expect(screen.queryByLabelText('Ép plastic')).toBeNull();
        expect(screen.queryByLabelText('Khổ ép plastic')).toBeNull();
    });

    it('không có độ dày nào (admin xoá hết) → ô ẩn', () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PLASTIC_LAMINATION_CONFIG.thicknesses = [];
        renderPanel({}, cfg);
        expect(screen.queryByLabelText('Ép plastic')).toBeNull();
    });
});
