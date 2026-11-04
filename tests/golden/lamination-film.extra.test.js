// Loại màng phụ thu bằng TIỀN CHÊNH (11/2026) — thay cho % nhân theo bậc.
//
// Giá màng đặc biệt = giá Mờ/Bóng (tra bậc như cũ) + chênh mỗi đơn vị. Điều cốt lõi được
// khoá ở đây: chênh giữa màng đặc biệt và Mờ KHÔNG đổi theo bậc số lượng (khác %), và màng
// cũ chưa nhập tiền chênh vẫn tính % y như trước.

import { describe, it, expect } from 'vitest';

import {
    filmRate,
    filmExtra,
    filmPerUnit,
    filmLumpSum,
    filmUsesExtra,
} from '../../src/utils/laminationFilm.js';
import { calculateCustomerQuote } from '../../src/modules/small-print/engine/quote.js';
import { calculateLamination } from '../../src/modules/small-print/engine/finishing.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';
import { validateSmallPrintConfig as validateSmallPrint } from '../../src/modules/small-print/config/schema.js';
import { calculateFlyer } from '../../src/modules/flyer/engine/index.js';
import { FLYER_DEFAULT_CONFIG } from '../../src/modules/flyer/config/index.js';
import { calculateCheapDecal } from '../../src/modules/cheapdecal/engine/index.js';
import { CHEAP_DECAL_DEFAULT_CONFIG } from '../../src/modules/cheapdecal/config/index.js';
import { calculateCatalogue } from '../../src/modules/catalogue/engine/index.js';
import { CATALOGUE_DEFAULT_CONFIG } from '../../src/modules/catalogue/config/index.js';
import { calculateSpiral } from '../../src/modules/spiral/engine/index.js';
import { SPIRAL_DEFAULT_CONFIG } from '../../src/modules/spiral/config/index.js';
import { calculateSingleStickerPrice } from '../../src/modules/decal/engine/index.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/index.js';

const MO = { id: 'mo', name: 'Mờ', percent: 0 };
const BONG = { id: 'bong', name: 'Bóng', percent: 0 };
// Màng 7 màu: còn % cũ 150 nhưng đã nhập tiền chênh ⇒ % bị bỏ qua.
const SEVEN = { id: 'seven', name: 'Màng 7 màu', percent: 150, extra: 1000, extraCost: 300 };
// Màng cũ chưa nhập tiền chênh ⇒ vẫn tính %.
const LEGACY = { id: 'legacy', name: 'Kim tuyến', percent: 300 };
const FILMS = [MO, BONG, SEVEN, LEGACY];

describe('filmRate / filmPerUnit / filmLumpSum', () => {
    it('tiền chênh: cộng thẳng, bỏ qua %', () => {
        expect(filmUsesExtra(SEVEN)).toBe(true);
        expect(filmRate(FILMS, 'seven', 1000)).toBe(2000);
        expect(filmRate(FILMS, 'seven', 250)).toBe(1250);
        expect(filmRate(FILMS, 'seven', 2200, 'extraCost')).toBe(2500);
        expect(filmPerUnit(FILMS, 'seven', 100, 1000)).toBe(200000);
        expect(filmLumpSum(FILMS, 'seven', 50000, 12)).toBe(62000);
        expect(filmExtra(FILMS, 'seven')).toBe(1000);
    });

    it('màng cũ chỉ có % ⇒ nhân hệ số như trước', () => {
        expect(filmUsesExtra(LEGACY)).toBe(false);
        expect(filmRate(FILMS, 'legacy', 1000)).toBe(4000);
        expect(filmPerUnit(FILMS, 'legacy', 100, 1000)).toBe(400000);
        expect(filmLumpSum(FILMS, 'legacy', 50000, 12)).toBe(200000);
        expect(filmExtra(FILMS, 'legacy')).toBe(0);
    });

    it('chưa chọn / id lạ / Mờ ⇒ đơn giá gốc', () => {
        for (const id of ['', undefined, 'khong-co', 'mo']) {
            expect(filmRate(FILMS, id, 1000)).toBe(1000);
            expect(filmPerUnit(FILMS, id, 100, 1000)).toBe(100000);
        }
    });

    it('extra không phải số hữu hạn ⇒ coi như chưa nhập (về %)', () => {
        const odd = [{ id: 'x', name: 'X', percent: 50, extra: null }];
        expect(filmUsesExtra(odd[0])).toBe(false);
        expect(filmRate(odd, 'x', 1000)).toBe(1500);
    });

    it('chế độ tiền chênh mà thiếu extraCost ⇒ chênh vốn 0', () => {
        const f = [{ id: 'x', name: 'X', extra: 500 }];
        expect(filmRate(f, 'x', 2200, 'extraCost')).toBe(2200);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// In KTS khổ nhỏ — báo khách (quote.js) + giá vốn (finishing.js)
// ─────────────────────────────────────────────────────────────────────────────
describe('In KTS khổ nhỏ', () => {
    const cfg = { ...DEFAULT_CONFIG, LAMINATION_FILMS: FILMS };
    // 1 sản phẩm = 1 trang A4 vật lý ⇒ số trang A4 = số lượng, dễ đối chiếu bậc.
    const best = {
        cutSheetH: 29.7,
        cutSheetSize: 'A4',
        a4Factor: 1,
        numCuttableSheets: 1,
        productsPerSheet: 1,
        printer: 'C2060',
    };
    const lam = (qty, film, laminationType = 'laminate_1', printSides = 1) =>
        calculateCustomerQuote(
            best,
            {
                productQuantity: qty,
                printSides,
                laminationType,
                laminationFilm: film,
                printContents: 1,
                printColorMode: '4color',
                variableData: 'no',
                paperType: 3, // C300 = giấy chuẩn ⇒ không có chênh giấy
                artPaperPrice: 0,
            },
            { holePunching: 0, creasing: 0, mounting: 0 },
            { moldCost: 0, laborCustomerPrice: 0 },
            null,
            cfg
        ).totalLaminationCost;

    it('ví dụ đã chốt: 100 trang, Mờ 100.000đ, 7 màu (chênh 1.000đ/trang) 200.000đ', () => {
        expect(lam(100, 'mo')).toBe(100000);
        expect(lam(100, 'seven')).toBe(200000);
    });

    it('chênh với Mờ = 1.000đ × số trang ở MỌI bậc (khác %)', () => {
        // 5 trang (8.000đ/trang), 100 trang (1.000đ), 1.500 trang (250đ)
        for (const qty of [5, 100, 1500]) {
            expect(lam(qty, 'seven') - lam(qty, 'mo')).toBe(1000 * qty);
        }
    });

    it('cán 2 mặt ⇒ chênh nhân 2', () => {
        expect(lam(100, 'seven', 'laminate_2') - lam(100, 'mo', 'laminate_2')).toBe(200000);
    });

    it('bậc trọn gói (11–15 trang): phí gói + chênh × số trang', () => {
        // bậc 11–15: laminate 50.000 trọn gói
        expect(lam(12, 'mo')).toBe(50000);
        expect(lam(12, 'seven')).toBe(50000 + 1000 * 12);
    });

    it('màng % cũ vẫn nhân hệ số như trước (kim tuyến 300% ⇒ ×4)', () => {
        expect(lam(100, 'legacy')).toBe(400000);
        expect(lam(12, 'legacy')).toBe(200000);
    });

    it('giá vốn: + extraCost đ/m dài màng mỗi mặt; màng % cũ nhân hệ số', () => {
        const meters = 29.7 / 100;
        const cost = (film, type = 'laminate_1') =>
            calculateLamination(29.7, 21, 1, type, cfg, film).costPerSheet;
        expect(cost('mo')).toBeCloseTo(meters * 2200, 9);
        expect(cost('seven')).toBeCloseTo(meters * 2500, 9);
        expect(cost('seven', 'laminate_2')).toBeCloseTo(meters * 2500 * 2, 9);
        expect(cost('legacy')).toBeCloseTo(meters * 2200 * 4, 9);
    });

    it('schema nhận extra/extraCost là số, loại kiểu sai', () => {
        expect(validateSmallPrint(cfg).isValid).toBe(true);
        const bad = { ...cfg, LAMINATION_FILMS: [{ id: 'x', name: 'X', extra: '1000' }] };
        const v = validateSmallPrint(bad);
        expect(v.isValid).toBe(false);
        expect(v.errors.join('\n')).toContain('LAMINATION_FILMS[0].extra');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Catalogue / Sổ lò xo — đ/trang A4
// ─────────────────────────────────────────────────────────────────────────────
describe('catalogue', () => {
    const cfgOf = () => ({
        ...DEFAULT_CONFIG,
        STAPLE_CONFIG: CATALOGUE_DEFAULT_CONFIG.STAPLE_CONFIG,
        LAMINATION_FILMS: FILMS,
    });
    const base = {
        numPages: 36,
        finishedW: 210,
        finishedH: 297,
        orientation: 'portrait',
        coverPaperType: '3',
        innerPaperType: '0',
        laminationMode: 'all',
        coverSingleSide: false,
        printColorMode: '4color',
        artPaperPrice: 10000,
        coverLamFilm: 'mo',
    };

    it('ruột 7 màu: chênh = 1.000đ × trang A4 ruột, ở 2 số lượng khác bậc', () => {
        for (const quantity of [5, 300]) {
            const plain = calculateCatalogue({ ...base, quantity, innerLamFilm: 'mo' }, cfgOf());
            const seven = calculateCatalogue({ ...base, quantity, innerLamFilm: 'seven' }, cfgOf());
            expect(seven.lamCost - plain.lamCost).toBeCloseTo(1000 * plain.innerA4, 6);
        }
    });
});

describe('spiral', () => {
    const cfgOf = () => ({
        ...DEFAULT_CONFIG,
        SPIRAL_CONFIG: SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG,
        LAMINATION_FILMS: FILMS,
    });
    const base = {
        numPages: 96,
        finishedW: 148,
        finishedH: 210,
        coverPaperType: '3',
        innerPaperType: '0',
        coverSides: '2',
        innerSides: '2',
        coverColorMode: '4color',
        innerColorMode: '4color',
        coverLam: '2',
        innerLam: '0',
        linerType: '',
        artPaperPrice: 10000,
        innerLamFilm: 'mo',
    };

    it('bìa 7 màu cán 2 mặt: chênh = 1.000đ × trang A4 bìa × 2, ở 2 số lượng', () => {
        for (const quantity of [3, 200]) {
            const plain = calculateSpiral({ ...base, quantity, coverLamFilm: 'mo' }, cfgOf());
            const seven = calculateSpiral({ ...base, quantity, coverLamFilm: 'seven' }, cfgOf());
            expect(seven.lamCost - plain.lamCost).toBeCloseTo(1000 * plain.coverA4 * 2, 6);
        }
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tờ rơi (đ/tờ) · Decal nhãn giá rẻ (đ/cái) · Decal (đ/tờ in)
// ─────────────────────────────────────────────────────────────────────────────
describe('flyer', () => {
    const cfg = structuredClone(FLYER_DEFAULT_CONFIG);
    cfg.FLYER_CONFIG.laminationFilms = FILMS;
    const base = {
        size: 'A5',
        paper: 'C150',
        sides: '2',
        lamination: 'yes',
        creasing: 'none',
        contents: '1-2',
    };

    it('chênh = 1.000đ × số tờ', () => {
        for (const quantity of [200, 1000]) {
            const plain = calculateFlyer({ ...base, quantity, laminationFilm: 'mo' }, cfg);
            const seven = calculateFlyer({ ...base, quantity, laminationFilm: 'seven' }, cfg);
            expect(seven.laminationFee - plain.laminationFee).toBe(1000 * quantity);
        }
    });
});

describe('cheapdecal', () => {
    const cfg = structuredClone(CHEAP_DECAL_DEFAULT_CONFIG);
    cfg.CHEAP_DECAL_CONFIG.laminationFilms = FILMS;
    const base = { size: '1', shape: 'round', material: 'paper', lamination: 'yes', rush: 'no' };

    it('chênh = 1.000đ × số cái', () => {
        for (const quantity of [500, 2000]) {
            const plain = calculateCheapDecal({ ...base, quantity, laminationFilm: 'mo' }, cfg);
            const seven = calculateCheapDecal({ ...base, quantity, laminationFilm: 'seven' }, cfg);
            expect(seven.laminationFee - plain.laminationFee).toBe(1000 * quantity);
        }
    });
});

describe('decal', () => {
    it('chênh (đ/trang A4) × quy đổi A4 của khổ tờ in, cộng sau % khổ giấy', () => {
        const cfg = structuredClone(DECAL_DEFAULT_CONFIG);
        cfg.laminationFilms = FILMS;
        const sheets = Math.ceil(500 / 15);
        const args = [500, 'Decal giấy', true, 15, 330, 330, cfg];
        const plain = calculateSingleStickerPrice(...args, 'mo');
        const seven = calculateSingleStickerPrice(...args, 'seven');
        // Khổ 330 x 330 mặc định quy đổi 1,5 A4 ⇒ mỗi tờ in chênh 1.000 × 1,5.
        expect(seven - plain).toBeCloseTo(1000 * 1.5 * sheets, 6);
    });
});
