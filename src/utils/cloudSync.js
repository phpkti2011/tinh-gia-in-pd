// Cloud sync via Google Sheets Apps Script
// URL sẽ được set sau khi deploy Apps Script

const DEFAULT_APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxkiJMGUHInjYV1FP29BwNh6yeY2_bVc4_c6pYS1jHp3ZKFsiKeSKe0UuyBnWArl4mA/exec';
let APPS_SCRIPT_URL = localStorage.getItem('appsScriptUrl') || DEFAULT_APPS_SCRIPT_URL;

export function setAppsScriptUrl(url) {
    APPS_SCRIPT_URL = url;
    localStorage.setItem('appsScriptUrl', url);
}

export function getAppsScriptUrl() {
    return APPS_SCRIPT_URL;
}

export function isCloudEnabled() {
    return !!APPS_SCRIPT_URL;
}

// Khôi phục Infinity từ null (JSON không hỗ trợ Infinity)
export function restoreInfinity(obj) {
    if (Array.isArray(obj)) return obj.map(restoreInfinity);
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v === null && (k === 'upTo' || k === 'max' || k === 'max_cost' || k === 'max_qty' || k === 'maxArea' || k === 'maxMeters')) {
                result[k] = Infinity;
            } else {
                result[k] = restoreInfinity(v);
            }
        }
        return result;
    }
    return obj;
}

// Đọc config từ cloud
export async function fetchCloudConfig(moduleName) {
    if (!APPS_SCRIPT_URL) return null;
    try {
        const url = `${APPS_SCRIPT_URL}?module=${encodeURIComponent(moduleName)}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data ? restoreInfinity(data) : null;
    } catch (e) {
        console.warn(`[CloudSync] Không thể đọc config "${moduleName}" từ cloud:`, e.message);
        return null;
    }
}

// Đọc tất cả config từ cloud
export async function fetchAllCloudConfigs() {
    if (!APPS_SCRIPT_URL) return null;
    try {
        const res = await fetch(APPS_SCRIPT_URL);
        if (!res.ok) return null;
        return await res.json();
    } catch (e) {
        console.warn('[CloudSync] Không thể đọc tất cả config từ cloud:', e.message);
        return null;
    }
}

// Lưu config lên cloud (cần password admin)
export async function saveCloudConfig(moduleName, config, password) {
    if (!APPS_SCRIPT_URL) return { error: 'Chưa cấu hình URL Apps Script' };
    try {
        const res = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' }, // Apps Script cần text/plain để tránh CORS preflight
            body: JSON.stringify({ module: moduleName, config, password }),
        });
        if (!res.ok) return { error: `HTTP ${res.status}` };
        return await res.json();
    } catch (e) {
        console.warn(`[CloudSync] Không thể lưu config "${moduleName}" lên cloud:`, e.message);
        return { error: e.message };
    }
}

// Sync: đọc cloud → merge vào localStorage → trả về config mới nhất
export async function syncConfig(moduleName, localConfig, defaultConfig, mergeDeepFn) {
    const cloudConfig = await fetchCloudConfig(moduleName);
    if (cloudConfig && typeof cloudConfig === 'object' && !cloudConfig.error) {
        // Cloud có data → dùng cloud (ưu tiên cloud hơn local)
        const merged = mergeDeepFn
            ? mergeDeepFn(JSON.parse(JSON.stringify(defaultConfig)), cloudConfig)
            : { ...defaultConfig, ...cloudConfig };
        return merged;
    }
    // Cloud không có → dùng local
    return localConfig;
}
