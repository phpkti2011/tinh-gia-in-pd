// Decal engine — pricing helpers + public pricing API.
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004.
// TASK-DECAL-WHOLESHEET: tính NGUYÊN TỜ (ceil) cho toàn bộ (in + vật liệu + cán màng),
//   giống mô hình plugin 4.0.0 — revert Formula A (tờ lẻ) của TASK-0006.
//   Khổ giấy in khác gốc → nhân (1 + percent/100) lên TOÀN BỘ giá mỗi tờ, trong đó
//   percent lấy từ khổ khớp trong config.printSheetSizes (khổ gốc = 0%).
// Xem docs/pricing-rules/decal-reference-cases.md cho chi tiết.
//
// Pure functions: chỉ phụ thuộc input + config object.

import { findPrintSheet } from './layout.js';
import {
    filmExtra,
    filmPerUnit,
    filmUsesExtra,
    findLaminationFilm,
} from '../../../utils/laminationFilm.js';

// Quy đổi khổ tờ in ra TRANG A4 — giống In KTS khổ nhỏ (bảng nhập tay, KHÔNG tính theo diện tích).
// Tiền chênh màng đặc biệt nhập theo 1 trang A4 nên tem lẻ và bế demi đều nhân với số A4 này.
//   1. Khổ in khớp trong printSheetSizes có `a4Factor` > 0 (admin nhập ở Cài Đặt) ⇒ dùng.
//   2. Không có ⇒ bảng theo cạnh dài (cm) sao từ A4_CONVERSION_RATES của In KTS;
//      ngoài bảng mà > 21,2 cm ⇒ cạnh dài / 21 (như computeA4Factor của In KTS); còn lại ⇒ 1.
// Ví dụ khổ 33 x 35 cm = 1,5 A4.
const A4_BY_LONG_SIDE_CM = { 33: 1.5, 35: 1.5, 43: 2, 48: 2.4 };
export function resolveA4Factor(config, sheetW, sheetH) {
    const f = Number(findPrintSheet(config, sheetW, sheetH)?.a4Factor);
    if (Number.isFinite(f) && f > 0) return f;
    const longCm = Math.max(Number(sheetW) || 0, Number(sheetH) || 0) / 10;
    if (!(longCm > 0)) return 1;
    const fixed = A4_BY_LONG_SIDE_CM[Number(longCm.toFixed(1))];
    if (fixed) return fixed;
    return longCm > 21.2 ? longCm / 21 : 1;
}

// Tiền cán màng của `sheets` tờ in (dùng cho CẢ tem lẻ và bế demi), tách 2 phần:
//   base  = phần nhân % khổ giấy như cũ (giá cán gốc; hoặc cả khoản nếu màng còn tính % cũ)
//   extra = tiền chênh × số A4 của khổ tờ in — quy đổi A4 đã gồm khổ lớn nên KHÔNG nhân thêm
//           % khổ giấy (Mờ/Bóng chênh 0 và màng còn tính % cũ không bị ảnh hưởng)
function laminationParts(config, filmId, sheets, sheetW, sheetH) {
    const films = config.laminationFilms;
    if (!filmUsesExtra(findLaminationFilm(films, filmId))) {
        return { base: filmPerUnit(films, filmId, sheets, config.laminationCost), extra: 0 };
    }
    return {
        base: sheets * config.laminationCost,
        extra: sheets * filmExtra(films, filmId) * resolveA4Factor(config, sheetW, sheetH),
    };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

// Progressive pricing — each tier is priced independently
// (NOT cumulative total; each range has its own per-sheet price).
function calculateProgressivePrice(numSheets, config) {
    let totalCost = 0,
        remaining = numSheets,
        prevLimit = 0;
    for (const tier of config.progressiveTiers) {
        if (remaining <= 0) break;
        const tierRange = tier.upTo - prevLimit;
        const sheetsInTier = Math.min(remaining, tierRange);
        totalCost += sheetsInTier * tier.price;
        remaining -= sheetsInTier;
        prevLimit = tier.upTo;
    }
    return totalCost;
}

// % tăng giá của khổ giấy in khớp (so với khổ gốc). Không khớp (khổ tùy chọn) → 0%.
function getSizePercent(config, sheetW, sheetH) {
    const size = findPrintSheet(config, sheetW, sheetH);
    return size && typeof size.percent === 'number' ? size.percent : 0;
}

// Get demi cut surcharge percent
function getDemiCutSurchargePercent(stickerCount, config) {
    for (const tier of config.demiCutSurchargeTiers) {
        if (stickerCount <= tier.upTo) return tier.percent;
    }
    return config.demiCutSurchargeTiers[config.demiCutSurchargeTiers.length - 1]?.percent || 0;
}

// ---------------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------------

// % phụ thu nhiều nội dung — một đơn nhiều mẫu khác nhau tốn công dàn trang, canh máy.
//   quantity     = số sản phẩm của dòng báo giá (tem lẻ: số con; tờ sticker: số tờ)
//   contentCount = số nội dung (mẫu) khác nhau trong đơn
// Trả 0 khi: 1 nội dung, config cũ chưa có `contentSurcharge`, hoặc số nội dung rơi
// vào khoảng trống giữa các bậc (vd 2-3) — chủ ý ưu đãi, không phụ thu.
// Mỗi nội dung chỉ in 1 cái (quantity === contentCount) ⇒ mức riêng, BỎ QUA bảng bậc.
export function getContentSurchargePercent(quantity, contentCount, config) {
    const cfg = config.contentSurcharge;
    const n = Number(contentCount) || 0;
    const q = Number(quantity) || 0;
    if (!cfg || n <= 1 || q <= 0) return 0;
    if (Math.abs(q / n - 1) < 0.001) return Number(cfg.singleContentPercent) || 0;
    const tier = (cfg.tiers || []).find((t) => n >= t.min && n <= t.max);
    return tier ? Number(tier.percent) || 0 : 0;
}

// Áp chiết khấu % cho 1 dòng giá, chặn theo giá sàn/tờ (không giảm dưới sàn, không tăng giá gốc).
//   floorTotal = sheets × minPricePerSheet
//   final = max(base×(1−d/100), min(base, floorTotal))
//   floored = true khi mức giảm bị chặn ở sàn (d>0 và giảm thô < final).
export function applyDiscount(base, sheets, discountPercent, minPricePerSheet) {
    const d = Number(discountPercent) || 0;
    const min = Number(minPricePerSheet) || 0;
    const n = Number(sheets) || 0;
    if (d <= 0) return { price: base, floored: false };
    const floorTotal = n * min;
    const rawDiscount = base * (1 - d / 100);
    const final = Math.max(rawDiscount, Math.min(base, floorTotal));
    return { price: final, floored: rawDiscount < final - 1e-6 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

// Calculate price for single sticker mode — NGUYÊN TỜ (ceil) cho toàn bộ.
//   sheets   = ceil(quantity / stickersPerSheet)
//   giá tờ   = progressive(sheets) + vật liệu×sheets + cán×sheets
//   × (1 + percent/100)       — percent theo khổ giấy in (khổ gốc = 0%)
//   × (1 + contentPercent/100) — phụ thu nhiều nội dung (1 nội dung = 0%).
// contentCount mặc định 1 ⇒ lời gọi cũ (8 tham số) giữ nguyên giá.
export function calculateSingleStickerPrice(
    quantity,
    decalType,
    isLaminated,
    stickersPerSheet,
    sheetW,
    sheetH,
    config,
    filmId = '',
    contentCount = 1
) {
    if (stickersPerSheet <= 0) return 0;
    const sheets = Math.ceil(quantity / stickersPerSheet);

    const printCost = calculateProgressivePrice(sheets, config);
    const materialCost = (config.decalCosts[decalType] || 0) * sheets;
    // Loại màng điều chỉnh tiền cán: tiền chênh (đ/trang A4) × số A4 của khổ tờ in, cộng sau
    // % khổ giấy; màng % cũ nhân hệ số. Chưa chọn ⇒ giá y như trước.
    const lam = isLaminated
        ? laminationParts(config, filmId, sheets, sheetW, sheetH)
        : { base: 0, extra: 0 };

    const percent = getSizePercent(config, sheetW, sheetH);
    const contentPercent = getContentSurchargePercent(quantity, contentCount, config);
    return (
        ((printCost + materialCost + lam.base) * (1 + percent / 100) + lam.extra) *
        (1 + contentPercent / 100)
    );
}

// Calculate price for sticker sheet mode — NGUYÊN TỜ + % khổ + phụ phí bế demi
// + phụ thu nhiều nội dung (nhân sau bế demi, trước chiết khấu).
// contentCount mặc định 1 ⇒ lời gọi cũ (9 tham số) giữ nguyên giá.
export function calculateSheetPrice(
    quantity,
    decalType,
    isLaminated,
    sheetsPerPrintSheet,
    stickersOnSheet,
    sheetW,
    sheetH,
    config,
    filmId = '',
    contentCount = 1
) {
    if (sheetsPerPrintSheet <= 0) return 0;
    const numPrintSheets = Math.ceil(quantity / sheetsPerPrintSheet);

    const printCost = calculateProgressivePrice(numPrintSheets, config);
    const materialCost = (config.decalCosts[decalType] || 0) * numPrintSheets;
    const lam = isLaminated
        ? laminationParts(config, filmId, numPrintSheets, sheetW, sheetH)
        : { base: 0, extra: 0 };

    const percent = getSizePercent(config, sheetW, sheetH);
    const sheetPrice = (printCost + materialCost + lam.base) * (1 + percent / 100) + lam.extra;

    const surchargePercent = getDemiCutSurchargePercent(stickersOnSheet, config);
    const contentPercent = getContentSurchargePercent(quantity, contentCount, config);
    return sheetPrice * (1 + surchargePercent / 100) * (1 + contentPercent / 100);
}
