// Compatibility shim (TASK-0010 — print config tách vào module mới).
//
// Nguồn chính: src/modules/small-print/config/defaultConfig.js
// File này giữ lại để code cũ (src/utils/configStorage.js + 4 file golden
// test cũ) không cần đổi đường dẫn import.
//
// Khi tất cả consumer được cập nhật sang module path mới ở task tương lai,
// file này có thể xoá.

export { DEFAULT_CONFIG } from '../modules/small-print/config/defaultConfig.js';
