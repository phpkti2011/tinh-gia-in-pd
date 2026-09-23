// Dựng chuỗi QUY CÁCH để nhân viên copy gửi khách (nút "Copy quy cách").
//
// Công thức:  số lượng _ kích thước _ chất liệu _ số mặt in _ quy cách thành phẩm
//             Giá: <tổng> (<đơn giá>/<đơn vị>)
//
// Module nào thiếu mục nào thì BỎ HẲN mục đó, không để "_ _" rỗng và không bịa
// dữ liệu. Gom cả 10 builder vào một file để câu chữ gửi khách đồng nhất.
//
// ⚠ CHỈ ĐƯỢC DÙNG GIÁ BÁO KHÁCH. catalogue/spiral trả về CẢ `giaVon` ngay cạnh
//   `totalCustomerCost` — đọc nhầm là gửi giá vốn cho khách. Khoá bởi test
//   "không lộ giá vốn" trong tests/golden/job-spec.test.js.
//
// File thuần (không React) để test bằng node thường và được tính coverage —
// src/components/** bị loại khỏi coverage.

import { getBlockedFinishing } from '../modules/large-print/config/finishingOps.js';
import { filmPhrase } from './laminationFilm.js';
import { plasticPhrase } from './plasticLamination.js';
import { formatVndRounded, unitFromRoundedTotal } from './money.js';
import { MOUNTING_LABELS } from '../modules/small-print/engine/mounting.js';

const SEP = ' _ ';

// ─────────────────────────────────────────────────────────────────────────────
// Formatter dùng chung
// ─────────────────────────────────────────────────────────────────────────────

export function formatVnd(n) {
    if (n == null || typeof n !== 'number' || !isFinite(n)) return null;
    return Math.round(n).toLocaleString('vi-VN') + 'đ';
}

// 9 → '9' ; 5.5 → '5.5' ; 29.699 → '29.7'  (bỏ số 0 thừa, tối đa 2 chữ số lẻ)
export function num(n) {
    if (n == null || typeof n !== 'number' || !isFinite(n)) return null;
    return String(Math.round(n * 100) / 100);
}

// Cắt chú thích GIÁ khỏi tên gửi khách:
//   'Decal nhựa (+đ/nhãn)'      → 'Decal nhựa'
//   'Nhãn hình vuông (+10%)'    → 'Nhãn hình vuông'
//   'In 1 mặt - giảm 35%'       → 'In 1 mặt'
// Giữ nguyên ngoặc mang thông tin thật: 'Màng mờ (laminate dày)'.
export function stripPriceNote(s) {
    if (typeof s !== 'string') return '';
    return s
        .replace(/\s*\([^)]*[+%][^)]*\)/g, '')
        .replace(/\s*[-–]\s*(giảm|cộng|phụ thu|tăng)\b[^,;]*$/iu, '')
        .trim();
}

// Không bế → thành phẩm là hình chữ nhật, hoặc vuông khi rộng = cao.
export function cutShapeLabel(w, h) {
    const square = typeof w === 'number' && typeof h === 'number' && Math.abs(w - h) < 1e-9;
    return `cắt thành phẩm ${square ? 'vuông' : 'chữ nhật'}`;
}

export function formatSize(w, h, unit = 'cm') {
    const a = num(w);
    const b = num(h);
    if (a == null || b == null) return null;
    return `${a}x${b}${unit}`;
}

// Nối các mục, bỏ mục rỗng → không bao giờ sinh "_ _".
function joinSpec(parts) {
    return parts.filter((p) => typeof p === 'string' && p.trim() !== '').join(SEP);
}

function joinFinishing(parts) {
    return parts.filter((p) => typeof p === 'string' && p.trim() !== '').join(', ');
}

// 'Giá: 1.250.000đ (2.500đ/cái)' — bỏ ngoặc khi không có đơn giá.
//
// TỔNG làm tròn nghìn (giá báo khách), ĐƠN GIÁ giữ số lẻ tới hàng đồng — đơn giá
// chỉ vài trăm đồng/con nên tròn nghìn là sai hẳn. Xem src/utils/money.js.
//
// ⚠ Đơn giá kiểu "tổng chia đều" phải được caller tính bằng unitFromRoundedTotal(),
// tức chia từ TỔNG ĐÃ TRÒN — để khách lấy đúng con số trong cùng chuỗi này chia
// cho số lượng thì ra đúng đơn giá đang ghi. Đơn giá GỐC theo bảng giá (đ/thẻ)
// thì truyền thẳng số gốc.
function priceLine(total, unitPrice, unitWord) {
    const t = formatVndRounded(total);
    if (!t) return null;
    const u = formatVnd(unitPrice);
    return u && unitWord ? `Giá: ${t} (${u}/${unitWord})` : `Giá: ${t}`;
}

function compose(specParts, total, unitPrice, unitWord) {
    const spec = joinSpec(specParts);
    if (!spec) return null;
    const price = priceLine(total, unitPrice, unitWord);
    return price ? `${spec}\n${price}` : spec;
}

function qtyPart(qty, unitWord) {
    if (qty == null || typeof qty !== 'number' || !isFinite(qty) || qty <= 0) return null;
    const n = qty.toLocaleString('vi-VN');
    return unitWord ? `${n} ${unitWord}` : n;
}

// ─────────────────────────────────────────────────────────────────────────────
// small-print — In KTS khổ nhỏ
// ─────────────────────────────────────────────────────────────────────────────

// Nhãn tiếng Việt của thành phẩm hiện CHỈ tồn tại trong <option> của InputPanel,
// chưa có map key→nhãn ở đâu cả. Đặt map tại đây (đã bỏ chú thích kỹ thuật).
const SP_LAMINATION_SIDES = { laminate_1: 1, laminate_2: 2 };
const SP_DIECUT = { mold: 'bế khuôn', digital: 'bế kỹ thuật số' };
const SP_MOLD = {
    simple: 'hình dạng đơn giản',
    envelope: 'bao thư',
    box: 'hộp',
    bag: 'túi giấy',
    tag: 'tag treo',
};
const SP_CREASING = { co_can: 'có cấn' };
const SP_HOLE = { '1_vi_tri': 'đục lỗ 1 vị trí', '2_vi_tri': 'đục lỗ 2 vị trí' };

function smallPrintSpec({ params, result, config }) {
    if (!params || !result || result.error) return null;

    const paper = (config?.PAPER_STOCK_DATA || [])[params.paperType];
    const w = Number(params.productW);
    const h = Number(params.productH);

    // quote.printSides đã chuẩn hoá thành số; params.printSides bị ép về '1' với
    // decal/bồi nên không dùng được.
    const sides = Number(result.printSides) || Number(params.printSides) || 1;

    const fin = [];
    // Loại màng chèn vào giữa: 'cán màng mờ 2 mặt'. Chưa chọn thì nói thẳng
    // để xưởng hỏi lại, không đoán bừa.
    const lamSides = SP_LAMINATION_SIDES[params.laminationType];
    if (lamSides) {
        fin.push(
            `cán màng ${filmPhrase(config?.LAMINATION_FILMS, params.laminationFilm)} ${lamSides} mặt`
        );
    }
    // Ép plastic: 'ép plastic 80 mic khổ A4' — chưa chọn khổ thì ghi thẳng
    // "(CHƯA CHỌN khổ)" để xưởng hỏi lại. Không ép → null → bỏ qua.
    const plastic = plasticPhrase(
        config?.PLASTIC_LAMINATION_CONFIG,
        params.plasticThickness,
        params.plasticSize
    );
    if (plastic) fin.push(plastic);
    // Nhãn theo kiểu bồi — nguồn ở modules/small-print/engine/mounting.js.
    // Vị trí push PHẢI giữ nguyên: job-spec.test.js khoá cứng thứ tự các mục thành phẩm.
    if (MOUNTING_LABELS[params.mountingType]) fin.push(MOUNTING_LABELS[params.mountingType]);
    if (SP_CREASING[params.creasingType]) fin.push(SP_CREASING[params.creasingType]);
    if (SP_HOLE[params.holePunchingType]) fin.push(SP_HOLE[params.holePunchingType]);
    if (params.foilStamping === 'yes') fin.push('ép kim');

    const custom = (config?.CUSTOM_FINISHING_TYPES || []).find(
        (t) => params.customFinishingType && String(params.customFinishingType).startsWith(t.id)
    );
    if (custom?.name) fin.push(stripPriceNote(custom.name).toLowerCase());

    // Không bế → thành phẩm cắt chữ nhật/vuông (đúng luật người dùng nêu).
    if (SP_DIECUT[params.dieCuttingType]) {
        const mold =
            params.dieCuttingType === 'mold' && SP_MOLD[params.moldType]
                ? ` ${SP_MOLD[params.moldType]}`
                : '';
        fin.push(SP_DIECUT[params.dieCuttingType] + mold);
    } else {
        fin.push(cutShapeLabel(w, h));
    }

    const qty = Number(params.productQuantity);
    const total = result.totalCustomerCost;
    return compose(
        [
            qtyPart(qty, null),
            formatSize(w, h, 'cm'),
            paper?.name ? stripPriceNote(paper.name) : null,
            `${sides} mặt`,
            joinFinishing(fin),
        ],
        total,
        unitFromRoundedTotal(total, qty),
        'cái'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// large-print — In Khổ Lớn (luôn 1 mặt → bỏ mục "số mặt in")
// ─────────────────────────────────────────────────────────────────────────────

function largePrintSpec({ params, result, config }) {
    // result.error = tấm vượt khổ in được tại xưởng: KHÔNG có giá thì cũng không có
    // quy cách để gửi khách (itemDetails đã chặn sẵn, đây là chặn cho rõ ý).
    if (
        !params ||
        !result ||
        result.error ||
        !Array.isArray(result.itemDetails) ||
        !result.itemDetails.length
    )
        return null;

    // Engine bỏ tính tiền thành phẩm bị vật liệu chặn nhưng KHÔNG xoá params →
    // phải lọc y hệt, nếu không sẽ ghi cho khách công đoạn không hề làm.
    const blocked = getBlockedFinishing(config, params.materialTypeKey);

    const fin = [];
    if (
        !blocked.has('lamination') &&
        params.laminationTypeKey &&
        params.laminationTypeKey !== 'none'
    ) {
        const lam = config?.LAMINATION_TYPES?.[params.laminationTypeKey]?.name;
        if (lam) fin.push(`cán ${stripPriceNote(lam).toLowerCase()}`);
    }
    if (!blocked.has('formex') && params.formexTypeKey && params.formexTypeKey !== 'none') {
        const fx = config?.FORMEX_OPTIONS?.[params.formexTypeKey]?.name;
        if (fx) fin.push(stripPriceNote(fx).toLowerCase());
    }
    if (!blocked.has('edgeTaping') && params.edgeTaping) fin.push('dán biên');
    if (!blocked.has('grommets') && params.grommetsCheck && params.grommetsCount > 0)
        fin.push(`đóng ${params.grommetsCount} khoen`);
    if (!blocked.has('dieCutting') && params.dieCutting) fin.push('bế demi');
    if (result.standeeName) fin.push(stripPriceNote(result.standeeName).toLowerCase());

    const material = config?.MATERIAL_TYPES?.[params.materialTypeKey]?.name;
    const finText = joinFinishing(fin);

    // Nhiều loại kích thước → mỗi loại một dòng, giá tổng ở dòng cuối.
    const lines = result.itemDetails.map((d) =>
        joinSpec([
            qtyPart(Number(d.quantity), 'tấm'),
            formatSize(Number(d.originalW), Number(d.originalH), 'cm'),
            material ? stripPriceNote(material) : null,
            finText,
        ])
    );

    const spec = lines.filter(Boolean).join('\n');
    if (!spec) return null;
    const panels = Number(result.totalPanels) || 0;
    const price = priceLine(
        result.totalCost,
        unitFromRoundedTotal(result.totalCost, panels),
        'tấm'
    );
    return price ? `${spec}\n${price}` : spec;
}

// ─────────────────────────────────────────────────────────────────────────────
// spiral — sách lò xo (giàu nhất về "số mặt in" + "cán màng mấy mặt")
// ─────────────────────────────────────────────────────────────────────────────

function spiralSpec({ params, result }) {
    if (!params || !result || result.error) return null;

    const paper = joinFinishing([
        result.cover?.paperName ? `bìa ${stripPriceNote(result.cover.paperName)}` : null,
        result.inner?.paperName ? `ruột ${stripPriceNote(result.inner.paperName)}` : null,
    ]);
    const sides = joinFinishing([
        result.cover?.sides ? `bìa in ${result.cover.sides} mặt` : null,
        result.inner?.sides ? `ruột in ${result.inner.sides} mặt` : null,
    ]);
    const fin = joinFinishing([
        result.lamLabel && result.lamLabel !== 'Không cán' ? result.lamLabel.toLowerCase() : null,
        'đóng lò xo',
        result.linerName ? stripPriceNote(result.linerName).toLowerCase() : null,
    ]);

    const qty = Number(params.quantity);
    return compose(
        [
            qtyPart(qty, 'cuốn'),
            // Khổ THÀNH PHẨM khách đặt (mm→cm). KHÔNG dùng result.pieceW_cm — đó là
            // khổ TỜ IN: đã cộng bleed, và với catalogue là khổ TRẢI 2 trang
            // (pageW*2+2) → cuốn A4 sẽ ra 42cm, sai hoàn toàn khi gửi khách.
            formatSize(Number(params.finishedW) / 10, Number(params.finishedH) / 10, 'cm'),
            paper,
            sides,
            fin,
        ],
        result.totalCustomerCost,
        unitFromRoundedTotal(result.totalCustomerCost, qty),
        'cuốn'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// catalogue — sách bấm kim
// ─────────────────────────────────────────────────────────────────────────────

function catalogueSpec({ params, result }) {
    if (!params || !result || result.error) return null;

    const paper = joinFinishing([
        result.cover?.paperName ? `bìa ${stripPriceNote(result.cover.paperName)}` : null,
        result.inner?.paperName ? `ruột ${stripPriceNote(result.inner.paperName)}` : null,
    ]);
    const fin = joinFinishing([
        result.lamLabel && result.lamLabel !== 'Không cán' ? result.lamLabel.toLowerCase() : null,
        'bấm kim',
    ]);

    const qty = Number(params.quantity);
    const pages = Number(params.numPages);
    return compose(
        [
            qtyPart(qty, 'cuốn'),
            // Khổ THÀNH PHẨM khách đặt (mm→cm). KHÔNG dùng result.pieceW_cm — đó là
            // khổ TỜ IN: đã cộng bleed, và với catalogue là khổ TRẢI 2 trang
            // (pageW*2+2) → cuốn A4 sẽ ra 42cm, sai hoàn toàn khi gửi khách.
            formatSize(Number(params.finishedW) / 10, Number(params.finishedH) / 10, 'cm'),
            pages > 0 ? `${pages} trang` : null,
            paper,
            result.coverSingleSide ? 'bìa in 1 mặt' : 'bìa in 2 mặt',
            fin,
        ],
        result.totalCustomerCost,
        unitFromRoundedTotal(result.totalCustomerCost, qty),
        'cuốn'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// flyer — tờ rơi (result đã có sẵn nhãn tiếng Việt)
// ─────────────────────────────────────────────────────────────────────────────

function flyerSpec({ result, config }) {
    if (!result || result.error || result.requiresManualQuote) return null;

    const fin = joinFinishing([
        result.lamination === 'yes'
            ? `cán màng ${filmPhrase(config?.FLYER_CONFIG?.laminationFilms, result.laminationFilm)}`
            : null,
        result.creasingType && result.creasingType !== 'none'
            ? `cấn ${result.creasingType} đường`
            : null,
    ]);

    const qty = Number(result.quantity);
    return compose(
        [
            qtyPart(qty, null),
            stripPriceNote(result.sizeName || '').replace(/^Kích thước\s*/iu, ''),
            stripPriceNote(result.paperName || ''),
            stripPriceNote(result.sidesName || '').replace(/^In\s*/iu, ''),
            fin,
        ],
        result.total,
        unitFromRoundedTotal(result.total, qty),
        'tờ'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// cheapdecal — decal giá rẻ
// ─────────────────────────────────────────────────────────────────────────────

function cheapDecalSpec({ result, config }) {
    if (!result || result.error) return null;

    const fin = joinFinishing([
        stripPriceNote(result.shapeName || '').toLowerCase() || null,
        result.lamination
            ? `cán màng ${filmPhrase(config?.CHEAP_DECAL_CONFIG?.laminationFilms, result.laminationFilm)}`
            : null,
    ]);

    const qty = Number(result.quantity);
    return compose(
        [
            qtyPart(qty, null),
            stripPriceNote(result.sizeName || ''),
            stripPriceNote(result.materialName || ''),
            fin,
        ],
        result.total,
        unitFromRoundedTotal(result.total, qty),
        'cái'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// sticker — tem tờ (không có số mặt in; finishName vừa là chất liệu vừa là bề mặt)
// ─────────────────────────────────────────────────────────────────────────────

function stickerSpec({ result }) {
    if (!result || result.error || result.isCustomQuote) return null;

    const qty = Number(result.qty);
    // Chia cho SỐ TỜ TÍNH TIỀN (giống engine + panel), không phải số tờ đặt: khi
    // khách đặt dưới mốc tối thiểu, hai số này khác nhau.
    const billable = Number(result.billableQty) || qty;
    return compose(
        [
            qtyPart(qty, 'tờ'),
            stripPriceNote(result.sizeName || ''),
            stripPriceNote(result.finishName || ''),
        ],
        result.total,
        unitFromRoundedTotal(result.total, billable),
        'tờ'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// card — thẻ nhựa (khổ cố định CR80, không có số mặt in / thành phẩm)
// ─────────────────────────────────────────────────────────────────────────────

function cardSpec({ result }) {
    if (!result || result.error || result.isContact) return null;

    const qty = Number(result.qty);
    return compose(
        [qtyPart(qty, 'thẻ'), stripPriceNote(result.productName || '')],
        result.total,
        // CỐ Ý giữ đơn giá GỐC theo mốc số lượng (engine tính ngược total = unit ×
        // qty). Không chia lại từ tổng đã tròn — sẽ bịa ra đơn giá tiệm không niêm yết.
        result.unit,
        'thẻ'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// uvdtf — chất liệu cố định (1 loại film), không có thành phẩm
// ─────────────────────────────────────────────────────────────────────────────

function uvdtfSpec({ params, result }) {
    if (!result || result.error) return null;

    const qty = Number(params?.quantity);
    // originalW/H là mm → đổi sang cm cho khách dễ hình dung.
    // Lấy result.dieCut (thứ engine THỰC SỰ đã tính), KHÔNG lấy params.dieCut: params đổi
    // trước, result debounce 150ms sau — quy cách gửi khách phải khớp với con số đang hiện.
    return compose(
        [
            qtyPart(qty, 'tem'),
            formatSize(Number(result.originalW) / 10, Number(result.originalH) / 10, 'cm'),
            'UV DTF',
            result.dieCut === true ? 'có bế' : null,
        ],
        result.totalPrice,
        unitFromRoundedTotal(result.totalPrice, qty),
        'tem'
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// decal — màn này là BẢNG GIÁ nhiều mức số lượng, không phải một báo giá đơn.
// Nút copy đặt trên từng dòng → builder nhận thêm `row`.
// ─────────────────────────────────────────────────────────────────────────────

function decalSpec({ params, result, config, row }) {
    if (!row || !result) return null;

    const isSheet = result.mode === 'sheet';
    const sheet =
        params?.sheetSizeKey !== 'custom'
            ? config?.stickerSheetSizes?.[Number(params?.sheetSizeKey)]
            : null;
    const w = Number(isSheet ? (sheet?.w ?? params?.customSheetW) : params?.stickerW);
    const h = Number(isSheet ? (sheet?.h ?? params?.customSheetH) : params?.stickerH);
    const unit = isSheet ? 'tờ' : 'con';
    const fin = joinFinishing([
        row.laminated
            ? `cán màng ${filmPhrase(config?.laminationFilms, params?.laminationFilm)}`
            : null,
        // Module này LUÔN bế demi → KHÔNG dùng cutShapeLabel: câu "cắt thành phẩm
        // chữ nhật/vuông" nghĩa là chỉ xén thẳng, dành cho In KTS khổ nhỏ khi
        // không chọn bế. Cố ý không nêu hình dạng (tròn/oval/chữ nhật) — kích
        // thước và file thiết kế đã nói rõ.
        'bế demi',
    ]);

    // Tem tròn: ghi ĐƯỜNG KÍNH, không ghi WxH — gửi "20x48mm" cho một con tem
    // tròn 48mm là sai hẳn với xưởng. Màn nhập đã ép W = H, nhưng báo giá lưu
    // từ trước có thể còn lệch ⇒ lấy cạnh lớn, đúng như engine đang tính.
    const sizePart =
        !isSheet && params?.shape === 'circle'
            ? `Tròn ${num(Math.max(w, h))} mm`
            : formatSize(w, h, 'mm');

    const qty = Number(row.quantity);
    const total = row.finalPrice != null ? row.finalPrice : row.price;
    return compose(
        [qtyPart(qty, unit), sizePart, stripPriceNote(row.decalType || ''), fin],
        total,
        unitFromRoundedTotal(total, qty),
        unit
    );
}

// ─────────────────────────────────────────────────────────────────────────────

const BUILDERS = {
    'small-print': smallPrintSpec,
    'large-print': largePrintSpec,
    spiral: spiralSpec,
    catalogue: catalogueSpec,
    flyer: flyerSpec,
    cheapdecal: cheapDecalSpec,
    sticker: stickerSpec,
    card: cardSpec,
    uvdtf: uvdtfSpec,
    decal: decalSpec,
};

// Trả về chuỗi để copy, hoặc null khi chưa có kết quả hợp lệ (nút tự ẩn).
export function buildJobSpec(moduleId, ctx) {
    const build = BUILDERS[moduleId];
    if (!build || !ctx) return null;
    try {
        const out = build(ctx);
        if (typeof out !== 'string' || out.trim() === '') return null;
        // Chặn rác lọt ra chuỗi gửi khách.
        if (/undefined|NaN|null/.test(out)) return null;
        return out;
    } catch {
        return null;
    }
}
