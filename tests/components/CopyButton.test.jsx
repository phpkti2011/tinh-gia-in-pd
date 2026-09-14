// @vitest-environment jsdom
//
// Nút "Copy quy cách" dùng chung.
//
// Ràng buộc quan trọng: navigator.clipboard KHÔNG tồn tại khi trang chạy qua
// HTTP không bảo mật (vd `npm run dev -- --host` rồi nhân viên mở bằng IP LAN —
// rất dễ xảy ra ở xưởng nhiều máy). Gọi thẳng navigator.clipboard.writeText sẽ
// ném TypeError và làm hỏng nút, nên phải có đường lùi execCommand.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';

import CopyButton from '../../src/components/common/CopyButton.jsx';

const originalClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard');

function setClipboard(value) {
    Object.defineProperty(navigator, 'clipboard', {
        value,
        configurable: true,
        writable: true,
    });
}

beforeEach(() => {
    document.execCommand = vi.fn(() => true);
});

afterEach(() => {
    cleanup();
    if (originalClipboard) Object.defineProperty(navigator, 'clipboard', originalClipboard);
    else delete navigator.clipboard;
    vi.restoreAllMocks();
});

describe('Có navigator.clipboard (HTTPS / localhost)', () => {
    it('copy đúng nội dung và báo "Đã copy"', async () => {
        const writeText = vi.fn(() => Promise.resolve());
        setClipboard({ writeText });

        render(<CopyButton text={'500 _ 9x5.5cm\nGiá: 1.250.000đ'} />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByText(/Đã copy/)).toBeTruthy());
        expect(writeText).toHaveBeenCalledWith('500 _ 9x5.5cm\nGiá: 1.250.000đ');
        expect(document.execCommand).not.toHaveBeenCalled();
    });
});

describe('KHÔNG có navigator.clipboard (mở bằng IP LAN qua HTTP)', () => {
    it('không ném lỗi, chạy đường lùi execCommand', async () => {
        setClipboard(undefined);

        render(<CopyButton text="quy cách" />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
        expect(screen.getByText(/Đã copy/)).toBeTruthy();
    });

    it('clipboard ném lỗi (quyền bị chặn) → vẫn lùi về execCommand', async () => {
        setClipboard({
            writeText: vi.fn(() => Promise.reject(new Error('NotAllowedError'))),
        });

        render(<CopyButton text="quy cách" />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(document.execCommand).toHaveBeenCalledWith('copy'));
        expect(screen.getByText(/Đã copy/)).toBeTruthy();
    });

    it('cả hai đường đều hỏng → báo lỗi, không vỡ UI', async () => {
        setClipboard(undefined);
        document.execCommand = vi.fn(() => {
            throw new Error('không hỗ trợ');
        });

        render(<CopyButton text="quy cách" />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => expect(screen.getByText(/Copy lỗi/)).toBeTruthy());
    });
});

describe('Không có gì để copy', () => {
    it('text rỗng/null → không render nút', () => {
        const { container: a } = render(<CopyButton text="" />);
        expect(a.querySelector('button')).toBeNull();
        cleanup();
        const { container: b } = render(<CopyButton text={null} />);
        expect(b.querySelector('button')).toBeNull();
    });
});

describe('Nhãn', () => {
    it('mặc định "Copy quy cách", đổi được qua prop', () => {
        setClipboard({ writeText: vi.fn(() => Promise.resolve()) });
        render(<CopyButton text="x" />);
        expect(screen.getByText(/Copy quy cách/)).toBeTruthy();
        cleanup();
        render(<CopyButton text="x" label="Copy dòng này" />);
        expect(screen.getByText(/Copy dòng này/)).toBeTruthy();
    });
});
