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
    it('chọn keo nắp hiển thị chiều dài keo, bỏ chọn gỡ khoản phí', async () => {
        const fresh = snapshot();
        fresh.config.flapTape = { costPerCm: 2, salePerCm: 5 };
        mocks.load.mockResolvedValue(fresh);
        await start();
        fireEvent.click(screen.getByLabelText('Dán keo 2 mặt nắp'));
        expect(screen.getByText('22 cm/bao × 100 bao = 2200 cm keo')).toBeTruthy();
        fireEvent.click(screen.getByLabelText('Dán keo 2 mặt nắp'));
        expect(screen.queryByText('22 cm/bao × 100 bao = 2200 cm keo')).toBeNull();
    });
    it('khổ chuẩn dùng cấu hình admin; xóa khổ đang chọn giữ kích thước đơn ở Tùy chỉnh', async () => {
        const fresh = snapshot();
        fresh.config.sizePresets = [{ id: 'shop-size', name: 'Bao thư thư mời', w: 235, h: 125 }];
        mocks.load.mockResolvedValue(fresh);
        await start();
        change('Khổ bao thư chuẩn', 'shop-size');
        expect(screen.getByRole('option', { name: 'Bao thư thư mời · 235 × 125 mm' })).toBeTruthy();
        expect(screen.getByLabelText('Ngang thành phẩm W (mm)').value).toBe('235');
        expect(screen.queryByRole('option', { name: '220 × 120 mm' })).toBeNull();
        const updated = snapshot();
        updated.version = 2;
        updated.config.sizePresets = [];
        mocks.load.mockResolvedValue(updated);
        await act(async () => {
            window.dispatchEvent(new Event('focus'));
        });
        await waitFor(() =>
            expect(screen.getByLabelText('Khổ bao thư chuẩn').value).toBe('custom')
        );
        expect(screen.getByLabelText('Ngang thành phẩm W (mm)').value).toBe('235');
        expect(screen.getByLabelText('Cao thành phẩm H (mm)').value).toBe('125');
        expect(screen.getByLabelText('Khổ bao thư chuẩn').options.length).toBe(1);
    });
    it('khổ chuẩn điền đúng theo mm/cm; gõ khổ khác trở về tùy chỉnh', async () => {
        await start();
        change('Khổ bao thư chuẩn', '230x160');
        expect(screen.getByLabelText('Ngang thành phẩm W (mm)').value).toBe('230');
        expect(screen.getByLabelText('Cao thành phẩm H (mm)').value).toBe('160');
        change('Đơn vị nhập', 'cm');
        change('Khổ bao thư chuẩn', '220x110');
        expect(screen.getByLabelText('Ngang thành phẩm W (cm)').value).toBe('22');
        expect(screen.getByLabelText('Cao thành phẩm H (cm)').value).toBe('11');
        expect(screen.getByLabelText('Dài nắp N (cm)').value).toBe('4');
        change('Ngang thành phẩm W (cm)', '22.5');
        expect(screen.getByLabelText('Khổ bao thư chuẩn').value).toBe('custom');
    });
    it('đổi bế cập nhật kết quả; không bế bỏ tiền khuôn và công bế', async () => {
        await start();
        change('Hình thức bế', 'digital');
        expect(screen.getByText(/không tính tiền khuôn · bảng giá KTS/)).toBeTruthy();
        change('Hình thức bế', 'none');
        expect(screen.getByText('Không tính phí bế')).toBeTruthy();
        change('Hình thức bế', 'mold');
        expect(screen.getByText(/khuôn bao thư \+ công bế · bảng giá KTS/)).toBeTruthy();
    });
    it('staff chọn giấy mỹ thuật theo bảng admin; không thấy giá vốn hoặc ô sửa giá', async () => {
        const fresh = snapshot();
        fresh.config.artPapers = [{ name: 'Mỹ thuật kem', w: 70, h: 100, cost: 12500 }];
        mocks.load.mockResolvedValue(fresh);
        await start();
        change('Giấy bao thư', 'art');
        expect(screen.getByLabelText('Loại giấy mỹ thuật')).toBeTruthy();
        expect(screen.queryByLabelText('Giá vốn mỗi tờ mỹ thuật (đ)')).toBeNull();
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' })).toBeTruthy();
        expect(document.body.textContent).not.toMatch(/giá vốn/i);
    });
    it('admin nhập giá và khổ mỹ thuật cho đơn; giá trống bỏ kết quả cũ', async () => {
        mocks.role.mockReturnValue({ isAdmin: true, loading: false, error: null });
        await start();
        change('Giấy bao thư', 'art');
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        change('Giá vốn mỗi tờ mỹ thuật (đ)', '14000');
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' })).toBeTruthy();
        change('Ngang giấy mỹ thuật (cm)', '79');
        change('Dài giấy mỹ thuật (cm)', '109');
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' })).toBeTruthy();
        change('Giá vốn mỗi tờ mỹ thuật (đ)', '');
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
    });
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
    it('thêm/sửa/xóa khổ chuẩn và lưu danh sách riêng; khổ trống chặn lưu', async () => {
        const save = vi.fn().mockResolvedValue({ cloud: true });
        render(
            <EnvelopeSettings
                config={ENVELOPE_DEFAULT_CONFIG}
                printConfig={DEFAULT_CONFIG}
                onSave={save}
                onCancel={() => {}}
            />
        );
        change('Ngang khổ chuẩn 1 (mm)', '225');
        change('Tên khổ chuẩn 1', 'Bao thư nhỏ');
        fireEvent.click(screen.getByText('+ Thêm khổ chuẩn'));
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('status').textContent).toContain('lớn hơn 0');
        change('Ngang khổ chuẩn 5 (mm)', '240');
        change('Cao khổ chuẩn 5 (mm)', '170');
        change('Tên khổ chuẩn 5', 'Bao thư thư mời');
        fireEvent.click(screen.getByText('Xóa khổ chuẩn 2'));
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        const sizes = save.mock.calls[0][0].sizePresets;
        expect(sizes[0].name).toBe('Bao thư nhỏ');
        expect(sizes[3].name).toBe('Bao thư thư mời');
        expect(sizes.map((p) => [p.w, p.h])).toEqual([
            [225, 120],
            [230, 160],
            [350, 250],
            [240, 170],
        ]);
        expect(new Set(sizes.map((p) => p.id)).size).toBe(4);
        expect(ENVELOPE_DEFAULT_CONFIG.sizePresets[0].w).toBe(220);
    });
    it('xóa hết khổ chuẩn lưu được danh sách rỗng', async () => {
        const save = vi.fn().mockResolvedValue({ cloud: true });
        render(
            <EnvelopeSettings
                config={ENVELOPE_DEFAULT_CONFIG}
                printConfig={DEFAULT_CONFIG}
                onSave={save}
                onCancel={() => {}}
            />
        );
        for (let i = 0; i < 4; i++) fireEvent.click(screen.getByText('Xóa khổ chuẩn 1'));
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].sizePresets).toEqual([]);
    });
    it('lưu danh mục mỹ thuật có tên, khổ và giá mỗi tờ', async () => {
        const save = vi.fn().mockResolvedValue({ cloud: true });
        render(
            <EnvelopeSettings
                config={ENVELOPE_DEFAULT_CONFIG}
                printConfig={DEFAULT_CONFIG}
                onSave={save}
                onCancel={() => {}}
            />
        );
        change('Tên giấy mỹ thuật 1', 'Mỹ thuật kem');
        change('Giá vốn mỗi tờ mỹ thuật 1 (đ)', '12500');
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].artPapers[0]).toEqual({
            name: 'Mỹ thuật kem',
            w: 70,
            h: 100,
            cost: 12500,
        });
    });
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
    it('lưu bậc dán và phí tối thiểu; bậc trùng bị chặn', async () => {
        const save = vi.fn().mockResolvedValue({ cloud: true });
        render(
            <EnvelopeSettings
                config={ENVELOPE_DEFAULT_CONFIG}
                printConfig={DEFAULT_CONFIG}
                onSave={save}
                onCancel={() => {}}
            />
        );
        expect(screen.queryByLabelText('bế khuôn bậc 2 from')).toBeNull();
        change('dán bao thư bậc 2 from', '1');
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        expect(save).not.toHaveBeenCalled();
        change('dán bao thư bậc 2 from', '100');
        change('dán bao thư bậc 2 sale', '650');
        expect(screen.queryByLabelText('Cách tính phí dán bao thư')).toBeNull();
        expect(screen.getByLabelText('dán bao thư bậc 1 cách tính').value).toBe('per_item');
        change('dán bao thư bậc 1 cách tính', 'package');
        change('dán bao thư bậc 2 cách tính', 'per_item');
        change('Tổng báo khách tối thiểu (đ)', '200000');
        change('Dán keo nắp — giá vốn (đ/cm)', '2');
        change('Dán keo nắp — giá khách (đ/cm)', '5');
        change('Dán keo nắp — giá vốn tối thiểu mỗi đơn (đ)', '40000');
        change('Dán keo nắp — giá khách tối thiểu mỗi đơn (đ)', '100000');
        fireEvent.click(screen.getAllByText('Lưu cài đặt bao thư')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].gluing.tiers[1].sale).toBe(650);
        expect(save.mock.calls[0][0].gluing.tiers[0].mode).toBe('package');
        expect(save.mock.calls[0][0].gluing.tiers[1].mode).toBe('per_item');
        expect(save.mock.calls[0][0].orderMin.minSale).toBe(200000);
        expect(save.mock.calls[0][0].flapTape).toEqual({
            costPerCm: 2,
            salePerCm: 5,
            minCost: 40000,
            minSale: 100000,
        });
    });
});
