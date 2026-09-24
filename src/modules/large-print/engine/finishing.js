// Large-print engine — formex (bồi) + finishing (dán biên, khoen, bế demi).
//
// Tách từ src/utils/largePrintCalculator.js ở TASK-0016.
// Internal helpers — export cho pricing.js import, không re-export ra index.js.

// Formex (bồi) cost với tier discount theo diện tích
export function calculateFormexCost(totalArea, formexTypeKey, config) {
    const formexOption = config.FORMEX_OPTIONS[formexTypeKey];
    if (!formexOption || formexOption.price === 0) return 0;
    const basePrice = formexOption.price;
    let discount = 0;
    for (const tier of config.FORMEX_DISCOUNT_TIERS) {
        if (totalArea >= tier.minArea && totalArea < tier.maxArea) {
            discount = tier.discount;
            break;
        }
    }
    return totalArea * basePrice * (1 - discount);
}

// Admin gõ chữ / config cũ thiếu field ⇒ coi như 0, thay vì để NaN lan ra tổng tiền.
const num = (v) => (typeof v === 'number' && isFinite(v) ? v : 0);

// Bậc LŨY TIẾN theo m²: cắt từng đoạn (phần tới mốc 1 tính giá bậc 1, phần mốc
// 1→2 giá bậc 2, phần dư giá bậc 3), KHÔNG phải đồng giá theo bậc như
// FORMEX_DISCOUNT_TIERS. Dùng chung cho bế demi (FINISHING_PRICES.dieCutting) và
// bế Formex (FORMEX_DIE_CUT_SHAPES[i]) — 2 nơi cùng shape
// { tier1LimitSqm, tier2LimitSqm, tier1/2/3PricePerSqm }.
function progressiveSqmCost(area, t) {
    // Admin gõ ngược 2 mốc (bậc 2 nhỏ hơn bậc 1) sẽ làm (l2-l1) ÂM ⇒ trừ tiền
    // khách. Sắp lại thay vì tin dữ liệu: bảng giá là người gõ, schema chỉ ép
    // được KIỂU chứ không ép được thứ tự. Config hợp lệ (l1 < l2) ra y hệt kết
    // quả cũ nên golden test của bế demi không đổi.
    const a = num(t.tier1LimitSqm),
        b = num(t.tier2LimitSqm);
    const l1 = Math.min(a, b),
        l2 = Math.max(a, b);
    const p1 = num(t.tier1PricePerSqm),
        p2 = num(t.tier2PricePerSqm),
        p3 = num(t.tier3PricePerSqm);
    if (area <= l1) return area * p1;
    if (area <= l2) return l1 * p1 + (area - l1) * p2;
    return l1 * p1 + (l2 - l1) * p2 + (area - l2) * p3;
}

// Finishing: dán biên + đóng khoen + bế demi (3-tier die cutting) + bế Formex
// LƯU Ý: function này KHÁC signature với calculateFinishingCost ở
// small-print module (xem src/modules/small-print/engine/pricing.js).
// Small-print: (quantity, type, configData) → tier lookup
// Large-print: (totalArea, params, config) → cộng dồn nhiều operation
export function calculateFinishingCost(totalArea, params, config) {
    const fp = config.FINISHING_PRICES;
    let cost = 0;
    const parts = [];
    if (params.edgeTaping) {
        const tapingCost = Math.max(
            totalArea * fp.edgeTapingPricePerSqm,
            config.MIN_EDGE_TAPING_PRICE || 0
        );
        cost += tapingCost;
        parts.push(`Dán biên: ${tapingCost.toLocaleString()}đ`);
    }
    if (params.grommetsCheck && params.grommetsCount > 0) {
        const grommetCost = Math.max(
            params.grommetsCount * fp.grommetPricePerPiece,
            config.MIN_GROMMET_PRICE || 0
        );
        cost += grommetCost;
        parts.push(`Đóng ${params.grommetsCount} khoen: ${grommetCost.toLocaleString()}đ`);
    }
    if (params.dieCutting) {
        const dieCost = progressiveSqmCost(totalArea, fp.dieCutting);
        cost += dieCost;
        parts.push(`Bế: ${dieCost.toLocaleString()}đ`);
    }
    // Bế Formex — gate "phải bồi Formex trước" nằm ở pricing.js (nơi biết
    // effFormexKey), ở đây chỉ còn đọc cờ đã lọc.
    //
    // Fallback dễ dãi, BẮT BUỘC: config lưu trước v1.4.0 không có key này.
    //   thiếu FORMEX_DIE_CUT_SHAPES / sai kiểu / rỗng → 0đ, không throw
    //   shapeKey lạ (admin vừa xoá hình dạng)         → lấy shapes[0]
    // Lấy shapes[0] thay vì trả 0đ: thà báo giá hình khác còn hơn âm thầm miễn
    // phí một công đoạn nhân viên đã tick. UI hiển thị đúng shapes[0] luôn nên
    // màn hình không mâu thuẫn với giá.
    if (params.formexDieCut) {
        const shapes = config.FORMEX_DIE_CUT_SHAPES;
        if (Array.isArray(shapes) && shapes.length > 0) {
            const shape = shapes.find((s) => s?.key === params.formexDieCutShapeKey) || shapes[0];
            const cutCost = Math.max(
                progressiveSqmCost(totalArea, shape),
                num(config.MIN_FORMEX_DIE_CUT_PRICE)
            );
            cost += cutCost;
            parts.push(`Bế Formex (${shape.name || shape.key}): ${cutCost.toLocaleString()}đ`);
        }
    }
    return { cost, desc: parts.join(', ') };
}
