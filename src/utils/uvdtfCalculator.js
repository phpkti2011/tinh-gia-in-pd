// Compatibility shim (TASK-0012 — extract UV DTF engine).
//
// Engine thực tế đã chuyển sang src/modules/uvdtf/engine/.
// File này giữ public API cho UI cũ (src/App.jsx + src/components/uvdtf/*)
// và golden tests cũ không cần đổi đường dẫn import.
//
// Khi tất cả consumer được cập nhật sang module path mới ở task tương lai,
// file này có thể xoá.

export { calculateUvDtf } from '../modules/uvdtf/engine/index.js';
