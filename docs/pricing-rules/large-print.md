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

## Khổ in tối đa của máy (config v1.3.0)

Máy khổ ngang 1m8 nhưng **in thật chỉ được 1m6**. Engine luôn tự xoay từng tấm, nên
một tấm in được tại xưởng khi **cạnh ngắn** lọt khổ đó — cạnh dài chạy dọc cuộn, không
giới hạn. "Cả 2 chiều đều lớn hơn 1m6" chính là `min(w, h) > 1.6`.

```txt
khổ in tại xưởng = min(MACHINE_MAX_PRINT_WIDTH_M, khổ cuộn LỚN NHẤT của vật liệu)
```

Hai ràng buộc, hai câu trả lời khác nhau — vì chúng dẫn tới hai lời khuyên khác nhau:

| Chặn bởi | Vật liệu ví dụ | Câu báo | Khách nên làm gì |
|---|---|---|---|
| Khổ **máy** (1.6m) | Bạt Hiflex (cuộn tới 1.8m) | ⚠ Phải in gia công ở ngoài | Không vật liệu nào cứu được |
| Khổ **cuộn** | PP / Decal (cuộn 1.52m) | ⚠ Vượt khổ cuộn vật liệu | Đổi vật liệu, hoặc in ngoài |

Mốc này chặn **cả cách xếp tấm**, không chỉ chặn báo giá. Nếu chỉ chặn báo giá thì tấm
80×180 vẫn lọt (cạnh ngắn 80) rồi `optimizeItemOnRoll` chọn hướng **xoay trên cuộn 1m8**
vì waste = 0 nên rẻ nhất — tức báo giá cho phương án đặt 180cm ngang qua máy 160cm, một
con số **thấp hơn thực tế**. Vì vậy `optimizeItemOnRoll` nhận thêm `maxPrintWidthM` và
fit theo `min(khổ cuộn, khổ máy)`. Riêng `calcItemOnRoll` KHÔNG đổi: `unprintedArea` vẫn
tính theo khổ cuộn đầy đủ vì vẫn phải mua trọn khổ bạt.

- Dính luật ⇒ engine trả `{ error, outsource, oversizeItems }` **thay cho giá**, không
  phải `null`. Trước v1.3.0 là `null`, mà `null` hiện ra màn hình y hệt "chưa nhập gì" —
  tấm quá khổ trông như lúc chưa gõ gì, người báo giá tưởng máy lỗi.
- `LPResultPanel` chặn ngay trước phần destructure nên khung giá, sticky bar và nút
  **copy quy cách** đều không render: không có giá thì cũng không có quy cách gửi khách.
- Luật + câu chữ nằm ở `src/modules/large-print/config/printLimits.js`, engine và
  `LPInputPanel` dùng chung — giống cách `finishingOps.js` chống lệch pha UI ↔ engine.
- **Thiếu field ⇒ không giới hạn máy**, chỉ còn ràng buộc khổ cuộn. Fallback dễ dãi bắt
  buộc phải có cho config dựng tay, nhưng **không cần chạy SQL / bù dữ liệu**: cả
  `loadLargePrintConfig` lẫn `loadConfigFromCloud` đều merge default 1 cấp, nên config cũ
  trên Supabase tự nhận `1.6` ngay lần đọc kế tiếp.
- Admin sửa ở tab **Cài Đặt → Khổ in tối đa của máy**. Ô nhập theo **mét** (khớp bảng
  `Khổ (m)` ngay phía trên) và echo cm bên cạnh — gõ nhầm `160` sẽ hiện `= 16000 cm`,
  sai đơn vị kiểu đó vô hiệu hoá luật trong im lặng nên phải thấy ngay.

## Bế Formex (config v1.4.0)

Bế **chính tấm Formex đã bồi** — khác `dieCutting` (bế demi trên vật liệu mỏng): khác
dao, khác giá, khác điều kiện.

**Công thức:** tính trên **tổng m² của cả đơn** (`grandTotalArea`, giống bế demi), bậc
**LŨY TIẾN**, đơn giá theo **hình dạng**, rồi chặn sàn:

```
tiền bế = max( lũy_tiến(tổng m², hình dạng đang chọn), MIN_FORMEX_DIE_CUT_PRICE )
```

Lũy tiến = cắt từng đoạn, **không** phải đồng giá theo bậc như `FORMEX_DISCOUNT_TIERS`:
phần tới `tier1LimitSqm` tính giá bậc 1, phần `tier1→tier2` giá bậc 2, phần dư giá bậc 3.

Bảng mặc định (mốc 5 / 20 m² cho mọi hình — **giá gợi ý, admin phải duyệt lại**):

| Hình dạng | ≤ 5 m² | 5–20 m² | > 20 m² |
| --- | --- | --- | --- |
| Tròn (`tron`) | 60.000 | 40.000 | 25.000 |
| Vuông / Chữ nhật (`vuong_cn`) | 40.000 | 25.000 | 15.000 |
| Bo góc (`bo_goc`) | 50.000 | 30.000 | 20.000 |
| Hình phức tạp (`phuc_tap`) | 90.000 | 60.000 | 40.000 |

Sàn chung `MIN_FORMEX_DIE_CUT_PRICE = 50.000đ`.

Ví dụ — đơn 30 m², hình tròn:
`5×60.000 + 15×40.000 + 10×25.000 = 1.150.000đ`.

### Ràng buộc: chỉ bế khi ĐÃ bồi Formex

Không bồi thì không có gì để bế. Gate đặt ở `engine/pricing.js` trong `effParams`, ăn
theo **`effFormexKey`** (bản đã qua deny-list) chứ không phải `params.formexTypeKey` —
nhờ vậy vật liệu bị chặn `formex` thì bế **tự tắt theo**, khỏi khai luật hai lần. Đây là
ràng buộc **liên-thành-phẩm đầu tiên** của engine này.

`LPInputPanel` khoá control với **hai ghi chú khác nhau** (vật liệu chặn / chưa bồi
Formex) — gộp chung là báo sai lý do cho nhân viên. Khoá bởi
`tests/components/LPInputPanel.formex-die-cut.test.jsx`.

### Vì sao là KEY TẦNG 1

`FORMEX_DIE_CUT_SHAPES` và `MIN_FORMEX_DIE_CUT_PRICE` **phải** nằm ở tầng 1 của config,
**không** được nhét thành subkey của `FINISHING_PRICES`: cả `loadLargePrintConfig` lẫn
`loadConfigFromCloud` merge default **chỉ 1 cấp** (`{...default, ...saved}`), nên object
đã lưu sẽ **nuốt trọn** default của chính nó ⇒ subkey mới thành `undefined` và giá về 0đ
âm thầm trên mọi máy từng bấm Lưu. Tiền lệ đã dính đúng lỗi này: `withMountingDefaults`
trong `src/modules/small-print/config/mountingDefaults.js`.

Hệ quả tốt kèm theo: array tầng 1 được **thay nguyên khối** khi merge, nên admin xoá một
hình dạng là mất thật — **không cần** đụng `REPLACE_WHOLE_ARRAY_KEYS`.

### Fallback dễ dãi

| Tình huống | Hành vi |
| --- | --- |
| Config lưu trước v1.4.0 (thiếu key) | 0đ, không throw — giá y như trước |
| `FORMEX_DIE_CUT_SHAPES` sai kiểu / rỗng | 0đ; UI **không render** ô "Bế Formex" |
| `shapeKey` lạ (admin vừa xoá hình dạng) | rơi về `shapes[0]`, UI hiện đúng `shapes[0]` |
| Thiếu `MIN_FORMEX_DIE_CUT_PRICE` | không có sàn (coi như 0) |
| Admin gõ ngược hai mốc bậc | `progressiveSqmCost` tự `min/max` — không sinh tiền âm |

`shapeKey` lạ lấy `shapes[0]` **thay vì trả 0đ**: thà báo giá hình khác còn hơn âm thầm
miễn phí một công đoạn nhân viên đã tick. UI hiển thị đúng `shapes[0]` nên màn hình không
mâu thuẫn với giá.

### Hai chỗ cố ý KHÔNG đổi

- Tiền bế **gộp vào `finishingCost` / `finishingDesc`**, không thêm field return — object
  engine vẫn **14 key** (khoá bởi assert đếm key trong 2 file golden), và ô "Gia công"
  trên khung kết quả vốn đã gom dán biên + khoen + bế demi.
- `key` của hình dạng **sinh tự động, không cho sửa** trong Cài đặt: params của báo giá
  đang mở trỏ vào `key`, đổi `key` là lệch giá. Admin chỉ sửa tên hiển thị. Key trùng bị
  schema chặn lưu.

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
