// @vitest-environment jsdom
/* eslint react/jsx-uses-vars: "error" */
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import LaminationFilmSelect from '../../src/components/common/LaminationFilmSelect';

afterEach(cleanup);

describe('LaminationFilmSelect', () => {
    it('chỉ hiện tên màng, không kèm "(+…%)" dù màng còn % cũ hay đã có tiền chênh', () => {
        render(
            <LaminationFilmSelect
                id="laminationFilm"
                films={[
                    { id: 'mo', name: 'Mờ', percent: 0 },
                    { id: 'kim', name: 'Màng kim tuyến cát', percent: 300 },
                    { id: 'seven', name: 'Màng 7 màu sọc chéo', percent: 150, extra: 1000 },
                ]}
                value=""
                onChange={() => {}}
            />
        );
        const options = screen.getAllByRole('option').map((o) => o.textContent);
        expect(options).toEqual([
            '— chọn loại màng —',
            'Mờ',
            'Màng kim tuyến cát',
            'Màng 7 màu sọc chéo',
        ]);
    });
});
