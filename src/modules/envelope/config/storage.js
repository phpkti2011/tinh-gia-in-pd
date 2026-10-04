// Envelope storage — theo mẫu modules/calendar/config/storage.js.
//
// Máy chủ là nguồn giá duy nhất để báo khách. localStorage chỉ giữ cache làm hạt giống cho
// form và bản nháp admin lưu thất bại; không dùng cache/default để xuất giá.

import { ENVELOPE_DEFAULT_CONFIG, ENVELOPE_SCHEMA_VERSION } from './defaultConfig';
import { validateEnvelopeConfig } from './schema';
import { DEFAULT_CONFIG, validateSmallPrintConfig } from '../../small-print/config';
import { restoreInfinity } from '../../../utils/restoreInfinity';
import { readEnvelopePrices, publishEnvelopePrices } from './cloud';

const KEY = 'envelopeConfig';
const DRAFT_KEY = 'envelopeConfigDraft';
let writeRevision = 0;

const readLocal = (key) => {
    try {
        return JSON.parse(localStorage.getItem(key));
    } catch {
        return null;
    }
};

export function loadEnvelopeConfig() {
    const cached = readLocal(KEY);
    return validateEnvelopeConfig(cached).isValid
        ? cached
        : structuredClone(ENVELOPE_DEFAULT_CONFIG);
}

export function loadEnvelopeDraft() {
    const draft = readLocal(DRAFT_KEY);
    return validateEnvelopeConfig(draft?.data).isValid ? draft : null;
}

export const hasPendingEnvelopeConfig = () => Boolean(loadEnvelopeDraft());

function clearDraft(id) {
    if (loadEnvelopeDraft()?.id !== id) return;
    try {
        localStorage.removeItem(DRAFT_KEY);
    } catch {
        /* Đối chiếu lại với máy chủ ở lần đọc sau. */
    }
}

export function envelopeSyncError(error) {
    const message = error?.message || String(error || '');
    if (/save_envelope_price_config|invalid module|module_check|PGRST202/i.test(message))
        return 'Máy chủ chưa bật đồng bộ bao thư. Cần cập nhật cơ sở dữ liệu cho module bao thư.';
    // Xem ghi chú cùng loại ở modules/calendar/config/storage.js: RPC chốt cứng danh
    // sách phiên bản, nâng ENVELOPE_SCHEMA_VERSION mà quên chạy SQL là khoá báo giá.
    if (/invalid envelope price payload/i.test(message))
        return `Máy chủ chưa chấp nhận bảng giá phiên bản ${ENVELOPE_SCHEMA_VERSION}. Admin cần chạy SQL cập nhật hàm save_envelope_price_config trên Supabase rồi thử lại.`;
    if (/envelope_version_conflict/i.test(message))
        return 'Admin khác đã cập nhật bảng giá. Bản nháp được giữ lại; hãy đối chiếu bảng giá mới trước khi lưu.';
    if (/forbidden|42501|JWT|permission/i.test(message))
        return 'Cần đăng nhập lại bằng tài khoản admin để đồng bộ bản nháp.';
    return 'Chưa xác nhận được bảng giá từ máy chủ. Phần mềm sẽ tự thử lại khi có kết nối.';
}

async function publishDraft(draft) {
    const result = await publishEnvelopePrices(
        draft.data,
        ENVELOPE_SCHEMA_VERSION,
        draft.baseVersion
    );
    clearDraft(draft.id);
    return result;
}

// ownerId chỉ được truyền sau khi UI đã xác nhận quyền admin.
export async function loadEnvelopeFromCloud({ ownerId = null } = {}) {
    const revision = writeRevision;
    try {
        let rows = await readEnvelopePrices();
        const draft = loadEnvelopeDraft();
        let retryError = null;
        if (
            draft &&
            ownerId &&
            revision === writeRevision &&
            draft.ownerId === ownerId &&
            Number.isSafeInteger(draft.baseVersion)
        ) {
            try {
                await publishDraft(draft);
                rows = await readEnvelopePrices();
            } catch (error) {
                retryError = envelopeSyncError(error);
            }
        }
        const envelope = rows.find((r) => r.module === 'envelope');
        const print = rows.find((r) => r.module === 'small-print');
        const printData = restoreInfinity(print?.data);
        const envelopeValid = validateEnvelopeConfig(envelope?.data).isValid;
        const printValid = validateSmallPrintConfig(printData).isValid;
        const version = envelope ? envelope.current_version : 0;
        const versionsValid =
            Number.isSafeInteger(version) &&
            (envelope ? version > 0 : version === 0) &&
            Number.isSafeInteger(print?.current_version) &&
            print.current_version > 0;
        const pending = loadEnvelopeDraft();
        const ready = envelopeValid && printValid && versionsValid && !pending;
        if (envelopeValid && !pending && revision === writeRevision) {
            try {
                localStorage.setItem(KEY, JSON.stringify(envelope.data));
            } catch {
                /* cache tùy chọn */
            }
        }
        return {
            ready,
            version,
            printVersion: print?.current_version ?? null,
            config: envelopeValid ? envelope.data : null,
            printConfig: printValid ? { ...structuredClone(DEFAULT_CONFIG), ...printData } : null,
            error: ready
                ? null
                : retryError ||
                  (pending
                      ? 'Bản điều chỉnh đang chờ đồng bộ. Chưa thể báo giá; admin cần kiểm tra trạng thái trong Cài Đặt.'
                      : !envelope
                        ? 'Máy chủ chưa có bảng giá bao thư. Admin cần lưu cài đặt bao thư lần đầu trước khi báo giá.'
                        : 'Bảng giá bao thư hoặc KTS trên máy chủ chưa hợp lệ. Chưa thể báo giá.'),
        };
    } catch (error) {
        return {
            ready: false,
            version: null,
            config: null,
            printConfig: null,
            error: envelopeSyncError(error),
        };
    }
}

export async function saveEnvelopeConfig(config, { ownerId, baseVersion } = {}) {
    const validation = validateEnvelopeConfig(config);
    if (!validation.isValid)
        return { local: false, cloud: false, error: validation.errors.join(' ') };
    if (!ownerId || !Number.isSafeInteger(baseVersion) || baseVersion < 0)
        return {
            local: false,
            cloud: false,
            error: 'Chưa xác nhận được phiên bản bảng giá hoặc quyền admin. Hãy kết nối lại trước khi lưu.',
        };
    writeRevision++;
    const draft = { id: crypto.randomUUID(), ownerId, baseVersion, data: structuredClone(config) };
    let local = false;
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        local = true;
    } catch {
        /* Nháp thất bại vẫn còn trong form nếu trình duyệt không cho lưu. */
    }
    try {
        const result = await publishDraft(draft);
        return { local, cloud: true, version: result.new_version, error: null };
    } catch (error) {
        return { local, cloud: false, error: envelopeSyncError(error) };
    }
}
