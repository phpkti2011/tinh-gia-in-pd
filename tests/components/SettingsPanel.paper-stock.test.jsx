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
