// Large-print — danh mục THÀNH PHẨM (finishing) bật/tắt được theo VẬT LIỆU.
//
// Nguồn duy nhất của id + nhãn tiếng Việt, dùng chung cho:
//   - engine/pricing.js   (chặn tính tiền — nơi quyết định cuối cùng)
//   - LPInputPanel.jsx    (khoá + làm mờ control ở màn tính giá)
//   - LPSettingsPanel.jsx (admin tick/bỏ tick từng vật liệu)
//
// Dữ liệu: MATERIAL_TYPES[key].disallowedFinishing = ['lamination', ...] (DENY-list).
// THIẾU field hoặc [] ⇒ vật liệu đó làm được TẤT CẢ thành phẩm. Fallback phải
// "dễ dãi" vì config lưu trước v1.2.0 KHÔNG có field này: configStorage merge
// default chỉ 1 cấp (loadConfigFromCloud) và loadLargePrintConfig không merge gì cả.
//
// LƯU Ý: id 'grommets' KHÁC tên param 'grommetsCheck' ở params UI/engine.
// 'Đục lỗ' = 'Đóng khoen' (cùng 1 thành phẩm, KHÔNG thêm bảng giá mới).
// Standee cố ý KHÔNG nằm trong danh sách này.

export const LARGE_PRINT_FINISHING_OPS = [
    { id: 'lamination', label: 'Cán màng' },
    { id: 'formex', label: 'Bồi Formex' },
    { id: 'edgeTaping', label: 'Dán biên' },
    { id: 'grommets', label: 'Đóng khoen (đục lỗ)' },
    { id: 'dieCutting', label: 'Bế demi' },
];

// Set thành phẩm BỊ CHẶN cho 1 vật liệu. Không tìm thấy vật liệu / thiếu field
// / sai kiểu ⇒ Set rỗng (cho phép tất cả).
export function getBlockedFinishing(config, materialTypeKey) {
    const list = config?.MATERIAL_TYPES?.[materialTypeKey]?.disallowedFinishing;
    return new Set(Array.isArray(list) ? list : []);
}

// id → nhãn tiếng Việt (id lạ từ config cũ/sửa tay ⇒ trả lại chính id).
export function finishingOpLabel(opId) {
    return LARGE_PRINT_FINISHING_OPS.find((o) => o.id === opId)?.label || opId;
}
