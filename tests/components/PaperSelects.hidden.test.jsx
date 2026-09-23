// @vitest-environment jsdom
//
// Giấy bị ẩn phải biến mất khỏi MỌI ô chọn ở màn tính giá — kể cả Catalogue và Lò xo,
// hai module dùng CHUNG bảng giấy của In KTS khổ nhỏ.
//
// Và điều quan trọng không kém: giá trị của <option> vẫn là VỊ TRÍ GỐC trong mảng. Lọc mà
// đánh lại số thứ tự là báo giá sai giấy ngay lập tức.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import InputPanel from '../../src/components/smallprint/InputPanel.jsx';
import CatalogueInputPanel from '../../src/components/catalogue/CatalogueInputPanel.jsx';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

afterEach(() => cleanup());

const optionValues = (sel) => Array.from(sel.options).map((o) => o.value);
const optionTexts = (sel) => Array.from(sel.options).map((o) => o.textContent.trim());

const hiddenAt = (...idxs) => {
    const cfg = structuredClone(DEFAULT_CONFIG);
    idxs.forEach((i) => {
        cfg.PAPER_STOCK_DATA[i].hidden = true;
    });
    return cfg;
};

const spParams = {
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

function renderSmallPrint(config, params = {}) {
    render(
        <InputPanel
            config={config}
            params={{ ...spParams, ...params }}
            onChange={vi.fn()}
            isAutoCalculating={false}
        />
    );
}

const catParams = {
    coverPaperType: '3',
    innerPaperType: '0',
    finishedW: 210,
    finishedH: 297,
    numPages: 16,
    quantity: 100,
    orientation: 'portrait',
    printColorMode: '4color',
    laminationFilm: '',
    coverLamination: 'none',
    coverSingleSide: false,
    artPaperPrice: 0,
};

describe('In KTS khổ nhỏ — ô "Loại giấy / Decal"', () => {
    it('giấy ẩn biến mất, các giấy còn lại GIỮ NGUYÊN số thứ tự', () => {
        renderSmallPrint(hiddenAt(1));
        const sel = screen.getByLabelText('Loại giấy / Decal');

        expect(optionValues(sel)).not.toContain('1');
        expect(optionTexts(sel)).not.toContain('C200');
        // C300 vẫn mang value '3' — lọc KHÔNG được đánh lại số.
        expect(sel.querySelector('option[value="3"]').textContent.trim()).toBe('C300');
    });

    it('ẩn nhiều giấy cùng lúc', () => {
        renderSmallPrint(hiddenAt(0, 1, 2));
        const texts = optionTexts(screen.getByLabelText('Loại giấy / Decal'));
        expect(texts).not.toContain('C150');
        expect(texts).not.toContain('C200');
        expect(texts).not.toContain('C250');
        expect(texts).toContain('C300');
    });

    it('giấy ĐANG CHỌN dù bị ẩn vẫn còn trong ô — không để đơn đang mở mất giấy', () => {
        renderSmallPrint(hiddenAt(3));
        const sel = screen.getByLabelText('Loại giấy / Decal');
        expect(optionValues(sel)).toContain('3');
        expect(sel.querySelector('option[value="3"]').textContent.trim()).toBe('C300');
    });

    it('ô giấy trắng của thành phẩm bồi cũng lọc theo', () => {
        renderSmallPrint(hiddenAt(0), { mountingType: 'yes', printSides: '1' });
        const sel = screen.getByLabelText(/Giấy trắng/);
        expect(optionTexts(sel)).not.toContain('C150');
        expect(optionTexts(sel)).toContain('C300');
    });
});

describe('Catalogue — dùng chung bảng giấy, phải lọc theo', () => {
    it('cả ô giấy bìa lẫn giấy ruột đều bỏ giấy đã ẩn', () => {
        render(
            <CatalogueInputPanel
                config={{ ...hiddenAt(1), ...DEFAULT_CONFIG.CATALOGUE_CONFIG }}
                params={catParams}
                onChange={vi.fn()}
            />
        );
        for (const label of ['Giấy bìa (4 trang)', 'Giấy ruột']) {
            const sel = screen.getByLabelText(label);
            expect(optionTexts(sel)).not.toContain('C200');
            expect(sel.querySelector('option[value="3"]').textContent.trim()).toBe('C300');
        }
    });
});

describe('Không ẩn gì → mọi ô y như trước', () => {
    it('đủ số giấy như config mặc định', () => {
        renderSmallPrint(DEFAULT_CONFIG);
        expect(optionValues(screen.getByLabelText('Loại giấy / Decal'))).toHaveLength(
            DEFAULT_CONFIG.PAPER_STOCK_DATA.length
        );
    });
});
