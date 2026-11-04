// @vitest-environment jsdom
/* eslint react/jsx-uses-vars: "error" */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import StandardCalendarModule from '../../src/modules/standard-calendar/ui/StandardCalendarModule';

afterEach(cleanup);

const vnd = (n) => n.toLocaleString('vi-VN') + ' đ';
const qty = (v) =>
    fireEvent.change(screen.getByLabelText('Số lượng (cuốn)'), { target: { value: v } });
const status = () => screen.getByRole('status');

describe('Lịch khổ chuẩn — giao diện', () => {
    it('mở lên: quy cách đầu tiên + 10 cuốn đã có giá', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
            'Tính Giá Lịch Khổ Chuẩn'
        );
        expect(within(status()).getByText(vnd(1738000))).toBeTruthy();
        expect(within(status()).getByText(vnd(173800))).toBeTruthy();
    });

    it('hiện 5 quy cách bằng hình, chọn quy cách khác thì giá đổi theo', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        const cards = screen
            .getAllByRole('button')
            .filter((b) => b.getAttribute('aria-pressed') !== null);
        expect(cards).toHaveLength(5);
        expect(cards[0].getAttribute('aria-pressed')).toBe('true');

        fireEvent.click(cards[1]); // Ngang 20 x Cao 15
        expect(cards[1].getAttribute('aria-pressed')).toBe('true');
        expect(cards[0].getAttribute('aria-pressed')).toBe('false');
        expect(within(status()).getByText(vnd(1378000))).toBeTruthy();
    });

    it('số lượng nằm giữa hai bậc: nói rõ bậc nào được áp', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        fireEvent.click(screen.getAllByRole('button', { pressed: false })[0]); // 20×15
        qty('8');
        expect(status().textContent).toContain('giữa bậc 5 và 10');
        expect(status().textContent).toContain('áp đơn giá bậc 5');
        expect(within(status()).getByText(vnd(162200 * 8))).toBeTruthy();
    });

    it('vượt 3.000 cuốn → báo giá riêng, không có nút sao chép', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        qty('3001');
        expect(status().textContent).toContain('Cần báo giá riêng');
        expect(screen.queryByText('Sao chép báo giá')).toBeNull();
    });

    it('ô trống / 0 / số thập phân → không hợp lệ', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        for (const v of ['', '0', '2.5', '-3']) {
            qty(v);
            expect(status().textContent).toContain('Số lượng không hợp lệ');
        }
    });

    it('90 cuốn của quy cách 25×15 gợi ý đặt tròn 100 cuốn vì rẻ hơn', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        fireEvent.click(screen.getAllByRole('button', { pressed: false })[1]); // 25×15 (1 phần)
        qty('90');
        expect(screen.getByText(/Có thể gợi ý khách đặt tròn bậc này/)).toBeTruthy();
        qty('100');
        expect(screen.queryByText(/Có thể gợi ý khách đặt tròn bậc này/)).toBeNull();
    });

    it('bảng giá mở/đóng được và đánh dấu bậc đang áp', () => {
        render(<StandardCalendarModule onBack={() => {}} />);
        expect(screen.queryByRole('table')).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: /Bảng giá theo số lượng/ }));
        const table = screen.getByRole('table');
        expect(within(table).getAllByRole('row')).toHaveLength(26); // 1 tiêu đề + 25 bậc
        const row10 = within(table).getByText('10 cuốn').closest('tr');
        expect(row10.className).toContain('bg-yellow-500/10');
    });

    it('nút Trang chủ gọi onBack', () => {
        const onBack = vi.fn();
        render(<StandardCalendarModule onBack={onBack} />);
        fireEvent.click(screen.getByText('← Trang chủ'));
        expect(onBack).toHaveBeenCalledTimes(1);
    });
});
