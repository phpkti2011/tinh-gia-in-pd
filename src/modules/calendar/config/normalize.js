import { DEFAULT_CARTON_SHEET } from './defaultConfig';

// Nâng cấp hình dạng bảng giá lịch từ schema 1.x lên 2.0.0 — xem config/version.js.
//
// HỢP ĐỒNG CHUNG: mọi hàm ở đây trả về ĐÚNG reference đầu vào khi không có gì phải đổi.
// config là dependency của useMemo trong ui/CalendarModule.jsx; trả object mới mỗi lần
// sẽ tính lại toàn bộ báo giá ở mỗi nhịp đồng bộ.

const positive = (x) => Number.isFinite(x) && x > 0;

// ĐƯỜNG ĐỌC. Điền w/h cho các loại carton lưu trước 2.0.0, lấy từ geometry.stockW/stockH.
//
// ⚠ KHÔNG chạy trên bản nháp admin đang chỉnh: ô trống trả NaN, back-fill sẽ âm thầm
//   ghi 60 đè lên con số admin vừa xoá.
export function withCartonSheets(config) {
    const items = config?.materials?.carton;
    if (!Array.isArray(items)) return config;
    const g = config.geometry,
        fallbackW = positive(g?.stockW) ? g.stockW : DEFAULT_CARTON_SHEET.w,
        fallbackH = positive(g?.stockH) ? g.stockH : DEFAULT_CARTON_SHEET.h;
    if (items.every((item) => positive(item?.w) && positive(item?.h))) return config;
    return {
        ...config,
        materials: {
            ...config.materials,
            carton: items.map((item) =>
                positive(item?.w) && positive(item?.h)
                    ? item
                    : {
                          ...item,
                          w: positive(item?.w) ? item.w : fallbackW,
                          h: positive(item?.h) ? item.h : fallbackH,
                      }
            ),
        },
    };
}

// ĐƯỜNG ĐỌC + ĐƯỜNG GHI. Đồng bộ bản sao geometry.stockW/stockH theo materials.carton[0].
//
// ⚠ carton[0].w/h không hợp lệ ⇒ GIỮ NGUYÊN bản sao cũ. JSON.stringify biến NaN thành
//   null, một bản sao bẩn sẽ khiến bundle cũ từ chối toàn bộ bảng giá. Bản nháp sai vẫn
//   bị validateCalendarConfig chặn ở bước sau, nên ở đây chỉ cần không làm hỏng thêm.
export function withStockMirror(config) {
    const first = config?.materials?.carton?.[0];
    if (!positive(first?.w) || !positive(first?.h)) return config;
    const g = config.geometry;
    if (g?.stockW === first.w && g?.stockH === first.h) return config;
    return { ...config, geometry: { ...g, stockW: first.w, stockH: first.h } };
}

export const normalizeCalendarConfig = (config) => withStockMirror(withCartonSheets(config));
