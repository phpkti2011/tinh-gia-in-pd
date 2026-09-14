import { useState, useRef, useEffect } from 'react';

// Nút copy dùng chung — nhận sẵn chuỗi, không tự dựng nội dung.
// text rỗng/null ⇒ không render (chưa có kết quả hợp lệ để copy).
//
// ⚠ navigator.clipboard KHÔNG tồn tại khi trang chạy qua HTTP không bảo mật —
// vd ai đó chạy `npm run dev -- --host` rồi nhân viên mở bằng IP LAN
// (http://192.168.x.x:5173), rất dễ xảy ra ở xưởng nhiều máy. Gọi thẳng sẽ ném
// TypeError, nên phải có đường lùi execCommand.
export async function copyText(text) {
    if (!text) return false;
    try {
        if (navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch {
        // rơi xuống đường lùi bên dưới
    }
    try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch {
        return false;
    }
}

export default function CopyButton({ text, label = 'Copy quy cách', className = '', title }) {
    const [state, setState] = useState(null); // null | 'ok' | 'fail'
    const timer = useRef(null);

    useEffect(() => () => clearTimeout(timer.current), []);

    if (!text) return null;

    const handleClick = async () => {
        const ok = await copyText(text);
        setState(ok ? 'ok' : 'fail');
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setState(null), 2000);
    };

    const base =
        'px-3 py-1.5 rounded text-sm font-medium transition disabled:opacity-50 ' +
        (state === 'ok'
            ? 'bg-emerald-600 text-white'
            : state === 'fail'
              ? 'bg-red-600 text-white'
              : 'bg-gray-700 hover:bg-gray-600 text-gray-100');

    return (
        <button
            type="button"
            onClick={handleClick}
            title={title || 'Copy quy cách để gửi khách'}
            className={`${base} ${className}`}
        >
            {state === 'ok' ? '✓ Đã copy' : state === 'fail' ? '✗ Copy lỗi' : `📋 ${label}`}
        </button>
    );
}
