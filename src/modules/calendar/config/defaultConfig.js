const tiers = (values) => values.map(([from, cost, sale]) => ({ from, cost, sale }));

export { CALENDAR_SCHEMA_VERSION, CALENDAR_CONFIG_LAST_UPDATED } from './version';

// Khổ tấm carton dùng khi config cũ chưa khai và geometry cũng thiếu. Xem config/normalize.js.
export const DEFAULT_CARTON_SHEET = { w: 60, h: 100 };

export const CALENDAR_DEFAULT_CONFIG = {
    pricesConfirmed: false,
    geometry: {
        allowance: 4,
        strip: 3,
        largeCount: 2,
        smallCount: 2,
        // BẢN SAO của materials.carton[0].w/h — engine không đọc, Cài Đặt không cho sửa.
        // Giữ để bundle cũ / đường rollback vẫn báo giá đúng. Xem config/normalize.js.
        stockW: 60,
        stockH: 100,
        machine: 76,
        trim: 0,
        gap: 0,
        wrapPadW: 5,
        wrapFactor: 2,
        wrapPadH: 13.1,
        wrapCopies: 1,
        wrapPrintInset: 5,
        linerFactor: 2,
        linerPadH: 2.1,
        linerBaseH: 6,
        linerReduceW: 4,
        linerReduceH: 4,
        linerCopies: 1,
        lamSides: 1,
        linerSaleFactor: 2,
        baseMin: 20000,
    },
    wrapperSale: { printed: 'unset', blank: 'unset', paperFactor: 2 },
    materials: {
        carton: [
            {
                name: 'Carton lạnh tiêu chuẩn',
                // Khổ tấm nguyên của RIÊNG loại này; w là cạnh nạp vào máy cắt.
                w: 60,
                h: 100,
                tiers: tiers([
                    [1, 45000, 18],
                    [10, 42000, 15],
                    [100, 39000, 12],
                ]),
            },
        ],
        coil: [
            {
                name: 'Lò xo tiêu chuẩn',
                tiers: tiers([
                    [1, 1800, 6000],
                    [10, 1600, 5000],
                    [100, 1400, 4000],
                ]),
            },
        ],
        labor: [
            {
                name: 'Bồi / ráp tiêu chuẩn',
                tiers: tiers([
                    [1, 3000, 6000],
                    [10, 2500, 5000],
                    [100, 2000, 4000],
                ]),
            },
        ],
        lam: [{ name: 'Cán mờ', tiers: tiers([[1, 2500, 4500]]) }],
    },
    artPapers: [{ name: 'Giấy mỹ thuật', w: 70, h: 100, cost: 5000 }],
};

export const CALENDAR_DEFAULT_INPUT = {
    n: 100,
    a: 20,
    b: 15,
    orientation: 'landscape',
    leaves: 7,
    sides: 2,
    paper: 3,
    leafW: 20,
    leafH: 15,
    leafLam: 0,
    leafColor: '4color',
    leafFilm: '',
    wrapperPrint: false,
    wrapColor: '4color',
    wrapSource: 'ream',
    wrapPaper: 0,
    wrapStock: 0,
    wrapArt: 0,
    wrapArtInput: null,
    wrapGsm: NaN,
    linerSource: 'ream',
    linerPaper: 0,
    linerStock: 0,
    linerArt: 0,
    linerArtInput: null,
    linerPrint: false,
    linerColor: '4color',
    linerLam: false,
    linerLamType: 0,
    selected: { carton: 0, coil: 0, labor: 0, lam: 0 },
    foil: false,
    molds: [{ w: 6, h: 3, impressions: 1, special: false }],
};

export const MATERIAL_LABELS = {
    carton: ['Carton lạnh', 'Vốn / tấm nguyên', 'Khách / cm² thành phẩm'],
    coil: ['Lò xo', 'Vốn / bộ', 'Khách / bộ'],
    labor: ['Công bồi / ráp', 'Vốn / cuốn', 'Khách / cuốn'],
    lam: ['Cán áo', 'Vốn / m²', 'Khách / m²'],
};
