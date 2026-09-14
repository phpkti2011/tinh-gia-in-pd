import { describe, it, expect } from 'vitest';
import {
    MODULE_VISIBILITY_DEFAULT_CONFIG,
    MODULE_VISIBILITY_DEFAULT_LABELS,
    LABEL_MAX_LEN,
    LABEL_FIELDS,
    validateModuleVisibilityConfig,
    mergeModuleLabels,
} from '../../src/config/moduleVisibilityConfig';

const MODULE_IDS = [
    'small',
    'large',
    'decal',
    'uvdtf',
    'catalogue',
    'spiral',
    'sticker',
    'card',
    'flyer',
    'cheapdecal',
];

describe('Module visibility config', () => {
    it('default pass validation + đủ 10 module = true', () => {
        const v = validateModuleVisibilityConfig(MODULE_VISIBILITY_DEFAULT_CONFIG);
        expect(v.isValid).toBe(true);
        const map = MODULE_VISIBILITY_DEFAULT_CONFIG.MODULE_VISIBILITY;
        expect(Object.keys(map)).toEqual(MODULE_IDS);
        expect(Object.values(map).every((x) => x === true)).toBe(true);
    });

    it('thiếu MODULE_VISIBILITY → invalid', () => {
        expect(validateModuleVisibilityConfig({}).isValid).toBe(false);
    });

    it('value không phải boolean → invalid', () => {
        expect(
            validateModuleVisibilityConfig({ MODULE_VISIBILITY: { small: 'yes' } }).isValid
        ).toBe(false);
    });

    it('map hợp lệ (boolean) → valid', () => {
        expect(
            validateModuleVisibilityConfig({ MODULE_VISIBILITY: { small: true, card: false } })
                .isValid
        ).toBe(true);
    });
});

describe('Module labels (tên module admin sửa được)', () => {
    it('default có đủ 10 module × 2 field, đều là chuỗi không rỗng', () => {
        expect(Object.keys(MODULE_VISIBILITY_DEFAULT_LABELS)).toEqual(MODULE_IDS);
        for (const id of MODULE_IDS) {
            const entry = MODULE_VISIBILITY_DEFAULT_LABELS[id];
            for (const f of ['title', 'desc']) {
                expect(typeof entry[f]).toBe('string');
                expect(entry[f].trim().length).toBeGreaterThan(0);
            }
        }
    });

    it('default không field nào vượt giới hạn độ dài', () => {
        for (const [id, entry] of Object.entries(MODULE_VISIBILITY_DEFAULT_LABELS)) {
            for (const [f, max] of Object.entries(LABEL_MAX_LEN)) {
                // Gộp id/field vào message để biết ngay chuỗi nào vượt khi test đỏ.
                expect(`${id}.${f} dài ${entry[f].length} (tối đa ${max})`).toBe(
                    `${id}.${f} dài ${Math.min(entry[f].length, max)} (tối đa ${max})`
                );
            }
        }
    });

    // 1.2.0 — ĐẢO NGƯỢC yêu cầu cũ. Trước đây ở đây có test bắt `heading` phải
    // KHÁC `title`, kèm lời dặn "đừng suy heading từ title". Thực tế dùng cho thấy
    // tách 2 field là sai: admin đổi tên tile mà tiêu đề bên trong không đi theo,
    // hai chỗ lệch nhau vĩnh viễn. Giờ chỉ còn MỘT nguồn tên duy nhất.
    it('KHÔNG còn field heading — tile và tiêu đề trong module dùng chung title', () => {
        expect(LABEL_FIELDS).toEqual(['title', 'desc']);
        for (const id of MODULE_IDS) {
            expect(MODULE_VISIBILITY_DEFAULT_LABELS[id].heading, id).toBeUndefined();
        }
    });

    it('tên mặc định lấy theo bản dài (tiêu đề cũ)', () => {
        expect(MODULE_VISIBILITY_DEFAULT_LABELS.decal.title).toBe('Tính Giá In Decal');
        expect(MODULE_VISIBILITY_DEFAULT_LABELS.uvdtf.title).toBe('Tính Giá In UV DTF');
        expect(MODULE_VISIBILITY_DEFAULT_LABELS.large.title).toBe('In Khổ Lớn — Tư Vấn & Tính Giá');
    });

    it('thiếu MODULE_LABELS vẫn valid (config lưu trước 1.1.0)', () => {
        expect(validateModuleVisibilityConfig({ MODULE_VISIBILITY: { small: true } }).isValid).toBe(
            true
        );
    });

    it('field sai kiểu → invalid', () => {
        const v = validateModuleVisibilityConfig({
            MODULE_VISIBILITY: { small: true },
            MODULE_LABELS: { small: { title: 123 } },
        });
        expect(v.isValid).toBe(false);
        expect(v.errors.join(' ')).toContain('MODULE_LABELS.small.title');
    });

    it('field quá dài → invalid', () => {
        const v = validateModuleVisibilityConfig({
            MODULE_VISIBILITY: { small: true },
            MODULE_LABELS: { small: { title: 'x'.repeat(LABEL_MAX_LEN.title + 1) } },
        });
        expect(v.isValid).toBe(false);
    });

    it('entry không phải object → invalid', () => {
        expect(
            validateModuleVisibilityConfig({
                MODULE_VISIBILITY: { small: true },
                MODULE_LABELS: { small: 'In Tem' },
            }).isValid
        ).toBe(false);
    });

    it('patch hợp lệ một phần → valid', () => {
        expect(
            validateModuleVisibilityConfig({
                MODULE_VISIBILITY: { small: true },
                MODULE_LABELS: { small: { title: 'In Tem' } },
            }).isValid
        ).toBe(true);
    });
});

describe('mergeModuleLabels', () => {
    it('payload rỗng/undefined → nguyên default', () => {
        expect(mergeModuleLabels(undefined)).toEqual(MODULE_VISIBILITY_DEFAULT_LABELS);
        expect(mergeModuleLabels({})).toEqual(MODULE_VISIBILITY_DEFAULT_LABELS);
    });

    it('payload thiếu id vẫn giữ đủ 10 module', () => {
        const merged = mergeModuleLabels({ small: { title: 'In Tem' } });
        expect(Object.keys(merged)).toEqual(MODULE_IDS);
        expect(merged.small.title).toBe('In Tem');
        // Các field không sửa vẫn lấy từ default.
        expect(merged.small.desc).toBe(MODULE_VISIBILITY_DEFAULT_LABELS.small.desc);
        expect(merged.cheapdecal).toEqual(MODULE_VISIBILITY_DEFAULT_LABELS.cheapdecal);
    });

    it('chuỗi rỗng / toàn khoảng trắng bị bỏ qua, quay về default', () => {
        const merged = mergeModuleLabels({ small: { title: '', desc: '   ' } });
        expect(merged.small.title).toBe(MODULE_VISIBILITY_DEFAULT_LABELS.small.title);
        expect(merged.small.desc).toBe(MODULE_VISIBILITY_DEFAULT_LABELS.small.desc);
    });

    it('trim giá trị lưu', () => {
        expect(mergeModuleLabels({ card: { title: '  Thẻ  ' } }).card.title).toBe('Thẻ');
    });

    it('không mutate default', () => {
        mergeModuleLabels({ small: { title: 'Đổi' } });
        expect(MODULE_VISIBILITY_DEFAULT_LABELS.small.title).toBe(
            'In KTS Khổ Nhỏ — Tính Giá & Báo Giá'
        );
    });

    it('payload rác (mảng / null / entry sai kiểu) không làm vỡ', () => {
        expect(mergeModuleLabels([])).toEqual(MODULE_VISIBILITY_DEFAULT_LABELS);
        expect(mergeModuleLabels(null)).toEqual(MODULE_VISIBILITY_DEFAULT_LABELS);
        expect(mergeModuleLabels({ small: null, large: 'x' })).toEqual(
            MODULE_VISIBILITY_DEFAULT_LABELS
        );
    });
});
