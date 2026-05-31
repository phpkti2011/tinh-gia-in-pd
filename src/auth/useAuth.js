// React hook cho auth state (P2-01).
//
// Usage:
//   const { session, user, loading, error, signIn, signOut } = useAuth();
//
// Hook tự subscribe vào onAuthStateChange — auto-update khi session thay đổi
// (login/logout từ tab khác, session refresh, …).
//
// P2-03: hook đã được wire vào AdminGate (src/auth/AdminGate.jsx) để gate 4
// SettingsPanel; vào ResultPanel để show cost columns khi admin. Password
// hardcoded cũ đã được xoá khỏi src/.

import { useState, useEffect, useCallback } from 'react';
import {
    getCurrentSession,
    signInWithPassword,
    signOut as svcSignOut,
    onAuthStateChange,
} from './authService.js';

export function useAuth() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initial load + subscribe to changes
    useEffect(() => {
        let mounted = true;

        getCurrentSession().then((s) => {
            if (mounted) {
                setSession(s);
                setLoading(false);
            }
        });

        const { data } = onAuthStateChange((event, s) => {
            if (mounted) setSession(s);
        });

        return () => {
            mounted = false;
            data?.subscription?.unsubscribe?.();
        };
    }, []);

    const signIn = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        const { data, error: err } = await signInWithPassword(email, password);
        setLoading(false);
        if (err) {
            setError(err.message || String(err));
            return false;
        }
        setSession(data?.session ?? null);
        return true;
    }, []);

    const signOut = useCallback(async () => {
        await svcSignOut();
        setSession(null);
        setError(null);
    }, []);

    return {
        session,
        user: session?.user ?? null,
        loading,
        error,
        signIn,
        signOut,
    };
}
