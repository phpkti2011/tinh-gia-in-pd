// Envelope config — bảng giá riêng của module bao thư (admin sửa, đồng bộ cloud module 'envelope').
//
// Giấy, click in, bảng giá khách theo trang A4, giá sàn in và ép nhũ KHÔNG nằm ở đây:
// lấy từ cấu hình In KTS khổ nhỏ hiện hành (printConfig) khi tính.
//
// Các bậc giá ban đầu là số MẪU. pricesConfirmed=false chặn xuất tổng báo khách cho tới khi
// admin kiểm tra và xác nhận trong Cài Đặt (giống lịch bàn).

const tiers = (values) => values.map(([from, cost, sale]) => ({ from, cost, sale }));

export const ENVELOPE_SCHEMA_VERSION = '1.0.0';

export const FEE_MODES = ['per_item', 'package'];
export const FEE_MODE_LABELS = { per_item: 'Mỗi bao thư', package: 'Trọn gói mỗi đơn' };

export const ENVELOPE_DEFAULT_CONFIG = {
    pricesConfirmed: false,
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
    // Bế khuôn: gapCm = khoảng cách bình giữa các khổ trải trên tờ in (như nhánh mold của KTS).
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
};

// W/H để trống (NaN) — ô trống không phải 0; người dùng phải nhập.
export const ENVELOPE_DEFAULT_INPUT = {
    unit: 'mm',
    w: NaN,
    h: NaN,
    flap: 40,
    tab: 15,
    flapEdge: 'W',
    construction: 'joined-opposite',
    backPrint: null,
    quantity: 100,
    paper: 5,
    stock: 0,
    color: '4color',
    foil: false,
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
