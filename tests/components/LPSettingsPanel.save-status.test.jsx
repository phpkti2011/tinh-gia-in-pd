// @vitest-environment jsdom
//
// Cài đặt In Khổ Lớn phải nói THẬT về việc lưu.
//
// Bối cảnh: Supabase là đường DUY NHẤT đưa cài đặt sang máy người khác. Bản cũ
// báo alert('Đã lưu cài đặt!') ngay sau khi ghi localStorage của máy admin, rồi
// bỏ mặc promise cloud — lưu hỏng trong im lặng thì cả xưởng vẫn dùng bảng giá cũ
// mà admin tưởng đã xong. Test này chốt lại 3 trạng thái phân biệt được:
//   cloud → đã lên đám mây, mọi máy nhận được
//   local → mới nằm trên máy này, PHẢI ở lại tab để admin lưu lại
//   error → không lưu được
//
// Mock configStorage (saveLargePrintConfig = cổng validate schema) + mock
// PriceConfigHistoryPanel để không kéo supabase-js vào (Node 20 thiếu WebSocket).

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

beforeEach(() => {
    mockSaveLargePrintConfig.mockClear();
    mockSaveLargePrintConfig.mockImplementation(() => true);
});
afterEach(() => cleanup());

// onSave trả về đúng shape của saveConfigToCloud: {local, cloud, error, newVersion}.
function renderPanel(saveResult) {
    const onSave = vi.fn(async () => saveResult);
    const onSaved = vi.fn();
    render(
        <LPSettingsPanel
            config={LARGE_PRINT_DEFAULT_CONFIG}
            onSave={onSave}
            onSaved={onSaved}
            onCancel={() => {}}
        />
    );
    // Nút Lưu có ở cả header và footer → lấy cái đầu.
    const clickSave = () => fireEvent.click(screen.getAllByText('Lưu')[0]);
    return { onSave, onSaved, clickSave };
}

describe('Lưu lên được đám mây', () => {
    it('hiện "mọi máy sẽ nhận cài đặt mới" và rời tab Cài Đặt', async () => {
        const { onSave, onSaved, clickSave } = renderPanel({ local: true, cloud: true });
        clickSave();

        await waitFor(() => expect(onSaved).toHaveBeenCalledTimes(1));
        expect(onSave).toHaveBeenCalledTimes(1);
        expect(screen.getAllByText(/mọi máy sẽ nhận cài đặt mới/).length).toBeGreaterThan(0);
    });
});

describe('Chỉ lưu được máy này — đây là ca bản cũ nói dối', () => {
    const res = { local: true, cloud: false, error: null };

    it('cảnh báo rõ là các máy khác CHƯA nhận', async () => {
        const { clickSave } = renderPanel(res);
        clickSave();
        await waitFor(() =>
            expect(screen.getAllByText(/các máy khác CHƯA nhận/).length).toBeGreaterThan(0)
        );
    });

    it('KHÔNG rời tab Cài Đặt (để admin thấy cảnh báo và lưu lại)', async () => {
        const { onSaved, clickSave } = renderPanel(res);
        clickSave();
        await waitFor(() =>
            expect(screen.getAllByText(/các máy khác CHƯA nhận/).length).toBeGreaterThan(0)
        );
        expect(onSaved).not.toHaveBeenCalled();
    });
});

describe('Lưu lỗi', () => {
    it('cloud trả error → hiện lỗi, ở lại tab', async () => {
        const { onSaved, clickSave } = renderPanel({
            local: true,
            cloud: false,
            error: 'forbidden',
        });
        clickSave();

        await waitFor(() =>
            expect(screen.getAllByText(/Không lưu được: forbidden/).length).toBeGreaterThan(0)
        );
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('local:false (validate fail trong saveConfigToCloud) → hiện lỗi', async () => {
        const { onSaved, clickSave } = renderPanel({ local: false, cloud: false, error: null });
        clickSave();

        await waitFor(() =>
            expect(screen.getAllByText(/Không lưu được/).length).toBeGreaterThan(0)
        );
        expect(onSaved).not.toHaveBeenCalled();
    });

    it('onSave throw → bắt được, hiện lỗi, không vỡ UI', async () => {
        const onSave = vi.fn(async () => {
            throw new Error('mất mạng');
        });
        const onSaved = vi.fn();
        render(
            <LPSettingsPanel
                config={LARGE_PRINT_DEFAULT_CONFIG}
                onSave={onSave}
                onSaved={onSaved}
                onCancel={() => {}}
            />
        );
        fireEvent.click(screen.getAllByText('Lưu')[0]);

        await waitFor(() =>
            expect(screen.getAllByText(/Không lưu được: mất mạng/).length).toBeGreaterThan(0)
        );
        expect(onSaved).not.toHaveBeenCalled();
    });
});

describe('Cổng validate schema chạy TRƯỚC khi đụng tới cloud', () => {
    it('saveLargePrintConfig trả false → KHÔNG gọi onSave', async () => {
        mockSaveLargePrintConfig.mockImplementation(() => false);
        const { onSave, onSaved, clickSave } = renderPanel({ local: true, cloud: true });
        clickSave();

        await waitFor(() =>
            expect(screen.getAllByText(/Cấu hình không hợp lệ/).length).toBeGreaterThan(0)
        );
        expect(onSave).not.toHaveBeenCalled();
        expect(onSaved).not.toHaveBeenCalled();
    });
});

describe('Tick thành phẩm đi được tới đường lên cloud', () => {
    it('bỏ tick "Cán màng" ở Bạt Hiflex → onSave nhận disallowedFinishing đúng', async () => {
        const { onSave, clickSave } = renderPanel({ local: true, cloud: true });

        // Card vật liệu hiflex: tìm ô tên rồi lấy checkbox "Cán màng" trong cùng card.
        const nameInput = screen.getByDisplayValue('Bạt Hiflex');
        const card = nameInput.closest('.rounded-lg');
        const lamLabel = Array.from(card.querySelectorAll('label')).find(
            (l) => l.textContent.trim() === 'Cán màng'
        );
        const box = lamLabel.querySelector('input[type="checkbox"]');

        expect(box.checked).toBe(true); // mặc định làm được tất cả
        fireEvent.click(box);

        clickSave();
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));

        const saved = onSave.mock.calls[0][0];
        expect(saved.MATERIAL_TYPES.hiflex.disallowedFinishing).toEqual(['lamination']);
        // Vật liệu khác không bị đụng tới.
        expect(saved.MATERIAL_TYPES.pp_co_keo.disallowedFinishing).toEqual([]);
    });

    it('tick lại → quay về mở hết', async () => {
        const { onSave, clickSave } = renderPanel({ local: true, cloud: true });

        const card = screen.getByDisplayValue('Bạt Hiflex').closest('.rounded-lg');
        const box = Array.from(card.querySelectorAll('label'))
            .find((l) => l.textContent.trim() === 'Cán màng')
            .querySelector('input[type="checkbox"]');

        fireEvent.click(box); // bỏ tick
        fireEvent.click(box); // tick lại

        clickSave();
        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(onSave.mock.calls[0][0].MATERIAL_TYPES.hiflex.disallowedFinishing).toEqual([]);
    });
});
