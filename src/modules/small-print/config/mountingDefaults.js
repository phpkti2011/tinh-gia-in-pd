// Bơm lại các kiểu bồi còn thiếu vào config đã lưu.
//
// VÌ SAO CẦN: configStorage merge config đã lưu với mặc định CHỈ Ở TẦNG 1
// (`{...DEFAULT_CONFIG, ...parsed}`). MOUNTING_CONFIG là key tầng 1, nên config admin đã
// lưu trước v1.5.0 (chỉ có `yes`) NUỐT TRỌN object mặc định ⇒ MOUNTING_CONFIG['3_lop']
// thành undefined, và calculateFinishingCost(n, '3_lop', undefined) trả 0đ TRONG IM LẶNG
// (engine/pricing.js). Công bồi 3 lớp sẽ miễn phí trên mọi máy đã từng bấm Lưu.
//
// Khác với PLASTIC_LAMINATION_CONFIG ở v1.4.0: cái đó là key tầng 1 MỚI nên merge nông bù
// được. Cái này là subkey mới BÊN TRONG key cũ, merge nông không với tới.
//
// Cùng vai với withMergedModuleLabels trong configStorage.js.

import { DEFAULT_CONFIG } from './defaultConfig.js';

export function withMountingDefaults(cfg) {
    if (!cfg || typeof cfg !== 'object' || Array.isArray(cfg)) return cfg;

    const def = DEFAULT_CONFIG.MOUNTING_CONFIG;
    const cur = cfg.MOUNTING_CONFIG;

    // clone: DEFAULT_CONFIG còn Infinity thật, structuredClone giữ được (JSON thì không).
    if (!cur || typeof cur !== 'object' || Array.isArray(cur)) {
        return { ...cfg, MOUNTING_CONFIG: structuredClone(def) };
    }

    const missing = Object.keys(def).filter((k) => !cur[k]);
    if (missing.length === 0) return cfg;

    const next = { ...cur };
    for (const k of missing) next[k] = structuredClone(def[k]);
    return { ...cfg, MOUNTING_CONFIG: next };
}
