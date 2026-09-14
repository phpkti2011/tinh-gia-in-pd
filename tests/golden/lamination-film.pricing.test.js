// Loại màng cán ảnh hưởng GIÁ như thế nào — chạy engine thật của 6 module.
//
// Điều quan trọng nhất được khoá ở đây: mặc định Mờ/Bóng 0% và trạng thái CHƯA
// CHỌN đều KHÔNG làm đổi một đồng nào. Đó là lý do 128 golden test khoá giá cũ
// vẫn xanh sau khi thêm tính năng này.

import { describe, it, expect } from 'vitest';

import { calculateFlyer } from '../../src/modules/flyer/engine/index.js';
import { FLYER_DEFAULT_CONFIG } from '../../src/modules/flyer/config/index.js';
import { calculateCheapDecal } from '../../src/modules/cheapdecal/engine/index.js';
import { CHEAP_DECAL_DEFAULT_CONFIG } from '../../src/modules/cheapdecal/config/index.js';
import { calculateCatalogue } from '../../src/modules/catalogue/engine/index.js';
import { CATALOGUE_DEFAULT_CONFIG } from '../../src/modules/catalogue/config/index.js';
import { calculateSpiral } from '../../src/modules/spiral/engine/index.js';
import { SPIRAL_DEFAULT_CONFIG } from '../../src/modules/spiral/config/index.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/index.js';
import { calculateSingleStickerPrice } from '../../src/modules/decal/engine/index.js';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/index.js';

const SOFT = { id: 'soft', name: 'Soft-touch', percent: 30 };

// ─────────────────────────────────────────────────────────────────────────────
// flyer
// ─────────────────────────────────────────────────────────────────────────────
describe('flyer', () => {
    const base = {
        size: 'A5',
        quantity: 200,
        paper: 'C150',
        sides: '2',
        lamination: 'yes',
        creasing: 'none',
        contents: '1-2',
    };
    const cfg = FLYER_DEFAULT_CONFIG;

    it('chưa chọn / Mờ / Bóng đều ra CÙNG một giá', () => {
        const a = calculateFlyer(base, cfg).total;
        const b = calculateFlyer({ ...base, laminationFilm: 'mo' }, cfg).total;
        const c = calculateFlyer({ ...base, laminationFilm: 'bong' }, cfg).total;
        expect(b).toBe(a);
        expect(c).toBe(a);
    });

    it('Soft-touch 30% → tiền cán màng × 1.3, phần còn lại không đổi', () => {
        const withSoft = structuredClone(cfg);
        withSoft.FLYER_CONFIG.laminationFilms = [...withSoft.FLYER_CONFIG.laminationFilms, SOFT];
        const plain = calculateFlyer({ ...base, laminationFilm: 'mo' }, withSoft);
        const soft = calculateFlyer({ ...base, laminationFilm: 'soft' }, withSoft);

        expect(soft.laminationFee).toBeCloseTo(plain.laminationFee * 1.3, 6);
        expect(soft.total - plain.total).toBeCloseTo(plain.laminationFee * 0.3, 6);
    });

    it('không cán màng → loại màng không ảnh hưởng gì', () => {
        const withSoft = structuredClone(cfg);
        withSoft.FLYER_CONFIG.laminationFilms = [...withSoft.FLYER_CONFIG.laminationFilms, SOFT];
        const a = calculateFlyer({ ...base, lamination: 'none' }, withSoft).total;
        const b = calculateFlyer(
            { ...base, lamination: 'none', laminationFilm: 'soft' },
            withSoft
        ).total;
        expect(b).toBe(a);
    });

    it('config cũ chưa có danh sách loại màng → giá không đổi', () => {
        const legacy = structuredClone(cfg);
        delete legacy.FLYER_CONFIG.laminationFilms;
        expect(calculateFlyer({ ...base, laminationFilm: 'mo' }, legacy).total).toBe(
            calculateFlyer(base, cfg).total
        );
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// cheapdecal
// ─────────────────────────────────────────────────────────────────────────────
describe('cheapdecal', () => {
    const base = {
        size: '1',
        quantity: 1000,
        shape: 'round',
        material: 'paper',
        lamination: 'yes',
        rush: 'no',
    };
    const cfg = CHEAP_DECAL_DEFAULT_CONFIG;

    it('chưa chọn và Mờ đều giữ nguyên giá', () => {
        const a = calculateCheapDecal(base, cfg).total;
        expect(calculateCheapDecal({ ...base, laminationFilm: 'mo' }, cfg).total).toBe(a);
    });

    it('Soft-touch 30% → phí cán màng × 1.3', () => {
        const c2 = structuredClone(cfg);
        c2.CHEAP_DECAL_CONFIG.laminationFilms = [...c2.CHEAP_DECAL_CONFIG.laminationFilms, SOFT];
        const plain = calculateCheapDecal({ ...base, laminationFilm: 'mo' }, c2);
        const soft = calculateCheapDecal({ ...base, laminationFilm: 'soft' }, c2);
        expect(soft.laminationFee).toBeCloseTo(plain.laminationFee * 1.3, 6);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// decal
// ─────────────────────────────────────────────────────────────────────────────
describe('decal', () => {
    const args = [500, 'Decal giấy', true, 15, 330, 330];

    it('chưa chọn và Mờ đều giữ nguyên giá', () => {
        const a = calculateSingleStickerPrice(...args, DECAL_DEFAULT_CONFIG);
        const b = calculateSingleStickerPrice(...args, DECAL_DEFAULT_CONFIG, 'mo');
        expect(b).toBe(a);
    });

    it('Soft-touch 30% chỉ cộng trên PHẦN CÁN MÀNG, không phải cả tờ', () => {
        const cfg = structuredClone(DECAL_DEFAULT_CONFIG);
        cfg.laminationFilms = [...cfg.laminationFilms, SOFT];
        const noLam = calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, cfg);
        const lam = calculateSingleStickerPrice(...args, cfg, 'mo');
        const soft = calculateSingleStickerPrice(...args, cfg, 'soft');
        // chênh lệch đúng bằng 30% của riêng phần cán màng
        expect(soft - lam).toBeCloseTo((lam - noLam) * 0.3, 6);
    });

    it('không cán màng → loại màng vô hiệu', () => {
        const cfg = structuredClone(DECAL_DEFAULT_CONFIG);
        cfg.laminationFilms = [...cfg.laminationFilms, SOFT];
        const a = calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, cfg);
        const b = calculateSingleStickerPrice(500, 'Decal giấy', false, 15, 330, 330, cfg, 'soft');
        expect(b).toBe(a);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// spiral — chọn RIÊNG bìa và ruột
// ─────────────────────────────────────────────────────────────────────────────
describe('spiral — bìa và ruột chọn riêng', () => {
    const cfgOf = (films) => {
        const c = { ...DEFAULT_CONFIG, SPIRAL_CONFIG: SPIRAL_DEFAULT_CONFIG.SPIRAL_CONFIG };
        c.LAMINATION_FILMS = films || SPIRAL_DEFAULT_CONFIG.LAMINATION_FILMS;
        return c;
    };
    const base = {
        numPages: 96,
        finishedW: 148,
        finishedH: 210,
        quantity: 100,
        coverPaperType: '3',
        innerPaperType: '0',
        coverSides: '2',
        innerSides: '2',
        coverColorMode: '4color',
        innerColorMode: '4color',
        coverLam: '1',
        innerLam: '1',
        linerType: '',
        artPaperPrice: 10000,
    };

    it('chưa chọn → giá y hệt', () => {
        const a = calculateSpiral(base, cfgOf()).lamCost;
        const b = calculateSpiral(
            { ...base, coverLamFilm: 'mo', innerLamFilm: 'bong' },
            cfgOf()
        ).lamCost;
        expect(b).toBeCloseTo(a, 6);
    });

    it('CHỈ ruột dùng Soft-touch → chỉ phần ruột tăng 30%', () => {
        const films = [...SPIRAL_DEFAULT_CONFIG.LAMINATION_FILMS, SOFT];
        const plain = calculateSpiral(
            { ...base, coverLamFilm: 'mo', innerLamFilm: 'mo' },
            cfgOf(films)
        );
        const mixed = calculateSpiral(
            { ...base, coverLamFilm: 'mo', innerLamFilm: 'soft' },
            cfgOf(films)
        );
        // phần bìa và phần ruột tách được từ số trang A4 của mỗi phần
        const rate = plain.lamCost / (plain.coverA4 + plain.innerA4);
        expect(mixed.lamCost - plain.lamCost).toBeCloseTo(plain.innerA4 * rate * 0.3, 4);
    });

    it('nhãn ghi rõ loại màng của từng phần', () => {
        const r = calculateSpiral({ ...base, coverLamFilm: 'mo', innerLamFilm: 'bong' }, cfgOf());
        expect(r.lamLabel).toBe('Bìa cán mờ 1 mặt + Ruột cán bóng 1 mặt');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// catalogue — chọn RIÊNG bìa và ruột
// ─────────────────────────────────────────────────────────────────────────────
describe('catalogue — bìa và ruột chọn riêng', () => {
    const cfgOf = (films) => ({
        ...DEFAULT_CONFIG,
        STAPLE_CONFIG: CATALOGUE_DEFAULT_CONFIG.STAPLE_CONFIG,
        LAMINATION_FILMS: films || CATALOGUE_DEFAULT_CONFIG.LAMINATION_FILMS,
    });
    const base = {
        numPages: 36,
        finishedW: 210,
        finishedH: 297,
        orientation: 'portrait',
        quantity: 100,
        coverPaperType: '3',
        innerPaperType: '0',
        laminationMode: 'all',
        coverSingleSide: false,
        printColorMode: '4color',
        artPaperPrice: 10000,
    };

    it('chưa chọn → giá y hệt', () => {
        const a = calculateCatalogue(base, cfgOf()).lamCost;
        const b = calculateCatalogue(
            { ...base, coverLamFilm: 'mo', innerLamFilm: 'mo' },
            cfgOf()
        ).lamCost;
        expect(b).toBeCloseTo(a, 6);
    });

    it('cán toàn bộ, CHỈ ruột Soft-touch → chỉ phần ruột tăng', () => {
        const films = [...CATALOGUE_DEFAULT_CONFIG.LAMINATION_FILMS, SOFT];
        const plain = calculateCatalogue(
            { ...base, coverLamFilm: 'mo', innerLamFilm: 'mo' },
            cfgOf(films)
        );
        const mixed = calculateCatalogue(
            { ...base, coverLamFilm: 'mo', innerLamFilm: 'soft' },
            cfgOf(films)
        );
        const rate = plain.lamCost / (plain.coverA4 + plain.innerA4);
        expect(mixed.lamCost - plain.lamCost).toBeCloseTo(plain.innerA4 * rate * 0.3, 4);
    });

    it('bìa cán 1 mặt: nhãn ghi loại màng bìa', () => {
        const r = calculateCatalogue(
            { ...base, laminationMode: 'cover1', coverLamFilm: 'bong' },
            cfgOf()
        );
        expect(r.lamLabel).toBe('Bìa cán bóng 1 mặt');
    });
});
