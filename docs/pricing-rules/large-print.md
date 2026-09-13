# Pricing Rules — In khổ lớn

Các nhóm logic cần tách:

```txt
1. Vật liệu.
2. Chiều ngang / chiều cao.
3. Số lượng.
4. Diện tích tính tiền.
5. Cán màng / bồi formex / thành phẩm.
6. Tối thiểu đơn hàng nếu có.
7. Tổng tiền và đơn giá.
```

## Thành phẩm theo vật liệu (config v1.2.0)

Không phải vật liệu nào cũng làm được mọi kiểu thành phẩm (ví dụ có xưởng không cán
màng lên bạt). Luật này **của từng xưởng**, nên phần mềm KHÔNG đặt hộ luật nào:
mặc định mọi vật liệu làm được tất cả, admin tự khai trong tab **Cài Đặt → Vật liệu**.

Khai báo bằng deny-list trên từng vật liệu:

```js
MATERIAL_TYPES: {
    hiflex: {
        name: 'Bạt Hiflex',
        disallowedFinishing: [],      // admin bỏ tick "Cán màng" → ['lamination']
        options: [...],
    },
}
```

- 5 id: `lamination` · `formex` · `edgeTaping` · `grommets` · `dieCutting`
  (Standee cố ý nằm ngoài). Registry: `src/modules/large-print/config/finishingOps.js`.
- **Thiếu field hoặc `[]` = làm được tất cả.** Fallback dễ dãi là bắt buộc vì
  `configStorage` chỉ merge default 1 cấp, nên config lưu trước v1.2.0 sẽ tới nơi
  mà không có field này. Nhờ mặc định cũng là "mở hết", 2 trường hợp cho kết quả
  giống hệt nhau → không cần bù dữ liệu, không cần chạy SQL.
- **Engine là nơi chốt cuối**: `calculateLargePrint` tự bỏ qua thành phẩm bị chặn,
  nên giá luôn đúng kể cả khi `params` còn sót lựa chọn cũ. UI chỉ khoá + làm mờ
  control cho dễ hiểu, và cố ý KHÔNG xoá `params` — đổi về vật liệu cũ thì lựa
  chọn cũ quay lại.

### Đường lan tới máy người khác

Admin tick/bỏ tick → **Lưu** → `saveConfigToCloud('largePrintConfig')` → Supabase →
mọi máy đọc về qua `loadConfigFromCloud` (lúc vào module, và khi quay lại tab trình
duyệt nhờ listener `visibilitychange` ở `LargePrintModule`).

⚠️ **Supabase là đường DUY NHẤT** đưa cài đặt sang máy người khác. Vì vậy
`LPSettingsPanel` **không** được báo thành công dựa trên việc ghi localStorage:
nó `await` kết quả `onSave` rồi hiện trạng thái `cloud` / `local` / `error`, và chỉ
rời tab Cài Đặt khi `cloud === true`. Bản đầu báo `alert('Đã lưu cài đặt!')` ngay sau
khi ghi localStorage rồi bỏ mặc promise cloud — lưu hỏng trong im lặng thì cả xưởng
vẫn dùng bảng giá cũ. Khoá bởi `tests/components/LPSettingsPanel.save-status.test.jsx`.

> 9 module còn lại vẫn đang bỏ mặc promise của `saveConfigToCloud` trong `App.jsx`
> (dòng 544, 930, 1030, 1161, 1295, 1410, 1519, 1631, 1746) — nên làm tiếp cho khớp.
