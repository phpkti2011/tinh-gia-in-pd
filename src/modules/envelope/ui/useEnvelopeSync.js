import { useCallback, useEffect, useRef, useState } from 'react';
import { loadEnvelopeFromCloud, envelopeSyncError } from '../config/storage';

// Đồng bộ bảng giá bao thư + KTS từ máy chủ (theo mẫu useCalendarSync): tải khi mở, mỗi 15 giây
// khi tab hiện, khi focus/online; offline chặn ngay và phản hồi cũ không mở lại giá.
export const ENVELOPE_SYNC_INTERVAL = 15000;
export const ENVELOPE_OFFLINE_MESSAGE =
    'Mất kết nối máy chủ. Tạm dừng báo giá để tránh dùng giá cũ; phần mềm sẽ tự đồng bộ khi có mạng.';

export function useEnvelopeSync(ownerId) {
    const [snapshot, setSnapshot] = useState({ ready: false, version: null, loading: true });
    const latest = useRef(snapshot);
    const generation = useRef(0);
    const inFlight = useRef(null);
    const active = useRef(true);
    const apply = useCallback((value) => {
        latest.current = value;
        setSnapshot(value);
    }, []);
    const invalidate = useCallback(
        (error) => {
            generation.current++;
            inFlight.current = null;
            apply({ ...latest.current, ready: false, loading: false, error });
        },
        [apply]
    );
    const refresh = useCallback(() => {
        if (inFlight.current) return inFlight.current;
        if (navigator.onLine === false) {
            invalidate(ENVELOPE_OFFLINE_MESSAGE);
            return Promise.resolve(latest.current);
        }
        const request = generation.current;
        const promise = (async () => {
            let value;
            try {
                value = await loadEnvelopeFromCloud({ ownerId });
            } catch (error) {
                value = { ready: false, error: envelopeSyncError(error) };
            }
            if (!active.current || request !== generation.current) return { ready: false };
            apply({ ...value, loading: false });
            return value;
        })().finally(() => {
            if (inFlight.current === promise) inFlight.current = null;
        });
        inFlight.current = promise;
        return promise;
    }, [ownerId, invalidate, apply]);
    useEffect(() => {
        active.current = true;
        generation.current++;
        inFlight.current = null;
        apply({ ...latest.current, ready: false, loading: true });
        refresh();
        const visible = () => {
            if (document.visibilityState !== 'hidden') refresh();
        };
        const offline = () => invalidate(ENVELOPE_OFFLINE_MESSAGE);
        const storage = (event) => {
            if (event.key === null || event.key?.startsWith('envelopeConfig')) {
                invalidate('Đang kiểm tra thay đổi bảng giá…');
                refresh();
            }
        };
        const interval = setInterval(visible, ENVELOPE_SYNC_INTERVAL);
        window.addEventListener('focus', visible);
        window.addEventListener('online', refresh);
        window.addEventListener('offline', offline);
        window.addEventListener('storage', storage);
        document.addEventListener('visibilitychange', visible);
        return () => {
            active.current = false;
            // Đây là thế hệ yêu cầu async, không phải tham chiếu DOM.
            // eslint-disable-next-line react-hooks/exhaustive-deps
            generation.current++;
            inFlight.current = null;
            clearInterval(interval);
            window.removeEventListener('focus', visible);
            window.removeEventListener('online', refresh);
            window.removeEventListener('offline', offline);
            window.removeEventListener('storage', storage);
            document.removeEventListener('visibilitychange', visible);
        };
    }, [refresh, invalidate, apply]);
    return { snapshot, refresh, invalidate };
}
