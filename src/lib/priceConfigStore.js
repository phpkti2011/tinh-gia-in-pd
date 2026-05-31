// priceConfigStore.js — P2-05.2. Adapter đọc/ghi price config qua Supabase.
//
// KHÔNG wire vào configStorage.js / SettingsPanel ở P2-05.2 — chờ P2-05.3/04.
// Tất cả function handle Supabase chưa cấu hình gracefully (return null/[]/ok=false,
// không crash, không throw).
//
// Phụ thuộc:
//   - docs/database/supabase-price-configs.sql đã chạy trong Supabase Dashboard
//     (3 bảng + helper is_admin() + RPC function save_price_config).
//   - Nếu chưa setup: load* trả null/[], save* trả ok=false + error.

import { supabase, isSupabaseConfigured } from './supabaseClient.js';

/**
 * Check xem Supabase client (và do đó price config store) có sẵn sàng không.
 * @returns {boolean}
 */
export function isPriceConfigStoreAvailable() {
    return isSupabaseConfigured();
}

/**
 * Đọc current config của 1 module từ Supabase.
 * @param {string} module - 'decal' | 'small-print' | 'large-print' | 'uvdtf'
 * @returns {Promise<{data, current_version, schema_version, updated_at}|null>}
 *          null khi: Supabase chưa cấu hình / module rỗng / không có row / lỗi.
 */
export async function loadConfigFromSupabase(module) {
    if (!isSupabaseConfigured()) return null;
    if (!module) return null;

    try {
        const { data, error } = await supabase
            .from('price_configs')
            .select('data, current_version, schema_version, updated_at')
            .eq('module', module)
            .maybeSingle();
        if (error) {
            console.warn('[priceConfigStore] loadConfigFromSupabase error:', error.message);
            return null;
        }
        return data ?? null;
    } catch (e) {
        console.warn('[priceConfigStore] loadConfigFromSupabase threw:', e?.message);
        return null;
    }
}

/**
 * Save config qua RPC `save_price_config` (transactional: version + upsert + log).
 * @param {string} module
 * @param {object} data - Toàn bộ config object
 * @param {string} schemaVersion - vd '1.0.0'
 * @param {string|null} note - Ghi chú admin (optional)
 * @returns {Promise<{ok: boolean, error: Error|null, newVersion: number|null}>}
 */
export async function saveConfigToSupabase(module, data, schemaVersion, note = null) {
    if (!isSupabaseConfigured()) {
        return {
            ok: false,
            error: new Error('Supabase chưa cấu hình. Đặt VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY trong .env.local.'),
            newVersion: null,
        };
    }
    if (!module) {
        return { ok: false, error: new Error('Module required'), newVersion: null };
    }

    try {
        const { data: rpcResult, error } = await supabase.rpc('save_price_config', {
            p_module: module,
            p_data: data,
            p_schema_version: schemaVersion,
            p_note: note,
        });
        if (error) {
            console.warn('[priceConfigStore] saveConfigToSupabase RPC error:', error.message);
            return { ok: false, error, newVersion: null };
        }
        // RPC trả jsonb: { ok, module, new_version, action }
        return {
            ok: rpcResult?.ok === true,
            error: null,
            newVersion: rpcResult?.new_version ?? null,
        };
    } catch (e) {
        console.warn('[priceConfigStore] saveConfigToSupabase threw:', e?.message);
        return { ok: false, error: e, newVersion: null };
    }
}

/**
 * Đọc version history của 1 module (latest first).
 * @param {string} module
 * @param {number} [limit=20]
 * @returns {Promise<Array>} [] khi: Supabase chưa cấu hình / module rỗng / lỗi / không có row.
 */
export async function loadVersionHistory(module, limit = 20) {
    if (!isSupabaseConfigured()) return [];
    if (!module) return [];

    try {
        const { data, error } = await supabase
            .from('price_config_versions')
            .select('id, version, schema_version, note, created_by, created_at')
            .eq('module', module)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.warn('[priceConfigStore] loadVersionHistory error:', error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.warn('[priceConfigStore] loadVersionHistory threw:', e?.message);
        return [];
    }
}

/**
 * Đọc change log của 1 module (latest first).
 * @param {string} module
 * @param {number} [limit=20]
 * @returns {Promise<Array>} [] khi: Supabase chưa cấu hình / module rỗng / lỗi / không có row.
 */
export async function loadChangeLog(module, limit = 20) {
    if (!isSupabaseConfigured()) return [];
    if (!module) return [];

    try {
        const { data, error } = await supabase
            .from('price_change_logs')
            .select('id, action, old_version, new_version, note, changed_by, created_at')
            .eq('module', module)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) {
            console.warn('[priceConfigStore] loadChangeLog error:', error.message);
            return [];
        }
        return data || [];
    } catch (e) {
        console.warn('[priceConfigStore] loadChangeLog threw:', e?.message);
        return [];
    }
}
