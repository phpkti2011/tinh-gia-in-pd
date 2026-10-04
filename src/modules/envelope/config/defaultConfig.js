// Envelope config — bảng giá riêng của module bao thư (admin sửa, đồng bộ cloud module 'envelope').
//
// Giấy, click in, bảng giá khách theo trang A4, giá sàn in và ép nhũ KHÔNG nằm ở đây:
// lấy từ cấu hình In KTS khổ nhỏ hiện hành (printConfig) khi tính.
//
// Các bậc giá ban đầu là số MẪU. pricesConfirmed=false chặn xuất tổng báo khách cho tới khi
// admin kiểm tra và xác nhận trong Cài Đặt (giống lịch bàn).

const tiers = (values) => values.map(([from, cost, sale]) => ({ from, cost, sale }));

// ⛔ TRƯỚC KHI NÂNG SỐ NÀY: hàm `save_envelope_price_config` trên Supabase có một danh sách
//    phiên bản được chấp nhận, chốt cứng trong SQL. Nâng hằng số này mà chưa chạy lại
//    `docs/database/migration-envelope-module.sql` thì MỌI lần admin lưu bảng giá đều bị từ chối
//    (errcode 22023 → HTTP 400), bản nháp kẹt trong trình duyệt, và vòng tự gửi lại
//    khoá luôn việc báo giá cho toàn bộ nhân viên — đã xảy ra thật ngày 03/10/2026.
//    Thứ tự bắt buộc: thêm số mới vào SQL → chạy SQL trên Supabase → rồi mới deploy.
export const ENVELOPE_SCHEMA_VERSION = '1.0.0';
export const ENVELOPE_ART_PAPERS = [{ name: 'Giấy mỹ thuật', w: 70, h: 100, cost: 0 }];
export const ENVELOPE_SIZE_PRESETS = [
    { id: '220x120', w: 220, h: 120 },
    { id: '220x110', w: 220, h: 110 },
    { id: '230x160', w: 230, h: 160 },
    { id: '350x250', w: 350, h: 250 },
];
export const ENVELOPE_CUT_LABELS = {
    none: 'Không bế',
    mold: 'Bế có khuôn',
    digital: 'Bế kỹ thuật số (không khuôn)',
};

export const FEE_MODES = ['per_item', 'package'];
export const FEE_MODE_LABELS = { per_item: 'Mỗi bao thư', package: 'Trọn gói mỗi đơn' };

export const ENVELOPE_DEFAULT_CONFIG = {
    pricesConfirmed: false,
    artPapers: ENVELOPE_ART_PAPERS,
    sizePresets: ENVELOPE_SIZE_PRESETS,
    // allowed: số thứ tự giấy trong PAPER_STOCK_DATA của KTS (chỉ giấy ram). Rỗng = mọi giấy ram.
    papers: { allowed: [], defaultPaper: 5, defaultStock: 0 },
    // Giá trị điền sẵn cho màn nhập; người dùng vẫn đổi được từng đơn.
    defaults: {
        unit: 'mm',
        construction: 'joined-opposite',
        flapEdge: 'W',
        flapMm: 40,
        tabMm: 15,
        color: '4color',
    },
    // Dữ liệu bế cũ giữ để đọc cấu hình đã lưu; giá/bình bế hiện dùng trực tiếp KTS.
    dieCut: {
        gapCm: 0.4,
        mode: 'per_item',
        tiers: tiers([
            [1, 500, 1000],
            [100, 300, 600],
            [500, 200, 400],
        ]),
    },
    gluing: {
        mode: 'per_item',
        tiers: tiers([
            [1, 300, 700],
            [100, 200, 500],
            [500, 150, 350],
        ]),
    },
    // Áp cho cả đơn, không áp riêng phần mặt sau.
    orderMin: { fixedCost: 0, fixedSale: 0, minSale: 0 },
    // Mặt sau rời KHÔNG in: giá khách = vốn giấy ram × hệ số.
    backPaperFactor: 2,
    flapTape: { costPerCm: 0, salePerCm: 0, minCost: 0, minSale: 0 },
};

// W/H để trống (NaN) — ô trống không phải 0; người dùng phải nhập.
export const ENVELOPE_DEFAULT_INPUT = {
    unit: 'mm',
    w: NaN,
    sizePreset: 'custom',
    dieCuttingType: 'mold',
    h: NaN,
    flap: 40,
    tab: 15,
    flapEdge: 'W',
    construction: 'joined-opposite',
    backPrint: null,
    quantity: 100,
    paper: 5,
    paperSource: 'ream',
    artIndex: 0,
    artInput: null,
    stock: 0,
    color: '4color',
    foil: false,
    flapTape: false,
    molds: [{ w: 6, h: 3, impressions: 1, special: false }],
};

// Điền sẵn từ cấu hình admin (giữ nguyên các trường người dùng phải nhập).
export function inputFromConfig(config) {
    const d = config.defaults;
    return {
        ...ENVELOPE_DEFAULT_INPUT,
        unit: d.unit,
        flap: d.unit === 'cm' ? d.flapMm / 10 : d.flapMm,
        tab: d.unit === 'cm' ? d.tabMm / 10 : d.tabMm,
        flapEdge: d.flapEdge,
        construction: d.construction,
        color: d.color,
        paper: config.papers.defaultPaper,
        stock: config.papers.defaultStock,
    };
}
