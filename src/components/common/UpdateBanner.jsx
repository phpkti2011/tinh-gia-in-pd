// Hai chỗ báo cho người dùng biết về bản mới:
//
//   UpdateBanner    — băng dưới ĐÁY màn hình khi phát hiện bản mới trên tab đang mở.
//   WhatsNewNotice  — bảng "Đã cập nhật" hiện sau khi đã tải lại, tối đa 24 giờ hoặc tới
//                     khi bấm ✕ (cái nào tới trước).
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
const SHOWN_AT_KEY = 'whatsNewShownAt';

// Bảng "Đã cập nhật" tự tắt sau chừng này kể từ lúc máy này thấy nó lần đầu — không bắt
// nhân viên phải bấm ✕, và không để nó nằm dài ở đầu mọi module nhiều ngày.
// Không tính từ `date` của bản phát hành: nó chỉ có ngày, không có giờ.
export const WHATS_NEW_TTL_MS = 24 * 60 * 60 * 1000;

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

// Lần đầu máy này thấy bảng của bản `id`, dạng mili-giây. Chưa có / sai bản / hỏng → null.
function readShownAt(id) {
    try {
        const v = JSON.parse(localStorage.getItem(SHOWN_AT_KEY));
        return v && v.id === id && Number.isFinite(v.at) ? v.at : null;
    } catch {
        return null;
    }
}
function writeShownAt(id, at) {
    try {
        localStorage.setItem(SHOWN_AT_KEY, JSON.stringify({ id, at }));
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

        const now = Date.now();
        let shownAt = readShownAt(CURRENT_RELEASE.id);
        if (shownAt === null) {
            shownAt = now;
            writeShownAt(CURRENT_RELEASE.id, now);
        }
        const conLai = shownAt + WHATS_NEW_TTL_MS - now;
        // Quá hạn: coi như đã xem, các lần mở sau rơi vào nhánh `seen === CURRENT_RELEASE.id`.
        if (conLai <= 0) {
            writeSeen(CURRENT_RELEASE.id);
            return;
        }

        setShown(releasesSince(seen));
        // Tab mở suốt cả ngày vẫn phải tự tắt đúng hạn.
        const timer = setTimeout(() => {
            writeSeen(CURRENT_RELEASE.id);
            setShown(null);
        }, conLai);
        return () => clearTimeout(timer);
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
