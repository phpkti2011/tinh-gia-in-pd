// Supabase client — singleton.
//
// Setup ở P2-01 (Phase 2 — Supabase Auth foundation).
//
// Env vars (đặt trong .env.local, KHÔNG commit):
//   - VITE_SUPABASE_URL
//   - VITE_SUPABASE_ANON_KEY
//
// Nếu thiếu env: client = null (KHÔNG crash trắng màn hình).
// Caller phải check `isSupabaseConfigured()` trước khi gọi auth functions
// hoặc dùng wrapper trong src/auth/authService.js (đã handle null gracefully).

import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let _supabase = null;

if (!url || !anonKey) {
    // Dev warning — không throw để app vẫn chạy được (cho dev không setup Supabase).
    // Production: env vars phải set qua Vercel/CI; nếu thiếu, auth sẽ silently disabled.
    console.warn(
        '[Supabase] VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY thiếu trong env. ' +
        'Auth sẽ KHÔNG hoạt động — set chúng trong .env.local (xem .env.example).'
    );
} else {
    _supabase = createClient(url, anonKey);
}

export const supabase = _supabase;

export function isSupabaseConfigured() {
    return _supabase !== null;
}
