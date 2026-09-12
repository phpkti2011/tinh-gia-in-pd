// Tests cho phần quy đổi trang A4 + các bảng vừa mở cho admin sửa trong Cài Đặt.
//
// Cover:
//   1. Hai nguồn hệ số A4 tách biệt: customerA4Tiers (theo máy, chỉ decal cuộn)
//      vs A4_CONVERSION_RATES (chung, cho giấy thường + decal xi bạc).
//   2. Chốt bug tờ 35cm: C2060 phải ra 1.5 trang, KHÔNG phải 2.4.
//   3. Số click KHÔNG đổi theo bản sửa trên (máy vẫn tốn 2 click ở 35cm).
//   4. Schema validation cho các bảng admin sửa được: khoá A4_CONVERSION_RATES
//      đúng định dạng, customerA4Tiers/vkPoints đúng kiểu, khổ tờ hợp lệ,
//      PAPER_REFERENCE_CONFIG + PRINT_CONTENT_CONFIG đúng kiểu.

import { describe, it, expect } from 'vitest';
import {
    DEFAULT_CONFIG,
    validateSmallPrintConfig,
} from '../../src/modules/small-print/config/index.js';
import {
    getClicks,
    getCustomerA4Factor,
    computeA4Factor,
    calculateDecalOptions,
    calculateCustomerQuote,
} from '../../src/modules/small-print/engine/index.js';

const C2060 = DEFAULT_CONFIG.PRINTER_CONFIG.C2060;
const C6085 = DEFAULT_CONFIG.PRINTER_CONFIG.C6085;

// Deep clone giữ Infinity (JSON round-trip làm mất) — chỉ cần cho các nhánh test
// không đụng tới field Infinity, nên structuredClone là đủ và an toàn.
const clone = (o) => structuredClone(o);

describe('Quy đổi trang A4 — hai nguồn tách biệt', () => {
    describe('BUG FIX: tờ 35cm trên C2060', () => {
        it('C2060 cho 1.5 trang ở 35cm (trước đây rơi vào bậc 48 → 2.4)', () => {
            expect(getCustomerA4Factor(35, C2060)).toBe(1.5);
        });

        it('C6085 cũng cho 1.5 trang ở 35cm', () => {
            expect(getCustomerA4Factor(35, C6085)).toBe(1.5);
        });

        it('hai máy cho CÙNG hệ số ở 35cm — không còn chênh 60% giá khách', () => {
            expect(getCustomerA4Factor(35, C2060)).toBe(getCustomerA4Factor(35, C6085));
        });

        it('khớp luôn bảng quy đổi chung và số lưu ở khổ decal trong kho', () => {
            expect(computeA4Factor(35, DEFAULT_CONFIG)).toBe(1.5);
            const sheet35 = DEFAULT_CONFIG.DECAL_SHEET_SIZES.find((s) => s.h === 35.0);
            expect(sheet35.a4Factor).toBe(1.5);
        });

        it('GIÁ VỐN không đổi — C2060 vẫn tốn 2 click ở 35cm', () => {
            expect(getClicks(35, C2060)).toBe(2);
            expect(getClicks(33, C2060)).toBe(1);
            // C6085 vẫn 1 click ở 35cm (ngưỡng click của máy này là 35)
            expect(getClicks(35, C6085)).toBe(1);
        });
    });

    describe('các mốc khác giữ nguyên (không regression)', () => {
        it.each([
            [33, 1.5, 1.5],
            [48, 2.4, 2.4],
            [76, 3, 3],
        ])('chiều cao %scm → C2060 %s, C6085 %s', (h, f2060, f6085) => {
            expect(getCustomerA4Factor(h, C2060)).toBe(f2060);
            expect(getCustomerA4Factor(h, C6085)).toBe(f6085);
        });

        it('C6085 không phục vụ tờ cao hơn 76cm', () => {
            expect(getCustomerA4Factor(92, C6085)).toBeNull();
            expect(getCustomerA4Factor(92, C2060)).toBe(4);
        });
    });

    describe('bảng quy đổi chung — dùng cho giấy thường & decal xi bạc', () => {
        it.each([
            [21.2, 1],
            [28.3, 1.35],
            [33.0, 1.5],
            [42.8, 2],
            [48.0, 2.4],
            [65.0, 3.0],
            [109.0, 5.2],
        ])('mốc %scm → %s trang', (h, factor) => {
            expect(computeA4Factor(h, DEFAULT_CONFIG)).toBe(factor);
        });

        it('ngoài bảng và trên 48cm → 3 / 4 / 5 theo mốc 76 và 91', () => {
            expect(computeA4Factor(54.5, DEFAULT_CONFIG)).toBe(3);
            expect(computeA4Factor(79, DEFAULT_CONFIG)).toBe(4);
            expect(computeA4Factor(100, DEFAULT_CONFIG)).toBe(5);
        });

        it('ngoài bảng và từ 21.2 đến 48cm → chiều cao chia 21', () => {
            expect(computeA4Factor(32.2, DEFAULT_CONFIG)).toBeCloseTo(32.2 / 21, 6);
        });

        it('từ 21.2cm trở xuống và ngoài bảng → null (engine báo lỗi cấu hình)', () => {
            expect(computeA4Factor(15, DEFAULT_CONFIG)).toBeNull();
        });
    });
});

describe('Schema — các bảng admin sửa được từ Cài Đặt', () => {
    it('config mặc định hợp lệ', () => {
        expect(validateSmallPrintConfig(DEFAULT_CONFIG).isValid).toBe(true);
    });

    describe('A4_CONVERSION_RATES', () => {
        it('từ chối khoá sai định dạng (engine tra bằng h.toFixed(1) nên sẽ không khớp)', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.A4_CONVERSION_RATES['35'] = 1.5; // thiếu ".0"
            const res = validateSmallPrintConfig(cfg);
            expect(res.isValid).toBe(false);
            expect(res.errors.join(' ')).toContain('1 chữ số thập phân');
        });

        it('chấp nhận khoá đúng định dạng', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.A4_CONVERSION_RATES['35.0'] = 1.5;
            cfg.A4_CONVERSION_RATES['54.5'] = 3;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });

        it('từ chối hệ số không phải số dương', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.A4_CONVERSION_RATES['33.0'] = 0;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('từ chối bảng rỗng', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.A4_CONVERSION_RATES = {};
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });
    });

    describe('a4ConversionRates theo máy', () => {
        it('vắng vẫn hợp lệ (config cũ → fallback bảng chung)', () => {
            const cfg = clone(DEFAULT_CONFIG);
            delete cfg.PRINTER_CONFIG.C2060.a4ConversionRates;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });

        it('khoá sai định dạng bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.a4ConversionRates['35'] = 1.5;
            const res = validateSmallPrintConfig(cfg);
            expect(res.isValid).toBe(false);
            expect(res.errors.join(' ')).toContain('C2060');
        });

        it('hệ số không phải số dương bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C6085.a4ConversionRates['33.0'] = -1;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });
    });

    describe('PRINTER_CONFIG — customerA4Tiers & vkPoints', () => {
        it('vắng customerA4Tiers vẫn hợp lệ (config cũ lưu trước khi có field này)', () => {
            const cfg = clone(DEFAULT_CONFIG);
            delete cfg.PRINTER_CONFIG.C2060.customerA4Tiers;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });

        it('có nhưng sai hình dạng thì từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.customerA4Tiers = [{ maxH: 33 }];
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('hệ số 0 hoặc âm bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.customerA4Tiers = [{ maxH: 33, factor: 0 }];
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('vkPoints phải toàn số', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.vkPoints = [33, '48'];
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('vkPoints rỗng vẫn hợp lệ (máy không có điểm VK nào)', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.vkPoints = [];
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });
    });

    describe('khổ tờ', () => {
        it('từ chối khổ có cạnh không phải số dương', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.COMMON_SHEET_SIZES[0] = { w: 32.2, h: 0 };
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('giấy mỹ thuật cho phép dòng "custom"', () => {
            const cfg = clone(DEFAULT_CONFIG);
            expect(cfg.ART_PAPER_LARGE_SHEET_SIZES.some((s) => s.w === 'custom')).toBe(true);
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });

        it('khổ tờ lớn chuẩn KHÔNG cho phép "custom"', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.STANDARD_LARGE_SHEET_SIZES[0] = { name: 'X', w: 'custom', h: 'custom' };
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });
    });

    describe('PAPER_REFERENCE_CONFIG', () => {
        it('vắng vẫn hợp lệ (engine tự fallback C300 + 100%)', () => {
            const cfg = clone(DEFAULT_CONFIG);
            delete cfg.PAPER_REFERENCE_CONFIG;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });

        it('tên giấy chuẩn rỗng bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PAPER_REFERENCE_CONFIG.referencePaperName = '';
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('tỉ lệ âm bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PAPER_REFERENCE_CONFIG.adjustmentRatio = -0.5;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });
    });

    describe('PRINT_CONTENT_CONFIG', () => {
        it('thiếu mức phụ thu cho nội dung đơn lẻ bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            delete cfg.PRINT_CONTENT_CONFIG.single_content_surcharge;
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('bậc thiếu trường số bị từ chối', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINT_CONTENT_CONFIG.tiers = [{ min: 4, max: 9 }];
            expect(validateSmallPrintConfig(cfg).isValid).toBe(false);
        });

        it('bậc cuối dùng Infinity ở max vẫn hợp lệ', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINT_CONTENT_CONFIG.tiers = [{ min: 4, max: Infinity, surcharge: 0.1 }];
            expect(validateSmallPrintConfig(cfg).isValid).toBe(true);
        });
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Đầu-cuối: chứng minh admin đổi bảng trong Cài Đặt là giá đổi theo, và tờ 35cm
// không còn chênh giá giữa 2 máy.
// ─────────────────────────────────────────────────────────────────────────────
const QUOTE_PARAMS = {
    productQuantity: 100,
    printSides: 1,
    printColorMode: '4color',
    laminationType: 'none',
    printContents: 1,
    variableData: 'no',
    paperType: 3, // C300 = giấy chuẩn → paperAdjustment = 0, tách nhiễu
    artPaperPrice: 0,
};
const NO_FINISHING = { holePunching: 0, creasing: 0, mounting: 0 };
const NO_DIECUT = { moldCost: 0, laborCustomerPrice: 0 };

function quoteFor(bestOption, cfg, params = QUOTE_PARAMS) {
    return calculateCustomerQuote(bestOption, params, NO_FINISHING, NO_DIECUT, null, cfg);
}

describe('Đầu-cuối: bảng Cài Đặt đổi → giá đổi theo', () => {
    describe('decal cuộn 32.2 × 35 — hai máy phải ra cùng giá', () => {
        const decalPaperIdx = DEFAULT_CONFIG.PAPER_STOCK_DATA.findIndex(
            (p) => p.pricingModel === 'sqm'
        );
        const decalPaper = DEFAULT_CONFIG.PAPER_STOCK_DATA[decalPaperIdx];
        const results = [];
        calculateDecalOptions(
            { ...QUOTE_PARAMS, paperType: decalPaperIdx },
            decalPaper,
            5.3, // tem 5×5 + bleed 0.15 mỗi cạnh
            5.3,
            results,
            0,
            false,
            DEFAULT_CONFIG
        );

        const at35 = (printerName) =>
            results.find((r) => r.cutSheetH === 35 && r.printer.name === printerName);

        it('engine sinh phương án 35cm cho CẢ HAI máy', () => {
            expect(at35('C2060')).toBeTruthy();
            expect(at35('C6085')).toBeTruthy();
        });

        it('cùng hệ số quy đổi 1.5 trên cả hai máy', () => {
            expect(at35('C2060').a4Factor).toBe(1.5);
            expect(at35('C6085').a4Factor).toBe(1.5);
        });

        it('cùng số trang A4 và cùng tiền in báo khách', () => {
            const q2060 = quoteFor(at35('C2060'), DEFAULT_CONFIG);
            const q6085 = quoteFor(at35('C6085'), DEFAULT_CONFIG);
            expect(q2060.totalA4PagesRaw).toBe(q6085.totalA4PagesRaw);
            expect(q2060.totalPrintCost).toBe(q6085.totalPrintCost);
        });

        it('giá vốn vẫn khác nhau — C6085 rẻ hơn vì tốn 1 click thay vì 2', () => {
            expect(at35('C2060').clicks).toBe(2);
            expect(at35('C6085').clicks).toBe(1);
            expect(at35('C6085').costPerProduct).toBeLessThan(at35('C2060').costPerProduct);
        });
    });

    describe('sửa bảng quy đổi A4 → tiền in giấy thường đổi theo, RIÊNG TỪNG MÁY', () => {
        // Tờ 32.2 × 42.8, 10 con/tờ, 100 sản phẩm → 10 tờ in.
        const optionOn = (printerKey, cfg = DEFAULT_CONFIG) => ({
            cutSheetW: 32.2,
            cutSheetH: 42.8,
            cutSheetSize: '32.20 x 42.80',
            productsPerSheet: 10,
            numCuttableSheets: 4,
            printer: cfg.PRINTER_CONFIG[printerKey],
        });

        it('mặc định hai máy giống nhau — bật tính năng KHÔNG đổi giá', () => {
            const q2060 = quoteFor(optionOn('C2060'), DEFAULT_CONFIG);
            const q6085 = quoteFor(optionOn('C6085'), DEFAULT_CONFIG);
            expect(q2060.conversionFactor).toBe(2);
            expect(q6085.conversionFactor).toBe(2);
            expect(q2060.totalA4PagesRaw).toBe(20);
            expect(q2060.totalPrintCost).toBe(100000);
            expect(q6085.totalPrintCost).toBe(100000);
        });

        it('admin đổi mốc 42.8 của RIÊNG C2060 → chỉ C2060 đổi giá', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINTER_CONFIG.C2060.a4ConversionRates['42.8'] = 2.2;

            const q2060 = quoteFor(optionOn('C2060', cfg), cfg);
            expect(q2060.conversionFactor).toBe(2.2);
            expect(q2060.totalA4PagesRaw).toBe(22);
            expect(q2060.totalPrintCost).toBe(110000);

            const q6085 = quoteFor(optionOn('C6085', cfg), cfg);
            expect(q6085.conversionFactor).toBe(2);
            expect(q6085.totalPrintCost).toBe(100000);
        });

        it('máy chưa có bảng riêng → fallback bảng chung (config cũ vẫn chạy)', () => {
            const cfg = clone(DEFAULT_CONFIG);
            delete cfg.PRINTER_CONFIG.C2060.a4ConversionRates;
            cfg.A4_CONVERSION_RATES['42.8'] = 2.5;
            const q = quoteFor(optionOn('C2060', cfg), cfg);
            expect(q.conversionFactor).toBe(2.5);
        });

        it('không truyền máy → dùng bảng chung', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.A4_CONVERSION_RATES['42.8'] = 2.5;
            expect(computeA4Factor(42.8, cfg)).toBe(2.5);
            // bảng riêng của máy vẫn thắng khi có truyền máy
            expect(computeA4Factor(42.8, cfg, cfg.PRINTER_CONFIG.C2060)).toBe(2);
        });
    });

    describe('sửa phụ thu nhiều nội dung → tổng giá khách đổi theo', () => {
        const bestOption = {
            cutSheetW: 32.2,
            cutSheetH: 42.8,
            cutSheetSize: '32.20 x 42.80',
            productsPerSheet: 10,
            numCuttableSheets: 4,
        };
        const params5Contents = { ...QUOTE_PARAMS, printContents: 5 };

        // Ở cấu hình này mọi khoản khác đều bằng 0 nên nền tính phụ thu chính là
        // tiền in 100.000đ (quote không trả riêng baseCustomerCost).
        it('5 nội dung rơi vào bậc 4–9 → phụ thu 10%', () => {
            const q = quoteFor(bestOption, DEFAULT_CONFIG, params5Contents);
            expect(q.totalPrintCost).toBe(100000);
            expect(q.customerSurcharge).toBeCloseTo(10000, 6);
            expect(q.totalCustomerCost).toBeCloseTo(110000, 6);
        });

        it('admin đổi bậc 4–9 lên 25% → phụ thu theo số mới', () => {
            const cfg = clone(DEFAULT_CONFIG);
            cfg.PRINT_CONTENT_CONFIG.tiers[0].surcharge = 0.25;
            const q = quoteFor(bestOption, cfg, params5Contents);
            expect(q.customerSurcharge).toBeCloseTo(25000, 6);
            expect(q.totalCustomerCost).toBeCloseTo(125000, 6);
        });
    });
});
