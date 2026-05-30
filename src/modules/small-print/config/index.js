// Small-print config module — barrel export.
//
// TASK-0010: tách config printConfig thành module riêng với:
//   - defaultConfig.js — bảng giá mặc định (nguồn chính)
//   - schema.js       — validateSmallPrintConfig(config)
//   - version.js      — SMALL_PRINT_CONFIG_SCHEMA_VERSION, MODULE_NAME, …
//
// Code cũ vẫn import từ src/config/defaultConfig.js (compat shim).

export { DEFAULT_CONFIG } from './defaultConfig.js';

export { validateSmallPrintConfig } from './schema.js';

export {
    SMALL_PRINT_MODULE_NAME,
    SMALL_PRINT_CONFIG_SCHEMA_VERSION,
    SMALL_PRINT_CONFIG_LAST_UPDATED,
} from './version.js';
