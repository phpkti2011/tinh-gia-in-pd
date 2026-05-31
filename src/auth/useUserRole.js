// useUserRole.js — P2-02. React hook đọc role của user hiện tại.
//
// Auto-fetch khi user.id thay đổi. Expose `refreshRole()` để re-fetch thủ công
// (ví dụ sau khi admin vừa cập nhật role qua Dashboard).
//
// P2-03: đã wire qua AdminGate (src/auth/AdminGate.jsx) để gate 4 SettingsPanel.

import { useState, useEffect, useCallback } from 'react';
import { getUserRole, isAdminRole } from './roleService.js';

/**
 * @param {object|null} user - Supabase user (từ useAuth().user). Có thể null khi chưa login.
 * @returns {{
 *   role: string|null,
 *   isAdmin: boolean,
 *   loading: boolean,
 *   error: string|null,
 *   refreshRole: () => Promise<void>
 * }}
 */
export function useUserRole(user) {
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchRole = useCallback(async () => {
        if (!user?.id) {
            setRole(null);
            setLoading(false);
            setError(null);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const r = await getUserRole(user.id);
            setRole(r);
        } catch (e) {
            setError(e?.message || String(e));
            setRole(null);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        fetchRole().catch(() => {
            // Errors đã được handle trong fetchRole (set state).
            // Catch ở đây chỉ để tránh unhandled promise warning.
        });
        // P3-LINT.3: bỏ `mounted` flag — useEffect setState sau unmount là safe
        // no-op trong React 18 (chỉ warn nhẹ trong dev). Nếu cần strict-cleanup
        // sau này, dùng AbortController.
    }, [fetchRole]);

    return {
        role,
        isAdmin: isAdminRole(role),
        loading,
        error,
        refreshRole: fetchRole,
    };
}
