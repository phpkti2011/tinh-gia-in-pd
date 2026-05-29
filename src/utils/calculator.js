// Compatibility shim (TASK-0009 — extract small-print engine).
//
// Engine thực tế đã chuyển sang src/modules/small-print/engine/.
// File này giữ public API cho UI cũ (src/App.jsx, src/components/smallprint/*)
// và golden tests có sẵn không cần đổi đường dẫn import.
//
// Khi tất cả import được cập nhật sang module path mới ở task tương lai,
// file này có thể được xoá.

export {
    getClicks,
    getPrintableArea,
    calculateImposition,
    calculateMaxCuttableSheetsLayout,
    getProfitMargin,
    calculateVariableDataCost,
    calculatePrintContentSurcharge,
    calculateFinishingCost,
    calculateLamination,
    calculateDieCuttingCosts,
    calculateFoilStamping,
    processSheet,
    calculatePaperOptions,
    calculatePerSheetOptions,
    calculateDecalOptions,
} from '../modules/small-print/engine/index.js';
