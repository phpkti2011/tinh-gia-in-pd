// Tính giá TỜ STICKER — engine (port từ webapp_tinh_gia_in_sticker_pd_v9).
//
// Pure function: chỉ phụ thuộc input params + config. KHÔNG có hình học imposition —
// pricing là TRA BẢNG bậc giá (khổ × số lượng) + phụ phí %/cố định.
//
// Quy tắc (đã khoá trong DECISIONS.md của project gốc):
//  - Ngưỡng chọn mốc trên = 70% khoảng giữa 2 mốc (qty ≥ ngưỡng → lấy mốc trên).
//  - Tính tiền tối thiểu 10 tờ (billableQty = max(qty, 10)).
//  - qty > 3000 → BÁO GIÁ RIÊNG (không tính số).
//  - 0..12 sticker/tờ miễn phụ phí; mỗi 5 con vượt = +10%.
//  - Chỉ 1 loại cán màng. Phí không gồm VAT / vận chuyển / thanh toán.

const norm = (v) => Math.max(1, Math.ceil(Number(v) || 1));

export function calculateSticker(params, config) {
    const s = config?.STICKER_CONFIG;
    if (!s || typeof s !== 'object') return { error: 'Thiếu cấu hình STICKER_CONFIG.' };

    const sizeKey = params.size;
    const size = s.sizes?.[sizeKey];
    if (!size) return { error: 'Khổ tờ không hợp lệ.' };

    const tiers = s.tiers || [];
    if (tiers.length < 2) return { error: 'Bảng bậc giá không hợp lệ.' };

    const qty = norm(params.qty);
    const stickers = norm(params.stickers);
    const contents = norm(params.contents);
    const fileType = params.fileType === 'image' ? 'image' : 'vector';
    const finishKey = s.finishes?.[params.finish] ? params.finish : 'normal';
    const finish = s.finishes[finishKey] || { name: '', percent: 0, fixedBySize: {} };

    // Trên mức tối đa → báo giá riêng.
    if (qty > s.maxQty) {
        return {
            error: null,
            isCustomQuote: true,
            size: sizeKey,
            sizeName: size.name,
            qty,
            maxQty: s.maxQty,
            hotline: s.hotline || '',
            total: null,
        };
    }

    // Chọn bậc giá.
    let index = null;
    let tierMode = '';
    let low = null;
    let high = null;
    let threshold = null;
    if (qty <= tiers[0]) {
        index = 0;
        tierMode =
            qty < s.minBillableQty
                ? `Tính tối thiểu ${s.minBillableQty} tờ`
                : `Đúng mốc ${tiers[0]} tờ`;
    } else {
        for (let i = 0; i < tiers.length - 1; i++) {
            if (qty > tiers[i] && qty <= tiers[i + 1]) {
                low = tiers[i];
                high = tiers[i + 1];
                threshold = low + ((high - low) * s.upperThresholdPct) / 100;
                if (qty < threshold) {
                    index = i;
                    tierMode = 'Lấy đơn giá mốc dưới';
                } else {
                    index = i + 1;
                    tierMode = 'Lấy đơn giá mốc trên';
                }
                break;
            }
        }
    }
    if (index == null) index = tiers.length - 1; // fallback an toàn

    const tier = tiers[index];
    const unit = size.units?.[index] || 0;
    const billableQty = Math.max(qty, s.minBillableQty);
    const base = unit * billableQty;

    // Phụ phí số sticker/tờ.
    const stickerPct =
        Math.max(0, Math.ceil((stickers - s.stickerFree) / s.stickerStep)) * s.stickerPctPerStep;

    // Phụ phí số nội dung/mẫu.
    const contentFree = fileType === 'vector' ? s.contentFreeVector : s.contentFreeImage;
    const contentPct = Math.max(0, contents - contentFree) * s.contentPctPerExtra;

    // Cán màng.
    const finishPct = finish.percent || 0;
    const finishFixedPerSheet = (finish.fixedBySize && finish.fixedBySize[sizeKey]) || 0;
    const finishFixedFee = finishFixedPerSheet * billableQty;

    // Tổng phụ phí %.
    const totalPct = finishPct + stickerPct + contentPct;
    const percentSurcharge = (base * totalPct) / 100;

    // Phí vẽ đường cắt (file ảnh & qty GỐC < ngưỡng).
    const cutPathFee = fileType === 'image' && qty < s.cutPathQtyThreshold ? s.cutPathFee : 0;

    const total = base + percentSurcharge + finishFixedFee + cutPathFee;

    return {
        error: null,
        isCustomQuote: false,
        size: sizeKey,
        sizeName: size.name,
        qty,
        billableQty,
        tier,
        tierIndex: index,
        tierMode,
        low,
        high,
        threshold,
        unit,
        base,
        stickerPct,
        finishKey,
        finishName: finish.name,
        finishPct,
        finishFixedPerSheet,
        finishFixedFee,
        contentPct,
        fileType,
        cutPathFee,
        totalPct,
        percentSurcharge,
        total,
        unitPerSheet: billableQty > 0 ? total / billableQty : 0,
        hotline: s.hotline || '',
    };
}
