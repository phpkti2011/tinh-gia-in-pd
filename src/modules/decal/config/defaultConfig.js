// Decal — bảng giá mặc định.
//
// Di chuyển từ src/config/decalConfig.js ở TASK-0005 (config schema/version).
// KHÔNG đổi giá trị so với bản gốc — chỉ đổi vị trí file để phù hợp với
// cấu trúc module mới (src/modules/decal/).
//
// Schema validation: xem src/modules/decal/config/schema.js
// Version metadata:  xem src/modules/decal/config/version.js

export const DECAL_DEFAULT_CONFIG = {
    basePrintWidth: 330,
    basePrintHeight: 330,
    areaConversionFactor: 0.35,
    // Lề mặc định (fallback khi tính không kèm máy). Lề thực tế lấy theo MÁY (machines) bên dưới.
    marginShortSide: 28,
    marginLongSide: 50,
    stickerGap: 2,
    laminationCost: 500,
    // Máy bế — mỗi máy có vùng bế (lề) riêng 4 cạnh (trên/dưới/trái/phải, mm) → số tem/tờ khác →
    // số tờ & giá khác. Avitech vùng bế rộng hơn Graptech → lề NHỎ hơn → nhiều tem/tờ hơn.
    // Số mẫu (tách đôi tổng lề cũ) — admin chỉnh số thật từng cạnh trong Cài đặt.
    machines: [
        { name: 'Graptech', marginTop: 25, marginBottom: 25, marginLeft: 14, marginRight: 14 },
        { name: 'Avitech', marginTop: 19, marginBottom: 19, marginLeft: 10, marginRight: 10 },
    ],
    // percent = % tăng giá so với khổ gốc 330×330 (0 = gốc).
    // minPriceByMaterial = giá sàn mỗi tờ in theo TỪNG loại decal ({} = mọi vật liệu 0 = không sàn).
    // unavailableMaterials = danh sách loại decal KHÔNG có ở khổ này (loại khỏi bảng giá). [] = có tất cả.
    //   Chiết khấu không giảm dưới giá sàn. Admin sửa trong Cài đặt (ma trận vật liệu × khổ).
    printSheetSizes: [
        {
            label: '330 x 330 mm (gốc)',
            w: 330,
            h: 330,
            percent: 0,
            minPriceByMaterial: {},
            unavailableMaterials: [],
        },
        {
            label: '330 x 480 mm',
            w: 330,
            h: 480,
            percent: 0,
            minPriceByMaterial: {},
            unavailableMaterials: [],
        },
    ],
    demiCutSurchargeTiers: [
        { upTo: 20, percent: 20 },
        { upTo: 30, percent: 35 },
        { upTo: Infinity, percent: 45 },
    ],
    decalCosts: {
        'Decal giấy': 0,
        'Decal nhựa': 1200,
        'Decal xi': 1400,
        'Decal kraf': 0,
        'Decal vỡ': 9000,
        'Decal 7 màu': 0,
        'Decal nhựa bóng (amazon chấm bi xanh)': 0,
        'Decal trong dày (#60)': 0,
    },
    progressiveTiers: [
        { upTo: 1, price: 100000 },
        { upTo: 2, price: 40000 },
        { upTo: 10, price: 20000 },
        { upTo: 20, price: 8000 },
        { upTo: 30, price: 5000 },
        { upTo: 40, price: 4500 },
        { upTo: 50, price: 4200 },
        { upTo: 100, price: 4000 },
        { upTo: 200, price: 3800 },
        { upTo: 300, price: 3600 },
        { upTo: 400, price: 3400 },
        { upTo: 500, price: 3200 },
        { upTo: 600, price: 3000 },
        { upTo: 700, price: 2800 },
        { upTo: 800, price: 2600 },
        { upTo: 900, price: 2400 },
        { upTo: 1000, price: 2300 },
        { upTo: Infinity, price: 2200 },
    ],
    stickerSheetSizes: [
        { label: 'Khổ A4 (210 x 297 mm)', w: 210, h: 297 },
        { label: 'Khổ A5 (148 x 210 mm)', w: 148, h: 210 },
        { label: 'Khổ A6 (100 x 145 mm)', w: 100, h: 145 },
    ],
};
