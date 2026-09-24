// Hai chỗ báo cho người dùng biết về bản mới:
//
//   UpdateBanner    — băng dưới ĐÁY màn hình khi phát hiện bản mới trên tab đang mở.
//   WhatsNewNotice  — bảng "Đã cập nhật" hiện MỘT LẦN sau khi đã tải lại.
//
// ⚠ VÌ SAO NEO Ở ĐÁY: In KTS khổ nhỏ và In Khổ Lớn đều đã có thanh dính
// `fixed top-0 … z-50` (ResultPanel.jsx, LPResultPanel.jsx). Đặt băng này trên đỉnh là
// đè nhau ở đúng hai module dùng nhiều nhất. Đáy màn hình đang trống hoàn toàn.
//
// CỐ Ý KHÔNG có nút tắt ở băng đáy: băng mỏng, còn đó tới khi bấm Tải lại. Tắt được thì
// nhân viên tắt rồi báo giá bằng bảng giá cũ cả ngày.

import { useEffect, useState } from 'react';
import { CURRENT_RELEASE, RELEASE_NOTES } from '../../releaseNotes';
import { useAppUpdate } from './useAppUpdate';

const SEEN_KEY = 'lastSeenReleaseId';

// localStorage ném được (chế độ riêng tư, chặn site data). Hỏng chỗ này chỉ là mất thông
// báo — tuyệt đối không được làm vỡ cả app.
function readSeen() {
    try {
        return localStorage.getItem(SEEN_KEY);
    } catch {
        return null;
    }
}
function writeSeen(id) {
    try {
        localStorage.setItem(SEEN_KEY, id);
    } catch {
        /* bỏ qua */
    }
}

function ReleaseItems({ items, className = '' }) {
    if (!Array.isArray(items) || items.length === 0) return null;
    return (
        <ul className={`list-disc list-inside space-y-0.5 ${className}`}>
            {items.map((it, i) => (
                <li key={i}>{it}</li>
            ))}
        </ul>
    );
}

export function UpdateBanner() {
    const { newRelease, hasUpdate } = useAppUpdate();
    if (!hasUpdate) return null;

    return (
        <>
            {/* Chừa chỗ cuối trang để băng không che mất nội dung. */}
            <div aria-hidden className="h-24" />
            <div
                data-testid="update-banner"
                role="status"
                className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur border-t border-emerald-500/60 shadow-lg px-3 py-2"
            >
                <div className="max-w-screen-2xl mx-auto flex items-center gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-emerald-300">
                            🔄 Đã có bản mới
                            {newRelease.title ? ` — ${newRelease.title}` : ''}
                        </p>
                        <ReleaseItems
                            items={newRelease.items}
                            className="mt-1 text-xs text-gray-300"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 rounded font-semibold bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
                    >
                        Tải lại
                    </button>
                </div>
            </div>
        </>
    );
}

// Các bản phát hành mới hơn bản máy này đã xem. Không tra được thì chỉ lấy bản hiện tại —
// thà báo thiếu còn hơn đổ nguyên lịch sử vào mặt người dùng.
function releasesSince(seenId) {
    const idx = RELEASE_NOTES.findIndex((r) => r.id === seenId);
    return idx > 0 ? RELEASE_NOTES.slice(0, idx) : [CURRENT_RELEASE];
}

export function WhatsNewNotice() {
    const [shown, setShown] = useState(null);

    useEffect(() => {
        const seen = readSeen();
        // Lần đầu vào máy: chỉ ghi nhận, KHÔNG hiện. Không ai muốn bị chào bằng một bảng
        // changelog ở lần mở đầu tiên.
        if (!seen || seen === CURRENT_RELEASE.id) {
            writeSeen(CURRENT_RELEASE.id);
            return;
        }
        setShown(releasesSince(seen));
    }, []);

    if (!shown || shown.length === 0) return null;

    const dong = () => {
        writeSeen(CURRENT_RELEASE.id);
        setShown(null);
    };

    return (
        <div className="container mx-auto px-4 md:px-8 pt-4 max-w-screen-2xl">
            <div
                data-testid="whats-new"
                className="rounded border border-emerald-700/50 bg-emerald-900/20 p-3 text-sm text-emerald-200"
            >
                <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="font-semibold">✓ Đã cập nhật lên bản mới</p>
                        {shown.map((r) => (
                            <div key={r.id} className="mt-2">
                                <p className="text-xs text-emerald-400">
                                    {r.date} — {r.title}
                                </p>
                                <ReleaseItems items={r.items} className="mt-1 text-xs" />
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={dong}
                        className="text-xs hover:text-white"
                        aria-label="Đóng thông báo"
                    >
                        ✕
                    </button>
                </div>
            </div>
        </div>
    );
}
