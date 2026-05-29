import { DEFAULT_CONFIG } from '../config/defaultConfig';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../config/largePrintConfig';
import { DECAL_DEFAULT_CONFIG } from '../config/decalConfig';
import { UVDTF_DEFAULT_CONFIG } from '../config/uvdtfConfig';
import { fetchCloudConfig, saveCloudConfig, isCloudEnabled, restoreInfinity } from './cloudSync';
import { validateDecalConfig } from '../modules/decal/config/index.js';

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

// Module name → localStorage key → default config mapping
const MODULE_MAP = {
    printConfig: { key: 'printConfig', default: DEFAULT_CONFIG },
    largePrintConfig: { key: 'largePrintConfig', default: LARGE_PRINT_DEFAULT_CONFIG },
    decalConfig: { key: 'decalConfig', default: DECAL_DEFAULT_CONFIG },
    uvdtfConfig: { key: 'uvdtfConfig', default: UVDTF_DEFAULT_CONFIG },
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

// Async: load config ưu tiên cloud → localStorage → default
export async function loadConfigFromCloud(moduleName) {
    const mod = MODULE_MAP[moduleName];
    if (!mod) return null;
    const defaultCfg = JSON.parse(JSON.stringify(mod.default));

    // Thử cloud trước
    if (isCloudEnabled()) {
        try {
            const cloudData = await fetchCloudConfig(moduleName);
            if (isValidConfig(moduleName, cloudData)) {
                // TASK-0005.5: thêm deep schema check cho decal
                if (moduleName === 'decalConfig' && !deepValidateDecal(cloudData, 'cloud')) {
                    // skip — sẽ fallback localStorage/default bên dưới
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
                // TASK-0005.5: thêm deep schema check cho decal
                if (moduleName === 'decalConfig' && !deepValidateDecal(parsed, 'localStorage')) {
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

// Async: save config vào cả localStorage + cloud
export async function saveConfigToCloud(moduleName, config, password) {
    const mod = MODULE_MAP[moduleName];
    if (!mod) return false;

    // TASK-0005.5: gate decal config bằng schema validation TRƯỚC khi ghi
    // bất kỳ nơi nào (localStorage + cloud). Module khác giữ behavior cũ.
    if (moduleName === 'decalConfig' && !deepValidateDecal(config, 'saveConfigToCloud')) {
        const v = validateDecalConfig(config);
        return { local: false, cloud: false, error: `Decal config invalid: ${v.errors.join('; ')}` };
    }

    // Luôn lưu localStorage
    localStorage.setItem(mod.key, JSON.stringify(config));

    // Lưu cloud nếu có
    if (isCloudEnabled() && password) {
        try {
            const result = await saveCloudConfig(moduleName, config, password);
            if (result.error) {
                console.warn(`[ConfigStorage] Cloud save failed: ${result.error}`);
                return { local: true, cloud: false, error: result.error };
            }
            return { local: true, cloud: true };
        } catch (e) {
            return { local: true, cloud: false, error: e.message };
        }
    }
    return { local: true, cloud: false };
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
            if (isValidConfig('printConfig', parsed)) return parsed;
            console.warn("[ConfigStorage] localStorage printConfig không hợp lệ, dùng config mặc định.");
        }
    } catch(e) {
        console.error("Lỗi khi đọc config từ localStorage:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
}

export function saveConfig(config) {
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
            if (isValidConfig('largePrintConfig', parsed)) return parsed;
            console.warn("[ConfigStorage] localStorage largePrintConfig không hợp lệ, dùng config mặc định.");
        }
    } catch(e) {
        console.error("Lỗi khi đọc large print config:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(LARGE_PRINT_DEFAULT_CONFIG)));
}

export function saveLargePrintConfig(config) {
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
            if (isValidConfig('uvdtfConfig', parsed)) return parsed;
            console.warn("[ConfigStorage] localStorage uvdtfConfig không hợp lệ, dùng config mặc định.");
        }
    } catch(e) {
        console.error("Lỗi khi đọc UV DTF config:", e);
    }
    return restoreInfinity(JSON.parse(JSON.stringify(UVDTF_DEFAULT_CONFIG)));
}

export function saveUvdtfConfig(config) {
    try {
        localStorage.setItem('uvdtfConfig', JSON.stringify(config));
        return true;
    } catch(e) {
        console.error("Lỗi khi lưu UV DTF config:", e);
        return false;
    }
}
