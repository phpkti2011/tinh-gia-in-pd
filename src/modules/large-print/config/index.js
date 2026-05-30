// Large-print config module — barrel export.
//
// TASK-0017: re-org config large-print thành module riêng với:
//   - defaultConfig.js — bảng giá mặc định (nguồn chính)
//   - schema.js       — validateLargePrintConfig(config)
//   - version.js      — LARGE_PRINT_CONFIG_SCHEMA_VERSION, MODULE_NAME, …
//
// Code cũ vẫn import từ src/config/largePrintConfig.js (compat shim).

export { LARGE_PRINT_DEFAULT_CONFIG } from './defaultConfig.js';

export { validateLargePrintConfig } from './schema.js';

export {
    LARGE_PRINT_MODULE_NAME,
    LARGE_PRINT_CONFIG_SCHEMA_VERSION,
    LARGE_PRINT_CONFIG_LAST_UPDATED,
} from './version.js';
