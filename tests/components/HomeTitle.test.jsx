// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import HomeTitle from '../../src/components/home/HomeTitle';
import {
    MODULE_VISIBILITY_DEFAULT_CONFIG,
    validateModuleVisibilityConfig,
} from '../../src/config/moduleVisibilityConfig';

afterEach(cleanup);
describe('Tên công cụ ở trang chủ', () => {
    it('người dùng thường chỉ thấy tiêu đề', () => {
        render(<HomeTitle title="Tên xưởng" isAdmin={false} />);
        expect(screen.getByRole('heading').textContent).toBe('Tên xưởng');
        expect(screen.queryByRole('button')).toBeNull();
    });
    it('admin sửa và lưu tên đã bỏ khoảng trắng', async () => {
        const save = vi.fn().mockResolvedValue(true);
        render(<HomeTitle title="Tên cũ" isAdmin onSave={save} />);
        fireEvent.click(screen.getByRole('button', { name: 'Đổi tên công cụ tính giá' }));
        fireEvent.change(screen.getByLabelText('Tên công cụ tính giá'), {
            target: { value: '  Xưởng in P&D  ' },
        });
        fireEvent.click(screen.getByText('Lưu tên'));
        await waitFor(() => expect(screen.queryByRole('textbox')).toBeNull());
        expect(save).toHaveBeenCalledWith('Xưởng in P&D');
    });
    it('lưu lỗi giữ bản nháp; hủy không lưu', async () => {
        const save = vi.fn().mockResolvedValue(false);
        render(<HomeTitle title="Tên cũ" isAdmin onSave={save} />);
        fireEvent.click(screen.getByRole('button'));
        fireEvent.click(screen.getByText('Lưu tên'));
        await waitFor(() => expect(screen.getByText('Lưu tên').disabled).toBe(false));
        expect(screen.getByRole('textbox').value).toBe('Tên cũ');
        fireEvent.click(screen.getByText('Hủy'));
        expect(save).toHaveBeenCalledTimes(1);
    });
    it('chấp nhận cấu hình cũ, từ chối tiêu đề rỗng hoặc sai kiểu', () => {
        for (const value of ['', '   ', null, 5, 'x'.repeat(121)]) {
            expect(
                validateModuleVisibilityConfig({
                    ...MODULE_VISIBILITY_DEFAULT_CONFIG,
                    HOME_TITLE: value,
                }).isValid
            ).toBe(false);
        }
        expect(validateModuleVisibilityConfig({ MODULE_VISIBILITY: {} }).isValid).toBe(true);
    });
});
