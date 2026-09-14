// Cấu hình HIỂN THỊ + TÊN GỌI của tile module ở trang chủ (admin sửa, đồng bộ đám mây).
//
// MODULE_VISIBILITY: map { moduleId: boolean }. true = hiện với mọi người; false = ẩn với người dùng
// thường (admin vẫn thấy mờ + nhãn "Đang ẩn"). Default = tất cả HIỆN → an toàn khi mới tải.
//
// MODULE_LABELS: map { moduleId: { title, desc } } — admin đổi tên module không cần deploy.
//   title = chữ lớn trên tile trang chủ VÀ thẻ <h1> bên trong trang module
//   desc  = dòng mô tả xám dưới title
//
// TRƯỚC 1.2.0 còn field `heading` riêng cho <h1> bên trong. Đã BỎ: admin đổi tên
// tile nhưng heading không đi theo nên hai chỗ lệch nhau vĩnh viễn (tile "In Khổ
// Lớn (In Phun Mực Dầu)" mà bên trong vẫn "In Khổ Lớn — Tư Vấn & Tính Giá").
// Một nguồn tên duy nhất thì không thể lệch. Config cũ còn `heading` vẫn hợp lệ —
// validator và mergeModuleLabels chỉ duyệt LABEL_FIELDS nên field thừa bị bỏ qua.
//
// Optional: config lưu trước 1.1.0 chưa có MODULE_LABELS vẫn hợp lệ, thiếu thì lấp
// từ default qua mergeModuleLabels().

// 1.0.0 → 1.1.0 — thêm MODULE_LABELS (field optional, không breaking).
// 1.1.0 → 1.2.0 — bỏ field `heading`, dùng chung `title` cho cả tile lẫn <h1>.
export const MODULE_VISIBILITY_SCHEMA_VERSION = '1.2.0';

export const MODULE_VISIBILITY_DEFAULT_LABELS = {
    small: {
        title: 'In KTS Khổ Nhỏ — Tính Giá & Báo Giá',
        desc: 'In laser kỹ thuật số trên giấy couche, bristol, ford, decal... Tối ưu hóa xếp hình, tính giá vốn & báo giá khách hàng.',
    },
    large: {
        title: 'In Khổ Lớn — Tư Vấn & Tính Giá',
        desc: 'In phun khổ lớn trên PP, decal, backlit, bạt hiflex... Tự động tối ưu khổ cuộn, cán màng, bồi formex.',
    },
    decal: {
        title: 'Tính Giá In Decal',
        desc: 'Tính giá tem lẻ & tờ sticker. Mô phỏng xếp tem, bảng giá lũy tiến, bế demi, cán màng tự động.',
    },
    uvdtf: {
        title: 'Tính Giá In UV DTF',
        desc: 'Tính giá in UV DTF theo mét tới. Tự động xoay tối ưu, mô phỏng xếp hình trên cuộn.',
    },
    catalogue: {
        title: 'Tính Giá Catalogue Bấm Kim',
        desc: 'Tính giá catalogue/brochure bấm kim (gấp lồng). Tự tính số tờ in, quy đổi trang A4 & dùng chung bảng giá In KTS.',
    },
    spiral: {
        title: 'Tính Giá Sổ Đóng Lò Xo',
        desc: 'Tính giá sổ/notebook đóng lò xo. In từng tờ, tách bìa/ruột, chọn 1-2 mặt & dùng chung bảng giá In KTS.',
    },
    sticker: {
        title: 'Tính Giá Tờ Sticker',
        desc: 'Báo giá tờ sticker theo khổ (10x10 / A6 / A5 / A4) & số lượng. Bậc giá, phụ phí cán màng, số sticker, nội dung & vẽ đường cắt.',
    },
    card: {
        title: 'Tính Giá Thẻ Nhựa',
        desc: 'Báo giá thẻ nhựa / thẻ gỗ theo loại thẻ & số lượng. Chip Mifare/NFC, add-on, nhóm khách trực tiếp / đại lý.',
    },
    flyer: {
        title: 'Tính Giá Tờ Rơi',
        desc: 'Báo giá tờ rơi A5/A4 theo số lượng. Loại giấy, in 1/2 mặt, cán màng, cấn gấp & số nội dung.',
    },
    cheapdecal: {
        title: 'Decal Nhãn Giá Rẻ',
        desc: 'Báo giá nhanh decal nhãn theo cỡ & số lượng (500/1000/2000). Hình tròn/vuông, decal giấy/nhựa, cán màng, lấy trong ngày.',
    },
};

// Các field nhãn được phép sửa + giới hạn độ dài (dùng cho maxLength của input và validator).
export const LABEL_FIELDS = ['title', 'desc'];
export const LABEL_MAX_LEN = { title: 60, desc: 300 };

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
    MODULE_LABELS: MODULE_VISIBILITY_DEFAULT_LABELS,
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

    // MODULE_LABELS optional — config lưu trước 1.1.0 không có key này vẫn hợp lệ.
    const labels = config.MODULE_LABELS;
    if (labels != null) {
        if (typeof labels !== 'object' || Array.isArray(labels)) {
            errors.push('MODULE_LABELS: phải là object');
        } else {
            for (const [id, entry] of Object.entries(labels)) {
                if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
                    errors.push(`MODULE_LABELS.${id}: phải là object`);
                    continue;
                }
                for (const field of LABEL_FIELDS) {
                    const text = entry[field];
                    if (text == null) continue;
                    if (typeof text !== 'string') {
                        errors.push(`MODULE_LABELS.${id}.${field}: phải là chuỗi`);
                    } else if (text.length > LABEL_MAX_LEN[field]) {
                        errors.push(
                            `MODULE_LABELS.${id}.${field}: vượt ${LABEL_MAX_LEN[field]} ký tự`
                        );
                    }
                }
            }
        }
    }

    return { isValid: errors.length === 0, errors };
}

// Merge nhãn đã lưu lên trên default THEO TỪNG id VÀ TỪNG field.
// Bắt buộc vì loadConfigFromCloud chỉ merge nông cấp 1 → payload thiếu 1 id (client cũ, hoặc
// module mới thêm sau) sẽ thay nguyên cụm MODULE_LABELS và làm undefined chui xuống UI.
// Chuỗi rỗng / toàn khoảng trắng bị bỏ qua → quay về giá trị mặc định của field đó.
export function mergeModuleLabels(saved) {
    const merged = {};
    for (const [id, defaults] of Object.entries(MODULE_VISIBILITY_DEFAULT_LABELS)) {
        merged[id] = { ...defaults };
    }
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return merged;

    for (const [id, entry] of Object.entries(saved)) {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
        const base = merged[id] || {};
        for (const field of LABEL_FIELDS) {
            const text = entry[field];
            if (typeof text !== 'string') continue;
            const trimmed = text.trim();
            if (trimmed) base[field] = trimmed;
        }
        merged[id] = base;
    }
    return merged;
}
