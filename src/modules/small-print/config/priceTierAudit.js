// Small-print — SOÁT bảng giá khách (CUSTOMER_PRICE_TIERS) tìm chỗ "nghịch bậc".
//
// Nghịch bậc = khách đặt THÊM một trang lại TRẢ ÍT HƠN, vì đơn giá tụt xuống bậc sau
// nhanh hơn số trang tăng lên. Ví dụ bảng mặc định:
//     1.000 trang × 2.200 = 2.200.000đ, nhưng 1.001 trang × 1.800 = 1.801.800đ.
//
// Đây THUẦN LÀ CẢNH BÁO cho admin trong Cài Đặt. Không chặn lưu, không sửa giá: bậc
// nghịch có thể là lựa chọn kinh doanh cố ý (phá giá ở mốc 1.000 trang chẳng hạn).
//
// Công thức tiền in ở đây phải bám sát engine/quote.js — nó tra bậc bằng
// `pages >= t.min && pages <= t.max` rồi tính `pages × t.print` (per_page) hoặc
// `t.print` phẳng (package). Đổi quote.js thì phải đổi cả file này.
//
// CỐ Ý chỉ soát cột GIÁ IN. Tiền cán màng tính trên số tờ VẬT LÝ (không nhân số mặt in)
// rồi nhân tiếp số mặt cán và hệ số loại màng, nên cùng một bảng giá mà đơn in 1 mặt và
// đơn in 2 mặt cho kết luận khác nhau — một cảnh báo chỉ đúng nửa số đơn thì tệ hơn là
// không có.

// Tổng tiền IN của một bậc tại `pages` trang. Trả null khi bậc không dùng được.
export function tierPrintTotal(tier, pages) {
    if (!tier || typeof tier !== 'object') return null;
    const rate = Number(tier.print);
    if (!Number.isFinite(rate)) return null;
    if (tier.type === 'package') return rate;
    const n = Number(pages);
    return Number.isFinite(n) ? n * rate : null;
}

// Tìm mọi vách bậc bị nghịch.
//
// Trả [{ index, atPages, total, nextIndex, nextPages, nextTotal, drop }] — `index` là
// VỊ TRÍ GỐC trong mảng truyền vào (không phải vị trí sau khi sắp), để màn Cài Đặt gắn
// cảnh báo đúng dòng đang hiện.
export function auditCustomerPriceTiers(tiers) {
    if (!Array.isArray(tiers)) return [];

    // Sắp một BẢN SAO theo min: vách bậc là chuyện của thứ tự số trang, không phải thứ
    // tự admin gõ vào mảng. Giữ kèm vị trí gốc.
    const sorted = tiers
        .map((tier, index) => ({ tier, index }))
        .filter(({ tier }) => tier && typeof tier === 'object' && Number.isFinite(Number(tier.min)))
        .sort((a, b) => Number(a.tier.min) - Number(b.tier.min));

    const out = [];
    for (let i = 0; i < sorted.length - 1; i++) {
        const cur = sorted[i];
        const next = sorted[i + 1];

        // Bậc cuối không có vách sau. `max` cũng = null khi config vừa đi qua JSON
        // (Infinity không sống sót round-trip) — Number.isFinite loại cả hai.
        const atPages = Number(cur.tier.max);
        const nextPages = Number(next.tier.min);
        if (!Number.isFinite(atPages) || !Number.isFinite(nextPages)) continue;

        // Ô nhập số commit theo TỪNG PHÍM: xoá "1800" để gõ "2000" có một nhịp giá = 0.
        // Bỏ qua để bảng không nháy đỏ ngay dưới con trỏ admin.
        if (!(Number(cur.tier.print) > 0) || !(Number(next.tier.print) > 0)) continue;

        const total = tierPrintTotal(cur.tier, atPages);
        const nextTotal = tierPrintTotal(next.tier, nextPages);
        if (total == null || nextTotal == null) continue;

        // BẰNG NHAU không phải nghịch — bậc thiết kế cho giá liền mạch đúng ở vách.
        if (nextTotal >= total) continue;

        out.push({
            index: cur.index,
            atPages,
            total,
            nextIndex: next.index,
            nextPages,
            nextTotal,
            drop: total - nextTotal,
        });
    }
    return out;
}
