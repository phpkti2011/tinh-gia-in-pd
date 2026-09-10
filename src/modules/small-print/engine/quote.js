// Small-print engine — customer-facing quote (giá báo khách).
//
// Tách từ src/utils/customerQuote.js ở TASK-0009.
// KHÔNG đổi behavior — nhận bestOption + finishing customer prices,
// quy đổi sang trang A4 + áp CUSTOMER_PRICE_TIERS.

import { calculateVariableDataCost, calculatePrintContentSurcharge } from './pricing.js';
import { computeA4Factor } from './a4.js';

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
        printContents,
        variableData,
        printColorMode,
    } = params;

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
        // Khổ cũ chưa có a4Factor → suy ra từ chiều cao bằng công thức chung (computeA4Factor).
        const computed = computeA4Factor(pressH, config);
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
                totalLaminationCost = hasLam ? physicalA4Pages * tier.laminate * lamSides : 0;
                unitPriceText = `${rate.toLocaleString('vi-VN')}đ/trang${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
            } else {
                totalPrintCost = printRateFor(tier.print, false);
                totalLaminationCost = hasLam ? tier.laminate * lamSides : 0;
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
            totalLaminationCost = hasLam2 ? physicalA4Pages * tier.laminate * lamSides2 : 0;
            unitPriceText = `${rate.toLocaleString('vi-VN')}đ/trang${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
        } else {
            totalPrintCost = printRateFor(tier.print, false);
            totalLaminationCost = hasLam2 ? tier.laminate * lamSides2 : 0;
            unitPriceText = `Trọn gói${printColorMode === '1color' ? ' (1 màu đen)' : ''}`;
        }
    }

    const selectedPaper = (config.PAPER_STOCK_DATA || [])[params.paperType];
    if (!selectedPaper) return { error: 'Loại giấy không hợp lệ.' };
    const paperSurchargePerA4 = selectedPaper.customerSurcharge || 0;
    const totalPaperSurcharge = paperSurchargePerA4 * totalA4Pages;

    let totalArtPaperCustomerCost = 0;
    if (selectedPaper.pricingModel === 'custom') {
        const validNumCutSheets =
            typeof numCutSheets === 'number' && numCutSheets > 0 ? numCutSheets : 1;
        const totalLargeSheetsNeeded = Math.ceil(totalPrintSheets / validNumCutSheets);
        const paperMaterialCost = totalLargeSheetsNeeded * params.artPaperPrice;
        totalArtPaperCustomerCost = paperMaterialCost + config.ART_PAPER_SURCHARGE;
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
                const validNumCutSheets =
                    typeof numCutSheets === 'number' && numCutSheets > 0 ? numCutSheets : 1;
                const totalLargeSheets = Math.ceil(totalPrintSheets / validNumCutSheets);
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
        totalPaperSurcharge +
        finishingCustomerPrices.holePunching +
        finishingCustomerPrices.creasing +
        finishingCustomerPrices.mounting +
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
