// @vitest-environment jsdom
/* eslint react/jsx-uses-vars: "error" */
import { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within, act } from '@testing-library/react';
import {
    CALENDAR_DEFAULT_CONFIG,
    CALENDAR_DEFAULT_INPUT,
} from '../../src/modules/calendar/config/defaultConfig';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig';
import CalendarInput from '../../src/modules/calendar/ui/CalendarInput';
import CalendarSettings from '../../src/modules/calendar/ui/CalendarSettings';
import CalendarModule from '../../src/modules/calendar/ui/CalendarModule';
const mocks = vi.hoisted(() => ({ role: vi.fn(), auth: vi.fn(), load: vi.fn(), save: vi.fn() }));
vi.mock('../../src/auth/useUserRole.js', () => ({ useUserRole: mocks.role }));
vi.mock('../../src/auth/useAuth.js', () => ({ useAuth: mocks.auth }));
vi.mock('../../src/modules/calendar/config/storage', async (original) => {
    const real = await original();
    return { ...real, loadCalendarFromCloud: mocks.load, saveCalendarConfig: mocks.save };
});
vi.mock('../../src/utils/configStorage', async () => {
    const { DEFAULT_CONFIG } = await import('../../src/modules/small-print/config/defaultConfig');
    return {
        loadConfig: () => structuredClone(DEFAULT_CONFIG),
        loadConfigFromCloud: async () => structuredClone(DEFAULT_CONFIG),
    };
});
afterEach(cleanup);
beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mocks.role.mockReturnValue({ isAdmin: false, role: 'staff', loading: false, error: null });
    mocks.auth.mockReturnValue({
        user: { id: 'user-a', email: 'staff@example.test' },
        loading: false,
        signOut: vi.fn(),
    });
    mocks.load.mockResolvedValue({
        ready: true,
        version: 1,
        printVersion: 31,
        config: structuredClone(CALENDAR_DEFAULT_CONFIG),
        printConfig: structuredClone(DEFAULT_CONFIG),
    });
    mocks.save.mockResolvedValue({ local: true, cloud: false, error: 'Chưa đồng bộ' });
});
function Inputs() {
    const [input, setInput] = useState(() => structuredClone(CALENDAR_DEFAULT_INPUT));
    return (
        <CalendarInput
            canViewCost
            input={input}
            config={CALENDAR_DEFAULT_CONFIG}
            printConfig={DEFAULT_CONFIG}
            onChange={setInput}
        />
    );
}
describe('Calendar user flows', () => {
    it('giá lót có mục riêng, sửa hệ số và định mức được lưu đúng khóa hiện có', async () => {
        const save = vi.fn().mockResolvedValue({ local: true, cloud: true });
        render(
            <CalendarSettings config={CALENDAR_DEFAULT_CONFIG} onSave={save} onCancel={() => {}} />
        );
        const section = screen
            .getByRole('heading', { name: 'Giá giấy lót trong' })
            .closest('section');
        expect(within(section).getByLabelText('Lót: hệ số giá bán trên vốn').value).toBe('2');
        expect(within(section).getByText(/không tính theo bậc số lượng/)).toBeTruthy();
        fireEvent.change(within(section).getByLabelText('Lót: hệ số giá bán trên vốn'), {
            target: { value: '3' },
        });
        fireEvent.change(within(section).getByLabelText('Số lót / đế'), { target: { value: '2' } });
        expect(within(section).getByText(/30.000 đ/)).toBeTruthy();
        fireEvent.click(screen.getAllByText('Lưu cài đặt lịch')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].geometry).toMatchObject({
            linerSaleFactor: 3,
            linerCopies: 2,
        });
    });
    it.each(['guest', 'staff', 'loading', 'error'])(
        'ẩn toàn bộ giá vốn trên giao diện cho %s',
        async (mode) => {
            if (mode === 'guest') mocks.auth.mockReturnValue({ user: null, loading: false });
            if (mode === 'loading')
                mocks.role.mockReturnValue({ isAdmin: true, loading: true, error: null });
            if (mode === 'error')
                mocks.role.mockReturnValue({ isAdmin: true, loading: false, error: 'Lỗi quyền' });
            render(<CalendarModule onBack={() => {}} />);
            await waitFor(() =>
                expect(screen.queryByText('Đang tải bảng giá mới nhất…')).toBeNull()
            );
            expect(screen.queryByRole('columnheader', { name: 'Giá vốn' })).toBeNull();
            expect(document.body.textContent).not.toMatch(/vốn/i);
            expect(screen.getByRole('columnheader', { name: 'Báo khách' })).toBeTruthy();
            fireEvent.change(screen.getByLabelText('Nguồn giấy áo'), { target: { value: 'art' } });
            fireEvent.change(screen.getByLabelText('Nguồn giấy lót'), { target: { value: 'art' } });
            expect(screen.queryByLabelText('Giá vốn 1 tờ mỹ thuật áo (đ)')).toBeNull();
            expect(screen.queryByLabelText('Giá vốn 1 tờ mỹ thuật lót (đ)')).toBeNull();
            expect(document.body.textContent).not.toMatch(/vốn/i);
            expect(screen.getByLabelText('Loại mỹ thuật lót')).toBeTruthy();
        }
    );
    it('admin thấy vốn và ô giá giấy; đăng xuất ẩn ngay dù role cũ còn là admin', async () => {
        mocks.role.mockReturnValue({ isAdmin: true, loading: false, error: null });
        const view = render(<CalendarModule onBack={() => {}} />);
        await waitFor(() => expect(screen.queryByText('Đang tải bảng giá mới nhất…')).toBeNull());
        expect(screen.getByRole('columnheader', { name: 'Giá vốn' })).toBeTruthy();
        expect(screen.getByText(/Riêng phần đế: vốn/)).toBeTruthy();
        fireEvent.change(screen.getByLabelText('Nguồn giấy áo'), { target: { value: 'art' } });
        fireEvent.change(screen.getByLabelText('Nguồn giấy lót'), { target: { value: 'art' } });
        expect(screen.getByLabelText('Giá vốn 1 tờ mỹ thuật áo (đ)')).toBeTruthy();
        expect(screen.getByLabelText('Giá vốn 1 tờ mỹ thuật lót (đ)')).toBeTruthy();
        mocks.auth.mockReturnValue({ user: null, loading: false });
        view.rerender(<CalendarModule onBack={() => {}} />);
        expect(document.body.textContent).not.toMatch(/vốn/i);
        expect(screen.queryByLabelText('Giá vốn 1 tờ mỹ thuật lót (đ)')).toBeNull();
    });
    it('áo/lót mỹ thuật chọn riêng, nút dùng cùng giấy sao chép khổ + giá nhưng không liên kết về sau', () => {
        render(<Inputs />);
        fireEvent.change(screen.getByLabelText('Nguồn giấy áo'), { target: { value: 'art' } });
        fireEvent.change(screen.getByLabelText('Khổ mỹ thuật áo'), { target: { value: 'custom' } });
        fireEvent.change(screen.getByLabelText('Ngang giấy mỹ thuật áo (cm)'), {
            target: { value: '80' },
        });
        fireEvent.change(screen.getByLabelText('Giá vốn 1 tờ mỹ thuật áo (đ)'), {
            target: { value: '8000' },
        });
        expect(screen.getByLabelText('Nguồn giấy lót').value).toBe('ream');
        fireEvent.click(screen.getByText('Dùng giấy mỹ thuật của áo'));
        expect(screen.getByLabelText('Nguồn giấy lót').value).toBe('art');
        expect(screen.getByLabelText('Ngang giấy mỹ thuật lót (cm)').value).toBe('80');
        expect(screen.getByLabelText('Giá vốn 1 tờ mỹ thuật lót (đ)').value).toBe('8000');
        fireEvent.change(screen.getByLabelText('Giá vốn 1 tờ mỹ thuật áo (đ)'), {
            target: { value: '9000' },
        });
        expect(screen.getByLabelText('Giá vốn 1 tờ mỹ thuật lót (đ)').value).toBe('8000');
    });
    it('thêm bậc 200/500, thêm loại và lưu draft riêng không sửa config đầu vào', async () => {
        const config = structuredClone(CALENDAR_DEFAULT_CONFIG),
            before = structuredClone(config),
            save = vi.fn().mockResolvedValue({ local: true, cloud: true });
        render(<CalendarSettings config={config} onSave={save} onCancel={() => {}} />);
        fireEvent.click(screen.getByText('+ Thêm bậc lò xo'));
        expect(screen.getByLabelText('coil 1 bậc 4 from').value).toBe('200');
        fireEvent.change(screen.getByLabelText('coil 1 bậc 4 from'), { target: { value: '500' } });
        fireEvent.click(screen.getByText('+ Thêm loại lò xo'));
        expect(screen.getByLabelText('Tên coil 2')).toBeTruthy();
        fireEvent.click(screen.getAllByText('Lưu cài đặt lịch')[0]);
        await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
        expect(save.mock.calls[0][0].materials.coil[0].tiers.at(-1).from).toBe(500);
        expect(config).toEqual(before);
    });
    it('bậc trùng bị chặn trước lưu; lỗi đồng bộ được hiển thị', async () => {
        const save = vi
            .fn()
            .mockResolvedValue({ local: true, cloud: false, error: 'invalid module: calendar' });
        render(
            <CalendarSettings config={CALENDAR_DEFAULT_CONFIG} onSave={save} onCancel={() => {}} />
        );
        fireEvent.change(screen.getByLabelText('coil 1 bậc 3 from'), { target: { value: '10' } });
        fireEvent.click(screen.getAllByText('Lưu cài đặt lịch')[0]);
        expect(save).not.toHaveBeenCalled();
        expect(screen.getByRole('status').textContent).toContain('không trùng');
        fireEvent.change(screen.getByLabelText('coil 1 bậc 3 from'), { target: { value: '100' } });
        fireEvent.click(screen.getAllByText('Lưu cài đặt lịch')[0]);
        await waitFor(() =>
            expect(screen.getByRole('status').textContent).toContain('chưa đồng bộ')
        );
    });
    it('quyền staff không thấy cài đặt giá, vẫn dùng công cụ và sơ đồ', async () => {
        render(<CalendarModule onBack={() => {}} />);
        await waitFor(() => expect(screen.queryByText('Đang tải bảng giá mới nhất…')).toBeNull());
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' }).disabled).toBe(true);
        fireEvent.click(screen.getByRole('button', { name: 'Sơ đồ cắt carton' }));
        expect(screen.getByRole('img', { name: 'Sơ đồ cắt mẫu 1' })).toBeTruthy();
        fireEvent.click(screen.getByRole('button', { name: 'Cài đặt giá lịch' }));
        expect(screen.getByText('Tài khoản này không có quyền admin')).toBeTruthy();
        expect(screen.queryByText('Lưu cài đặt lịch')).toBeNull();
    });
    it('admin lưu lỗi thì giữ nháp và chặn báo giá, chỉ mở lại khi tải được giá đã đồng bộ', async () => {
        mocks.role.mockReturnValue({ isAdmin: true, role: 'admin', loading: false, error: null });
        render(<CalendarModule onBack={() => {}} />);
        await waitFor(() => expect(screen.queryByText('Đang tải bảng giá mới nhất…')).toBeNull());
        fireEvent.click(screen.getByRole('button', { name: 'Cài đặt giá lịch' }));
        fireEvent.change(screen.getByLabelText('Áo không in: cách bán giấy'), {
            target: { value: 'cost-factor' },
        });
        fireEvent.click(
            screen.getByLabelText(
                'Tôi đã kiểm tra giá vật tư lịch và dùng bảng giá này để báo khách.'
            )
        );
        fireEvent.click(screen.getAllByText('Lưu cài đặt lịch')[0]);
        await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
        await waitFor(() =>
            expect(screen.getByRole('status').textContent).toContain('chưa đồng bộ')
        );
        fireEvent.click(screen.getByRole('button', { name: 'Về tính giá' }));
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        await waitFor(() => expect(mocks.load).toHaveBeenCalledTimes(2));
        await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' }).disabled).toBe(true);
    });
});

describe('Calendar automatic synchronization safety', () => {
    const ready = (version = 1, printVersion = 31) => {
        const config = structuredClone(CALENDAR_DEFAULT_CONFIG);
        config.pricesConfirmed = true;
        config.wrapperSale.blank = 'cost-factor';
        return {
            ready: true,
            version,
            printVersion,
            config,
            printConfig: structuredClone(DEFAULT_CONFIG),
        };
    };
    afterEach(() => {
        vi.useRealTimers();
    });
    it('không hiển thị giá cache trong lúc chờ mạng hoặc khi máy chủ thiếu bảng lịch', async () => {
        let finish;
        mocks.load.mockReturnValue(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        render(<CalendarModule onBack={() => {}} />);
        expect(screen.queryByRole('table')).toBeNull();
        expect(screen.queryByRole('button', { name: 'Sao chép báo giá' })).toBeNull();
        await act(async () =>
            finish({ ready: false, version: 0, error: 'Máy chủ chưa có bảng giá lịch.' })
        );
        expect(screen.getByRole('alert').textContent).toContain('chưa có');
        expect(screen.queryByRole('table')).toBeNull();
    });
    it('tự tải lại sau 15 giây, cập nhật giá và không ghi đè form admin đang sửa', async () => {
        vi.useFakeTimers();
        mocks.role.mockReturnValue({ isAdmin: true, loading: false });
        mocks.load.mockResolvedValue(ready());
        render(<CalendarModule onBack={() => {}} />);
        await act(async () => {});
        fireEvent.click(screen.getByRole('button', { name: 'Cài đặt giá lịch' }));
        fireEvent.change(screen.getByLabelText('Lót: hệ số giá bán trên vốn'), {
            target: { value: '3' },
        });
        const next = ready(2, 32);
        next.config.geometry.linerSaleFactor = 4;
        mocks.load.mockResolvedValue(next);
        await act(async () => {
            await vi.advanceTimersByTimeAsync(15000);
        });
        expect(screen.getByText(/Lịch v2 · KTS v32/)).toBeTruthy();
        expect(screen.getByLabelText('Lót: hệ số giá bán trên vốn').value).toBe('3');
        fireEvent.click(screen.getAllByText('Lưu cài đặt lịch')[0]);
        await act(async () => {});
        expect(mocks.save.mock.calls[0][1]).toEqual({ ownerId: 'user-a', baseVersion: 1 });
        expect(mocks.save.mock.calls[0][0].geometry.linerSaleFactor).toBe(3);
    });
    it('offline ẩn giá ngay; phản hồi cũ không mở lại; online tự phục hồi', async () => {
        mocks.load.mockResolvedValue(ready());
        render(<CalendarModule onBack={() => {}} />);
        await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
        let finish;
        mocks.load.mockReturnValueOnce(
            new Promise((resolve) => {
                finish = resolve;
            })
        );
        fireEvent(window, new Event('focus'));
        fireEvent(window, new Event('offline'));
        expect(screen.queryByRole('table')).toBeNull();
        await act(async () => finish(ready()));
        expect(screen.queryByRole('table')).toBeNull();
        fireEvent(window, new Event('online'));
        await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
    });
    it('kiểm tra lại KTS trước sao chép; thay phiên bản thì tính lại và chưa sao chép giá cũ', async () => {
        const writeText = vi.fn().mockResolvedValue();
        Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
        mocks.load.mockResolvedValue(ready());
        render(<CalendarModule onBack={() => {}} />);
        await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
        mocks.load.mockResolvedValue(ready(1, 32));
        fireEvent.click(screen.getByRole('button', { name: 'Sao chép báo giá' }));
        await waitFor(() =>
            expect(screen.getByText(/Bảng giá vừa được admin cập nhật/)).toBeTruthy()
        );
        expect(writeText).not.toHaveBeenCalled();
        fireEvent.click(screen.getByRole('button', { name: 'Sao chép báo giá' }));
        await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    });
    it('đổi danh mục không âm thầm áp giá loại khác theo chỉ số cũ', async () => {
        mocks.load.mockResolvedValue(ready());
        render(<CalendarModule onBack={() => {}} />);
        await waitFor(() => expect(screen.getByRole('table')).toBeTruthy());
        const next = ready(2);
        next.config.materials.carton.reverse();
        next.config.materials.carton[0].name = 'Carton khác';
        mocks.load.mockResolvedValue(next);
        fireEvent(window, new Event('focus'));
        await waitFor(() =>
            expect(screen.getByRole('button', { name: 'Đã kiểm tra giấy và vật tư' })).toBeTruthy()
        );
        expect(screen.queryByRole('table')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Đã kiểm tra giấy và vật tư' }));
        expect(screen.getByRole('table')).toBeTruthy();
    });
});
