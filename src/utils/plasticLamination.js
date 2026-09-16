// Ép plastic (màng nhiệt bỏ túi) cho In KTS khổ nhỏ — helper thuần, không React.
// Dùng chung cho engine (small-print/engine/finishing.js), InputPanel,
// ResultPanel và jobSpec (chuỗi "Copy quy cách").
//
// Mô hình (config PLASTIC_LAMINATION_CONFIG):
//   - Bảng giá CHUNG cho mọi độ dày: `tiers` (hàng = bậc SL theo max_qty, cột =
//     khổ) + `minPrice` (sàn bán / tấm theo khổ — CHỈ ADMIN thấy).
//   - Mỗi độ dày trong `thicknesses` chỉ khai % phụ thu + các khổ được phép
//     chọn (`sizeIds`). Nhân viên chọn độ dày rồi chọn khổ thủ công.
//
// ⚠ HAI TÍNH CHẤT AN TOÀN — lý do 128 golden test khoá giá vẫn phải xanh:
//   1. Config cũ chưa có PLASTIC_LAMINATION_CONFIG → mọi helper trả rỗng/null,
//      engine trả 0 → giá không đổi.
//   2. Chưa chọn độ dày ('none') → không có gì thay đổi. Chọn độ dày mà CHƯA
//      CHỌN KHỔ (hoặc khổ không được tick cho độ dày đó) → tiền ép = 0 và chuỗi
//      quy cách ghi thẳng "(CHƯA CHỌN khổ)" để xưởng hỏi lại, không đoán bừa.
//
// id khổ / độ dày sinh một lần rồi giữ nguyên: admin đổi tên không làm hỏng báo
// giá đã lưu. id khổ là KEY trong map giá (`price`, `minPrice`) nên tiền tố + '_'
// để KHÔNG BAO GIỜ trùng các khoá upper-bound mà restoreInfinity xử lý
// (max, max_qty, upTo, …) — trùng là null bị đổi thành Infinity.

export const PLASTIC_SIZE_UNSET_NOTE = '(CHƯA CHỌN khổ)';

const list = (v) => (Array.isArray(v) ? v : []);
const cleanName = (v) => (typeof v === 'string' && v.trim() ? v.trim() : '');

export function findPlasticThickness(cfg, id) {
    if (!id || id === 'none') return null;
    return list(cfg?.thicknesses).find((t) => t && t.id === id) || null;
}

export function findPlasticSize(cfg, id) {
    if (!id) return null;
    return list(cfg?.sizes).find((s) => s && s.id === id) || null;
}

// Các khổ độ dày này được phép chọn — giữ thứ tự cột trong bảng (cfg.sizes).
export function plasticSizesFor(cfg, thicknessId) {
    const th = findPlasticThickness(cfg, thicknessId);
    if (!th) return [];
    const allowed = new Set(list(th.sizeIds));
    return list(cfg?.sizes).filter((s) => s && allowed.has(s.id));
}

// Độ dày + khổ đã chọn. `size` = null khi chưa chọn hoặc khổ không được tick
// cho độ dày đó (coi như chưa chọn — an toàn hơn là tính bừa theo bảng).
export function resolvePlastic(cfg, thicknessId, sizeId) {
    const thickness = findPlasticThickness(cfg, thicknessId);
    if (!thickness) return { thickness: null, size: null };
    const size = plasticSizesFor(cfg, thicknessId).find((s) => s.id === sizeId) || null;
    return { thickness, size };
}

// Nhãn hiển thị ở màn tính giá: 'Ép plastic 80 mic — A4' (chưa chọn khổ thì
// chỉ 'Ép plastic 80 mic'). Không có độ dày ⇒ null.
export function plasticLabel(cfg, thicknessId, sizeId) {
    const { thickness, size } = resolvePlastic(cfg, thicknessId, sizeId);
    if (!thickness) return null;
    const thName = cleanName(thickness.name) || 'độ dày ?';
    const szName = size ? cleanName(size.name) : '';
    return szName ? `Ép plastic ${thName} — ${szName}` : `Ép plastic ${thName}`;
}

// Cụm chữ chèn vào quy cách gửi khách / xưởng:
//   'ép plastic 80 mic khổ A4' | 'ép plastic 80 mic (CHƯA CHỌN khổ)' | null.
export function plasticPhrase(cfg, thicknessId, sizeId) {
    const { thickness, size } = resolvePlastic(cfg, thicknessId, sizeId);
    if (!thickness) return null;
    const thName = cleanName(thickness.name) || 'độ dày ?';
    const szName = size ? cleanName(size.name) : '';
    return szName
        ? `ép plastic ${thName} khổ ${szName}`
        : `ép plastic ${thName} ${PLASTIC_SIZE_UNSET_NOTE}`;
}

// Sinh id ổn định cho khổ / độ dày admin thêm mới (xem ghi chú tiền tố ở đầu file).
export function newPlasticId(prefix = 'pl') {
    return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
