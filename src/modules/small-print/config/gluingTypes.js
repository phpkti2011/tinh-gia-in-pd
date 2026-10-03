// Small-print — DÁN THÀNH PHẨM (GLUING_TYPES, config 1.9.0): validator + helper tạo dòng mới.
//
// GLUING_TYPES = [{ id, name, cost_tiers, customer_tiers }]. Mỗi kiểu dán (keo phá màng, keo
// 2 mặt vàng…) có bảng bậc CÙNG cấu trúc { max_qty, price, type: 'package' | 'per_piece' }
// như HOLE_PUNCHING_CONFIG và tra bằng calculateFinishingCost() theo SỐ THÀNH PHẨM. Một đơn
// chọn được nhiều dòng dán (params.gluingLines) — xem engine/pricing.js calculateGluingCost.
//
// Key OPTIONAL: config đã lưu trước 1.9.0 không có key vẫn hợp lệ (validator chạy trên config
// thô TRƯỚC khi merge default). Mảng rỗng cũng hợp lệ = admin tắt tính năng, ô chọn ẩn.
//
// Bậc cuối KHÔNG bắt buộc "không giới hạn" (cùng tiền lệ với bế kỹ thuật số): số lượng vượt
// bậc cuối thì engine trả 0 đ kèm cờ `uncovered` để màn kết quả cảnh báo, không tự lấy giá
// bậc cuối (bậc trọn gói cho ≤ N cái mà áp cho đơn gấp 10 lần là báo thiếu tiền trong im lặng).
//
// Giá để NaN khi vừa thêm kiểu/bậc: ô trống bị validator chặn lúc Lưu, tránh lưu nhầm 0 đ.

const TIER_TYPES = ['package', 'per_piece'];

export function validateGluingTypes(types) {
    if (types == null) return [];
    if (!Array.isArray(types)) return ['Danh sách kiểu dán phải là một mảng.'];
    const errors = [];
    const ids = new Set();
    const names = new Set();
    for (const type of types) {
        if (!type || typeof type !== 'object' || Array.isArray(type)) {
            errors.push('Mỗi kiểu dán phải là một object.');
            continue;
        }
        if (typeof type.id !== 'string' || !type.id || ids.has(type.id))
            errors.push('Mã kiểu dán phải có và không trùng nhau.');
        ids.add(type.id);
        const name = typeof type.name === 'string' ? type.name.trim().toLowerCase() : '';
        if (!name) errors.push('Nhập tên cho mọi kiểu dán.');
        else if (names.has(name)) errors.push('Tên kiểu dán không được trùng nhau.');
        names.add(name);

        const cost = type.cost_tiers;
        const customer = type.customer_tiers;
        if (!Array.isArray(cost) || !cost.length || !Array.isArray(customer) || !customer.length) {
            errors.push('Mỗi kiểu dán cần ít nhất một bậc giá vốn và giá khách.');
            continue;
        }
        if (cost.length !== customer.length)
            errors.push('Bảng giá vốn và giá khách của kiểu dán phải có cùng số bậc.');
        for (const rows of [cost, customer]) {
            let previous = 0;
            for (const row of rows) {
                // ∞ ở giữa bảng tự bị bắt: bậc sau nó không thể lớn hơn ∞.
                const max = row?.max_qty;
                if (!((Number.isSafeInteger(max) || max === Infinity) && max > previous))
                    errors.push('Mốc số lượng dán phải là số nguyên dương tăng dần, không trùng.');
                if (!row || !Number.isFinite(row.price) || row.price < 0)
                    errors.push('Nhập giá dán là số không âm cho mọi bậc.');
                if (!row || !TIER_TYPES.includes(row.type))
                    errors.push('Chọn cách tính dán hợp lệ (trọn gói hoặc theo sản phẩm).');
                previous = max;
            }
        }
        if (
            cost.length === customer.length &&
            cost.some(
                (row, i) => row?.max_qty !== customer[i]?.max_qty || row?.type !== customer[i]?.type
            )
        )
            errors.push('Mốc số lượng và cách tính của giá vốn và giá khách phải giống nhau.');
    }
    return [...new Set(errors)];
}

// id sinh một lần, KHÔNG đổi khi đổi tên — đơn đang mở tham chiếu kiểu dán bằng id.
export function newGluingTypeId() {
    return 'glue-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function emptyGluingTier(maxQty = Infinity) {
    return { max_qty: maxQty, price: NaN, type: 'per_piece' };
}

export function emptyGluingType(name = 'Kiểu dán mới') {
    return {
        id: newGluingTypeId(),
        name,
        cost_tiers: [emptyGluingTier()],
        customer_tiers: [emptyGluingTier()],
    };
}
