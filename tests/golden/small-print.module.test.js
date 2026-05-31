// Smoke test cho module path mới sau TASK-0009 (extract small-print engine).
//
// Mục tiêu:
//   1. Module path mới export đủ 16 public function (15 calculator + 1 quote).
//   2. Compat shim cũ (src/utils/calculator.js + customerQuote.js) re-export
//      đúng reference (same function identity — đảm bảo không có wrapper/proxy).
//   3. Behavior identical: spot-check 2-3 case golden qua cả 2 path.

import { describe, it, expect } from 'vitest';
import * as newPath from '../../src/modules/small-print/engine/index.js';
import * as oldCalc from '../../src/utils/calculator.js';
import * as oldQuote from '../../src/utils/customerQuote.js';
import { DEFAULT_CONFIG } from '../../src/config/defaultConfig.js';

describe('TASK-0009: small-print module path + compat shims', () => {
    const calcFunctions = [
        'getClicks',
        'getPrintableArea',
        'calculateImposition',
        'calculateMaxCuttableSheetsLayout',
        'getProfitMargin',
        'calculateVariableDataCost',
        'calculatePrintContentSurcharge',
        'calculateFinishingCost',
        'calculateLamination',
        'calculateDieCuttingCosts',
        'calculateFoilStamping',
        'processSheet',
        'calculatePaperOptions',
        'calculatePerSheetOptions',
        'calculateDecalOptions',
    ];

    it('module path mới export đủ 15 hàm từ calculator + 1 từ customerQuote = 16', () => {
        for (const fn of calcFunctions) {
            expect(typeof newPath[fn]).toBe('function');
        }
        expect(typeof newPath.calculateCustomerQuote).toBe('function');
    });

    it('compat shim src/utils/calculator.js re-export cùng reference (15 fn)', () => {
        for (const fn of calcFunctions) {
            expect(oldCalc[fn]).toBe(newPath[fn]);
        }
    });

    it('compat shim src/utils/customerQuote.js re-export cùng reference', () => {
        expect(oldQuote.calculateCustomerQuote).toBe(newPath.calculateCustomerQuote);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Behavior identical — spot-check 3 case golden qua cả 2 path
    // ─────────────────────────────────────────────────────────────────────

    it('Case A (getClicks): h=21.2 trên C2060 → 1 click qua cả 2 path', () => {
        const printer = DEFAULT_CONFIG.PRINTER_CONFIG.C2060;
        expect(newPath.getClicks(21.2, printer)).toBe(1);
        expect(oldCalc.getClicks(21.2, printer)).toBe(1);
    });

    it('Case E2E-1 (processSheet): card visit 9.3×5.8 trên 32.2×21.2/C2060 → 205đ/sp', () => {
        const params = {
            productQuantity: 500,
            printSides: 2,
            printColorMode: '4color',
            laminationType: 'none',
        };
        const largeSheet = { w: 65, h: 86 };
        const printer = DEFAULT_CONFIG.PRINTER_CONFIG.C2060;

        const resNew = [];
        newPath.processSheet(
            32.2,
            21.2,
            largeSheet,
            printer,
            params,
            9.3,
            5.8,
            resNew,
            4400,
            0,
            false,
            DEFAULT_CONFIG,
            false
        );
        const resOld = [];
        oldCalc.processSheet(
            32.2,
            21.2,
            largeSheet,
            printer,
            params,
            9.3,
            5.8,
            resOld,
            4400,
            0,
            false,
            DEFAULT_CONFIG,
            false
        );

        expect(resNew.length).toBe(1);
        expect(resOld.length).toBe(1);
        expect(resNew[0].costPerProduct).toBeCloseTo(205, 6);
        expect(resOld[0].costPerProduct).toBeCloseTo(205, 6);
        expect(resNew[0].productsPerSheet).toBe(resOld[0].productsPerSheet);
    });

    it('Case K (calculateCustomerQuote): 500 card visit C300 2 mặt → 300.000đ qua cả 2 path', () => {
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
            paperType: 3,
            artPaperPrice: 0,
        };
        const finishingCustomerPrices = { holePunching: 0, creasing: 0, mounting: 0 };
        const dieCuttingCustomerPrice = { moldCost: 0, laborCustomerPrice: 0 };

        const qNew = newPath.calculateCustomerQuote(
            bestOption,
            params,
            finishingCustomerPrices,
            dieCuttingCustomerPrice,
            null,
            DEFAULT_CONFIG
        );
        const qOld = oldQuote.calculateCustomerQuote(
            bestOption,
            params,
            finishingCustomerPrices,
            dieCuttingCustomerPrice,
            null,
            DEFAULT_CONFIG
        );

        expect(qNew.totalCustomerCost).toBe(300000);
        expect(qOld.totalCustomerCost).toBe(300000);
        expect(qNew.totalCustomerCost).toBe(qOld.totalCustomerCost);
    });
});
