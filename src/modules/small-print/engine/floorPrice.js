// Small-print engine — GIÁ SÀN.
//
// Mức tiệm không bao giờ bán dưới, admin đặt ra để không lỗ khi bảng giá tính sai.
// Hai công thức, chia theo CÁCH TÍNH GIÁ GIẤY:
//
//   Giấy ram          sàn = 1.500đ × số trang A4  +  giá vốn thành phẩm
//   m² / tờ / mỹ thuật sàn = 1.100đ × số trang A4  +  tiền giấy thật  +  giá vốn thành phẩm
//
// Lý do chia đôi: bảng giá khách được tiệm thiết kế dựa trên giấy ram chuẩn (C300), nên mức
// 1.500 đã gồm sẵn tiền giấy. Giấy tính theo m² / theo tờ / gõ tay thì giá giấy chênh nhau
// quá xa để gộp vào một con số — sàn chỉ bao tiền IN (1.100), tiền giấy cộng theo giá thật.
//
// Hai mức sàn này CŨNG là thứ kẹp giá báo khách: giá khách = max(bảng giá, sàn).
// Nhờ vậy Giá Tối Thiểu không bao giờ lớn hơn Giá Báo Khách nữa.
//
// ⚠ Đặt sàn = 0 (hoặc thiếu field) ⇒ `active: false`, total = 0 ⇒ KHÔNG kẹp đơn nào.
// Đây là đường lùi có chủ đích: tắt sàn là mọi giá về y như trước khi có file này.

import { calculatePrintContentSurcharge } from './pricing.js';

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

// Giấy ram dùng mức sàn ĐÃ GỒM GIẤY; mọi cách tính giá khác dùng mức "chỉ in" rồi cộng
// tiền giấy thật. Model lạ / thiếu ⇒ rơi vào nhánh an toàn hơn (cộng giấy thật).
export function floorIncludesPaper(pricingModel) {
    return pricingModel === 'ream';
}

// paperCost  — tổng tiền giấy THẬT của đơn (giấy in + giấy trắng bồi). Bỏ qua khi giấy ram.
// otherCost  — tổng giá vốn thành phẩm: cán màng, dữ liệu biến đổi, bấm lỗ, cấn, công bồi,
//              gia công thêm, khuôn bế, công bế, ép kim, sàn ép plastic.
export function calculateFloorPrice({
    pricingModel,
    totalA4Pages,
    paperCost = 0,
    otherCost = 0,
    quantity = 0,
    printContents = 1,
    config,
}) {
    const includesPaper = floorIncludesPaper(pricingModel);
    const ref = config?.PAPER_REFERENCE_CONFIG || {};
    const rate = num(includesPaper ? ref.minPrintPricePerPage : ref.minPrintOnlyPricePerPage);

    const empty = {
        rate: 0,
        includesPaper,
        printFloor: 0,
        paperCost: 0,
        otherCost: 0,
        surcharge: 0,
        total: 0,
        active: false,
    };
    if (!(rate > 0)) return empty;

    const pages = num(totalA4Pages);
    if (!(pages > 0)) return { ...empty, rate };

    const printFloor = pages * rate;
    // Giá vốn âm là config hỏng, không phải khuyến mãi — kẹp về 0 thay vì trừ vào sàn.
    const paper = includesPaper ? 0 : Math.max(0, num(paperCost));
    const other = Math.max(0, num(otherCost));
    const base = printFloor + paper + other;

    // Phụ thu nhiều nội dung áp lên cả sàn: nhiều nội dung tốn công dàn trang thật, và giá
    // khách cũng bị áp % này — không áp ở đây thì sàn tụt lại đúng bằng % đó.
    const { surcharge } = calculatePrintContentSurcharge(base, quantity, printContents, config);

    return {
        rate,
        includesPaper,
        printFloor,
        paperCost: paper,
        otherCost: other,
        surcharge,
        total: base + surcharge,
        active: true,
    };
}
