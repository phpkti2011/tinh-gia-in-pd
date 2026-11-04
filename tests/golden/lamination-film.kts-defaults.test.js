// Decal, Sổ lò xo, Catalogue, Tờ rơi, Decal giá rẻ lấy bảng màng + tiền chênh theo In KTS khổ nhỏ.
import { describe, it, expect } from 'vitest';
import {
    KTS_LAMINATION_FILMS,
    ktsLaminationFilms,
    filmRate,
    mergeKtsFilms,
} from '../../src/utils/laminationFilm';
import { CATALOGUE_DEFAULT_CONFIG } from '../../src/modules/catalogue/config/defaultConfig';
import { SPIRAL_DEFAULT_CONFIG } from '../../src/modules/spiral/config/defaultConfig';
import { FLYER_DEFAULT_CONFIG } from '../../src/modules/flyer/config/defaultConfig';
import { DECAL_DEFAULT_CONFIG } from '../../src/modules/decal/config/defaultConfig';
import { CHEAP_DECAL_DEFAULT_CONFIG } from '../../src/modules/cheapdecal/config/defaultConfig';
import {
    calculateSheetPrice,
    calculateSingleStickerPrice,
} from '../../src/modules/decal/engine/pricing';
import { resolveA4Factor } from '../../src/modules/decal/engine/pricing';

const LISTS = {
    catalogue: CATALOGUE_DEFAULT_CONFIG.LAMINATION_FILMS,
    spiral: SPIRAL_DEFAULT_CONFIG.LAMINATION_FILMS,
    flyer: FLYER_DEFAULT_CONFIG.FLYER_CONFIG.laminationFilms,
    decal: DECAL_DEFAULT_CONFIG.laminationFilms,
    cheapdecal: CHEAP_DECAL_DEFAULT_CONFIG.CHEAP_DECAL_CONFIG.laminationFilms,
};

describe('màng cán mặc định theo In KTS khổ nhỏ', () => {
    it('bảng gốc: Mờ/Bóng chênh 0 + 7 màng đặc biệt có tiền chênh', () => {
        expect(KTS_LAMINATION_FILMS).toHaveLength(9);
        const special = KTS_LAMINATION_FILMS.slice(2);
        expect(special.every((f) => Number.isFinite(f.extra) && f.extra > 0)).toBe(true);
        expect(KTS_LAMINATION_FILMS.find((f) => f.id === 'film_gg7ibm').extra).toBe(4000);
    });

    it.each(['catalogue', 'spiral', 'decal'])('%s dùng đúng bảng màng In KTS', (m) => {
        expect(LISTS[m]).toEqual(KTS_LAMINATION_FILMS);
    });

    it.each(['flyer', 'cheapdecal'])('%s chỉ có Mờ/Bóng, không chênh', (m) => {
        expect(LISTS[m]).toEqual([
            { id: 'mo', name: 'Mờ', percent: 0 },
            { id: 'bong', name: 'Bóng', percent: 0 },
        ]);
    });

    it('mỗi module có bản sao riêng — sửa không đụng hằng số gốc', () => {
        const copy = ktsLaminationFilms();
        copy[2].extra = 1;
        expect(KTS_LAMINATION_FILMS[2].extra).toBe(600);
        expect(LISTS.decal).not.toBe(LISTS.spiral);
    });

    it('Mờ/Bóng giữ nguyên giá; màng đặc biệt = giá gốc + tiền chênh', () => {
        expect(filmRate(LISTS.decal, 'mo', 500)).toBe(500);
        expect(filmRate(LISTS.decal, 'bong', 500)).toBe(500);
        expect(filmRate(LISTS.decal, 'film_jdxlxq', 500)).toBe(2100);
    });
});

describe('mergeKtsFilms — nút "Lấy giá màng theo In KTS"', () => {
    const live = [
        { id: 'mo', name: 'Mờ', percent: 0 },
        { id: 'bong', name: 'Bóng', percent: 0 },
        { id: 'film_u66cto', name: 'Màng 7 màu sọc chéo', percent: 150 },
        { id: 'film_mb5atm', name: 'màng nhung', percent: 400 },
        { id: 'riêng', name: 'Màng riêng của xưởng', percent: 20 },
    ];

    it('giữ id màng trùng tên và điền tiền chênh; thêm màng thiếu; để nguyên màng riêng', () => {
        const out = mergeKtsFilms(live);
        expect(out.find((f) => f.id === 'film_u66cto')).toEqual({
            id: 'film_u66cto',
            name: 'Màng 7 màu sọc chéo',
            percent: 150,
            extra: 600,
        });
        expect(out.find((f) => f.id === 'film_mb5atm').extra).toBe(1600);
        expect(out.find((f) => f.id === 'riêng')).toEqual(live[4]);
        // 9 màng In KTS (trùng tên không thêm lần 2) + 1 màng riêng = 10
        expect(out).toHaveLength(10);
        expect(out.filter((f) => /sọc chéo/i.test(f.name))).toHaveLength(1);
        expect(out.some((f) => f.id === 'film_gg7ibm' && f.extra === 4000)).toBe(true);
        expect(out.some((f) => 'extraCost' in f)).toBe(false);
    });

    it('không sửa mảng đầu vào; chạy lại lần 2 không đổi (idempotent)', () => {
        const snapshot = JSON.stringify(live);
        const once = mergeKtsFilms(live);
        expect(JSON.stringify(live)).toBe(snapshot);
        expect(mergeKtsFilms(once)).toEqual(once);
    });

    it('danh sách rỗng / thiếu ⇒ ra đúng bảng In KTS', () => {
        expect(mergeKtsFilms(undefined)).toEqual(KTS_LAMINATION_FILMS);
        expect(mergeKtsFilms([])).toEqual(KTS_LAMINATION_FILMS);
    });
});

describe('Decal — tiền chênh màng quy đổi theo bảng A4 của khổ tờ in (tem lẻ + bế demi)', () => {
    // 330 x 350 khai % khổ = 10 để chứng minh tiền chênh KHÔNG bị nhân thêm % này.
    const cfg = () => {
        const c = structuredClone(DECAL_DEFAULT_CONFIG);
        c.printSheetSizes = c.printSheetSizes.filter((x) => !(x.w === 330 && x.h === 350));
        c.printSheetSizes.push({
            label: '330 x 350 mm',
            w: 330,
            h: 350,
            percent: 10,
            a4Factor: 1.5,
            minPriceByMaterial: {},
            unavailableMaterials: [],
        });
        c.laminationFilms = [
            { id: 'mo', name: 'Mờ', percent: 0 },
            { id: 'nhung', name: 'Nhung', extra: 1600 },
            { id: 'cu', name: 'Cũ', percent: 300 },
        ];
        return c;
    };
    const sheet = (c, w, h, film, qty = 10) =>
        calculateSheetPrice(qty, 'Decal giấy', true, 1, 1, w, h, c, film);
    const single = (c, w, h, film, qty = 10) =>
        calculateSingleStickerPrice(qty, 'Decal giấy', true, 1, w, h, c, film);
    const demi = (c) => 1 + c.demiCutSurchargeTiers.find((t) => 1 <= t.upTo).percent / 100;

    it('resolveA4Factor: a4Factor của khổ ghi đè; không có thì tra bảng cạnh dài của KTS', () => {
        const c = cfg();
        expect(resolveA4Factor(c, 330, 330)).toBe(1.5); // a4Factor mặc định 1.5
        expect(resolveA4Factor(c, 330, 350)).toBe(1.5);
        expect(resolveA4Factor(c, 330, 480)).toBe(2.4);
        const bare = { printSheetSizes: [] };
        expect(resolveA4Factor(bare, 330, 330)).toBe(1.5); // 33 cm
        expect(resolveA4Factor(bare, 330, 350)).toBe(1.5); // 35 cm
        expect(resolveA4Factor(bare, 320, 430)).toBe(2); // 43 cm
        expect(resolveA4Factor(bare, 330, 480)).toBe(2.4); // 48 cm
        expect(resolveA4Factor(bare, 330, 400)).toBeCloseTo(40 / 21, 10); // ngoài bảng: cạnh dài / 21
        expect(resolveA4Factor(bare, 100, 150)).toBe(1); // ≤ 21,2 cm
        expect(resolveA4Factor(bare, 0, 0)).toBe(1);
        // a4Factor nhập tay thắng bảng
        expect(
            resolveA4Factor({ printSheetSizes: [{ w: 330, h: 480, a4Factor: 3 }] }, 330, 480)
        ).toBe(3);
    });

    it('bế demi khổ 330 x 350: chênh = đ/A4 × 1,5 × số tờ, không nhân % khổ giấy (10%)', () => {
        const c = cfg();
        const diff = sheet(c, 330, 350, 'nhung') - sheet(c, 330, 350, 'mo');
        expect(diff).toBeCloseTo(1600 * 1.5 * 10 * demi(c), 6);
    });

    it('tem lẻ khổ 330 x 350: cùng công thức quy đổi A4, không nhân % khổ giấy', () => {
        const c = cfg();
        const diff = single(c, 330, 350, 'nhung') - single(c, 330, 350, 'mo');
        expect(diff).toBeCloseTo(1600 * 1.5 * 10, 6);
    });

    it('khổ 330 x 480 (2,4 A4): chênh theo 2,4', () => {
        const c = cfg();
        expect(sheet(c, 330, 480, 'nhung') - sheet(c, 330, 480, 'mo')).toBeCloseTo(
            1600 * 2.4 * 10 * demi(c),
            6
        );
        expect(single(c, 330, 480, 'nhung') - single(c, 330, 480, 'mo')).toBeCloseTo(
            1600 * 2.4 * 10,
            6
        );
    });

    it('Mờ/Bóng chênh 0 ⇒ giá không đổi; màng còn tính % cũ nhân hệ số như trước', () => {
        const c = cfg();
        const noFilm = calculateSheetPrice(10, 'Decal giấy', true, 1, 1, 330, 350, c, '');
        expect(sheet(c, 330, 350, 'mo')).toBe(noFilm);
        // +300% trên tiền cán gốc (500/tờ × 10 tờ), rồi nhân % khổ 10% và % bế demi.
        expect(sheet(c, 330, 350, 'cu') - noFilm).toBeCloseTo(10 * 500 * 3 * 1.1 * demi(c), 6);
        const noFilmOne = calculateSingleStickerPrice(10, 'Decal giấy', true, 1, 330, 350, c, '');
        expect(single(c, 330, 350, 'mo')).toBe(noFilmOne);
        expect(single(c, 330, 350, 'cu') - noFilmOne).toBeCloseTo(10 * 500 * 3 * 1.1, 6);
    });
});
