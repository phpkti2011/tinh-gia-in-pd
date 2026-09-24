// @vitest-environment jsdom
//
// Mục "Giá Giấy / Decal" ở tab Cài Đặt (In KTS khổ nhỏ) — config v1.6.0.
//
// Trước đây danh sách giấy cứng trong code: không thêm được, không bỏ được, và cách tính
// giá (ram / m² / tờ / gõ tay) cũng không sửa được — giấy 'custom' thậm chí không hiện ra.
//
// Ràng buộc chốt ở đây:
//   - Thêm giấy NỐI VÀO CUỐI, không đụng vị trí giấy cũ (params.paperType là vị trí mảng,
//     và Catalogue + Lò xo dùng chung bảng này).
//   - Bỏ giấy là ẨN (hidden: true), KHÔNG splice — splice làm mọi giấy sau tụt 1 bậc.
//   - Không ẩn được giấy cuối cùng.

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

function renderPanel(config = DEFAULT_CONFIG) {
    render(<SettingsPanel config={config} onSave={vi.fn()} onCancel={() => {}} />);
    const save = async () => {
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        return mockSaveConfig.mock.calls.at(-1)[0];
    };
    const card = (idx) => screen.getByTestId(`paper-${idx}`);
    const addPaper = () => fireEvent.click(screen.getByText('+ Thêm giấy'));
    const toggleHide = (idx) => {
        const btn = within(card(idx)).queryByText('Ẩn') || within(card(idx)).getByText('Hiện lại');
        fireEvent.click(btn);
    };
    return { save, card, addPaper, toggleHide };
}

beforeEach(() => {
    mockSaveConfig.mockClear();
    mockSaveConfig.mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    vi.spyOn(window, 'confirm').mockImplementation(() => true);
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

const N = DEFAULT_CONFIG.PAPER_STOCK_DATA.length;

describe('Hiện đủ mọi loại giấy', () => {
    it('kể cả giấy gõ tay (custom) — trước đây bị ẩn khỏi Cài Đặt', () => {
        renderPanel();
        const customIdx = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex(
            (p) => p.pricingModel === 'custom'
        );
        expect(screen.getByTestId(`paper-${customIdx}`)).toBeTruthy();
    });

    it('mỗi giấy có ô chọn cách tính giá', () => {
        const { card } = renderPanel();
        expect(within(card(0)).getByLabelText(/Cách tính giá/)).toBeTruthy();
    });
});

describe('Thêm giấy', () => {
    it('nối vào CUỐI, không đụng vị trí giấy cũ', async () => {
        const { save, addPaper } = renderPanel();
        addPaper();
        const arr = (await save()).PAPER_STOCK_DATA;

        expect(arr).toHaveLength(N + 1);
        // C300 vẫn ở đúng vị trí 3 — đây là thứ xoá giấy sẽ phá.
        expect(arr[3].name).toBe('C300');
        expect(arr[N].name).toBe('Giấy mới');
    });

    it('giấy mới có sẵn field giá nên lưu được ngay', async () => {
        const { save, addPaper } = renderPanel();
        addPaper();
        const cfg = await save();
        expect(typeof cfg.PAPER_STOCK_DATA[N].pricePerReam).toBe('number');
        expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
    });

    it('thêm 2 lần → 2 giấy mới ở cuối', async () => {
        const { save, addPaper } = renderPanel();
        addPaper();
        addPaper();
        expect((await save()).PAPER_STOCK_DATA).toHaveLength(N + 2);
    });
});

describe('Đổi cách tính giá', () => {
    it('đổi sang m² → hiện ô Giá / m² và lưu đúng field', async () => {
        const { save, card } = renderPanel();
        fireEvent.change(within(card(0)).getByLabelText(/Cách tính giá/), {
            target: { value: 'sqm' },
        });
        expect(within(card(0)).getByText('Giá / m²')).toBeTruthy();

        const arr = (await save()).PAPER_STOCK_DATA;
        expect(arr[0].pricingModel).toBe('sqm');
        expect(typeof arr[0].pricePerSqm).toBe('number');
    });

    it('đổi sang theo tờ → hiện thêm 2 ô khổ tờ', async () => {
        const { save, card } = renderPanel();
        fireEvent.change(within(card(0)).getByLabelText(/Cách tính giá/), {
            target: { value: 'per_sheet' },
        });
        expect(within(card(0)).getByText('Khổ rộng (cm)')).toBeTruthy();

        const arr = (await save()).PAPER_STOCK_DATA;
        expect(arr[0].sheetSize).toEqual({ w: 33, h: 48 });
    });

    it('đổi nhầm rồi đổi lại → giá cũ vẫn còn', async () => {
        const { save, card } = renderPanel();
        const sel = within(card(0)).getByLabelText(/Cách tính giá/);
        fireEvent.change(sel, { target: { value: 'sqm' } });
        fireEvent.change(sel, { target: { value: 'ream' } });

        const arr = (await save()).PAPER_STOCK_DATA;
        expect(arr[0].pricePerReam).toBe(DEFAULT_CONFIG.PAPER_STOCK_DATA[0].pricePerReam);
    });

    it('đổi giấy này KHÔNG đụng giấy khác', async () => {
        const { save, card } = renderPanel();
        fireEvent.change(within(card(0)).getByLabelText(/Cách tính giá/), {
            target: { value: 'sqm' },
        });
        const arr = (await save()).PAPER_STOCK_DATA;
        expect(arr[3].pricingModel).toBe('ream');
        expect(arr[3].name).toBe('C300');
    });
});

describe('Ẩn giấy', () => {
    it('ẩn = đánh dấu hidden, KHÔNG xoá khỏi mảng', async () => {
        const { save, toggleHide } = renderPanel();
        toggleHide(1);
        const arr = (await save()).PAPER_STOCK_DATA;

        expect(arr).toHaveLength(N); // độ dài không đổi ⇒ vị trí không xê dịch
        expect(arr[1].hidden).toBe(true);
        expect(arr[3].name).toBe('C300');
    });

    it('hỏi xác nhận trước khi ẩn; bấm Huỷ thì không ẩn', async () => {
        window.confirm.mockReturnValue(false);
        const { save, toggleHide } = renderPanel();
        toggleHide(1);

        expect(window.confirm).toHaveBeenCalled();
        expect((await save()).PAPER_STOCK_DATA[1].hidden).toBeFalsy();
    });

    it('cảnh báo riêng khi ẩn chính giấy chuẩn so giá', () => {
        const { toggleHide } = renderPanel();
        const refName = DEFAULT_CONFIG.PAPER_REFERENCE_CONFIG.referencePaperName;
        const refIdx = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.name === refName);
        toggleHide(refIdx);
        expect(window.confirm.mock.calls[0][0]).toMatch(/GIẤY CHUẨN/);
    });

    it('hiện lại được, và KHÔNG hỏi xác nhận khi bật lại', async () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PAPER_STOCK_DATA[1].hidden = true;
        const { save, toggleHide } = renderPanel(cfg);
        toggleHide(1);

        expect(window.confirm).not.toHaveBeenCalled();
        expect((await save()).PAPER_STOCK_DATA[1].hidden).toBe(false);
    });

    it('không ẩn được giấy cuối cùng đang hiện', async () => {
        const cfg = structuredClone(DEFAULT_CONFIG);
        cfg.PAPER_STOCK_DATA.forEach((p, i) => {
            if (i !== 0) p.hidden = true;
        });
        const { save, toggleHide } = renderPanel(cfg);
        toggleHide(0);

        expect(window.alert).toHaveBeenCalled();
        expect((await save()).PAPER_STOCK_DATA[0].hidden).toBeFalsy();
    });
});

describe('Bảng khổ của giấy khổ cố định (v1.7.0)', () => {
    const PS = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex((p) => p.pricingModel === 'per_sheet');

    function renderSheet(config = DEFAULT_CONFIG) {
        const r = renderPanel(config);
        const card = () => screen.getByTestId(`paper-${PS}`);
        const nums = () => within(card()).getAllByRole('spinbutton');
        // Mỗi dòng khổ = 3 ô (rộng, cao, giá). Ô phụ thu KH nằm SAU cùng trong thẻ.
        const rowCount = () => Math.floor((nums().length - 1) / 3);
        const cell = (row, col) => nums()[row * 3 + col];
        const addSize = () => fireEvent.click(within(card()).getByText('+ Thêm khổ'));
        const delButtons = () => within(card()).queryAllByTitle('Xóa khổ');
        return { ...r, card, rowCount, cell, addSize, delButtons };
    }

    it('giấy chỉ có cặp field cũ → hiện đúng 1 dòng', () => {
        const { rowCount } = renderSheet();
        expect(rowCount()).toBe(1);
    });

    it('nhãn cột chỉ render MỘT LẦN, không lặp theo dòng', () => {
        const { card, addSize } = renderSheet();
        addSize();
        // getByText sẽ ném nếu có nhiều phần tử trùng chữ — đây chính là chốt chặn.
        expect(within(card()).getByText('Khổ rộng (cm)')).toBeTruthy();
        expect(within(card()).getByText('Khổ cao (cm)')).toBeTruthy();
    });

    it('thêm khổ → sheetSizes là MẢNG dài 2, không phải object', async () => {
        const { save, addSize } = renderSheet();
        addSize();
        const paper = (await save()).PAPER_STOCK_DATA[PS];

        // Chốt chặn lỗi {"0": {...}} do updateNestedField gây ra.
        expect(Array.isArray(paper.sheetSizes)).toBe(true);
        expect(paper.sheetSizes).toHaveLength(2);
    });

    it('khổ mới copy dòng cuối, không đẻ ra dòng 0×0', async () => {
        const { save, addSize } = renderSheet();
        addSize();
        const rows = (await save()).PAPER_STOCK_DATA[PS].sheetSizes;
        expect(rows[1]).toEqual(rows[0]);
        expect(rows[1].w).toBeGreaterThan(0);
    });

    it('sửa ô của dòng 2 KHÔNG đụng dòng 1', async () => {
        const { save, addSize, cell } = renderSheet();
        addSize();
        fireEvent.change(cell(1, 1), { target: { value: '64' } });
        fireEvent.change(cell(1, 2), { target: { value: '7000' } });
        const rows = (await save()).PAPER_STOCK_DATA[PS].sheetSizes;

        expect(rows[0]).toEqual({
            w: 33,
            h: 48,
            price: DEFAULT_CONFIG.PAPER_STOCK_DATA[PS].sheetPrice,
        });
        expect(rows[1]).toEqual({ w: 33, h: 64, price: 7000 });
    });

    it('cặp field cũ được SOI GƯƠNG theo dòng 1', async () => {
        const { save, addSize, cell } = renderSheet();
        addSize();
        fireEvent.change(cell(0, 2), { target: { value: '6100' } });
        const paper = (await save()).PAPER_STOCK_DATA[PS];

        expect(paper.sheetPrice).toBe(6100);
        expect(paper.sheetSize).toEqual({ w: paper.sheetSizes[0].w, h: paper.sheetSizes[0].h });
    });

    it('1 khổ thì không có nút xoá; 2 khổ thì có và xoá được', async () => {
        const { save, addSize, delButtons, rowCount } = renderSheet();
        expect(delButtons()).toHaveLength(0);

        addSize();
        expect(delButtons()).toHaveLength(2);
        fireEvent.click(delButtons()[1]);
        expect(rowCount()).toBe(1);

        expect((await save()).PAPER_STOCK_DATA[PS].sheetSizes).toHaveLength(1);
    });

    it('gõ dở (xoá trắng ô rộng) → dòng KHÔNG biến mất', () => {
        const { cell, rowCount } = renderSheet();
        fireEvent.change(cell(0, 0), { target: { value: '' } });
        expect(rowCount()).toBe(1);
        fireEvent.change(cell(0, 0), { target: { value: '3' } });
        expect(rowCount()).toBe(1);
    });

    it('lưu xong vẫn qua được schema', async () => {
        const { save, addSize, cell } = renderSheet();
        addSize();
        fireEvent.change(cell(1, 1), { target: { value: '64' } });
        expect(validateSmallPrintConfig(await save()).isValid).toBe(true);
    });
});
