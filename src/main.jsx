import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Chặn cuộn chuột làm đổi giá trị input number đang focus — cuộn chuột qua ô
// nhập liệu (không có ý định đổi số) dễ làm sai số liệu báo giá. blur() ngay
// khi có sự kiện wheel để trình duyệt bỏ qua bước tăng/giảm giá trị mặc định.
document.addEventListener(
    'wheel',
    () => {
        const el = document.activeElement;
        if (el && el.tagName === 'INPUT' && el.type === 'number') {
            el.blur();
        }
    },
    { passive: true }
);

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);
