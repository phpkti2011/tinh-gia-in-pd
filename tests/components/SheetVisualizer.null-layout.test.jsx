// @vitest-environment jsdom
//
// Regression: chọn "Decal xi bạc" làm vỡ trang với lỗi
//   Cannot read properties of null (reading 'length')
//
// Nguyên nhân: calculatePerSheetOptions gán cuttableSheetLayout = null, còn
// LargeSheetVisualizer khai báo `layouts = []` làm default param. Default param
// trong JS CHỈ kích hoạt với undefined, KHÔNG kích hoạt với null → layouts vẫn
// là null → `layouts.length` ném lỗi.
//
// Chặn hai đầu: engine phải trả [], và component phải chịu được null.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import { LargeSheetVisualizer } from '../../src/components/smallprint/SheetVisualizer.jsx';
import { calculatePerSheetOptions } from '../../src/modules/small-print/engine/index.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';

afterEach(() => cleanup());

const XI_BAC_IDX = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'per_sheet');
const XI_BAC = DEFAULT_CONFIG.PAPER_STOCK_DATA[XI_BAC_IDX];

describe('LargeSheetVisualizer — chịu được layouts null/undefined', () => {
    const baseProps = { largeW: 33, largeH: 48, cutW: 33, cutH: 48, neededPrintSheets: 10 };

    it('layouts = null không làm vỡ, vẽ ô fallback', () => {
        expect(() => render(<LargeSheetVisualizer {...baseProps} layouts={null} />)).not.toThrow();
        expect(screen.getByText('1')).toBeTruthy();
    });

    it('layouts = undefined không làm vỡ', () => {
        expect(() =>
            render(<LargeSheetVisualizer {...baseProps} layouts={undefined} />)
        ).not.toThrow();
    });

    it('layouts là mảng thật thì vẽ đúng số ô', () => {
        const layouts = [
            { x: 0, y: 0, w: 32.2, h: 21.2 },
            { x: 0, y: 21.2, w: 32.2, h: 21.2 },
            { x: 0, y: 42.4, w: 32.2, h: 21.2 },
        ];
        render(<LargeSheetVisualizer {...baseProps} largeH={86} layouts={layouts} />);
        expect(screen.getByText('3')).toBeTruthy();
        expect(screen.queryByText('4')).toBeNull();
    });

    it('không mutate mảng layouts của caller', () => {
        const layouts = [{ x: 0, y: 0, w: 33, h: 48 }];
        render(<LargeSheetVisualizer {...baseProps} layouts={layouts} />);
        expect(layouts).toHaveLength(1);
    });
});

describe('calculatePerSheetOptions — decal xi bạc', () => {
    const params = {
        productQuantity: 5000,
        printSides: 1,
        printColorMode: '4color',
        laminationType: 'none',
    };
    const results = [];
    calculatePerSheetOptions(params, XI_BAC, 16, 5.3, results, 0, false, DEFAULT_CONFIG);

    it('sinh được phương án', () => {
        expect(results.length).toBeGreaterThan(0);
    });

    it('cuttableSheetLayout là ARRAY, không phải null', () => {
        for (const r of results) {
            expect(Array.isArray(r.cuttableSheetLayout)).toBe(true);
        }
    });

    it('dùng đúng khổ cố định 33 x 48 của loại giấy này', () => {
        expect(XI_BAC.sheetSize).toEqual({ w: 33, h: 48 });
        for (const r of results) {
            expect(r.cutSheetW).toBe(33);
            expect(r.cutSheetH).toBe(48);
        }
    });

    it('render được panel sơ đồ với kết quả thật (không ném lỗi)', () => {
        const r = results[0];
        expect(() =>
            render(
                <LargeSheetVisualizer
                    largeW={r.largeSheetW}
                    largeH={r.largeSheetH}
                    cutW={r.cutSheetW}
                    cutH={r.cutSheetH}
                    layouts={r.cuttableSheetLayout}
                    neededPrintSheets={Math.ceil(params.productQuantity / r.productsPerSheet)}
                />
            )
        ).not.toThrow();
    });
});

describe('Tên loại giấy', () => {
    it('decal xi bạc đã đổi sang tên mới', () => {
        expect(XI_BAC.name).toBe('Decal xi bạc/vàng hiệu ứng bóng/mờ (không phải cán màng)');
    });

    it('tên vẫn chứa "decal" — engine dùng chuỗi này để loại nhánh tờ oversized', () => {
        expect(XI_BAC.name.toLowerCase()).toContain('decal');
    });
});
