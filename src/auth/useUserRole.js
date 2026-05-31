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
        let mounted = true;
        fetchRole().catch(() => {
            // Errors đã được handle trong fetchRole (set state).
            // Catch ở đây chỉ để tránh unhandled promise warning.
        });
        // Cleanup: nếu unmount trước khi fetch xong, state update sẽ bị React skip
        // (setState trên unmounted component chỉ là no-op + warn trong dev mode).
        // mounted flag không strictly cần thiết vì state updates đều an toàn,
        // nhưng giữ pattern để rõ ý.
        return () => { mounted = false; };
    }, [fetchRole]);

    return {
        role,
        isAdmin: isAdminRole(role),
        loading,
        error,
        refreshRole: fetchRole,
    };
}
