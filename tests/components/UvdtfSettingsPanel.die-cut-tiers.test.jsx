// @vitest-environment jsdom
//
// Hai bảng bậc ở Cài Đặt UV DTF: "khong be" và "co be".
//
// Ràng buộc chốt ở đây, theo đúng thứ tự quan trọng:
//   1. Bảng có bế mồi từ priceTiers CỦA XƯỞNG ĐÓ, không phải bảng mặc định. Nếu mồi sai
//      thì xưởng đang bán 845k sẽ thấy 440k và báo giá bế rẻ đi một nửa.
//   2. KHÔNG sửa gì bảng bế thì bản lưu KHÔNG có key dieCutPriceTiers — để giá bế tự bám
//      theo bảng gốc. Lưu bản sao đông cứng là cái bẫy: sau này tăng giá bảng gốc, giá bế
//      đứng yên mà không ai thấy.
//   3. Hai bảng sửa độc lập, và CẢ HAI đều được sắp bậc tăng dần khi lưu.

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

// Bảng giá RIÊNG của xưởng — cố ý khác hẳn bảng mặc định 440k/390k/330k/280k.
const shopConfig = {
    ...UVDTF_DEFAULT_CONFIG,
    priceTiers: [
        { maxMeters: 2, price: 845000 },
        { maxMeters: 5, price: 795000 },
        { maxMeters: Infinity, price: 685000 },
    ],
};

function renderPanel(config = shopConfig) {
    const onSave = vi.fn(async () => ({ local: true, cloud: true }));
    render(
        <UvdtfSettingsPanel
            config={config}
            onSave={onSave}
            onSaved={() => {}}
            onCancel={() => {}}
        />
    );
    const clickSave = () => fireEvent.click(screen.getAllByText('Luu')[0]);
    const sec = (key) => screen.getByTestId(`tier-table-${key}`);
    const nums = (key) => within(sec(key)).getAllByRole('spinbutton');
    const priceInputs = (key) => nums(key).filter((_, i) => i % 2 === 1);
    const maxInputs = (key) => nums(key).filter((_, i) => i % 2 === 0);
    const addTier = (key) => fireEvent.click(within(sec(key)).getByText('+ Them bac'));
    return { onSave, clickSave, sec, priceInputs, maxInputs, addTier };
}

const saved = (onSave) => onSave.mock.calls[0][0];
const BASE = 'priceTiers';
const DIE = 'dieCutPriceTiers';

describe('Mồi bảng có bế', () => {
    it('chưa có bảng bế → hiện ĐÚNG số của xưởng (845k), không phải mặc định 440k', () => {
        const { priceInputs } = renderPanel();
        expect(priceInputs(DIE).map((el) => el.value)).toEqual(['845000', '795000', '685000']);
    });

    it('đã có bảng bế → hiện đúng bảng đó, không bị ghi đè', () => {
        const { priceInputs } = renderPanel({
            ...shopConfig,
            dieCutPriceTiers: [{ maxMeters: Infinity, price: 1200000 }],
        });
        expect(priceInputs(DIE).map((el) => el.value)).toEqual(['1200000']);
    });

    it('config cũ dính field rác pricePerMeter → bảng bế mồi ra price sạch', () => {
        const { priceInputs } = renderPanel({
            ...UVDTF_DEFAULT_CONFIG,
            priceTiers: [{ maxMeters: 2, pricePerMeter: 845000 }],
        });
        expect(priceInputs(DIE)[0].value).toBe('845000');
    });
});

describe('Hai bảng sửa độc lập', () => {
    it('sửa giá bảng bế KHÔNG động tới bảng gốc', async () => {
        const { onSave, clickSave, priceInputs } = renderPanel();
        fireEvent.change(priceInputs(DIE)[0], { target: { value: '1190000' } });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const cfg = saved(onSave);
        expect(cfg.dieCutPriceTiers[0].price).toBe(1190000);
        expect(cfg.priceTiers[0].price).toBe(845000);
    });

    it('sửa giá bảng gốc KHÔNG động tới bảng bế', async () => {
        const { onSave, clickSave, priceInputs } = renderPanel({
            ...shopConfig,
            dieCutPriceTiers: [{ maxMeters: Infinity, price: 1200000 }],
        });
        fireEvent.change(priceInputs(BASE)[0], { target: { value: '900000' } });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const cfg = saved(onSave);
        expect(cfg.priceTiers[0].price).toBe(900000);
        expect(cfg.dieCutPriceTiers).toEqual([{ maxMeters: Infinity, price: 1200000 }]);
    });

    it('thêm bậc ở bảng bế → bảng gốc giữ nguyên số dòng', async () => {
        const { onSave, clickSave, addTier, priceInputs } = renderPanel();
        addTier(DIE);
        fireEvent.change(priceInputs(DIE)[3], { target: { value: '1190000' } });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const cfg = saved(onSave);
        expect(cfg.priceTiers).toHaveLength(3);
        expect(cfg.dieCutPriceTiers).toHaveLength(4);
    });

    it('nút "Chep tu bang khong be" ghi đè bảng bế bằng bản sao bảng gốc', () => {
        const { priceInputs, sec } = renderPanel({
            ...shopConfig,
            dieCutPriceTiers: [{ maxMeters: Infinity, price: 1200000 }],
        });
        fireEvent.click(within(sec(DIE)).getByText('Chep tu bang khong be'));
        expect(priceInputs(DIE).map((el) => el.value)).toEqual(['845000', '795000', '685000']);
    });
});

describe('Lưu', () => {
    it('KHÔNG sửa gì bảng bế → bản lưu KHÔNG có key dieCutPriceTiers', async () => {
        const { onSave, clickSave } = renderPanel();
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect('dieCutPriceTiers' in saved(onSave)).toBe(false);
    });

    it('xoá hết bậc bảng bế → cũng không lưu key, và không bị chặn lưu', async () => {
        const { onSave, clickSave, sec } = renderPanel();
        const delButtons = () => within(sec(DIE)).queryAllByText('Xoa');
        while (delButtons().length > 0) fireEvent.click(delButtons()[0]);
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const cfg = saved(onSave);
        expect('dieCutPriceTiers' in cfg).toBe(false);
        expect(validateUvDtfConfig(cfg).isValid).toBe(true);
    });

    it('sửa bảng bế → lưu key mới và qua được schema', async () => {
        const { onSave, clickSave, priceInputs } = renderPanel();
        fireEvent.change(priceInputs(DIE)[0], { target: { value: '1190000' } });
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        expect(validateUvDtfConfig(saved(onSave)).isValid).toBe(true);
    });

    it('CẢ HAI bảng đều được sắp bậc tăng dần khi lưu', async () => {
        const { onSave, clickSave, addTier, priceInputs, maxInputs } = renderPanel();

        // Mỗi bảng thêm một bậc 0.5m ở CUỐI — vị trí mà engine sẽ bỏ qua nếu không sắp.
        // Giá 2 bảng phải KHÁC nhau, nếu không luật auto-drop xoá luôn bảng bế và test
        // này lại đi đo một thứ khác.
        const newPrice = { [BASE]: 1500000, [DIE]: 1900000 };
        for (const key of [BASE, DIE]) {
            addTier(key);
            const maxes = maxInputs(key);
            fireEvent.change(maxes[maxes.length - 1], { target: { value: '0.5' } });
            const prices = priceInputs(key);
            fireEvent.change(prices[prices.length - 1], {
                target: { value: String(newPrice[key]) },
            });
        }
        clickSave();

        await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
        const cfg = saved(onSave);
        expect(cfg.priceTiers[0]).toEqual({ maxMeters: 0.5, price: 1500000 });
        expect(cfg.dieCutPriceTiers[0]).toEqual({ maxMeters: 0.5, price: 1900000 });
        for (const tiers of [cfg.priceTiers, cfg.dieCutPriceTiers]) {
            expect(tiers[tiers.length - 1].maxMeters).toBe(Infinity);
        }
    });
});
