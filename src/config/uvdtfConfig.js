// Compatibility shim (TASK-0013 — uvdtf config tách vào module mới).
//
// Nguồn chính: src/modules/uvdtf/config/defaultConfig.js
// File này giữ lại để code cũ (src/utils/configStorage.js + golden test
// cũ) không cần đổi đường dẫn import.
//
// Khi tất cả consumer được cập nhật sang module path mới ở task tương lai,
// file này có thể xoá.

export { UVDTF_DEFAULT_CONFIG } from '../modules/uvdtf/config/defaultConfig.js';
