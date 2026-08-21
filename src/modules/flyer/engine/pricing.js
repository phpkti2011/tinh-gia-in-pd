// Tính giá TỜ RƠI — engine (port từ module-tinh-gia-to-roi-pd-tone-web.html).
//
// Pure function: chỉ phụ thuộc params + config. TRA BẢNG bậc SL theo khổ → giá GỐC (baseline
// C150 · 2 mặt · không cán), chọn đơn giá mốc theo quy tắc tăng > 70%, rồi cộng/giảm phụ phí.
//
// Thứ tự cộng phải giữ đúng: 35% (in 1 mặt) chỉ trừ trên giá in cơ bản; 10% (nội dung) tính trên
// (base sau giảm + giấy), KHÔNG gồm cán/cấn; cán & cấn cộng phẳng trên cùng.

// Chọn đơn giá mốc từ bảng giá của 1 khổ.
function calculateBasePrice(rows, quantity, thresholdPct) {
    const exact = rows.find((r) => r.qty === quantity);
    if (exact) {
        return {
            unitPrice: exact.price / exact.qty,
            calc: exact.price,
            sourceQty: exact.qty,
            rule: `Đúng mốc ${exact.qty} tờ`,
        };
    }
    const highest = rows[rows.length - 1];
    if (quantity > highest.qty) {
        const unit = highest.price / highest.qty;
        return {
            unitPrice: unit,
            calc: unit * quantity,
            sourceQty: highest.qty,
            rule: `Trên mốc cao nhất — áp đơn giá mốc ${highest.qty} tờ`,
        };
    }
    for (let i = 0; i < rows.length - 1; i++) {
        if (quantity > rows[i].qty && quantity < rows[i + 1].qty) {
            const lower = rows[i];
            const upper = rows[i + 1];
            const increaseRate = ((quantity - lower.qty) / lower.qty) * 100;
            const useUpper = increaseRate > thresholdPct;
            const selected = useUpper ? upper : lower;
            const unit = selected.price / selected.qty;
            return {
                unitPrice: unit,
                calc: unit * quantity,
                sourceQty: selected.qty,
                rule: useUpper
                    ? `Tăng ${increaseRate.toFixed(0)}% (> ${thresholdPct}%) → đơn giá mốc trên ${upper.qty} tờ`
                    : `Tăng ${increaseRate.toFixed(0)}% (≤ ${thresholdPct}%) → đơn giá mốc dưới ${lower.qty} tờ`,
            };
        }
    }
    // Dưới mốc thấp nhất (min đã chặn nên hiếm) → áp mốc thấp nhất.
    const first = rows[0];
    const unit = first.price / first.qty;
    return {
        unitPrice: unit,
        calc: unit * quantity,
        sourceQty: first.qty,
        rule: `Áp đơn giá mốc ${first.qty} tờ`,
    };
}

function calculateCreasingFee(quantity, type, creasing) {
    if (!type || type === 'none') return { fee: 0, manual: false };
    for (const b of creasing.bands || []) {
        if (quantity <= b.maxQty) return { fee: b.prices?.[type] || 0, manual: false };
    }
    const om = creasing.overMax?.[type];
    if (om?.manual) return { fee: 0, manual: true };
    if (om?.perSheet != null) return { fee: quantity * om.perSheet, manual: false };
    return { fee: 0, manual: false };
}

export function calculateFlyer(params, config) {
    const c = config?.FLYER_CONFIG;
    if (!c || typeof c !== 'object') return { error: 'Thiếu cấu hình FLYER_CONFIG.' };

    const size = (c.sizes || []).find((s) => s.id === params.size);
    if (!size) return { error: 'Khổ không hợp lệ.' };
    const rows = c.priceTable?.[size.id];
    if (!Array.isArray(rows) || rows.length === 0) return { error: 'Bảng giá khổ không hợp lệ.' };

    const quantity = parseInt(params.quantity, 10);
    if (!Number.isFinite(quantity) || quantity <= 0) {
        return { error: 'Vui lòng nhập số lượng là số nguyên lớn hơn 0.' };
    }
    if (quantity < size.min) {
        return { error: `${size.name} nhận tối thiểu ${size.min} tờ.` };
    }

    const paper =
        (c.paperTypes || []).find((p) => p.id === params.paper) || (c.paperTypes || [])[0];
    const sides = params.sides === '1' ? '1' : '2';
    const lamination = params.lamination === 'yes' ? 'yes' : 'none';
    const contents = params.contents === '3-5' ? '3-5' : '1-2';
    const creasingType = params.creasing || 'none';

    const base = calculateBasePrice(rows, quantity, c.upperThresholdPct);

    const oneSideDiscount = sides === '1' ? base.calc * ((c.oneSideDiscountPct || 0) / 100) : 0;
    const baseAfterSides = base.calc - oneSideDiscount;

    const paperFee = ((c.paperSurcharge?.[paper.id]?.[size.id] ?? 0) || 0) * quantity;
    const printSubtotal = baseAfterSides + paperFee;

    const contentFee =
        contents === '3-5' ? printSubtotal * ((c.contentSurchargePct || 0) / 100) : 0;
    const laminationFee =
        lamination === 'yes' ? ((c.laminationSurcharge?.[size.id] ?? 0) || 0) * quantity : 0;

    const creasing = calculateCreasingFee(quantity, creasingType, c.creasing || {});
    const total = printSubtotal + contentFee + laminationFee + creasing.fee;

    const sidesName = (c.sidesOptions || []).find((o) => o.id === sides)?.name || '';

    return {
        error: null,
        requiresManualQuote: creasing.manual,
        size: size.id,
        sizeName: size.name,
        quantity,
        paperName: paper.name,
        sidesName,
        sides,
        lamination,
        contents,
        creasingType,
        unitPrice: base.unitPrice,
        sourceQty: base.sourceQty,
        baseRule: base.rule,
        basePrice: base.calc,
        oneSideDiscount,
        paperFee,
        contentFee,
        laminationFee,
        creasingFee: creasing.fee,
        total,
    };
}
