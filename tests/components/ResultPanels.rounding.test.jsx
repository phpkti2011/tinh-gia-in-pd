// @vitest-environment jsdom
//
// "Làm tròn giá ở hàng nghìn, không để giá 568.500" — áp cho MỌI module.
//
// Đây là bài test chống sót module: mỗi panel được render với một tổng CỐ Ý lẻ
// tới hàng trăm, rồi khẳng định con số lẻ đó KHÔNG còn xuất hiện trên màn hình.
// Thiếu một module là test đỏ, không phải phát hiện lúc đã gửi giá cho khách.
//
// Đơn giá thì ngược lại — phải giữ số lẻ (vài trăm đồng/con mà tròn nghìn là
// sai hẳn), nên có test riêng khẳng định đơn giá KHÔNG bị tròn.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import FlyerResultPanel from '../../src/components/flyer/FlyerResultPanel.jsx';
import CheapDecalResultPanel from '../../src/components/cheapdecal/CheapDecalResultPanel.jsx';
import StickerResultPanel from '../../src/components/sticker/StickerResultPanel.jsx';
import CardResultPanel from '../../src/components/card/CardResultPanel.jsx';
import UvdtfResultPanel from '../../src/components/uvdtf/UvdtfResultPanel.jsx';
import LPResultPanel from '../../src/components/largeprint/LPResultPanel.jsx';
import CatalogueResultPanel from '../../src/components/catalogue/CatalogueResultPanel.jsx';
import SpiralResultPanel from '../../src/components/spiral/SpiralResultPanel.jsx';
import SmallPrintResultPanel from '../../src/components/smallprint/ResultPanel.jsx';
import { calculatePaperOptions } from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG as SP_CONFIG } from '../../src/config/defaultConfig.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

// LPResultPanel dùng IntersectionObserver cho thanh giá dính (sticky bar);
// jsdom không có sẵn nên stub một cái không làm gì.
if (typeof globalThis.IntersectionObserver === 'undefined') {
    globalThis.IntersectionObserver = class {
        observe() {}
        unobserve() {}
        disconnect() {}
    };
}

afterEach(() => cleanup());

const body = () => document.body.textContent.replace(/\s+/g, ' ');
const txt = (el) => el.textContent.replace(/\s+/g, ' ').trim();

// ODD = 568.500 (đúng con số người dùng nêu) → phải hiện 569.000.
const ODD = 568500;
const ROUNDED = '569.000';

// Catalogue và Sổ lò xo dùng gần hệt nhau một khối kết quả (in từng tờ, tách
// bìa/ruột). `spiral` thêm mấy field riêng của lò xo.
const section = (name) => ({
    paperName: name,
    signatures: 1,
    sheets: 10,
    a4: 20,
    sidesText: 'In 2 mặt',
});
const bookProps = (spiral = false) => ({
    result: {
        error: null,
        pieceW_mm: 210,
        pieceH_mm: 297,
        pieceW_cm: 21,
        pieceH_cm: 29.7,
        pressSheetSize: '33×48 cm',
        productsPerSheet: 2,
        cover: section('Couche 250gsm'),
        inner: section('Couche 150gsm'),
        coverSingleSide: false,
        signaturesPerBook: 4,
        totalLeaves: 20,
        totalPrintSheets: 100,
        totalA4Pages: 400,
        coverA4: 40,
        innerA4: 360,
        unitPriceText: '1.200 đ/A4',
        printPrice: 480000,
        printPricePerPage: 1200,
        lamLabel: 'Không cán',
        lamCost: 0,
        paperAdjustment: 0,
        paperAdjustmentReason: '',
        paperSurcharge: 0,
        artPaperCost: 0,
        stapleCustomer: 20000,
        stapleUnitText: '200 đ/cuốn',
        ...(spiral
            ? {
                  coilCustomer: 30000,
                  coilUnitText: '300 đ/cuốn',
                  thicknessAdd: 0,
                  linerName: '',
                  linerCustomer: 0,
                  linerUnitText: '',
                  extraPaperCustomer: 0,
              }
            : {}),
        giaVon: 400000,
        totalCustomerCost: ODD,
        unitPerBook: 5685,
    },
    params: { quantity: 100, finishedW: 21, finishedH: 29.7 },
    config: {},
    isCalculating: false,
});

const cases = [
    {
        name: 'Tờ rơi',
        render: () =>
            render(
                <FlyerResultPanel
                    result={{
                        error: null,
                        sizeName: 'Kích thước A5',
                        quantity: 1000,
                        paperName: 'Couche 150gsm',
                        sidesName: 'In 2 mặt',
                        lamination: 'none',
                        creasingType: 'none',
                        total: ODD,
                        unitPrice: 568.5,
                        sourceQty: 1000,
                        baseRule: '',
                    }}
                    config={{}}
                    isCalculating={false}
                />
            ),
    },
    {
        name: 'Decal nhãn giá rẻ',
        render: () =>
            render(
                <CheapDecalResultPanel
                    result={{
                        error: null,
                        sizeLabel: '3×3 cm',
                        quantity: 1000,
                        decalTypeName: 'Decal giấy',
                        shapeName: 'Tròn',
                        total: ODD,
                        sheets: 12,
                        leadTimeNote: '',
                    }}
                    config={{}}
                    isCalculating={false}
                />
            ),
    },
    {
        name: 'Tờ sticker',
        render: () =>
            render(
                <StickerResultPanel
                    result={{
                        error: null,
                        sizeName: 'Tờ sticker A5',
                        qty: 100,
                        billableQty: 100,
                        tier: 100,
                        tierMode: 'exact',
                        low: null,
                        high: null,
                        threshold: null,
                        unit: 5685,
                        base: ODD,
                        stickerPct: 0,
                        finishName: 'Không',
                        finishPct: 0,
                        finishFixedPerSheet: 0,
                        finishFixedFee: 0,
                        contentPct: 0,
                        fileType: 'Có sẵn',
                        cutPathFee: 0,
                        totalPct: 0,
                        percentSurcharge: 0,
                        total: ODD,
                        unitPerSheet: 5685,
                        size: 'a5',
                    }}
                    config={{ STICKER_CONFIG: { minBillableQty: 10, sizes: {} } }}
                    isCalculating={false}
                />
            ),
    },
    {
        name: 'Thẻ nhựa',
        // Panel này để ĐƠN GIÁ ở ô chữ to, tổng nằm ở dòng "Tổng tiền:" bên dưới.
        totalSelector: '.text-yellow-200',
        render: () =>
            render(
                <CardResultPanel
                    result={{
                        error: null,
                        status: 'Có giá',
                        productName: 'Thẻ nhựa trắng',
                        tierLabel: '1.000 thẻ',
                        segmentName: 'Khách trực tiếp',
                        qty: 1000,
                        unit: 568.5,
                        total: ODD,
                    }}
                    config={{ CARD_CONFIG: {} }}
                    isCalculating={false}
                />
            ),
    },
    {
        name: 'UV DTF',
        render: () =>
            render(
                <UvdtfResultPanel
                    result={{
                        totalLengthCM: 500,
                        totalMeters: 5,
                        pricePerMeter: 113700,
                        billableMeters: 5,
                        totalPrice: ODD,
                        rotated: false,
                        finalItemW: 5,
                        finalItemH: 5,
                        itemsAcross: 10,
                        quantity: 100,
                    }}
                    params={{ itemW: 5, itemH: 5, quantity: 100 }}
                    config={{}}
                    isCalculating={false}
                />
            ),
    },
    {
        name: 'Catalogue bấm kim',
        render: () => render(<CatalogueResultPanel {...bookProps()} />),
    },
    {
        name: 'Sổ lò xo',
        render: () => render(<SpiralResultPanel {...bookProps(true)} />),
    },
    {
        name: 'In khổ lớn',
        render: () =>
            render(
                <LPResultPanel
                    result={{
                        totalCost: ODD,
                        rollWidth: 1.6,
                        totalPanels: 1,
                        itemDetails: [
                            {
                                originalW: 100,
                                originalH: 50,
                                printWidth: 1,
                                printHeight: 0.5,
                                quantity: 1,
                                rotated: false,
                                unitCost: ODD,
                                totalCost: ODD,
                            },
                        ],
                        formexCost: 0,
                        standeeCost: 0,
                        finishingCost: 0,
                        printedArea: 0.5,
                        unprintedArea: 0,
                        laminationChoice: 'none',
                    }}
                    params={{
                        materialTypeKey: Object.keys(LARGE_PRINT_DEFAULT_CONFIG.MATERIAL_TYPES)[0],
                    }}
                    config={LARGE_PRINT_DEFAULT_CONFIG}
                    isCalculating={false}
                />
            ),
    },
];

describe('Tổng tiền báo khách tròn nghìn ở mọi module', () => {
    for (const c of cases) {
        it(`${c.name} — 568.500 hiện thành 569.000`, () => {
            const { container } = c.render();
            // Ô GIÁ LỚN của mỗi panel (text-4xl / text-3xl) — chính là con số
            // nhân viên đọc cho khách. Bảng bóc tách bên dưới cố ý giữ số thật
            // nên không kiểm tra bằng textContent của cả trang.
            const headline = container.querySelector(c.totalSelector || '.text-4xl, .text-3xl');
            expect(headline).not.toBeNull();
            const t = txt(headline);
            expect(t).toContain(ROUNDED);
            expect(t).not.toContain('568.500');
        });
    }
});

describe('Đơn giá KHÔNG bị làm tròn', () => {
    // Hai ca dưới là ĐƠN GIÁ GỐC lấy thẳng từ bảng giá (đ/thẻ theo mốc SL, đ/m UV
    // DTF) — tổng mới là số suy ra. Cố ý KHÔNG chia lại từ tổng đã tròn, nếu không
    // là bịa ra một đơn giá tiệm không hề niêm yết. Lệch ≤ 500đ giữa "đơn giá × SL"
    // và tổng đã tròn là chấp nhận được, xem src/utils/money.js.
    it('Thẻ nhựa — đơn giá 568,5đ/thẻ vẫn hiện 569 đ, không thành 1.000 đ', () => {
        cases.find((c) => c.name === 'Thẻ nhựa').render();
        // fmt() làm tròn tới ĐỒNG (569 đ), tuyệt đối không kéo lên hàng nghìn.
        expect(body()).toContain('569 đ / thẻ');
    });

    it('UV DTF — đơn giá/mét giữ nguyên 113.700 đ', () => {
        cases.find((c) => c.name === 'UV DTF').render();
        expect(body()).toContain('113.700 đ');
    });
});

// Người dùng nêu: Catalogue hiện tổng 480.000đ nhưng đơn giá 160.133đ/cuốn cho 3
// cuốn — lấy con số đang nhìn chia cho số lượng ra 160.000, không khớp. Đơn giá
// kiểu "tổng chia đều" phải chia từ TỔNG ĐÃ TRÒN.
// Fixture chung: tổng 568.500 → hiện 569.000; SL 100 → đơn giá phải là 5.690 đ
// (569.000 ÷ 100), KHÔNG còn 5.685 đ (= 568.500 ÷ 100) như trước.
describe('Đơn giá "chia đều" = TỔNG ĐANG HIỆN ÷ số lượng', () => {
    // Nhãn đầy đủ để không đụng nhầm dòng "Đơn giá áp dụng" (đơn giá GỐC theo mốc
    // SL) trong bảng bóc tách của Tem tờ — dòng đó cố ý giữ số thật.
    const derived = [
        { name: 'Catalogue bấm kim', now: 'Đơn giá: 5.690 đ / cuốn', old: 'Đơn giá: 5.685 đ' },
        { name: 'Sổ lò xo', now: 'Đơn giá: 5.690 đ / cuốn', old: 'Đơn giá: 5.685 đ' },
        { name: 'Tờ sticker', now: 'Đơn giá thực tế: 5.690 đ / tờ', old: 'Đơn giá thực tế: 5.685' },
        { name: 'Decal nhãn giá rẻ', now: 'Đơn giá: 569 đ / nhãn', old: 'Đơn giá: 568 đ' },
    ];

    for (const d of derived) {
        it(`${d.name} — "${d.now}" khớp với tổng 569.000`, () => {
            cases.find((c) => c.name === d.name).render();
            expect(body()).toContain(d.now);
            expect(body()).not.toContain(d.old);
        });
    }

    it('Tem tờ — "Đơn giá áp dụng" theo mốc SL vẫn là số GỐC 5.685 đ', () => {
        cases.find((c) => c.name === 'Tờ sticker').render();
        expect(body()).toContain('Đơn giá áp dụng5.685 đ / tờ');
    });

    it('đơn giá vẫn giữ tới hàng ĐỒNG, không bị kéo lên hàng nghìn', () => {
        cases.find((c) => c.name === 'Decal nhãn giá rẻ').render();
        expect(body()).toContain('569 đ / nhãn');
        expect(body()).not.toContain('1.000 đ / nhãn');
    });
});

// In KTS khổ nhỏ tự tính lại báo giá bên trong panel (calculateCustomerQuote)
// nên không nhét tổng giả vào được — chạy đúng pipeline thật với một combo cho
// ra tổng lẻ: 644.500 (bế demi: khuôn 300.000 + công 68.500).
describe('In KTS khổ nhỏ — chạy engine thật', () => {
    const spParams = {
        paperType: '3',
        productQuantity: 500,
        printSides: 2,
        printColorMode: '4color',
        laminationType: 'none',
        printContents: 1,
        variableData: 'no',
        largeSheetSelector: '0',
        customSheetW: 70,
        customSheetH: 100,
        artPaperPrice: 0,
        productW: 9,
        productH: 5.5,
        bleed: 0.15,
        dieCuttingType: 'digital',
    };

    function renderSmallPrint() {
        const all = [];
        calculatePaperOptions(
            spParams,
            SP_CONFIG.PAPER_STOCK_DATA[3],
            9.3,
            5.8,
            all,
            0,
            false,
            SP_CONFIG
        );
        all.sort((a, b) => a.costPerProduct - b.costPerProduct);
        const best = all.find((r) => r.cutSheetH <= 48) || all[0];
        const finishingCustomerPrices = { holePunching: 0, creasing: 0, mounting: 0 };
        const dieCuttingCustomerPrice = { moldCost: 300000, laborCustomerPrice: 68500 };
        const quote = calculateCustomerQuote(
            best,
            spParams,
            finishingCustomerPrices,
            dieCuttingCustomerPrice,
            null,
            SP_CONFIG
        );
        const view = render(
            <SmallPrintResultPanel
                results={[best]}
                quote={quote}
                params={spParams}
                config={SP_CONFIG}
                isCalculating={false}
                errorMsg={null}
                finishingCustomerPrices={finishingCustomerPrices}
                dieCuttingCustomerPrice={dieCuttingCustomerPrice}
                holePunchingCost={0}
                creasingCost={0}
                mountingCost={0}
                customFinishingCost={0}
                customFinishingLabel=""
                moldCost={0}
                laborCost={0}
                variableDataCost={0}
                foilResult={null}
                onChange={() => {}}
            />
        );
        return { ...view, quote };
    }

    it('tổng 644.500 hiện thành 645.000 VNĐ', () => {
        const { quote } = renderSmallPrint();
        // Chốt chặn: nếu tổng vô tình thành bội của 1.000 thì bài test này
        // không còn chứng minh được gì — bắt lỗi ngay tại đây.
        expect(quote.totalCustomerCost % 1000).not.toBe(0);
        const total = screen.getByText('Tổng Cộng Báo Khách').nextElementSibling;
        expect(txt(total)).toBe('645.000 VNĐ');
    });
});

describe('Bảng bóc tách vẫn giữ SỐ THẬT để admin đối chiếu', () => {
    it('In khổ lớn — dòng chi tiết còn 568.500 dù tổng đã tròn', () => {
        const { container } = cases.find((c) => c.name === 'In khổ lớn').render();
        // Chênh tối đa 500đ giữa tổng đã tròn và bảng chi tiết là CỐ Ý,
        // không phải lỗi — ghi lại ở đây để người sau khỏi "sửa".
        expect(txt(container.querySelector('.text-3xl'))).toContain('569.000');
        expect(body()).toContain('568.500');
    });
});
