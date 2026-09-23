// @vitest-environment jsdom
//
// Bảng CÔNG BỒI ở tab Cài Đặt (In KTS khổ nhỏ) — thêm/xoá bậc được.
//
// Trước v1.5.0 bảng này cứng 4 bậc, chỉ sửa được ô giá: `max_qty` và kiểu tính không có
// ô nhập nào, muốn thêm bậc phải sửa code. Module cũng chưa có test Cài Đặt nào cho bồi.
//
// Ràng buộc chốt ở đây:
//   - cost_tiers và customer_tiers LUÔN cùng độ dài (JSX tra customer_tiers[idx] theo
//     index của cost_tiers — lệch là vỡ màn hình).
//   - Bậc mới chèn TRƯỚC dòng ∞; xoá xong dòng cuối vẫn phải là ∞, nếu không có số
//     lượng sẽ không khớp bậc nào.
//   - Hai bảng (2 lớp / 3 lớp) sửa độc lập.

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

const TWO = 'mounting-yes';
const THREE = 'mounting-3_lop';

function renderPanel(config = DEFAULT_CONFIG) {
    render(<SettingsPanel config={config} onSave={vi.fn()} onCancel={() => {}} />);
    const save = async () => {
        fireEvent.click(screen.getAllByText('Lưu Cài Đặt')[0]);
        await act(async () => {});
        return mockSaveConfig.mock.calls.at(-1)[0];
    };
    const table = (id) => screen.getByTestId(id);
    const rows = (id) => within(table(id)).getAllByRole('row').slice(1); // bỏ dòng tiêu đề
    const addTier = (id) => fireEvent.click(within(table(id)).getByText('+ Thêm mức giá'));
    const delButtons = (id) => within(table(id)).queryAllByText('Xóa');
    return { save, table, rows, addTier, delButtons };
}

beforeEach(() => {
    mockSaveConfig.mockClear();
    mockSaveConfig.mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
});
afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Hiện đủ hai bảng', () => {
    it('có bảng bồi 2 lớp và bồi 3 lớp, mỗi bảng 4 bậc', () => {
        const { rows } = renderPanel();
        expect(rows(TWO)).toHaveLength(4);
        expect(rows(THREE)).toHaveLength(4);
    });

    it('nhãn cột ghi "tờ in" — KHÔNG phải "SP"', () => {
        const { table } = renderPanel();
        // Bồi tính theo số tờ in; nhãn cũ ghi "SP" là sai đơn vị.
        expect(within(table(TWO)).getByText(/Mức SL \(tờ in\)/)).toBeTruthy();
    });
});

describe('Thêm bậc', () => {
    it('thêm vào CẢ HAI mảng và chèn TRƯỚC dòng ∞', async () => {
        const { save, addTier } = renderPanel();
        addTier(TWO);
        const cfg = await save();
        const m = cfg.MOUNTING_CONFIG.yes;

        expect(m.cost_tiers).toHaveLength(5);
        expect(m.customer_tiers).toHaveLength(5);
        // Dòng ∞ vẫn ở cuối, bậc mới nằm ngay trước nó.
        expect(m.cost_tiers[4].max_qty).toBe(Infinity);
        expect(m.cost_tiers[3].max_qty).toBe(501); // 500 (hữu hạn lớn nhất) + 1
        expect(m.customer_tiers[3].max_qty).toBe(501);
    });

    it('bậc mới vẫn qua được schema', async () => {
        const { save, addTier } = renderPanel();
        addTier(THREE);
        expect(validateSmallPrintConfig(await save()).isValid).toBe(true);
    });

    it('thêm bậc ở bảng 3 lớp KHÔNG động tới bảng 2 lớp', async () => {
        const { save, addTier } = renderPanel();
        addTier(THREE);
        const cfg = await save();
        expect(cfg.MOUNTING_CONFIG['3_lop'].cost_tiers).toHaveLength(5);
        expect(cfg.MOUNTING_CONFIG.yes.cost_tiers).toHaveLength(4);
    });
});

describe('Xoá bậc', () => {
    it('xoá khỏi cả hai mảng, dòng cuối vẫn là ∞', async () => {
        const { save, delButtons } = renderPanel();
        fireEvent.click(delButtons(TWO)[0]);
        const m = (await save()).MOUNTING_CONFIG.yes;

        expect(m.cost_tiers).toHaveLength(3);
        expect(m.customer_tiers).toHaveLength(3);
        expect(m.cost_tiers[2].max_qty).toBe(Infinity);
    });

    it('xoá đúng dòng ∞ → dòng cuối còn lại tự thành ∞', async () => {
        const { save, delButtons } = renderPanel();
        const btns = delButtons(TWO);
        fireEvent.click(btns[btns.length - 1]);
        const m = (await save()).MOUNTING_CONFIG.yes;

        expect(m.cost_tiers).toHaveLength(3);
        expect(m.cost_tiers[2].max_qty).toBe(Infinity);
        expect(m.customer_tiers[2].max_qty).toBe(Infinity);
    });

    it('còn 1 bậc thì hết nút Xóa (không xoá sạch bảng được)', () => {
        const { delButtons } = renderPanel();
        for (let i = 0; i < 3; i++) fireEvent.click(delButtons(TWO)[0]);
        expect(delButtons(TWO)).toHaveLength(0);
    });
});

describe('Sửa ô', () => {
    it('ngưỡng ghi vào CẢ HAI mảng (ngưỡng phải khớp nhau)', async () => {
        const { save, rows } = renderPanel();
        const maxInput = within(rows(TWO)[0]).getAllByRole('spinbutton')[0];
        fireEvent.change(maxInput, { target: { value: '80' } });
        const m = (await save()).MOUNTING_CONFIG.yes;

        expect(m.cost_tiers[0].max_qty).toBe(80);
        expect(m.customer_tiers[0].max_qty).toBe(80);
    });

    it('kiểu tính ghi vào CẢ HAI mảng', async () => {
        const { save, rows } = renderPanel();
        fireEvent.change(within(rows(TWO)[0]).getByRole('combobox'), {
            target: { value: 'per_piece' },
        });
        const m = (await save()).MOUNTING_CONFIG.yes;

        expect(m.cost_tiers[0].type).toBe('per_piece');
        expect(m.customer_tiers[0].type).toBe('per_piece');
    });

    it('giá vốn chỉ ghi vào cost_tiers, giá KH chỉ ghi vào customer_tiers', async () => {
        const { save, rows } = renderPanel();
        const nums = within(rows(TWO)[0]).getAllByRole('spinbutton');
        // [0] = ngưỡng, [1] = giá vốn, [2] = giá KH
        fireEvent.change(nums[1], { target: { value: '60000' } });
        fireEvent.change(nums[2], { target: { value: '130000' } });
        const m = (await save()).MOUNTING_CONFIG.yes;

        expect(m.cost_tiers[0].price).toBe(60000);
        expect(m.customer_tiers[0].price).toBe(130000);
    });

    it('tick "Không giới hạn" → ngưỡng thành ∞ ở cả hai mảng', async () => {
        const { save, rows } = renderPanel();
        fireEvent.click(within(rows(TWO)[0]).getByRole('checkbox'));
        const m = (await save()).MOUNTING_CONFIG.yes;

        expect(m.cost_tiers[0].max_qty).toBe(Infinity);
        expect(m.customer_tiers[0].max_qty).toBe(Infinity);
    });

    it('sửa giá bảng 3 lớp KHÔNG động tới bảng 2 lớp', async () => {
        const { save, rows } = renderPanel();
        const nums = within(rows(THREE)[0]).getAllByRole('spinbutton');
        fireEvent.change(nums[1], { target: { value: '99000' } });
        const cfg = await save();

        expect(cfg.MOUNTING_CONFIG['3_lop'].cost_tiers[0].price).toBe(99000);
        expect(cfg.MOUNTING_CONFIG.yes.cost_tiers[0].price).toBe(50000);
    });
});

describe('Config cũ chỉ có bồi 2 lớp', () => {
    it('vẫn hiện đủ 2 bảng nhờ withMountingDefaults ở đường nạp config', () => {
        // Panel nhận thẳng prop config nên ở đây mô phỏng config ĐÃ đi qua đường nạp.
        // Chốt chặn thật cho merge nông nằm ở small-print.config.storage test.
        const legacy = structuredClone(DEFAULT_CONFIG);
        delete legacy.MOUNTING_CONFIG['3_lop'];
        render(<SettingsPanel config={legacy} onSave={vi.fn()} onCancel={() => {}} />);

        expect(screen.getByTestId(TWO)).toBeTruthy();
        expect(screen.queryByTestId(THREE)).toBeNull();
    });
});
