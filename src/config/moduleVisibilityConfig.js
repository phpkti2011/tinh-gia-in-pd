// Cấu hình HIỂN THỊ tile module ở trang chủ (admin bật/tắt, đồng bộ đám mây).
//
// MODULE_VISIBILITY: map { moduleId: boolean }. true = hiện với mọi người; false = ẩn với người dùng
// thường (admin vẫn thấy mờ + nhãn "Đang ẩn"). Default = tất cả HIỆN → an toàn khi mới tải.

export const MODULE_VISIBILITY_SCHEMA_VERSION = '1.0.0';

export const MODULE_VISIBILITY_DEFAULT_CONFIG = {
    MODULE_VISIBILITY: {
        small: true,
        large: true,
        decal: true,
        uvdtf: true,
        catalogue: true,
        spiral: true,
        sticker: true,
        card: true,
        flyer: true,
        cheapdecal: true,
    },
};

export function validateModuleVisibilityConfig(config) {
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return { isValid: false, errors: ['Config phải là object'] };
    }
    const v = config.MODULE_VISIBILITY;
    if (!v || typeof v !== 'object' || Array.isArray(v)) {
        return { isValid: false, errors: ['MODULE_VISIBILITY: thiếu hoặc không phải object'] };
    }
    const errors = [];
    for (const [k, val] of Object.entries(v)) {
        if (typeof val !== 'boolean') errors.push(`MODULE_VISIBILITY.${k}: phải là boolean`);
    }
    return { isValid: errors.length === 0, errors };
}
