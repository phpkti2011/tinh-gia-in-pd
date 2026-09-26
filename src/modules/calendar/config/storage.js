import { CALENDAR_DEFAULT_CONFIG, CALENDAR_SCHEMA_VERSION } from './defaultConfig';
import { validateCalendarConfig } from './schema';
import { loadConfigFromSupabase, saveConfigToSupabase } from '../../../lib/priceConfigStore';

const KEY = 'calendarConfig';
const PENDING_KEY = 'calendarConfigPending';
let writeRevision = 0;
export function hasPendingCalendarConfig() {
    try {
        return localStorage.getItem(PENDING_KEY) === 'true';
    } catch {
        return false;
    }
}
export function loadCalendarConfig() {
    try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (validateCalendarConfig(saved).isValid) return saved;
    } catch {
        /* Missing/corrupt cache falls back only inside the calendar namespace. */
    }
    return structuredClone(CALENDAR_DEFAULT_CONFIG);
}

export async function loadCalendarFromCloud() {
    const revision = writeRevision;
    if (hasPendingCalendarConfig()) return loadCalendarConfig();
    try {
        const result = await loadConfigFromSupabase('calendar');
        if (revision !== writeRevision) return loadCalendarConfig();
        if (validateCalendarConfig(result?.data).isValid) {
            try {
                localStorage.setItem(KEY, JSON.stringify(result.data));
            } catch {
                /* Cloud data remains usable. */
            }
            return result.data;
        }
    } catch {
        /* Offline: retain local configuration. */
    }
    return loadCalendarConfig();
}

export async function saveCalendarConfig(config) {
    const validation = validateCalendarConfig(config);
    if (!validation.isValid)
        return { local: false, cloud: false, error: validation.errors.join(' ') };
    writeRevision++;
    let local = false;
    try {
        localStorage.setItem(KEY, JSON.stringify(config));
        local = true;
        localStorage.setItem(PENDING_KEY, 'true');
    } catch {
        /* Still attempt authenticated cloud save. */
    }
    try {
        const result = await saveConfigToSupabase('calendar', config, CALENDAR_SCHEMA_VERSION);
        if (result.ok) {
            try {
                localStorage.removeItem(PENDING_KEY);
            } catch {
                /* Retry remains safe. */
            }
        }
        return {
            local,
            cloud: result.ok,
            error: result.ok ? null : result.error?.message || 'Chưa đồng bộ được bảng giá lịch.',
        };
    } catch (error) {
        return { local, cloud: false, error: error.message };
    }
}
