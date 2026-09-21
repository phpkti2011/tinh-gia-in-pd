// @vitest-environment jsdom
//
// Ghi chú "vượt khổ in được tại xưởng" ngay dưới ô nhập W/H ở In Khổ Lớn.
//
// Vì sao cần test UI riêng: engine chặn báo giá là đủ ĐÚNG, nhưng người nhập đứng ở
// quầy với khách — phải biết NGAY lúc gõ kích thước, không đợi nhìn sang khung giá.
// Test này khoá 2 thứ:
//   - Ghi chú dùng chung hàm luật với engine (printLimits.js) nên không lệch câu chữ.
//   - Phân biệt "vượt khổ máy" (in gia công ngoài) với "vượt khổ cuộn" (đổi vật liệu).

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import LPInputPanel from '../../src/components/largeprint/LPInputPanel.jsx';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

afterEach(() => cleanup());

const config = LARGE_PRINT_DEFAULT_CONFIG;

const baseParams = {
    materialTypeKey: 'hiflex',
    laminationTypeKey: 'none',
    formexTypeKey: 'none',
    edgeTaping: false,
    grommetsCheck: false,
    grommetsCount: 0,
    dieCutting: false,
    standeeKey: 'none',
};

function renderPanel(items, overrides = {}, cfg = config) {
    return render(
        <LPInputPanel
            config={cfg}
            params={{ ...baseParams, ...overrides, items }}
            onChange={() => {}}
        />
    );
}

describe('Bạt vượt khổ máy', () => {
    it('170×170 → hiện ghi chú in gia công ngoài, nêu đúng 160 cm', () => {
        renderPanel([{ width: 170, height: 170, quantity: 1 }]);
        expect(screen.getByText(/khổ in tối đa của máy \(160 cm\)/)).toBeTruthy();
        expect(screen.getByText(/in gia công ở ngoài/)).toBeTruthy();
    });

    it('160×160 (đúng mốc) → không ghi chú', () => {
        renderPanel([{ width: 160, height: 160, quantity: 1 }]);
        expect(screen.queryByText(/in gia công ở ngoài/)).toBeNull();
    });

    it('170×100 (xoay được) → không ghi chú', () => {
        renderPanel([{ width: 170, height: 100, quantity: 1 }]);
        expect(screen.queryByText(/in gia công ở ngoài/)).toBeNull();
    });
});

describe('Vượt khổ cuộn vật liệu — câu khác, lời khuyên khác', () => {
    it('PP 155×155 → nói khổ cuộn 152 cm và gợi ý đổi vật liệu', () => {
        renderPanel([{ width: 155, height: 155, quantity: 1 }], { materialTypeKey: 'pp_co_keo' });
        expect(screen.getByText(/khổ cuộn lớn nhất của PP Có Keo \(152 cm\)/)).toBeTruthy();
        expect(screen.getByText(/đổi vật liệu/)).toBeTruthy();
    });

    it('cùng kích thước trên bạt → không ghi chú', () => {
        renderPanel([{ width: 155, height: 155, quantity: 1 }]);
        expect(screen.queryByText(/🚫/)).toBeNull();
    });
});

describe('Nhiều tấm — ghi chú đúng tấm vi phạm', () => {
    it('chỉ tấm thứ 2 quá khổ → đúng 1 ghi chú', () => {
        const { container } = renderPanel([
            { width: 100, height: 100, quantity: 1 },
            { width: 170, height: 170, quantity: 1 },
        ]);
        const notes = container.querySelectorAll('p.text-red-400');
        expect(notes.length).toBe(1);
    });
});

describe('Config thiếu field khổ máy (lưu trước v1.3.0)', () => {
    it('bạt 170×170 → không ghi chú, chỉ còn ràng buộc khổ cuộn', () => {
        const cfg = structuredClone(config);
        delete cfg.MACHINE_MAX_PRINT_WIDTH_M;
        renderPanel([{ width: 170, height: 170, quantity: 1 }], {}, cfg);
        expect(screen.queryByText(/🚫/)).toBeNull();
    });
});
