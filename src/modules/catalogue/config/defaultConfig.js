// Catalogue (bấm kim) config — CHỈ chứa tham số riêng của catalogue.
//
// Toàn bộ bảng giá giấy / mức giá A4 / khổ tờ in… được DÙNG CHUNG với module
// "In KTS Khổ Nhỏ" (printConfig): CatalogueModule nạp printConfig lúc chạy và
// gộp STAPLE_CONFIG vào để truyền cho engine. Vì vậy không copy các bảng giá ở
// đây — sửa giá giấy 1 lần bên In KTS là catalogue tự áp dụng.

export const CATALOGUE_DEFAULT_CONFIG = {
    // Phí bấm kim (saddle stitch). Giá KHÁCH tính theo BẬC số cuốn (đúng cột
    // "Đóng kim" trong bảng giá in nhanh); giá VỐN phẳng theo cuốn.
    STAPLE_CONFIG: {
        costPerBook: 500, // giá vốn / cuốn (phẳng)
        // tiers: bậc theo SỐ CUỐN. type 'package' = trọn gói cả đơn; 'per_book' = đơn giá × số cuốn.
        tiers: [
            { min: 1, max: 5, price: 50000, type: 'package' },
            { min: 6, max: 10, price: 9000, type: 'per_book' },
            { min: 11, max: 15, price: 9000, type: 'per_book' },
            { min: 16, max: 50, price: 8000, type: 'per_book' },
            { min: 51, max: 79, price: 7000, type: 'per_book' },
            { min: 80, max: 100, price: 6000, type: 'per_book' },
            { min: 101, max: 119, price: 6000, type: 'per_book' },
            { min: 120, max: 500, price: 4000, type: 'per_book' },
            { min: 501, max: 559, price: 4000, type: 'per_book' },
            { min: 560, max: 1000, price: 4000, type: 'per_book' },
            { min: 1001, max: Infinity, price: 4000, type: 'per_book' },
        ],
    },
};
