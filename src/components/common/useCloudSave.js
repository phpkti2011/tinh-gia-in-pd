import { useState } from 'react';

// Lưu cấu hình bảng giá — dùng chung cho MỌI tab Cài Đặt.
//
// ⚠ Supabase là đường DUY NHẤT đưa cấu hình sang máy người khác. Bản cũ của các
// panel báo alert('Đã lưu cài đặt!') ngay sau khi ghi localStorage của máy admin
// rồi bỏ mặc promise cloud → lưu hỏng trong im lặng (mất mạng, hết phiên đăng
// nhập, RLS từ chối) mà admin vẫn tưởng cả xưởng đã nhận bảng giá mới.
//
// Hook này bắt buộc phải CHỜ kết quả cloud rồi phân biệt:
//   cloud → đã lên đám mây, mọi máy nhận được  (chỉ lúc này mới rời tab)
//   local → mới nằm trên máy này, PHẢI ở lại tab để admin lưu lại
//   error → không lưu được
//
// saveLocal = hàm ghi localStorage kiêm cổng validate schema, trả false nếu
// config không hợp lệ (saveConfig / saveDecalConfig / …).
export function useCloudSave({ saveLocal, onSave, onSaved, invalidMessage }) {
    const [status, setStatus] = useState(null); // null | 'saving' | 'cloud' | 'local' | 'error'
    const [error, setError] = useState(null);

    const save = async (localConfig) => {
        setError(null);
        try {
            if (saveLocal && !saveLocal(localConfig)) {
                setStatus('error');
                setError(
                    invalidMessage || 'Cấu hình không hợp lệ. Mở Console để xem chi tiết lỗi.'
                );
                return;
            }
            setStatus('saving');
            const res = await onSave(localConfig);
            if (res?.error || res?.local === false) {
                setStatus('error');
                setError(res?.error || 'Không lưu được');
                return;
            }
            if (res?.cloud) {
                setStatus('cloud');
                onSaved?.();
                return;
            }
            setStatus('local');
        } catch (e) {
            console.error(e);
            setStatus('error');
            setError(e?.message || 'Lỗi lưu cấu hình');
        }
    };

    return { status, error, saving: status === 'saving', save };
}
