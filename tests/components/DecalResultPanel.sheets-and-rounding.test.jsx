// @vitest-environment jsdom
//
// Ba yêu cầu từ ảnh Decal Bế Demi:
//   1. Sơ đồ xếp hình phải nói luôn CẦN BAO NHIÊU TỜ IN, không bắt nhân viên
//      bấm máy tính.
//   2. Bảng giá so sánh theo máy cũng phải có số tờ, để thấy vì sao máy này
//      rẻ hơn máy kia.
//   3. Giá báo khách tròn nghìn — không để "568.500 đ".
//
// Điểm dễ sai nhất: số tờ hiện ra phải KHỚP với số tờ engine dùng để tính giá
// (ceil(SL / số con mỗi tờ)), nếu không thì bảng giá tự mâu thuẫn với chính nó.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';

import DecalResultPanel from '../../src/components/decal/DecalResultPanel.jsx';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/defaultConfig.js';

afterEach(() => cleanup());

// Dự án không cài jest-dom → so bằng textContent đã gộp khoảng trắng.
// (getByText mặc định chỉ nhìn text node TRỰC TIẾP nên "Cần 67 tờ in" — số nằm
// trong <span> — không khớp được /Cần \d/; bắt element rồi đọc textContent.)
const txt = (el) => el.textContent.replace(/\s+/g, ' ').trim();

const baseParams = {
    mode: 'single',
    printSheetW: 330,
    printSheetH: 330,
    stickerW: 50,
    stickerH: 90,
    customQuantity: 0,
    decalType: 'Decal giấy',
    shape: 'rectangle',
    laminationFilm: '',
    sheetCustomQuantity: 0,
};

// layout tối thiểu đủ để LayoutVisualization vẽ được.
function layout(count, { cols = count, rows = 1 } = {}) {
    return {
        count,
        cols,
        rows,
        type: 'grid',
        orientation: 'horizontal',
        itemW: 90,
        itemH: 50,
        printableW: 314,
        printableH: 314,
    };
}

// 1 hàng giá cho mỗi máy, cùng index — đúng cách ComparisonPriceTable zip bảng.
function machine(name, count, price, { quantity = 1000, isCustom = true } = {}) {
    return {
        name,
        layout: layout(count),
        priceTable: [
            {
                quantity,
                decalType: 'Decal giấy',
                laminated: false,
                isCustom,
                price,
                finalPrice: price,
            },
        ],
    };
}

function renderPanel(machines, params = {}) {
    return render(
        <DecalResultPanel
            result={{ mode: 'single', machines, discountPercent: 0, sheetW: 330, sheetH: 330 }}
            params={{ ...baseParams, ...params }}
            config={DECAL_DEFAULT_CONFIG}
            isCalculating={false}
            onChange={() => {}}
        />
    );
}

describe('Số tờ in dưới sơ đồ xếp hình', () => {
    it('SL 1.000 con, máy xếp 15 con/tờ → "Cần 67 tờ in"', () => {
        renderPanel([machine('Graptech', 15, 568500)], { customQuantity: 1000 });
        // ceil(1000 / 15) = 67 — đúng công thức engine dùng để ra giá.
        expect(txt(screen.getByText(/Cần/))).toBe('Cần 67 tờ in cho 1.000 con');
    });

    it('mỗi máy ra số tờ của riêng nó', () => {
        renderPanel([machine('Graptech', 15, 568500), machine('Avitech', 18, 519000)], {
            customQuantity: 1000,
        });
        const lines = screen.getAllByText(/Cần/);
        expect(lines).toHaveLength(2);
        expect(txt(lines[0])).toContain('67 tờ in'); // ceil(1000/15)
        expect(txt(lines[1])).toContain('56 tờ in'); // ceil(1000/18)
    });

    it('chia hết thì KHÔNG cộng dư một tờ', () => {
        renderPanel([machine('Graptech', 20, 400000)], { customQuantity: 1000 });
        expect(txt(screen.getByText(/Cần/))).toBe('Cần 50 tờ in cho 1.000 con');
    });

    it('chưa nhập SL tùy chỉnh thì ẩn hẳn dòng số tờ', () => {
        renderPanel([machine('Graptech', 15, 568500)], { customQuantity: 0 });
        expect(screen.queryByText(/Cần/)).toBeNull();
        // nhưng dòng "xếp được bao nhiêu con/tờ" vẫn còn
        expect(screen.getByText(/Xếp được/)).toBeTruthy();
    });
});

describe('Bảng giá so sánh — giá tròn nghìn + số tờ theo từng máy', () => {
    it('568.500 hiện thành 569.000 đ, kèm 67 tờ in', () => {
        renderPanel([machine('Graptech', 15, 568500)], { customQuantity: 1000 });
        const cell = screen.getByTitle('Bấm để copy quy cách gửi khách');
        expect(txt(cell)).toContain('569.000 đ');
        expect(txt(cell)).not.toContain('568.500');
        expect(within(cell).getByText('67 tờ in')).toBeTruthy();
    });

    it('mỗi cột máy có số tờ riêng, không lẫn sang cột khác', () => {
        renderPanel([machine('Graptech', 15, 568500), machine('Avitech', 18, 519400)], {
            customQuantity: 1000,
        });
        const cells = screen.getAllByTitle('Bấm để copy quy cách gửi khách');
        expect(cells).toHaveLength(2);
        expect(txt(cells[0])).toContain('569.000 đ');
        expect(within(cells[0]).getByText('67 tờ in')).toBeTruthy();
        expect(txt(cells[1])).toContain('519.000 đ'); // 519.400 → xuống
        expect(within(cells[1]).getByText('56 tờ in')).toBeTruthy();
    });

    it('số tờ bám theo SỐ LƯỢNG của từng hàng, không phải một số chung', () => {
        const m = {
            name: 'Graptech',
            layout: layout(15),
            priceTable: [
                { quantity: 100, decalType: 'Decal giấy', laminated: false, price: 120000 },
                { quantity: 1000, decalType: 'Decal giấy', laminated: false, price: 568500 },
            ],
        };
        renderPanel([m], { customQuantity: 0 });
        const cells = screen.getAllByTitle('Bấm để copy quy cách gửi khách');
        expect(within(cells[0]).getByText('7 tờ in')).toBeTruthy(); // ceil(100/15)
        expect(within(cells[1]).getByText('67 tờ in')).toBeTruthy();
    });
});

// Chế độ Tờ Sticker dùng sơ đồ KHÁC (SheetLayoutVisualization) và ô SL khác
// (sheetCustomQuantity) — dễ sót nếu chỉ sửa sơ đồ tem lẻ.
describe('Chế độ Tờ Sticker — sơ đồ riêng, ô SL riêng', () => {
    const sheetMachine = (name, count) => ({
        name,
        layout: {
            count,
            blocks: null,
            orientation: 'vertical',
            itemW: 210,
            itemH: 297,
            printableW: 314,
            printableH: 314,
        },
        sheetsPerPrintSheet: count,
        priceTable: [
            {
                quantity: 500,
                decalType: 'Decal giấy',
                laminated: false,
                isCustom: true,
                price: 1234500,
            },
        ],
    });

    const renderSheetMode = (params = {}) =>
        render(
            <DecalResultPanel
                result={{
                    mode: 'sheet',
                    machines: [sheetMachine('Graptech', 2)],
                    discountPercent: 0,
                    sheetW: 330,
                    sheetH: 330,
                }}
                params={{ ...baseParams, mode: 'sheet', ...params }}
                config={DECAL_DEFAULT_CONFIG}
                isCalculating={false}
                onChange={() => {}}
            />
        );

    it('SL 500 tờ decal, 2 tờ/tờ in → "Cần 250 tờ in"', () => {
        renderSheetMode({ sheetCustomQuantity: 500 });
        expect(txt(screen.getByText(/Cần/))).toBe('Cần 250 tờ in cho 500 tờ decal');
    });

    it('chưa nhập SL thì ẩn dòng số tờ', () => {
        renderSheetMode({ sheetCustomQuantity: 0 });
        expect(screen.queryByText(/Cần/)).toBeNull();
    });

    it('giá trong bảng vẫn tròn nghìn', () => {
        renderSheetMode({ sheetCustomQuantity: 500 });
        const cell = screen.getByTitle('Bấm để copy quy cách gửi khách');
        expect(txt(cell)).toContain('1.235.000 đ'); // 1.234.500 → lên
        expect(txt(cell)).not.toContain('1.234.500');
    });
});

// Cụm tem sau khi bình phải nằm GIỮA tờ giấy. Engine trả blocks với toạ độ từ
// góc trên-trái vùng in; trước đây sơ đồ vẽ y nguyên gốc đó nên 5×5 tem 50 mm
// trên vùng in 314 mm bị dồn góc, trống hẳn bên phải và bên dưới.
describe('Sơ đồ xếp hình — cụm tem canh giữa tờ giấy', () => {
    // Mọi ô tem trong sơ đồ: div absolute + bo góc 2px (mock sticker nhỏ bên
    // trong tờ sticker bo 1px, khung vùng in không bo → tự loại).
    function stickerBoxes(container) {
        return [...container.querySelectorAll('div')].filter(
            (d) => d.style.position === 'absolute' && d.style.borderRadius === '2px'
        );
    }

    // Lề 4 phía của bao hình cụm tem so với khung tờ giấy.
    function margins(container) {
        const boxes = stickerBoxes(container);
        expect(boxes.length).toBeGreaterThan(0);
        const sheet = boxes[0].parentElement;
        const visW = parseFloat(sheet.style.width);
        const visH = parseFloat(sheet.style.height);
        const n = (s) => parseFloat(s);
        const left = Math.min(...boxes.map((d) => n(d.style.left)));
        const top = Math.min(...boxes.map((d) => n(d.style.top)));
        const right = Math.max(...boxes.map((d) => n(d.style.left) + n(d.style.width)));
        const bottom = Math.max(...boxes.map((d) => n(d.style.top) + n(d.style.height)));
        return { left, top, right: visW - right, bottom: visH - bottom, boxes };
    }

    const withBlocks = (blocks, extra = {}) => ({
        name: 'Graptech',
        layout: { ...layout(25), ...extra, blocks },
        priceTable: [{ quantity: 100, decalType: 'Decal giấy', laminated: false, price: 100000 }],
    });

    it('lưới 5×5 tem 50 mm — lề trái = lề phải, lề trên = lề dưới', () => {
        const { container } = renderPanel([
            withBlocks([{ x: 0, y: 0, iw: 50, ih: 50, cols: 5, rows: 5 }], {
                cols: 5,
                rows: 5,
                itemW: 50,
                itemH: 50,
            }),
        ]);
        const m = margins(container);
        expect(m.boxes).toHaveLength(25);
        expect(Math.abs(m.left - m.right)).toBeLessThan(0.5);
        expect(Math.abs(m.top - m.bottom)).toBeLessThan(0.5);
        // và có lề thật chứ không dính sát mép
        expect(m.left).toBeGreaterThan(5);
    });

    it('xếp hỗn hợp 2 khối — cả cụm vào giữa, khối phụ vẫn nằm bên phải khối chính', () => {
        // Khối chính 4×3 tem 50×90 (206×274 mm) + khối phụ xoay 90×50, 1 cột 5 hàng
        // (90×258 mm) đặt bên phải. Bao hình 298×274 mm trong vùng in 314×314.
        const { container } = renderPanel([
            withBlocks(
                [
                    { x: 0, y: 0, iw: 50, ih: 90, cols: 4, rows: 3 },
                    { x: 208, y: 0, iw: 90, ih: 50, cols: 1, rows: 5 },
                ],
                { type: 'packed', orientation: 'mixed', itemW: 50, itemH: 90 }
            ),
        ]);
        const m = margins(container);
        expect(m.boxes).toHaveLength(17);
        expect(Math.abs(m.left - m.right)).toBeLessThan(0.5);
        expect(Math.abs(m.top - m.bottom)).toBeLessThan(0.5);

        const n = (s) => parseFloat(s);
        const wide = m.boxes.filter((d) => n(d.style.width) > n(d.style.height));
        const tall = m.boxes.filter((d) => n(d.style.width) < n(d.style.height));
        expect(wide).toHaveLength(5);
        expect(tall).toHaveLength(12);
        const mainRight = Math.max(...tall.map((d) => n(d.style.left) + n(d.style.width)));
        const sideLeft = Math.min(...wide.map((d) => n(d.style.left)));
        expect(sideLeft).toBeGreaterThan(mainRight);
    });

    it('chế độ Tờ Sticker — tờ A4 trên tờ in cũng canh giữa', () => {
        const { container } = render(
            <DecalResultPanel
                result={{
                    mode: 'sheet',
                    machines: [
                        {
                            name: 'Graptech',
                            layout: {
                                count: 1,
                                blocks: [{ x: 0, y: 0, iw: 210, ih: 297, cols: 1, rows: 1 }],
                                orientation: 'vertical',
                                itemW: 210,
                                itemH: 297,
                                printableW: 314,
                                printableH: 314,
                            },
                            sheetsPerPrintSheet: 1,
                            priceTable: [
                                {
                                    quantity: 100,
                                    decalType: 'Decal giấy',
                                    laminated: false,
                                    price: 100000,
                                },
                            ],
                        },
                    ],
                    discountPercent: 0,
                    sheetW: 330,
                    sheetH: 330,
                }}
                params={{ ...baseParams, mode: 'sheet' }}
                config={DECAL_DEFAULT_CONFIG}
                isCalculating={false}
                onChange={() => {}}
            />
        );
        const m = margins(container);
        expect(m.boxes).toHaveLength(1);
        expect(Math.abs(m.left - m.right)).toBeLessThan(0.5);
        expect(Math.abs(m.top - m.bottom)).toBeLessThan(0.5);
    });
});

describe('Số tờ trong bảng giá — chữ đậm, đọc được', () => {
    it('ô "tờ in" và dòng "con/tờ" dưới tên máy đều in đậm, không còn cỡ 9px', () => {
        renderPanel([machine('Graptech', 15, 568500)], { customQuantity: 1000 });
        const sheets = screen.getByText('67 tờ in');
        expect(sheets.className).toContain('font-bold');
        expect(sheets.className).not.toContain('text-[9px]');
        const perSheet = screen.getByText(/15 con\/tờ/);
        expect(perSheet.className).toContain('font-bold');
        expect(perSheet.className).not.toContain('text-[9px]');
    });
});
