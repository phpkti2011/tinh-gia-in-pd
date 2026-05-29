// Golden tests cho module IN KTS KHỔ NHỎ (TASK-0008).
//
// Mục tiêu: KHOÁ kết quả hiện tại của:
//   - src/utils/calculator.js (15 export — engine in KTS)
//   - src/utils/customerQuote.js (calculateCustomerQuote)
//   - cùng DEFAULT_CONFIG (src/config/defaultConfig.js)
//
// KHÔNG đụng engine. KHÔNG mock. Số expected được tính tay từ formula gốc.
//
// SCOPE: 11 atomic case (A–K) cover các helper + 1 endpoint customer quote.
// CHƯA cover (gap — note trong báo cáo):
//   - processSheet / calculatePaperOptions / calculatePerSheetOptions / calculateDecalOptions
//     (pipeline mutate allResults — cần end-to-end test riêng)
//   - calculateMaxCuttableSheetsLayout (geometric phức tạp — chỉ smoke test count > 0)

import { describe, it, expect } from 'vitest';
import {
    getClicks,
    getProfitMargin,
    getPrintableArea,
    calculateImposition,
    calculateLamination,
    calculateVariableDataCost,
    calculatePrintContentSurcharge,
    calculateFinishingCost,
    calculateDieCuttingCosts,
    calculateMaxCuttableSheetsLayout,
    calculateFoilStamping,
} from '../../src/utils/calculator.js';
import { calculateCustomerQuote } from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';

const config = DEFAULT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// CASE A — getClicks: tra số click theo chiều cao tờ in
// PRINTER_CONFIG.C2060.clickTiers:
//   [{maxH:33, clicks:1}, {maxH:48, clicks:2}, {maxH:76, clicks:3},
//    {maxH:92, clicks:4}, {maxH:120, clicks:5}]
// ─────────────────────────────────────────────────────────────────────────────
describe('Case A: getClicks (C2060 tier lookup)', () => {
    const printer = config.PRINTER_CONFIG.C2060;

    it('h=21.2 (A4) → 1 click', () => { expect(getClicks(21.2, printer)).toBe(1); });
    it('h=33 (boundary tier 1/2, vẫn ≤33) → 1 click', () => { expect(getClicks(33, printer)).toBe(1); });
    it('h=48 (boundary tier 2/3, vẫn ≤48) → 2 click', () => { expect(getClicks(48, printer)).toBe(2); });
    it('h=120 (max) → 5 click', () => { expect(getClicks(120, printer)).toBe(5); });
    it('h=121 (vượt max) → Infinity', () => { expect(getClicks(121, printer)).toBe(Infinity); });

    it('C6085 có boundary khác (maxH 35 vs 33)', () => {
        const c6085 = config.PRINTER_CONFIG.C6085;
        expect(getClicks(34, c6085)).toBe(1);   // C6085: 34 ≤ 35
        expect(getClicks(34, printer)).toBe(2); // C2060: 34 > 33 → tier 2
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE B — getPrintableArea: trừ margin theo nhiều chế độ
// PRINTABLE_AREA_CONFIG:
//   digital_cut_margin_total: 1.8 (cả 2 chiều khi digital cut)
//   regular_cut_width_margin_total: 0.8
//   vk_point_height_margin: 0.8 (khi pressH match printer.vkPoints)
//   non_vk_point_height_margin: 0.1
//   custom_width_margin: 0.8, custom_height_margin: 1.0
// ─────────────────────────────────────────────────────────────────────────────
describe('Case B: getPrintableArea', () => {
    const printer = config.PRINTER_CONFIG.C2060;  // vkPoints: [33, 48, 76, 92, 120]

    it('VK point h=33: W − 0.8, H − 0.8 (vk_point_height_margin)', () => {
        const r = getPrintableArea(32.2, 33, printer, false, config, false);
        expect(r.w).toBeCloseTo(31.4, 6);   // 32.2 − 0.8
        expect(r.h).toBeCloseTo(32.2, 6);   // 33 − 0.8
    });

    it('non-VK h=22: H trừ ít hơn (0.1)', () => {
        const r = getPrintableArea(32.2, 22, printer, false, config, false);
        expect(r.w).toBeCloseTo(31.4, 6);
        expect(r.h).toBeCloseTo(21.9, 6);  // 22 − 0.1
    });

    it('isDigitalCutting=true: cả 2 chiều trừ 1.8', () => {
        const r = getPrintableArea(32.2, 33, printer, true, config, false);
        expect(r.w).toBeCloseTo(30.4, 6);
        expect(r.h).toBeCloseTo(31.2, 6);
    });

    it('isCustom=true: trừ custom margins (0.8 W, 1.0 H)', () => {
        const r = getPrintableArea(70, 100, printer, false, config, true);
        expect(r.w).toBeCloseTo(69.2, 6);
        expect(r.h).toBeCloseTo(99, 6);
    });

    it('không bao giờ trả về số âm', () => {
        const r = getPrintableArea(0.5, 0.5, printer, true, config, false);
        expect(r.w).toBeGreaterThanOrEqual(0);
        expect(r.h).toBeGreaterThanOrEqual(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE C — calculateImposition: xếp tem 9×5.5cm trên area 32.2×21.2cm
// itemW=9, itemH=5.5, spacing=0
// Normal:  fitW1 = floor(32.2/9) = 3, fitH1 = floor(21.2/5.5) = 3 → 9
// Rotated: fitW2 = floor(32.2/5.5) = 5, fitH2 = floor(21.2/9) = 2 → 10 ✓ thắng
// Layout = '2x5'; actualPrintW = 5×5.5 = 27.5; actualPrintH = 2×9 = 18
// ─────────────────────────────────────────────────────────────────────────────
describe('Case C: calculateImposition — card visit 9×5.5cm trên 32.2×21.2cm', () => {
    const r = calculateImposition(32.2, 21.2, 9, 5.5, 0);

    it('chọn xoay 90° → 10 con/tờ (5×2)', () => {
        expect(r.total).toBe(10);
        expect(r.layout).toBe('2x5');
    });

    it('actualPrintW = 27.5cm; actualPrintH = 18cm', () => {
        expect(r.actualPrintW).toBeCloseTo(27.5, 6);
        expect(r.actualPrintH).toBeCloseTo(18, 6);
    });

    it('vùng quá nhỏ (1×1) cho sản phẩm 9×5.5 → 0 con, layout "0x0"', () => {
        // Cả 2 layout (normal + rotated) đều fit = 0 → branch cuối trả "0x0"
        const z = calculateImposition(1, 1, 9, 5.5, 0);
        expect(z.total).toBe(0);
        expect(z.layout).toBe('0x0');
    });

    it('areaW=0 → early return layout "N/A"', () => {
        // Branch đầu (areaW≤0 || areaH≤0 || prodW≤0 || prodH≤0) trả "N/A"
        const z = calculateImposition(0, 21.2, 9, 5.5, 0);
        expect(z.total).toBe(0);
        expect(z.layout).toBe('N/A');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE D — calculateLamination
// LAMINATION_CONFIG: WIDTH=32, PRICE_PER_METER=2200
// Công thức: cost = (pressH/100) × PRICE × sides
// ─────────────────────────────────────────────────────────────────────────────
describe('Case D: calculateLamination', () => {
    it('laminate_1, vùng in 27.5 < 32 → cost = 0.212×2200 = 466.4đ, no warning', () => {
        const r = calculateLamination(21.2, 27.5, 10, 'laminate_1', config);
        expect(r.costPerSheet).toBeCloseTo(466.4, 6);
        expect(r.costPerProduct).toBeCloseTo(46.64, 6);
        expect(r.warning).toBeNull();
    });

    it('laminate_2: × 2 sides = 932.8đ', () => {
        const r = calculateLamination(21.2, 27.5, 10, 'laminate_2', config);
        expect(r.costPerSheet).toBeCloseTo(932.8, 6);
    });

    it('actualPrintW = 33 vượt khổ màng (32) → cost=0, warning có', () => {
        const r = calculateLamination(21.2, 33, 10, 'laminate_1', config);
        expect(r.costPerSheet).toBe(0);
        expect(r.warning).toMatch(/KHÔNG THỂ CÁN MÀNG/);
    });

    it('none → cost=0, no warning', () => {
        const r = calculateLamination(21.2, 27.5, 10, 'none', config);
        expect(r.costPerSheet).toBe(0);
        expect(r.warning).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE E — calculateVariableDataCost (data biến đổi theo tier)
// VARIABLE_DATA_CONFIG:
//   price_500=200k, price_1000=300k, price_over_1000_base=500k,
//   price_over_1000_progressive=100k, progressive_step=1000
// ─────────────────────────────────────────────────────────────────────────────
describe('Case E: calculateVariableDataCost', () => {
    it('qty=0 → 0', () => { expect(calculateVariableDataCost(0, config)).toBe(0); });
    it('qty=300 (≤500) → 200.000', () => { expect(calculateVariableDataCost(300, config)).toBe(200000); });
    it('qty=750 (≤1000) → 300.000', () => { expect(calculateVariableDataCost(750, config)).toBe(300000); });
    it('qty=2500 → 600.000 (base 500k + 1×100k step)', () => {
        // additionalSteps = floor((2500-1001)/1000) = 1
        expect(calculateVariableDataCost(2500, config)).toBe(600000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE F — calculateFinishingCost (đục lỗ 1 vị trí)
// HOLE_PUNCHING_CONFIG['1_vi_tri']:
//   cost_tiers:      [{99,40k,pack}, {500,75k,pack}, {Inf,125,/pc}]
//   customer_tiers:  [{99,80k,pack}, {500,150k,pack}, {Inf,250,/pc}]
// ─────────────────────────────────────────────────────────────────────────────
describe('Case F: calculateFinishingCost — đục lỗ 1 vị trí', () => {
    const cfg = config.HOLE_PUNCHING_CONFIG['1_vi_tri'];

    it('qty=50 → tier max=99 → cost 40.000 / customer 80.000', () => {
        const r = calculateFinishingCost(50, '1_vi_tri', cfg);
        expect(r.cost).toBe(40000);
        expect(r.customerPrice).toBe(80000);
    });

    it('qty=100 → tier max=500 → cost 75.000 / customer 150.000', () => {
        const r = calculateFinishingCost(100, '1_vi_tri', cfg);
        expect(r.cost).toBe(75000);
        expect(r.customerPrice).toBe(150000);
    });

    it('qty=1000 → tier max=Infinity (per_piece) → cost 125.000 / customer 250.000', () => {
        const r = calculateFinishingCost(1000, '1_vi_tri', cfg);
        expect(r.cost).toBe(125000);
        expect(r.customerPrice).toBe(250000);
    });

    it('type=none → 0/0', () => {
        const r = calculateFinishingCost(100, 'none', cfg);
        expect(r.cost).toBe(0);
        expect(r.customerPrice).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE G — getProfitMargin (margin theo giá vốn)
// PROFIT_MARGIN_TIERS:
//   [{200k,0.75}, {500k,0.70}, {1M,0.65}, {2M,0.60}, {Inf,0.55}]
// ─────────────────────────────────────────────────────────────────────────────
describe('Case G: getProfitMargin', () => {
    it('cost=100k → 0.75', () => { expect(getProfitMargin(100000, config)).toBe(0.75); });
    it('cost=200k (boundary, ≤200k) → 0.75', () => { expect(getProfitMargin(200000, config)).toBe(0.75); });
    it('cost=300k → 0.70', () => { expect(getProfitMargin(300000, config)).toBe(0.70); });
    it('cost=3M → 0.55 (tier Infinity)', () => { expect(getProfitMargin(3000000, config)).toBe(0.55); });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE H — calculatePrintContentSurcharge
// PRINT_CONTENT_CONFIG:
//   single_content_surcharge: 0.20 (khi mỗi nội dung chỉ 1 cái)
//   tiers: [{2-5,0.10}, {6-10,0.20}, {11-25,0.30}, {26-Inf,0.35}]
// ─────────────────────────────────────────────────────────────────────────────
describe('Case H: calculatePrintContentSurcharge (phụ thu nhiều nội dung)', () => {
    it('contentCount=1 → 0', () => {
        const r = calculatePrintContentSurcharge(1000000, 100, 1, config);
        expect(r.surcharge).toBe(0);
    });

    it('contentCount=500, qty=500 (mỗi nội dung 1 cái) → +20%', () => {
        const r = calculatePrintContentSurcharge(1000000, 500, 500, config);
        expect(r.surcharge).toBeCloseTo(200000, 6);
        expect(r.reason).toMatch(/20%/);
    });

    it('contentCount=3, qty=500 → tier 2-5 → +10%', () => {
        const r = calculatePrintContentSurcharge(1000000, 500, 3, config);
        expect(r.surcharge).toBeCloseTo(100000, 6);
    });

    it('contentCount=15, qty=500 → tier 11-25 → +30%', () => {
        const r = calculatePrintContentSurcharge(1000000, 500, 15, config);
        expect(r.surcharge).toBeCloseTo(300000, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE I — calculateFoilStamping (ép kim)
// EP_KIM_CONFIG (default):
//   pricePerArea=5, moldPerArea=2000, minPriceNormal=400, minPriceSpecial=700,
//   minTotalSmall=250000, shippingSmall=50000,
//   minTotalLarge=300000, shippingLarge=100000,
//   thresholdW=20, thresholdH=14 (sizeThreshold = 280)
// ─────────────────────────────────────────────────────────────────────────────
describe('Case I: calculateFoilStamping', () => {
    it('foilStamping ≠ "yes" → 0 totalCost', () => {
        const r = calculateFoilStamping({ foilStamping: 'no' }, config);
        expect(r.totalCost).toBe(0);
    });

    it('case nhỏ 5×5cm × 100 cái (bị min total 250k chặn) → totalCost = 372.000đ', () => {
        // H=5, W=5 → areaForCalc = 36, isSmall=true
        // rawPricePerImpression = 36×5 = 180 < minPriceNormal 400 → 400
        // totalImpressionPriceRaw = 400×100 = 40.000 < minTotalSmall 250.000 → 250.000
        // moldMakingCost = 36×2000 + 50.000 = 122.000
        // totalCost = 372.000
        const params = {
            foilStamping: 'yes', foilCustomSize: true,
            foilH: 5, foilW: 5,
            productQuantity: 100, foilSpecialColor: false,
        };
        const r = calculateFoilStamping(params, config);
        expect(r.impressionPrice).toBe(250000);
        expect(r.moldCost).toBe(122000);
        expect(r.totalCost).toBe(372000);
        expect(r.isSmall).toBe(true);
    });

    it('case lớn 30×20cm × 100 cái (vượt min) → totalCost = 1.727.500đ', () => {
        // H=20, W=30 → areaForCalc = (20+1)(30+1) = 651 > 280 → isSmall=false
        // rawPricePerImpression = 651×5 = 3.255 > minPriceNormal 400 → 3.255
        // totalImpressionPriceRaw = 3.255×100 = 325.500 > minTotalLarge 300.000 → 325.500
        // moldMakingCost = 651×2000 + 100.000 = 1.402.000
        // totalCost = 1.727.500
        const params = {
            foilStamping: 'yes', foilCustomSize: true,
            foilH: 20, foilW: 30,
            productQuantity: 100, foilSpecialColor: false,
        };
        const r = calculateFoilStamping(params, config);
        expect(r.impressionPrice).toBe(325500);
        expect(r.moldCost).toBe(1402000);
        expect(r.totalCost).toBe(1727500);
        expect(r.isSmall).toBe(false);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE J — calculateDieCuttingCosts (bế khuôn)
// DIE_CUTTING_MOLD_COST_CONFIG.simple: base_size=21, base_price=120.000
// DIE_CUTTING_LABOR_CONFIG.cost_tiers: [{500,100k,pack},{1200,175k,pack},{Inf,225k,pack}]
// ─────────────────────────────────────────────────────────────────────────────
describe('Case J: calculateDieCuttingCosts', () => {
    it('none → 0/0/0', () => {
        const r = calculateDieCuttingCosts({ dieCuttingType: 'none' }, 0, false, config);
        expect(r.moldCost).toBe(0);
        expect(r.laborCost).toBe(0);
        expect(r.laborCustomerPrice).toBe(0);
    });

    it('mold simple 10×10cm (≤21) × 100 tờ → mold 120k / labor 100k (qty≤500) / customer 200k', () => {
        const params = { dieCuttingType: 'mold', moldType: 'simple', productW: 10, productH: 10 };
        const r = calculateDieCuttingCosts(params, 100, false, config);
        expect(r.moldCost).toBe(120000);
        expect(r.laborCost).toBe(100000);
        expect(r.laborCustomerPrice).toBe(200000);
    });

    it('mold simple 30×30cm (vượt 21) → moldCost theo tỉ lệ diện tích', () => {
        // largerW = max(30, 21) = 30, largerH = max(30, 21) = 30
        // moldCost = (120000 / (21×21)) × (30×30) = (120000/441) × 900 ≈ 244.898
        const params = { dieCuttingType: 'mold', moldType: 'simple', productW: 30, productH: 30 };
        const r = calculateDieCuttingCosts(params, 100, false, config);
        expect(r.moldCost).toBeCloseTo(120000 * (30 * 30) / (21 * 21), 6);
        expect(r.moldCost).toBeCloseTo(244897.96, 1);
    });

    it('digital cutting 50 tờ → tier max=100 → 90k cost / 180k customer', () => {
        const params = { dieCuttingType: 'digital' };
        const r = calculateDieCuttingCosts(params, 50, false, config);
        // DIGITAL_DIE_CUTTING_CONFIG: {10,50k}, {100,90k}, {300,125k}, {600,175k}, {1200,250k}
        expect(r.laborCost).toBe(90000);
        expect(r.laborCustomerPrice).toBe(180000);
        expect(r.moldCost).toBe(0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE K — calculateCustomerQuote (giá báo khách)
// Scenario: 500 card visit, in 2 mặt, C300, không cán, không thành phẩm
// Pre-computed best option: cut sheet 32.2×21.2, 10 con/tờ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case K: calculateCustomerQuote — 500 card visit 2 mặt C300', () => {
    const bestOption = {
        cutSheetW: 32.2,
        cutSheetH: 21.2,
        cutSheetSize: '32.2 x 21.2',
        numCuttableSheets: 6,
        productsPerSheet: 10,
    };
    const params = {
        productQuantity: 500,
        printSides: 2,
        laminationType: 'none',
        printContents: 1,
        variableData: 'no',
        paperType: 3,  // C300 — pricingModel='ream', customerSurcharge=0
        artPaperPrice: 0,
    };
    const finishingCustomerPrices = { holePunching: 0, creasing: 0, mounting: 0 };
    const dieCuttingCustomerPrice = { moldCost: 0, laborCustomerPrice: 0 };

    const r = calculateCustomerQuote(bestOption, params, finishingCustomerPrices, dieCuttingCustomerPrice, null, config);

    it('không lỗi cấu hình', () => {
        expect(r.error).toBeNull();
    });

    it('tổng trang A4 = "100" (50 tờ × A4_CONVERSION 1 × 2 mặt)', () => {
        // A4_CONVERSION_RATES['21.2'] = 1
        // totalPrintSheets = ceil(500/10) = 50
        // totalA4PagesRaw = 50 × 1 × 2 = 100
        // tier match {min:80, max:100}: per_page 3000
        expect(r.totalA4Pages).toBe('100');
    });

    it('đơn giá hiển thị có chứa "trang"', () => {
        expect(r.unitPriceText).toMatch(/trang/);
    });

    it('tiền in = 100 trang × 3.000đ/trang = 300.000đ', () => {
        expect(r.totalPrintCost).toBe(300000);
    });

    it('tiền cán màng = 0 (no lam)', () => {
        expect(r.totalLaminationCost).toBe(0);
    });

    it('phụ thu giấy (C300) = 0', () => {
        expect(r.totalPaperSurcharge).toBe(0);
    });

    it('phụ thu nhiều nội dung = 0 (printContents=1)', () => {
        expect(r.customerSurcharge).toBe(0);
    });

    it('tổng tiền khách = 300.000đ', () => {
        expect(r.totalCustomerCost).toBe(300000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE L — calculateMaxCuttableSheetsLayout (smoke test, không assert layout cụ thể)
// Chỉ verify count > 0 cho input hợp lệ và count = 0 cho input invalid.
// Layout phức tạp (geometric optimization) — không tính tay được, document gap.
// ─────────────────────────────────────────────────────────────────────────────
describe('Case L: calculateMaxCuttableSheetsLayout (smoke test only)', () => {
    it('cắt 32.2×21.2 từ 65×86 → count > 0, layout là array', () => {
        const r = calculateMaxCuttableSheetsLayout(65, 86, 32.2, 21.2);
        expect(r.count).toBeGreaterThan(0);
        expect(Array.isArray(r.layout)).toBe(true);
        expect(r.layout.length).toBe(r.count);
    });

    it('input invalid (cutW=0) → count=0, layout rỗng', () => {
        const r = calculateMaxCuttableSheetsLayout(65, 86, 0, 21.2);
        expect(r.count).toBe(0);
        expect(r.layout).toEqual([]);
    });

    it('cut quá lớn → count=0', () => {
        const r = calculateMaxCuttableSheetsLayout(65, 86, 100, 100);
        expect(r.count).toBe(0);
    });
});
