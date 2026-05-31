// restoreInfinity — JSON serialization helper.
//
// JSON.stringify convert Infinity → "null" → mất khi parse lại.
// Hàm này khôi phục Infinity từ null cho các key cụ thể chứa "upper bound"
// trong các config tier (vd: priceTier.upTo = Infinity nghĩa là "tier cuối —
// không giới hạn trên").
//
// Pre-P2-05.6 nằm trong src/utils/cloudSync.js. Sau P2-05.6 extract ra file
// riêng vì cloudSync.js bị xoá (Apps Script removed), nhưng restoreInfinity
// vẫn cần cho cả Supabase data (jsonb cũng mất Infinity giống JSON) và
// localStorage data.

const INFINITY_KEYS = new Set(['upTo', 'max', 'max_cost', 'max_qty', 'maxArea', 'maxMeters']);

export function restoreInfinity(obj) {
    if (Array.isArray(obj)) return obj.map(restoreInfinity);
    if (obj && typeof obj === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(obj)) {
            if (v === null && INFINITY_KEYS.has(k)) {
                result[k] = Infinity;
            } else {
                result[k] = restoreInfinity(v);
            }
        }
        return result;
    }
    return obj;
}
