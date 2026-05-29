// Compatibility shim (TASK-0009 — extract small-print engine).
//
// calculateCustomerQuote đã chuyển sang src/modules/small-print/engine/quote.js.
// File này giữ public API cho UI cũ (src/App.jsx) và golden tests.

export { calculateCustomerQuote } from '../modules/small-print/engine/index.js';
