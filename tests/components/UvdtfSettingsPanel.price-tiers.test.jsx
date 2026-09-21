// @vitest-environment jsdom
//
// Ô "Đơn giá (đ/m)" ở Cài Đặt UV DTF phải ghi vào ĐÚNG field engine đọc.
//
// Lỗi thật đã xảy ra: panel đọc/ghi `pricePerMeter` (tên OUTPUT của engine) trong khi
// engine + schema dùng `price`. Hai hậu quả, cái sau còn tệ hơn cái trước:
//   - Thêm bậc mới → bậc thiếu `price` → schema chặn → "Không lưu được" (admin thấy).
//   - Sửa giá bậc cũ → vẫn lưu được, nhưng giá chui vào field KHÔNG AI ĐỌC, engine
//     tính theo `price` cũ → đổi giá xong báo giá không nhúc nhích (admin KHÔNG thấy).
// Module này trước đó không có test UI nào, nên lỗi sống sót.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';

const mockSaveUvdtfConfig = vi.fn(() => true);

vi.mock('../../src/utils/configStorage', () => ({
    saveUvdtfConfig: (...args) => mockSaveUvdtfConfig(...args),
}));

vi.mock('../../src/components/admin/PriceConfigHistoryPanel', () => ({
    default: () => null,
}));

import UvdtfSettingsPanel from '../../src/components/uvdtf/UvdtfSettingsPanel.jsx';
import { UVDTF_DEFAULT_CONFIG } from '../../src/modules/uvdtf/config/defaultConfig.js';
import { validateUvDtfConfig } from '../../src/modules/uvdtf/config/schema.js';

beforeEach(() => {
    mockSaveUvdtfConfig.mockClear();
    mockSaveUvdtfConfig.mockImplementation(() => true);
});
afterEach(() => cleanup());

function renderPanel(config = UVDTF_DEFAULT_CONFIG) {
    const onSave = vi.fn(async () => ({ local: true, cloud: true }));
    const { container } = render(
        <UvdtfSettingsPanel
            config={config}
            onSave={onSave}
            onSaved={() => {}}
            onCancel={() => {}}
        />
    );
    const clickSave = () => fireEvent.click(screen.getAllByText('Luu')[0]);
    // Panel có HAI bảng bậc giống hệt nhau (không bế / có bế) ⇒ mọi query PHẢI scope
    // vào đúng một bảng; quét cả container thì index i%2 chạy xuyên 2 bảng và sửa nhầm.
    const sec = (key = 'priceTiers') => screen.getByTestId(`tier-table-${key}`);
    const nums = (key) => within(sec(key)).getAllByRole('spinbutton');
    // Ô đơn giá = input number thứ 2 của mỗi dòng bậc.
    const priceInputs = (key = 'priceTiers') => nums(key).filter((_, i) => i % 2 === 1);
    const maxInputs = (key = 'priceTiers') => nums(key).filter((_, i) => i % 2 === 0);
    const addTier = (key = 'priceTiers') =>
        fireEvent.click(within(sec(key)).getByText('+ Them bac'));
    return { onSave, clickSave, priceInputs, maxInputs, addTier, sec, container };
}

const savedConfig = (onSave) => onSave.mock.calls[0][0];

describe('Sửa giá bậc có sẵn', () => {
    it('ghi vào price — đúng field engine đọc', async () => {
        const { onSave, clickSave, priceInputs } = renderPanel();
        fireEvent.change(priceInputs()[0], { target: { value: '845000' } });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedConfig(onSave).priceTiers[0].price).toBe(845000);
    });

    it('không để lại field rác pricePerMeter', async () => {
        const { onSave, clickSave, priceInputs } = renderPanel();
        fireEvent.change(priceInputs()[0], { target: { value: '845000' } });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        for (const t of savedConfig(onSave).priceTiers) {
            expect('pricePerMeter' in t).toBe(false);
        }
    });
});

describe('Thêm bậc mới — trước đây là chỗ báo "Không lưu được"', () => {
    it('bậc mới có price nên qua được schema', async () => {
        const { onSave, clickSave, addTier } = renderPanel();
        addTier();
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const cfg = savedConfig(onSave);
        expect(cfg.priceTiers).toHaveLength(UVDTF_DEFAULT_CONFIG.priceTiers.length + 1);
        expect(validateUvDtfConfig(cfg).isValid).toBe(true);
    });
});

describe('Bậc xếp sai thứ tự', () => {
    it('bậc 0.5 thêm cuối bảng được đưa lên đầu khi lưu', async () => {
        const { onSave, clickSave, priceInputs, maxInputs, addTier } = renderPanel();
        addTier();

        // Dòng mới là dòng cuối: đặt "đến 0.5m" + đơn giá 1.190.000.
        const maxes = maxInputs();
        fireEvent.change(maxes[maxes.length - 1], { target: { value: '0.5' } });
        fireEvent.change(priceInputs()[priceInputs().length - 1], {
            target: { value: '1190000' },
        });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const tiers = savedConfig(onSave).priceTiers;
        expect(tiers[0]).toEqual({ maxMeters: 0.5, price: 1190000 });
        expect(tiers[tiers.length - 1].maxMeters).toBe(Infinity);
    });
});

describe('Nạp config cũ đã dính field sai tên', () => {
    const legacy = {
        ...UVDTF_DEFAULT_CONFIG,
        priceTiers: [
            { maxMeters: 2, price: 440000, pricePerMeter: 845000 },
            { maxMeters: Infinity, price: 280000, pricePerMeter: 685000 },
        ],
    };

    it('hiện số admin gõ gần nhất (845000), không phải số cũ engine đang tính', () => {
        const { priceInputs } = renderPanel(legacy);
        expect(priceInputs()[0].value).toBe('845000');
    });

    it('lưu lại là dọn sạch: price = số đang hiện, không còn pricePerMeter', async () => {
        const { onSave, clickSave } = renderPanel(legacy);
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(savedConfig(onSave).priceTiers).toEqual([
            { maxMeters: 2, price: 845000 },
            { maxMeters: Infinity, price: 685000 },
        ]);
    });
});
