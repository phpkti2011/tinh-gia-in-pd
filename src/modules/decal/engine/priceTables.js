// Decal engine — sinh bảng giá (price table generators).
//
// Tách từ src/utils/decalCalculator.js ở TASK-0004.
// KHÔNG đổi behavior. Pure functions, không React/DOM/IO.
//
// contentCount (phụ thu nhiều nội dung) mặc định 1 ⇒ lời gọi cũ giữ nguyên giá.
// Phụ thu tính THEO TỪNG DÒNG vì nó phụ thuộc số lượng của dòng đó: 5 nội dung
// × 5 con ăn mức "mỗi nội dung 1 cái", còn 5 nội dung × 500 con ăn bậc 4-9.
// `contentPercent` gắn vào row để bảng kết quả hiện được badge.

import {
    calculateSingleStickerPrice,
    calculateSheetPrice,
    getContentSurchargePercent,
} from './pricing.js';
import { findPrintSheet } from './layout.js';

// Loại các vật liệu KHÔNG có ở khổ đang chọn (unavailableMaterials của khổ).
function filterAvailable(materials, config, sheetW, sheetH) {
    const off = findPrintSheet(config, sheetW, sheetH)?.unavailableMaterials || [];
    return off.length ? materials.filter((m) => !off.includes(m)) : materials;
}

// Hai chế độ đều hiển thị cùng một dải số lượng: 100 → 2.000.
function standardQuantities() {
    return Array.from({ length: 20 }, (_, i) => (i + 1) * 100);
}

// Generate full price table for single sticker mode
export function generateSinglePriceTable(
    stickersPerSheet,
    decalType,
    sheetW,
    sheetH,
    config,
    customQuantity,
    filmId = '',
    contentCount = 1
) {
    const decalsToDisplay = filterAvailable(
        decalType === 'Decal giấy' || decalType === 'Decal nhựa'
            ? ['Decal giấy', 'Decal nhựa']
            : [decalType],
        config,
        sheetW,
        sheetH
    );
    const rows = [];

    // Một mức số lượng → 2 dòng (có cán / không cán) cho mỗi loại decal.
    const pushRows = (qty, isCustom) => {
        const contentPercent = getContentSurchargePercent(qty, contentCount, config);
        for (const dt of decalsToDisplay) {
            for (const laminated of [true, false]) {
                const row = {
                    quantity: qty,
                    decalType: dt,
                    laminated,
                    price: calculateSingleStickerPrice(
                        qty,
                        dt,
                        laminated,
                        stickersPerSheet,
                        sheetW,
                        sheetH,
                        config,
                        filmId,
                        contentCount
                    ),
                    contentPercent,
                };
                if (isCustom) row.isCustom = true;
                rows.push(row);
            }
        }
    };

    if (customQuantity > 0) pushRows(customQuantity, true);
    for (const qty of standardQuantities()) pushRows(qty, false);

    return rows;
}

// Generate full price table for sticker sheet mode
export function generateSheetPriceTable(
    sheetsPerPrintSheet,
    stickersOnSheet,
    decalType,
    sheetW,
    sheetH,
    config,
    customQuantity,
    filmId = '',
    contentCount = 1
) {
    const decalsToDisplay = filterAvailable(
        decalType === 'Decal giấy' || decalType === 'Decal nhựa'
            ? ['Decal giấy', 'Decal nhựa']
            : [decalType],
        config,
        sheetW,
        sheetH
    );
    const rows = [];

    const pushRows = (qty, isCustom) => {
        const contentPercent = getContentSurchargePercent(qty, contentCount, config);
        for (const dt of decalsToDisplay) {
            for (const laminated of [true, false]) {
                const row = {
                    quantity: qty,
                    decalType: dt,
                    laminated,
                    price: calculateSheetPrice(
                        qty,
                        dt,
                        laminated,
                        sheetsPerPrintSheet,
                        stickersOnSheet,
                        sheetW,
                        sheetH,
                        config,
                        filmId,
                        contentCount
                    ),
                    contentPercent,
                };
                if (isCustom) row.isCustom = true;
                rows.push(row);
            }
        }
    };

    if (customQuantity > 0) pushRows(customQuantity, true);
    for (const qty of standardQuantities()) pushRows(qty, false);

    return rows;
}
