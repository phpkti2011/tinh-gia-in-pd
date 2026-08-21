// Tính giá THẺ NHỰA — engine (port từ webapp/current/index.html).
//
// Pure function: chỉ phụ thuộc params + config. TRA BẢNG bậc SL (loại thẻ × số lượng) → giá GỐC,
// rồi giá BÁN = max(gốc × hệ số nhóm khách, gốc + sàn đơn hàng), làm tròn CEIL bội `roundTo`.
//
// Quy tắc khoá (DECISIONS.md):
//  - Nhóm khách: trực tiếp ×2, đại lý ×1.5 (chỉ là ứng viên, so với sàn đơn rồi lấy max).
//  - SL 1–9: tính theo cơ sở 10 cái (MOQ nhà cung cấp), có bậc lợi nhuận riêng + trần theo tổng 10 cái.
//  - qty ≤ 0 / > maxQty / tier null (gồm wood 4.000–4.999) → LIÊN HỆ báo giá.
//  - GIỮ nguyên hành vi làm tròn CEIL (kể cả quirk q8–9 vượt trần chút ít) — KHÔNG tự sửa.
//  - KHÔNG lộ giá gốc / hệ số ra UI khách (chỉ trả đơn giá bán / tổng / mốc).

const roundUp = (v, step) => Math.ceil(v / step) * step;

function getTier(qty, product, config) {
    const isWood = product.table === 'wood';
    const table = isWood ? config.woodTiers : config.standardTiers;
    return (table || []).find((t) => qty >= t.min && qty <= t.max) || null;
}

export function calculateCard(params, config) {
    const c = config?.CARD_CONFIG;
    if (!c || typeof c !== 'object') return { error: 'Thiếu cấu hình CARD_CONFIG.' };

    const product = (c.products || []).find((p) => p.id === params.product);
    if (!product) return { error: 'Loại thẻ không hợp lệ.' };

    const segment =
        (c.segments || []).find((s) => s.id === params.segment) || (c.segments || [])[0];
    const multiplier = segment?.multiplier || 1;

    // Phụ thu add-on (giá gốc).
    const addonsSel = params.addons || {};
    const extra = (c.addons || []).reduce((sum, a) => sum + (addonsSel[a.id] ? a.base || 0 : 0), 0);

    const contact = (message, tierLabel) => ({
        error: null,
        isContact: true,
        contactMessage: message || c.contactMessage || 'Liên hệ báo giá',
        status: message || c.contactMessage || 'Liên hệ báo giá',
        statusOk: false,
        product: product.id,
        productName: product.name,
        qty: Number.isFinite(+params.qty) ? Math.trunc(+params.qty) : null,
        segmentName: segment?.name || '',
        tierLabel: tierLabel || '—',
        unit: null,
        total: null,
        moqApplied: false,
        hotline: c.hotline || '',
    });

    const qty = parseInt(params.qty, 10);
    if (!Number.isFinite(qty) || qty <= 0) return contact('Vui lòng nhập số lượng hợp lệ', '—');
    if (qty > c.maxQty) return contact(c.contactMessage, '—');

    const roundTo = c.roundTo || 100;

    // Nhánh SL 1–9: cơ sở 10 cái (MOQ).
    if (qty < c.moq) {
        const tier10 = getTier(c.moq, product, c);
        const base10 = tier10?.prices?.[product.id];
        if (base10 == null) return contact(c.contactMessage, `MOQ ${c.moq}`);

        const profit = c.lowQtyProfit?.[qty] ?? c.lowQtyProfit?.[String(qty)] ?? c.minProfit;
        let targetTotal = (base10 + extra) * c.moq + c.shipping + profit;

        // Trần theo tổng bán của 10 cái.
        const orig10 = (base10 + extra) * c.moq;
        const target10 = Math.max(orig10 * multiplier, orig10 + c.minOrderAdd);
        const unit10 = roundUp(target10 / c.moq, roundTo);
        const total10 = unit10 * c.moq;
        if ((qty === 8 || qty === 9) && targetTotal > total10) targetTotal = total10;

        const unit = roundUp(targetTotal / qty, roundTo);
        const total = unit * qty;
        return {
            error: null,
            isContact: false,
            contactMessage: '',
            status: 'Đã áp dụng giá đơn dưới 10 cái',
            statusOk: true,
            product: product.id,
            productName: product.name,
            qty,
            segmentName: segment?.name || '',
            tierLabel: `1–9 cái (MOQ nhà cung cấp: ${c.moq})`,
            unit,
            total,
            moqApplied: true,
            hotline: c.hotline || '',
        };
    }

    // Nhánh SL ≥ 10.
    const tier = getTier(qty, product, c);
    const base = tier?.prices?.[product.id];
    if (base == null) return contact(c.contactMessage, tier?.label || '—');

    const orig = (base + extra) * qty;
    const target = Math.max(orig * multiplier, orig + c.minOrderAdd);
    const unit = roundUp(target / qty, roundTo);
    const total = unit * qty;
    return {
        error: null,
        isContact: false,
        contactMessage: '',
        status: 'Đã áp dụng bảng giá bán',
        statusOk: true,
        product: product.id,
        productName: product.name,
        qty,
        segmentName: segment?.name || '',
        tierLabel: tier.label,
        unit,
        total,
        moqApplied: false,
        hotline: c.hotline || '',
    };
}
