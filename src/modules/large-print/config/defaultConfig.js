// Large-print (in khổ lớn) — bảng giá mặc định.
//
// Di chuyển từ src/config/largePrintConfig.js ở TASK-0017 (config schema/version).
// KHÔNG đổi giá trị so với bản gốc — chỉ đổi vị trí file để phù hợp với
// cấu trúc module mới (src/modules/large-print/).
//
// Schema validation: xem src/modules/large-print/config/schema.js
// Version metadata:  xem src/modules/large-print/config/version.js

export const LARGE_PRINT_DEFAULT_CONFIG = {
    MATERIAL_TYPES: {
        decal_sua: {
            name: 'Decal Sữa (Trắng)',
            options: [
                { width: 1.07, printPrice: 150000, materialPrice: 35000 },
                { width: 1.52, printPrice: 150000, materialPrice: 35000 },
            ],
        },
        decal_trong: {
            name: 'Decal Trong',
            options: [
                { width: 1.07, printPrice: 150000, materialPrice: 35000 },
                { width: 1.52, printPrice: 150000, materialPrice: 35000 },
            ],
        },
        pp_co_keo: {
            name: 'PP Có Keo',
            options: [
                { width: 0.91, printPrice: 120000, materialPrice: 25000 },
                { width: 1.07, printPrice: 120000, materialPrice: 25000 },
                { width: 1.27, printPrice: 120000, materialPrice: 25000 },
                { width: 1.52, printPrice: 120000, materialPrice: 25000 },
            ],
        },
        pp_khong_keo: {
            name: 'PP Không Keo',
            options: [
                { width: 0.91, printPrice: 120000, materialPrice: 25000 },
                { width: 1.07, printPrice: 120000, materialPrice: 25000 },
                { width: 1.27, printPrice: 120000, materialPrice: 25000 },
                { width: 1.52, printPrice: 120000, materialPrice: 25000 },
            ],
        },
        backlit: {
            name: 'Backlit Film',
            options: [
                { width: 1.52, printPrice: 230000, materialPrice: 90000 },
                { width: 1.27, printPrice: 230000, materialPrice: 90000 },
                { width: 1.07, printPrice: 230000, materialPrice: 90000 },
                { width: 0.91, printPrice: 230000, materialPrice: 90000 },
            ],
        },
        hiflex: {
            name: 'Bạt Hiflex',
            options: [
                { width: 1.0, printPrice: 120000, materialPrice: 17000 },
                { width: 1.2, printPrice: 120000, materialPrice: 17000 },
                { width: 1.5, printPrice: 120000, materialPrice: 17000 },
                { width: 1.8, printPrice: 120000, materialPrice: 17000 },
            ],
        },
    },
    LAMINATION_TYPES: {
        mang_mo: {
            name: 'Màng Mờ',
            options: [
                { width: 1.07, price: 20000 },
                { width: 1.52, price: 20000 },
            ],
        },
        mang_bong: {
            name: 'Màng Bóng',
            options: [
                { width: 1.07, price: 20000 },
                { width: 1.52, price: 20000 },
            ],
        },
    },
    FORMEX_OPTIONS: {
        none: { name: 'Không bồi Formex', price: 0 },
        formex_5mm: { name: 'Bồi Formex 5MM', price: 130000 },
    },
    FORMEX_DISCOUNT_TIERS: [
        { minArea: 5, maxArea: 10, discount: 0.1 },
        { minArea: 10, maxArea: 20, discount: 0.15 },
        { minArea: 20, maxArea: Infinity, discount: 0.2 },
    ],
    MIN_PRINT_PRICE: 30000,
    MIN_LAMINATION_PRICE: 15000,
    MIN_EDGE_TAPING_PRICE: 20000,
    MIN_GROMMET_PRICE: 15000,
    STANDEE_OPTIONS: [
        { key: 'standee_x_60x160', name: 'Standee chân X 60x160cm', price: 100000 },
        { key: 'standee_x_80x180', name: 'Standee chân X 80x180cm', price: 120000 },
        { key: 'standee_cuon_60x160', name: 'Standee cuộn 60x160cm', price: 180000 },
        { key: 'standee_cuon_80x200', name: 'Standee cuộn 80x200cm', price: 220000 },
    ],
    FINISHING_PRICES: {
        edgeTapingPricePerSqm: 20000,
        grommetPricePerPiece: 5000,
        dieCutting: {
            tier1LimitSqm: 5,
            tier2LimitSqm: 20,
            tier1PricePerSqm: 80000,
            tier2PricePerSqm: 40000,
            tier3PricePerSqm: 20000,
        },
    },
};
