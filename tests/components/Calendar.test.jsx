// @vitest-environment jsdom
/* eslint react/jsx-uses-vars: "error" */
import { useState } from 'react';
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
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
        user: { email: 'staff@example.test' },
        loading: false,
        signOut: vi.fn(),
    });
    mocks.load.mockResolvedValue(structuredClone(CALENDAR_DEFAULT_CONFIG));
    mocks.save.mockResolvedValue({ local: true, cloud: false, error: 'Chưa đồng bộ' });
});
function Inputs() {
    const [input, setInput] = useState(() => structuredClone(CALENDAR_DEFAULT_INPUT));
    return (
        <CalendarInput
            input={input}
            config={CALENDAR_DEFAULT_CONFIG}
            printConfig={DEFAULT_CONFIG}
            onChange={setInput}
        />
    );
}
describe('Calendar user flows', () => {
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
    it('admin lưu giá rồi trở lại tính; không tải cloud cũ đè bản vừa lưu local', async () => {
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
        expect(screen.getByRole('button', { name: 'Sao chép báo giá' }).disabled).toBe(false);
        expect(mocks.load).toHaveBeenCalledTimes(1);
        const table = screen.getByRole('table');
        expect(within(table).getByText('Giấy lót trong')).toBeTruthy();
    });
});
