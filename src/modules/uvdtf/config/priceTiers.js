// UV DTF — luật về bảng giá theo mét tới (priceTiers / dieCutPriceTiers).
//
// Các luật thuần, tách khỏi UI để test được và để engine/panel không lệch nhau:
//
// 1. normalizePriceTiers — vá field SAI TÊN do panel cài đặt ghi ra.
//    Engine (engine/pricing.js) và schema đều dùng `price`, nhưng UvdtfSettingsPanel
//    từng đọc/ghi `pricePerMeter` — trùng tên OUTPUT của engine, không phải tên field
//    config. Hậu quả: admin gõ giá mới vào ô "Đơn giá (đ/m)" thì giá chui vào
//    `pricePerMeter` mà KHÔNG ai đọc, engine vẫn tính theo `price` cũ — đổi giá xong
//    báo giá không nhúc nhích; còn bậc mới thêm thì thiếu hẳn `price` nên schema chặn,
//    không lưu được. `pricePerMeter` chỉ có thể do panel ghi ra và panel ghi lại mỗi
//    lần gõ phím ⇒ nó LUÔN mới hơn `price`, nên ưu tiên nó rồi bỏ hẳn field.
//
// 2. sortPriceTiers — engine lấy tier ĐẦU TIÊN thoả totalMeters <= maxMeters, nên bậc
//    phải xếp TĂNG DẦN với (vô hạn) cuối cùng. Thêm bậc 0.5m xuống dưới dòng (vô hạn)
//    thì dòng (vô hạn) khớp trước, bậc 0.5 chết lặng — bảng nhìn có bậc mà giá không đổi.

export function normalizePriceTiers(tiers) {
    if (!Array.isArray(tiers)) return tiers;
    return tiers.map((t) => {
        if (!t || typeof t !== 'object' || Array.isArray(t)) return t;
        const { pricePerMeter, ...rest } = t;
        return typeof pricePerMeter === 'number' ? { ...rest, price: pricePerMeter } : rest;
    });
}

const tierKey = (t) => {
    const m = t?.maxMeters;
    return typeof m === 'number' && !isNaN(m) ? m : Infinity;
};

export function sortPriceTiers(tiers) {
    if (!Array.isArray(tiers)) return tiers;
    return [...tiers].sort((a, b) => {
        const ka = tierKey(a);
        const kb = tierKey(b);
        // Không dùng (ka - kb): Infinity - Infinity = NaN làm sort loạn thứ tự.
        if (ka === kb) return 0;
        return ka < kb ? -1 : 1;
    });
}

// 3. getActiveTiers — MỘT nguồn duy nhất cho câu hỏi "báo giá này tính bằng bảng nào?",
//    dùng chung engine + result panel. Tách ra để UI không bao giờ dán nhãn "giá có bế"
//    lên một con số engine tính bằng bảng không bế.
//
//    dieCutPriceTiers CỐ Ý KHÔNG có trong UVDTF_DEFAULT_CONFIG. loadConfigFromCloud merge
//    nông {...default, ...saved} nên nếu để field trong default, xưởng đã lưu bảng giá
//    riêng (845k/795k/…) mà chưa cài bảng bế sẽ ĂN NGUYÊN bảng mặc định 440k/390k/… —
//    báo giá có bế rẻ đi một nửa, không ai thấy.
//    Thiếu field / mảng rỗng ⇒ hàng có bế tính y hệt hàng không bế.

export function hasDieCutTiers(config) {
    return Array.isArray(config?.dieCutPriceTiers) && config.dieCutPriceTiers.length > 0;
}

export function getActiveTiers(config, dieCut) {
    const usingDieCutTable = !!dieCut && hasDieCutTiers(config);
    return {
        tiers: usingDieCutTable ? config.dieCutPriceTiers : config?.priceTiers,
        usingDieCutTable,
    };
}

// Bảng CÓ BẾ để admin sửa: có sẵn thì lấy, chưa có thì chép từ bảng KHÔNG BẾ của CHÍNH
// XƯỞNG ĐÓ (không phải bảng mặc định) — admin thấy số thật của mình để sửa.
// normalizePriceTiers trả mảng mới + object mới ⇒ hai bảng KHÔNG dùng chung reference
// (dùng chung thì sửa bảng này đổi luôn bảng kia).
export function seedDieCutTiers(config) {
    const src = hasDieCutTiers(config) ? config.dieCutPriceTiers : config?.priceTiers;
    return normalizePriceTiers(Array.isArray(src) ? src : []);
}
