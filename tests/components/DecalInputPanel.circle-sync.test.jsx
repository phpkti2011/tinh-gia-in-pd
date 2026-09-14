// @vitest-environment jsdom
//
// Tem TRÒN thì Rộng phải bằng Cao.
//
// Trước đây 2 ô nhập hoàn toàn độc lập, còn engine âm thầm lấy Math.max(W, H)
// làm đường kính. Nhập 20×48 rồi chọn Tròn thì ô nhập ghi 20×48 nhưng sơ đồ và
// giá lại tính theo 48mm — nhân viên không biết tin cái nào.

import { useState } from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import DecalInputPanel from '../../src/components/decal/DecalInputPanel.jsx';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/defaultConfig.js';

afterEach(() => cleanup());

const baseParams = {
    mode: 'single',
    printSheetW: 330,
    printSheetH: 330,
    stickerW: 50,
    stickerH: 90,
    customQuantity: 0,
    decalType: 'Decal giấy',
    shape: 'rectangle',
    discountPercent: 0,
};

// Harness GIỮ STATE thật: params phải chảy ngược xuống panel giống App.jsx,
// nếu không component sẽ đọc lại giá trị cũ khi bấm nút đổi hình.
function setup(initial) {
    const onChange = vi.fn();
    function Harness() {
        const [params, setParams] = useState({ ...baseParams, ...initial });
        return (
            <DecalInputPanel
                config={DECAL_DEFAULT_CONFIG}
                params={params}
                onChange={(f, v) => {
                    onChange(f, v);
                    setParams((p) => ({ ...p, [f]: v }));
                }}
            />
        );
    }
    const { container } = render(<Harness />);
    // NumberField commit ở CẢ onChange lẫn onBlur → chỉ bắn 'change' là đủ,
    // tránh đếm trùng một lần nhập.
    const typeIn = (id, value) => {
        const el = container.querySelector(`#${id}`);
        fireEvent.change(el, { target: { value: String(value) } });
    };
    const clickShape = (label) => fireEvent.click(screen.getByText(label));
    // Các cặp [field, value] đã gửi lên parent, bỏ lần lặp liền kề trùng nhau.
    const sent = () =>
        onChange.mock.calls
            .map(([f, v]) => [f, v])
            .filter(([f, v], i, a) => i === 0 || a[i - 1][0] !== f || a[i - 1][1] !== v);
    return { onChange, typeIn, clickShape, sent, container };
}

describe('Hình TRÒN — hai ô luôn bằng nhau', () => {
    it('gõ ô Rộng → ô Cao bằng theo', () => {
        const { typeIn, sent } = setup({ shape: 'circle', stickerW: 48, stickerH: 48 });
        typeIn('stickerW', 60);
        expect(sent()).toEqual(
            expect.arrayContaining([
                ['stickerW', 60],
                ['stickerH', 60],
            ])
        );
    });

    it('gõ ô Cao → ô Rộng bằng theo', () => {
        const { typeIn, sent } = setup({ shape: 'circle', stickerW: 48, stickerH: 48 });
        typeIn('stickerH', 35);
        expect(sent()).toEqual(
            expect.arrayContaining([
                ['stickerH', 35],
                ['stickerW', 35],
            ])
        );
    });

    it('nhãn ô đổi thành "Đường kính"', () => {
        setup({ shape: 'circle', stickerW: 48, stickerH: 48 });
        expect(screen.getByText(/Đường kính \(W\)/)).toBeTruthy();
        expect(screen.getByText(/Đường kính \(H\)/)).toBeTruthy();
        expect(screen.queryByText(/Rộng tem/)).toBeNull();
    });
});

describe('Bấm nút Tròn khi 2 ô đang lệch', () => {
    // Đúng ca người dùng báo: nhập 20 rồi 48, bấm Tròn.
    it('lấy ô VỪA GÕ (ô Cao = 48) làm đường kính', () => {
        const { typeIn, clickShape, sent } = setup({ shape: 'rectangle' });
        typeIn('stickerW', 20);
        typeIn('stickerH', 48);
        clickShape('Tròn');
        const after = sent().slice(-3);
        expect(after).toEqual([
            ['shape', 'circle'],
            ['stickerW', 48],
            ['stickerH', 48],
        ]);
    });

    it('ô vừa gõ là ô Rộng → lấy ô Rộng', () => {
        const { typeIn, clickShape, sent } = setup({ shape: 'rectangle' });
        typeIn('stickerH', 48);
        typeIn('stickerW', 20);
        clickShape('Tròn');
        expect(sent().slice(-3)).toEqual([
            ['shape', 'circle'],
            ['stickerW', 20],
            ['stickerH', 20],
        ]);
    });

    it('chưa gõ ô nào → lấy ô Rộng', () => {
        const { clickShape, sent } = setup({ shape: 'rectangle', stickerW: 50, stickerH: 90 });
        clickShape('Tròn');
        expect(sent()).toEqual([
            ['shape', 'circle'],
            ['stickerW', 50],
            ['stickerH', 50],
        ]);
    });

    it('2 ô vốn đã bằng nhau → không ép lại gì cả', () => {
        const { clickShape, sent } = setup({ shape: 'rectangle', stickerW: 48, stickerH: 48 });
        clickShape('Tròn');
        expect(sent()).toEqual([['shape', 'circle']]);
    });
});

describe('Chữ Nhật và Oval vẫn nhập lệch được', () => {
    for (const [label, shape] of [
        ['Chữ Nhật', 'rectangle'],
        ['Oval', 'oval'],
    ]) {
        it(`${label}: gõ ô Rộng KHÔNG đụng tới ô Cao`, () => {
            const { typeIn, sent } = setup({ shape });
            typeIn('stickerW', 60);
            expect(sent()).toEqual([['stickerW', 60]]);
        });
    }

    it('bấm Oval khi 2 ô lệch → giữ nguyên, không ép bằng nhau', () => {
        const { clickShape, sent } = setup({ shape: 'rectangle', stickerW: 20, stickerH: 48 });
        clickShape('Oval');
        expect(sent()).toEqual([['shape', 'oval']]);
    });
});
