// UV DTF config module — barrel export.
//
// TASK-0013: re-org config uvdtf thành module riêng với:
//   - defaultConfig.js — bảng giá mặc định (nguồn chính)
//   - schema.js       — validateUvDtfConfig(config)
//   - version.js      — UVDTF_CONFIG_SCHEMA_VERSION, UVDTF_MODULE_NAME, …
//
// Code cũ vẫn import từ src/config/uvdtfConfig.js (compat shim).

export { UVDTF_DEFAULT_CONFIG } from './defaultConfig.js';

export { validateUvDtfConfig } from './schema.js';

export {
    UVDTF_MODULE_NAME,
    UVDTF_CONFIG_SCHEMA_VERSION,
    UVDTF_CONFIG_LAST_UPDATED,
} from './version.js';
