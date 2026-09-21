// @vitest-environment jsdom
//
// Panel kết quả UV DTF phải nói THẬT về bảng giá nào đã tạo ra con số đang hiện.
//
// Bối cảnh: chọn "có bế" khi admin chưa cài bảng giá bế riêng thì engine rơi về bảng
// không bế — giá y hệt. Nếu màn hình cứ ghi "Có bế" mà không nói thêm gì, người báo giá
// tưởng đã tính tiền bế rồi và báo thiếu cho khách.
//
// Panel đọc dieCut/usingDieCutTable từ RESULT (thứ engine thật sự đã tính), không từ
// params/config — App.jsx debounce 150ms nên 3 thứ đó lệch nhau trong khoảng đó.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import UvdtfResultPanel from '../../src/components/uvdtf/UvdtfResultPanel.jsx';
import { UVDTF_DEFAULT_CONFIG } from '../../src/modules/uvdtf/config/defaultConfig.js';

afterEach(() => cleanup());

const params = { widthMM: 50, heightMM: 90, quantity: 1000 };

const baseResult = {
    totalLengthCM: 1080,
    totalMeters: 10.8,
    pricePerMeter: 280000,
    billableMeters: 10.8,
    totalPrice: 3024000,
    rotated: true,
    finalItemW: 9.4,
    finalItemH: 5.4,
    itemsAcross: 5,
    itemsPerMeter: 90,
    rowsPerMeter: 18,
    originalW: 50,
    originalH: 90,
    dieCut: false,
    usingDieCutTable: false,
};

function renderResult(over = {}) {
    return render(
        <UvdtfResultPanel
            result={{ ...baseResult, ...over }}
            params={params}
            config={UVDTF_DEFAULT_CONFIG}
            isCalculating={false}
            onChange={() => {}}
        />
    );
}

describe('Không bế', () => {
    it('ghi "Không bế" và nói rõ đang dùng bảng không bế', () => {
        renderResult();
        expect(screen.getAllByText('Không bế').length).toBeGreaterThan(0);
        expect(screen.getByText(/bảng không bế/)).toBeTruthy();
    });

    it('không hiện cảnh báo nào', () => {
        renderResult();
        expect(screen.queryByText(/Chưa có bảng giá riêng/)).toBeNull();
    });
});

describe('Có bế, đã cài bảng giá riêng', () => {
    it('ghi "Có bế" và nói rõ đang dùng bảng có bế', () => {
        renderResult({ dieCut: true, usingDieCutTable: true });
        expect(screen.getAllByText('Có bế').length).toBeGreaterThan(0);
        expect(screen.getByText(/bảng có bế/)).toBeTruthy();
    });

    it('không cảnh báo, vì giá đã đúng là giá bế', () => {
        renderResult({ dieCut: true, usingDieCutTable: true });
        expect(screen.queryByText(/Chưa có bảng giá riêng/)).toBeNull();
    });
});

describe('Có bế nhưng CHƯA cài bảng giá riêng', () => {
    it('cảnh báo rằng con số đang hiện chính là giá không bế', () => {
        renderResult({ dieCut: true, usingDieCutTable: false });
        expect(screen.getByText(/Chưa có bảng giá riêng cho hàng có bế/)).toBeTruthy();
    });

    it('vẫn ghi "Có bế" nhưng hậu tố đơn giá chỉ đúng bảng không bế', () => {
        renderResult({ dieCut: true, usingDieCutTable: false });
        expect(screen.getAllByText('Có bế').length).toBeGreaterThan(0);
        expect(screen.getByText(/bảng không bế/)).toBeTruthy();
    });
});

describe('Result cũ thiếu 2 field mới', () => {
    it('không vỡ, coi như không bế', () => {
        const old = { ...baseResult };
        delete old.dieCut;
        delete old.usingDieCutTable;
        render(
            <UvdtfResultPanel
                result={old}
                params={params}
                config={UVDTF_DEFAULT_CONFIG}
                isCalculating={false}
                onChange={() => {}}
            />
        );
        expect(screen.getAllByText('Không bế').length).toBeGreaterThan(0);
        expect(screen.queryByText(/Chưa có bảng giá riêng/)).toBeNull();
    });
});
