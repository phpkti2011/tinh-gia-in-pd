export const isC150 = (paper) =>
    paper?.pricingModel === 'ream' && /^C\s*150$/i.test(paper.name.trim());
export const isPlasticDecal = (paper) =>
    paper?.pricingModel === 'sqm' && /decal nhựa/i.test(paper.name);
export const isPaperDecal = (paper) =>
    paper?.pricingModel === 'sqm' && /decal giấy/i.test(paper.name);
// Giấy tính theo m² lấy khổ từ DECAL_SHEET_SIZES — engine (quoteAdapter.paperQuote) quyết
// định bằng pricingModel, nên giao diện phải bám đúng nguồn đó. Dò theo TÊN sẽ làm danh
// sách khổ của ô chọn lệch khỏi danh sách engine tra, chỉ số khổ trỏ sai mà không báo lỗi.
export const usesDecalStock = (paper) => paper?.pricingModel === 'sqm';
export const canWrap = (paper) =>
    paper && !paper.hidden && (isC150(paper) || isPlasticDecal(paper));
export function materialAllowed(config, role, paper) {
    if (!paper || paper.hidden) return false;
    const names = config.allowedMaterials?.[role];
    return names
        ? names.includes(paper.name)
        : role === 'wrap'
          ? canWrap(paper)
          : paper.pricingModel === 'ream' && /^(C150|F120)$/i.test(paper.name.replaceAll(' ', ''));
}
// Vật liệu admin được phép tích cho từng phần. Áo chỉ decal nhựa (phải cán màng và đủ
// cứng để bồi); lót thêm decal giấy vì đế mỏng/dày vẫn bồi lót được.
export const selectableMaterials = (printConfig, role) =>
    printConfig.PAPER_STOCK_DATA.filter(
        (p) =>
            !p.hidden &&
            (p.pricingModel === 'ream' ||
                isPlasticDecal(p) ||
                (role === 'liner' && isPaperDecal(p)))
    );
export const artAllowed = (config, role) =>
    config.allowedMaterials?.[role]?.includes('art') ?? role === 'wrap';
export const decalStocks = (config) =>
    (config.DECAL_SHEET_SIZES?.length ? config.DECAL_SHEET_SIZES : config.COMMON_SHEET_SIZES).map(
        (p) => ({ w: p.w, h: p.h, name: `${p.w} × ${p.h} cm` })
    );
