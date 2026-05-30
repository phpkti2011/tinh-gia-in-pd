// Compatibility shim (TASK-0016 — extract large-print engine).
//
// Engine thực tế đã chuyển sang src/modules/large-print/engine/.
// File này giữ public API cho UI cũ (src/App.jsx + src/components/largeprint/*)
// và golden tests cũ không cần đổi đường dẫn import.
//
// Khi tất cả consumer được cập nhật sang module path mới ở task tương lai,
// file này có thể xoá.

export { calculateLargePrint } from '../modules/large-print/engine/index.js';
