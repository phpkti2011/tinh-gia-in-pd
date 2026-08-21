// Decal nhãn GIÁ RẺ — engine (dựng từ bảng giá Google Sheets).
//
// Pure function: chỉ phụ thuộc params + config. TRA BẢNG (cỡ × mốc SL 500/1000/2000) → TỔNG gốc
// (nhãn tròn · decal giấy · không cán), rồi cộng phụ phí:
//  - Nhãn vuông: base × (1 + squareSurchargePct%).
//  - Decal nhựa: + materialSurcharge[cỡ] × SL.
//  - Cán màng: + laminationSurcharge[cỡ] × SL.
//  - Lấy trong ngày: + rushFee[SL] (phẳng).

export function calculateCheapDecal(params, config) {
    const c = config?.CHEAP_DECAL_CONFIG;
    if (!c || typeof c !== 'object') return { error: 'Thiếu cấu hình CHEAP_DECAL_CONFIG.' };

    const size = (c.sizes || []).find((s) => String(s.id) === String(params.size));
    if (!size) return { error: 'Cỡ nhãn không hợp lệ.' };

    const quantity = parseInt(params.quantity, 10);
    const qIndex = (c.quantities || []).indexOf(quantity);
    if (qIndex < 0) return { error: 'Số lượng không hợp lệ (chọn 500 / 1000 / 2000).' };

    const rows = c.priceTable?.[size.id];
    if (!Array.isArray(rows) || rows[qIndex] == null) {
        return { error: 'Không có giá cho cỡ / số lượng này.' };
    }

    const shape = params.shape === 'square' ? 'square' : 'round';
    const material = params.material === 'plastic' ? 'plastic' : 'paper';
    const lamination = params.lamination === 'yes' || params.lamination === true;
    const rush = params.rush === 'yes' || params.rush === true;

    const basePrice = rows[qIndex];
    const squareSurcharge =
        shape === 'square' ? basePrice * ((c.squareSurchargePct || 0) / 100) : 0;
    const baseAfterShape = basePrice + squareSurcharge;

    const materialFee =
        material === 'plastic' ? ((c.materialSurcharge?.[size.id] ?? 0) || 0) * quantity : 0;
    const laminationFee = lamination
        ? ((c.laminationSurcharge?.[size.id] ?? 0) || 0) * quantity
        : 0;
    const rushFee = rush ? c.rushFee?.[quantity] || 0 : 0;

    const total = baseAfterShape + materialFee + laminationFee + rushFee;

    const shapeName = (c.shapes || []).find((s) => s.id === shape)?.name || '';
    const materialName = (c.materials || []).find((m) => m.id === material)?.name || '';
    const sheets = size.perSheet > 0 ? Math.ceil(quantity / size.perSheet) : 0;

    return {
        error: null,
        size: size.id,
        sizeName: size.name,
        perSheet: size.perSheet || 0,
        quantity,
        shape,
        shapeName,
        material,
        materialName,
        lamination,
        rush,
        basePrice,
        squareSurcharge,
        materialFee,
        laminationFee,
        rushFee,
        total,
        unitPrice: quantity > 0 ? total / quantity : 0,
        sheets,
        leadTimeNote: c.leadTimeNote || '',
    };
}
