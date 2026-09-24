// Bơm lại các field còn thiếu trong PAPER_REFERENCE_CONFIG của config đã lưu.
//
// VÌ SAO CẦN: configStorage merge config đã lưu với mặc định CHỈ Ở TẦNG 1
// (`{...DEFAULT_CONFIG, ...parsed}`). PAPER_REFERENCE_CONFIG là key tầng 1, nên mọi config
// admin đã bấm Lưu trước v1.8.0 NUỐT TRỌN object mặc định ⇒ `minPrintOnlyPricePerPage`
// thành undefined ⇒ calculateFloorPrice trả `active: false` ⇒ GIÁ SÀN TẮT TRONG IM LẶNG
// trên đúng những máy đã dùng lâu nhất, trong khi máy dev vẫn thấy sàn chạy ngon.
//
// Cùng bẫy, cùng cách chữa với withMountingDefaults() ở v1.5.0.
//
// CỐ Ý dùng `=== undefined` chứ không phải falsy: 0 là giá trị HỢP LỆ (tắt sàn có chủ đích).
// Dùng `!cur[k]` như withMountingDefaults thì admin đặt 0 sẽ bị bơm 1.500 đè lên mỗi lần
// nạp — sàn tự bật lại sau lưng admin.

import { DEFAULT_CONFIG } from './defaultConfig.js';

export function withPaperReferenceDefaults(cfg) {
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return cfg;

    const def = DEFAULT_CONFIG.PAPER_REFERENCE_CONFIG;
    const cur = cfg.PAPER_REFERENCE_CONFIG;

    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
        return { ...cfg, PAPER_REFERENCE_CONFIG: structuredClone(def) };
    }

    const missing = Object.keys(def).filter((k) => cur[k] === undefined);
    if (missing.length === 0) return cfg;

    const next = { ...cur };
    for (const k of missing) next[k] = structuredClone(def[k]);
    return { ...cfg, PAPER_REFERENCE_CONFIG: next };
}
