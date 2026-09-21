// Large-print — KHỔ IN ĐƯỢC TẠI XƯỞNG (máy × cuộn vật liệu).
//
// Nguồn duy nhất của luật + câu chữ tiếng Việt, dùng chung cho:
//   - engine/pricing.js   (chặn báo giá + chặn cách xếp tấm — nơi quyết định cuối cùng)
//   - LPInputPanel.jsx    (ghi chú đỏ ngay dưới ô nhập W/H)
//   - LPResultPanel.jsx   (thông báo thay cho báo giá)
// Để chung 1 chỗ vì đây đúng vai của finishingOps.js: UI và engine không được lệch pha.
//
// LUẬT: khổ in tại xưởng = min(MACHINE_MAX_PRINT_WIDTH_M, khổ cuộn LỚN NHẤT của vật liệu).
// Tấm luôn xoay được ⇒ chỉ CẠNH NGẮN phải lọt khổ đó; cạnh dài chạy dọc cuộn, không giới hạn.
// "Cả 2 chiều đều lớn hơn 1m6" chính là min(w, h) > 1.6.
//
// Fallback DỄ DÃI (giống finishingOps.js): thiếu field / sai kiểu / <= 0 ⇒ coi như KHÔNG
// có giới hạn máy, chỉ còn ràng buộc khổ cuộn như trước v1.3.0. Config thật luôn có field
// này vì cả 2 loader đều merge default 1 cấp, nhưng config dựng tay trong test thì không.

export function getPrintLimits(config, materialTypeKey) {
    const material = config?.MATERIAL_TYPES?.[materialTypeKey];
    const options = Array.isArray(material?.options) ? material.options : [];
    const maxRollM = options.reduce(
        (max, o) => (typeof o?.width === 'number' && o.width > max ? o.width : max),
        0
    );
    const raw = config?.MACHINE_MAX_PRINT_WIDTH_M;
    const machineM = typeof raw === 'number' && isFinite(raw) && raw > 0 ? raw : Infinity;

    return {
        machineM,
        maxRollM,
        // Khổ được phép ĐẶT tấm nằm ngang cuộn (dùng trong engine/layout.js).
        // maxRollM = 0 nghĩa là config hỏng (options rỗng) ⇒ trả Infinity để rơi về
        // đường `return null` cũ ở cuối calculateLargePrint, chứ không báo vượt khổ.
        fitLimitM: Math.min(machineM, maxRollM || Infinity),
        materialName: material?.name || 'vật liệu này',
    };
}

// Tấm này in tại xưởng được không?
//   null      → in được
//   'machine' → vượt khổ máy (đổi vật liệu cũng không cứu được)
//   'roll'    → lọt khổ máy nhưng vượt khổ cuộn lớn nhất của vật liệu đang chọn
// item.width/height tính bằng CM.
export function itemLimitKind(item, limits) {
    const w = Number(item?.width);
    const h = Number(item?.height);
    if (!isFinite(w) || !isFinite(h) || w <= 0 || h <= 0) return null;
    // CỐ Ý chia 100 y hệt pricing.js — dùng ×100 ở đây sẽ lệch với phép fit ở biên
    // (1.52 × 100 = 152.00000000000003 trong IEEE-754).
    const shortSideM = Math.min(w, h) / 100;
    if (shortSideM > limits.machineM) return 'machine';
    if (limits.maxRollM > 0 && shortSideM > limits.maxRollM) return 'roll';
    return null;
}

const toCm = (m) => Math.round(m * 100);

// Ghi chú NGẮN dưới ô nhập từng tấm (LPInputPanel).
export function itemLimitNote(kind, limits) {
    return kind === 'machine'
        ? `Cả 2 chiều đều lớn hơn khổ in tối đa của máy (${toCm(limits.machineM)} cm) → phải in gia công ở ngoài.`
        : `Cả 2 chiều đều lớn hơn khổ cuộn lớn nhất của ${limits.materialName} (${toCm(limits.maxRollM)} cm) → đổi vật liệu, hoặc in gia công ở ngoài.`;
}

// Câu ĐẦY ĐỦ cho khung kết quả (LPResultPanel) — nêu đích danh tấm vi phạm.
export function oversizeMessage(kind, limits, offenders) {
    const list = offenders.map((o) => `${o.width}×${o.height} cm`).join(', ');
    const head = offenders.length > 1 ? `${offenders.length} tấm (${list})` : `Tấm ${list}`;
    return kind === 'machine'
        ? `${head} có cả 2 chiều lớn hơn khổ in tối đa của máy (${toCm(limits.machineM)} cm) → phải IN GIA CÔNG Ở NGOÀI. Không báo giá tại đây.`
        : `${head} có cả 2 chiều lớn hơn khổ cuộn lớn nhất của ${limits.materialName} (${toCm(limits.maxRollM)} cm) → đổi vật liệu khác, hoặc in gia công ở ngoài. Không báo giá tại đây.`;
}
