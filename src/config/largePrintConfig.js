// Compatibility shim (TASK-0017 — large-print config tách vào module mới).
//
// Nguồn chính: src/modules/large-print/config/defaultConfig.js
// File này giữ lại để code cũ (src/utils/configStorage.js + golden tests cũ)
// không cần đổi đường dẫn import.

export { LARGE_PRINT_DEFAULT_CONFIG } from '../modules/large-print/config/defaultConfig.js';
