# Pricing Rules — In KTS khổ nhỏ

Các nhóm logic cần tách:

```txt
1. Input khổ thành phẩm.
2. Số lượng.
3. Loại giấy.
4. In 1 mặt / 2 mặt.
5. Quy đổi khổ in / trang in nếu có.
6. Phụ phí thành phẩm.
7. Tổng tiền và đơn giá.
```

Không để công thức nằm trong component UI.

## Ép plastic (màng nhiệt bỏ túi) — config 1.4.0

Key: `PLASTIC_LAMINATION_CONFIG` (optional — config cũ thiếu key vẫn hợp lệ, engine trả 0).
Helper thuần: `src/utils/plasticLamination.js`. Engine: `calculatePlasticLamination()` trong
`src/modules/small-print/engine/finishing.js`.

```txt
sizes        [{ id, name }]                      cột của bảng (A6/A5/A4/A3/CCCD…), admin thêm/xoá
tiers        [{ max_qty, price: { sizeId: đ } }]  hàng = bậc SL, tra "SL <= max_qty" (dòng cuối ∞)
minPrice     { sizeId: đ }                       SÀN BÁN / tấm — CHỈ ADMIN thấy
thicknesses  [{ id, name, percent, sizeIds[] }]  độ dày: % phụ thu + khổ được tick
```

Quy tắc:

1. **Số lượng tra bậc = số thành phẩm** (`productQuantity`), mỗi sản phẩm ép 1 tấm.
2. Nhân viên chọn **độ dày** rồi chọn **khổ** trong các khổ admin đã tick cho độ dày đó —
   chọn thủ công, không gợi ý theo kích thước.
3. **Giá khách** = `đơn giá(khổ, bậc) × (1 + percent/100) × SL`, cộng vào `baseCustomerCost`
   (phụ thu nhiều nội dung áp lên như các gia công khác). Hiện 1 dòng trong card "Giá".
4. **Giá tối thiểu** = `minPrice[khổ] × (1 + percent/100) × SL` là giá bán sàn: ResultPanel
   cộng **thẳng** vào "🏆 Giá Tối Thiểu" (panel, thanh dính, cột bảng so sánh) **sau** khi nhân
   biên lợi nhuận. Nhân viên không bao giờ thấy.
5. Chọn độ dày mà **chưa chọn khổ** (hoặc khổ không được tick): tiền ép = 0, cảnh báo vàng ở
   InputPanel + ResultPanel, chuỗi "Copy quy cách" ghi `ép plastic 80 mic (CHƯA CHỌN khổ)`.
6. `plasticThickness: 'none'` (mặc định) ⇒ không thay đổi bất kỳ giá nào — 128 golden test cũ
   phải xanh.
7. Ép plastic độc lập với cán màng (chọn được cả hai).

## Bồi thành phẩm (config v1.5.0)

Khi bồi, **mỗi tờ giấy chỉ in được 1 mặt** — in xong mới dán chồng lên nhau. Nên:

```txt
tờ IN mỗi bộ     = số mặt in của thành phẩm   (1 hoặc 2)
tờ TRẮNG mỗi bộ  = số lớp − số mặt in          (không bao giờ âm)
trang in (click) = KHÔNG ĐỔI
```

| Kiểu bồi | Số mặt in | Tờ IN | Tờ TRẮNG |
|---|---|---|---|
| 2 lớp (`yes`) | 1 mặt | 1 | 1 |
| 2 lớp (`yes`) | 2 mặt | 2 | 0 |
| 3 lớp (`3_lop`) | 1 mặt | 1 | 2 |
| 3 lớp (`3_lop`) | 2 mặt | 2 | 1 |

Trang in không đổi vì **2 tờ × 1 mặt = 2 lượt in, đúng bằng 1 tờ × 2 mặt**. Chỉ số tờ
giấy tăng. Luật ở `src/modules/small-print/engine/mounting.js`, dùng chung engine + 2
panel + jobSpec.

Tờ trắng tính theo **loại giấy chọn riêng** (`params.blankPaperType`, index vào
`PAPER_STOCK_DATA`), giá khách = giá vốn × `blankPaperMarkup` (mặc định 2). Màn nhập liệu
chỉ cho chọn giấy `pricingModel === 'ream'` — giấy mỹ thuật cần gõ giá tay và ô đó đang
gắn với *giấy in*, mượn lại là định giá lớp lót sai.

**Công bồi** đếm theo **số TỜ IN** (1 bộ bồi = 1 tờ in, bất kể mấy lớp), không theo số sản
phẩm. Hai kiểu có **bảng bậc riêng**, thêm/xoá bậc được trong Cài Đặt.

### Ba thay đổi giá so với trước v1.5.0

1. **Bồi 2 lớp 1 mặt đắt hơn**: trước đây tờ giấy lót không tính đồng nào.
2. **Bồi + 2 mặt mới báo đúng được**: trước đây chọn bồi là ô "Số mặt in" bị khoá cứng
   về 1 mặt, nên đơn bồi thành phẩm 2 mặt vừa thiếu nửa tiền giấy vừa thiếu nửa tiền in.
3. **Cách xếp tờ in có thể đổi**: giấy nay nặng ký hơn trong tổng chi phí, nên thuật toán
   chọn phương án xếp (`costPerProduct`) có thể chọn khổ cắt khác. Nhân **trước** khi chọn
   phương án là cố ý — chọn theo cơ cấu giá 1 lớp rồi mới nhân là tối ưu nhầm bài toán.

### Những chỗ CỐ Ý không nhân

- `totalPaperSurcharge` tính theo **trang in** (`customerSurcharge × totalA4Pages`), mà số
  trang in không đổi khi bồi → nhân nữa là **tính hai lần**.
- Cán màng: công thức cũ đã đúng sẵn cho cả 2 kiểu (2 tờ × 1 mặt = 1 tờ × 2 mặt).
- `ART_PAPER_SURCHARGE` là phí xử lý trọn gói → giữ ×1.

Ngược lại, `totalArtPaperCustomerCost` và `paperAdjustment` (chênh lệch giá ream so với
giấy chuẩn) **có** nhân, vì chúng bám theo số tờ lớn phải mua.

### Cái bẫy merge config

`configStorage` merge config đã lưu với mặc định **chỉ ở tầng 1**. `MOUNTING_CONFIG` là key
tầng 1, nên config lưu trước v1.5.0 (chỉ có `yes`) sẽ **nuốt trọn** object mặc định →
`MOUNTING_CONFIG['3_lop']` thành `undefined` và `calculateFinishingCost` trả **0đ trong im
lặng**. `withMountingDefaults()` (`config/mountingDefaults.js`) bơm lại kiểu còn thiếu ở cả
đường localStorage lẫn đường đám mây. Mọi module sau này thêm **subkey** vào key cũ đều
dính bẫy này.

Khoá bởi `tests/golden/small-print.mounting.test.js` (37 case engine + báo khách — trước đó
module **không có test nào** chạy qua bồi), `tests/golden/small-print.config.storage.test.js`,
`tests/components/SettingsPanel.mounting-tiers.test.jsx`,
`tests/components/InputPanel.mounting.test.jsx`, `tests/components/ResultPanel.mounting.test.jsx`.

## Danh mục giấy — thêm / đổi cách tính / ẩn (config v1.6.0)

Admin tự thêm loại giấy và đổi cách tính giá ngay trong Cài Đặt, không phải sửa code.

**⚠ Giấy được nhận diện bằng VỊ TRÍ trong mảng** (`params.paperType = '3'`), không bằng
tên hay mã. Catalogue và Lò xo dùng **chung** `PAPER_STOCK_DATA` này. Hệ quả bắt buộc:

- **Thêm giấy chỉ được NỐI VÀO CUỐI** — chèn giữa sẽ làm mọi giấy phía sau tụt một bậc.
- **Bỏ giấy là đánh dấu `hidden: true`, KHÔNG xoá khỏi mảng.** Xoá thật thì đơn đang mở
  chọn C300 lặng lẽ thành B300, và lan sang cả 2 module kia.

Ẩn **chỉ là chuyện giao diện**: engine vẫn tra theo vị trí nên đơn đang mở ra đúng giá kể
cả khi giấy vừa bị ẩn. Ô chọn luôn **giữ lại giấy đang chọn** dù nó đã ẩn (tham số
`keepIndex` của `visiblePapers`), nếu không ô chọn sẽ không khớp option nào và nhân viên
tưởng đơn đang dùng giấy khác.

Luật ở `src/modules/small-print/config/paperStock.js`, dùng chung Cài Đặt + 4 ô chọn giấy
ở 3 module. Ô "Giấy chuẩn so giá" **cố ý không lọc**: engine tìm giấy chuẩn theo **tên**
nên ẩn không phá nó, và lọc ở đó sẽ tạo ra ô chọn lệch khi admin ẩn chính giấy chuẩn.

Bốn cách tính giá: `ream` (theo ram 500 tờ) · `sqm` (decal cuộn) · `per_sheet` (khổ cố
định, có ô nhập khổ tờ) · `custom` (gõ giá tay từng đơn). Đổi cách tính thì **giữ nguyên
số cũ** — đổi nhầm rồi đổi lại không mất giá.

Schema cố ý **dễ dãi với field giá**: chỉ kiểm kiểu khi field có mặt. Bắt buộc phải có sẽ
khiến một config cũ thiếu field bị loại nguyên khối và admin **mất sạch bảng giá đã sửa**
(`configStorage` thay cả mảng `PAPER_STOCK_DATA`, không merge từng phần tử). Thiếu giá thì
engine bỏ qua giấy đó → báo "không tìm thấy phương án", tức có lỗi **nhìn thấy được** chứ
không ra giá sai.

Khoá bởi `tests/golden/small-print.paper-stock.test.js`,
`tests/components/SettingsPanel.paper-stock.test.jsx`,
`tests/components/PaperSelects.hidden.test.jsx`.

## Giấy khổ cố định — nhiều khổ, mỗi khổ một giá (config v1.7.0)

Giấy `per_sheet` (ví dụ "Decal xi bạc/vàng") khai được **nhiều khổ**, mỗi khổ một giá:

```js
sheetSizes: [
    { w: 33, h: 48, price: 5500 },
    { w: 33, h: 64, price: 7000 },
]
```

Engine thử **hết** các khổ rồi để bảng xếp hạng ở `App.jsx` chọn rẻ nhất — đúng cách giấy
ram đã làm với `COMMON_SHEET_SIZES`. Các khổ khác nhau sống sót qua bước khử trùng lặp vì
khoá gồm `largeSheetName` (`Tờ 33x48`) và `cutSheetSize`.

**Tương thích ngược**: thiếu `sheetSizes` (hoặc mảng rỗng) ⇒ `perSheetVariants` suy ra
**đúng 1 khổ** từ cặp cũ `{ sheetSize, sheetPrice }` ⇒ config đã lưu ra giá không đổi một
đồng. `sheetSizes` là **nguồn đúng**; cặp cũ được màn Cài Đặt ghi **soi gương** theo dòng 1
để máy chưa tải lại bundle (và đường rollback) vẫn báo giá đúng.

**Không thử khổ xoay** (48×33) như giấy ram: tờ khổ cố định là tờ xưởng mua sẵn, nạp máy
một chiều; và mọi khổ thật đều có rộng ≈ 33 = `maxW` của cả 2 máy nên bản xoay bị loại ngay.

### Ba cái bẫy đã xử lý

1. **`perSheetVariants` CỐ Ý không lọc bỏ dòng `w/h = 0`.** Bảng khổ trong Cài Đặt render
   từ chính hàm này, mà ô nhập số commit theo **từng phím** — xoá số để gõ lại là giá trị
   rơi về 0 một nhịp. Lọc ở đây thì dòng đang gõ dở **biến mất ngay dưới con trỏ**. Engine
   tự bỏ qua khổ vô nghĩa (vùng in ≤ 0 ⇒ 0 SP/tờ ⇒ không sinh phương án).
2. **Không ghi `sheetSizes` qua `updateNestedField`.** Hàm đó dựng cấp trung gian bằng
   `{...undefined}` nên khi field chưa tồn tại nó đẻ ra **object `{"0": {...}}` chứ không
   phải mảng** → schema chặn → admin mất nguyên lần sửa. Dùng `editPerSheetSizes` ghi cả mảng.
3. **Quy đổi A4 sai trong im lặng — CHƯA SỬA, chỉ hiển thị.** Mỗi dòng khổ có hiện hệ số
   A4 mà engine sẽ dùng, nhưng **chỉ tô đỏ khi hệ số là null**, tức chỉ bắt được ca khổ cao
   ≤ 21.2cm. Ca thật sự nguy — **cao từ 21.2 đến 48cm mà không có trong bảng quy đổi** —
   trả về một số trông hợp lý (`h / 21`) nên hiện bằng chữ xám bình thường: khổ 33×45 lấy
   `45/21 = 2.143` thay vì bậc 2.4 của xưởng → **hụt ~11% tiền khách, không cảnh báo gì**.
   Đây là lỗi CÓ SẴN (công thức `h/21` áp cho cả giấy thường), việc thêm khổ chỉ làm dễ
   đụng hơn. Khổ an toàn: các mốc có trong bảng (21.2 · 28.3 · 33 · 35 · 42.8 · 47 · 48 ·
   65 · 109) và **mọi khổ cao hơn 48cm** (nhánh > 48 khớp đúng bậc của máy).

### Luật ưu tiên khổ ≤48cm vẫn còn

`App.jsx` chọn `bestPreferredOption = phương án rẻ nhất có cutSheetH ≤ 48`. Khổ cao hơn
48cm **chỉ được tự chọn khi không khổ nào ≤48 in được** — vẫn hiện trong Bảng So Sánh để
bấm chọn tay. Lý do ghi ở `docs/engine/small-print-pricing.md`: "máy in KTS chạy ổn định
nhất ≤48cm". Đây là **lựa chọn vận hành**, không phải giới hạn máy (máy khai `maxH` 120cm
và 76cm), và chủ xưởng đã quyết định giữ.

⚠ **Catalogue và Lò xo cũng gọi `calculatePerSheetOptions`** trên cùng bảng giấy — thêm khổ
là thêm phương án ở cả 3 module.

Khoá bởi `tests/golden/small-print.per-sheet-sizes.test.js` và phần "Bảng khổ" trong
`tests/components/SettingsPanel.paper-stock.test.jsx`.
## Cảnh báo "nghịch bậc" trong Bảng Giá Khách Hàng

**Nghịch bậc** = khách đặt **thêm** một trang lại **trả ít hơn**, vì đơn giá tụt xuống bậc
sau nhanh hơn số trang tăng lên. Bảng giá mặc định đang có **7 chỗ như vậy**:

| Vách bậc | Cuối bậc trước | Đầu bậc sau | Rẻ đi |
|---|---|---|---|
| 5 → 6 | 50.000đ | 48.000đ | 2.000đ |
| 79 → 80 | 250.000đ (trọn gói) | 240.000đ | 10.000đ |
| 559 → 560 | 1.250.000đ (trọn gói) | 1.232.000đ | 18.000đ |
| **1.000 → 1.001** | **2.200.000đ** | **1.801.800đ** | **398.200đ** |
| 2.000 → 2.001 | 3.600.000đ | 3.501.750đ | 98.250đ |
| 3.000 → 3.001 | 5.250.000đ | 5.101.700đ | 148.300đ |
| 4.500 → 4.501 | 7.650.000đ | 7.516.670đ | 133.330đ |

Đây là **nguyên nhân thật** của than phiền "khổ 33×35 báo giá thấp hơn khổ 33×48": phần
mềm chọn khổ đúng, nhưng hai khổ rơi vào hai bậc khác nhau của bảng giá này.

### Luật soát

`auditCustomerPriceTiers()` trong
[`config/priceTierAudit.js`](../../src/modules/small-print/config/priceTierAudit.js) so
**hai điểm sát vách** của mỗi cặp bậc kề nhau, bám đúng công thức `engine/quote.js`:

```txt
per_page → tổng = số trang × tier.print
package  → tổng = tier.print (phẳng)

tổng tại tier.max của bậc trước  >  tổng tại tier.min của bậc sau  ⇒ NGHỊCH
```

Ba nhánh cố ý **im lặng**:

- Bậc cuối (`max` = Infinity, hoặc `null` sau khi config đi qua JSON).
- **Một trong hai đơn giá ≤ 0** — ô nhập số commit theo *từng phím*, không chặn thì bảng
  nháy đỏ ngay dưới con trỏ admin mỗi lần sửa giá.
- Bằng nhau đúng vách — đó là bảng giá liền mạch, không phải lỗi.

Mảng xếp lộn xộn vẫn soát đúng (sắp một bản sao theo `min`), nhưng cảnh báo trả về **vị
trí gốc** để gắn đúng dòng đang hiện.

### Phạm vi — chỉ cột "Giá in"

Cột **Giá cán màng** cố ý không soát: tiền cán tính trên **số tờ vật lý** (không nhân số
mặt in) rồi nhân tiếp số mặt cán và hệ số loại màng. Cùng một bảng giá, đơn in 1 mặt và
đơn in 2 mặt cho kết luận nghịch/không nghịch **khác nhau** — một cảnh báo chỉ đúng nửa số
đơn thì tệ hơn là không có. Giới hạn này ghi thẳng dưới bảng trong Cài Đặt.

### Thuần hiển thị

Không chặn Lưu, không sửa giá, không đụng `quote.js`. Bậc nghịch là **lựa chọn kinh doanh
hợp lệ** (cố ý phá giá ở mốc 1.000 trang chẳng hạn) — phần mềm chỉ có bổn phận chỉ ra.
Cảnh báo tính từ `localConfig` nên cập nhật **theo từng phím gõ**: đó là thước đo trong
lúc sửa giá, không phải báo cáo sau khi sửa.

Khoá bởi `tests/golden/small-print.price-tier-audit.test.js` và
`tests/components/SettingsPanel.price-tier-warning.test.jsx`.
