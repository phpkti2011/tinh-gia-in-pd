// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/modules/envelope/config/cloud', () => ({
    readEnvelopePrices: vi.fn(),
    publishEnvelopePrices: vi.fn(),
}));
import { readEnvelopePrices, publishEnvelopePrices } from '../../src/modules/envelope/config/cloud';
import {
    loadEnvelopeConfig,
    loadEnvelopeFromCloud,
    saveEnvelopeConfig,
    loadEnvelopeDraft,
} from '../../src/modules/envelope/config/storage';
import { ENVELOPE_DEFAULT_CONFIG } from '../../src/modules/envelope/config/defaultConfig';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
const config = () => structuredClone(ENVELOPE_DEFAULT_CONFIG);
const options = { ownerId: 'admin-a', baseVersion: 1 };
const rows = (data = config(), version = 1) => [
    ...(data ? [{ module: 'envelope', data, current_version: version }] : []),
    { module: 'small-print', data: DEFAULT_CONFIG, current_version: 31 },
];
beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    readEnvelopePrices.mockResolvedValue(rows());
    publishEnvelopePrices.mockResolvedValue({ ok: true, new_version: 2 });
});
describe('Bao thư — lưu và đồng bộ bảng giá', () => {
    it('đọc đồng thời Bao thư/KTS, cache riêng không sửa bảng giá khác', async () => {
        localStorage.setItem('printConfig', 'unchanged');
        const next = config();
        next.backPaperFactor = 3;
        readEnvelopePrices.mockResolvedValue(rows(next, 2));
        expect(await loadEnvelopeFromCloud()).toMatchObject({
            ready: true,
            version: 2,
            printVersion: 31,
            config: next,
        });
        expect(loadEnvelopeConfig()).toEqual(next);
        expect(localStorage.getItem('printConfig')).toBe('unchanged');
    });
    it.each([
        'offline',
        'missing-envelope',
        'invalid-envelope',
        'missing-print',
        'invalid-print',
        'invalid-version',
    ])('%s: không dùng cache để báo khách', async (mode) => {
        localStorage.setItem('envelopeConfig', JSON.stringify(config()));
        if (mode === 'offline') readEnvelopePrices.mockRejectedValue(new Error('offline'));
        if (mode === 'missing-envelope') readEnvelopePrices.mockResolvedValue(rows(null));
        if (mode === 'invalid-envelope') readEnvelopePrices.mockResolvedValue(rows({}));
        if (mode === 'missing-print') readEnvelopePrices.mockResolvedValue([rows()[0]]);
        if (mode === 'invalid-print')
            readEnvelopePrices.mockResolvedValue([
                rows()[0],
                { module: 'small-print', data: {}, current_version: 31 },
            ]);
        if (mode === 'invalid-version') readEnvelopePrices.mockResolvedValue(rows(config(), null));
        expect((await loadEnvelopeFromCloud()).ready).toBe(false);
    });
    it('lỗi lưu giữ nháp, chặn giá; chỉ đúng admin tự gửi lại bản nháp', async () => {
        const next = config();
        next.backPaperFactor = 3;
        publishEnvelopePrices.mockRejectedValueOnce(new Error('offline'));
        expect(await saveEnvelopeConfig(next, options)).toMatchObject({
            local: true,
            cloud: false,
        });
        expect(loadEnvelopeDraft().data).toEqual(next);
        expect(loadEnvelopeConfig().backPaperFactor).toBe(2);
        expect((await loadEnvelopeFromCloud({ ownerId: 'admin-b' })).ready).toBe(false);
        expect(publishEnvelopePrices).toHaveBeenCalledTimes(1);
        readEnvelopePrices.mockResolvedValueOnce(rows()).mockResolvedValueOnce(rows(next, 2));
        expect(await loadEnvelopeFromCloud({ ownerId: 'admin-a' })).toMatchObject({
            ready: true,
            version: 2,
        });
        expect(publishEnvelopePrices).toHaveBeenLastCalledWith(next, '1.0.0', 1);
        expect(loadEnvelopeDraft()).toBeNull();
    });
    it('xung đột không ghi đè phiên bản mới và giữ nháp để đối chiếu', async () => {
        publishEnvelopePrices.mockRejectedValue(new Error('envelope_version_conflict'));
        await saveEnvelopeConfig(config(), options);
        readEnvelopePrices.mockResolvedValue(rows(config(), 5));
        const result = await loadEnvelopeFromCloud({ ownerId: 'admin-a' });
        expect(result).toMatchObject({ ready: false, version: 5 });
        expect(result.error).toContain('Admin khác');
        expect(loadEnvelopeDraft().baseVersion).toBe(1);
    });
    it('thiếu admin/phiên bản hoặc config sai không gửi dữ liệu', async () => {
        for (const opts of [
            {},
            { ownerId: 'admin-a', baseVersion: null },
            { ownerId: 'admin-a', baseVersion: -1 },
        ])
            expect((await saveEnvelopeConfig(config(), opts)).cloud).toBe(false);
        expect((await saveEnvelopeConfig({}, options)).cloud).toBe(false);
        expect(publishEnvelopePrices).not.toHaveBeenCalled();
    });
    it('lưu lần đầu dùng phiên bản 0 và xác nhận máy chủ', async () => {
        publishEnvelopePrices.mockResolvedValue({ ok: true, new_version: 1 });
        expect(
            await saveEnvelopeConfig(config(), { ownerId: 'admin-a', baseVersion: 0 })
        ).toMatchObject({ cloud: true, version: 1 });
        expect(publishEnvelopePrices).toHaveBeenCalledWith(config(), '1.0.0', 0);
    });
    it('phản hồi lưu cũ không xóa bản nháp mới hơn', async () => {
        let finish;
        publishEnvelopePrices.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        const first = saveEnvelopeConfig(config(), options);
        const next = config();
        next.backPaperFactor = 4;
        publishEnvelopePrices.mockRejectedValueOnce(new Error('offline'));
        await saveEnvelopeConfig(next, options);
        finish({ ok: true, new_version: 2 });
        await first;
        expect(loadEnvelopeDraft().data.backPaperFactor).toBe(4);
    });
});
