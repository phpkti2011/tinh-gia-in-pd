// @vitest-environment jsdom
//
// Khoá thành phẩm theo vật liệu ở màn nhập liệu In Khổ Lớn.
//
// Đây là test DUY NHẤT bắt được lệch pha UI ↔ engine. Ràng buộc chốt ở đây:
//   - Control bị chặn phải disabled VÀ hiển thị GIÁ TRỊ THỰC TẾ engine đang tính
//     ('none' / unchecked). Nếu để nguyên lựa chọn cũ thì ô mờ sẽ ghi "Màng Mờ"
//     trong khi giá bên phải không có tiền cán màng → mâu thuẫn ngay trên màn hình.
//   - Ô nhập số khoen phải biến mất khi khoen bị chặn (không chỉ checkbox).
//   - params KHÔNG bị xoá: đổi về vật liệu cũ là lựa chọn cũ quay lại.

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

import LPInputPanel from '../../src/components/largeprint/LPInputPanel.jsx';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';

afterEach(() => cleanup());

const config = LARGE_PRINT_DEFAULT_CONFIG;

const baseParams = {
    items: [{ width: 100, height: 100, quantity: 1 }],
    materialTypeKey: 'pp_co_keo',
    laminationTypeKey: 'mang_mo',
    formexTypeKey: 'formex_5mm',
    edgeTaping: true,
    grommetsCheck: true,
    grommetsCount: 8,
    dieCutting: true,
    standeeKey: 'none',
};

function renderPanel(params, cfg = config) {
    return render(<LPInputPanel config={cfg} params={params} onChange={() => {}} />);
}

// Config thử: bạt chặn cán màng + formex + khoen (không đụng default của repo).
function configBlockingHiflex(ids) {
    const c = structuredClone(config);
    c.MATERIAL_TYPES.hiflex.disallowedFinishing = ids;
    return c;
}

describe('Vật liệu không bị chặn → mọi control bình thường', () => {
    it('PP Có Keo: cán màng + formex mở, checkbox tick được', () => {
        const { container } = renderPanel(baseParams);
        const lam = container.querySelector('#laminationTypeKey');
        const formex = container.querySelector('#formexTypeKey');

        expect(lam.disabled).toBe(false);
        expect(lam.value).toBe('mang_mo');
        expect(formex.disabled).toBe(false);
        expect(formex.value).toBe('formex_5mm');
        expect(container.querySelector('[name="edgeTaping"]').disabled).toBe(false);
        expect(container.querySelector('[name="dieCutting"]').disabled).toBe(false);
    });

    it('không hiện ghi chú khoá nào', () => {
        renderPanel(baseParams);
        expect(screen.queryByText(/🔒/)).toBeNull();
    });
});

describe('Admin bỏ tick "Cán màng" cho Bạt Hiflex', () => {
    const cfg = configBlockingHiflex(['lamination']);
    const params = { ...baseParams, materialTypeKey: 'hiflex' };

    it('ô Cán Màng disabled và hiện "none", KHÔNG hiện mang_mo', () => {
        const { container } = renderPanel(params, cfg);
        const lam = container.querySelector('#laminationTypeKey');
        expect(lam.disabled).toBe(true);
        expect(lam.value).toBe('none');
    });

    it('hiện ghi chú nêu tên vật liệu', () => {
        renderPanel(params, cfg);
        expect(screen.getByText(/Bạt Hiflex không cán màng được/)).toBeTruthy();
    });

    it('formex + 3 checkbox vẫn mở (chỉ cán màng bị chặn)', () => {
        const { container } = renderPanel(params, cfg);
        expect(container.querySelector('#formexTypeKey').disabled).toBe(false);
        expect(container.querySelector('[name="edgeTaping"]').disabled).toBe(false);
        expect(container.querySelector('[name="grommetsCheck"]').disabled).toBe(false);
        expect(container.querySelector('[name="dieCutting"]').disabled).toBe(false);
    });

    it('dán biên + khoen vẫn tick, ô số khoen vẫn hiện', () => {
        const { container } = renderPanel(params, cfg);
        expect(container.querySelector('[name="edgeTaping"]').checked).toBe(true);
        expect(container.querySelector('#grommetsCount')).not.toBeNull();
    });

    it('CHƯA tick (default) thì Bạt vẫn cán màng bình thường', () => {
        const { container } = renderPanel(params);
        expect(container.querySelector('#laminationTypeKey').disabled).toBe(false);
        expect(container.querySelector('#laminationTypeKey').value).toBe('mang_mo');
    });
});

describe('Chặn đóng khoen — ô nhập số khoen phải biến mất', () => {
    const cfg = configBlockingHiflex(['grommets']);
    const params = { ...baseParams, materialTypeKey: 'hiflex' };

    it('checkbox disabled và checked=false dù params.grommetsCheck vẫn true', () => {
        const { container } = renderPanel(params, cfg);
        const box = container.querySelector('[name="grommetsCheck"]');
        expect(box.disabled).toBe(true);
        expect(box.checked).toBe(false);
        expect(params.grommetsCheck).toBe(true); // params KHÔNG bị xoá
    });

    it('ô #grommetsCount không còn trong DOM', () => {
        const { container } = renderPanel(params, cfg);
        expect(container.querySelector('#grommetsCount')).toBeNull();
    });

    it('ghi chú gộp liệt kê đúng tên thành phẩm bị khoá', () => {
        renderPanel(params, cfg);
        expect(screen.getByText(/không làm được:.*Đóng khoen/)).toBeTruthy();
    });
});

describe('Chặn Bồi Formex', () => {
    const cfg = configBlockingHiflex(['formex']);
    const params = { ...baseParams, materialTypeKey: 'hiflex' };

    it('select disabled và về "none"', () => {
        const { container } = renderPanel(params, cfg);
        const formex = container.querySelector('#formexTypeKey');
        expect(formex.disabled).toBe(true);
        expect(formex.value).toBe('none');
    });

    it('ghi chú khoá thay chỗ dòng "Giảm: 5-10m²…"', () => {
        renderPanel(params, cfg);
        expect(screen.getByText(/Bạt Hiflex không bồi Formex được/)).toBeTruthy();
        expect(screen.queryByText(/Giảm: 5-10m²/)).toBeNull();
    });
});

describe('Backward-compat — config không có disallowedFinishing', () => {
    it('mọi control đều mở (fallback dễ dãi)', () => {
        const legacy = structuredClone(config);
        for (const m of Object.values(legacy.MATERIAL_TYPES)) delete m.disallowedFinishing;

        const { container } = renderPanel({ ...baseParams, materialTypeKey: 'hiflex' }, legacy);
        expect(container.querySelector('#laminationTypeKey').disabled).toBe(false);
        expect(container.querySelector('#laminationTypeKey').value).toBe('mang_mo');
        expect(screen.queryByText(/🔒/)).toBeNull();
    });
});
