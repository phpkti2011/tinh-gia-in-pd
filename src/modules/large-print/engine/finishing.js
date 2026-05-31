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

// Finishing: dán biên + đóng khoen + bế demi (3-tier die cutting)
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
        const dc = fp.dieCutting;
        let dieCost = 0;
        if (totalArea <= dc.tier1LimitSqm) dieCost = totalArea * dc.tier1PricePerSqm;
        else if (totalArea <= dc.tier2LimitSqm)
            dieCost =
                dc.tier1LimitSqm * dc.tier1PricePerSqm +
                (totalArea - dc.tier1LimitSqm) * dc.tier2PricePerSqm;
        else
            dieCost =
                dc.tier1LimitSqm * dc.tier1PricePerSqm +
                (dc.tier2LimitSqm - dc.tier1LimitSqm) * dc.tier2PricePerSqm +
                (totalArea - dc.tier2LimitSqm) * dc.tier3PricePerSqm;
        cost += dieCost;
        parts.push(`Bế: ${dieCost.toLocaleString()}đ`);
    }
    return { cost, desc: parts.join(', ') };
}
