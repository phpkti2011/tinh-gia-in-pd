// @vitest-environment jsdom
//
// Ô "Bế Formex" ở màn nhập liệu In Khổ Lớn (v1.4.0).
//
// Ràng buộc chốt ở đây — đây là test DUY NHẤT bắt được lệch pha UI ↔ engine:
//   - HAI lý do khoá khác nhau phải ra HAI ghi chú khác nhau: vật liệu chặn, và
//     chưa bồi Formex. Gộp chung là báo sai lý do cho nhân viên.
//   - Select hình dạng hiện GIÁ TRỊ THỰC TẾ engine tính: shapeKey lạ (admin vừa
//     xoá hình dạng) phải rơi về shapes[0], không được để ô trống.
//   - params KHÔNG bị xoá: đổi về vật liệu / bồi Formex lại là lựa chọn cũ quay về.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import LPInputPanel from '../../src/components/largeprint/LPInputPanel.jsx';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

afterEach(() => cleanup());

const config = LARGE_PRINT_DEFAULT_CONFIG;

const baseParams = {
    items: [{ width: 100, height: 100, quantity: 1 }],
    materialTypeKey: 'pp_co_keo',
    laminationTypeKey: 'none',
    formexTypeKey: 'formex_5mm',
    edgeTaping: false,
    grommetsCheck: false,
    grommetsCount: 0,
    dieCutting: false,
    formexDieCut: true,
    formexDieCutShapeKey: 'phuc_tap',
    standeeKey: 'none',
};

function renderPanel(params, cfg = config) {
    return render(<LPInputPanel config={cfg} params={params} onChange={() => {}} />);
}

function withBlocked(ids) {
    const c = structuredClone(config);
    c.MATERIAL_TYPES.pp_co_keo.disallowedFinishing = ids;
    return c;
}

describe('Đã bồi Formex → mở bình thường', () => {
    it('checkbox enabled + checked, select hiện đúng hình dạng đang chọn', () => {
        const { container } = renderPanel(baseParams);
        const box = container.querySelector('[name="formexDieCut"]');
        expect(box.disabled).toBe(false);
        expect(box.checked).toBe(true);
        expect(container.querySelector('#formexDieCutShapeKey').value).toBe('phuc_tap');
    });

    it('select có đủ 4 hình dạng của config', () => {
        const { container } = renderPanel(baseParams);
        const opts = [...container.querySelectorAll('#formexDieCutShapeKey option')];
        expect(opts.map((o) => o.value)).toEqual(['tron', 'vuong_cn', 'bo_goc', 'phuc_tap']);
    });

    it('không hiện ghi chú khoá nào', () => {
        renderPanel(baseParams);
        expect(screen.queryByText(/🔒/)).toBeNull();
    });

    it('bỏ tick → select hình dạng biến mất', () => {
        const { container } = renderPanel({ ...baseParams, formexDieCut: false });
        expect(container.querySelector('#formexDieCutShapeKey')).toBeNull();
        expect(container.querySelector('[name="formexDieCut"]').disabled).toBe(false);
    });
});

describe('CHƯA bồi Formex → khoá, nêu đúng lý do', () => {
    const params = { ...baseParams, formexTypeKey: 'none' };

    it('checkbox disabled, checked=false dù params.formexDieCut vẫn true', () => {
        const { container } = renderPanel(params);
        const box = container.querySelector('[name="formexDieCut"]');
        expect(box.disabled).toBe(true);
        expect(box.checked).toBe(false);
        expect(params.formexDieCut).toBe(true); // params KHÔNG bị xoá
    });

    it('select hình dạng không còn trong DOM', () => {
        const { container } = renderPanel(params);
        expect(container.querySelector('#formexDieCutShapeKey')).toBeNull();
    });

    it('ghi chú chỉ sang mục 4, KHÔNG phải ghi chú vật liệu', () => {
        renderPanel(params);
        expect(screen.getByText(/Chọn .*Bồi Formex.* ở mục 4 trước khi bế/)).toBeTruthy();
        expect(screen.queryByText(/không bế Formex được/)).toBeNull();
    });
});

describe('Vật liệu chặn "formexDieCut"', () => {
    const cfg = withBlocked(['formexDieCut']);

    it('checkbox disabled + ghi chú nêu tên vật liệu', () => {
        const { container } = renderPanel(baseParams, cfg);
        expect(container.querySelector('[name="formexDieCut"]').disabled).toBe(true);
        expect(screen.getByText(/PP Có Keo không bế Formex được/)).toBeTruthy();
    });

    it('bồi Formex vẫn mở (chỉ bế bị chặn)', () => {
        const { container } = renderPanel(baseParams, cfg);
        expect(container.querySelector('#formexTypeKey').disabled).toBe(false);
    });
});

describe('Vật liệu chặn "formex" → bế tắt theo dây chuyền', () => {
    const cfg = withBlocked(['formex']);

    it('cả select Formex lẫn checkbox bế đều khoá', () => {
        const { container } = renderPanel(baseParams, cfg);
        expect(container.querySelector('#formexTypeKey').value).toBe('none');
        expect(container.querySelector('[name="formexDieCut"]').disabled).toBe(true);
    });

    it('nêu lý do "chưa bồi Formex" (vì effFormexKey đã về none)', () => {
        renderPanel(baseParams, cfg);
        expect(screen.getByText(/ở mục 4 trước khi bế/)).toBeTruthy();
    });
});

describe('Fallback — shapeKey lạ / config cũ', () => {
    it('shapeKey không còn trong danh sách → select về hình ĐẦU (khớp engine)', () => {
        const { container } = renderPanel({
            ...baseParams,
            formexDieCutShapeKey: 'khong_ton_tai',
        });
        expect(container.querySelector('#formexDieCutShapeKey').value).toBe('tron');
    });

    it('config lưu trước v1.4.0 → không render checkbox, không crash', () => {
        const legacy = structuredClone(config);
        delete legacy.FORMEX_DIE_CUT_SHAPES;
        const { container } = renderPanel(baseParams, legacy);
        expect(container.querySelector('[name="formexDieCut"]')).toBeNull();
        expect(container.querySelector('[name="dieCutting"]')).not.toBeNull();
    });

    it('admin xoá sạch hình dạng → không render checkbox', () => {
        const c = structuredClone(config);
        c.FORMEX_DIE_CUT_SHAPES = [];
        const { container } = renderPanel(baseParams, c);
        expect(container.querySelector('[name="formexDieCut"]')).toBeNull();
    });
});
