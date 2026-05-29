// Golden tests END-TO-END cho module IN KTS KHỔ NHỎ (TASK-0008.5).
//
// Khóa hành vi pipeline:
//   - processSheet (mutate allResults với 1 result/call)
//   - calculatePaperOptions (mutate allResults với N results)
//   - calculateCustomerQuote (endpoint)
//
// 3 case real-world:
//   E2E-1: processSheet — exact computation cho 1 combination (card visit
//          9.3×5.8 trên 32.2×21.2/C2060/65×86, in 2 mặt)
//   E2E-2: calculatePaperOptions full — 500 card visit C300, verify count +
//          spot-check 2 combinations
//   E2E-3: Full pipeline → calculateCustomerQuote, lock customer price +
//          phát hiện BUG App.jsx finishing cost (xem comment trong test).
//
// KHÔNG sửa src/. KHÔNG sửa bảng giá. KHÔNG đụng module decal.
//
// Tất cả expected values tính tay từ formula gốc (xem comment chi tiết
// trong từng describe block).

import { describe, it, expect } from 'vitest';
import {
    processSheet,
    calculatePaperOptions,
    calculateFinishingCost,
} from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';

const config = DEFAULT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// CASE E2E-1: processSheet — exact computation cho 1 combination
//
// Input:
//   - Card visit 9×5.5cm + bleed 0.15cm → productWithBleed 9.3×5.8
//   - Cut sheet 32.2×21.2 (a common size)
//   - Large sheet 65×86 (STANDARD selector 0)
//   - C2060, in 2 mặt, 4color, no lam
//   - largeSheetPrice = pricePerReam(C300)/500 = 2.200.000/500 = 4.400đ/tờ
//
// Trace (đã verify manual):
//   - printableArea(32.2, 21.2): vkPoints C2060=[33,48,76,92,120], 21.2
//       không match → non_vk_height_margin 0.1; regular_cut_width_margin 0.8.
//       → (31.4, 21.1)
//   - imposition(31.4, 21.1, 9.3, 5.8, 0):
//       case 1: floor(31.4/9.3)=3, floor(21.1/5.8)=3 → 9
//       case 2: floor(31.4/5.8)=5, floor(21.1/9.3)=2 → 10 thắng
//       layout '2x5', actualPrintW=29, actualPrintH=18.6
//   - numCuttableSheets(65, 86, 32.2, 21.2) = 8 (geometric optimization)
//   - clicks(21.2, C2060) = 1 (tier maxH=33)
//   - paperCostPerSheet = 4.400/8 = 550
//   - printCostPerSheet = 1 × 750 × 2 = 1.500
//   - lam = 0
//   - totalCostPerSheet = 2.050; costPerProduct = 205đ
// ─────────────────────────────────────────────────────────────────────────────
describe('E2E-1: processSheet — card visit 9.3×5.8 trên 32.2×21.2/C2060/65×86', () => {
    const params = {
        productQuantity: 500,
        printSides: 2,
        printColorMode: '4color',
        laminationType: 'none',
    };
    const largeSheet = { w: 65, h: 86 };
    const printer = config.PRINTER_CONFIG.C2060;
    const allResults = [];

    processSheet(
        32.2, 21.2, largeSheet, printer, params,
        9.3, 5.8,
        allResults,
        4400,   // largeSheetPrice: C300 = 2.200.000/500
        0,      // spacing
        false,  // isDigitalCutting
        config,
        false   // isCustom
    );

    it('push đúng 1 result vào allResults', () => {
        expect(allResults.length).toBe(1);
    });

    const r = allResults[0];

    it('layout: 10 con/tờ, "2x5" (xoay 90°)', () => {
        expect(r.productsPerSheet).toBe(10);
        expect(r.layoutDesc).toBe('2x5');
        expect(r.actualPrintW).toBeCloseTo(29, 6);
        expect(r.actualPrintH).toBeCloseTo(18.6, 6);
    });

    it('numCuttableSheets = 8 (cắt 32.2×21.2 từ 65×86)', () => {
        expect(r.numCuttableSheets).toBe(8);
    });

    it('clicks = 1; clickPrice = 750đ', () => {
        expect(r.clicks).toBe(1);
    });

    it('cost/SP: paper 55, print 150, lam 0, tổng 205đ', () => {
        expect(r.paperCostPerProduct).toBeCloseTo(55, 6);
        expect(r.printCostPerProduct).toBeCloseTo(150, 6);
        expect(r.laminationCostPerProduct).toBe(0);
        expect(r.costPerProduct).toBeCloseTo(205, 6);
    });

    it('debug per-sheet: paper 550, print 1500, total 2050', () => {
        expect(r.debug.paperCostPerSheet).toBeCloseTo(550, 6);
        expect(r.debug.printCostPerSheet).toBeCloseTo(1500, 6);
        expect(r.debug.totalCostPerSheet).toBeCloseTo(2050, 6);
    });

    it('flags + meta đúng', () => {
        expect(r.isDecal).toBe(false);
        expect(r.isCustom).toBe(false);
        expect(r.laminationWarning).toBeNull();
        expect(r.printer.name).toBe('C2060');
        expect(r.largeSheetName).toBe('65x86');
        expect(r.cutSheetSize).toBe('32.20 x 21.20');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE E2E-2: calculatePaperOptions PIPELINE — 500 card visit C300 65×86
//
// Engine sẽ push nhiều results (cho mỗi printer × mỗi sheet × có thể swap).
//
// Verify:
//   - allResults.length đủ lớn (≥ 20)
//   - Spot-check 2 combinations đã trace manual:
//       (1) C2060 + 32.2×21.2 → 10 con/tờ, 205đ/sp (như E2E-1)
//       (2) C2060 + 32.2×33   → 15 con/tờ, 173.33đ/sp
//   - Validation rule: không có result nào với cutSheetW > 33
//     (vì cả 2 printers C2060/C6085 đều có maxW=33)
//
// Manual trace (2):
//   - printableArea(32.2, 33, C2060): vkPoint 33 match → vk_margin 0.8
//     → (31.4, 32.2)
//   - imposition(31.4, 32.2, 9.3, 5.8, 0):
//       case 1: 3 × 5 = 15; case 2: 5 × 3 = 15 → case 1 wins (>=)
//       layout '5x3', actualPrintW=27.9, actualPrintH=29
//   - numCuttableSheets(65, 86, 32.2, 33) = 4
//   - clicks(33, C2060) = 1
//   - paperCostPerSheet = 4400/4 = 1100
//   - printCostPerSheet = 1500
//   - totalCostPerSheet = 2600
//   - costPerProduct = 2600/15 ≈ 173.333
// ─────────────────────────────────────────────────────────────────────────────
describe('E2E-2: calculatePaperOptions — 500 card visit C300 65×86', () => {
    const params = {
        paperType: '3',  // index of C300
        productQuantity: 500,
        printSides: 2,
        printColorMode: '4color',
        laminationType: 'none',
        printContents: 1, variableData: 'no',
        largeSheetSelector: '0',  // 65×86
        customSheetW: 70, customSheetH: 100,
        artPaperPrice: 0,
    };
    const selectedPaper = config.PAPER_STOCK_DATA[3];  // C300 (pricingModel='ream')
    const allResults = [];

    calculatePaperOptions(
        params, selectedPaper,
        9.3, 5.8,  // productWithBleed
        allResults,
        0,         // spacing
        false,     // isDigitalCutting
        config,
    );

    it('engine populated allResults (≥ 20 entries)', () => {
        expect(allResults.length).toBeGreaterThanOrEqual(20);
    });

    it('validation: KHÔNG có result với cutSheetW > 33 (maxW của cả 2 printer)', () => {
        const tooWide = allResults.filter(r => r.cutSheetW > 33);
        expect(tooWide.length).toBe(0);
    });

    it('có C2060 + 32.2×21.2 với 10 con/tờ, 205đ/sp', () => {
        const found = allResults.find(r =>
            r.printer.name === 'C2060' &&
            Math.abs(r.cutSheetW - 32.2) < 0.01 &&
            Math.abs(r.cutSheetH - 21.2) < 0.01
        );
        expect(found).toBeDefined();
        expect(found.productsPerSheet).toBe(10);
        expect(found.numCuttableSheets).toBe(8);
        expect(found.costPerProduct).toBeCloseTo(205, 6);
    });

    it('có C2060 + 32.2×33 với 15 con/tờ, ≈ 173.33đ/sp', () => {
        const found = allResults.find(r =>
            r.printer.name === 'C2060' &&
            Math.abs(r.cutSheetW - 32.2) < 0.01 &&
            Math.abs(r.cutSheetH - 33.0) < 0.01
        );
        expect(found).toBeDefined();
        expect(found.productsPerSheet).toBe(15);
        expect(found.numCuttableSheets).toBe(4);
        expect(found.costPerProduct).toBeCloseTo(2600 / 15, 4);
    });

    it('có C6085 + 32.2×21.2 (printPrice 650 < C2060 750) cost rẻ hơn', () => {
        const c2060 = allResults.find(r =>
            r.printer.name === 'C2060' && Math.abs(r.cutSheetW - 32.2) < 0.01 && Math.abs(r.cutSheetH - 21.2) < 0.01
        );
        const c6085 = allResults.find(r =>
            r.printer.name === 'C6085' && Math.abs(r.cutSheetW - 32.2) < 0.01 && Math.abs(r.cutSheetH - 21.2) < 0.01
        );
        expect(c2060).toBeDefined();
        expect(c6085).toBeDefined();
        // C6085: printCost = 1×650×2 = 1300; totalCostPerSheet = 550+1300 = 1850
        // costPerProduct = 1850/10 = 185
        expect(c6085.costPerProduct).toBeCloseTo(185, 6);
        expect(c6085.costPerProduct).toBeLessThan(c2060.costPerProduct);
    });

    it('tất cả results có costPerProduct hữu hạn + productsPerSheet > 0', () => {
        const allValid = allResults.every(r => isFinite(r.costPerProduct) && r.productsPerSheet > 0);
        expect(allValid).toBe(true);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE E2E-3: Full pipeline → calculateCustomerQuote (báo giá khách)
//
// Scenario: 500 card visit, C300, in 2 mặt, KHÔNG cán + (thử cả) đục lỗ.
// Tái dùng allResults từ E2E-2, pick result {C2060, 32.2×21.2} (10 con/tờ).
//
// Trace customer quote:
//   - bestOption.productsPerSheet = 10, cutSheetH = 21.2
//   - totalPrintSheets = ceil(500/10) = 50
//   - pressH (21.2) ≤ 48 → else branch
//   - A4_CONVERSION_RATES['21.2'] = 1
//   - totalA4PagesRaw = 50 × 1 × 2 = 100
//   - tier {min:80, max:100, print:3000, type:per_page}
//   - totalPrintCost = 100 × 3000 = 300.000
//   - C300: customerSurcharge = 0
//   - contentCount=1 → surcharge = 0
//   - Không cán, không finishing → tổng = 300.000đ
//
// ⚠️ BUG App.jsx (line 121-123): khi user chọn hole-punch/cấn/bồi,
//    App.jsx truyền OUTER config (config.HOLE_PUNCHING_CONFIG) cho
//    calculateFinishingCost. Nhưng function cần INNER config với
//    cost_tiers/customer_tiers ở top level. → Hole-punch/cấn/bồi LUÔN
//    return {0, 0} trong production flow. Documented bên dưới.
// ─────────────────────────────────────────────────────────────────────────────
describe('E2E-3: Full pipeline → customer quote (500 card visit C300 2 mặt)', () => {
    const params = {
        paperType: '3',
        productQuantity: 500,
        printSides: 2,
        printColorMode: '4color',
        laminationType: 'none',
        printContents: 1, variableData: 'no',
        largeSheetSelector: '0',
        customSheetW: 70, customSheetH: 100,
        artPaperPrice: 0,
        holePunchingType: 'none',  // sẽ override ở test bug
        creasingType: 'none',
        mountingType: 'none',
        dieCuttingType: 'none', moldType: 'simple',
        foilStamping: 'no',
        foilCustomSize: false, foilW: 5, foilH: 5,
        foilSpecialColor: false,
    };
    const selectedPaper = config.PAPER_STOCK_DATA[3];
    const allResults = [];
    calculatePaperOptions(params, selectedPaper, 9.3, 5.8, allResults, 0, false, config);

    // Pick specific result (C2060 + 32.2×21.2 — đã verify ở E2E-1)
    const bestOption = allResults.find(r =>
        r.printer.name === 'C2060' &&
        Math.abs(r.cutSheetW - 32.2) < 0.01 &&
        Math.abs(r.cutSheetH - 21.2) < 0.01
    );

    // Sub-case 3.1: KHÔNG finishing — tổng 300k
    describe('Sub 3.1: no finishing → tổng 300.000đ', () => {
        const finishingCustomerPrices = { holePunching: 0, creasing: 0, mounting: 0 };
        const dieCuttingCustomerPrice = { moldCost: 0, laborCustomerPrice: 0 };
        const quote = calculateCustomerQuote(bestOption, params, finishingCustomerPrices, dieCuttingCustomerPrice, null, config);

        it('engine populated bestOption', () => { expect(bestOption).toBeDefined(); });
        it('quote không lỗi', () => { expect(quote.error).toBeNull(); });
        it('totalA4Pages = "100"', () => { expect(quote.totalA4Pages).toBe('100'); });
        it('totalPrintCost = 300.000đ', () => { expect(quote.totalPrintCost).toBe(300000); });
        it('totalLaminationCost = 0', () => { expect(quote.totalLaminationCost).toBe(0); });
        it('totalPaperSurcharge = 0 (C300)', () => { expect(quote.totalPaperSurcharge).toBe(0); });
        it('customerSurcharge = 0 (1 nội dung)', () => { expect(quote.customerSurcharge).toBe(0); });
        it('TỔNG khách = 300.000đ', () => { expect(quote.totalCustomerCost).toBe(300000); });
    });

    // Sub-case 3.2: finishing cost apply ĐÚNG (sau TASK-0008.6 fix App.jsx)
    describe('Sub 3.2: finishing cost in production (TASK-0008.6 FIXED)', () => {
        // Lịch sử: TASK-0008.5 phát hiện App.jsx (line 121-123) truyền OUTER
        // config (config.HOLE_PUNCHING_CONFIG) cho calculateFinishingCost,
        // nhưng function cần INNER config với cost_tiers/customer_tiers ở top
        // level. → Hole-punch/cấn/bồi LUÔN = 0 trong production.
        // TASK-0008.6 đã fix App.jsx: truyền `config.HOLE_PUNCHING_CONFIG?.
        // [params.holePunchingType]` → finishing cost giờ tính đúng.

        const innerCfg = config.HOLE_PUNCHING_CONFIG['1_vi_tri'];
        const innerResult = calculateFinishingCost(500, '1_vi_tri', innerCfg);

        it('engine: inner config + qty 500 → cost 75k / customer 150k', () => {
            expect(innerResult.cost).toBe(75000);
            expect(innerResult.customerPrice).toBe(150000);
        });

        it('production flow (post-fix): quote 500 card + đục lỗ 1_vi_tri = 450.000đ', () => {
            // Sau fix, App.jsx truyền inner config → holePunchingCustomerPrice = 150k
            const finishingCustomerPrices = {
                holePunching: innerResult.customerPrice,
                creasing: 0, mounting: 0,
            };
            const quote = calculateCustomerQuote(
                bestOption,
                { ...params, holePunchingType: '1_vi_tri' },
                finishingCustomerPrices,
                { moldCost: 0, laborCustomerPrice: 0 },
                null, config
            );
            // 300k print (100 trang × 3.000) + 150k đục lỗ = 450k
            expect(quote.totalCustomerCost).toBe(450000);
        });

        it('[defensive] engine truyền OUTER config (sai shape) → return {0,0}, không crash', () => {
            // Engine contract: input invalid shape → trả 0 thay vì throw.
            // Test giữ lại để bảo vệ engine: nếu tương lai có ai gọi nhầm,
            // hệ thống không crash mà chỉ thiếu finishing cost.
            const r = calculateFinishingCost(500, '1_vi_tri', config.HOLE_PUNCHING_CONFIG);
            expect(r.cost).toBe(0);
            expect(r.customerPrice).toBe(0);
        });
    });
});
