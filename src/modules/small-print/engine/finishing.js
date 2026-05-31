// Small-print engine — finishing operations.
//   - calculateLamination (cán màng)
//   - calculateDieCuttingCosts (bế khuôn / digital cutting)
//   - calculateFoilStamping (ép kim)
//
// Tách từ src/utils/calculator.js ở TASK-0009.
// KHÔNG đổi behavior.

import { calculateFinishingCost } from './pricing.js';

// Cán màng (lamination)
export function calculateLamination(pressH, actualPrintW, productsPerSheet, laminationType, config) {
    let cost = 0;
    let warning = null;
    const sides = laminationType === 'laminate_2' ? 2 : 1;
    if (laminationType === 'laminate_1' || laminationType === 'laminate_2') {
        if (actualPrintW > config.LAMINATION_CONFIG.WIDTH) {
            warning = `KHÔNG THỂ CÁN MÀNG (Vùng in ${actualPrintW.toFixed(1)}cm > rộng màng ${config.LAMINATION_CONFIG.WIDTH}cm)`;
            cost = 0;
        } else {
            cost = (pressH / 100) * config.LAMINATION_CONFIG.PRICE_PER_METER * sides;
            if (Math.abs(actualPrintW - config.LAMINATION_CONFIG.WIDTH) < 0.01) {
                warning = `Lưu ý: Vùng in ${actualPrintW.toFixed(1)}cm bằng rộng màng, dễ bị hụt.`;
            }
        }
    }
    return { costPerSheet: cost, costPerProduct: productsPerSheet > 0 ? cost / productsPerSheet : 0, warning: warning, };
}

// Bế khuôn (die cutting — mold or digital)
export function calculateDieCuttingCosts(params, printSheetCount, isDecal, config) {
    const { dieCuttingType, moldType, productW, productH, tagHasHole } = params;

    let moldCost = 0, laborCost = 0, laborCustomerPrice = 0;

    if (dieCuttingType === 'none') return { moldCost, laborCost, laborCustomerPrice };

    if (dieCuttingType === 'digital') {
        const digitalCost = calculateFinishingCost(printSheetCount, 'digital', config.DIGITAL_DIE_CUTTING_CONFIG);
        laborCost = digitalCost.cost;
        laborCustomerPrice = digitalCost.customerPrice;
    }

    if (dieCuttingType === 'mold') {
        const cfg = config.DIE_CUTTING_MOLD_COST_CONFIG;
         if (!cfg) return { moldCost: 0, laborCost: 0, laborCustomerPrice: 0 };

        switch(moldType) {
            case 'simple':
                if (!cfg.simple) break;
                if (productW > cfg.simple.base_size || productH > cfg.simple.base_size) {
                    const largerW = Math.max(productW, cfg.simple.base_size);
                    const largerH = Math.max(productH, cfg.simple.base_size);
                    if (cfg.simple.base_size > 0) {
                         moldCost = (cfg.simple.base_price / (cfg.simple.base_size * cfg.simple.base_size)) * (largerW * largerH);
                    }
                } else {
                    moldCost = cfg.simple.base_price;
                }
                break;
            case 'envelope':
                 if (!cfg.envelope) break;
                moldCost = (productW * productH) > cfg.envelope.threshold_area ? cfg.envelope.large_price : cfg.envelope.small_price;
                break;
            case 'box':
                 if (!cfg.box) break;
                 moldCost = (productW * productH) > cfg.box.threshold_area ? cfg.box.large_price : cfg.box.small_price;
                break;
            case 'bag':
                  if (!cfg.bag) break;
                 moldCost = (productW * productH) > cfg.bag.threshold_area ? cfg.bag.large_price : cfg.bag.small_price;
                break;
            case 'tag': {
                // P3-LINT.1: wrap với {} để tránh no-case-declarations error.
                // const trong case không có braces leak ra ngoài → ESLint best practice.
                if (!cfg.tag) break;
                const spacing = 0.4; // 4mm
                const pressW = 32.2;
                const numAcross = (productW + spacing > 0) ? Math.floor((pressW + spacing) / (productW + spacing)) : 0;
                const numDown = 3;
                const numOnMold = numAcross * numDown;
                moldCost = productW * productH * numOnMold * cfg.tag.price_per_cm2;
                if (tagHasHole) {
                    moldCost += cfg.tag.hole_price * numOnMold;
                }
                break;
            }
        }

        const laborCosts = calculateFinishingCost(printSheetCount, 'labor', config.DIE_CUTTING_LABOR_CONFIG);
        laborCost = laborCosts.cost;
        laborCustomerPrice = laborCosts.customerPrice;

        const laborCfg = config.DIE_CUTTING_LABOR_CONFIG;
         if (laborCfg) {
            if (isDecal) {
                laborCost *= (1 + laborCfg.decal_surcharge);
                laborCustomerPrice *= (1 + laborCfg.decal_surcharge);
            }
            if (cfg && cfg.tag && moldType === 'tag' && productW < cfg.tag.threshold_w && productH < cfg.tag.threshold_h) {
                 laborCost *= (1 + laborCfg.small_tag_surcharge);
                 laborCustomerPrice *= (1 + laborCfg.small_tag_surcharge);
            }
        }
    }

    return { moldCost, laborCost, laborCustomerPrice };
}

// Ép kim (foil stamping) — multi-step pricing với min thresholds + cuộn nhũ
export function calculateFoilStamping(params, config) {
    if (params.foilStamping !== 'yes') return { totalCost: 0, impressionPrice: 0, moldCost: 0, rollsInfo: null };

    const cfg = config.EP_KIM_CONFIG;
    const H = params.foilCustomSize ? (parseFloat(params.foilH) || 0) : (parseFloat(params.productH) || 0);
    const W = params.foilCustomSize ? (parseFloat(params.foilW) || 0) : (parseFloat(params.productW) || 0);
    const quantity = parseInt(params.productQuantity, 10) || 0;
    const isSpecial = params.foilSpecialColor || false;

    if (H <= 0 || W <= 0 || quantity <= 0) return { totalCost: 0, impressionPrice: 0, moldCost: 0, rollsInfo: null };

    const areaForCalc = (H + 1) * (W + 1);
    const sizeThreshold = cfg.thresholdW * cfg.thresholdH;
    const isSmall = areaForCalc <= sizeThreshold;

    // A. Chi phí ép kim
    const rawPricePerImpression = areaForCalc * cfg.pricePerArea;
    const minPricePerImpression = isSpecial ? cfg.minPriceSpecial : cfg.minPriceNormal;
    const pricePerImpression = Math.max(rawPricePerImpression, minPricePerImpression);
    const totalImpressionPriceRaw = pricePerImpression * quantity;
    const minTotalStampingPrice = isSmall ? cfg.minTotalSmall : cfg.minTotalLarge;
    const finalImpressionPrice = Math.max(totalImpressionPriceRaw, minTotalStampingPrice);

    // B. Chi phí làm khuôn
    const moldShippingFee = isSmall ? cfg.shippingSmall : cfg.shippingLarge;
    const moldMakingCost = (areaForCalc * cfg.moldPerArea) + moldShippingFee;

    const totalCost = finalImpressionPrice + moldMakingCost;

    // C. Ước tính cuộn nhũ
    const rollLengthCm = cfg.foilRollLengthM * 100;
    const opt1FoilWidth = H + cfg.foilPadWidth;
    const opt1ImprLen = W + cfg.foilPadLength;
    const opt1PerRoll = opt1ImprLen > 0 ? Math.floor(rollLengthCm / opt1ImprLen) : 0;
    const opt1Rolls = opt1PerRoll > 0 ? Math.ceil(quantity / opt1PerRoll) : Infinity;

    const opt2FoilWidth = W + cfg.foilPadWidth;
    const opt2ImprLen = H + cfg.foilPadLength;
    const opt2PerRoll = opt2ImprLen > 0 ? Math.floor(rollLengthCm / opt2ImprLen) : 0;
    const opt2Rolls = opt2PerRoll > 0 ? Math.ceil(quantity / opt2PerRoll) : Infinity;

    return {
        totalCost,
        impressionPrice: finalImpressionPrice,
        moldCost: moldMakingCost,
        pricePerImpression,
        areaForCalc,
        isSmall,
        rollsInfo: {
            opt1: { foilWidth: opt1FoilWidth, imprLen: opt1ImprLen, perRoll: opt1PerRoll, rolls: opt1Rolls },
            opt2: { foilWidth: opt2FoilWidth, imprLen: opt2ImprLen, perRoll: opt2PerRoll, rolls: opt2Rolls },
            bestRolls: Math.min(opt1Rolls, opt2Rolls)
        }
    };
}
