// UV DTF pricing engine — public API surface (barrel export).
//
// Tách từ src/utils/uvdtfCalculator.js ở TASK-0012.
// Golden tests (uvdtf.golden.test.js) phải pass khi import qua đường này
// hoặc qua compat shim cũ (src/utils/uvdtfCalculator.js).

export { calculateUvDtf } from './pricing.js';
