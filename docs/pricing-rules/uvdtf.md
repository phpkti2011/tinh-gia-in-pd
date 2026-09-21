# Pricing Rules — UV DTF

Các nhóm logic cần tách:

```txt
1. Kích thước sản phẩm.
2. Số lượng.
3. Quy đổi diện tích hoặc mét dài nếu có.
4. Bảng giá theo vật liệu/khổ.
5. Phụ phí nếu có.
6. Tổng tiền và đơn giá.
```

## Bảng giá theo mét tới (`priceTiers`)

Mỗi bậc là `{ maxMeters, price }`. Engine (`engine/pricing.js`) lấy **tier ĐẦU TIÊN**
thoả `totalMeters <= maxMeters`, nếu không bậc nào khớp thì lấy bậc cuối.

Hai luật chuẩn hoá nằm ở `src/modules/uvdtf/config/priceTiers.js`, panel cài đặt gọi khi
nạp config và khi lưu:

- **`price` là tên field DUY NHẤT.** `UvdtfSettingsPanel` từng đọc/ghi `pricePerMeter` —
  trùng tên *output* của engine chứ không phải tên field config. Hậu quả kép:
  - Sửa giá bậc có sẵn → **vẫn lưu được**, nhưng giá chui vào field không ai đọc, engine
    tính theo `price` cũ. Đổi giá xong báo giá không nhúc nhích, và **không có lỗi nào
    hiện ra** — đây là kiểu sai nguy hiểm nhất.
  - Thêm bậc mới → bậc thiếu hẳn `price` → schema chặn → "Không lưu được".

  `normalizePriceTiers` vá ngược `pricePerMeter → price` khi nạp và bỏ hẳn field rác khi
  lưu. Ưu tiên `pricePerMeter` vì nó chỉ do panel ghi ra, mỗi lần gõ phím một lần ⇒ luôn
  mới hơn `price`.

- **Bậc phải xếp tăng dần, `(vô hạn)` cuối cùng.** `sortPriceTiers` sắp lại lúc lưu.
  Không sắp thì bậc thêm sau dòng `(vô hạn)` chết lặng: dòng `(vô hạn)` khớp trước nên
  bậc mới không bao giờ tới lượt — bảng nhìn có bậc mà giá không đổi.

Khoá bởi `tests/golden/uvdtf.price-tiers.test.js` (luật thuần + engine thật) và
`tests/components/UvdtfSettingsPanel.price-tiers.test.jsx` (panel). Trước đó module này
**không có test UI nào**, nên lỗi tên field sống sót qua nhiều lần sửa.

## Hàng CÓ BẾ — bảng giá bậc riêng (config v1.1.0)

Đơn có bế tốn công hơn nên có **bảng đơn giá/mét riêng**, `dieCutPriceTiers`, cùng hình
dạng `{ maxMeters, price }` với `priceTiers`. Nó **THAY THẾ** đơn giá/mét, không phải phụ
thu cộng thêm: `totalPrice = billableMeters × giá bậc của bảng đang dùng`. Hình học (số
mét tới, cách xếp, số cột) không đổi.

Luật chọn bảng nằm ở `src/modules/uvdtf/config/priceTiers.js`, engine và panel kết quả
dùng chung:

```txt
có bế + dieCutPriceTiers là mảng KHÔNG RỖNG  → dùng bảng bế
mọi trường hợp còn lại                        → dùng priceTiers
```

Engine trả thêm `dieCut` và `usingDieCutTable` để panel dán nhãn theo thứ nó **thật sự**
đã tính — `App.jsx` debounce 150ms nên params/config lệch với result trong khoảng đó.

### Vì sao `dieCutPriceTiers` KHÔNG nằm trong config mặc định

`loadConfigFromCloud` merge nông `{...default, ...saved}`. Nếu để bảng bế trong default,
một xưởng đã lưu bảng giá riêng (845k/795k/…) mà chưa cài bảng bế sẽ **thừa hưởng bảng
mặc định 440k/390k/…** → báo giá có bế rẻ đi khoảng một nửa, không lỗi nào hiện ra.

Để field vắng mặt thì: engine rơi về `priceTiers` (giá có bế = giá không bế, đúng mặc định
đã chốt), màn Cài Đặt mồi bảng bế từ `priceTiers` **của chính xưởng đó**, và panel kết quả
hiện cảnh báo để không ai tưởng đã tính tiền bế.

### Vì sao không lưu bản sao "y hệt bảng gốc"

`handleSave` **xoá hẳn** `dieCutPriceTiers` khi nó rỗng hoặc giống hệt bảng không bế. Nếu
cứ lưu bản đã mồi, thì lần Lưu đầu tiên vì bất kỳ lý do gì (sửa `paddingCM` chẳng hạn) sẽ
đông cứng một bản sao; 6 tháng sau admin tăng giá bảng không bế, giá có bế đứng yên ở số
cũ mà không ai thấy. Field tồn tại khi và chỉ khi *"giá bế KHÁC giá không bế"*.

Hệ quả cần biết: **rollback** về bản config < 1.1.0 sẽ mất field → giá bế quay về bằng giá
không bế. Đúng ý "về lại bảng giá cũ", nhưng cần biết trước.

`restoreInfinity` đã có `maxMeters` trong `INFINITY_KEYS` nên bảng thứ hai dùng lại đúng
tên key đó là qua được JSON/Supabase round-trip, không cần sửa gì thêm.

Khoá bởi `tests/golden/uvdtf.die-cut.test.js`,
`tests/components/UvdtfSettingsPanel.die-cut-tiers.test.jsx` và
`tests/components/UvdtfResultPanel.die-cut.test.jsx`.
