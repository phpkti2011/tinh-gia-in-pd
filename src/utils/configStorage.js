import { DEFAULT_CONFIG } from '../config/defaultConfig';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../config/largePrintConfig';
import { DECAL_DEFAULT_CONFIG } from '../config/decalConfig';
import { UVDTF_DEFAULT_CONFIG } from '../config/uvdtfConfig';
import { fetchCloudConfig, isCloudEnabled, restoreInfinity } from './cloudSync';
import { validateDecalConfig, DECAL_CONFIG_SCHEMA_VERSION } from '../modules/decal/config/index.js';
import { validateSmallPrintConfig, SMALL_PRINT_CONFIG_SCHEMA_VERSION } from '../modules/small-print/config/index.js';
import { validateUvDtfConfig, UVDTF_CONFIG_SCHEMA_VERSION } from '../modules/uvdtf/config/index.js';
import { validateLargePrintConfig, LARGE_PRINT_CONFIG_SCHEMA_VERSION } from '../modules/large-print/config/index.js';
import { loadConfigFromSupabase, saveConfigToSupabase } from '../lib/priceConfigStore.js';

// LƯU Ý: P2-05.4 đã xoá `saveCloudConfig` khỏi save path (không gọi Apps Script
// khi admin lưu). `saveCloudConfig` vẫn còn export trong cloudSync.js — chỉ
// được dùng nếu caller bên ngoài cần. Read fallback `fetchCloudConfig` vẫn giữ
// đến P2-05.6.

// TASK-0005.5: deep schema validation cho decal config (bổ sung cho shallow
// isValidConfig). Trả về true nếu pass; warn + return false nếu fail.
function deepValidateDecal(data, source) {
    const v = validateDecalConfig(data);
    if (!v.isValid) {
        console.warn(`[ConfigStorage] ${source} decalConfig không pass schema:`, v.errors);
        return false;
    }
    return true;
}

// TASK-0010: deep schema validation cho small-print config (printConfig).
function deepValidatePrint(data, source) {
    const v = validateSmallPrintConfig(data);
    if (!v.isValid) {
        console.warn(`[ConfigStorage] ${source} printConfig không pass schema:`, v.errors);
        return false;
    }
    return true;
}

// TASK-0013: deep schema validation cho UV DTF config (uvdtfConfig).
function deepValidateUvdtf(data, source) {
    const v = validateUvDtfConfig(data);
    if (!v.isValid) {
        console.warn(`[ConfigStorage] ${source} uvdtfConfig không pass schema:`, v.errors);
        return false;
    }
    return true;
}

// TASK-0017: deep schema validation cho large-print config (largePrintConfig).
function deepValidateLargePrint(data, source) {
    const v = validateLargePrintConfig(data);
    if (!v.isValid) {
        console.warn(`[ConfigStorage] ${source} largePrintConfig không pass schema:`, v.errors);
        return false;
    }
    return true;
}

// Module name → localStorage key → default config → Supabase module key + schemaVersion.
// P2-05.3: supabaseKey để map sang enum trong Supabase price_configs.module
// (CHECK constraint trong docs/database/supabase-price-configs.sql).
// P2-05.4: schemaVersion để truyền vào saveConfigToSupabase RPC.
const MODULE_MAP = {
    printConfig:      { key: 'printConfig',      default: DEFAULT_CONFIG,             supabaseKey: 'small-print', schemaVersion: SMALL_PRINT_CONFIG_SCHEMA_VERSION },
    largePrintConfig: { key: 'largePrintConfig', default: LARGE_PRINT_DEFAULT_CONFIG, supabaseKey: 'large-print', schemaVersion: LARGE_PRINT_CONFIG_SCHEMA_VERSION },
    decalConfig:      { key: 'decalConfig',      default: DECAL_DEFAULT_CONFIG,       supabaseKey: 'decal',       schemaVersion: DECAL_CONFIG_SCHEMA_VERSION },
    uvdtfConfig:      { key: 'uvdtfConfig',      default: UVDTF_DEFAULT_CONFIG,       supabaseKey: 'uvdtf',       schemaVersion: UVDTF_CONFIG_SCHEMA_VERSION },
};

// Kiểm tra config có đủ key thiết yếu và giá trị hợp lệ không (tránh dùng data rác)
function isValidConfig(moduleName, data) {
    if (!data || typeof data !== 'object') return false;
    const requiredArrayKeys = {
        printConfig: ['PAPER_STOCK_DATA', 'PROFIT_MARGIN_TIERS'],
        largePrintConfig: [],
        decalConfig: ['progressiveTiers'],
        uvdtfConfig: ['priceTiers'],
    };
    const requiredObjectKeys = {
        printConfig: ['PRINTER_CONFIG'],
        largePrintConfig: ['MATERIAL_TYPES', 'FINISHING_PRICES'],
        decalConfig: ['decalCosts'],
        uvdtfConfig: [],
    };
    const requiredOtherKeys = {
        printConfig: [],
        largePrintConfig: [],
        decalConfig: ['basePrintWidth'],
        uvdtfConfig: ['printableWidthCM'],
    };
    const arrKeys = requiredArrayKeys[moduleName] || [];
    const objKeys = requiredObjectKeys[moduleName] || [];
    const otherKeys = requiredOtherKeys[moduleName] || [];
    return arrKeys.every(k => Array.isArray(data[k]) && data[k].length > 0)
        && objKeys.every(k => data[k] && typeof data[k] === 'object' && !Array.isArray(data[k]))
        && otherKeys.every(k => data[k] != null);
}

// Async: load config ưu tiên Supabase → Apps Script cloud → localStorage → default.
// P2-05.3: thêm Supabase block ở đầu. Apps Script vẫn còn làm fallback đến P2-05.6.
// Nếu Supabase chưa cấu hình env / chưa có row / data invalid → fallback xuống Apps Script.
export async function loadConfigFromCloud(moduleName) {
    const mod = MODULE_MAP[moduleName];
    if (!mod) return null;
    const defaultCfg = JSON.parse(JSON.stringify(mod.default));

    // P2-05.3: Thử Supabase trước (priority cao nhất).
    // Adapter handle null Supabase gracefully → trả null, không throw.
    // restoreInfinity() khôi phục Infinity từ null trong jsonb (giống Apps Script
    // + localStorage path) — vì jsonb serialization làm mất Infinity giống JSON.
    if (mod.supabaseKey) {
        try {
            const supaResult = await loadConfigFromSupabase(mod.supabaseKey);
            const supaData = supaResult?.data ? restoreInfinity(supaResult.data) : null;
            if (isValidConfig(moduleName, supaData)) {
                // Deep schema check (cùng pattern với cloud + localStorage block bên dưới)
                if (moduleName === 'decalConfig' && !deepValidateDecal(supaData, 'supabase')) {
                    // skip — fallback Apps Script
                } else if (moduleName === 'printConfig' && !deepValidatePrint(supaData, 'supabase')) {
                    // skip — fallback Apps Script
                } else if (moduleName === 'uvdtfConfig' && !deepValidateUvdtf(supaData, 'supabase')) {
                    // skip — fallback Apps Script
                } else if (moduleName === 'largePrintConfig' && !deepValidateLargePrint(supaData, 'supabase')) {
                    // skip — fallback Apps Script
                } else {
                    localStorage.setItem(mod.key, JSON.stringify(supaData));
                    return supaData;
                }
            }
        } catch (e) {
            console.warn(`[ConfigStorage] Supabase load failed for ${moduleName}:`, e.message);
        }
    }

    // Fallback: Apps Script cloud (giữ đến P2-05.6 khi remove Apps Script hoàn toàn)
    if (isCloudEnabled()) {
        try {
            const cloudData = await fetchCloudConfig(moduleName);
            if (isValidConfig(moduleName, cloudData)) {
                // TASK-0005.5 / TASK-0010 / TASK-0013 / TASK-0017:
                // deep schema check cho decal + print + uvdtf + large-print
                if (moduleName === 'decalConfig' && !deepValidateDecal(cloudData, 'cloud')) {
                    // skip — fallback
                } else if (moduleName === 'printConfig' && !deepValidatePrint(cloudData, 'cloud')) {
                    // skip — fallback
                } else if (moduleName === 'uvdtfConfig' && !deepValidateUvdtf(cloudData, 'cloud')) {
                    // skip — fallback
                } else if (moduleName === 'largePrintConfig' && !deepValidateLargePrint(cloudData, 'cloud')) {
                    // skip — fallback
                } else {
                    localStorage.setItem(mod.key, JSON.stringify(cloudData));
                    return cloudData;
                }
            }
        } catch (e) {
            console.warn(`[ConfigStorage] Cloud load failed for ${moduleName}:`, e.message);
        }
    }

    // Fallback localStorage
    try {
        const saved = localStorage.getItem(mod.key);
        if (saved) {
            const parsed = restoreInfinity(JSON.parse(saved));
            if (isValidConfig(moduleName, parsed)) {
                // TASK-0005.5 / TASK-0010 / TASK-0013 / TASK-0017:
                // deep schema check cho decal + print + uvdtf + large-print
                if (moduleName === 'decalConfig' && !deepValidateDecal(parsed, 'localStorage')) {
                    // skip — fallback default
                } else if (moduleName === 'printConfig' && !deepValidatePrint(parsed, 'localStorage')) {
                    // skip — fallback default
                } else if (moduleName === 'uvdtfConfig' && !deepValidateUvdtf(parsed, 'localStorage')) {
                    // skip — fallback default
                } else if (moduleName === 'largePrintConfig' && !deepValidateLargePrint(parsed, 'localStorage')) {
                    // skip — fallback default
                } else {
                    return parsed;
                }
            }
        }
    } catch (e) {}

    // Cuối cùng dùng default (deep clone, rồi khôi phục Infinity)
    return restoreInfinity(defaultCfg);
}

// Async: save config vào localStorage + Supabase cloud.
// P2-05.4: Đã chuyển save path từ Apps Script sang Supabase. Apps Script
// `saveCloudConfig` KHÔNG còn được gọi trong save path (nhưng vẫn giữ
// `fetchCloudConfig` ở read fallback đến P2-05.6).
//
// Param `_password` (legacy, không dùng): giữ tham số thứ 3 để backward compat
// với caller cũ truyền password Apps Script. Sẽ xoá hoàn toàn ở P2-05.6.
//
// Return shape (P2-05.4):
//   {
//     local:       boolean,           — đã ghi localStorage chưa
//     cloud:       boolean,           — đã ghi Supabase chưa
//     error:       null | string,     — message nếu fail
//     provider:    'supabase',        — provider cloud
//     newVersion:  number | null      — version mới do RPC trả (nếu cloud thành công)
//   }
export async function saveConfigToCloud(moduleName, config, _password) {
    const mod = MODULE_MAP[moduleName];
    if (!mod) {
        return { local: false, cloud: false, error: `Unknown module: ${moduleName}`, provider: 'supabase', newVersion: null };
    }

    // 1. Validate config TRƯỚC khi ghi bất kỳ nơi nào (giữ pattern TASK-0005.5/0010/0013/0017)
    if (moduleName === 'decalConfig' && !deepValidateDecal(config, 'saveConfigToCloud')) {
        const v = validateDecalConfig(config);
        return { local: false, cloud: false, error: `Decal config invalid: ${v.errors.join('; ')}`, provider: 'supabase', newVersion: null };
    }
    if (moduleName === 'printConfig' && !deepValidatePrint(config, 'saveConfigToCloud')) {
        const v = validateSmallPrintConfig(config);
        return { local: false, cloud: false, error: `Print config invalid: ${v.errors.join('; ')}`, provider: 'supabase', newVersion: null };
    }
    if (moduleName === 'uvdtfConfig' && !deepValidateUvdtf(config, 'saveConfigToCloud')) {
        const v = validateUvDtfConfig(config);
        return { local: false, cloud: false, error: `UV DTF config invalid: ${v.errors.join('; ')}`, provider: 'supabase', newVersion: null };
    }
    if (moduleName === 'largePrintConfig' && !deepValidateLargePrint(config, 'saveConfigToCloud')) {
        const v = validateLargePrintConfig(config);
        return { local: false, cloud: false, error: `Large print config invalid: ${v.errors.join('; ')}`, provider: 'supabase', newVersion: null };
    }

    // 2. Luôn lưu localStorage (admin không mất dữ liệu trên máy dù cloud fail)
    try {
        localStorage.setItem(mod.key, JSON.stringify(config));
    } catch (e) {
        // QuotaExceeded, private mode, …
        return { local: false, cloud: false, error: `localStorage save failed: ${e.message}`, provider: 'supabase', newVersion: null };
    }

    // 3. Lưu Supabase qua RPC save_price_config (transactional version + log)
    try {
        const result = await saveConfigToSupabase(
            mod.supabaseKey,
            config,
            mod.schemaVersion,
            null  // note — UI có thể truyền sau ở Phase 3
        );
        if (!result.ok) {
            const errMsg = result.error?.message || String(result.error) || 'Unknown Supabase save error';
            console.warn(`[ConfigStorage] Supabase save failed for ${moduleName}: ${errMsg}`);
            return { local: true, cloud: false, error: errMsg, provider: 'supabase', newVersion: null };
        }
        return {
            local: true,
            cloud: true,
            error: null,
            provider: 'supabase',
            newVersion: result.newVersion,
        };
    } catch (e) {
        return { local: true, cloud: false, error: e.message, provider: 'supabase', newVersion: null };
    }
}

function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
}

export function mergeDeep(target, source) {
    let output = Object.assign({}, target);
    if (isObject(target) && isObject(source)) {
        Object.keys(source).forEach(key => {
            if (isObject(source[key])) {
                if (!(key in target))
                    Object.assign(output, { [key]: source[key] });
                else
                    output[key] = mergeDeep(target[key], source[key]);
            } else if (Array.isArray(source[key])) {
                 if ((key === 'CUSTOMER_PRICE_TIERS' || key === 'PROFIT_MARGIN_TIERS' || key === 'cost_tiers' || key === 'customer_tiers' || key === 'tiers' || key === 'clickTiers' || key === 'vkPoints' || key === 'COMMON_SHEET_SIZES' || key === 'DECAL_SHEET_SIZES') && source[key].length > 0) {
                    output[key] = JSON.parse(JSON.stringify(source[key]));
                 } else if (Array.isArray(target[key])) {
                    output[key] = JSON.parse(JSON.stringify(target[key]));
                } else {
                    output[key] = JSON.parse(JSON.stringify(source[key]));
                }
            } else {
                Object.assign(output, { [key]: source[key] });
            }
        });
    }
    return output;
}

export function loadConfig() {
    try {
        const savedConfigStr = localStorage.getItem('printConfig');
        if (savedConfigStr) {
            const parsed = restoreInfinity(JSON.parse(savedConfigStr));
            if (isValidConfig('printConfig', parsed)) {
                // TASK-0010: deep schema validation thay cho chỉ shallow key check
                if (deepValidatePrint(parsed, 'localStorage')) return parsed;
                // else fallback
            } else {
                console.warn("[ConfigStorage] localStorage printConfig thiếu key thiết yếu, dùng config mặc định.");
            }
        }
    } catch(e) {
        console.error("Lỗi khi đọc config từ localStorage:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
}

export function saveConfig(config) {
    // TASK-0010: gate trước khi ghi localStorage. Trả về false để caller
    // (SettingsPanel.handleSave) biết và hiển thị lỗi.
    if (!deepValidatePrint(config, 'saveConfig')) return false;
    try {
        localStorage.setItem('printConfig', JSON.stringify(config));
        return true;
    } catch(e) {
        console.error("Lỗi khi lưu config:", e);
        return false;
    }
}

export function loadLargePrintConfig() {
    try {
        const saved = localStorage.getItem('largePrintConfig');
        if (saved) {
            const parsed = restoreInfinity(JSON.parse(saved));
            if (isValidConfig('largePrintConfig', parsed)) {
                // TASK-0017: deep schema validation thay cho chỉ shallow key check
                if (deepValidateLargePrint(parsed, 'localStorage')) return parsed;
                // else fallback
            } else {
                console.warn("[ConfigStorage] localStorage largePrintConfig thiếu key thiết yếu, dùng config mặc định.");
            }
        }
    } catch(e) {
        console.error("Lỗi khi đọc large print config:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(LARGE_PRINT_DEFAULT_CONFIG)));
}

export function saveLargePrintConfig(config) {
    // TASK-0017: gate trước khi ghi localStorage. Trả về false để caller
    // (LPSettingsPanel.handleSave) biết và hiển thị lỗi.
    if (!deepValidateLargePrint(config, 'saveLargePrintConfig')) return false;
    try {
        localStorage.setItem('largePrintConfig', JSON.stringify(config));
        return true;
    } catch(e) {
        console.error("Lỗi khi lưu large print config:", e);
        return false;
    }
}

export function loadDecalConfig() {
    try {
        const saved = localStorage.getItem('decalConfig');
        if (saved) {
            const parsed = restoreInfinity(JSON.parse(saved));
            if (isValidConfig('decalConfig', parsed)) {
                // TASK-0005.5: deep schema validation thay cho chỉ shallow key check
                if (deepValidateDecal(parsed, 'localStorage')) return parsed;
                // Nếu deep fail thì rơi xuống default
            } else {
                console.warn("[ConfigStorage] localStorage decalConfig thiếu key thiết yếu, dùng config mặc định.");
            }
        }
    } catch(e) {
        console.error("Lỗi khi đọc decal config:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(DECAL_DEFAULT_CONFIG)));
}

export function saveDecalConfig(config) {
    // TASK-0005.5: gate trước khi ghi localStorage. Trả về false để caller
    // (DecalSettingsPanel.handleSave) biết và hiển thị lỗi.
    if (!deepValidateDecal(config, 'saveDecalConfig')) return false;
    try {
        localStorage.setItem('decalConfig', JSON.stringify(config));
        return true;
    } catch(e) {
        console.error("Lỗi khi lưu decal config:", e);
        return false;
    }
}

export function loadUvdtfConfig() {
    try {
        const saved = localStorage.getItem('uvdtfConfig');
        if (saved) {
            const parsed = restoreInfinity(JSON.parse(saved));
            if (isValidConfig('uvdtfConfig', parsed)) {
                // TASK-0013: deep schema validation thay cho chỉ shallow key check
                if (deepValidateUvdtf(parsed, 'localStorage')) return parsed;
                // else fallback
            } else {
                console.warn("[ConfigStorage] localStorage uvdtfConfig thiếu key thiết yếu, dùng config mặc định.");
            }
        }
    } catch(e) {
        console.error("Lỗi khi đọc UV DTF config:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(UVDTF_DEFAULT_CONFIG)));
}

export function saveUvdtfConfig(config) {
    // TASK-0013: gate trước khi ghi localStorage. Trả về false để caller
    // (UvdtfSettingsPanel.handleSave) biết và hiển thị lỗi.
    if (!deepValidateUvdtf(config, 'saveUvdtfConfig')) return false;
    try {
        localStorage.setItem('uvdtfConfig', JSON.stringify(config));
        return true;
    } catch(e) {
        console.error("Lỗi khi lưu UV DTF config:", e);
        return false;
    }
}
