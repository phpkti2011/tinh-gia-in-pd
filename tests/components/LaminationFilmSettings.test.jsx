// @vitest-environment jsdom
/* eslint react/jsx-uses-vars: "error" */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import LaminationFilmSettings from '../../src/components/common/LaminationFilmSettings';

afterEach(cleanup);

const FILMS = [
    { id: 'mo', name: 'Mờ', percent: 0 },
    { id: 'kim', name: 'Màng kim tuyến', percent: 300 },
    { id: 'seven', name: 'Màng 7 màu', percent: 150, extra: 1000, extraCost: 300 },
];

describe('LaminationFilmSettings — tiền chênh', () => {
    it('màng cũ còn % hiện nhãn cảnh báo, ô tiền chênh trống; màng đã có tiền chênh hiện số', () => {
        render(
            <LaminationFilmSettings films={FILMS} onChange={() => {}} extraLabel="đ/trang A4" />
        );
        expect(screen.getByText(/Đang tính theo % cũ: \+300%/)).toBeTruthy();
        // Mờ 0% không bị cảnh báo; 7 màu đã chuyển nên không cảnh báo dù còn percent 150.
        expect(screen.queryByText(/\+150%/)).toBeNull();
        expect(screen.getByLabelText('Chênh báo khách Màng kim tuyến').value).toBe('');
        expect(screen.getByLabelText('Chênh báo khách Màng 7 màu').value).toBe('1000');
        expect(screen.getByText('Chênh báo khách (đ/trang A4)')).toBeTruthy();
    });

    it('nhập tiền chênh ⇒ màng chuyển chế độ; xoá trống ⇒ về % cũ', () => {
        const onChange = vi.fn();
        render(<LaminationFilmSettings films={FILMS} onChange={onChange} />);
        fireEvent.change(screen.getByLabelText('Chênh báo khách Màng kim tuyến'), {
            target: { value: '2000' },
        });
        expect(onChange.mock.calls[0][0][1]).toEqual({
            id: 'kim',
            name: 'Màng kim tuyến',
            percent: 300,
            extra: 2000,
        });

        fireEvent.change(screen.getByLabelText('Chênh báo khách Màng 7 màu'), {
            target: { value: '' },
        });
        const reverted = onChange.mock.calls[1][0][2];
        expect('extra' in reverted).toBe(false);
        expect('extraCost' in reverted).toBe(false);
        expect(reverted.percent).toBe(150);
    });

    it('ô chênh vốn chỉ hiện khi truyền extraCostLabel (In KTS)', () => {
        const { rerender } = render(<LaminationFilmSettings films={FILMS} onChange={() => {}} />);
        expect(screen.queryByLabelText('Chênh vốn Màng 7 màu')).toBeNull();
        rerender(
            <LaminationFilmSettings
                films={FILMS}
                onChange={() => {}}
                extraCostLabel="đ/m dài màng, mỗi mặt"
            />
        );
        expect(screen.getByLabelText('Chênh vốn Màng 7 màu').value).toBe('300');
    });

    it('nhập chênh vốn cho màng còn % ⇒ chuyển sang tiền chênh với chênh khách 0', () => {
        const onChange = vi.fn();
        render(
            <LaminationFilmSettings
                films={FILMS}
                onChange={onChange}
                extraCostLabel="đ/m dài màng, mỗi mặt"
            />
        );
        fireEvent.change(screen.getByLabelText('Chênh vốn Màng kim tuyến'), {
            target: { value: '500' },
        });
        expect(onChange.mock.calls[0][0][1]).toMatchObject({ extra: 0, extraCost: 500 });
    });

    it('thêm loại màng mới ⇒ mặc định ở chế độ tiền chênh 0', () => {
        const onChange = vi.fn();
        render(
            <LaminationFilmSettings
                films={FILMS}
                onChange={onChange}
                extraCostLabel="đ/m dài màng, mỗi mặt"
            />
        );
        fireEvent.click(screen.getByText('+ Thêm loại màng'));
        const added = onChange.mock.calls[0][0][3];
        expect(added).toMatchObject({ name: 'Loại màng mới', percent: 0, extra: 0, extraCost: 0 });
    });
});

describe('LaminationFilmSettings — nút lấy giá theo In KTS', () => {
    it('module bật ktsSync có nút, bấm ⇒ onChange nhận bảng đã gộp theo In KTS', () => {
        const onChange = vi.fn();
        render(<LaminationFilmSettings films={FILMS} onChange={onChange} ktsSync />);
        fireEvent.click(screen.getByText('Lấy giá màng theo In KTS'));
        const next = onChange.mock.calls[0][0];
        expect(next.find((f) => f.id === 'seven')).toEqual(FILMS[2]); // màng riêng giữ nguyên
        expect(next.some((f) => f.id === 'film_gg7ibm' && f.extra === 4000)).toBe(true);
    });

    it('không bật ktsSync (Tờ rơi, Decal giá rẻ) thì không có nút', () => {
        render(<LaminationFilmSettings films={FILMS} onChange={() => {}} />);
        expect(screen.queryByText('Lấy giá màng theo In KTS')).toBeNull();
    });

    it('In KTS (có ô chênh vốn) không hiện nút dù bật ktsSync — chính nó là nguồn', () => {
        render(
            <LaminationFilmSettings
                films={FILMS}
                onChange={() => {}}
                extraCostLabel="đ/m"
                ktsSync
            />
        );
        expect(screen.queryByText('Lấy giá màng theo In KTS')).toBeNull();
    });
});

describe('LaminationFilmSettings — tự theo In KTS đang chạy (ktsFilms)', () => {
    const KTS_LIVE = [
        { id: 'mo', name: 'Mờ', percent: 0 },
        { id: 'film_jdxlxq', name: 'Màng Nhung', extra: 2100, extraCost: 5500 },
        { id: 'film_new', name: 'Màng Mới', extra: 900, extraCost: 2000 },
    ];
    const OWN = [
        { id: 'mo', name: 'Mờ', percent: 0 },
        { id: 'film_mb5atm', name: 'Màng Nhung', percent: 400, extra: 1600 },
        { id: 'film_37544r', name: 'Màng riêng', percent: 400 },
    ];

    it('hiện giá THEO In KTS (không phải giá cũ đã lưu) và khoá ô + nút xoá', () => {
        render(
            <LaminationFilmSettings films={OWN} onChange={() => {}} ktsSync ktsFilms={KTS_LIVE} />
        );
        const nhung = screen.getByLabelText('Chênh báo khách Màng Nhung');
        expect(nhung.value).toBe('2100');
        expect(nhung.disabled).toBe(true);
        expect(screen.getAllByText(/Lấy theo In KTS khổ nhỏ/).length).toBeGreaterThan(0);
    });

    it('màng In KTS mới thêm tự xuất hiện trong bảng', () => {
        render(
            <LaminationFilmSettings films={OWN} onChange={() => {}} ktsSync ktsFilms={KTS_LIVE} />
        );
        expect(screen.getByLabelText('Chênh báo khách Màng Mới').value).toBe('900');
    });

    it('màng riêng của module vẫn sửa / xoá được', () => {
        const onChange = vi.fn();
        render(
            <LaminationFilmSettings films={OWN} onChange={onChange} ktsSync ktsFilms={KTS_LIVE} />
        );
        expect(screen.getByLabelText('Chênh báo khách Màng riêng').disabled).toBe(false);
        const deleteButtons = screen.getAllByText('Xóa');
        // thứ tự hàng: Mờ, Màng Nhung, Màng riêng, Màng Mới → hàng 3 là màng riêng
        expect(deleteButtons[2].disabled).toBe(false);
        expect(deleteButtons[1].disabled).toBe(true);
        fireEvent.click(deleteButtons[2]);
        const next = onChange.mock.calls[0][0];
        expect(next.some((f) => f.id === 'film_37544r')).toBe(false);
    });

    it('không truyền ktsFilms ⇒ giữ hành vi cũ: không khoá gì', () => {
        render(<LaminationFilmSettings films={OWN} onChange={() => {}} ktsSync />);
        expect(screen.getByLabelText('Chênh báo khách Màng Nhung').value).toBe('1600');
        expect(screen.getByLabelText('Chênh báo khách Màng Nhung').disabled).toBe(false);
    });
});
