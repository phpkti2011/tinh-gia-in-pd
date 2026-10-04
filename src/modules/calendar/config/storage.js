import { CALENDAR_DEFAULT_CONFIG, CALENDAR_SCHEMA_VERSION } from './defaultConfig';
import { validateCalendarConfig } from './schema';
import { normalizeCalendarConfig, withStockMirror } from './normalize';
import { DEFAULT_CONFIG, validateSmallPrintConfig } from '../../small-print/config';
import { restoreInfinity } from '../../../utils/restoreInfinity';
import { readCalendarPrices, publishCalendarPrices } from './cloud';

const KEY = 'calendarConfig';
const PENDING_KEY = 'calendarConfigPending';
const DRAFT_KEY = 'calendarConfigDraft';
let writeRevision = 0;

const readLocal = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
};

// Cache/default is only an editor/input seed; it never authorizes a quote.
export function loadCalendarConfig() {
    const cached = normalizeCalendarConfig(readLocal(KEY));
    return validateCalendarConfig(cached).isValid
        ? cached
        : structuredClone(CALENDAR_DEFAULT_CONFIG);
}

export function loadCalendarDraft() {
    const draft = readLocal(DRAFT_KEY);
    const draftData = normalizeCalendarConfig(draft?.data);
    if (validateCalendarConfig(draftData).isValid) return { ...draft, data: draftData };
    if (readLocal(PENDING_KEY) === true) {
        const data = normalizeCalendarConfig(readLocal(KEY));
        if (validateCalendarConfig(data).isValid)
            return { id: 'legacy', data, baseVersion: null, ownerId: null };
    }
    return null;
}

export const hasPendingCalendarConfig = () => Boolean(loadCalendarDraft());

function clearDraft(id) {
    if (loadCalendarDraft()?.id !== id) return;
    try {
        localStorage.removeItem(DRAFT_KEY);
        localStorage.removeItem(PENDING_KEY);
    } catch {
        /* Reconcile with the server on the next read. */
    }
}

export function calendarSyncError(error) {
    const message = error?.message || String(error || '');
    if (/save_calendar_price_config|invalid module|module_check|PGRST202/i.test(message))
        return 'Máy chủ chưa bật đồng bộ lịch. Cần cập nhật cơ sở dữ liệu cho module lịch.';
    // RPC save_calendar_price_config chốt cứng danh sách phiên bản được nhận. Nâng
    // CALENDAR_SCHEMA_VERSION mà chưa chạy SQL cập nhật danh sách đó thì MỌI lần lưu bị
    // từ chối (errcode 22023 → HTTP 400), bản nháp kẹt lại và vòng tự gửi lại khoá luôn
    // việc báo giá. Nói thẳng nguyên nhân, đừng để nó đội lốt lỗi mất mạng.
    if (/invalid calendar price payload/i.test(message))
        return `Máy chủ chưa chấp nhận bảng giá phiên bản ${CALENDAR_SCHEMA_VERSION}. Admin cần chạy SQL cập nhật hàm save_calendar_price_config trên Supabase rồi thử lại.`;
    if (/calendar_version_conflict/i.test(message))
        return 'Admin khác đã cập nhật bảng giá. Bản nháp được giữ lại; hãy đối chiếu bảng giá mới trước khi lưu.';
    if (/forbidden|42501|JWT|permission/i.test(message))
        return 'Cần đăng nhập lại bằng tài khoản admin để đồng bộ bản nháp.';
    return 'Chưa xác nhận được bảng giá từ máy chủ. Phần mềm sẽ tự thử lại khi có kết nối.';
}

async function publishDraft(draft) {
    const result = await publishCalendarPrices(
        draft.data,
        CALENDAR_SCHEMA_VERSION,
        draft.baseVersion
    );
    clearDraft(draft.id);
    return result;
}

// ownerId may only be supplied after the UI has verified the admin role.
export async function loadCalendarFromCloud({ ownerId = null } = {}) {
    const revision = writeRevision;
    try {
        let rows = await readCalendarPrices();
        const draft = loadCalendarDraft();
        let retryError = null;
        if (draft && ownerId && revision === writeRevision) {
            try {
                if (draft.id === 'legacy') {
                    // Version 0 can create, or acknowledge an identical committed retry.
                    // An existing different server price is rejected by the RPC.
                    await publishDraft({ ...draft, baseVersion: 0 });
                    rows = await readCalendarPrices();
                } else if (draft.ownerId === ownerId && Number.isSafeInteger(draft.baseVersion)) {
                    await publishDraft(draft);
                    rows = await readCalendarPrices();
                }
            } catch (error) {
                retryError = calendarSyncError(error);
            }
        }
        const calendar = rows.find((r) => r.module === 'calendar');
        const print = rows.find((r) => r.module === 'small-print');
        const printData = restoreInfinity(print?.data);
        // Bảng giá lưu trước schema 2.0.0 được nâng hình dạng ngay khi đọc; giá không đổi.
        const calendarData = normalizeCalendarConfig(calendar?.data);
        const calendarValid = validateCalendarConfig(calendarData).isValid;
        const printValid = validateSmallPrintConfig(printData).isValid;
        const version = calendar ? calendar.current_version : 0;
        const versionsValid =
            Number.isSafeInteger(version) &&
            (calendar ? version > 0 : version === 0) &&
            Number.isSafeInteger(print?.current_version) &&
            print.current_version > 0;
        const pending = loadCalendarDraft();
        const ready = calendarValid && printValid && versionsValid && !pending;
        if (calendarValid && !pending && revision === writeRevision) {
            try {
                localStorage.setItem(KEY, JSON.stringify(calendarData));
            } catch {
                /* optional cache */
            }
        }
        return {
            ready,
            version,
            printVersion: print?.current_version ?? null,
            config: calendarValid ? calendarData : null,
            printConfig: printValid ? { ...structuredClone(DEFAULT_CONFIG), ...printData } : null,
            error: ready
                ? null
                : retryError ||
                  (pending
                      ? 'Bản điều chỉnh đang chờ đồng bộ. Chưa thể báo giá; admin cần kiểm tra trạng thái trong Cài Đặt.'
                      : !calendar
                        ? 'Máy chủ chưa có bảng giá lịch. Admin cần hoàn tất đồng bộ trước khi báo giá.'
                        : 'Bảng giá lịch hoặc KTS trên máy chủ chưa hợp lệ. Chưa thể báo giá.'),
        };
    } catch (error) {
        return {
            ready: false,
            version: null,
            config: null,
            printConfig: null,
            error: calendarSyncError(error),
        };
    }
}

export async function saveCalendarConfig(config, { ownerId, baseVersion } = {}) {
    // Bản sao geometry.stockW/stockH phải khớp loại carton đầu tiên TRƯỚC khi kiểm tra,
    // nếu không admin gặp lỗi phát ra từ một ô Cài Đặt không còn hiển thị.
    const next = withStockMirror(config);
    const validation = validateCalendarConfig(next);
    if (!validation.isValid)
        return { local: false, cloud: false, error: validation.errors.join(' ') };
    if (!ownerId || !Number.isSafeInteger(baseVersion) || baseVersion < 0)
        return {
            local: false,
            cloud: false,
            error: 'Chưa xác nhận được phiên bản bảng giá hoặc quyền admin. Hãy kết nối lại trước khi lưu.',
        };
    writeRevision++;
    const draft = { id: crypto.randomUUID(), ownerId, baseVersion, data: structuredClone(next) };
    let local = false;
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        local = true;
    } catch {
        /* Failed drafts remain in the editor if browser storage is unavailable. */
    }
    try {
        const result = await publishDraft(draft);
        return { local, cloud: true, version: result.new_version, error: null };
    } catch (error) {
        return { local, cloud: false, error: calendarSyncError(error) };
    }
}
