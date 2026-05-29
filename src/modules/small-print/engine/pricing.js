// Small-print engine — pure cost helpers (tier lookups, profit margin).
//
// Tách từ src/utils/calculator.js ở TASK-0009.
// KHÔNG đổi behavior. Pure functions, không IO.

// Profit margin theo giá vốn (tier lookup)
export function getProfitMargin(cost, config) {
    const tier = config.PROFIT_MARGIN_TIERS.find(t => cost <= t.max_cost);
    return tier ? tier.margin : 0;
}

// Variable data cost (data biến đổi — 3 tier)
export function calculateVariableDataCost(quantity, config) {
    if (quantity <= 0) return 0;
    const cfg = config.VARIABLE_DATA_CONFIG;
    if (quantity <= 500) return cfg.price_500;
    if (quantity <= 1000) return cfg.price_1000;

    const additionalSteps = Math.floor((quantity - 1001) / cfg.progressive_step);
    return cfg.price_over_1000_base + (additionalSteps * cfg.price_over_1000_progressive);
}

// Phụ thu nhiều nội dung
export function calculatePrintContentSurcharge(totalCost, quantity, contentCount, config) {
    if (contentCount <= 1 || quantity <= 0) return { surcharge: 0, reason: '' };

    const qtyPerContent = quantity / contentCount;
    const cfg = config.PRINT_CONTENT_CONFIG;

    if (Math.abs(qtyPerContent - 1) < 0.001) {
        const surcharge = totalCost * cfg.single_content_surcharge;
        return { surcharge, reason: `+${(cfg.single_content_surcharge * 100).toFixed(0)}% (mỗi nội dung 1 cái)` };
    }

    const tier = cfg.tiers.find(t => contentCount >= t.min && contentCount <= t.max);
    if (tier) {
        const surcharge = totalCost * tier.surcharge;
        return { surcharge, reason: `+${(tier.surcharge * 100).toFixed(0)}% (${contentCount} nội dung)` };
    }

    return { surcharge: 0, reason: '' };
}

// Generic tier-based finishing cost lookup
// IMPORTANT: configData phải là INNER object có cost_tiers/customer_tiers ở
// top level (NOT outer object có subkeys). App.jsx (sau TASK-0008.6) đã truyền
// đúng inner config qua `config.HOLE_PUNCHING_CONFIG?.[params.holePunchingType]`.
export function calculateFinishingCost(quantity, type, configData) {
    if (quantity <= 0 || type === 'none' || !configData) {
        return { cost: 0, customerPrice: 0 };
    }

    const costTiers = Array.isArray(configData.cost_tiers) ? configData.cost_tiers : [];
    const customerTiers = Array.isArray(configData.customer_tiers) ? configData.customer_tiers : [];

    const costTier = costTiers.find(t => quantity <= t.max_qty);
    const customerTier = customerTiers.find(t => quantity <= t.max_qty);

    let cost = 0;
    let customerPrice = 0;

    if (costTier) {
        cost = costTier.type === 'package' ? costTier.price : quantity * costTier.price;
    }
    if (customerTier) {
        customerPrice = customerTier.type === 'package' ? customerTier.price : quantity * customerTier.price;
    }

    return { cost, customerPrice };
}
