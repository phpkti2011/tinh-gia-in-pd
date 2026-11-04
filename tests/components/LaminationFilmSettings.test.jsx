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
