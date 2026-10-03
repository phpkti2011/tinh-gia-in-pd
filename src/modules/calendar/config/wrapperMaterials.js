export const isC150 = (paper) =>
    paper?.pricingModel === 'ream' && /^C\s*150$/i.test(paper.name.trim());
export const isPlasticDecal = (paper) =>
    paper?.pricingModel === 'sqm' && /decal nhựa/i.test(paper.name);
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
export const artAllowed = (config, role) =>
    config.allowedMaterials?.[role]?.includes('art') ?? role === 'wrap';
export const decalStocks = (config) =>
    (config.DECAL_SHEET_SIZES?.length ? config.DECAL_SHEET_SIZES : config.COMMON_SHEET_SIZES).map(
        (p) => ({ w: p.w, h: p.h, name: `${p.w} × ${p.h} cm` })
    );
