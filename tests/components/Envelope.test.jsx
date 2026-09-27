// @vitest-environment jsdom
/* eslint react/jsx-uses-vars: "error" */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, act } from '@testing-library/react';
import EnvelopeModule from '../../src/modules/envelope/ui/EnvelopeModule';
import EnvelopeSettings from '../../src/modules/envelope/ui/EnvelopeSettings';
import { ENVELOPE_DEFAULT_CONFIG } from '../../src/modules/envelope/config/defaultConfig';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';

const mocks = vi.hoisted(() => ({ role: vi.fn(), auth: vi.fn(), load: vi.fn() }));
vi.mock('../../src/auth/useUserRole', () => ({ useUserRole: mocks.role }));
vi.mock('../../src/auth/useAuth', () => ({ useAuth: mocks.auth }));
vi.mock('../../src/modules/envelope/config/storage', async (original) => ({
    ...(await original()),
    loadEnvelopeFromCloud: mocks.load,
}));

const snapshot = () => ({
    ready: true,
    version: 1,
    printVersion: 31,
    config: { ...structuredClone(ENVELOPE_DEFAULT_CONFIG), pricesConfirmed: true },
    printConfig: structuredClone(DEFAULT_CONFIG),
});
const change = (label, value) =>
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
async function start() {
    const view = render(<EnvelopeModule onBack={() => {}} />);
    await act(async () => {});
    await waitFor(() => expect(screen.queryByText('Đang tải bảng giá mới nhất…')).toBeNull());
    change('Ngang thành phẩm W (mm)', '220');
    change('Cao thành phẩm H (mm)', '110');
    return view;
}
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.role.mockReturnValue({ isAdmin: false, loading: false, error: null });
    mocks.auth.mockReturnValue({ user: { id: 'staff-a' }, loading: false });
    mocks.load.mockResolvedValue(snapshot());
});
afterEach(cleanup);

describe('Bao thư — giao diện và trạng thái giá', () => {
    it('cài đặt đến muộn không ghi đè thông số người dùng vừa nhập', async () => {
        let finish;
        mocks.load.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        render(<EnvelopeModule onBack={() => {}} />);
        change('Ngang thành phẩm W (mm)', '220');
        change('Cao thành phẩm H (mm)', '110');
        const fresh = snapshot();
        fresh.config.defaults.unit = 'cm';
        await act(async () => {
            finish(fresh);
        });
        expect(screen.getByLabelText('Ngang thành phẩm W (mm)').value).toBe('220');
        expect(screen.getByLabelText('Cao thành phẩm H (mm)').value).toBe('110');
        expect(screen.getAllByRole('img')).toHaveLength(1);
    });
    it('đổi mm/cm giữ kích thước; chuyển tách/liền cập nhật hình và chi phí mặt sau', async () => {
        await start();
        expect(screen.getAllByRole('img')).toHaveLength(1);
        change('Đơn vị nhập', 'cm');
        expect(screen.getByLabelText('Ngang thành phẩm W (cm)').value).toBe('22');
        expect(screen.getByLabelText('Dài nắp N (cm)').value).toBe('4');
        change('Kiểu khuôn', 'split');
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        expect(screen.getByText(/Chọn rõ có in hoặc không in/)).toBeTruthy();
        change('In mặt sau', 'no');
        expect(screen.getAllByRole('img')).toHaveLength(2);
        expect(screen.getByText('Mặt sau rời · chỉ giấy')).toBeTruthy();
        expect(screen.getByText(/không in, tiền in 0 đ/)).toBeTruthy();
        change('In mặt sau', 'yes');
        expect(screen.getByText('Mặt sau rời · giấy + in')).toBeTruthy();
        change('Kiểu khuôn', 'joined-opposite');
        expect(screen.getAllByRole('img')).toHaveLength(1);
        expect(screen.queryByText('Mặt sau rời · giấy + in')).toBeNull();
        change('Vị trí nắp', 'H');
        expect(screen.getByText(/nắp ở cạnh cao h/)).toBeTruthy();
    });
    it('xóa kích thước hoặc nhập số lượng lẻ bỏ giá cũ ngay', async () => {
        await start();
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' })).toBeTruthy();
        change('Ngang thành phẩm W (mm)', '');
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        change('Ngang thành phẩm W (mm)', '220');
        change('Số lượng bao thư', '1.5');
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
    });
    it.each(['staff', 'guest', 'loading', 'error'])('ẩn vốn với %s', async (mode) => {
        if (mode === 'guest') mocks.auth.mockReturnValue({ user: null, loading: false });
        if (mode === 'loading') mocks.role.mockReturnValue({ isAdmin: true, loading: true });
        if (mode === 'error') mocks.role.mockReturnValue({ isAdmin: true, error: 'Lỗi quyền' });
        await start();
        expect(screen.getByRole('columnheader', { name: 'Báo khách' })).toBeTruthy();
        expect(screen.queryByRole('columnheader', { name: 'Giá vốn' })).toBeNull();
        expect(document.body.textContent).not.toMatch(/giá vốn/i);
    });
    it('admin thấy vốn; đăng xuất ẩn vốn ngay', async () => {
        mocks.role.mockReturnValue({ isAdmin: true, loading: false, error: null });
        const view = await start();
        expect(screen.getByRole('columnheader', { name: 'Giá vốn' })).toBeTruthy();
        mocks.auth.mockReturnValue({ user: null, loading: false });
        view.rerender(<EnvelopeModule onBack={() => {}} />);
        expect(screen.queryByRole('columnheader', { name: 'Giá vốn' })).toBeNull();
    });
    it('ép nhũ có nhiều khuôn; khuôn lỗi chặn giá và tắt ép nhũ phục hồi giá', async () => {
        await start();
        fireEvent.click(screen.getByLabelText('Ép nhũ bao thư'));
        fireEvent.click(screen.getByText('+ Thêm khuôn'));
        expect(screen.getByText(/2 khuôn · 100 bao thư/)).toBeTruthy();
        change('Ngang khuôn 2 (cm)', '');
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        fireEvent.click(screen.getByLabelText('Ép nhũ bao thư'));
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' })).toBeTruthy();
    });
    it('offline bỏ giá nhưng giữ hình kiểm tra; online đọc lại giá', async () => {
        await start();
        act(() => window.dispatchEvent(new Event('offline')));
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        expect(screen.getAllByRole('img')).toHaveLength(1);
        act(() => window.dispatchEvent(new Event('online')));
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Sao chép báo giá' })).toBeTruthy()
        );
    });
    it('phản hồi đến muộn sau offline không mở lại giá', async () => {
        await start();
        let finish;
        mocks.load.mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    finish = resolve;
                })
        );
        act(() => window.dispatchEvent(new Event('focus')));
        act(() => window.dispatchEvent(new Event('offline')));
        await act(async () => {
            finish(snapshot());
        });
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
    });
    it('kiểm tra lại phiên bản trước khi sao chép; giá đổi thì không chép báo giá cũ', async () => {
        await start();
        const writeText = vi.fn();
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        const fresh = snapshot();
        fresh.version = 2;
        fresh.config.orderMin.minSale = 9999999;
        mocks.load.mockResolvedValue(fresh);
        fireEvent.click(screen.getByRole('button', { name: 'Sao chép báo giá' }));
        await waitFor(() =>
            expect(screen.getByText(/Bảng giá vừa được admin cập nhật/)).toBeTruthy()
        );
        expect(writeText).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Sao chép báo giá' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
        expect(writeText.mock.calls[0][0]).toContain('9.999.999 đ');
    });
});

describe('Bao thư — cài đặt', () => {
    it('không bỏ được giấy cuối cùng để tránh danh sách rỗng bật lại mọi giấy', () => {
        const config = structuredClone(ENVELOPE_DEFAULT_CONFIG);
        config.papers.allowed = [5];
        render(
            <EnvelopeSettings
                config={config}
                printConfig={DEFAULT_CONFIG}
                onSave={vi.fn()}
                onCancel={() => {}}
            />
        );
        const paper = screen.getByLabelText(
            `Cho phép giấy ${DEFAULT_CONFIG.PAPER_STOCK_DATA[5].name}`
        );
        expect(paper.disabled).toBe(true);
        expect(screen.getAllByRole('checkbox').filter((x) => x.checked)).toHaveLength(1);
    });
    it('lưu bậc bế/dán và phí tối thiểu; bậc trùng bị chặn', async () => {
        const save = vi.fn().mockResolvedValue({ cloud: true });
        render(
            <EnvelopeSettings
                config={ENVELOPE_DEFAULT_CONFIG}
                printConfig={DEFAULT_CONFIG}
                onSave={save}
                onCancel={() => {}}
            />
        );
        change('bế khuôn bậc 2 from', '1');
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        expect(save).not.toHaveBeenCalled();
        change('bế khuôn bậc 2 from', '100');
        change('bế khuôn bậc 2 sale', '850');
        change('dán bao thư bậc 2 sale', '650');
        change('Tổng báo khách tối thiểu (đ)', '200000');
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].dieCut.tiers[1].sale).toBe(850);
        expect(save.mock.calls[0][0].gluing.tiers[1].sale).toBe(650);
        expect(save.mock.calls[0][0].orderMin.minSale).toBe(200000);
    });
});
