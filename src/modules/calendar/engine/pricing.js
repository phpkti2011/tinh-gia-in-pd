import { calculateFoilStamping } from '../../small-print/engine/index';
import { validateCalendarConfig, pickTier, requireValue as must } from '../config/schema';
import { layout } from './layout';
import { kts, paperQuote } from './smallPrintAdapter';

const precise = (n) => Math.round(n * 10000) / 10000;

export function artInput(input, config, printConfig, role) {
    if (input[role + 'ArtInput']) return { ...input[role + 'ArtInput'] };
    const paper = config.artPapers[input[role + 'Art']];
    const index = (printConfig.ART_PAPER_LARGE_SHEET_SIZES || []).findIndex(
        (p) => p.w === paper?.w && p.h === paper?.h
    );
    return {
        size: index >= 0 ? String(index) : 'custom',
        w: paper?.w,
        h: paper?.h,
        cost: paper?.cost,
    };
}

export function artPaper(input, config, printConfig, role) {
    if (input[role + 'Source'] !== 'art') return null;
    const catalog = config.artPapers[input[role + 'Art']];
    must(catalog, 'Chọn loại giấy mỹ thuật hợp lệ.');
    const value = artInput(input, config, printConfig, role);
    const size =
        value.size === 'custom'
            ? value
            : printConfig.ART_PAPER_LARGE_SHEET_SIZES[Number(value.size)];
    must(
        size && [size.w, size.h, value.cost].every((x) => Number.isFinite(x) && x > 0),
        'Nhập khổ và giá tờ giấy mỹ thuật lớn hơn 0.'
    );
    return { name: catalog.name, w: size.w, h: size.h, cost: value.cost };
}

export function calculateCalendar(input, config, printConfig) {
    const valid = validateCalendarConfig(config);
    must(valid.isValid, valid.errors.join(' '));
    const s = input,
        c = config.geometry;
    for (const key of ['n', 'leaves'])
        must(
            Number.isSafeInteger(s[key]) && s[key] > 0 && s[key] <= 1000000,
            'Số cuốn và số tờ phải là số nguyên từ 1 đến 1.000.000.'
        );
    for (const key of ['a', 'b', 'leafW', 'leafH'])
        must(Number.isFinite(s[key]) && s[key] > 0, 'Kích thước thành phẩm phải lớn hơn 0.');
    must(['landscape', 'portrait'].includes(s.orientation), 'Chọn khổ đứng hoặc ngang.');
    must(
        [1, 2].includes(s.sides) && [0, 1, 2].includes(s.leafLam),
        'Số mặt in/cán tờ lịch không hợp lệ.'
    );
    must(
        ['4color', '1color'].includes(s.wrapColor) && ['4color', '1color'].includes(s.leafColor),
        'Màu in không hợp lệ.'
    );
    for (const role of ['wrap', 'liner'])
        must(['ream', 'art'].includes(s[role + 'Source']), 'Chọn nguồn giấy hợp lệ.');
    const material = (key) => {
        const item = config.materials[key][s.selected?.[key]];
        must(item, `Chọn lại loại ${key} trong danh mục.`);
        return item;
    };
    const lay = layout({ ...s, cfg: c });
    const carton = material('carton'),
        coil = material('coil'),
        labor = material('labor'),
        lam = material('lam');
    const cartonRate = pickTier(carton.tiers, s.n),
        cartonCostRate = pickTier(carton.tiers, lay.count);
    const coilRate = pickTier(coil.tiers, s.n),
        laborRate = pickTier(labor.tiers, s.n),
        lamRate = pickTier(lam.tiers, s.n);
    const wrapW = precise(lay.W + c.wrapPadW),
        wrapH = precise(c.wrapFactor * lay.H + c.wrapPadH);
    const linerW = precise(lay.W - c.linerReduceW / 10),
        linerH = precise(c.linerFactor * lay.H + c.linerPadH + c.linerBaseH - c.linerReduceH / 10);
    const wrapPrintW = precise(wrapW - (2 * c.wrapPrintInset) / 10),
        wrapPrintH = precise(wrapH - (2 * c.wrapPrintInset) / 10);
    must(linerW > 0 && linerH > 0, 'Khổ lót sau khi trừ mép phải lớn hơn 0.');
    must(
        !s.wrapperPrint || (wrapPrintW > 0 && wrapPrintH > 0),
        'Vùng in áo sau khi chừa bốn mép phải lớn hơn 0.'
    );
    const rows = [];
    const row = (id, name, detail, cost, sale) => {
        must(
            Number.isFinite(cost) &&
                cost >= 0 &&
                (sale === null || (Number.isFinite(sale) && sale >= 0)),
            `Giá ${name} không hợp lệ.`
        );
        rows.push({
            id,
            name,
            detail,
            cost: Math.round(cost),
            sale: sale === null ? null : Math.round(sale),
        });
    };
    const leaf = kts(
        printConfig,
        s.leafW,
        s.leafH,
        s.n * s.leaves,
        s.sides,
        s.paper,
        s.leaves,
        s.leafLam,
        0,
        null,
        s.leafColor,
        s.leafFilm
    );
    row(
        'leaf',
        'Tờ lịch',
        `${s.n * s.leaves} tờ · ${s.sides} mặt · ${leaf.sheets} tờ máy`,
        leaf.cost,
        leaf.sale
    );
    const cartonArea = (c.largeCount * lay.W * lay.H + c.smallCount * lay.W * c.strip) * s.n;
    row(
        'carton',
        'Carton lạnh',
        `${carton.name} · ${lay.count} tấm ${c.stockW} × ${c.stockH} cm · bậc vốn ${cartonCostRate.index}, khách ${cartonRate.index}`,
        lay.count * cartonCostRate.cost,
        s.n === 1 ? Math.max(cartonArea * cartonRate.sale, c.baseMin) : cartonArea * cartonRate.sale
    );
    const wrapArt = artPaper(s, config, printConfig, 'wrap'),
        linerArt = artPaper(s, config, printConfig, 'liner');
    // Full wrapper determines real paper consumption. Only the customer print dimensions exclude margins.
    const wrapPress = s.wrapperPrint
        ? kts(
              printConfig,
              wrapW,
              wrapH,
              s.n * c.wrapCopies,
              1,
              s.wrapPaper,
              1,
              0,
              s.wrapStock,
              wrapArt,
              s.wrapColor
          )
        : null;
    const wrapQuote = s.wrapperPrint
        ? kts(
              printConfig,
              wrapPrintW,
              wrapPrintH,
              s.n * c.wrapCopies,
              1,
              s.wrapPaper,
              1,
              0,
              s.wrapStock,
              wrapArt,
              s.wrapColor
          )
        : null;
    const wrap = paperQuote(
        printConfig,
        wrapW,
        wrapH,
        s.n * c.wrapCopies,
        s.wrapPaper,
        s.wrapStock,
        wrapPress,
        wrapArt
    );
    const mode = s.wrapperPrint ? config.wrapperSale.printed : config.wrapperSale.blank;
    const wrapSale =
        mode === 'unset'
            ? null
            : mode === 'kts-total'
              ? wrapQuote.sale
              : mode === 'included'
                ? 0
                : wrap.cost * config.wrapperSale.paperFactor;
    const printSale = !s.wrapperPrint || mode === 'kts-total' ? 0 : wrapQuote.printSale;
    row(
        'wrap',
        'Giấy áo ngoài',
        `${wrap.paperName} · ${wrapW} × ${wrapH} cm · ${wrap.sheets} tờ ${wrap.stock}${mode === 'kts-total' ? ' · giá khách đã gồm in KTS' : ''}`,
        wrap.cost,
        wrapSale
    );
    row(
        'wrap-print',
        'In áo',
        s.wrapperPrint
            ? `${wrapPrintW} × ${wrapPrintH} cm · ${s.wrapColor === '1color' ? 'đen trắng' : '4 màu'}${mode === 'kts-total' ? ' · giá khách nằm ở dòng áo' : ''}`
            : 'Không in',
        wrapPress?.printCost || 0,
        printSale
    );
    const lamArea = (wrap.areaCm / 10000) * c.lamSides;
    row(
        'lam',
        'Cán áo',
        `${lam.name} · ${c.lamSides} mặt · ${lamArea.toFixed(3)} m²`,
        lamArea * lamRate.cost,
        lamArea * lamRate.sale
    );
    const liner = paperQuote(
        printConfig,
        linerW,
        linerH,
        s.n * c.linerCopies,
        s.linerPaper,
        s.linerStock,
        null,
        linerArt
    );
    row(
        'liner',
        'Giấy lót trong',
        `${liner.paperName} · ${linerW} × ${linerH} cm · ${liner.sheets} tờ ${liner.stock} · vốn × ${c.linerSaleFactor}`,
        liner.cost,
        liner.cost * c.linerSaleFactor
    );
    row(
        'coil',
        'Lò xo',
        `${coil.name} · ${s.n} bộ · bậc ${coilRate.index}`,
        s.n * coilRate.cost,
        s.n * coilRate.sale
    );
    row(
        'labor',
        'Công bồi / ráp',
        `${labor.name} · ${s.n} đế · bậc ${laborRate.index}`,
        s.n * laborRate.cost,
        s.n * laborRate.sale
    );
    if (s.foil) {
        must(Array.isArray(s.molds) && s.molds.length > 0, 'Cần ít nhất một khuôn ép kim.');
        for (const mold of s.molds)
            must(
                [mold.w, mold.h].every((x) => Number.isFinite(x) && x > 0) &&
                    Number.isSafeInteger(mold.impressions) &&
                    mold.impressions > 0,
                'Khổ khuôn phải dương, số lần ép phải nguyên dương.'
            );
    }
    const foil = calculateFoilStamping(
        { foilStamping: s.foil ? 'yes' : 'none', productQuantity: s.n, foilMolds: s.molds },
        printConfig
    );
    row(
        'foil',
        'Ép kim đế',
        s.foil ? `${s.molds.length} khuôn · dùng giá KTS` : 'Không ép kim',
        foil.totalCost,
        foil.totalCost
    );
    const reasons = [];
    if (!config.pricesConfirmed)
        reasons.push('Quản trị viên cần kiểm tra và xác nhận bảng giá vật tư lịch.');
    if (mode === 'unset')
        reasons.push(
            `Chưa thiết lập cách bán giấy áo ${s.wrapperPrint ? 'có in' : 'không in'} trong cài đặt.`
        );
    const complete = reasons.length === 0;
    const cost = rows.reduce((sum, r) => sum + r.cost, 0),
        sale = complete ? rows.reduce((sum, r) => sum + r.sale, 0) : null;
    const baseRows = rows.filter((r) => !['leaf', 'coil'].includes(r.id));
    return {
        lay,
        rows,
        cost,
        sale,
        unit: complete ? sale / s.n : null,
        baseCost: baseRows.reduce((sum, r) => sum + r.cost, 0),
        baseSale: complete ? baseRows.reduce((sum, r) => sum + r.sale, 0) : null,
        wrapW,
        wrapH,
        wrapPrintW,
        wrapPrintH,
        linerW,
        linerH,
        wrap,
        liner,
        wrapPress,
        wrapQuote,
        leaf,
        foil,
        complete,
        reasons,
    };
}
