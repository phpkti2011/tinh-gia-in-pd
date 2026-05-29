// Decal config module — barrel export.
//
// TASK-0005: re-org config decal thành module riêng với:
//   - defaultConfig.js — bảng giá mặc định (nguồn chính)
//   - schema.js       — validateDecalConfig(config)
//   - version.js      — DECAL_CONFIG_SCHEMA_VERSION, DECAL_MODULE_NAME, …
//
// Code cũ vẫn import từ src/config/decalConfig.js (compat shim, re-export
// lại từ ./defaultConfig.js) để khỏi vỡ.

export { DECAL_DEFAULT_CONFIG } from './defaultConfig.js';

export { validateDecalConfig } from './schema.js';

export {
    DECAL_MODULE_NAME,
    DECAL_CONFIG_SCHEMA_VERSION,
    DECAL_CONFIG_LAST_UPDATED,
} from './version.js';
