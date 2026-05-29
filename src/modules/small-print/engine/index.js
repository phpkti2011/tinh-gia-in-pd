// Small-print pricing engine — public API surface (barrel export).
//
// Tách từ src/utils/calculator.js + src/utils/customerQuote.js ở TASK-0009.
// Tất cả golden tests (small-print.golden.test.js, small-print.e2e.golden.test.js)
// phải pass khi import qua đường dẫn này hoặc qua compat shim cũ.

export {
    getClicks,
    getPrintableArea,
    calculateImposition,
    calculateMaxCuttableSheetsLayout,
} from './layout.js';

export {
    getProfitMargin,
    calculateVariableDataCost,
    calculatePrintContentSurcharge,
    calculateFinishingCost,
} from './pricing.js';

export {
    calculateLamination,
    calculateDieCuttingCosts,
    calculateFoilStamping,
} from './finishing.js';

export {
    processSheet,
    calculatePaperOptions,
    calculatePerSheetOptions,
    calculateDecalOptions,
} from './options.js';

export {
    calculateCustomerQuote,
} from './quote.js';
