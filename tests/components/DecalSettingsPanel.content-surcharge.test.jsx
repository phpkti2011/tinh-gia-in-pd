// @vitest-environment jsdom
//
// Cài Đặt Decal — bảng "Phu Thu Nhieu Noi Dung" (bê từ In KTS khổ nhỏ sang).
//
// Chốt 3 điều admin thực sự cần:
//   1. Thêm/xoá được bậc mà không phải sửa code.
//   2. Bậc cuối không giới hạn trên hiện chữ "tro len", không phải ô nhập —
//      nếu là ô nhập thì Infinity biến thành số và bậc cuối mất tác dụng.
//   3. % lưu dạng SỐ NGUYÊN (nhập 15 → lưu 15), khác small-print lưu 0.15.
//      Lưu nhầm phân số thì 15% thành 0,15% — sai 100 lần mà không ai thấy.
//
// Mock configStorage (saveDecalConfig = cổng validate schema) + mock
// PriceConfigHistoryPanel để không kéo supabase-js vào (Node 20 thiếu WebSocket).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within, act } from '@testing-library/react';

const mockSaveDecalConfig = vi.fn(() => true);

vi.mock('../../src/utils/configStorage', () => ({
    saveDecalConfig: (...args) => mockSaveDecalConfig(...args),
}));

vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({
    default: () => null,
}));

import DecalSettingsPanel from '../../src/components/decal/DecalSettingsPanel.jsx';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/index.js';

function renderPanel() {
    const onSave = vi.fn(async () => ({ local: true, cloud: true }));
    render(
        <DecalSettingsPanel
            config={DECAL_DEFAULT_CONFIG}
            onSave={onSave}
            onSaved={() => {}}
            onCancel={() => {}}
        />
    );
    const save = async () => {
        fireEvent.click(screen.getAllByText('Luu Cai Dat')[0]);
        await act(async () => {});
        return mockSaveDecalConfig.mock.calls.at(-1)[0];
    };
    return { onSave, save };
}

// Giới hạn query trong đúng section để không đụng bảng "Phu Phi Be Demi" kế bên.
function contentSection() {
    return screen.getByText('Phu Thu Nhieu Noi Dung').closest('section');
}

beforeEach(() => {
    mockSaveDecalConfig.mockClear();
    mockSaveDecalConfig.mockReturnValue(true);
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
});

describe('Cài Đặt Decal — Phu Thu Nhieu Noi Dung', () => {
    it('render đủ 4 bậc mặc định + ô "mỗi nội dung chỉ in 1 cái"', () => {
        renderPanel();
        const sec = contentSection();
        // 1 dòng header + 4 dòng bậc
        expect(within(sec).getAllByRole('row').length).toBe(5);
        expect(within(sec).getByText(/Moi noi dung chi in 1 cai/)).toBeTruthy();
    });

    it('bậc cuối (max vô hạn) hiện "tro len", không phải ô nhập', () => {
        renderPanel();
        const sec = contentSection();
        expect(within(sec).getByText('tro len')).toBeTruthy();
        // Dòng bậc cuối chỉ còn 2 ô số (Tu, Phu thu) vì cột Den là chữ.
        const lastRow = within(sec).getAllByRole('row').at(-1);
        expect(within(lastRow).getAllByRole('spinbutton').length).toBe(2);
    });

    it('"+ Them bac" thêm được dòng mới', async () => {
        const { save } = renderPanel();
        fireEvent.click(within(contentSection()).getByText('+ Them bac'));
        expect(within(contentSection()).getAllByRole('row').length).toBe(6);

        const saved = await save();
        expect(saved.contentSurcharge.tiers.length).toBe(5);
        expect(saved.contentSurcharge.tiers.at(-1)).toEqual({ min: 0, max: 0, percent: 0 });
    });

    it('"Xoa" bỏ được một bậc', async () => {
        const { save } = renderPanel();
        fireEvent.click(within(contentSection()).getAllByText('Xoa')[0]);

        const saved = await save();
        expect(saved.contentSurcharge.tiers.length).toBe(3);
        // Bậc 4-9 đã bị xoá → bậc đầu giờ là 10-14.
        expect(saved.contentSurcharge.tiers[0].min).toBe(10);
    });

    it('sửa % của một bậc — nhập 15 lưu thành 15, KHÔNG phải 0.15', async () => {
        const { save } = renderPanel();
        const sec = contentSection();
        const row = within(sec).getAllByRole('row')[1]; // bậc 4-9
        const inputs = within(row).getAllByRole('spinbutton');
        fireEvent.change(inputs.at(-1), { target: { value: '15' } });

        const saved = await save();
        expect(saved.contentSurcharge.tiers[0].percent).toBe(15);
    });

    it('sửa mức "mỗi nội dung chỉ in 1 cái" lưu đúng số nguyên', async () => {
        const { save } = renderPanel();
        const sec = contentSection();
        // Ô này nằm ngoài <table>, là spinbutton đầu tiên của section.
        const single = within(sec).getAllByRole('spinbutton')[0];
        fireEvent.change(single, { target: { value: '25' } });

        const saved = await save();
        expect(saved.contentSurcharge.singleContentPercent).toBe(25);
    });

    it('bậc cuối giữ nguyên Infinity sau khi lưu (không rơi thành null)', async () => {
        const { save } = renderPanel();
        const saved = await save();
        expect(saved.contentSurcharge.tiers.at(-1).max).toBe(Infinity);
    });
});
