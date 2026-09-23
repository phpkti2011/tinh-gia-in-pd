// Small-print engine — định giá GIẤY.
//
// Tách ra khỏi options.js để dùng được cho HAI loại giấy trong cùng một đơn: giấy in và
// giấy trắng không in của thành phẩm bồi (xem engine/mounting.js). Trước đây cả file
// engine chỉ biết định giá đúng một loại giấy — loại đang chọn ở `params.paperType`.
//
// largeSheetPrice() là bản trích NGUYÊN VĂN công thức đang chạy ở calculateStandardOptions
// (nhánh ream/custom). Không đổi một con số nào — mọi golden test phải xanh y nguyên.

// Giá 1 TỜ LỚN, quy đổi theo diện tích khổ lớn đang xét.
// Trả null khi giá không hợp lệ ⇒ caller bỏ qua phương án đó (giữ đúng các `return` sớm cũ).
export function largeSheetPrice(paper, largeSheet, config, artPaperPrice) {
    if (!paper || !largeSheet) return null;

    if (paper.pricingModel === 'custom') {
        const p = Number(artPaperPrice);
        return isNaN(p) || p < 0 ? null : p;
    }

    const ppr = Number(paper.pricePerReam);
    if (isNaN(ppr) || ppr <= 0) return null;
    const pricePerSheet65x86 = ppr / 500;
    // CỐ Ý luôn lấy STANDARD_LARGE_SHEET_SIZES[0] làm khổ gốc, kể cả khi đang xét khổ
    // giấy mỹ thuật — y hệt bản cũ. Đổi chỗ này là đổi giá hàng loạt.
    const baseArea =
        config.STANDARD_LARGE_SHEET_SIZES[0].w * config.STANDARD_LARGE_SHEET_SIZES[0].h;
    const targetArea = largeSheet.w * largeSheet.h;
    return baseArea > 0 ? (pricePerSheet65x86 / baseArea) * targetArea : 0;
}

// Giá giấy TRẮNG (không in) cho 1 TỜ CẮT. Lớp trắng bồi rồi mới xén nên tiêu thụ đúng
// bằng khổ tờ cắt, dùng chung sơ đồ cắt với giấy in.
//
// 'custom' (giấy mỹ thuật) trả 0: giá của nó phải gõ tay và ô gõ đó đang gắn với GIẤY IN,
// mượn lại là định giá lớp lót theo giá giấy mỹ thuật. Màn nhập liệu cũng chỉ cho chọn
// giấy 'ream' làm lớp trắng nên nhánh này chỉ là chốt chặn.
export function blankSheetCostPerCutSheet(paper, geom, config) {
    if (!paper || !geom) return 0;
    const { largeSheet, numCuttableSheets, cutW, cutH } = geom;

    if (paper.pricingModel === 'custom') return 0;
    if (paper.pricingModel === 'sqm') {
        return ((Number(cutW) * Number(cutH)) / 10000) * (Number(paper.pricePerSqm) || 0);
    }
    if (paper.pricingModel === 'per_sheet') return Number(paper.sheetPrice) || 0;

    const perLargeSheet = largeSheetPrice(paper, largeSheet, config, 0);
    if (perLargeSheet == null) return 0;
    const n = Number(numCuttableSheets) > 0 ? Number(numCuttableSheets) : 1;
    return perLargeSheet / n;
}
