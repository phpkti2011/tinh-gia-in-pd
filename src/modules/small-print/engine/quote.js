// Small-print engine — customer-facing quote (giá báo khách).
//
// Tách từ src/utils/customerQuote.js ở TASK-0009.
// KHÔNG đổi behavior — nhận bestOption + finishing customer prices,
// quy đổi sang trang A4 + áp CUSTOMER_PRICE_TIERS.
//
// finishingCustomerPrices: { holePunching, creasing, mounting, customFinishing?,
// plasticLamination? } — key thiếu coi như 0 (test cũ truyền object 3 key).

import { calculateVariableDataCost, calculatePrintContentSurcharge } from './pricing.js';
import { filmMultiplier } from '../../../utils/laminationFilm.js';
import { computeA4Factor } from './a4.js';
import { printedSheetsPerSet, blankSheetsPerSet } from './mounting.js';
import { blankSheetCostPerCutSheet } from './paper.js';

export function calculateCustomerQuote(
    bestOption,
    params,
    finishingCustomerPrices,
    dieCuttingCustomerPrice,
    foilResult,
    config
) {
    const {
        productQuantity: totalQuantity,
        printSides,
        laminationType,
        laminationFilm,
        printContents,
        variableData,
        printColorMode,
    } = params;

    // Loại màng (mờ/bóng/soft-touch…) nhân vào GIÁ BÁO KHÁCH của cán màng.
    // Giá vốn nhân ở engine/finishing.js. Chưa chọn ⇒ hệ số 1 ⇒ giá y như trước.
    const lamFilmMult = filmMultiplier(config.LAMINATION_FILMS, laminationFilm);

    // Giá in 1 màu ĐEN = giá 4 màu × (1 − %), sàn theo đ/trang (chỉ per_page).
    const oneColorDisc = (config.ONE_COLOR_DISCOUNT_PERCENT ?? 0) / 100;
    const oneColorMinPP = config.ONE_COLOR_MIN_PRICE_PER_PAGE ?? 0;
    const printRateFor = (basePrint, isPerPage) => {
        if (printColorMode !== '1color') return basePrint;
        const r = basePrint * (1 - oneColorDisc);
        return isPerPage ? Math.max(r, oneColorMinPP) : r;
    };

    const pressH = bestOption.cutSheetH;

    let conversionFactor;
    if (typeof bestOption.a4Factor === 'number' && bestOption.a4Factor > 0) {
        // Tỉ lệ quy đổi A4 nhập tay/đã lưu trên từng khổ decal (Cài đặt) → dùng trực tiếp.
        conversionFactor = bestOption.a4Factor;
    } else {
        // Khổ cũ chưa có a4Factor → suy ra từ chiều cao. Tra bảng RIÊNG của máy
        // đang xét trước (printer.a4ConversionRates), không có thì bảng chung.
        const computed = computeA4Factor(pressH, config, bestOption.printer);
        if (computed == null) {
            return { error: `Lỗi cấu hình: Không có hệ số A4 cho khổ ${bestOption.cutSheetSize}` };
        }
        conversionFactor = computed;
    }

    const numCutSheets =
        typeof bestOption.numCuttableSheets === 'number' && bestOption.numCuttableSheets > 0
            ? bestOption.numCuttableSheets
            : 1;
    const totalPrintSheets = Math.ceil(totalQuantity / bestOption.productsPerSheet);
    // Khi bồi, mỗi tờ chỉ in 1 mặt ⇒ phải mua gấp (số mặt in) lần số tờ giấy in.
    // Xem engine/mounting.js. Không bồi ⇒ hệ số 1, mọi con số cũ y nguyên.
    const sheetsPerSet = printedSheetsPerSet(params.mountingType, params.printSides);
    const blanksPerSet = blankSheetsPerSet(params.mountingType, params.printSides);
    // ceil(tổng tờ in ÷ số tờ cắt được) — CỐ Ý ceil SAU khi nhân: mua tờ lớn rồi cắt hết,
    // phần dư dùng chung chứ không bỏ.
    const totalLargeSheets = Math.ceil((totalPrintSheets * sheetsPerSet) / numCutSheets);

    let totalA4Pages = 0;
    let unitPriceText = 'Lỗi';
    let totalPrintCost = 0;
    let totalLaminationCost = 0;

    if (pressH > 48) {
        totalA4Pages = conversionFactor * totalPrintSheets * printSides;
        // Số tờ vật lý quy đổi A4 — KHÔNG nhân printSides. Cán màng phủ lên
        // mặt giấy vật lý (không phụ thuộc số mặt IN), khác với totalA4Pages
        // (dùng để tính tiền in + chọn tier, có nhân printSides).
        const physicalA4Pages = conversionFactor * totalPrintSheets;
        const tier = config.CUSTOMER_PRICE_TIERS.find(
            (t) => totalA4Pages >= t.min && totalA4Pages <= t.max
        );
        if (tier) {
            const hasLam = laminationType === 'laminate_1' || laminationType === 'laminate_2';
            const lamSides = laminationType === 'laminate_2' ? 2 : 1;
            if (tier.type === 'per_page') {
                const rate = printRateFor(tier.print, true);
                totalPrintCost = totalA4Pages * rate;
                totalLaminationCost = hasLam
                    ? physicalA4Pages * tier.laminate * lamSides * lamFilmMult
                    : 0;
                unitPriceText = `${rate.toLocaleString('vi-VN')}đ/trang${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
            } else {
                totalPrintCost = printRateFor(tier.print, false);
                totalLaminationCost = hasLam ? tier.laminate * lamSides * lamFilmMult : 0;
                unitPriceText = `Trọn gói${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
            }
        } else {
            return { error: `Lỗi cấu hình: Không tìm thấy mức giá cho ${totalA4Pages} trang A4` };
        }
    } else {
        let totalA4PagesRaw = totalPrintSheets * conversionFactor * printSides;
        totalA4Pages = Math.ceil(totalA4PagesRaw);

        if (printSides == 2 && totalA4Pages % 2 !== 0) {
            totalA4Pages++;
        }

        // Số tờ vật lý quy đổi A4 — KHÔNG nhân printSides (xem giải thích ở nhánh pressH > 48).
        const physicalA4Pages = Math.ceil(totalPrintSheets * conversionFactor);

        const tier = config.CUSTOMER_PRICE_TIERS.find(
            (t) => totalA4Pages >= t.min && totalA4Pages <= t.max
        );
        if (!tier) {
            return { error: `Không tìm thấy mức giá cho ${totalA4Pages} trang A4` };
        }

        const hasLam2 = laminationType === 'laminate_1' || laminationType === 'laminate_2';
        const lamSides2 = laminationType === 'laminate_2' ? 2 : 1;
        if (tier.type === 'per_page') {
            const rate = printRateFor(tier.print, true);
            totalPrintCost = totalA4Pages * rate;
            totalLaminationCost = hasLam2
                ? physicalA4Pages * tier.laminate * lamSides2 * lamFilmMult
                : 0;
            unitPriceText = `${rate.toLocaleString('vi-VN')}đ/trang${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
        } else {
            totalPrintCost = printRateFor(tier.print, false);
            totalLaminationCost = hasLam2 ? tier.laminate * lamSides2 * lamFilmMult : 0;
            unitPriceText = `Trọn gói${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
        }
    }

    const selectedPaper = (config.PAPER_STOCK_DATA || [])[params.paperType];
    if (!selectedPaper) return { error: 'Loại giấy không hợp lệ.' };
    const paperSurchargePerA4 = selectedPaper.customerSurcharge || 0;
    const totalPaperSurcharge = paperSurchargePerA4 * totalA4Pages;

    let totalArtPaperCustomerCost = 0;
    if (selectedPaper.pricingModel === 'custom') {
        const paperMaterialCost = totalLargeSheets * params.artPaperPrice;
        // ART_PAPER_SURCHARGE là phí xử lý trọn gói → giữ ×1, không nhân theo số lớp.
        totalArtPaperCustomerCost = paperMaterialCost + config.ART_PAPER_SURCHARGE;
    }

    // Giấy TRẮNG (lót / giữa) của thành phẩm bồi. Là VẬT TƯ nên tính giá vốn × hệ số,
    // không đi qua bảng giá theo trang in như giấy in.
    let totalBlankPaperCost = 0;
    if (blanksPerSet > 0) {
        const mountCfg = config.MOUNTING_CONFIG?.[params.mountingType] || {};
        const blankPaper = (config.PAPER_STOCK_DATA || [])[params.blankPaperType];
        const perCutSheet = blankSheetCostPerCutSheet(
            blankPaper,
            {
                largeSheet: { w: bestOption.largeSheetW, h: bestOption.largeSheetH },
                numCuttableSheets: numCutSheets,
                cutW: bestOption.cutSheetW,
                cutH: bestOption.cutSheetH,
            },
            config
        );
        const markup =
            typeof mountCfg.blankPaperMarkup === 'number' ? mountCfg.blankPaperMarkup : 2;
        totalBlankPaperCost = Math.round(perCutSheet * blanksPerSet * totalPrintSheets * markup);
    }

    const variableDataCost =
        variableData === 'yes' ? calculateVariableDataCost(totalQuantity, config) : 0;

    const foilStampingCost = foilResult ? foilResult.totalCost : 0;

    // Điều chỉnh giá theo giấy chuẩn (P3-PAPER-ADJ):
    // Bảng CUSTOMER_PRICE_TIERS được tiệm thiết kế dựa vào giấy chuẩn (mặc định
    // C300). Khi khách chọn giấy khác pricingModel='ream', trừ hoặc cộng chênh
    // lệch giá vốn giấy vào giá báo khách:
    //   - Rẻ hơn C300 → paperAdjustment > 0 → trừ vào giá khách (discount).
    //   - Đắt hơn C300 → paperAdjustment < 0 → cộng vào giá khách (surcharge).
    let paperAdjustment = 0;
    let paperAdjustmentReason = '';
    // Fallback nếu config cũ (localStorage/Supabase saved trước khi thêm key này)
    // chưa có PAPER_REFERENCE_CONFIG — dùng default C300 + 100% ratio.
    const refCfg = config.PAPER_REFERENCE_CONFIG || {
        referencePaperName: 'C300',
        adjustmentRatio: 1,
    };
    if (selectedPaper.pricingModel === 'ream') {
        const referencePaper = (config.PAPER_STOCK_DATA || []).find(
            (p) => p.name === refCfg.referencePaperName
        );
        if (
            referencePaper &&
            referencePaper.pricingModel === 'ream' &&
            referencePaper.name !== selectedPaper.name
        ) {
            const pricePerReamDiff = referencePaper.pricePerReam - selectedPaper.pricePerReam;
            if (pricePerReamDiff !== 0) {
                const baseArea =
                    config.STANDARD_LARGE_SHEET_SIZES[0].w * config.STANDARD_LARGE_SHEET_SIZES[0].h;
                const targetArea = bestOption.largeSheetW * bestOption.largeSheetH;
                const scale = baseArea > 0 ? targetArea / baseArea : 1;
                const diffPerLargeSheet = (pricePerReamDiff / 500) * scale;
                // Dùng chung totalLargeSheets (đã nhân theo số lớp bồi): không nhân thì
                // đơn bồi trên giấy đắt chỉ bị phụ thu một nửa.
                const ratio =
                    typeof refCfg.adjustmentRatio === 'number' ? refCfg.adjustmentRatio : 1;
                paperAdjustment = Math.round(diffPerLargeSheet * totalLargeSheets * ratio);
                paperAdjustmentReason =
                    paperAdjustment > 0
                        ? `Rẻ hơn ${referencePaper.name}`
                        : `Đắt hơn ${referencePaper.name}`;
            }
        }
    }

    const baseCustomerCost =
        totalPrintCost +
        totalLaminationCost +
        totalArtPaperCustomerCost +
        totalBlankPaperCost +
        // totalPaperSurcharge CỐ Ý KHÔNG nhân theo số lớp bồi: nó tính theo TRANG IN
        // (customerSurcharge × totalA4Pages), mà số trang in không đổi khi bồi —
        // nhân nữa là tính hai lần. Xem engine/mounting.js.
        totalPaperSurcharge +
        finishingCustomerPrices.holePunching +
        finishingCustomerPrices.creasing +
        (finishingCustomerPrices.mounting || 0) +
        (finishingCustomerPrices.customFinishing || 0) +
        (finishingCustomerPrices.plasticLamination || 0) +
        dieCuttingCustomerPrice.moldCost +
        dieCuttingCustomerPrice.laborCustomerPrice +
        variableDataCost +
        foilStampingCost -
        paperAdjustment;

    const { surcharge: customerSurcharge, reason: customerSurchargeReason } =
        calculatePrintContentSurcharge(baseCustomerCost, totalQuantity, printContents, config);
    const totalCustomerCost = baseCustomerCost + customerSurcharge;

    return {
        totalA4Pages: totalA4Pages.toLocaleString('vi-VN', { maximumFractionDigits: 0 }),
        totalA4PagesRaw: totalA4Pages,
        // Breakdown để UI giải thích formula A4:
        //   totalPrintSheets × conversionFactor × printSides ≈ totalA4Pages
        totalPrintSheets,
        conversionFactor,
        printSides: Number(printSides) || 1,
        unitPriceText: unitPriceText,
        totalPrintCost,
        totalLaminationCost,
        totalArtPaperCustomerCost,
        totalPaperSurcharge,
        // Breakdown fields — hiển thị chi tiết trong panel Giá.
        holePunchingCustomerPrice: finishingCustomerPrices.holePunching || 0,
        creasingCustomerPrice: finishingCustomerPrices.creasing || 0,
        mountingCustomerPrice: finishingCustomerPrices.mounting || 0,
        totalBlankPaperCost,
        blanksPerSet,
        sheetsPerSet,
        customFinishingCustomerPrice: finishingCustomerPrices.customFinishing || 0,
        plasticLaminationCustomerPrice: finishingCustomerPrices.plasticLamination || 0,
        dieCuttingMoldCustomerPrice: dieCuttingCustomerPrice.moldCost || 0,
        dieCuttingLaborCustomerPrice: dieCuttingCustomerPrice.laborCustomerPrice || 0,
        variableDataCost,
        paperAdjustment,
        paperAdjustmentReason,
        foilStampingCost,
        customerSurcharge,
        customerSurchargeReason,
        totalCustomerCost,
        error: null,
    };
}
