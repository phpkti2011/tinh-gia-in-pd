// Compatibility shim (TASK-0005 — decal config tách vào module mới).
//
// Nguồn chính: src/modules/decal/config/defaultConfig.js
// File này giữ lại để code cũ (src/utils/configStorage.js + golden tests
// cũ) không cần đổi đường dẫn import.
//
// Khi tất cả consumer được cập nhật sang module path mới ở task tương lai,
// file này có thể xoá.

export { DECAL_DEFAULT_CONFIG } from '../modules/decal/config/defaultConfig.js';
