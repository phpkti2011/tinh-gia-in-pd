// @vitest-environment jsdom
//
// Admin đổi tên module ngay trên tile trang chủ (title / desc / heading).
//
// Ràng buộc quan trọng được chốt ở đây:
//   - Nút ✎ chỉ hiện với admin.
//   - Chế độ sửa KHÔNG được render <button> tile bọc ngoài, vì <input> nằm trong <button> là
//     HTML không hợp lệ và click sẽ chui lên mở module giữa lúc đang gõ.
//   - onSaveLabel nhận patch đã trim, bỏ hẳn field để trống (parent lấp bằng default).

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import ModuleTile from '../../src/components/home/ModuleTile.jsx';

afterEach(() => cleanup());

const MOD = {
    id: 'small',
    icon: '🖨',
    border: 'hover:border-blue-500',
    titleHover: 'group-hover:text-blue-400',
    link: 'text-blue-400',
};

const LABEL = {
    title: 'In KTS Khổ Nhỏ',
    desc: 'In laser kỹ thuật số...',
    heading: 'In KTS Khổ Nhỏ — Tính Giá & Báo Giá',
};

function setup(overrides = {}) {
    const props = {
        mod: MOD,
        label: LABEL,
        onSelect: vi.fn(),
        isAdmin: true,
        visible: true,
        onToggle: vi.fn(),
        onSaveLabel: vi.fn(),
        ...overrides,
    };
    render(<ModuleTile {...props} />);
    return props;
}

const editButton = () => screen.getByRole('button', { name: /Đổi tên/ });
const field = (name) => screen.getByLabelText(name);

describe('ModuleTile — chế độ xem', () => {
    it('hiển thị title + desc lấy từ prop label, không phải từ mod', () => {
        setup();
        expect(screen.getByText('In KTS Khổ Nhỏ')).toBeTruthy();
        expect(screen.getByText('In laser kỹ thuật số...')).toBeTruthy();
    });

    it('người dùng thường không thấy nút ✎ lẫn nút Hiện/Ẩn', () => {
        setup({ isAdmin: false });
        expect(screen.queryByRole('button', { name: /Đổi tên/ })).toBeNull();
        expect(screen.queryByText('Hiện')).toBeNull();
    });

    it('bấm vào tile gọi onSelect với id module', () => {
        const { onSelect } = setup();
        fireEvent.click(screen.getByText('In KTS Khổ Nhỏ'));
        expect(onSelect).toHaveBeenCalledWith('small');
    });
});

describe('ModuleTile — chế độ sửa', () => {
    it('bấm ✎ mở 3 ô, đổ sẵn giá trị hiện tại', () => {
        setup();
        fireEvent.click(editButton());
        expect(field('Tên module').value).toBe(LABEL.title);
        expect(field('Mô tả ngắn').value).toBe(LABEL.desc);
        expect(field('Tiêu đề trong trang').value).toBe(LABEL.heading);
    });

    it('không render <button> tile khi đang sửa (tránh <input> lồng trong <button>)', () => {
        const { onSelect } = setup();
        fireEvent.click(editButton());
        // Mọi input phải nằm ngoài mọi <button>.
        for (const input of document.querySelectorAll('input, textarea')) {
            expect(input.closest('button')).toBeNull();
        }
        fireEvent.click(field('Tên module'));
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('Lưu gửi patch đã trim cho cả 3 field', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.change(field('Tên module'), { target: { value: '  In Tem  ' } });
        fireEvent.change(field('Mô tả ngắn'), { target: { value: ' Mô tả mới ' } });
        fireEvent.change(field('Tiêu đề trong trang'), { target: { value: ' Báo Giá In Tem ' } });
        fireEvent.click(screen.getByText('✓ Lưu'));

        expect(onSaveLabel).toHaveBeenCalledWith('small', {
            title: 'In Tem',
            desc: 'Mô tả mới',
            heading: 'Báo Giá In Tem',
        });
    });

    it('field để trống bị loại khỏi patch → parent lấp bằng default', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.change(field('Tên module'), { target: { value: 'In Tem' } });
        fireEvent.change(field('Mô tả ngắn'), { target: { value: '   ' } });
        fireEvent.change(field('Tiêu đề trong trang'), { target: { value: '' } });
        fireEvent.click(screen.getByText('✓ Lưu'));

        expect(onSaveLabel).toHaveBeenCalledWith('small', { title: 'In Tem' });
    });

    it('Enter ở ô tên = lưu', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.change(field('Tên module'), { target: { value: 'In Tem' } });
        fireEvent.keyDown(field('Tên module'), { key: 'Enter' });
        expect(onSaveLabel).toHaveBeenCalledWith(
            'small',
            expect.objectContaining({ title: 'In Tem' })
        );
    });

    it('Enter lúc bộ gõ tiếng Việt đang ghép ký tự thì KHÔNG lưu', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.keyDown(field('Tên module'), { key: 'Enter', keyCode: 229 });
        expect(onSaveLabel).not.toHaveBeenCalled();
    });

    it('Esc huỷ, không gọi save và trả về chế độ xem', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.change(field('Tên module'), { target: { value: 'Vứt đi' } });
        fireEvent.keyDown(field('Tên module'), { key: 'Escape' });

        expect(onSaveLabel).not.toHaveBeenCalled();
        expect(screen.getByText('In KTS Khổ Nhỏ')).toBeTruthy();
    });

    it('nút Huỷ bỏ mọi thay đổi; mở lại thấy giá trị gốc', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.change(field('Tên module'), { target: { value: 'Vứt đi' } });
        fireEvent.click(screen.getByText('✗ Huỷ'));
        expect(onSaveLabel).not.toHaveBeenCalled();

        fireEvent.click(editButton());
        expect(field('Tên module').value).toBe(LABEL.title);
    });

    it('Khôi phục mặc định gửi patch rỗng', () => {
        const { onSaveLabel } = setup();
        fireEvent.click(editButton());
        fireEvent.change(field('Tên module'), { target: { value: 'Gì đó' } });
        fireEvent.click(screen.getByText('Khôi phục mặc định'));
        expect(onSaveLabel).toHaveBeenCalledWith('small', {});
    });
});
