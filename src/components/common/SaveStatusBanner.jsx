// Báo trạng thái lưu cấu hình. Dùng <span> để nhét vừa cả container flex lẫn
// space-x của các tab Cài Đặt mà không phá layout hàng nút Lưu/Hủy.
//
// Phân biệt rõ "đã lên đám mây" (mọi máy nhận được) với "mới nằm trên máy này" —
// xem src/components/common/useCloudSave.js.
export default function SaveStatusBanner({ status, error, className = '' }) {
    if (!status) return null;
    return (
        <span
            className={`inline-block align-middle text-xs ${className}`}
            data-testid="save-status"
        >
            {status === 'saving' && <span className="text-gray-400">Đang lưu…</span>}
            {status === 'cloud' && (
                <span className="text-emerald-400">✓ Đã lưu — mọi máy sẽ nhận cài đặt mới</span>
            )}
            {status === 'local' && (
                <span className="text-yellow-400">
                    ⚠ Mới lưu trên máy này, các máy khác CHƯA nhận. Kiểm tra mạng / đăng nhập lại
                    rồi bấm Lưu lần nữa.
                </span>
            )}
            {status === 'error' && <span className="text-red-400">✗ Không lưu được: {error}</span>}
        </span>
    );
}
