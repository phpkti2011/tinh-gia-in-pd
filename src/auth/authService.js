// Auth service — wrapper around Supabase auth.
//
// Setup ở P2-01. Tất cả function handle null supabase gracefully (không crash
// khi env Supabase thiếu — dev vẫn chạy app được).

import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';

// Get current session (or null nếu chưa login / supabase chưa cấu hình)
export async function getCurrentSession() {
    if (!isSupabaseConfigured()) return null;
    try {
        const { data } = await supabase.auth.getSession();
        return data?.session ?? null;
    } catch (e) {
        console.warn('[Auth] getCurrentSession failed:', e?.message);
        return null;
    }
}

// Sign in với email + password
// Trả về { data, error } — match Supabase response shape
export async function signInWithPassword(email, password) {
    if (!isSupabaseConfigured()) {
        return {
            data: null,
            error: new Error('Supabase chưa cấu hình. Đặt VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY trong .env.local.'),
        };
    }
    return await supabase.auth.signInWithPassword({ email, password });
}

// Sign out
// Trả về { error } — match Supabase response shape
export async function signOut() {
    if (!isSupabaseConfigured()) return { error: null };
    return await supabase.auth.signOut();
}

// Subscribe to auth state changes
// callback(event, session) sẽ được gọi khi user login/logout/session refresh
// Trả về { data: { subscription: { unsubscribe } } } — match Supabase shape
export function onAuthStateChange(callback) {
    if (!isSupabaseConfigured()) {
        // Stub: trả subscription giả có unsubscribe noop
        return { data: { subscription: { unsubscribe: () => {} } } };
    }
    return supabase.auth.onAuthStateChange((event, session) => {
        callback(event, session);
    });
}
