// Spiral (sổ đóng lò xo) config — CHỈ chứa tham số riêng.
//
// Bảng giá giấy / mức A4 / khổ tờ in dùng CHUNG printConfig (In KTS): SpiralModule
// nạp printConfig lúc chạy và gộp SPIRAL_CONFIG vào cho engine.

// Dải bậc theo SỐ CUỐN dùng chung (bìa lót seed theo dải này, price 0 để admin điền).
const COIL_RANGES = [
    [1, 5],
    [6, 10],
    [11, 15],
    [16, 50],
    [51, 79],
    [80, 100],
    [101, 119],
    [120, 500],
    [501, 559],
    [560, 1000],
    [1001, Infinity],
];
const zeroTiers = () =>
    COIL_RANGES.map(([min, max]) => ({ min, max, price: 0, type: 'per_book' }));

export const SPIRAL_DEFAULT_CONFIG = {
    // Đóng lò xo (coil binding).
    SPIRAL_CONFIG: {
        costPerBook: 800, // giá vốn lò xo / cuốn (phẳng)
        // Giá KHÁCH theo BẬC SỐ CUỐN (cột "Đóng lò xo" trong bảng giá in nhanh).
        // type 'per_book' = đơn giá × số cuốn; 'package' = trọn gói cả đơn.
        coilTiers: [
            { min: 1, max: 5, price: 10000, type: 'per_book' },
            { min: 6, max: 10, price: 9000, type: 'per_book' },
            { min: 11, max: 15, price: 9000, type: 'per_book' },
            { min: 16, max: 50, price: 8000, type: 'per_book' },
            { min: 51, max: 79, price: 8000, type: 'per_book' },
            { min: 80, max: 100, price: 7000, type: 'per_book' },
            { min: 101, max: 119, price: 7000, type: 'per_book' },
            { min: 120, max: 500, price: 6000, type: 'per_book' },
            { min: 501, max: 559, price: 6000, type: 'per_book' },
            { min: 560, max: 1000, price: 5500, type: 'per_book' },
            { min: 1001, max: Infinity, price: 5000, type: 'per_book' },
        ],
        // Phụ giá theo bậc ĐỘ DÀY = tổng số tờ/cuốn (bìa + ruột), đ/cuốn. Mặc định 0
        // — admin điền số thực trong Cài Đặt (bảng giá chưa có số liệu độ dày).
        thicknessTiers: [
            { min: 1, max: 50, surcharge: 0 },
            { min: 51, max: 100, surcharge: 0 },
            { min: 101, max: 200, surcharge: 0 },
            { min: 201, max: Infinity, surcharge: 0 },
        ],
        // Bìa lót ngoài (tấm trước bìa) — mỗi loại có bảng bậc theo SỐ CUỐN. Giá KHÁCH
        // (price) mặc định 0, admin điền. KHÔNG tính vào độ dày lò xo.
        linerTypes: [
            { name: '2 zem', costPerBook: 0, tiers: zeroTiers() },
            { name: 'Mờ sần', costPerBook: 0, tiers: zeroTiers() },
        ],
    },
};
