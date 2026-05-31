// Golden tests cho module IN KHỔ LỚN (TASK-0015).
//
// Khóa kết quả tính giá hiện tại của:
//   - src/utils/largePrintCalculator.js (1 public export: calculateLargePrint)
//   - src/config/largePrintConfig.js (LARGE_PRINT_DEFAULT_CONFIG)
//
// KHÔNG sửa engine. KHÔNG mock. Tất cả expected values tính tay từ formula gốc.
//
// Function PURE — không React/DOM/IO. Lấy params + config, trả object kết quả
// hoặc null nếu không có roll fit.
//
// Pipeline tóm tắt:
//   1. items = params.items || [single item từ width/height/quantity]
//   2. grandTotalArea = tổng (w/100 × h/100 × qty) cho tất cả items (mét²)
//   3. formexCost = calculateFormexCost(grandTotalArea, formexTypeKey)
//   4. finishing = calculateFinishingCost(grandTotalArea, params) — edge taping +
//      grommets + die cutting
//   5. standeeCost = lookup từ STANDEE_OPTIONS bằng standeeKey
//   6. Loop MATERIAL_TYPES[materialTypeKey].options (các khổ cuộn):
//      - Tối ưu từng item (thử 2 hướng xoay, chọn rẻ hơn)
//      - Cộng tất cả items → rollTotalCost
//      - Cộng formex/finishing/standee → totalWithExtras
//      - Pick roll có totalWithExtras NHỎ NHẤT
//   7. Cost per item:
//      - printCost = max(printedArea × printPrice, MIN_PRINT_PRICE 30k)
//      - materialWasteCost = (rollWidth − printW) × printH × materialPrice
//      - lamCost = max(printedArea × lamPrice, MIN_LAMINATION_PRICE 15k)
//        (lam dùng khổ lam hẹp nhất ≥ printW)

import { describe, it, expect } from 'vitest';
import { calculateLargePrint } from '../../src/utils/largePrintCalculator.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/config/largePrintConfig.js';

const config = LARGE_PRINT_DEFAULT_CONFIG;

// ─────────────────────────────────────────────────────────────────────────────
// CASE A — PP có keo 100×100cm, không cán/formex/finishing
// Trace:
//   items = [{w:100, h:100, qty:1}] → wM=1.0, hM=1.0, area=1m²
//   PP rolls: 0.91, 1.07, 1.27, 1.52
//   Roll 0.91: 1.0 > 0.91 cả 2 hướng → null
//   Roll 1.07: upright OK
//     printedArea = 1, unprint = (1.07−1.0)×1.0 ≈ 0.07
//     printCost = max(1×120000, 30000) = 120000
//     waste = 0.07 × 25000 ≈ 1750 → total ≈ 121.750
//   Roll 1.27: total ≈ 126.750  Roll 1.52: total ≈ 133.000
//   Best: 1.07 roll → totalCost ≈ 121.750đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case A: PP có keo 100×100cm × 1, không cán/formex/finishing', () => {
    const params = {
        width: 100,
        height: 100,
        quantity: 1,
        materialTypeKey: 'pp_co_keo',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'none',
    };
    const r = calculateLargePrint(params, config);

    it('chọn roll 1.07m (rẻ nhất với 1m vuông)', () => {
        expect(r.rollWidth).toBe(1.07);
        expect(r.materialChoice.printPrice).toBe(120000);
        expect(r.materialChoice.materialPrice).toBe(25000);
    });

    it('totalCost ≈ 121.750đ (120k print + 1750 waste)', () => {
        expect(r.totalCost).toBeCloseTo(121750, 0);
    });

    it('printedArea = 1 m²; unprintedArea ≈ 0.07 m²', () => {
        expect(r.printedArea).toBeCloseTo(1, 6);
        expect(r.unprintedArea).toBeCloseTo(0.07, 4);
    });

    it('không có cán + formex + finishing + standee', () => {
        expect(r.laminationChoice).toBeNull();
        expect(r.formexCost).toBe(0);
        expect(r.finishingCost).toBe(0);
        expect(r.standeeCost).toBe(0);
        expect(r.standeeName).toBe('');
    });

    it('itemDetails[0]: rotated=false, qty=1, printedArea=1', () => {
        expect(r.itemDetails).toHaveLength(1);
        expect(r.itemDetails[0].rotated).toBe(false);
        expect(r.itemDetails[0].quantity).toBe(1);
        expect(r.itemDetails[0].printWidth).toBeCloseTo(1.0, 6);
        expect(r.itemDetails[0].printHeight).toBeCloseTo(1.0, 6);
    });

    it('totalPanels = 1', () => {
        expect(r.totalPanels).toBe(1);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE B — Decal sữa 50×100cm + cán màng mờ
// Trace:
//   wM=0.5, hM=1.0, area=0.5m²
//   decal_sua rolls: [1.07/150k/35k, 1.52/150k/35k]
//   Lam mang_mo options: [1.07/20k, 1.52/20k]
//   Roll 1.07:
//     Upright (0.5,1.0): printArea=0.5, unprint=(1.07−0.5)×1.0=0.57
//       printCost = max(0.5×150k, 30k) = 75000
//       waste = 0.57 × 35000 ≈ 19.950
//       lamCost = max(0.5×20k, 15k) = 15.000
//       total ≈ 109.950
//     Rotated (1.0,0.5): printArea=0.5, unprint=(1.07−1.0)×0.5≈0.035
//       waste ≈ 1225
//       lamCost = 15.000
//       total ≈ 91.225  ← thắng
//   Roll 1.52:
//     Rotated: unprint=0.26, waste=9100, total=99.100
//   Best: 1.07 roll, rotated → totalCost ≈ 91.225đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case B: Decal sữa 50×100cm + cán màng mờ', () => {
    const params = {
        width: 50,
        height: 100,
        quantity: 1,
        materialTypeKey: 'decal_sua',
        laminationTypeKey: 'mang_mo',
        formexTypeKey: 'none',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'none',
    };
    const r = calculateLargePrint(params, config);

    it('chọn roll 1.07m, xoay 90°', () => {
        expect(r.rollWidth).toBe(1.07);
        expect(r.itemDetails[0].rotated).toBe(true);
        expect(r.itemDetails[0].printWidth).toBeCloseTo(1.0, 6);
        expect(r.itemDetails[0].printHeight).toBeCloseTo(0.5, 6);
    });

    it('totalCost ≈ 91.225đ (75k print + 1225 waste + 15k lam)', () => {
        expect(r.totalCost).toBeCloseTo(91225, 0);
    });

    it('laminationChoice = {width: 1.07, price: 20000}', () => {
        expect(r.laminationChoice).toEqual({ width: 1.07, price: 20000 });
    });

    it('printedArea = 0.5 m²; unprintedArea ≈ 0.035 m²', () => {
        expect(r.printedArea).toBeCloseTo(0.5, 6);
        expect(r.unprintedArea).toBeCloseTo(0.035, 4);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE C — PP có keo 150×400cm + bồi formex 5mm (DISCOUNT TIER 5-10)
// Trace:
//   wM=1.5, hM=4.0, area=6m²
//   PP rolls 0.91/1.07/1.27 đều fail (1.5 > tất cả)
//   Roll 1.52 OK upright:
//     printArea=6, unprint=(1.52−1.5)×4=0.08
//     printCost = max(6×120k, 30k) = 720.000
//     waste = 0.08 × 25k = 2000 → total = 722.000
//   Formex 5mm với area=6 (tier 5-10, discount 0.10):
//     formexCost = 6 × 130000 × (1−0.10) = 702.000
//   totalWithExtras = 722.000 + 702.000 = 1.424.000đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case C: PP có keo 150×400cm + formex 5mm (tier discount 10%)', () => {
    const params = {
        width: 150,
        height: 400,
        quantity: 1,
        materialTypeKey: 'pp_co_keo',
        laminationTypeKey: 'none',
        formexTypeKey: 'formex_5mm',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'none',
    };
    const r = calculateLargePrint(params, config);

    it('chọn roll 1.52m (chỉ roll này fit 1.5m)', () => {
        expect(r.rollWidth).toBe(1.52);
        expect(r.itemDetails[0].rotated).toBe(false);
    });

    it('printedArea = 6 m²; unprintedArea ≈ 0.08 m²', () => {
        expect(r.printedArea).toBeCloseTo(6, 4);
        expect(r.unprintedArea).toBeCloseTo(0.08, 4);
    });

    it('formexCost = 702.000đ (6m² × 130k × 0.9)', () => {
        expect(r.formexCost).toBeCloseTo(702000, 0);
    });

    it('totalCost = 1.424.000đ (722k print + 702k formex)', () => {
        expect(r.totalCost).toBeCloseTo(1424000, 0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE D — Hiflex 200×100cm + dán biên + 8 khoen (banner phổ biến)
// Trace:
//   wM=2.0, hM=1.0, area=2m²
//   Hiflex rolls: 1.0, 1.2, 1.5, 1.8
//   Roll 1.0: upright fail (2.0>1.0); rotated OK (1.0<=1.0):
//     calcItemOnRoll(1.0, 2.0): printArea=2, unprint=0, printCost=max(2×120k,30k)=240k, waste=0
//     total = 240.000 (no waste!)
//   Các roll lớn hơn: có waste → đắt hơn → 1.0 thắng
//   Finishing:
//     edgeTaping: max(2×20k, 20k) = 40.000
//     grommets 8: max(8×5k, 15k) = max(40k, 15k) = 40.000
//     finishingCost = 80.000
//   totalWithExtras = 240.000 + 0 + 80.000 + 0 = 320.000đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case D: Hiflex 200×100cm + dán biên + 8 khoen', () => {
    const params = {
        width: 200,
        height: 100,
        quantity: 1,
        materialTypeKey: 'hiflex',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: true,
        grommetsCheck: true,
        grommetsCount: 8,
        dieCutting: false,
        standeeKey: 'none',
    };
    const r = calculateLargePrint(params, config);

    it('chọn roll 1.0m (rotated, vừa khít không waste)', () => {
        expect(r.rollWidth).toBe(1.0);
        expect(r.itemDetails[0].rotated).toBe(true);
        expect(r.unprintedArea).toBeCloseTo(0, 6);
    });

    it('finishingCost = 80.000đ (40k dán biên + 40k 8 khoen)', () => {
        expect(r.finishingCost).toBe(80000);
        expect(r.finishingDesc).toMatch(/Dán biên/);
        expect(r.finishingDesc).toMatch(/8 khoen/);
    });

    it('totalCost = 320.000đ (240k print + 0 waste + 80k finishing)', () => {
        expect(r.totalCost).toBe(320000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE E — Hiflex 60×160cm + standee cuộn 60×160 (phổ biến cho standee)
// Trace:
//   wM=0.6, hM=1.6, area=0.96m²
//   Hiflex rolls: 1.0, 1.2, 1.5, 1.8
//   Roll 1.0: upright OK (0.6<=1.0): waste=(1.0−0.6)×1.6=0.64, total=115.200+10.880=126.080
//   Roll 1.2: total = 131.520
//   Roll 1.5: total = 139.680
//   Roll 1.8: rotated OK (1.6<=1.8): printArea=0.96, unprint=(1.8−1.6)×0.6=0.12,
//     waste=0.12×17k=2040, total = 115.200 + 2040 = 117.240  ← thắng!
//   Standee 'standee_cuon_60x160' = 180.000đ
//   totalWithExtras = 117.240 + 0 + 0 + 180.000 = 297.240đ
// ─────────────────────────────────────────────────────────────────────────────
describe('Case E: Hiflex 60×160cm + standee cuộn 60×160', () => {
    const params = {
        width: 60,
        height: 160,
        quantity: 1,
        materialTypeKey: 'hiflex',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'standee_cuon_60x160',
    };
    const r = calculateLargePrint(params, config);

    it('chọn roll 1.8m (rotated tối ưu nhất, không 1.0m upright)', () => {
        expect(r.rollWidth).toBe(1.8);
        expect(r.itemDetails[0].rotated).toBe(true);
        expect(r.itemDetails[0].printWidth).toBeCloseTo(1.6, 6);
        expect(r.itemDetails[0].printHeight).toBeCloseTo(0.6, 6);
    });

    it('standeeCost = 180.000đ, standeeName chứa "Standee cuộn"', () => {
        expect(r.standeeCost).toBe(180000);
        expect(r.standeeName).toMatch(/Standee cuộn/);
    });

    it('totalCost ≈ 297.240đ (117.240 print + 180k standee)', () => {
        expect(r.totalCost).toBeCloseTo(297240, 0);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE F — Multi-items array (mixed sizes)
// Trace:
//   items = [{50×100,qty:2}, {100×200,qty:1}]
//   item1 = 0.5×1.0, item2 = 1.0×2.0
//   grandTotalArea = 0.5×1×2 + 1×2×1 = 3m²
//   Hiflex roll 1.0:
//     item1: rotated OK (1.0<=1.0) → calcItemOnRoll(1.0, 0.5): printArea=0.5,
//       unprint=0, printCost=max(60k,30k)=60k, waste=0 → 60.000 × 2 = 120.000
//     item2: upright OK → calcItemOnRoll(1.0, 2.0): printArea=2, unprint=0,
//       printCost=240k, waste=0 → 240.000
//     rollTotalCost = 360.000
//   Các roll khác có waste → đắt hơn
//   totalWithExtras = 360.000đ (no formex/finishing/standee)
// ─────────────────────────────────────────────────────────────────────────────
describe('Case F: Multi-items mixed (Hiflex)', () => {
    const params = {
        items: [
            { width: 50, height: 100, quantity: 2 },
            { width: 100, height: 200, quantity: 1 },
        ],
        materialTypeKey: 'hiflex',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'none',
    };
    const r = calculateLargePrint(params, config);

    it('chọn roll 1.0m (vừa khít cho cả 2 item)', () => {
        expect(r.rollWidth).toBe(1.0);
    });

    it('itemDetails có 2 entries (item1 qty=2, item2 qty=1)', () => {
        expect(r.itemDetails).toHaveLength(2);
        expect(r.itemDetails[0].quantity).toBe(2);
        expect(r.itemDetails[1].quantity).toBe(1);
    });

    it('item1 (50×100) rotated; item2 (100×200) upright (vừa khít)', () => {
        expect(r.itemDetails[0].rotated).toBe(true);
        expect(r.itemDetails[1].rotated).toBe(false);
    });

    it('totalPanels = 3 (2 + 1)', () => {
        expect(r.totalPanels).toBe(3);
    });

    it('totalPrintedArea = 3 m² (0.5×2 + 2×1)', () => {
        expect(r.printedArea).toBeCloseTo(3, 4);
    });

    it('totalCost = 360.000đ (120k item1 × 2 + 240k item2)', () => {
        expect(r.totalCost).toBe(360000);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE G — Input invalid → null
// ─────────────────────────────────────────────────────────────────────────────
describe('Case G: input invalid → return null', () => {
    it('materialTypeKey không tồn tại → null', () => {
        const params = {
            width: 100,
            height: 100,
            quantity: 1,
            materialTypeKey: 'unknown',
            laminationTypeKey: 'none',
            formexTypeKey: 'none',
            edgeTaping: false,
            grommetsCheck: false,
            grommetsCount: 0,
            dieCutting: false,
            standeeKey: 'none',
        };
        expect(calculateLargePrint(params, config)).toBeNull();
    });

    it('item quá lớn (4×4m, không roll PP nào fit) → null', () => {
        // PP rolls max = 1.52m, item 4m × 4m không fit cả 2 hướng
        const params = {
            width: 400,
            height: 400,
            quantity: 1,
            materialTypeKey: 'pp_co_keo',
            laminationTypeKey: 'none',
            formexTypeKey: 'none',
            edgeTaping: false,
            grommetsCheck: false,
            grommetsCount: 0,
            dieCutting: false,
            standeeKey: 'none',
        };
        expect(calculateLargePrint(params, config)).toBeNull();
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CASE H — Structural check: output có đủ các trường quan trọng
// ─────────────────────────────────────────────────────────────────────────────
describe('Case H: structural — output có đủ 13 trường public', () => {
    const params = {
        width: 100,
        height: 100,
        quantity: 1,
        materialTypeKey: 'pp_co_keo',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'none',
    };
    const r = calculateLargePrint(params, config);

    it('có đủ 13 trường public top-level', () => {
        const expectedKeys = [
            'totalCost',
            'rollWidth',
            'itemDetails',
            'totalPanels',
            'formexCost',
            'standeeCost',
            'standeeName',
            'finishingCost',
            'finishingDesc',
            'printedArea',
            'unprintedArea',
            'materialChoice',
            'laminationChoice',
        ];
        for (const key of expectedKeys) {
            expect(r).toHaveProperty(key);
        }
        expect(Object.keys(r).length).toBe(13);
    });

    it('itemDetails entry có đủ 11 trường', () => {
        const detail = r.itemDetails[0];
        const expectedKeys = [
            'originalW',
            'originalH',
            'quantity',
            'rotated',
            'printWidth',
            'printHeight',
            'printedArea',
            'unprintedArea',
            'unitCost',
            'totalCost',
            'laminationChoice',
        ];
        for (const key of expectedKeys) {
            expect(detail).toHaveProperty(key);
        }
    });

    it('materialChoice có {width, printPrice, materialPrice}', () => {
        expect(r.materialChoice).toMatchObject({
            width: expect.any(Number),
            printPrice: expect.any(Number),
            materialPrice: expect.any(Number),
        });
    });
});
