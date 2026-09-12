// Small-print — quy đổi khổ in ra số trang A4.
//
// Tách từ logic inline trong quote.js để UI (SettingsPanel) tự điền "Quy đổi A4"
// cho khổ decal bằng ĐÚNG công thức engine đang dùng. KHÔNG đổi behavior.

// Bảng quy đổi áp dụng cho 1 máy: ưu tiên bảng RIÊNG của máy, không có thì dùng
// bảng CHUNG của config (config cũ lưu trước khi tách theo máy vẫn chạy đúng).
export function getA4Rates(config, printer) {
    if (printer && printer.a4ConversionRates && typeof printer.a4ConversionRates === 'object') {
        return printer.a4ConversionRates;
    }
    return (config && config.A4_CONVERSION_RATES) || {};
}

// Số trang A4 quy đổi cho 1 tờ khổ cao h (cm) — theo chiều cao.
// printer (tuỳ chọn): tra bảng riêng của máy trước. Bỏ trống → dùng bảng chung.
// Trả null nếu không suy ra được (h ≤ 21.2 và ngoài bảng quy đổi).
export function computeA4Factor(h, config, printer) {
    if (typeof h !== 'number' || !(h > 0)) return null;
    const rates = getA4Rates(config, printer);
    const key = h.toFixed(1);
    if (rates[key]) return rates[key];
    if (h > 48) return h <= 76 ? 3 : h <= 91 ? 4 : 5;
    if (h > 21.2) return h / 21.0;
    return null;
}
