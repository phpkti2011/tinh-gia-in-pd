// UV DTF — bảng giá mặc định.
//
// Di chuyển từ src/config/uvdtfConfig.js ở TASK-0013 (config schema/version).
// KHÔNG đổi giá trị so với bản gốc — chỉ đổi vị trí file để phù hợp với
// cấu trúc module mới (src/modules/uvdtf/).
//
// Schema validation: xem src/modules/uvdtf/config/schema.js
// Version metadata:  xem src/modules/uvdtf/config/version.js

export const UVDTF_DEFAULT_CONFIG = {
    materialWidthCM: 55,
    printableWidthCM: 53,
    paddingCM: 0.4,
    minBillableMeters: 1,
    priceTiers: [
        { maxMeters: 2, price: 440000 },
        { maxMeters: 5, price: 390000 },
        { maxMeters: 10, price: 330000 },
        { maxMeters: Infinity, price: 280000 },
    ],
};
