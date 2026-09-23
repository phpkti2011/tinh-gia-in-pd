// @vitest-environment jsdom
//
// Ô "Bồi thành phẩm" ở màn tính giá In KTS khổ nhỏ (config 1.5.0).
//
// Điểm quan trọng nhất: bồi KHÔNG còn khoá ô "Số mặt in" về 1. Ô đó là số mặt in của
// THÀNH PHẨM; khi bồi mỗi tờ giấy chỉ in 1 mặt nên 2 mặt = 2 tờ in (engine tự nhân).
// Trước v1.5.0 nó bị ép về 1 mặt nên đơn bồi thành phẩm 2 mặt không báo đúng được.

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
    blankPaperType: '3',
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

const optionValues = (select) => Array.from(select.options).map((o) => o.value);
const optionTexts = (select) => Array.from(select.options).map((o) => o.textContent.trim());

afterEach(() => cleanup());

describe('Lựa chọn kiểu bồi', () => {
    it('có đủ 3 dòng: không bồi / 2 lớp / 3 lớp', () => {
        renderPanel();
        const sel = screen.getByLabelText('Bồi thành phẩm');
        expect(optionValues(sel)).toEqual(['none', 'yes', '3_lop']);
        expect(optionTexts(sel)[1]).toMatch(/2 lớp/);
        expect(optionTexts(sel)[2]).toMatch(/3 lớp/);
    });
});

describe('Bồi KHÔNG còn khoá ô Số mặt in', () => {
    it('bồi 2 lớp + 2 mặt → ô Số mặt in vẫn bật, KHÔNG bị ép về 1', () => {
        const { onChange } = renderPanel({ mountingType: 'yes', printSides: '2' });
        expect(screen.getByLabelText('Số mặt in').disabled).toBe(false);
        expect(onChange).not.toHaveBeenCalledWith('printSides', '1');
    });

    it('bồi 3 lớp + 2 mặt → cũng không bị ép', () => {
        const { onChange } = renderPanel({ mountingType: '3_lop', printSides: '2' });
        expect(screen.getByLabelText('Số mặt in').disabled).toBe(false);
        expect(onChange).not.toHaveBeenCalledWith('printSides', '1');
    });
});

describe('Ô chọn giấy trắng', () => {
    it('không bồi → không có ô giấy trắng', () => {
        renderPanel();
        expect(screen.queryByLabelText(/Giấy trắng/)).toBeNull();
    });

    it('bồi 2 lớp + 2 mặt → KHÔNG có tờ trắng nên ẩn ô', () => {
        renderPanel({ mountingType: 'yes', printSides: '2' });
        expect(screen.queryByLabelText(/Giấy trắng/)).toBeNull();
    });

    it('bồi 2 lớp + 1 mặt → hiện ô (1 tờ trắng)', () => {
        renderPanel({ mountingType: 'yes', printSides: '1' });
        expect(screen.getByLabelText(/Giấy trắng/)).toBeTruthy();
    });

    it('bồi 3 lớp + 2 mặt → hiện ô (1 tờ trắng)', () => {
        renderPanel({ mountingType: '3_lop', printSides: '2' });
        expect(screen.getByLabelText(/Giấy trắng/)).toBeTruthy();
    });

    it('chỉ liệt kê giấy ream — không có giấy mỹ thuật / decal', () => {
        renderPanel({ mountingType: '3_lop', printSides: '2' });
        const texts = optionTexts(screen.getByLabelText(/Giấy trắng/));
        expect(texts).toContain('C300');
        expect(texts).not.toContain('Giấy mỹ thuật');
        expect(texts.some((t) => /decal/i.test(t))).toBe(false);
    });
});

describe('Ghi chú số tờ giấy', () => {
    it('bồi 3 lớp 2 mặt → nói rõ 2 tờ in + 1 tờ giấy trắng', () => {
        renderPanel({ mountingType: '3_lop', printSides: '2' });
        expect(screen.getByText(/2 tờ in \+ 1 tờ giấy trắng/)).toBeTruthy();
    });

    it('bồi 2 lớp 2 mặt → 2 tờ in, không nhắc tờ trắng', () => {
        renderPanel({ mountingType: 'yes', printSides: '2' });
        expect(screen.getByText(/2 tờ in/)).toBeTruthy();
        expect(screen.queryByText(/tờ giấy trắng/)).toBeNull();
    });

    it('không bồi → không có ghi chú', () => {
        renderPanel();
        expect(screen.queryByText(/tờ in$/)).toBeNull();
    });
});

describe('Decal / giấy khổ cố định', () => {
    it('đổi sang decal khi đang bồi → reset về không bồi', () => {
        // Nhánh decal (sqm) chưa hỗ trợ nhân số tờ giấy → thà reset còn hơn báo sai.
        const decalIdx = String(
            DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'sqm')
        );
        const { onChange } = renderPanel({ paperType: decalIdx, mountingType: 'yes' });
        expect(onChange).toHaveBeenCalledWith('mountingType', 'none');
    });
});
