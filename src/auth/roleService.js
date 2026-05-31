// roleService.js — P2-02. Helper functions cho role-based access.
//
// KHÔNG hardcode admin email/id. Mọi role được lookup từ Supabase user_roles.
// Nếu Supabase chưa cấu hình → tất cả function fallback an toàn (return null/false).

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

// 3 role hợp lệ — match check constraint trong supabase-user-roles.sql.
export const VALID_ROLES = ['admin', 'staff', 'viewer'];

/**
 * Strict admin check (case-sensitive, exact 'admin' only).
 * @param {string|null|undefined} role
 * @returns {boolean}
 */
export function isAdminRole(role) {
    return role === 'admin';
}

/**
 * Validate role value chỉ thuộc VALID_ROLES.
 * @param {*} role
 * @returns {boolean}
 */
export function isValidRole(role) {
    return typeof role === 'string' && VALID_ROLES.includes(role);
}

/**
 * Fetch role cho 1 user_id từ Supabase user_roles table.
 * Trả `null` nếu:
 *   - Supabase chưa cấu hình
 *   - userId rỗng/falsy
 *   - User chưa có row trong user_roles
 *   - Bất kỳ lỗi nào từ Supabase (đã được log qua console.warn)
 *
 * @param {string} userId — Supabase user uuid
 * @returns {Promise<string|null>}
 */
export async function getUserRole(userId) {
    if (!isSupabaseConfigured()) return null;
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', userId)
            .maybeSingle(); // null nếu không có row, không throw
        if (error) {
            console.warn('[roleService] getUserRole error:', error.message);
            return null;
        }
        return data?.role ?? null;
    } catch (e) {
        console.warn('[roleService] getUserRole threw:', e?.message);
        return null;
    }
}
