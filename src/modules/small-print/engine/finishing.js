// Small-print engine — finishing operations.
//   - calculateLamination (cán màng)
//   - calculateDieCuttingCosts (bế khuôn / digital cutting)
//   - calculateFoilStamping (ép kim)
//
// Tách từ src/utils/calculator.js ở TASK-0009.
// KHÔNG đổi behavior.

import { calculateFinishingCost } from './pricing.js';
import { filmMultiplier } from '../../../utils/laminationFilm.js';
import { resolvePlastic, plasticLabel } from '../../../utils/plasticLamination.js';

// Cán màng (lamination)
export function calculateLamination(
    pressH,
    actualPrintW,
    productsPerSheet,
    laminationType,
    config,
    laminationFilm = ''
) {
    let cost = 0;
    let warning = null;
    const sides = laminationType === 'laminate_2' ? 2 : 1;
    if (laminationType === 'laminate_1' || laminationType === 'laminate_2') {
        if (actualPrintW > config.LAMINATION_CONFIG.WIDTH) {
            warning = `KHÔNG THỂ CÁN MÀNG (Vùng in ${actualPrintW.toFixed(1)}cm > rộng màng ${config.LAMINATION_CONFIG.WIDTH}cm)`;
            cost = 0;
        } else {
            // Loại màng nhân vào GIÁ VỐN cán màng (giá báo khách nhân ở quote.js).
            cost =
                (pressH / 100) *
                config.LAMINATION_CONFIG.PRICE_PER_METER *
                sides *
                filmMultiplier(config.LAMINATION_FILMS, laminationFilm);
            if (Math.abs(actualPrintW - config.LAMINATION_CONFIG.WIDTH) < 0.01) {
                warning = `Lưu ý: Vùng in ${actualPrintW.toFixed(1)}cm bằng rộng màng, dễ bị hụt.`;
            }
        }
    }
    return {
        costPerSheet: cost,
        costPerProduct: productsPerSheet > 0 ? cost / productsPerSheet : 0,
        warning: warning,
    };
}

// Ép plastic (màng nhiệt bỏ túi) — bảng giá chung khổ × bậc SL, mỗi độ dày có
// % phụ thu riêng + các khổ được phép. Xem src/utils/plasticLamination.js.
//   - customerPrice = đơn giá(khổ, bậc) × (1 + %/100) × SL   → giá báo khách.
//   - minPrice      = sàn bán/tấm(khổ) × (1 + %/100) × SL    → CHỈ ADMIN: ResultPanel
//     cộng thẳng vào "Giá Tối Thiểu" (KHÔNG qua profit margin).
//   - quantity = SỐ THÀNH PHẨM (mỗi sản phẩm ép 1 tấm), không phải số tờ in.
//   - Chưa chọn độ dày → toàn 0, active:false (giá cũ không đổi). Chọn độ dày mà
//     chưa chọn khổ / khổ không được tick → 0 + unset:true để UI cảnh báo.
// Không làm tròn ở đây (rule money.js: chỉ làm tròn TỔNG ở tầng hiển thị).
const EMPTY_PLASTIC = {
    customerPrice: 0,
    minPrice: 0,
    unitPrice: 0,
    unitMinPrice: 0,
    percent: 0,
    label: '',
    thicknessName: '',
    sizeName: '',
    active: false,
    unset: false,
};

export function calculatePlasticLamination(quantity, thicknessId, sizeId, cfg) {
    const { thickness, size } = resolvePlastic(cfg, thicknessId, sizeId);
    if (!thickness) return { ...EMPTY_PLASTIC };

    const pct = Number(thickness.percent);
    const percent = Number.isFinite(pct) ? pct : 0;
    const mult = 1 + percent / 100;
    const thicknessName = typeof thickness.name === 'string' ? thickness.name : '';

    if (!size) {
        return {
            ...EMPTY_PLASTIC,
            percent,
            thicknessName,
            label: plasticLabel(cfg, thicknessId, '') || '',
            active: true,
            unset: true,
        };
    }

    const qty = parseInt(quantity, 10) || 0;
    // Tra trên bản sao đã sort theo max_qty (∞ cuối) — admin nhập bậc lộn thứ
    // tự trong Cài Đặt vẫn tra đúng; không có bậc phù hợp → 0.
    const tiers = (Array.isArray(cfg.tiers) ? [...cfg.tiers] : [])
        .filter((t) => t && typeof t === 'object')
        .sort((a, b) => Number(a.max_qty) - Number(b.max_qty));
    const tier = tiers.find((t) => qty <= Number(t.max_qty));
    const unitPrice = (Number(tier?.price?.[size.id]) || 0) * mult;
    const unitMinPrice = (Number(cfg.minPrice?.[size.id]) || 0) * mult;

    return {
        customerPrice: qty > 0 ? unitPrice * qty : 0,
        minPrice: qty > 0 ? unitMinPrice * qty : 0,
        unitPrice,
        unitMinPrice,
        percent,
        label: plasticLabel(cfg, thicknessId, sizeId) || '',
        thicknessName,
        sizeName: typeof size.name === 'string' ? size.name : '',
        active: true,
        unset: false,
    };
}

// Bế khuôn (die cutting — mold or digital)
export function calculateDieCuttingCosts(params, printSheetCount, isDecal, config) {
    const { dieCuttingType, moldType, productW, productH, tagHasHole } = params;

    let moldCost = 0,
        laborCost = 0,
        laborCustomerPrice = 0;

    if (dieCuttingType === 'none') return { moldCost, laborCost, laborCustomerPrice };

    if (dieCuttingType === 'digital') {
        const digitalCost = calculateFinishingCost(
            printSheetCount,
            'digital',
            config.DIGITAL_DIE_CUTTING_CONFIG
        );
        laborCost = digitalCost.cost;
        laborCustomerPrice = digitalCost.customerPrice;
    }

    if (dieCuttingType === 'mold') {
        const cfg = config.DIE_CUTTING_MOLD_COST_CONFIG;
        if (!cfg) return { moldCost: 0, laborCost: 0, laborCustomerPrice: 0 };

        const BUILTIN_MOLD_TYPES = ['simple', 'envelope', 'box', 'bag', 'tag'];
        if (!BUILTIN_MOLD_TYPES.includes(moldType)) {
            // Khuôn tùy chỉnh (admin thêm qua Cài Đặt) — tra theo id, tính theo
            // pricingMode tự chọn lúc tạo khuôn. Không đụng tới switch bên dưới.
            const custom = (config.DIE_CUTTING_CUSTOM_MOLDS || []).find((m) => m.id === moldType);
            if (custom) {
                if (custom.pricingMode === 'flat') {
                    moldCost = custom.price || 0;
                } else if (custom.pricingMode === 'threshold') {
                    moldCost =
                        productW * productH > custom.threshold_area
                            ? custom.large_price
                            : custom.small_price;
                } else if (custom.pricingMode === 'per_area') {
                    moldCost = productW * productH * (custom.price_per_cm2 || 0);
                }
            }
        } else {
            switch (moldType) {
                case 'simple':
                    if (!cfg.simple) break;
                    if (productW > cfg.simple.base_size || productH > cfg.simple.base_size) {
                        const largerW = Math.max(productW, cfg.simple.base_size);
                        const largerH = Math.max(productH, cfg.simple.base_size);
                        if (cfg.simple.base_size > 0) {
                            moldCost =
                                (cfg.simple.base_price /
                                    (cfg.simple.base_size * cfg.simple.base_size)) *
                                (largerW * largerH);
                        }
                    } else {
                        moldCost = cfg.simple.base_price;
                    }
                    break;
                case 'envelope':
                    if (!cfg.envelope) break;
                    moldCost =
                        productW * productH > cfg.envelope.threshold_area
                            ? cfg.envelope.large_price
                            : cfg.envelope.small_price;
                    break;
                case 'box':
                    if (!cfg.box) break;
                    moldCost =
                        productW * productH > cfg.box.threshold_area
                            ? cfg.box.large_price
                            : cfg.box.small_price;
                    break;
                case 'bag':
                    if (!cfg.bag) break;
                    moldCost =
                        productW * productH > cfg.bag.threshold_area
                            ? cfg.bag.large_price
                            : cfg.bag.small_price;
                    break;
                case 'tag': {
                    // P3-LINT.1: wrap với {} để tránh no-case-declarations error.
                    // const trong case không có braces leak ra ngoài → ESLint best practice.
                    if (!cfg.tag) break;
                    const spacing = 0.4; // 4mm
                    const pressW = 32.2;
                    const numAcross =
                        productW + spacing > 0
                            ? Math.floor((pressW + spacing) / (productW + spacing))
                            : 0;
                    const numDown = 3;
                    const numOnMold = numAcross * numDown;
                    moldCost = productW * productH * numOnMold * cfg.tag.price_per_cm2;
                    if (tagHasHole) {
                        moldCost += cfg.tag.hole_price * numOnMold;
                    }
                    break;
                }
            }
        }

        const laborCosts = calculateFinishingCost(
            printSheetCount,
            'labor',
            config.DIE_CUTTING_LABOR_CONFIG
        );
        laborCost = laborCosts.cost;
        laborCustomerPrice = laborCosts.customerPrice;

        const laborCfg = config.DIE_CUTTING_LABOR_CONFIG;
        if (laborCfg) {
            if (isDecal) {
                laborCost *= 1 + laborCfg.decal_surcharge;
                laborCustomerPrice *= 1 + laborCfg.decal_surcharge;
            }
            if (
                cfg &&
                cfg.tag &&
                moldType === 'tag' &&
                productW < cfg.tag.threshold_w &&
                productH < cfg.tag.threshold_h
            ) {
                laborCost *= 1 + laborCfg.small_tag_surcharge;
                laborCustomerPrice *= 1 + laborCfg.small_tag_surcharge;
            }
        }
    }

    return { moldCost, laborCost, laborCustomerPrice };
}

// Ép kim (foil stamping) — DANH SÁCH KHUÔN. Mỗi khuôn có kích thước / màu / số lần
// ép riêng; cộng dồn chi phí. Quy tắc (đã chốt):
//   - Tiền khuôn = Σ(diện tích × moldPerArea) + phí ship 1 LẦN cho cả đơn (theo khuôn lớn nhất).
//   - Tiền công ép = Σ theo từng khuôn; SÀN tối thiểu áp RIÊNG mỗi khuôn.
//   - Số lần ép: lần đầu tính full, mỗi lần THÊM trên cùng khuôn tính extraImpressionRate (50%).
//   - Ước tính cuộn nhũ tính riêng mỗi khuôn, theo SL × số lần ép.
const EMPTY_FOIL = { totalCost: 0, impressionPrice: 0, moldCost: 0, shipping: 0, molds: [] };

export function calculateFoilStamping(params, config) {
    if (params.foilStamping !== 'yes') return { ...EMPTY_FOIL };

    const cfg = config.EP_KIM_CONFIG;
    const quantity = parseInt(params.productQuantity, 10) || 0;
    const moldList = Array.isArray(params.foilMolds) ? params.foilMolds : [];
    if (quantity <= 0 || moldList.length === 0) return { ...EMPTY_FOIL };

    const sizeThreshold = cfg.thresholdW * cfg.thresholdH;
    const rollLengthCm = cfg.foilRollLengthM * 100;
    const extraRate = cfg.extraImpressionRate ?? 0.5;

    let totalImpressionPrice = 0;
    let totalMakingCost = 0;
    let anyLarge = false;

    const molds = moldList
        .map((m) => {
            const W = parseFloat(m.w) || 0;
            const H = parseFloat(m.h) || 0;
            const impressions = Math.max(1, parseInt(m.impressions, 10) || 1);
            const special = !!m.special;
            if (H <= 0 || W <= 0) return null; // bỏ qua khuôn chưa nhập kích thước

            const areaForCalc = (H + 1) * (W + 1);
            const isSmall = areaForCalc <= sizeThreshold;
            if (!isSmall) anyLarge = true;

            // A. Công ép — đơn giá/lượt & sàn tối thiểu RIÊNG mỗi khuôn
            const rawPricePerImpression = areaForCalc * cfg.pricePerArea;
            const minPricePerImpression = special ? cfg.minPriceSpecial : cfg.minPriceNormal;
            const pricePerImpression = Math.max(rawPricePerImpression, minPricePerImpression);
            const minTotalStampingPrice = isSmall ? cfg.minTotalSmall : cfg.minTotalLarge;
            const base1 = Math.max(pricePerImpression * quantity, minTotalStampingPrice);
            // Hệ số số lần ép: lần đầu full, mỗi lần thêm cùng khuôn = extraRate
            const impressionFactor = 1 + (impressions - 1) * extraRate;
            const impressionPrice = base1 * impressionFactor;

            // B. Tiền làm khuôn (chưa gồm ship — ship tính chung 1 lần)
            const makingCost = areaForCalc * cfg.moldPerArea;

            totalImpressionPrice += impressionPrice;
            totalMakingCost += makingCost;

            // C. Ước tính cuộn nhũ cho khuôn này — lượng ép hiệu dụng = SL × số lần ép
            const effQty = quantity * impressions;
            const opt1ImprLen = W + cfg.foilPadLength;
            const opt1PerRoll = opt1ImprLen > 0 ? Math.floor(rollLengthCm / opt1ImprLen) : 0;
            const opt1Rolls = opt1PerRoll > 0 ? Math.ceil(effQty / opt1PerRoll) : Infinity;
            const opt2ImprLen = H + cfg.foilPadLength;
            const opt2PerRoll = opt2ImprLen > 0 ? Math.floor(rollLengthCm / opt2ImprLen) : 0;
            const opt2Rolls = opt2PerRoll > 0 ? Math.ceil(effQty / opt2PerRoll) : Infinity;

            return {
                w: W,
                h: H,
                special,
                impressions,
                areaForCalc,
                isSmall,
                pricePerImpression,
                impressionFactor,
                impressionPrice,
                makingCost,
                rollsInfo: {
                    opt1: {
                        foilWidth: H + cfg.foilPadWidth,
                        imprLen: opt1ImprLen,
                        perRoll: opt1PerRoll,
                        rolls: opt1Rolls,
                    },
                    opt2: {
                        foilWidth: W + cfg.foilPadWidth,
                        imprLen: opt2ImprLen,
                        perRoll: opt2PerRoll,
                        rolls: opt2Rolls,
                    },
                    bestRolls: Math.min(opt1Rolls, opt2Rolls),
                },
            };
        })
        .filter(Boolean);

    if (molds.length === 0) return { ...EMPTY_FOIL };

    // Phí ship khuôn — CHỈ 1 lần cho cả đơn, theo khuôn lớn nhất
    const shipping = anyLarge ? cfg.shippingLarge : cfg.shippingSmall;
    const moldCost = totalMakingCost + shipping;
    const totalCost = totalImpressionPrice + moldCost;

    return {
        totalCost,
        impressionPrice: totalImpressionPrice,
        moldCost,
        shipping,
        molds,
    };
}
