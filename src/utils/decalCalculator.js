// Compatibility shim (TASK-0004 — extract decal engine).
//
// Engine thực tế đã chuyển sang src/modules/decal/engine/.
// File này giữ nguyên public API để code cũ (UI ở src/components/decal/,
// App.jsx) và golden tests có sẵn không cần đổi đường dẫn import.
//
// Khi tất cả import được cập nhật sang đường dẫn mới ở task tương lai,
// file này có thể được xoá.

export {
    calculateStickersPerSheet,
    calculateSheetsPerPrintSheet,
    calculateSingleStickerPrice,
    calculateSheetPrice,
    generateSinglePriceTable,
    generateSheetPriceTable,
} from '../modules/decal/engine/index.js';
