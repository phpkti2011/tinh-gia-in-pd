// Dò xem đã có bản mới của phần mềm chưa, cho tab đang mở.
//
// VÌ SAO CẦN: nhân viên để tab mở cả ngày. Deploy bản mới xong, tab đó vẫn chạy code cũ
// VÔ THỜI HẠN cho tới khi có người F5 — không có cách nào tự biết.
//
// Cách làm: lúc build, vite.config.js nhúng `__APP_BUILD_ID__` vào bundle VÀ phát ra
// /version.json mang đúng chuỗi đó. Bundle đang chạy tự so hai bên, khác nhau là có bản
// mới. Không cần service worker.
//
// ⚠ BA CÁI BẪY, đều đã gặp thật:
//
// 1. vercel.json rewrite /(.*) → / (SPA fallback). File thiếu thì server trả TRANG HTML
//    KÈM MÃ 200, không phải 404. Không kiểm content-type là res.json() ném lỗi, và tệ hơn
//    nữa là có ngày nó parse được thành thứ gì đó rồi báo nhầm "có bản mới" liên tục.
// 2. Mọi lỗi phải IM LẶNG. Nhân viên mất wifi không được thấy thông báo lỗi nào — cùng
//    lắm là không biết có bản mới, chuyện đó không sao.
// 3. Không dò khi tab đang ẩn: vô ích, và 10 tab mở sẵn sẽ nện server mỗi 5 phút.

import { useCallback, useEffect, useRef, useState } from 'react';

// Đọc phòng thủ: vitest.config.js có khai `define` riêng, nhưng nếu ai đó chạy file này
// ngoài cả hai môi trường thì vẫn không được nổ.
export const APP_BUILD_ID = typeof __APP_BUILD_ID__ !== 'undefined' ? __APP_BUILD_ID__ : 'dev';

const CHECK_INTERVAL_MS = 5 * 60 * 1000;

// Trả về bản phát hành mới nhất nếu CÓ bản mới, null nếu không / không chắc.
export async function fetchNewRelease(currentBuildId = APP_BUILD_ID) {
    try {
        // cache-bust cả bằng query lẫn no-store: Vercel không đặt cache cho file gốc,
        // nhưng trình duyệt và proxy giữa đường thì chưa chắc.
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) return null;

        // Chốt chặn SPA fallback — xem bẫy số 1 ở đầu file.
        const type = res.headers.get('content-type') || '';
        if (!type.includes('json')) return null;

        const data = await res.json();
        if (!data || typeof data.buildId !== 'string' || !data.buildId) return null;
        if (data.buildId === currentBuildId) return null;

        const releases = Array.isArray(data.releases) ? data.releases : [];
        return releases[0] || { id: data.buildId, date: '', title: 'Đã có bản mới', items: [] };
    } catch {
        return null;
    }
}

export function useAppUpdate({ intervalMs = CHECK_INTERVAL_MS, buildId = APP_BUILD_ID } = {}) {
    const [newRelease, setNewRelease] = useState(null);
    // Dừng dò hẳn sau khi đã tìm thấy: băng báo đã hiện rồi, dò thêm chẳng để làm gì.
    const foundRef = useRef(false);

    const check = useCallback(async () => {
        if (foundRef.current) return;
        if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

        const release = await fetchNewRelease(buildId);
        if (release && !foundRef.current) {
            foundRef.current = true;
            setNewRelease(release);
        }
    }, [buildId]);

    useEffect(() => {
        check();

        const onVisible = () => {
            if (document.visibilityState === 'visible') check();
        };
        document.addEventListener('visibilitychange', onVisible);
        const timer = setInterval(check, intervalMs);

        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            clearInterval(timer);
        };
    }, [check, intervalMs]);

    return { newRelease, hasUpdate: newRelease != null };
}
