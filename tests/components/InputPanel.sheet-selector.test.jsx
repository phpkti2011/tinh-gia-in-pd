// @vitest-environment jsdom
//
// Ô "Khổ giấy lớn" ở màn tính giá In KTS khổ nhỏ.
//
// Giấy mỹ thuật dùng ART_PAPER_LARGE_SHEET_SIZES (có dòng "Tùy chọn"), giấy thường dùng
// STANDARD_LARGE_SHEET_SIZES — hai danh sách khác độ dài. `largeSheetSelector` là INDEX vào
// danh sách đang dùng, nên đổi loại giấy giữa hai nhóm mà giữ nguyên index thì:
//   - vượt phạm vi → select hiển thị khổ đầu nhưng engine không thấy khổ → "Không tìm thấy
//     phương án tối ưu phù hợp" (lỗi người dùng gặp khi đổi từ Giấy mỹ thuật sang C300);
//   - hoặc trỏ sang một khổ khác với cái đang hiển thị.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import InputPanel from '../../src/components/smallprint/InputPanel.jsx';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

const indexOfPaper = (name) => DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.name === name);
const ART = String(indexOfPaper('Giấy mỹ thuật'));
const C300 = String(indexOfPaper('C300'));
const B300 = String(indexOfPaper('B300'));
const DECAL = String(indexOfPaper('Decal giấy đế mỏng (VHM)'));

const baseParams = {
    paperType: C300,
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
    blankPaperType: C300,
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

function renderPanel(params = {}) {
    const onChange = vi.fn();
    render(
        <InputPanel
            config={DEFAULT_CONFIG}
            params={{ ...baseParams, ...params }}
            onChange={onChange}
            isAutoCalculating={false}
        />
    );
    return { onChange };
}

const sheetResets = (onChange) =>
    onChange.mock.calls.filter(([name]) => name === 'largeSheetSelector');

afterEach(cleanup);

describe('InputPanel — khổ giấy lớn khi đổi loại giấy', () => {
    it('có đủ giả định: mỹ thuật nhiều khổ hơn giấy thường, "Tùy chọn" nằm ở cuối', () => {
        expect(ART).not.toBe('-1');
        expect(C300).not.toBe('-1');
        const art = DEFAULT_CONFIG.ART_PAPER_LARGE_SHEET_SIZES;
        expect(art.length).toBeGreaterThan(DEFAULT_CONFIG.STANDARD_LARGE_SHEET_SIZES.length);
        expect(art[art.length - 1].w).toBe('custom');
    });

    it('Giấy mỹ thuật (đang chọn "Tùy chọn") → C300: reset khổ về khổ đầu', () => {
        const customIdx = String(DEFAULT_CONFIG.ART_PAPER_LARGE_SHEET_SIZES.length - 1);
        const { onChange } = renderPanel({ paperType: ART, largeSheetSelector: customIdx });

        fireEvent.change(screen.getByLabelText('Loại giấy / Decal'), { target: { value: C300 } });

        expect(onChange).toHaveBeenCalledWith('paperType', C300);
        expect(onChange).toHaveBeenCalledWith('largeSheetSelector', '0');
    });

    it('C300 → Giấy mỹ thuật: cũng reset (index 1 của hai danh sách là hai khổ khác nhau)', () => {
        const { onChange } = renderPanel({ paperType: C300, largeSheetSelector: '1' });

        fireEvent.change(screen.getByLabelText('Loại giấy / Decal'), { target: { value: ART } });

        expect(onChange).toHaveBeenCalledWith('largeSheetSelector', '0');
    });

    it('C300 → B300 (cùng nhóm): GIỮ khổ người dùng đã chọn', () => {
        const { onChange } = renderPanel({ paperType: C300, largeSheetSelector: '1' });

        fireEvent.change(screen.getByLabelText('Loại giấy / Decal'), { target: { value: B300 } });

        expect(onChange).toHaveBeenCalledWith('paperType', B300);
        expect(sheetResets(onChange)).toHaveLength(0);
    });
});

describe('InputPanel — lưới an toàn khi index khổ vượt phạm vi', () => {
    it('giấy thường mà index = "Tùy chọn" của giấy mỹ thuật → tự về khổ đầu', () => {
        const { onChange } = renderPanel({ paperType: C300, largeSheetSelector: '3' });
        expect(onChange).toHaveBeenCalledWith('largeSheetSelector', '0');
    });

    it('index hợp lệ → không đụng tới', () => {
        const { onChange } = renderPanel({ paperType: C300, largeSheetSelector: '1' });
        expect(sheetResets(onChange)).toHaveLength(0);
    });

    it('giấy mỹ thuật + "Tùy chọn" là index hợp lệ → không reset', () => {
        const customIdx = String(DEFAULT_CONFIG.ART_PAPER_LARGE_SHEET_SIZES.length - 1);
        const { onChange } = renderPanel({ paperType: ART, largeSheetSelector: customIdx });
        expect(sheetResets(onChange)).toHaveLength(0);
    });

    it('decal (ẩn ô khổ giấy lớn) → không đụng tới dù index lạ', () => {
        const { onChange } = renderPanel({ paperType: DECAL, largeSheetSelector: '3' });
        expect(sheetResets(onChange)).toHaveLength(0);
    });
});
