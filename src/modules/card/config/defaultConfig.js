// Tính giá THẺ NHỰA — bảng giá mặc định (port từ webapp/current/index.html).
//
// Mô hình: TRA BẢNG bậc số lượng theo (loại thẻ × SL) → giá GỐC, rồi ra giá BÁN =
//   max(giá gốc × hệ số nhóm khách, giá gốc + phụ thu tối thiểu đơn hàng), làm tròn CEIL bội 100.
// Loại thẻ id bắt đầu "wood" dùng bảng woodTiers; còn lại dùng standardTiers.
//
// LƯU Ý (DECISIONS.md): KHÔNG hiển thị giá gốc / hệ số cho khách — chỉ dùng nội bộ & Cài đặt Admin.
//
// Schema: src/modules/card/config/schema.js — Version: src/modules/card/config/version.js

export const CARD_DEFAULT_CONFIG = {
    CARD_CONFIG: {
        // Loại thẻ (thứ tự hiển thị). table: 'standard' | 'wood'.
        products: [
            { id: 'normal', name: 'Nền thường', table: 'standard' },
            { id: 'foil', name: 'Nền nhũ', table: 'standard' },
            { id: 'thin', name: 'Mỏng thường / trong suốt', table: 'standard' },
            { id: 'gradient', name: 'Chuyển sắc (1 mặt)', table: 'standard' },
            { id: 'mifare', name: 'Chip Mifare / Proximity', table: 'standard' },
            { id: 'dual', name: 'CHIP kép Mifare + Proxi', table: 'standard' },
            { id: 'nfc', name: 'NFC', table: 'standard' },
            { id: 'wood', name: 'Gỗ không chip', table: 'wood' },
            { id: 'woodMifare', name: 'Gỗ Mifare / Proxi', table: 'wood' },
            { id: 'woodNfc', name: 'Gỗ NFC', table: 'wood' },
        ],

        // Bảng giá GỐC (đ/thẻ) theo bậc SL — prices keyed theo product id.
        standardTiers: [
            {
                min: 10,
                max: 50,
                label: '10–50 cái',
                prices: {
                    normal: 15000,
                    foil: 20000,
                    thin: 13000,
                    gradient: 25000,
                    mifare: 25000,
                    dual: 28000,
                    nfc: 30000,
                },
            },
            {
                min: 51,
                max: 99,
                label: '51–99 cái',
                prices: {
                    normal: 10000,
                    foil: 15000,
                    thin: 9500,
                    gradient: 16000,
                    mifare: 16000,
                    dual: 20000,
                    nfc: 22000,
                },
            },
            {
                min: 100,
                max: 199,
                label: 'Mốc 100',
                prices: {
                    normal: 7000,
                    foil: 10500,
                    thin: 6500,
                    gradient: 13000,
                    mifare: 15500,
                    dual: 18000,
                    nfc: 17500,
                },
            },
            {
                min: 200,
                max: 299,
                label: 'Mốc 200',
                prices: {
                    normal: 6500,
                    foil: 10000,
                    thin: 6000,
                    gradient: 12500,
                    mifare: 14500,
                    dual: 16500,
                    nfc: 17000,
                },
            },
            {
                min: 300,
                max: 399,
                label: 'Mốc 300',
                prices: {
                    normal: 6300,
                    foil: 9500,
                    thin: 5500,
                    gradient: 12000,
                    mifare: 14000,
                    dual: 15500,
                    nfc: 16000,
                },
            },
            {
                min: 400,
                max: 499,
                label: 'Mốc 400',
                prices: {
                    normal: 6000,
                    foil: 8500,
                    thin: 5800,
                    gradient: 11000,
                    mifare: 13000,
                    dual: 14800,
                    nfc: 15000,
                },
            },
            {
                min: 500,
                max: 699,
                label: 'Mốc 500',
                prices: {
                    normal: 5800,
                    foil: 7500,
                    thin: 6000,
                    gradient: 10000,
                    mifare: 10000,
                    dual: 12700,
                    nfc: 12000,
                },
            },
            {
                min: 700,
                max: 999,
                label: 'Mốc 700',
                prices: {
                    normal: 5500,
                    foil: 7000,
                    thin: 5500,
                    gradient: 9000,
                    mifare: 7800,
                    dual: 10800,
                    nfc: 10000,
                },
            },
            {
                min: 1000,
                max: 1999,
                label: 'Mốc 1.000',
                prices: {
                    normal: 5000,
                    foil: 6400,
                    thin: 5000,
                    gradient: 8000,
                    mifare: 7300,
                    dual: 10400,
                    nfc: 9500,
                },
            },
            {
                min: 2000,
                max: 2999,
                label: 'Mốc 2.000',
                prices: {
                    normal: 4500,
                    foil: 5400,
                    thin: 4500,
                    gradient: 7500,
                    mifare: 7000,
                    dual: 10000,
                    nfc: 9300,
                },
            },
            {
                min: 3000,
                max: 3999,
                label: 'Mốc 3.000',
                prices: {
                    normal: 4000,
                    foil: 4300,
                    thin: 4000,
                    gradient: 7200,
                    mifare: 6500,
                    dual: 9500,
                    nfc: 9000,
                },
            },
            {
                min: 4000,
                max: 4999,
                label: 'Mốc 4.000',
                prices: {
                    normal: 3500,
                    foil: 3800,
                    thin: 3500,
                    gradient: 7000,
                    mifare: 6400,
                    dual: 9000,
                    nfc: 8800,
                },
            },
            {
                min: 5000,
                max: 5000,
                label: 'Mốc 5.000',
                prices: {
                    normal: 3200,
                    foil: 3400,
                    thin: 3200,
                    gradient: 6900,
                    mifare: 6300,
                    dual: 8500,
                    nfc: 8600,
                },
            },
        ],
        woodTiers: [
            {
                min: 10,
                max: 99,
                label: '10–99 cái',
                prices: { wood: 25000, woodMifare: 30000, woodNfc: 30000 },
            },
            {
                min: 100,
                max: 299,
                label: '100–299',
                prices: { wood: 18500, woodMifare: 21000, woodNfc: 22000 },
            },
            {
                min: 300,
                max: 499,
                label: '300–499',
                prices: { wood: 17000, woodMifare: 19000, woodNfc: 20000 },
            },
            {
                min: 500,
                max: 999,
                label: '500–999',
                prices: { wood: 16500, woodMifare: 17000, woodNfc: 18000 },
            },
            {
                min: 1000,
                max: 2999,
                label: '1.000–2.999',
                prices: { wood: 14000, woodMifare: 15000, woodNfc: 16000 },
            },
            {
                min: 3000,
                max: 3999,
                label: '3.000–3.999',
                prices: { wood: 12000, woodMifare: 13000, woodNfc: 15000 },
            },
            {
                min: 4000,
                max: 4999,
                label: '4.000–4.999',
                prices: { wood: null, woodMifare: null, woodNfc: null },
            },
            {
                min: 5000,
                max: 5000,
                label: 'Mốc 5.000',
                prices: { wood: 11000, woodMifare: 12000, woodNfc: 13500 },
            },
        ],

        // Dịch vụ gia tăng — giá GỐC (base). extra = tổng base đã chọn.
        addons: [
            { id: 'barcode', name: 'Mã vạch / QR code biến đổi', base: 500 },
            { id: 'emboss', name: 'Dập nổi', base: 1000 },
            { id: 'magstripe', name: 'Từ đen + ghi từ', base: 1200 },
        ],

        // Nhóm khách hàng → hệ số nhân.
        segments: [
            { id: 'direct', name: 'Khách trực tiếp', multiplier: 2 },
            { id: 'agency', name: 'Khách đại lý', multiplier: 1.5 },
        ],

        shipping: 100000, // phí ship / đơn (dùng ở nhánh SL 1–9)
        minProfit: 150000, // lợi nhuận tối thiểu / đơn
        minOrderAdd: 250000, // sàn đơn hàng cộng vào giá gốc (= shipping + minProfit)
        roundTo: 100, // làm tròn CEIL bội số này
        maxQty: 5000, // trên mức này → LIÊN HỆ báo giá
        moq: 10, // MOQ nhà cung cấp (SL < 10 tính theo cơ sở 10 cái)

        // Lợi nhuận / đơn theo SL thấp (1–9).
        lowQtyProfit: {
            1: 150000,
            2: 200000,
            3: 280000,
            4: 350000,
            5: 350000,
            6: 320000,
            7: 280000,
            8: 230000,
            9: 180000,
        },

        contactMessage: 'Liên hệ báo giá',
        hotline: '0906702063',
    },
};
