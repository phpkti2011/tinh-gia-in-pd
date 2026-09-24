// @vitest-environment jsdom
//
// Section "Bế Formex" trong tab Cài Đặt In Khổ Lớn (v1.4.0).
//
// Chốt 3 thứ dễ hỏng nhất:
//   - Sửa giá / mốc bậc phải đi ĐÚNG vào FORMEX_DIE_CUT_SHAPES[i] của config gửi
//     đi lưu, không phải vào FINISHING_PRICES.dieCutting (2 bảng trông giống hệt).
//   - Thêm hình dạng sinh key DUY NHẤT; xoá là mất thật (config tầng 1 được thay
//     nguyên khối khi merge, nên dòng admin xoá không quay lại).
//   - Giá sàn nằm ở key tầng 1 MIN_FORMEX_DIE_CUT_PRICE.
//
// Mock configStorage + PriceConfigHistoryPanel như LPSettingsPanel.save-status.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

const mockSaveLargePrintConfig = vi.fn(() => true);

vi.mock('../../src/utils/configStorage', () => ({
    saveLargePrintConfig: (...args) => mockSaveLargePrintConfig(...args),
}));

vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({
    default: () => null,
}));

import LPSettingsPanel from '../../src/components/largeprint/LPSettingsPanel.jsx';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

beforeEach(() => mockSaveLargePrintConfig.mockClear());
afterEach(() => cleanup());

function renderPanel(config = LARGE_PRINT_DEFAULT_CONFIG) {
    const onSave = vi.fn(async () => ({ local: true, cloud: true }));
    const utils = render(
        <LPSettingsPanel config={config} onSave={onSave} onSaved={() => {}} onCancel={() => {}} />
    );
    // Config thực sự được gửi đi lưu (sau khi qua cổng validate schema).
    const saved = async () => {
        fireEvent.click(screen.getAllByText('Lưu')[0]);
        await waitFor(() => expect(onSave).toHaveBeenCalled());
        return onSave.mock.calls[0][0];
    };
    return { ...utils, onSave, saved };
}

// Section có tiêu đề riêng → lấy đúng <table> của nó, không dính bảng khác.
function shapeSection(container) {
    const heading = [...container.querySelectorAll('h3')].find((h) =>
        h.textContent.includes('Bế Formex')
    );
    return heading.closest('section');
}
const shapeRows = (container) => shapeSection(container).querySelectorAll('table tbody tr');

describe('Render bảng hình dạng', () => {
    it('có 4 dòng khớp FORMEX_DIE_CUT_SHAPES mặc định', () => {
        const { container } = renderPanel();
        const rows = shapeRows(container);
        expect(rows).toHaveLength(4);
        const names = [...rows].map((r) => r.querySelector('input[type="text"]').value);
        expect(names).toEqual(['Tròn', 'Vuông / Chữ nhật', 'Bo góc', 'Hình phức tạp']);
    });

    it('mỗi dòng có 5 ô số: 2 mốc bậc + 3 giá', () => {
        const { container } = renderPanel();
        expect(shapeRows(container)[0].querySelectorAll('input[type="number"]')).toHaveLength(5);
    });

    it('nói rõ luật lũy tiến + điều kiện phải bồi Formex', () => {
        renderPanel();
        expect(screen.getByText(/bậc LŨY TIẾN/)).toBeTruthy();
        expect(screen.getByText(/Chỉ áp dụng cho tấm CÓ bồi Formex/)).toBeTruthy();
    });
});

describe('Sửa giá đi đúng vào FORMEX_DIE_CUT_SHAPES', () => {
    it('đổi giá bậc 1 của "Tròn" → shapes[0], KHÔNG đụng bế demi', async () => {
        const { container, saved } = renderPanel();
        // thứ tự cột: mốc1, giá1, mốc2, giá2, giá3
        const nums = shapeRows(container)[0].querySelectorAll('input[type="number"]');
        fireEvent.change(nums[1], { target: { value: '75000' } });

        const cfg = await saved();
        expect(cfg.FORMEX_DIE_CUT_SHAPES[0].tier1PricePerSqm).toBe(75000);
        expect(cfg.FORMEX_DIE_CUT_SHAPES[1].tier1PricePerSqm).toBe(40000); // dòng khác giữ nguyên
        expect(cfg.FINISHING_PRICES.dieCutting.tier1PricePerSqm).toBe(80000); // bế demi giữ nguyên
    });

    it('đổi mốc bậc 2 → shapes[i].tier2LimitSqm', async () => {
        const { container, saved } = renderPanel();
        const nums = shapeRows(container)[3].querySelectorAll('input[type="number"]');
        fireEvent.change(nums[2], { target: { value: '25' } });

        const cfg = await saved();
        expect(cfg.FORMEX_DIE_CUT_SHAPES[3].tier2LimitSqm).toBe(25);
    });

    it('đổi tên hình dạng (commit khi blur) — key KHÔNG đổi theo', async () => {
        const { container, saved } = renderPanel();
        const nameInput = shapeRows(container)[0].querySelector('input[type="text"]');
        fireEvent.blur(nameInput, { target: { value: 'Tròn / Oval' } });

        const cfg = await saved();
        expect(cfg.FORMEX_DIE_CUT_SHAPES[0].name).toBe('Tròn / Oval');
        expect(cfg.FORMEX_DIE_CUT_SHAPES[0].key).toBe('tron'); // báo giá cũ trỏ vào key
    });

    it('đổi giá sàn → MIN_FORMEX_DIE_CUT_PRICE (key tầng 1)', async () => {
        const { container, saved } = renderPanel();
        const minInput = [
            ...shapeSection(container).querySelectorAll('input[type="number"]'),
        ].pop();
        fireEvent.change(minInput, { target: { value: '80000' } });

        const cfg = await saved();
        expect(cfg.MIN_FORMEX_DIE_CUT_PRICE).toBe(80000);
    });
});

describe('Thêm / xoá hình dạng', () => {
    it('+ Thêm hình dạng → dòng mới, key duy nhất, giá 0', async () => {
        const { container, saved } = renderPanel();
        fireEvent.click(screen.getByText('+ Thêm hình dạng'));
        expect(shapeRows(container)).toHaveLength(5);

        const cfg = await saved();
        const shapes = cfg.FORMEX_DIE_CUT_SHAPES;
        expect(shapes).toHaveLength(5);
        expect(shapes[4].name).toBe('Hình mới');
        expect(shapes[4].key).toMatch(/^shape_\d+$/);
        expect(new Set(shapes.map((s) => s.key)).size).toBe(5);
        expect(shapes[4].tier1PricePerSqm).toBe(0);
    });

    it('Xóa → mất khỏi config gửi đi lưu (không quay lại)', async () => {
        const { container, saved } = renderPanel();
        fireEvent.click(shapeRows(container)[1].querySelector('button'));

        const cfg = await saved();
        expect(cfg.FORMEX_DIE_CUT_SHAPES.map((s) => s.key)).toEqual(['tron', 'bo_goc', 'phuc_tap']);
    });

    it('xoá sạch → cảnh báo ô Bế Formex sẽ không hiện ở màn tính giá', () => {
        const empty = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
        empty.FORMEX_DIE_CUT_SHAPES = [];
        renderPanel(empty);
        expect(screen.getByText(/Chưa có hình dạng nào/)).toBeTruthy();
    });
});

describe('Config lưu trước v1.4.0', () => {
    it('thiếu hẳn key → render được, thêm dòng vẫn chạy', async () => {
        const legacy = structuredClone(LARGE_PRINT_DEFAULT_CONFIG);
        delete legacy.FORMEX_DIE_CUT_SHAPES;
        delete legacy.MIN_FORMEX_DIE_CUT_PRICE;
        const { saved } = renderPanel(legacy);
        fireEvent.click(screen.getByText('+ Thêm hình dạng'));

        const cfg = await saved();
        expect(cfg.FORMEX_DIE_CUT_SHAPES).toHaveLength(1);
    });
});

describe('Vật liệu — thành phẩm "Bế Formex" tick/bỏ tick được', () => {
    it('registry v1.4.0 hiện thêm ô "Bế Formex" cho mỗi vật liệu', () => {
        renderPanel();
        // 6 vật liệu mặc định × 1 ô mỗi vật liệu (+ tiêu đề section)
        expect(screen.getAllByText('Bế Formex').length).toBeGreaterThanOrEqual(6);
    });
});
