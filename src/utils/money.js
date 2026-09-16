// Làm tròn TỔNG TIỀN BÁO KHÁCH lên hàng nghìn.
//
// Giá lẻ tới hàng trăm (568.500đ) không giống giá báo khách. Quy tắc: nửa lên —
// đuôi từ 500 trở lên thì lên 1.000, dưới 500 thì xuống.
//   568.500 → 569.000    568.400 → 568.000    568.000 → giữ nguyên
//
// ⚠ CỐ Ý chỉ dùng ở TẦNG HIỂN THỊ + chuỗi copy, KHÔNG dùng trong engine:
//   - Engine giữ nguyên tuyệt đối → toàn bộ golden test khoá giá vẫn xanh, lưới
//     an toàn bảo vệ công thức tính không bị đụng tới.
//   - Yêu cầu ở đây thuần tuý là cách trình bày con số, không phải đổi công thức.
//
// ⚠ CHỈ áp cho TỔNG tiền. KHÔNG áp cho:
//   - đơn giá lẻ (đ/con, đ/tấm…) — vài trăm đồng mà tròn nghìn là sai hẳn
//   - các dòng chi tiết trong bảng bóc tách — giữ số thật để admin đối chiếu
// Hệ quả: tổng đã tròn lệch tối đa 500đ so với tổng các dòng chi tiết. Đúng như
// cách phần mềm báo giá vẫn làm.
//
// ⚠ ĐƠN GIÁ "chia đều" phải chia từ TỔNG ĐÃ TRÒN — xem unitFromRoundedTotal().
// Đơn giá vẫn KHÔNG bị làm tròn nghìn (vẫn giữ tới hàng đồng); cái đổi là GỐC để
// chia, để hai con số khách đang nhìn khớp nhau.

export const ROUND_STEP = 1000;

export function roundToThousand(n) {
    if (n == null || typeof n !== 'number' || !isFinite(n)) return null;
    // Math.round(-0.5) = -0 chứ không phải -1, nên tách dấu ra để số âm cũng
    // theo đúng luật "đuôi 500 trở lên thì lên".
    const sign = n < 0 ? -1 : 1;
    return sign * Math.round(Math.abs(n) / ROUND_STEP) * ROUND_STEP;
}

// '569.000đ' — dùng cho TỔNG tiền báo khách.
export function formatVndRounded(n) {
    const r = roundToThousand(n);
    if (r == null) return null;
    return r.toLocaleString('vi-VN') + 'đ';
}

// '569.000 đ' — biến thể có khoảng trắng, khớp cách các ResultPanel đang hiện.
export function formatVndRoundedSpaced(n) {
    const r = roundToThousand(n);
    if (r == null) return '—';
    return r.toLocaleString('vi-VN') + ' đ';
}

// ĐƠN GIÁ HIỂN THỊ cho trường hợp đơn giá chỉ là "tổng chia đều" (đ/cuốn, đ/con,
// đ/tấm…). Phải chia từ TỔNG ĐÃ LÀM TRÒN: khách nhìn 480.000đ cho 3 cuốn, tự bấm
// máy tính phải ra đúng 160.000đ/cuốn — chứ không phải 160.133đ (= tổng THẬT
// 480.400 ÷ 3, đúng số nhưng lệch với con số đang hiện trên màn hình).
//
// ⚠ KHÔNG dùng cho đơn giá GỐC lấy thẳng từ bảng giá (đ/m UV DTF, đ/thẻ, đ/tờ
// theo mốc số lượng, bảng giá tem decal). Ở đó đơn giá mới là số gốc còn tổng là
// số suy ra — sửa ngược lại sẽ bịa ra một đơn giá tiệm không hề niêm yết.
//
// Trả null khi tổng không hợp lệ hoặc số lượng ≤ 0 → caller tự hiện '—'.
export function unitFromRoundedTotal(total, qty) {
    const rounded = roundToThousand(total);
    if (rounded == null) return null;
    if (qty == null || typeof qty !== 'number' || !isFinite(qty) || qty <= 0) return null;
    return rounded / qty;
}
