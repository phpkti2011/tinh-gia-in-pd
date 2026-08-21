// Decal nhãn GIÁ RẺ — bảng giá mặc định (dựng từ bảng giá Google Sheets người dùng cung cấp).
//
// Mô hình: TRA BẢNG theo (cỡ × mốc số lượng cố định 500/1000/2000) → TỔNG tiền (nhãn tròn · decal
// giấy · không cán), rồi cộng các phụ phí. KHÔNG imposition.
//
// Schema: src/modules/cheapdecal/config/schema.js — Version: version.js

export const CHEAP_DECAL_DEFAULT_CONFIG = {
    CHEAP_DECAL_CONFIG: {
        // Cỡ nhãn (1–7) + số nhãn trên 1 tờ in (thông tin).
        sizes: [
            { id: '1', name: 'Cỡ 1', perSheet: 676 },
            { id: '2', name: 'Cỡ 2', perSheet: 169 },
            { id: '3', name: 'Cỡ 3', perSheet: 81 },
            { id: '4', name: 'Cỡ 4', perSheet: 49 },
            { id: '5', name: 'Cỡ 5', perSheet: 33 },
            { id: '6', name: 'Cỡ 6', perSheet: 20 },
            { id: '7', name: 'Cỡ 7', perSheet: 16 },
        ],

        // Mốc số lượng cố định.
        quantities: [500, 1000, 2000],

        // TỔNG tiền GỐC theo cỡ, index khớp `quantities` (nhãn tròn · decal giấy · không cán).
        priceTable: {
            1: [90000, 110000, 150000],
            2: [100000, 130000, 200000],
            3: [120000, 150000, 250000],
            4: [145000, 240000, 400000],
            5: [210000, 300000, 520000],
            6: [240000, 400000, 700000],
            7: [300000, 475000, 800000],
        },

        // Phụ phí +đ/nhãn theo cỡ.
        materialSurcharge: { 1: 40, 2: 45, 3: 48, 4: 50, 5: 52, 6: 54, 7: 60 }, // decal nhựa
        laminationSurcharge: { 1: 40, 2: 45, 3: 48, 4: 50, 5: 52, 6: 54, 7: 60 }, // cán màng

        // Phụ phí lấy trong ngày (phẳng theo số lượng).
        rushFee: { 500: 100000, 1000: 180000, 2000: 250000 },

        // Nhãn hình vuông cộng % trên giá cơ bản.
        squareSurchargePct: 10,

        // Lựa chọn cho các select.
        materials: [
            { id: 'paper', name: 'Decal giấy' },
            { id: 'plastic', name: 'Decal nhựa (+đ/nhãn)' },
        ],
        shapes: [
            { id: 'round', name: 'Nhãn hình tròn' },
            { id: 'square', name: 'Nhãn hình vuông (+10%)' },
        ],

        leadTimeNote: 'Thời gian sản xuất 3–7 ngày làm việc.',
    },
};
