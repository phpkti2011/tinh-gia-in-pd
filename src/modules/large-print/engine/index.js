// Large-print pricing engine — public API surface (barrel export).
//
// Tách từ src/utils/largePrintCalculator.js ở TASK-0016.
// Chỉ re-export 1 function public (calculateLargePrint) — giữ
// nguyên contract của file gốc.
//
// Helpers (calcItemOnRoll, optimizeItemOnRoll, calculateFormexCost,
// calculateFinishingCost) là internal — chỉ dùng giữa các file trong
// module, không export ra index.js.

export { calculateLargePrint } from './pricing.js';
