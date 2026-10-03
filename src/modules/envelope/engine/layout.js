// Envelope engine — KHỔ TRẢI bao thư (kích thước khuôn cắt), hàm thuần.
//
// Không React, không storage, không network. Cùng đầu vào → cùng kết quả.
// Mọi công thức tính bằng mm theo docs/ke-hoach-module-kho-trai-bao-thu.md §3:
//
//   Kiểu khuôn                    Nắp W            Nắp H
//   Liền thân — nối đối diện nắp  (W+2T) × (2H+N)  (2W+N) × (H+2T)
//   Liền thân — nối cạnh bên      (2W+T) × (H+N+T) (W+N+T) × (2H+T)
//   Tách — phần trước             (W+2T) × (H+N+T) (W+N+T) × (H+2T)
//   Tách — mặt sau rời            (W−3) × (H−3)    (tổng mỗi chiều giảm 3 mm)
//
// KHÔNG cộng bleed/biên máy/khoảng cách bình; KHÔNG tự đảo ngang/cao; KHÔNG tự đổi kiểu
// khuôn theo kích thước. Bleed 0.3 cm do adapter KTS tự cộng khi bình tờ, không nằm ở đây.

export const ENVELOPE_LAYOUT_SCHEMA_VERSION = 1;
export const BACK_REDUCTION_MM = 3;
export const MAX_ENVELOPE_QUANTITY = 1000000;

export const ENVELOPE_UNITS = ['mm', 'cm'];
export const FLAP_EDGES = ['W', 'H'];
export const CONSTRUCTIONS = ['joined-opposite', 'joined-side', 'split'];

export const CONSTRUCTION_LABELS = {
    'joined-opposite': 'Liền thân — nối đối diện nắp',
    'joined-side': 'Liền thân — nối cạnh bên',
    split: 'Tách hai phần',
};
export const FLAP_EDGE_LABELS = { W: 'Cạnh ngang W', H: 'Cạnh cao H' };
export const PART_LABELS = { body: 'Thân bao thư', front: 'Phần trước', back: 'Mặt sau rời' };

// Khử nhiễu dấu phẩy động sau quy đổi/cộng (0.1 + 0.2), giữ tới 1e-6 mm — không làm tròn
// mất phần thập phân người dùng nhập (I11).
const precise = (n) => Math.round(n * 1e6) / 1e6;

export function toMm(value, unit) {
    return unit === 'cm' ? precise(value * 10) : value;
}

export function fromMm(valueMm, unit) {
    return unit === 'cm' ? precise(valueMm / 10) : valueMm;
}

// Đổi đơn vị hiển thị phải quy đổi GIÁ TRỊ đang nhập (35 cm → 350 mm), không giữ số cũ.
export function convertUnit(value, from, to) {
    if (!Number.isFinite(value) || from === to) return value;
    return fromMm(toMm(value, from), to);
}

const positive = (v) => Number.isFinite(v) && v > 0;

// Trả { ok, errors: { field: message } } để UI báo lỗi ngay tại từng ô nhập (§5, §6).
// Ô trống là NaN, không phải 0 → bị chặn như thiếu dữ liệu.
export function validateEnvelopeInput(input) {
    const s = input || {};
    const errors = {};
    if (!ENVELOPE_UNITS.includes(s.unit)) errors.unit = 'Chọn đơn vị mm hoặc cm.';
    const dims = [
        ['w', 'chiều ngang thành phẩm W'],
        ['h', 'chiều cao thành phẩm H'],
        ['flap', 'chiều dài nắp N'],
        ['tab', 'chiều rộng tay dán T'],
    ];
    for (const [key, label] of dims)
        if (!positive(s[key])) errors[key] = `Nhập ${label} là số lớn hơn 0.`;
    if (!Number.isSafeInteger(s.quantity) || s.quantity <= 0 || s.quantity > MAX_ENVELOPE_QUANTITY)
        errors.quantity = `Số lượng bao thư phải là số nguyên từ 1 đến ${MAX_ENVELOPE_QUANTITY.toLocaleString('vi-VN')}.`;
    if (!FLAP_EDGES.includes(s.flapEdge)) errors.flapEdge = 'Chọn vị trí nắp: cạnh W hoặc cạnh H.';
    if (!CONSTRUCTIONS.includes(s.construction)) errors.construction = 'Chọn kiểu khuôn.';
    if (s.construction === 'split') {
        if (typeof s.backPrint !== 'boolean')
            errors.backPrint = 'Chọn rõ có in hoặc không in mặt sau trước khi tính giá.';
        if (!errors.unit) {
            const limit = `phải lớn hơn ${BACK_REDUCTION_MM} mm để mặt sau rời có kích thước dương.`;
            if (!errors.w && toMm(s.w, s.unit) <= BACK_REDUCTION_MM)
                errors.w = `Khuôn tách: W ${limit}`;
            if (!errors.h && toMm(s.h, s.unit) <= BACK_REDUCTION_MM)
                errors.h = `Khuôn tách: H ${limit}`;
        }
    }
    return { ok: Object.keys(errors).length === 0, errors };
}

// Danh sách `parts` (§4): liền thân → [body]; tách → [front, back].
// Ném lỗi khi đầu vào không hợp lệ để không bao giờ trả kích thước từ dữ liệu thiếu.
export function computeEnvelopeLayout(input) {
    const valid = validateEnvelopeInput(input);
    if (!valid.ok) throw new Error(Object.values(valid.errors).join(' '));
    const W = toMm(input.w, input.unit),
        H = toMm(input.h, input.unit),
        N = toMm(input.flap, input.unit),
        T = toMm(input.tab, input.unit);
    const flapOnW = input.flapEdge === 'W';
    const size = (w, h) => ({ widthMm: precise(w), heightMm: precise(h) });
    let main;
    if (input.construction === 'joined-opposite')
        main = flapOnW ? size(W + 2 * T, 2 * H + N) : size(2 * W + N, H + 2 * T);
    else if (input.construction === 'joined-side')
        main = flapOnW ? size(2 * W + T, H + N + T) : size(W + N + T, 2 * H + T);
    else main = flapOnW ? size(W + 2 * T, H + N + T) : size(W + N + T, H + 2 * T);
    const split = input.construction === 'split';
    const parts = [
        { id: split ? 'front' : 'body', ...main, quantity: input.quantity, printEnabled: true },
    ];
    if (split)
        parts.push({
            id: 'back',
            ...size(W - BACK_REDUCTION_MM, H - BACK_REDUCTION_MM),
            quantity: input.quantity,
            printEnabled: input.backPrint,
        });
    return {
        schemaVersion: ENVELOPE_LAYOUT_SCHEMA_VERSION,
        unit: 'mm',
        envelopeQuantity: input.quantity,
        construction: input.construction,
        flapEdge: input.flapEdge,
        dimensionsMm: { W, H, N, T },
        parts,
    };
}

// Đường gấp = cạnh chung giữa hai mảnh kề nhau (để vẽ nét đứt trên hình).
function foldLines(panels) {
    const eps = 1e-6,
        folds = [];
    for (const a of panels)
        for (const b of panels) {
            if (a === b) continue;
            if (Math.abs(a.x + a.w - b.x) < eps) {
                const y1 = Math.max(a.y, b.y),
                    y2 = Math.min(a.y + a.h, b.y + b.h);
                if (y2 - y1 > eps) folds.push({ x1: b.x, y1, x2: b.x, y2 });
            }
            if (Math.abs(a.y + a.h - b.y) < eps) {
                const x1 = Math.max(a.x, b.x),
                    x2 = Math.min(a.x + a.w, b.x + b.w);
                if (x2 - x1 > eps) folds.push({ x1, y1: b.y, x2, y2: b.y });
            }
        }
    return folds;
}

// Vị trí từng mảnh (nắp, mặt trước/sau, tay dán) trên khổ trải, mm, gốc góc trên trái.
// Chỉ để người dùng KIỂM TRA bằng hình; không thay file khuôn bế. Hộp bao của các mảnh
// luôn bằng đúng widthMm × heightMm của phần (test bảo đảm).
export function describeEnvelopePanels(layout) {
    const { W, H, N, T } = layout.dimensionsMm;
    const flapOnW = layout.flapEdge === 'W';
    const P = (id, label, x, y, w, h) => ({
        id,
        label,
        x: precise(x),
        y: precise(y),
        w: precise(w),
        h: precise(h),
    });
    const flap = (x, y, w, h) => P('flap', 'Nắp', x, y, w, h),
        front = (x, y) => P('front', 'Mặt trước', x, y, W, H),
        back = (x, y) => P('back', 'Mặt sau', x, y, W, H),
        tab = (id, x, y, w, h) => P(id, 'Tay dán', x, y, w, h);
    let main;
    if (layout.construction === 'joined-opposite')
        main = flapOnW
            ? [
                  flap(T, 0, W, N),
                  front(T, N),
                  back(T, N + H),
                  tab('tab-left', 0, N, T, H),
                  tab('tab-right', T + W, N, T, H),
              ]
            : [
                  flap(0, T, N, H),
                  front(N, T),
                  back(N + W, T),
                  tab('tab-top', N, 0, W, T),
                  tab('tab-bottom', N, T + H, W, T),
              ];
    else if (layout.construction === 'joined-side')
        main = flapOnW
            ? [
                  flap(W, 0, W, N),
                  front(W, N),
                  back(0, N),
                  tab('tab-side', 2 * W, N, T, H),
                  tab('tab-bottom', W, N + H, W, T),
              ]
            : [
                  flap(0, H, N, H),
                  front(N, H),
                  back(N, 0),
                  tab('tab-bottom', N, 2 * H, W, T),
                  tab('tab-side', N + W, H, T, H),
              ];
    else
        main = flapOnW
            ? [
                  flap(T, 0, W, N),
                  front(T, N),
                  tab('tab-left', 0, N, T, H),
                  tab('tab-right', T + W, N, T, H),
                  tab('tab-bottom', T, N + H, W, T),
              ]
            : [
                  flap(0, T, N, H),
                  front(N, T),
                  tab('tab-top', N, 0, W, T),
                  tab('tab-bottom', N, T + H, W, T),
                  tab('tab-side', N + W, T, T, H),
              ];
    return layout.parts.map((part) => {
        const panels =
            part.id === 'back'
                ? [P('back', PART_LABELS.back, 0, 0, part.widthMm, part.heightMm)]
                : main;
        return {
            id: part.id,
            widthMm: part.widthMm,
            heightMm: part.heightMm,
            panels,
            folds: foldLines(panels),
        };
    });
}

export function formatLength(mm, unit = 'mm') {
    return fromMm(mm, unit).toLocaleString('vi-VN', { maximumFractionDigits: 6 });
}

// Mô tả bằng chữ để đối chiếu nhanh (đơn vị hiển thị theo người dùng chọn).
export function describeEnvelope(layout, unit = 'mm') {
    const { W, H, N, T } = layout.dimensionsMm;
    const f = (mm) => formatLength(mm, unit);
    return {
        summary: `Bao thư ${f(W)} × ${f(H)} ${unit} · nắp ở ${FLAP_EDGE_LABELS[layout.flapEdge].toLowerCase()}, dài ${f(N)} ${unit} · tay dán ${f(T)} ${unit} · ${CONSTRUCTION_LABELS[layout.construction].toLowerCase()}`,
        parts: layout.parts.map(
            (p) =>
                `${PART_LABELS[p.id]}: ${f(p.widthMm)} × ${f(p.heightMm)} ${unit} · ${p.quantity.toLocaleString('vi-VN')} cái · ${p.printEnabled ? 'có in' : 'chỉ tính giấy'}`
        ),
    };
}
