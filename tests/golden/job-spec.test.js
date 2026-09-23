// Chuỗi "Copy quy cách" gửi khách — src/utils/jobSpec.js
//
// Test quan trọng nhất ở đây là CHỐNG LỘ GIÁ VỐN: catalogue/spiral trả về
// `giaVon` nằm ngay cạnh `totalCustomerCost`, đọc nhầm là gửi giá vốn cho khách.

import { describe, it, expect } from 'vitest';
import {
    buildJobSpec,
    formatVnd,
    stripPriceNote,
    cutShapeLabel,
    formatSize,
} from '../../src/utils/jobSpec.js';
import { LARGE_PRINT_DEFAULT_CONFIG } from '../../src/modules/large-print/config/defaultConfig.js';
import { DEFAULT_CONFIG as SMALL_PRINT_DEFAULT } from '../../src/modules/small-print/config/index.js';

describe('Formatter dùng chung', () => {
    it('formatVnd — dấu chấm nghìn kiểu VN', () => {
        expect(formatVnd(1250000)).toBe('1.250.000đ');
        expect(formatVnd(2500.4)).toBe('2.500đ');
        expect(formatVnd(null)).toBeNull();
        expect(formatVnd(NaN)).toBeNull();
        expect(formatVnd(Infinity)).toBeNull();
    });

    it('cutShapeLabel — vuông khi rộng = cao', () => {
        expect(cutShapeLabel(9, 5.5)).toBe('cắt thành phẩm chữ nhật');
        expect(cutShapeLabel(10, 10)).toBe('cắt thành phẩm vuông');
    });

    it('formatSize — bỏ số 0 thừa', () => {
        expect(formatSize(9, 5.5, 'cm')).toBe('9x5.5cm');
        expect(formatSize(21, 29.7, 'cm')).toBe('21x29.7cm');
        expect(formatSize(undefined, 5, 'cm')).toBeNull();
    });

    describe('stripPriceNote', () => {
        it('cắt chú thích giá trong ngoặc', () => {
            expect(stripPriceNote('Decal nhựa (+đ/nhãn)')).toBe('Decal nhựa');
            expect(stripPriceNote('Nhãn hình vuông (+10%)')).toBe('Nhãn hình vuông');
        });

        it('cắt đuôi "- giảm 35%"', () => {
            expect(stripPriceNote('In 1 mặt - giảm 35%')).toBe('In 1 mặt');
            expect(stripPriceNote('In 3-5 nội dung - cộng 10%')).toBe('In 3-5 nội dung');
        });

        it('GIỮ ngoặc mang thông tin thật (không phải giá)', () => {
            expect(stripPriceNote('Màng mờ (laminate dày)')).toBe('Màng mờ (laminate dày)');
            expect(stripPriceNote('Tờ 10 x 10 cm')).toBe('Tờ 10 x 10 cm');
        });
    });
});

describe('small-print — In KTS khổ nhỏ', () => {
    const config = {
        PAPER_STOCK_DATA: [{ name: 'Ford 100gsm' }, {}, {}, { name: 'Couche 300gsm' }],
        CUSTOM_FINISHING_TYPES: [],
        PLASTIC_LAMINATION_CONFIG: SMALL_PRINT_DEFAULT.PLASTIC_LAMINATION_CONFIG,
    };
    const params = {
        paperType: '3',
        productW: 9,
        productH: 5.5,
        productQuantity: 500,
        printSides: '2',
        laminationType: 'laminate_2',
        laminationFilm: 'mo',
        mountingType: 'none',
        creasingType: 'none',
        holePunchingType: 'none',
        dieCuttingType: 'none',
        foilStamping: 'none',
        customFinishingType: 'none',
    };
    const result = { printSides: 2, totalCustomerCost: 1250000, error: null };

    it('đúng công thức, không bế → cắt thành phẩm chữ nhật', () => {
        expect(buildJobSpec('small-print', { params, result, config })).toBe(
            '500 _ 9x5.5cm _ Couche 300gsm _ 2 mặt _ cán màng mờ 2 mặt, cắt thành phẩm chữ nhật\n' +
                'Giá: 1.250.000đ (2.500đ/cái)'
        );
    });

    it('vuông khi rộng = cao', () => {
        const out = buildJobSpec('small-print', {
            params: { ...params, productW: 10, productH: 10 },
            result,
            config,
        });
        expect(out).toContain('cắt thành phẩm vuông');
    });

    it('có bế khuôn → ghi kiểu khuôn, KHÔNG ghi "cắt thành phẩm"', () => {
        const out = buildJobSpec('small-print', {
            params: { ...params, dieCuttingType: 'mold', moldType: 'tag' },
            result,
            config,
        });
        expect(out).toContain('bế khuôn tag treo');
        expect(out).not.toContain('cắt thành phẩm');
    });

    it('gộp nhiều thành phẩm', () => {
        const out = buildJobSpec('small-print', {
            params: {
                ...params,
                mountingType: 'yes',
                creasingType: 'co_can',
                holePunchingType: '2_vi_tri',
                foilStamping: 'yes',
            },
            result,
            config,
        });
        expect(out).toContain('cán màng mờ 2 mặt, bồi 2 lớp, có cấn, đục lỗ 2 vị trí, ép kim');
    });

    it('bồi 3 lớp — nhãn riêng, đúng chỗ cũ của bồi 2 lớp', () => {
        // v1.5.0 đổi 'bồi carton' → 'bồi 2 lớp' / 'bồi 3 lớp': giờ có 2 kiểu bồi, và
        // "carton" không còn đúng vì lớp kia là tờ giấy (chọn được loại).
        const out = buildJobSpec('small-print', {
            params: { ...params, mountingType: '3_lop', creasingType: 'co_can' },
            result,
            config,
        });
        expect(out).toContain('bồi 3 lớp, có cấn');
        expect(out).not.toContain('bồi 2 lớp');
        expect(out).not.toMatch(/undefined|NaN|null/);
    });

    it('ưu tiên quote.printSides (params bị ép về 1 với decal/bồi)', () => {
        const out = buildJobSpec('small-print', {
            params: { ...params, printSides: '1' },
            result: { ...result, printSides: 2 },
            config,
        });
        expect(out).toContain(' _ 2 mặt _ ');
    });

    describe('ép plastic (1.4.0)', () => {
        it('đã chọn độ dày + khổ → ghi "ép plastic 80 mic khổ A4" ngay sau cán màng', () => {
            const out = buildJobSpec('small-print', {
                params: { ...params, plasticThickness: 'mic80', plasticSize: 'a4' },
                result,
                config,
            });
            expect(out).toContain(
                'cán màng mờ 2 mặt, ép plastic 80 mic khổ A4, cắt thành phẩm chữ nhật'
            );
        });

        it('chọn độ dày mà chưa chọn khổ → nói thẳng "(CHƯA CHỌN khổ)"', () => {
            const out = buildJobSpec('small-print', {
                params: { ...params, plasticThickness: 'mic80', plasticSize: '' },
                result,
                config,
            });
            expect(out).toContain('ép plastic 80 mic (CHƯA CHỌN khổ)');
        });

        it("'none' hoặc params cũ không có field → chuỗi y như trước", () => {
            const before = buildJobSpec('small-print', { params, result, config });
            const out = buildJobSpec('small-print', {
                params: { ...params, plasticThickness: 'none', plasticSize: '' },
                result,
                config,
            });
            expect(out).toBe(before);
            expect(out).not.toContain('ép plastic');
        });

        it('config cũ thiếu PLASTIC_LAMINATION_CONFIG → không ghi gì, không lỗi', () => {
            const cfg = { ...config };
            delete cfg.PLASTIC_LAMINATION_CONFIG;
            const out = buildJobSpec('small-print', {
                params: { ...params, plasticThickness: 'mic80', plasticSize: 'a4' },
                result,
                config: cfg,
            });
            expect(out).not.toContain('ép plastic');
            expect(out).not.toMatch(/undefined|NaN|null/);
        });
    });
});

describe('large-print — In Khổ Lớn', () => {
    const config = LARGE_PRINT_DEFAULT_CONFIG;
    const params = {
        materialTypeKey: 'hiflex',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: true,
        grommetsCheck: true,
        grommetsCount: 8,
        dieCutting: false,
        standeeKey: 'none',
    };
    const result = {
        itemDetails: [{ originalW: 200, originalH: 100, quantity: 2 }],
        totalPanels: 2,
        totalCost: 640000,
        standeeName: '',
    };

    it('không có mục "số mặt in" (khổ lớn luôn 1 mặt)', () => {
        const out = buildJobSpec('large-print', { params, result, config });
        expect(out).toBe(
            '2 tấm _ 200x100cm _ Bạt Hiflex _ dán biên, đóng 8 khoen\nGiá: 640.000đ (320.000đ/tấm)'
        );
        expect(out).not.toMatch(/\d+ mặt/);
    });

    it('nhiều loại kích thước → mỗi loại một dòng, giá ở dòng cuối', () => {
        const out = buildJobSpec('large-print', {
            params,
            result: {
                ...result,
                itemDetails: [
                    { originalW: 200, originalH: 100, quantity: 2 },
                    { originalW: 80, originalH: 180, quantity: 1 },
                ],
                totalPanels: 3,
            },
            config,
        });
        const lines = out.split('\n');
        expect(lines).toHaveLength(3);
        expect(lines[0]).toContain('2 tấm _ 200x100cm');
        expect(lines[1]).toContain('1 tấm _ 80x180cm');
        expect(lines[2]).toMatch(/^Giá: /);
    });

    // Engine bỏ tính tiền thành phẩm bị vật liệu chặn nhưng KHÔNG xoá params.
    // Không lọc thì chuỗi sẽ hứa với khách công đoạn mà xưởng không làm/không thu tiền.
    it('KHÔNG ghi thành phẩm bị vật liệu chặn', () => {
        const blocked = structuredClone(config);
        blocked.MATERIAL_TYPES.hiflex.disallowedFinishing = ['lamination', 'edgeTaping'];
        const out = buildJobSpec('large-print', {
            params: { ...params, laminationTypeKey: 'mang_mo' },
            result,
            config: blocked,
        });
        expect(out).not.toContain('cán');
        expect(out).not.toContain('dán biên');
        expect(out).toContain('đóng 8 khoen');
    });

    it('vật liệu KHÔNG chặn → có ghi cán màng', () => {
        const out = buildJobSpec('large-print', {
            params: { ...params, laminationTypeKey: 'mang_mo' },
            result,
            config,
        });
        expect(out).toContain('cán màng mờ');
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// CHỐNG LỘ GIÁ VỐN — test quan trọng nhất của tính năng này.
// ─────────────────────────────────────────────────────────────────────────────
describe('Không bao giờ lộ giá vốn cho khách', () => {
    const GIA_VON = 3333333;

    it('spiral — chỉ dùng totalCustomerCost/unitPerBook', () => {
        const out = buildJobSpec('spiral', {
            params: { quantity: 100, finishedW: 148, finishedH: 210 },
            result: {
                error: null,
                pieceW_cm: 14.8,
                pieceH_cm: 21,
                cover: { paperName: 'C300', sides: 2 },
                inner: { paperName: 'Ford 100', sides: 2 },
                lamLabel: 'Bìa cán 1 mặt',
                linerName: '',
                giaVon: GIA_VON,
                totalCustomerCost: 5500000,
                unitPerBook: 55000,
            },
        });
        expect(out).toContain('5.500.000đ');
        expect(out).toContain('55.000đ/cuốn');
        expect(out).not.toContain('3.333.333');
        expect(out).not.toContain(String(GIA_VON));
    });

    it('catalogue — chỉ dùng totalCustomerCost/unitPerBook', () => {
        const out = buildJobSpec('catalogue', {
            params: { quantity: 100, numPages: 36, finishedW: 210, finishedH: 297 },
            result: {
                error: null,
                pieceW_cm: 21,
                pieceH_cm: 29.7,
                cover: { paperName: 'C300' },
                inner: { paperName: 'C150' },
                coverSingleSide: false,
                lamLabel: 'Bìa cán 1 mặt',
                giaVon: GIA_VON,
                totalCustomerCost: 4200000,
                unitPerBook: 42000,
            },
        });
        expect(out).toContain('4.200.000đ');
        expect(out).not.toContain('3.333.333');
    });
});

describe('spiral / catalogue — nội dung quy cách', () => {
    it('spiral nêu rõ số mặt in và cán màng mấy mặt', () => {
        const out = buildJobSpec('spiral', {
            params: { quantity: 100, finishedW: 148, finishedH: 210 },
            result: {
                error: null,
                pieceW_cm: 14.8,
                pieceH_cm: 21,
                cover: { paperName: 'C300', sides: 2 },
                inner: { paperName: 'Ford 100', sides: 2 },
                lamLabel: 'Bìa cán 1 mặt + Ruột cán 2 mặt',
                totalCustomerCost: 5500000,
                unitPerBook: 55000,
            },
        });
        expect(out).toBe(
            '100 cuốn _ 14.8x21cm _ bìa C300, ruột Ford 100 _ bìa in 2 mặt, ruột in 2 mặt _ ' +
                'bìa cán 1 mặt + ruột cán 2 mặt, đóng lò xo\nGiá: 5.500.000đ (55.000đ/cuốn)'
        );
    });

    it('catalogue bìa in 1 mặt', () => {
        const out = buildJobSpec('catalogue', {
            params: { quantity: 100, numPages: 36, finishedW: 210, finishedH: 297 },
            result: {
                error: null,
                pieceW_cm: 21,
                pieceH_cm: 29.7,
                cover: { paperName: 'C300' },
                inner: { paperName: 'C150' },
                coverSingleSide: true,
                lamLabel: 'Không cán',
                totalCustomerCost: 4200000,
                unitPerBook: 42000,
            },
        });
        expect(out).toContain('bìa in 1 mặt');
        expect(out).toContain('bấm kim');
        expect(out).not.toContain('không cán');
    });
});

describe('flyer', () => {
    const base = {
        error: null,
        requiresManualQuote: false,
        sizeName: 'Kích thước A5',
        quantity: 170,
        paperName: 'Giấy C150',
        sidesName: 'In 2 mặt',
        lamination: 'yes',
        laminationFilm: 'bong',
        creasingType: '1-2',
        total: 1020000,
    };

    it('bỏ tiền tố "Kích thước"/"In", cắt đuôi giảm giá', () => {
        expect(buildJobSpec('flyer', { result: base })).toBe(
            '170 _ A5 _ Giấy C150 _ 2 mặt _ cán màng bóng, cấn 1-2 đường\nGiá: 1.020.000đ (6.000đ/tờ)'
        );
    });

    it('sidesName có đuôi "- giảm 35%" → cắt sạch', () => {
        const out = buildJobSpec('flyer', {
            result: { ...base, sidesName: 'In 1 mặt - giảm 35%' },
        });
        expect(out).toContain(' _ 1 mặt _ ');
        expect(out).not.toContain('giảm');
    });

    it('cần báo giá tay → null', () => {
        expect(
            buildJobSpec('flyer', { result: { ...base, requiresManualQuote: true } })
        ).toBeNull();
    });
});

describe('cheapdecal — cắt chú thích giá trong tên', () => {
    it('không còn (+10%) hay (+đ/nhãn)', () => {
        const out = buildJobSpec('cheapdecal', {
            result: {
                error: null,
                sizeName: '3 cm',
                quantity: 1000,
                shapeName: 'Nhãn hình vuông (+10%)',
                materialName: 'Decal nhựa (+đ/nhãn)',
                lamination: true,
                laminationFilm: 'mo',
                total: 550000,
                unitPrice: 550,
            },
        });
        expect(out).toBe(
            '1.000 _ 3 cm _ Decal nhựa _ nhãn hình vuông, cán màng mờ\nGiá: 550.000đ (550đ/cái)'
        );
        expect(out).not.toContain('%');
        expect(out).not.toContain('+');
    });
});

describe('sticker / card / uvdtf — module thiếu mục thì bỏ hẳn', () => {
    it('sticker', () => {
        expect(
            buildJobSpec('sticker', {
                result: {
                    error: null,
                    isCustomQuote: false,
                    sizeName: 'Tờ A5',
                    qty: 24,
                    finishName: 'Màng mờ (laminate dày)',
                    total: 480000,
                    unitPerSheet: 20000,
                },
            })
        ).toBe('24 tờ _ Tờ A5 _ Màng mờ (laminate dày)\nGiá: 480.000đ (20.000đ/tờ)');
    });

    it('card — không có kích thước/số mặt/thành phẩm', () => {
        expect(
            buildJobSpec('card', {
                result: {
                    error: null,
                    isContact: false,
                    productName: 'Nền nhũ',
                    qty: 100,
                    total: 1500000,
                    unit: 15000,
                },
            })
        ).toBe('100 thẻ _ Nền nhũ\nGiá: 1.500.000đ (15.000đ/thẻ)');
    });

    it('card cần liên hệ → null', () => {
        expect(buildJobSpec('card', { result: { isContact: true } })).toBeNull();
    });

    it('uvdtf — mm đổi sang cm', () => {
        expect(
            buildJobSpec('uvdtf', {
                params: { quantity: 1000 },
                result: { originalW: 50, originalH: 90, totalPrice: 2000000 },
            })
        ).toBe('1.000 tem _ 5x9cm _ UV DTF\nGiá: 2.000.000đ (2.000đ/tem)');
    });

    it('uvdtf có bế → thêm "có bế" ở cuối', () => {
        expect(
            buildJobSpec('uvdtf', {
                params: { quantity: 1000, dieCut: true },
                result: { originalW: 50, originalH: 90, totalPrice: 2000000, dieCut: true },
            })
        ).toBe('1.000 tem _ 5x9cm _ UV DTF _ có bế\nGiá: 2.000.000đ (2.000đ/tem)');
    });

    it('uvdtf không bế → KHÔNG thêm mục nào, không sinh dấu "_" thừa', () => {
        expect(
            buildJobSpec('uvdtf', {
                params: { quantity: 1000, dieCut: false },
                result: { originalW: 50, originalH: 90, totalPrice: 2000000, dieCut: false },
            })
        ).toBe('1.000 tem _ 5x9cm _ UV DTF\nGiá: 2.000.000đ (2.000đ/tem)');
    });

    it('params nói có bế nhưng result tính không bế → tin RESULT', () => {
        // App.jsx debounce 150ms: params đổi trước, result đổi sau. Quy cách gửi khách
        // phải khớp với CON SỐ đang hiện, không khớp với ô vừa bấm.
        expect(
            buildJobSpec('uvdtf', {
                params: { quantity: 1000, dieCut: true },
                result: { originalW: 50, originalH: 90, totalPrice: 2000000, dieCut: false },
            })
        ).not.toContain('có bế');
    });
});

describe('decal — copy theo từng dòng bảng giá', () => {
    const params = { stickerW: 50, stickerH: 90, shape: 'rectangle', laminationFilm: 'mo' };
    const result = { mode: 'single' };

    it('lấy đúng số lượng/giá của dòng được bấm', () => {
        const out = buildJobSpec('decal', {
            params,
            result,
            row: { quantity: 500, decalType: 'Decal giấy', laminated: true, finalPrice: 750000 },
        });
        expect(out).toBe(
            '500 con _ 50x90mm _ Decal giấy _ cán màng mờ, bế demi\n' + 'Giá: 750.000đ (1.500đ/con)'
        );
    });

    // Tem tròn chỉ có ĐƯỜNG KÍNH. Ghi "48x48mm" đã kỳ, ghi "20x48mm" (báo giá cũ
    // còn lệch W/H) thì xưởng bế sai hẳn con tem.
    describe('tem tròn ghi đường kính, không ghi WxH', () => {
        it('W = H → "Tròn 48 mm"', () => {
            const out = buildJobSpec('decal', {
                params: { ...params, shape: 'circle', stickerW: 48, stickerH: 48 },
                result,
                row: {
                    quantity: 500,
                    decalType: 'Decal giấy',
                    laminated: false,
                    finalPrice: 750000,
                },
            });
            expect(out).toContain('_ Tròn 48 mm _');
            expect(out).not.toContain('48x48');
        });

        it('báo giá cũ còn lệch 20×48 → vẫn "Tròn 48 mm" (khớp giá engine đang tính)', () => {
            const out = buildJobSpec('decal', {
                params: { ...params, shape: 'circle', stickerW: 20, stickerH: 48 },
                result,
                row: {
                    quantity: 500,
                    decalType: 'Decal giấy',
                    laminated: false,
                    finalPrice: 750000,
                },
            });
            expect(out).toContain('_ Tròn 48 mm _');
            expect(out).not.toContain('20x48');
        });

        it('chữ nhật và oval vẫn ghi WxH như cũ', () => {
            for (const shape of ['rectangle', 'oval']) {
                const out = buildJobSpec('decal', {
                    params: { ...params, shape },
                    result,
                    row: {
                        quantity: 500,
                        decalType: 'Decal giấy',
                        laminated: false,
                        finalPrice: 750000,
                    },
                });
                expect(out, shape).toContain('50x90mm');
                expect(out, shape).not.toContain('Tròn');
            }
        });
    });

    // Module này vốn LUÔN bế demi. Câu "cắt thành phẩm chữ nhật/vuông" nghĩa là
    // chỉ xén thẳng — gửi xuống xưởng là sai hẳn công đoạn.
    it('mọi hình dạng đều chỉ ghi "bế demi", không nêu hình', () => {
        for (const shape of ['rectangle', 'circle', 'oval']) {
            const out = buildJobSpec('decal', {
                params: { ...params, shape },
                result,
                row: {
                    quantity: 500,
                    decalType: 'Decal nhựa',
                    laminated: false,
                    finalPrice: 750000,
                },
            });
            expect(out, shape).toContain('bế demi');
            expect(out, shape).not.toContain('cắt thành phẩm');
            expect(out, shape).not.toContain('bế tròn');
            expect(out, shape).not.toContain('bế oval');
        }
    });

    // Tem vuông cũng KHÔNG tự đổi câu chữ — nhân viên chọn hình nào là hình đó.
    it('tem vuông vẫn chỉ ghi "bế demi"', () => {
        const out = buildJobSpec('decal', {
            params: { ...params, stickerW: 50, stickerH: 50 },
            result,
            row: { quantity: 500, decalType: 'Decal giấy', laminated: false, finalPrice: 750000 },
        });
        expect(out).toContain('bế demi');
        expect(out).not.toContain('vuông');
    });
});

describe('Chưa có kết quả hợp lệ → null (nút tự ẩn)', () => {
    it('module lạ / ctx rỗng', () => {
        expect(buildJobSpec('khong-co-that', { result: {} })).toBeNull();
        expect(buildJobSpec('flyer', null)).toBeNull();
    });

    it('result null hoặc có error', () => {
        expect(buildJobSpec('flyer', { result: null })).toBeNull();
        expect(buildJobSpec('flyer', { result: { error: 'Số lượng tối thiểu 100' } })).toBeNull();
        expect(buildJobSpec('large-print', { params: {}, result: { itemDetails: [] } })).toBeNull();
    });

    it('không bao giờ lọt undefined/NaN vào chuỗi gửi khách', () => {
        const out = buildJobSpec('flyer', {
            result: {
                error: null,
                sizeName: 'Kích thước A5',
                quantity: 170,
                paperName: undefined,
                sidesName: 'In 2 mặt',
                lamination: 'none',
                creasingType: 'none',
                total: 1020000,
            },
        });
        // paperName thiếu → mục đó bị bỏ, KHÔNG sinh "_ _" rỗng
        expect(out).not.toContain('undefined');
        expect(out).not.toContain('_  _');
        expect(out).toBe('170 _ A5 _ 2 mặt\nGiá: 1.020.000đ (6.000đ/tờ)');
    });
});

// Ca người dùng nêu: "không để giá 568.500, từ 500 trở lên làm tròn lên 1.000".
// Chốt kèm theo: CHỈ tổng mới tròn, đơn giá trong ngoặc vẫn giữ số lẻ.
describe('Dòng Giá — tổng tròn nghìn, đơn giá giữ số lẻ', () => {
    const decalCtx = (finalPrice, quantity) => ({
        params: { stickerW: 50, stickerH: 90, shape: 'rectangle' },
        result: { mode: 'single' },
        row: { quantity, decalType: 'Decal giấy', laminated: false, finalPrice },
    });

    it('568.500 → 569.000đ, đơn giá lẻ 568,5đ/con vẫn hiện thật', () => {
        // 568.500 / 1.000 con = 568,5đ/con → formatVnd làm tròn đồng thành 569đ,
        // KHÔNG bị kéo lên 1.000đ. Đây là điểm dễ làm sai nhất.
        const out = buildJobSpec('decal', decalCtx(568500, 1000));
        expect(out).toContain('Giá: 569.000đ');
        expect(out).toContain('(569đ/con)');
        expect(out).not.toContain('568.500');
    });

    it('đuôi dưới 500 thì tổng xuống', () => {
        const out = buildJobSpec('decal', decalCtx(568400, 1000));
        expect(out).toContain('Giá: 568.000đ');
    });

    it('tổng đã tròn thì giữ nguyên — các ca cũ không đổi', () => {
        const out = buildJobSpec('decal', decalCtx(570000, 1000));
        expect(out).toContain('Giá: 570.000đ (570đ/con)');
    });
});

// Ca người dùng nêu ở Catalogue: tổng hiện 480.000đ nhưng đơn giá ghi 160.133đ/cuốn
// cho 3 cuốn — lấy con số trong CHÍNH chuỗi này chia cho số lượng phải ra đúng đơn
// giá đang ghi. Trước đây đơn giá chia từ tổng THẬT nên lệch.
//
// ⚠ Mọi fixture ở các describe trên đều có tổng chia hết 1.000 nên KHÔNG bắt được
// lỗi này — đó là lý do phải có riêng khối dưới với tổng lẻ.
describe('Dòng Giá — đơn giá "chia đều" = TỔNG ĐÃ TRÒN ÷ số lượng', () => {
    const bookResult = (total) => ({
        error: null,
        cover: { paperName: 'C300', sides: 2 },
        inner: { paperName: 'C150', sides: 2 },
        coverSingleSide: false,
        lamLabel: 'Không cán',
        totalCustomerCost: total,
        // Đơn giá THẬT do engine trả về — cố ý để lệch, builder phải bỏ qua nó.
        unitPerBook: total / 3,
    });
    const bookParams = { quantity: 3, numPages: 16, finishedW: 210, finishedH: 297 };

    it('catalogue — 480.400đ / 3 cuốn → "480.000đ (160.000đ/cuốn)", không còn 160.133đ', () => {
        const out = buildJobSpec('catalogue', { params: bookParams, result: bookResult(480400) });
        expect(out).toContain('Giá: 480.000đ (160.000đ/cuốn)');
        expect(out).not.toContain('160.133');
    });

    it('spiral — cùng luật', () => {
        const out = buildJobSpec('spiral', {
            params: bookParams,
            result: { ...bookResult(480400), linerName: '' },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/cuốn)');
        expect(out).not.toContain('160.133');
    });

    it('small-print — 480.400đ / 3 cái', () => {
        const out = buildJobSpec('small-print', {
            params: {
                paperType: '3',
                productW: 9,
                productH: 5.5,
                productQuantity: 3,
                printSides: '2',
                laminationType: 'none',
                mountingType: 'none',
                creasingType: 'none',
                holePunchingType: 'none',
                dieCuttingType: 'none',
                foilStamping: 'none',
                customFinishingType: 'none',
            },
            result: { printSides: 2, totalCustomerCost: 480400, error: null },
            config: { PAPER_STOCK_DATA: [{}, {}, {}, { name: 'Couche 300gsm' }] },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/cái)');
    });

    it('flyer — 480.400đ / 3 tờ', () => {
        const out = buildJobSpec('flyer', {
            result: {
                error: null,
                requiresManualQuote: false,
                sizeName: 'Kích thước A5',
                quantity: 3,
                paperName: 'Giấy C150',
                sidesName: 'In 2 mặt',
                lamination: 'no',
                creasingType: 'none',
                total: 480400,
            },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/tờ)');
    });

    it('cheapdecal — 480.400đ / 3 cái', () => {
        const out = buildJobSpec('cheapdecal', {
            result: {
                error: null,
                sizeName: '3x3 cm',
                quantity: 3,
                materialName: 'Decal giấy',
                shapeName: 'Tròn',
                lamination: false,
                total: 480400,
                unitPrice: 480400 / 3,
            },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/cái)');
    });

    it('sticker — chia theo SỐ TỜ TÍNH TIỀN', () => {
        const out = buildJobSpec('sticker', {
            result: {
                error: null,
                sizeName: 'Tờ sticker A5',
                finishName: 'Không',
                qty: 3,
                billableQty: 3,
                total: 480400,
                unitPerSheet: 480400 / 3,
            },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/tờ)');
    });

    it('uvdtf — 480.400đ / 3 tem', () => {
        const out = buildJobSpec('uvdtf', {
            params: { quantity: 3 },
            result: { error: null, originalW: 50, originalH: 90, totalPrice: 480400 },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/tem)');
    });

    it('large-print — chia theo số tấm', () => {
        const out = buildJobSpec('large-print', {
            params: { materialTypeKey: 'hiflex' },
            result: {
                totalCost: 480400,
                totalPanels: 3,
                itemDetails: [{ quantity: 3, originalW: 100, originalH: 200 }],
            },
            config: { MATERIAL_TYPES: { hiflex: { name: 'Bạt Hiflex' } } },
        });
        expect(out).toContain('Giá: 480.000đ (160.000đ/tấm)');
    });

    it('NGOẠI LỆ — thẻ nhựa giữ ĐƠN GIÁ GỐC theo mốc SL, không chia lại', () => {
        // total = unit × qty do engine tính ngược. Chia lại từ tổng đã tròn sẽ bịa
        // ra đơn giá tiệm không niêm yết (160.133 → 160.000).
        const out = buildJobSpec('card', {
            result: {
                error: null,
                isContact: false,
                productName: 'Thẻ nhựa trắng',
                qty: 3,
                unit: 160133.33,
                total: 480400,
            },
        });
        expect(out).toContain('Giá: 480.000đ (160.133đ/thẻ)');
    });
});
