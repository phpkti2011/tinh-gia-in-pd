// PriceConfigHistoryPanel — P3-HISTORY.1 + P3-HISTORY.2
//
// Admin UI hiển thị lịch sử chỉnh giá từ Supabase price_config_versions
// + price_change_logs.
//
// P3-HISTORY.1: view-only — versions + audit log tables.
// P3-HISTORY.2: rollback — nút "Rollback về vN" trên mỗi version row.
//
// Behavior:
//   - Mount → fetch song song versions + logs cho moduleKey (chỉ khi expand).
//   - Loading: hiển thị spinner đơn giản.
//   - Empty: "Chưa có lịch sử chỉnh giá".
//   - Error: hiển thị message nhẹ + nút Tải lại.
//   - Success: 2 bảng (versions + logs) với data formatted.
//   - Click rollback: confirm dialog → load full data version cũ → save với
//     action='rollback' → tạo version mới → reload history.
//   - KHÔNG render raw JSON config data (chỉ metadata).
//
// Supabase chưa cấu hình: priceConfigStore trả [] gracefully → empty state.

import { useState, useEffect, useCallback } from 'react';
import {
    loadVersionHistory,
    loadChangeLog,
    rollbackConfigVersion,
} from '../../lib/priceConfigStore.js';

/**
 * Format ISO timestamp → readable Vietnamese local.
 * Vd: "2026-05-31T14:30:00Z" → "31/05/2026 21:30".
 */
function formatTime(iso) {
    if (!iso) return '—';
    try {
        const d = new Date(iso);
        if (isNaN(d.getTime())) return iso;
        const pad = (n) => String(n).padStart(2, '0');
        return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return iso;
    }
}

/**
 * Hiển thị user_id ngắn gọn (8 ký tự đầu) — KHÔNG hardcode email/uuid cụ thể.
 * RLS đảm bảo admin chỉ thấy uuid (privacy).
 */
function formatUserId(uuid) {
    if (!uuid) return '—';
    return uuid.length > 8 ? `${uuid.slice(0, 8)}…` : uuid;
}

function actionBadge(action) {
    const map = {
        create: { label: 'Tạo mới', cls: 'bg-blue-700/40 text-blue-300' },
        update: { label: 'Cập nhật', cls: 'bg-green-700/40 text-green-300' },
        rollback: { label: 'Rollback', cls: 'bg-yellow-700/40 text-yellow-300' },
    };
    const m = map[action] || { label: action || '—', cls: 'bg-gray-700/40 text-gray-300' };
    return <span className={`inline-block px-2 py-0.5 rounded text-xs ${m.cls}`}>{m.label}</span>;
}

export default function PriceConfigHistoryPanel({
    moduleKey,
    title = 'Lịch sử chỉnh giá',
    limit = 20,
}) {
    const [versions, setVersions] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [expanded, setExpanded] = useState(false);

    // P3-HISTORY.2: rollback state
    const [rollingBackId, setRollingBackId] = useState(null);
    const [rollbackStatus, setRollbackStatus] = useState(null); // {type: 'success'|'error', message: string}

    const fetchHistory = useCallback(async () => {
        if (!moduleKey) return;
        setLoading(true);
        setError(null);
        try {
            const [vs, ls] = await Promise.all([
                loadVersionHistory(moduleKey, limit),
                loadChangeLog(moduleKey, limit),
            ]);
            setVersions(vs);
            setLogs(ls);
        } catch (e) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    }, [moduleKey, limit]);

    useEffect(() => {
        if (expanded) {
            fetchHistory();
        }
    }, [expanded, fetchHistory]);

    // P3-HISTORY.2: rollback handler
    const handleRollback = useCallback(
        async (version) => {
            // Confirm dialog rõ ràng
            const userInfo = version.created_by ? formatUserId(version.created_by) : 'unknown';
            const timeInfo = formatTime(version.created_at);
            const confirmMsg =
                `Rollback ${moduleKey} về v${version.version}?\n\n` +
                `Phiên bản hiện tại sẽ thành lịch sử.\n` +
                `Một version mới sẽ được tạo dựa trên dữ liệu của v${version.version}.\n\n` +
                `v${version.version} được tạo bởi ${userInfo} lúc ${timeInfo}.`;
            if (!window.confirm(confirmMsg)) return;

            setRollingBackId(version.id);
            setRollbackStatus(null);
            try {
                const result = await rollbackConfigVersion({
                    module: moduleKey,
                    versionId: version.id,
                    note: `Rollback về v${version.version}`,
                });
                if (result.ok) {
                    setRollbackStatus({
                        type: 'success',
                        message: `Đã rollback thành công. Version mới: v${result.newVersion}. Tải lại trang hoặc bấm "Tải lại cấu hình" nếu cần áp dụng ngay.`,
                    });
                    // Reload history để show version mới + audit log
                    await fetchHistory();
                } else {
                    const errMsg = result.error?.message || String(result.error) || 'Unknown error';
                    setRollbackStatus({
                        type: 'error',
                        message: `Rollback thất bại: ${errMsg}`,
                    });
                }
            } catch (e) {
                setRollbackStatus({
                    type: 'error',
                    message: `Rollback exception: ${e?.message || String(e)}`,
                });
            } finally {
                setRollingBackId(null);
            }
        },
        [moduleKey, fetchHistory]
    );

    const isEmpty = !loading && !error && versions.length === 0 && logs.length === 0;

    return (
        <section className="mt-8 pt-6 border-t border-gray-700">
            <div className="flex justify-between items-center mb-3">
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="text-left text-lg font-semibold text-cyan-400 hover:text-cyan-300 transition flex items-center gap-2"
                    aria-expanded={expanded}
                >
                    <span>{expanded ? '▼' : '▶'}</span>
                    <span>{title}</span>
                    {!expanded && (
                        <span className="text-xs text-gray-500 font-normal">(click để xem)</span>
                    )}
                </button>
                {expanded && (
                    <button
                        type="button"
                        onClick={fetchHistory}
                        disabled={loading || !!rollingBackId}
                        className="text-xs text-gray-400 hover:text-white underline disabled:opacity-50"
                    >
                        {loading ? 'Đang tải…' : 'Tải lại'}
                    </button>
                )}
            </div>

            {expanded && (
                <div className="space-y-6">
                    {/* P3-HISTORY.2: rollback status banner */}
                    {rollbackStatus && (
                        <div
                            className={`rounded p-3 text-sm border ${
                                rollbackStatus.type === 'success'
                                    ? 'bg-green-900/30 border-green-700/50 text-green-300'
                                    : 'bg-red-900/30 border-red-700/50 text-red-300'
                            }`}
                        >
                            <div className="flex justify-between items-start gap-3">
                                <p className="flex-1">{rollbackStatus.message}</p>
                                <button
                                    type="button"
                                    onClick={() => setRollbackStatus(null)}
                                    className="text-xs hover:text-white"
                                    aria-label="Đóng thông báo"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    )}

                    {loading && <p className="text-gray-400 text-sm">Đang tải lịch sử…</p>}

                    {error && (
                        <div className="bg-red-900/30 border border-red-700/50 rounded p-3 text-sm">
                            <p className="text-red-300">
                                Không tải được lịch sử: <span className="font-mono">{error}</span>
                            </p>
                            <p className="text-gray-400 text-xs mt-1">
                                Có thể do Supabase chưa cấu hình hoặc network. Bấm "Tải lại" để thử
                                lại.
                            </p>
                        </div>
                    )}

                    {isEmpty && (
                        <p className="text-gray-500 text-sm italic">
                            Chưa có lịch sử chỉnh giá cho module này. Sau khi admin lưu lần đầu,
                            lịch sử sẽ xuất hiện ở đây.
                        </p>
                    )}

                    {!loading && !error && versions.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                Các phiên bản đã lưu ({versions.length})
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-700">
                                            <th className="text-left py-2 pr-3">Version</th>
                                            <th className="text-left py-2 pr-3">Schema</th>
                                            <th className="text-left py-2 pr-3">Ghi chú</th>
                                            <th className="text-left py-2 pr-3">Tạo bởi</th>
                                            <th className="text-left py-2 pr-3">Lúc</th>
                                            <th className="text-left py-2">Hành động</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {versions.map((v, idx) => {
                                            // Version mới nhất (idx 0 vì sort desc) → KHÔNG cho rollback
                                            // (rollback về chính nó vô nghĩa).
                                            const isLatest = idx === 0;
                                            const isThisRolling = rollingBackId === v.id;
                                            const anyRolling = rollingBackId !== null;
                                            return (
                                                <tr
                                                    key={v.id}
                                                    className="border-b border-gray-700/30 hover:bg-gray-700/20"
                                                >
                                                    <td className="py-2 pr-3 text-yellow-400 font-mono font-bold">
                                                        v{v.version}
                                                        {isLatest && (
                                                            <span className="ml-2 text-[10px] text-green-400 font-normal">
                                                                (hiện tại)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-3 text-gray-400 font-mono">
                                                        {v.schema_version || '—'}
                                                    </td>
                                                    <td className="py-2 pr-3 text-gray-300 max-w-xs truncate">
                                                        {v.note || (
                                                            <span className="text-gray-600 italic">
                                                                (không có ghi chú)
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="py-2 pr-3 text-gray-400 font-mono">
                                                        {formatUserId(v.created_by)}
                                                    </td>
                                                    <td className="py-2 pr-3 text-gray-400">
                                                        {formatTime(v.created_at)}
                                                    </td>
                                                    <td className="py-2">
                                                        {!isLatest && (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRollback(v)}
                                                                disabled={anyRolling}
                                                                className="px-2 py-1 text-xs bg-yellow-700/60 hover:bg-yellow-700 text-yellow-100 rounded disabled:opacity-50 disabled:cursor-not-allowed transition"
                                                            >
                                                                {isThisRolling
                                                                    ? 'Đang rollback…'
                                                                    : `Rollback về v${v.version}`}
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {!loading && !error && logs.length > 0 && (
                        <div>
                            <h4 className="text-sm font-semibold text-gray-300 mb-2">
                                Audit log ({logs.length})
                            </h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-gray-400 border-b border-gray-700">
                                            <th className="text-left py-2 pr-3">Hành động</th>
                                            <th className="text-left py-2 pr-3">Từ → Đến</th>
                                            <th className="text-left py-2 pr-3">Ghi chú</th>
                                            <th className="text-left py-2 pr-3">Admin</th>
                                            <th className="text-left py-2">Lúc</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {logs.map((l) => (
                                            <tr
                                                key={l.id}
                                                className="border-b border-gray-700/30 hover:bg-gray-700/20"
                                            >
                                                <td className="py-2 pr-3">
                                                    {actionBadge(l.action)}
                                                </td>
                                                <td className="py-2 pr-3 text-gray-400 font-mono">
                                                    {l.old_version != null
                                                        ? `v${l.old_version}`
                                                        : '—'}
                                                    {' → '}
                                                    {l.new_version != null
                                                        ? `v${l.new_version}`
                                                        : '—'}
                                                </td>
                                                <td className="py-2 pr-3 text-gray-300 max-w-xs truncate">
                                                    {l.note || (
                                                        <span className="text-gray-600 italic">
                                                            (không có ghi chú)
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="py-2 pr-3 text-gray-400 font-mono">
                                                    {formatUserId(l.changed_by)}
                                                </td>
                                                <td className="py-2 text-gray-400">
                                                    {formatTime(l.created_at)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <p className="text-xs text-gray-600 italic">
                        Sau khi rollback, một version mới sẽ được tạo từ dữ liệu version cũ —
                        version cũ KHÔNG bị xoá. Tải lại trang hoặc bấm "Tải lại cấu hình" để áp
                        dụng dữ liệu mới. Bảng giá lưu trong Supabase database (price_configs /
                        price_config_versions / price_change_logs).
                    </p>
                </div>
            )}
        </section>
    );
}
