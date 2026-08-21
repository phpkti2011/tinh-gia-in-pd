// Golden tests cho module CATALOGUE BẤM KIM (tách bìa/ruột + cán màng + đơn giá/cuốn).
//
// Khoá kết quả engine calculateCatalogue. Ví dụ: 210×297 ngang, 36 trang, bìa C300 +
// ruột C150 → tờ in 33×60.x, hệ số A4 = 3. Bìa 1 chữ ký, ruột 8 chữ ký.

import { describe, it, expect } from 'vitest';
import { calculateCatalogue } from '../../src/modules/catalogue/engine/index.js';
import { DEFAULT_CONFIG } from '../../src/modules/small-print/config/defaultConfig.js';
import { CATALOGUE_DEFAULT_CONFIG } from '../../src/modules/catalogue/config/index.js';

const config = { ...DEFAULT_CONFIG, STAPLE_CONFIG: CATALOGUE_DEFAULT_CONFIG.STAPLE_CONFIG };

// coverPaperType '3' = C300 (giấy chuẩn → adjustment 0); innerPaperType '0' = C150 (rẻ hơn → discount).
const baseParams = {
    numPages: 36,
    finishedW: 210,
    finishedH: 297,
    orientation: 'landscape',
    quantity: 100,
    coverPaperType: '3',
    innerPaperType: '0',
    laminationMode: 'none',
    printColorMode: '4color',
    artPaperPrice: 10000,
};

describe('Catalogue: calculateCatalogue (tách bìa/ruột)', () => {
    it('đơn giá in / trang (quy đổi) = tiền in ÷ tổng trang A4', () => {
        const r = calculateCatalogue(baseParams, config);
        expect(r.printPricePerPage).toBeGreaterThan(0);
        expect(r.printPricePerPage).toBeCloseTo(r.printPrice / r.totalA4Pages, 6);
    });

    it('36 trang, 100 cuốn, bìa C300 + ruột C150, không cán', () => {
        const r = calculateCatalogue(baseParams, config);
        expect(r.error).toBeNull();
        // Spread & tờ in
        expect(r.pieceW_mm).toBe(596);
        expect(r.pieceH_mm).toBe(212);
        expect(r.productsPerSheet).toBe(1);
        // Bìa 1 chữ ký → 100 tờ; Ruột 8 chữ ký → 800 tờ
        expect(r.cover.signatures).toBe(1);
        expect(r.cover.sheets).toBe(100);
        expect(r.cover.a4).toBe(600); // 3 × 100 × 2
        expect(r.inner.signatures).toBe(8);
        expect(r.inner.sheets).toBe(800);
        expect(r.inner.a4).toBe(4800); // 3 × 800 × 2
        // Gộp
        expect(r.totalPrintSheets).toBe(900);
        expect(r.totalA4Pages).toBe(5400);
        expect(r.printPrice).toBe(5400 * 1670);
        expect(r.lamCost).toBe(0);
        // C300 (bìa) chuẩn → adjustment 0; C150 (ruột) rẻ hơn → discount > 0
        expect(r.paperAdjustment).toBeGreaterThan(0);
        // Tổng cộng khớp: in − giảm giá giấy + bấm kim (lam/surcharge/art = 0)
        expect(r.totalCustomerCost).toBe(r.printPrice - r.paperAdjustment + r.stapleCustomer);
        // Đơn giá/cuốn
        expect(r.unitPerBook).toBeCloseTo(r.totalCustomerCost / 100, 6);
        // 100 cuốn → bậc 80–100 = 6.000đ/cuốn
        expect(r.stapleCustomer).toBe(6000 * 100);
    });

    it('phí bấm kim theo bậc số cuốn', () => {
        // 3 cuốn → bậc 1–5 trọn gói 50.000
        const r3 = calculateCatalogue({ ...baseParams, quantity: 3 }, config);
        expect(r3.stapleCustomer).toBe(50000);
        expect(r3.stapleUnitText).toMatch(/Trọn gói/);
        // 8 cuốn → bậc 6–10 = 9.000/cuốn → 72.000
        const r8 = calculateCatalogue({ ...baseParams, quantity: 8 }, config);
        expect(r8.stapleCustomer).toBe(9000 * 8);
        // 2000 cuốn → bậc >1000 = 4.000/cuốn (kiểm tier Infinity)
        const r2000 = calculateCatalogue({ ...baseParams, quantity: 2000 }, config);
        expect(r2000.stapleCustomer).toBe(4000 * 2000);
    });

    it('in bìa 1 mặt → số trang chia 4 dư 2, A4 bìa giảm nửa', () => {
        // numPages 34 (%4===2): bìa 2 trang (1 mặt) + ruột 32 trang (8 chữ ký)
        const r = calculateCatalogue({ ...baseParams, coverSingleSide: true, numPages: 34 }, config);
        expect(r.error).toBeNull();
        expect(r.coverSingleSide).toBe(true);
        expect(r.cover.a4).toBe(300); // 3 × 100 × 1 (nửa của 600)
        expect(r.inner.signatures).toBe(8);
        expect(r.inner.a4).toBe(4800);
        expect(r.totalA4Pages).toBe(5100);
        expect(r.printPrice).toBe(5100 * 1670);
    });

    it('in bìa 1 mặt nhưng số trang chia hết 4 → lỗi dư 2', () => {
        const r = calculateCatalogue({ ...baseParams, coverSingleSide: true, numPages: 36 }, config);
        expect(r.error).toMatch(/dư 2/);
    });

    it('in 1 màu đen → giá in giảm 20% (không dưới sàn 1.200/trang)', () => {
        const r = calculateCatalogue({ ...baseParams, printColorMode: '1color' }, config);
        expect(r.error).toBeNull();
        // tier 5400 trang: print 1670 → 1 màu = max(1670×0.8, 1200) = 1336
        expect(r.printPrice).toBe(5400 * 1336);
    });

    it('cán bìa 1 mặt → lamCost = coverA4 × tier.laminate', () => {
        const r = calculateCatalogue({ ...baseParams, laminationMode: 'cover1' }, config);
        expect(r.error).toBeNull();
        // tier 5400 A4: laminate = 250; coverA4 = 600
        expect(r.lamCost).toBe(600 * 250);
        expect(r.lamLabel).toMatch(/Bìa/);
    });

    it('cán toàn bộ → lamCost = totalA4 × tier.laminate', () => {
        const r = calculateCatalogue({ ...baseParams, laminationMode: 'all' }, config);
        expect(r.error).toBeNull();
        expect(r.lamCost).toBe(5400 * 250);
    });

    it('4 trang → chỉ bìa, không ruột', () => {
        const r = calculateCatalogue({ ...baseParams, numPages: 4 }, config);
        expect(r.error).toBeNull();
        expect(r.inner).toBeNull();
        expect(r.cover.sheets).toBe(100); // 1 chữ ký × 100 cuốn
        expect(r.totalPrintSheets).toBe(100);
    });

    it('đứng (dọc) → spread = (short*2+2) × (long+2)', () => {
        const r = calculateCatalogue({ ...baseParams, orientation: 'portrait' }, config);
        expect(r.error).toBeNull();
        expect(r.pieceW_mm).toBe(422); // 210*2+2
        expect(r.pieceH_mm).toBe(299); // 297+2
    });

    it('số trang không chia hết cho 4 → lỗi', () => {
        const r = calculateCatalogue({ ...baseParams, numPages: 35 }, config);
        expect(r.error).toMatch(/chia hết cho 4/);
    });

    it('khổ thành phẩm quá lớn → lỗi vượt khổ máy', () => {
        const r = calculateCatalogue({ ...baseParams, finishedW: 500, finishedH: 700 }, config);
        expect(r.error).toMatch(/vượt quá khổ/);
    });

    it('sách nhỏ (pps > 1) → tổng tờ in = bìa + ruột', () => {
        const r = calculateCatalogue(
            { ...baseParams, finishedW: 100, finishedH: 100, numPages: 8, quantity: 50 },
            config
        );
        expect(r.error).toBeNull();
        expect(r.productsPerSheet).toBeGreaterThan(1);
        expect(r.totalPrintSheets).toBe(r.cover.sheets + r.inner.sheets);
    });
});
