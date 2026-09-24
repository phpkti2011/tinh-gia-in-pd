// Quay lại tab → kéo lại bảng giá mới nhất từ Supabase.
//
// VÌ SAO CẦN: bảng giá chỉ được nạp MỘT LẦN lúc mở module. Nhân viên để tab mở cả ngày
// thì admin sửa giá xong, máy đó vẫn báo giá cũ mà không ai biết — nguy hiểm hơn hẳn việc
// chạy code cũ, vì nó ra SỐ TIỀN SAI chứ không chỉ thiếu tính năng.
//
// Trước đây chỉ In Khổ Lớn có cơ chế này (viết thẳng trong App.jsx). Rút ra đây để cả 10
// module dùng chung, giữ nguyên hai điều khôn ngoan của bản gốc:
//
//   1. BỎ QUA khi đang ở tab Cài Đặt — nạp đè lúc admin đang sửa dở là mất nguyên bản nháp.
//   2. Gỡ listener khi unmount.
//
// Nhận MỘT HOẶC NHIỀU tên module: Catalogue và Lò xo nạp hai config (printConfig + config
// riêng của chúng), sót một cái là giá lệch mà không ai hiểu vì sao.

import { useEffect } from 'react';
import { loadConfigFromCloud } from '../../utils/configStorage';

// entries: [{ module: 'printConfig', apply: (cfg) => setConfig(cfg) }, …]
// skip: true khi đang ở tab Cài Đặt.
export function useConfigRefreshOnFocus(entries, skip = false) {
    // Mảng inline ở call site sẽ đổi tham chiếu mỗi lần render, nên KHÔNG đưa `entries`
    // vào deps — khoá theo danh sách tên module (chuỗi ổn định) là đủ và đúng.
    const key = (entries || []).map((e) => e && e.module).join('|');

    useEffect(() => {
        if (skip) return;
        const list = (entries || []).filter((e) => e && e.module && typeof e.apply === 'function');
        if (list.length === 0) return;

        const onVisible = () => {
            if (document.visibilityState !== 'visible') return;
            for (const { module, apply } of list) {
                loadConfigFromCloud(module)
                    .then((c) => {
                        if (c) apply(c);
                    })
                    // Mất mạng thì thôi, giữ giá đang có. Không làm phiền nhân viên.
                    .catch(() => {});
            }
        };

        document.addEventListener('visibilitychange', onVisible);
        return () => document.removeEventListener('visibilitychange', onVisible);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, skip]);
}
