// Tính giá TỜ RƠI — bảng giá mặc định (port từ module-tinh-gia-to-roi-pd-tone-web.html).
//
// Mô hình: TRA BẢNG bậc số lượng theo khổ → giá GỐC (baseline C150 · 2 mặt · không cán),
// chọn đơn giá mốc theo quy tắc tăng 70%, rồi cộng/giảm các phụ phí. KHÔNG imposition.
//
// Schema: src/modules/flyer/config/schema.js — Version: src/modules/flyer/config/version.js

export const FLYER_DEFAULT_CONFIG = {
    FLYER_CONFIG: {
        // Khổ + số lượng tối thiểu.
        sizes: [
            { id: 'A5', name: 'Kích thước A5', min: 100 },
            { id: 'A4', name: 'Kích thước A4', min: 50 },
        ],

        // Bảng giá GỐC (tổng) theo mốc số lượng.
        priceTable: {
            A5: [
                { qty: 100, price: 250000 },
                { qty: 200, price: 400000 },
                { qty: 300, price: 570000 },
                { qty: 400, price: 760000 },
                { qty: 500, price: 925000 },
                { qty: 700, price: 1281000 },
                { qty: 1000, price: 1700000 },
                { qty: 2000, price: 3100000 },
            ],
            A4: [
                { qty: 50, price: 320000 },
                { qty: 100, price: 400000 },
                { qty: 200, price: 760000 },
                { qty: 300, price: 1170000 },
                { qty: 400, price: 1500000 },
                { qty: 500, price: 1700000 },
                { qty: 700, price: 2310000 },
                { qty: 1000, price: 3100000 },
                { qty: 2000, price: 5000000 },
            ],
        },

        // Loại giấy + phụ thu / tờ theo khổ.
        paperTypes: [
            { id: 'C150', name: 'Giấy C150' },
            { id: 'C200', name: 'Giấy C200' },
            { id: 'C250', name: 'Giấy C250' },
            { id: 'C300', name: 'Giấy C300' },
        ],
        paperSurcharge: {
            C150: { A5: 0, A4: 0 },
            C200: { A5: 50, A4: 100 },
            C250: { A5: 100, A4: 200 },
            C300: { A5: 150, A4: 300 },
        },

        // Cán màng — phụ thu / tờ theo khổ (khi chọn "Có cán màng").
        laminationSurcharge: { A5: 300, A4: 500 },

        // Cấn đường gấp — phí PHẲNG / đơn theo band SL × số đường; qty>2000 xử lý riêng.
        creasing: {
            bands: [
                { maxQty: 100, prices: { '1-2': 100000, '3-5': 170000 } },
                { maxQty: 500, prices: { '1-2': 150000, '3-5': 250000 } },
                { maxQty: 1000, prices: { '1-2': 200000, '3-5': 300000 } },
                { maxQty: 2000, prices: { '1-2': 300000, '3-5': 500000 } },
            ],
            // Trên mốc cao nhất: 1-2 đường = qty × perSheet; 3-5 đường = cần xác nhận riêng.
            overMax: { '1-2': { perSheet: 140 }, '3-5': { manual: true } },
        },

        // Lựa chọn (id + nhãn) cho các select.
        sidesOptions: [
            { id: '2', name: 'In 2 mặt' },
            { id: '1', name: 'In 1 mặt - giảm 35%' },
        ],
        laminationOptions: [
            { id: 'none', name: 'Không cán màng' },
            { id: 'yes', name: 'Có cán màng' },
        ],
        creasingOptions: [
            { id: 'none', name: 'Không cấn' },
            { id: '1-2', name: 'Cấn 1-2 đường' },
            { id: '3-5', name: 'Cấn 3-5 đường' },
        ],
        contentOptions: [
            { id: '1-2', name: 'In 1-2 nội dung' },
            { id: '3-5', name: 'In 3-5 nội dung - cộng 10%' },
        ],

        oneSideDiscountPct: 35, // in 1 mặt giảm trên giá in cơ bản
        contentSurchargePct: 10, // 3-5 nội dung: cộng trên (base sau giảm + giấy)
        upperThresholdPct: 70, // tăng > 70% giữa 2 mốc → lấy đơn giá mốc trên
    },
};
