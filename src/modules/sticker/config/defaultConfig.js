// Tính giá TỜ STICKER — bảng giá mặc định (port từ webapp_tinh_gia_in_sticker_pd_v9).
//
// Mô hình: TRA BẢNG bậc giá theo (khổ tờ × số lượng) + phụ phí %/cố định.
// KHÔNG có hình học imposition — "số sticker/tờ" chỉ dùng để tính phụ phí.
//
// Bậc số lượng dùng chung cho mọi khổ; mỗi khổ có mảng đơn giá/tờ cùng độ dài `tiers`
// (index 0 → bậc 10 … index 10 → bậc 3000). Tổng công bố = đơn giá × bậc (nội bộ nhất quán).
//
// Schema: src/modules/sticker/config/schema.js — Version: src/modules/sticker/config/version.js

export const STICKER_DEFAULT_CONFIG = {
    STICKER_CONFIG: {
        // Bậc số lượng (tờ).
        tiers: [10, 30, 50, 100, 200, 300, 400, 500, 1000, 2000, 3000],

        // Đơn giá / tờ theo khổ, index khớp `tiers`. laminateFixed = phí cán laminate dày / tờ.
        sizes: {
            '10x10': {
                name: 'Tờ 10 x 10 cm',
                units: [12000, 8000, 6000, 3500, 3000, 2500, 2250, 2000, 1500, 1400, 1200],
                laminateFixed: 1000,
            },
            A6: {
                name: 'Tờ A6',
                units: [15000, 10000, 7000, 5000, 4000, 3500, 3000, 2800, 2300, 2000, 1700],
                laminateFixed: 1500,
            },
            A5: {
                name: 'Tờ A5',
                units: [18000, 12000, 9000, 6500, 6000, 5500, 5000, 4400, 3500, 3000, 2500],
                laminateFixed: 2500,
            },
            A4: {
                name: 'Tờ A4',
                units: [20000, 13000, 10000, 9000, 7500, 7000, 6500, 6000, 5500, 5000, 4500],
                laminateFixed: 4000,
            },
        },
        sizeOrder: ['10x10', 'A6', 'A5', 'A4'],

        // Chọn bậc: qty>maxQty → báo giá riêng; qty<=minTierQty → bậc thấp nhất; giữa 2 mốc
        // low<qty<=high, ngưỡng = low + (high-low)×upperThresholdPct/100; qty<ngưỡng → mốc dưới.
        upperThresholdPct: 70,
        minBillableQty: 10, // tính tiền tối thiểu 10 tờ
        maxQty: 3000, // trên mức này → báo giá riêng

        // Phụ phí số sticker/tờ: 0..stickerFree miễn phí; mỗi block `stickerStep` con vượt = +pct.
        stickerFree: 12,
        stickerStep: 5,
        stickerPctPerStep: 10,

        // Phụ phí số nội dung/mẫu: vector free tới contentFreeVector, image tới contentFreeImage;
        // mỗi mẫu vượt = +contentPctPerExtra%.
        contentFreeVector: 2,
        contentFreeImage: 1,
        contentPctPerExtra: 10,

        // Cán màng — chọn 1. percent cộng vào tổng %; fixedBySize là phí cố định/tờ (laminate dày).
        finishes: {
            normal: {
                name: 'Decal nhựa cán màng mờ / bóng loại thường',
                percent: 0,
                fixedBySize: {},
            },
            glitter: { name: 'Màng kim tuyến', percent: 20, fixedBySize: {} },
            laminate: {
                name: 'Màng mờ (laminate dày)',
                percent: 0,
                fixedBySize: { '10x10': 1000, A6: 1500, A5: 2500, A4: 4000 },
            },
            rainbow: { name: 'Màng 7 màu', percent: 17, fixedBySize: {} },
        },
        finishOrder: ['normal', 'glitter', 'laminate', 'rainbow'],

        // Phí vẽ đường cắt: chỉ file ảnh & qty < ngưỡng.
        cutPathFee: 100000,
        cutPathQtyThreshold: 50,

        hotline: '0906702063',
    },
};
