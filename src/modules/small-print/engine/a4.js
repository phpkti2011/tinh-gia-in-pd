// Small-print — quy đổi khổ in ra số trang A4.
//
// Tách từ logic inline trong quote.js để UI (SettingsPanel) tự điền "Quy đổi A4"
// cho khổ decal bằng ĐÚNG công thức engine đang dùng. KHÔNG đổi behavior.

// Số trang A4 quy đổi cho 1 tờ khổ cao h (cm) — theo chiều cao.
// Trả null nếu không suy ra được (h ≤ 21.2 và ngoài bảng A4_CONVERSION_RATES).
export function computeA4Factor(h, config) {
    if (typeof h !== 'number' || !(h > 0)) return null;
    const rates = (config && config.A4_CONVERSION_RATES) || {};
    const key = h.toFixed(1);
    if (rates[key]) return rates[key];
    if (h > 48) return h <= 76 ? 3 : h <= 91 ? 4 : 5;
    if (h > 21.2) return h / 21.0;
    return null;
}
