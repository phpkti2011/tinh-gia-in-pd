// Small-print — danh mục GIẤY (PAPER_STOCK_DATA): cách tính giá + ẩn/hiện + khổ tờ.
//
// Nguồn duy nhất, dùng chung SettingsPanel + 3 màn nhập liệu (In KTS, Catalogue, Lò xo)
// — cả 3 module dùng CHUNG bảng giấy này.
//
// ⚠ GIẤY ĐƯỢC NHẬN DIỆN BẰNG SỐ THỨ TỰ TRONG MẢNG (params.paperType = '3'), không phải
// bằng tên hay mã. Hệ quả:
//   - THÊM giấy chỉ được nối vào CUỐI mảng → số thứ tự cũ giữ nguyên.
//   - KHÔNG xoá phần tử khỏi mảng. Muốn bỏ một loại giấy thì đánh dấu `hidden: true`:
//     nó biến mất khỏi mọi ô chọn nhưng số thứ tự các giấy khác không xê dịch.
//     Xoá thật sẽ làm mọi giấy phía sau tụt 1 bậc → đơn đang mở chọn C300 lặng lẽ
//     thành B300, và lan sang cả Catalogue lẫn Lò xo.
//
// Ẩn CHỈ là chuyện giao diện: engine vẫn tra theo số thứ tự nên đơn đang mở vẫn ra đúng
// giá kể cả khi giấy vừa bị ẩn. Ô chọn cũng luôn giữ lại giấy ĐANG chọn (xem keepIndex).

export const PAPER_PRICING_MODELS = [
    { id: 'ream', label: 'Theo ram (500 tờ)', priceField: 'pricePerReam' },
    { id: 'sqm', label: 'Theo m² (decal cuộn)', priceField: 'pricePerSqm' },
    { id: 'per_sheet', label: 'Theo tờ, khổ cố định', priceField: 'sheetPrice' },
    { id: 'custom', label: 'Giá gõ tay từng đơn', priceField: null },
];

export function pricingModelLabel(model) {
    return PAPER_PRICING_MODELS.find((m) => m.id === model)?.label || model;
}

// Giấy hiện ra ở các ô chọn, KÈM số thứ tự gốc trong mảng (value của <option>).
// keepIndex: luôn giữ lại giấy đang được chọn dù nó đã bị ẩn — nếu không, ô chọn sẽ
// không khớp option nào và nhân viên tưởng đơn đang dùng giấy khác.
export function visiblePapers(paperStockData, keepIndex) {
    const arr = Array.isArray(paperStockData) ? paperStockData : [];
    const keep = keepIndex == null ? -1 : Number(keepIndex);
    return arr
        .map((paper, index) => ({ paper, index }))
        .filter(({ paper, index }) => !paper?.hidden || index === keep);
}

// Giấy mới luôn NỐI VÀO CUỐI mảng. Điền sẵn field giá của đúng cách tính để không
// rơi vào trạng thái thiếu field (engine sẽ bỏ qua giấy thiếu giá → mất phương án).
export function makeNewPaper(model = 'ream') {
    const base = { name: 'Giấy mới', pricingModel: model, description: '', customerSurcharge: 0 };
    if (model === 'sqm') return { ...base, pricePerSqm: 0 };
    if (model === 'per_sheet') return { ...base, sheetPrice: 0, sheetSize: { w: 33, h: 48 } };
    if (model === 'custom') return { ...base, pricePerReam: 'custom' };
    return { ...base, pricePerReam: 0 };
}

// Đổi cách tính giá của một giấy: bơm field giá còn thiếu, GIỮ NGUYÊN tên/phụ thu và
// giữ luôn field giá cũ (đổi nhầm rồi đổi lại thì số cũ vẫn còn).
export function withPricingModel(paper, model) {
    const next = { ...paper, pricingModel: model };
    if (model === 'ream' && typeof next.pricePerReam !== 'number') next.pricePerReam = 0;
    if (model === 'sqm' && typeof next.pricePerSqm !== 'number') next.pricePerSqm = 0;
    if (model === 'per_sheet') {
        if (typeof next.sheetPrice !== 'number') next.sheetPrice = 0;
        // Kiểm CẢ w LẪN h: thiếu h thì engine bỏ qua giấy này và màn hình chỉ báo
        // "không tìm thấy phương án", không nói được vì sao.
        if (
            !next.sheetSize ||
            typeof next.sheetSize.w !== 'number' ||
            typeof next.sheetSize.h !== 'number'
        ) {
            next.sheetSize = { w: 33, h: 48 };
        }
    }
    if (model === 'custom') next.pricePerReam = 'custom';
    return next;
}

// Danh sách KHỔ × GIÁ của một giấy bán theo tờ (pricingModel='per_sheet').
//
// Nguồn: `sheetSizes` (v1.7.0 — nhiều khổ, mỗi khổ một giá). Vắng hoặc rỗng thì suy ra
// ĐÚNG MỘT khổ từ cặp field cũ { sheetSize, sheetPrice } ⇒ mọi config đã lưu ra giá y hệt
// từng đồng.
//
// ⚠ CỐ Ý CHỈ CHUẨN HOÁ KIỂU, KHÔNG lọc bỏ dòng w/h = 0. Bảng khổ trong Cài Đặt render từ
// chính hàm này, mà ô nhập số commit theo TỪNG PHÍM: xoá số để gõ lại là giá trị rơi về 0
// một nhịp. Lọc ở đây thì dòng đang gõ dở biến mất ngay dưới con trỏ. Engine tự bỏ qua
// khổ vô nghĩa (vùng in ≤ 0 ⇒ 0 SP/tờ ⇒ không sinh phương án) nên không cần chặn thêm.
export function perSheetVariants(paper) {
    if (!paper) return [];
    const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : 0);

    const rows = (Array.isArray(paper.sheetSizes) ? paper.sheetSizes : [])
        .filter((r) => r && typeof r === 'object')
        .map((r) => ({ w: num(r.w), h: num(r.h), price: num(r.price) }));
    if (rows.length > 0) return rows;

    // Nhánh cũ — giữ NGUYÊN VĂN guard mà calculatePerSheetOptions vẫn dùng.
    const sz = paper.sheetSize;
    if (!sz || typeof sz.w !== 'number' || typeof sz.h !== 'number') return [];
    return [{ w: sz.w, h: sz.h, price: num(paper.sheetPrice) }];
}
