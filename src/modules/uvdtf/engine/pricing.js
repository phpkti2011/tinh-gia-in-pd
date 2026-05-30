// UV DTF engine — single pricing function.
//
// Tách từ src/utils/uvdtfCalculator.js ở TASK-0012.
// KHÔNG đổi behavior — pure function, không React/DOM/IO.
//
// Formula tóm tắt:
//   itemWcm = widthMM/10 + paddingCM
//   itemHcm = heightMM/10 + paddingCM
//   Upright:  acrossUp  = floor(printableW / itemWcm)
//             rowsUp    = ceil(qty / acrossUp)
//             lengthUp  = rowsUp × itemHcm
//   Rotated:  acrossRot = floor(printableW / itemHcm)
//             rowsRot   = ceil(qty / acrossRot)
//             lengthRot = rowsRot × itemWcm
//   Chọn orientation ngắn hơn (lengthUp <= lengthRot → upright)
//   totalMeters = totalLengthCM / 100
//   pricePerMeter = tier đầu tiên thoả totalMeters <= maxMeters
//   billableMeters = max(minBillableMeters, totalMeters)
//   totalPrice = billableMeters × pricePerMeter

export function calculateUvDtf(params, config) {
    const { widthMM, heightMM, quantity } = params;
    if (!widthMM || !heightMM || !quantity || widthMM <= 0 || heightMM <= 0 || quantity <= 0) return null;

    const printableW = config.printableWidthCM;
    const pad = config.paddingCM;
    const itemWcm = widthMM / 10 + pad;
    const itemHcm = heightMM / 10 + pad;

    // Try upright
    const acrossUp = Math.floor(printableW / itemWcm);
    const rowsUp = acrossUp > 0 ? Math.ceil(quantity / acrossUp) : Infinity;
    const lengthUp = rowsUp * itemHcm;

    // Try rotated
    const acrossRot = Math.floor(printableW / itemHcm);
    const rowsRot = acrossRot > 0 ? Math.ceil(quantity / acrossRot) : Infinity;
    const lengthRot = rowsRot * itemWcm;

    if (acrossUp === 0 && acrossRot === 0) return null;

    let totalLengthCM, rotated, finalItemW, finalItemH, itemsAcross;
    if (lengthUp <= lengthRot) {
        totalLengthCM = lengthUp; rotated = false; finalItemW = itemWcm; finalItemH = itemHcm; itemsAcross = acrossUp;
    } else {
        totalLengthCM = lengthRot; rotated = true; finalItemW = itemHcm; finalItemH = itemWcm; itemsAcross = acrossRot;
    }

    const totalMeters = totalLengthCM / 100;
    let pricePerMeter = config.priceTiers[config.priceTiers.length - 1].price;
    for (const tier of config.priceTiers) {
        if (totalMeters <= tier.maxMeters) { pricePerMeter = tier.price; break; }
    }

    const billableMeters = Math.max(config.minBillableMeters, totalMeters);
    const totalPrice = billableMeters * pricePerMeter;

    // Simulation: items on 1 meter
    const rowsPerMeter = Math.floor(100 / finalItemH);
    const itemsPerMeter = itemsAcross * rowsPerMeter;

    return {
        totalLengthCM,
        totalMeters,
        pricePerMeter,
        billableMeters,
        totalPrice,
        rotated,
        finalItemW,
        finalItemH,
        itemsAcross,
        itemsPerMeter,
        rowsPerMeter,
        originalW: widthMM,
        originalH: heightMM,
    };
}
