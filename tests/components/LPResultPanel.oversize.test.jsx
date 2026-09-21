// @vitest-environment jsdom
//
// Khung kết quả In Khổ Lớn khi tấm vượt khổ in được tại xưởng.
//
// Ràng buộc chốt ở đây: KHÔNG có giá và KHÔNG có nút copy quy cách. Trước v1.3.0 engine
// trả null nên màn hình hiện "Chưa có dữ liệu tính toán" — tấm quá khổ trông y hệt lúc
// chưa nhập gì, người báo giá tưởng máy lỗi.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import LPResultPanel from '../../src/components/largeprint/LPResultPanel.jsx';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

afterEach(() => cleanup());

const params = {
    items: [{ width: 170, height: 170, quantity: 1 }],
    materialTypeKey: 'hiflex',
    laminationTypeKey: 'none',
    formexTypeKey: 'none',
    standeeKey: 'none',
};

function renderResult(result) {
    return render(
        <LPResultPanel
            result={result}
            params={params}
            config={LARGE_PRINT_DEFAULT_CONFIG}
            isCalculating={false}
            onChange={() => {}}
        />
    );
}

describe('Vượt khổ máy → chỉ thông báo, không báo giá', () => {
    const result = {
        error: 'Tấm 170×170 cm có cả 2 chiều lớn hơn khổ in tối đa của máy (160 cm) → phải IN GIA CÔNG Ở NGOÀI. Không báo giá tại đây.',
        outsource: true,
        oversizeItems: [{ width: 170, height: 170 }],
    };

    it('hiện tiêu đề "Phải in gia công ở ngoài"', () => {
        renderResult(result);
        expect(screen.getByText(/Phải in gia công ở ngoài/)).toBeTruthy();
    });

    it('hiện nguyên câu thông báo của engine', () => {
        renderResult(result);
        expect(screen.getByText(/khổ in tối đa của máy \(160 cm\)/)).toBeTruthy();
    });

    it('KHÔNG có nút copy quy cách', () => {
        renderResult(result);
        expect(screen.queryByText(/quy cách/i)).toBeNull();
    });

    it('KHÔNG có số tiền nào trên màn hình', () => {
        const { container } = renderResult(result);
        // Tiền định dạng vi-VN luôn có dấu chấm ngăn nghìn (172.800).
        // Không bắt chữ "đ" vì tiếng Việt đầy chữ có đ ("đây", "đổi", "tối đa").
        expect(container.textContent).not.toMatch(/\d{1,3}(\.\d{3})+/);
        expect(container.textContent).not.toMatch(/Tổng tiền/);
    });

    it('khác hẳn trạng thái "chưa nhập gì"', () => {
        renderResult(result);
        expect(screen.queryByText(/Chưa có dữ liệu tính toán/)).toBeNull();
    });
});

describe('Vượt khổ cuộn vật liệu → tiêu đề khác', () => {
    it('không gọi là "in gia công ngoài"', () => {
        renderResult({
            error: 'Tấm 155×155 cm có cả 2 chiều lớn hơn khổ cuộn lớn nhất của PP Có Keo (152 cm) → đổi vật liệu khác, hoặc in gia công ở ngoài. Không báo giá tại đây.',
            outsource: false,
            oversizeItems: [{ width: 155, height: 155 }],
        });
        expect(screen.getByText(/Vượt khổ cuộn vật liệu/)).toBeTruthy();
    });
});

describe('result = null vẫn giữ nguyên placeholder cũ', () => {
    it('hiện "Chưa có dữ liệu tính toán"', () => {
        renderResult(null);
        expect(screen.getByText(/Chưa có dữ liệu tính toán/)).toBeTruthy();
    });
});
