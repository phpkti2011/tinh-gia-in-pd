 q  # In KT[text](small-print-pricing.md)S Khổ Nhỏ — Công thức tính giá (Full reference)

> Module: `small-print` · Cập nhật: 2026-06-02
>
> Tài liệu này giải thích **toàn bộ** cách app tính giá cho phần "In KTS Khổ Nhỏ" — từ params admin nhập, qua engine JavaScript, cho tới giá bán khách cuối cùng. Ai đọc xong file này cũng có thể jk tự tính bằng tay khớp với app.
>
> **Không sửa số nào trong tài liệu.** Muốn đổi giá phải sửa `defaultConfig.js` hoặc lưu qua Settings (Supabase).

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Input params (params admin nhập)](#2-input-params)
3. [Config schema](#3-config-schema)
4. [Engine functions](#4-engine-functions)
    - 4.1 [Xếp hình (layout.js)](#41-xếp-hình--layoutjs)
    - 4.2 [Định giá cơ bản (pricing.js)](#42-định-giá-cơ-bản--pricingjs)
    - 4.3 [Gia công (finishing.js)](#43-gia-công--finishingjs)
    - 4.4 [Duyệt phương án (options.js)](#44-duyệt-phương-án--optionsjs)
    - 4.5 [Chuyển sang giá bán (quote.js)](#45-chuyển-sang-giá-bán--quotejs)
5. [Kịch bản end-to-end](#5-kịch-bản-end-to-end)
6. [Magic numbers & edge cases](#6-magic-numbers--edge-cases)
7. [Bảng giá bán khách (customer tiers)](#7-bảng-giá-bán-khách)
8. [Bug lịch sử đã fix](#8-bug-lịch-sử-đã-fix)
9. [Tham chiếu file](#9-tham-chiếu-file)
10. [Phụ lục — Full `defaultConfig.js` dump](#10-phụ-lục--full-defaultconfigjs-dump)

---

## 1. Tổng quan

### 1.1 Kiến trúc 4 lớp

```
┌─────────────────────────────────────────────────────────────────┐
│  UI  (React components)                                         │
│  ─ InputPanel   → thu params (16 field)                         │
│  ─ ResultPanel  → hiển thị results                              │
│  ─ SettingsPanel→ admin sửa config, lưu vào Supabase            │
└─────────────────────────────────────────────────────────────────┘
                            │  params
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  App.jsx  ·  SmallPrintModule                                   │
│  ─ debounce 150 ms → calculateAll()                             │
│  ─ chọn engine branch theo pricingModel:                        │
│      sqm      → calculateDecalOptions                           │
│      per_sheet→ calculatePerSheetOptions                        │
│      ream/cst → calculatePaperOptions                           │
│  ─ áp finishing (holePunch/creasing/mounting), dieCutting, foil │
│  ─ gọi calculateCustomerQuote → giá bán khách                   │
└─────────────────────────────────────────────────────────────────┘
                            │  results + quote
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Engine (src/modules/small-print/engine/)                       │
│  ─ layout.js   xếp hình, cắt tờ                                 │
│  ─ pricing.js  margin, variable-data, content surcharge, tier  │
│  ─ finishing.js lamination, dieCut, foil                        │
│  ─ options.js  duyệt phương án (giá vốn/SP)                    │
│  ─ quote.js    giá vốn → giá bán khách (qua A4 pages)          │
└─────────────────────────────────────────────────────────────────┘
                            │  reads
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│  Config (src/modules/small-print/config/defaultConfig.js)       │
│  Bảng giấy, máy in, cán màng, cấn/bấm/bồi, bế, ép kim, tier    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Debounce 150ms

`SmallPrintModule` không tính ngay khi user gõ. Dùng `useEffect` với `setTimeout(150)` để đợi user gõ xong → mới chạy `calculateAll()`. Xem [App.jsx:327-335](../../src/App.jsx#L327-L335).

### 1.3 Concept giá vốn vs giá bán

- **Giá vốn (`costPerProduct`)** = chi phí thực tế thợ + vật tư. Chỉ admin nhìn thấy trong tab "Giá tối thiểu" khi `minPrice ≥ 300.000đ`.
- **Giá bán khách (`totalCustomerCost`)** = quy đổi qua **số trang A4** rồi áp `CUSTOMER_PRICE_TIERS` (bảng giá bán chuẩn). Đây là con số quote cho khách.

Panel "Giá Tối Thiểu" hiển thị 9 field: máy in, khổ giấy lớn, khổ giấy cắt, giá vốn/SP, vùng in máy, vùng in SP, **tổng trang A4**, **đơn giá TT/trang** (= `minPrice / totalA4Pages`), SP/tờ in. Xem [ResultPanel.jsx:142-197](../../src/components/smallprint/ResultPanel.jsx#L142-L197).

Không phải "giá vốn × margin" đơn giản — quy đổi A4 tạo ra 1 abstraction tách rời khách với chi tiết vật tư/máy.

---

## 2. Input params

Params admin nhập ở [InputPanel.jsx](../../src/components/smallprint/InputPanel.jsx). Full list trong `SmallPrintModule` state ở [App.jsx:130-158](../../src/App.jsx#L130-L158).

| # | Field | Ý nghĩa | Default | Ghi chú |
|---|---|---|---|---|
| 1 | `paperType` | Index vào `PAPER_STOCK_DATA[]` | `'3'` (C300) | Quyết định `pricingModel` |
| 2 | `artPaperPrice` | Giá 1 tờ giấy mỹ thuật | 10000 | Chỉ dùng khi `pricingModel='custom'` |
| 3 | `productW` | Chiều rộng SP (cm) | 9 | |
| 4 | `productH` | Chiều cao SP (cm) | 5.5 | |
| 5 | `bleed` | Rìa bleed 1 cạnh (cm) | 0.15 | `productWithBleed = product + bleed*2` |
| 6 | `productQuantity` | Số lượng SP | 500 | Đơn vị con/tờ |
| 7 | `printSides` | Số mặt in | `'2'` | Ảnh hưởng click + A4 pages |
| 8 | `printContents` | Số nội dung khác nhau | 1 | ≥2 → phụ thu (xem 4.2) |
| 9 | `variableData` | Có in data biến đổi? | `'no'` | `'yes'` → cộng cost thêm |
| 10 | `largeSheetSelector` | Chọn khổ tờ lớn (65×86 / 79×109 / custom) | `'0'` | Chỉ áp cho `ream`/`custom` |
| 11 | `customSheetW/H` | Kích thước tờ lớn tùy chọn | 70×100 | Khi selector='custom' |
| 12 | `mountingType` | Bồi carton/formex? | `'none'` | `'yes'` → cost bồi |
| 13 | `laminationType` | Cán màng | `'none'` | `'laminate_1'` (1 mặt) / `'laminate_2'` (2 mặt) |
| 14 | `creasingType` | Cấn (fold) | `'none'` | `'co_can'` |
| 15 | `holePunchingType` | Bấm lỗ | `'none'` | `'1_vi_tri'` / `'2_vi_tri'` |
| 16 | `dieCuttingType` | Bế | `'none'` | `'mold'` (khuôn) / `'digital'` (bế máy) |
| 17 | `moldType` | Kiểu khuôn bế | `'simple'` | Chỉ khi `dieCuttingType='mold'`. Values: `simple/envelope/box/bag/tag` |
| 18 | `tagHasHole` | Tag có lỗ treo? | `false` | Chỉ `moldType='tag'` |
| 19 | `printColorMode` | Số màu | `'4color'` | `'1color'` (chỉ C6085) |
| 20 | `foilStamping` | Có ép kim? | `'none'` | `'yes'` → cost ép kim |
| 21 | `foilMolds` | Danh sách khuôn ép kim | `[{w:9,h:5.5,special:false,impressions:1}]` | Mỗi khuôn `{w,h,special,impressions}` — xem `calculateFoilStamping` |

`spacing` tự tính từ `dieCuttingType`, không phải input:

| dieCuttingType | spacing (cm) |
|---|---|
| `none` | 0 |
| `mold` | 0.4 (4mm khe khuôn) |
| `digital` | 0.6 (6mm khe dao) |

Xem [App.jsx:200-202](../../src/App.jsx#L200-L202).

---

## 3. Config schema

Full config ở [defaultConfig.js](../../src/modules/small-print/config/defaultConfig.js). 20 top-level key. Section này giải thích ý nghĩa business + shape từng key.

### 3.1 `PROFIT_MARGIN_TIERS`

Bậc margin theo giá vốn. Chỉ dùng ở "Giá tối thiểu" panel (admin only) để tính giá tối thiểu để có lời.

```js
[
  { max_cost: 200000,   margin: 0.75 },  // ≤200k → margin 75%
  { max_cost: 500000,   margin: 0.70 },
  { max_cost: 1000000,  margin: 0.65 },
  { max_cost: 2000000,  margin: 0.60 },
  { max_cost: Infinity, margin: 0.55 },  // >2M → 55%
]
```

Giá tối thiểu (min-price) = `finalTotalCost × (1 + margin)`. Trong đó `finalTotalCost` = giá vốn tổng đơn hàng đã cộng phụ thu nhiều nội dung (nếu có). Nhỏ hơn con số này là lỗ. Xem [ResultPanel.jsx:107](../../src/components/smallprint/ResultPanel.jsx#L107).

### 3.2 `PRINTABLE_AREA_CONFIG`

Margin trừ khỏi tờ in để ra "vùng in" (printable area). Máy KTS luôn có mép trắng.

```js
{
  digital_cut_margin_total: 1.8,   // bế digital cần margin lớn (dao ăn)
  regular_cut_width_margin_total: 0.8,
  vk_point_height_margin: 0.8,     // tại chiều cao chuẩn (VK point) — margin lớn
  non_vk_point_height_margin: 0.1, // ngoài VK point — margin nhỏ
  custom_width_margin: 0.8,        // tờ oversized custom
  custom_height_margin: 1.0,
}
```

"VK point" = mép cắt chuẩn của máy in (VK = "vach kẻ" — line marker) tại các chiều cao {33, 48, 76, 92, 120} cm (xem `PRINTER_CONFIG[*].vkPoints`).

### 3.3 `ART_PAPER_SURCHARGE`

Phụ thu **80.000đ** cộng vào giá bán khách khi dùng giấy mỹ thuật (`pricingModel='custom'`). Cover chi phí đặt giấy lẻ + trả hàng chậm.

### 3.4 `PRINTER_CONFIG`

Danh sách máy in KTS. 2 máy:

```js
{
  C2060: {
    name: 'C2060',
    maxW: 33.0, maxH: 120.0,       // khổ tối đa 33×120 cm
    clickTiers: [                  // click = số cú in trên máy
      { maxH: 33,  clicks: 1 },
      { maxH: 48,  clicks: 2 },
      { maxH: 76,  clicks: 3 },
      { maxH: 92,  clicks: 4 },
      { maxH: 120, clicks: 5 },
    ],
    vkPoints: [33, 48, 76, 92, 120],
    prices: { '4color': 750 },     // 750đ / click (in 4 màu)
  },
  C6085: {
    name: 'C6085',
    maxW: 33.0, maxH: 76.0,        // C6085 CHỈ in được tối đa 76cm (khác C2060 lên 120cm)
    clickTiers: [                  // C6085 tiết kiệm click ở khổ nhỏ hơn
      { maxH: 35, clicks: 1 },
      { maxH: 48, clicks: 2 },
      { maxH: 76, clicks: 3 },
    ],
    vkPoints: [35, 48, 76],
    prices: { '4color': 650, '1color': 400 },
  },
}
```

**Click** = 1 nhịp máy in kéo qua. Tờ 21×29 → 1 click; 29×42 → 2 clicks. Máy tính `clicks × clickPrice × printSides`.

**Lưu ý C6085 vs C2060:** C2060 chạy được tờ dài đến **120cm** (5 clicks max), C6085 chỉ tới **76cm** (3 clicks max). Đơn hàng cần in dài hơn 76cm → engine chỉ trả phương án C2060.

### 3.5 `LAMINATION_CONFIG`

Cán màng: máy chỉ có 1 khổ **rộng 32 cm**, tính giá theo mét dài.

```js
{ WIDTH: 32, PRICE_PER_METER: 2200 }  // 2200đ/m
```

Nếu `actualPrintW > 32cm` → app từ chối (không cán được, warning đỏ).
Nếu `actualPrintW == 32cm` (khớp cạnh) → warning cam "dễ hụt".

### 3.6 `VARIABLE_DATA_CONFIG`

Phụ thu khi có **in data biến đổi** (mỗi tờ 1 nội dung khác nhau, vd tem serial number).

```js
{
  price_500: 200000,                  // ≤500 tờ = 200k trọn gói
  price_1000: 300000,                 // 501-1000 = 300k
  price_over_1000_base: 500000,       // >1000: base 500k
  price_over_1000_progressive: 100000,// + 100k mỗi bậc
  progressive_step: 1000,             // 1 bậc = 1000 tờ
}
```

Vd 2500 tờ → 500.000 + floor((2500-1001)/1000) × 100.000 = 500.000 + 1 × 100k = **600.000đ**.

### 3.7 `PRINT_CONTENT_CONFIG`

Phụ thu khi in **nhiều nội dung khác nhau** (vd 10 mẫu name card khác nhau chung 1 file).

```js
{
  single_content_surcharge: 0.20,     // 1 nội dung/tờ (mỗi SP 1 mẫu) → +20%
  tiers: [
    { min: 4,  max: 9,        surcharge: 0.10 },  // 4-9 nội dung → +10%
    { min: 10, max: 14,       surcharge: 0.20 },  // 10-14 → +20%
    { min: 15, max: 25,       surcharge: 0.30 },  // 15-25 → +30%
    { min: 26, max: Infinity, surcharge: 0.35 },  // 26+ → +35%
  ],
}
```

**Gap có ý đồ ở `printContents ∈ {2, 3}`**: 2-3 nội dung khác nhau → **không phụ thu** (giữ ưu đãi cho khách in ít mẫu). Engine `find(min ≤ contentCount ≤ max)` không match tier nào → surcharge = 0.

Đặc biệt: nếu `productQuantity / printContents ≈ 1` (mỗi nội dung đúng 1 con) → **luôn +20%** bất kể số lượng nội dung.

### 3.8 `HOLE_PUNCHING_CONFIG`, `CREASING_CONFIG`, `MOUNTING_CONFIG`

3 loại gia công này (bấm lỗ / cấn / bồi carton) có cấu trúc giống nhau. Với mỗi loại, config chứa **2 bảng giá riêng biệt**:

- **`cost_tiers`** — giá vốn thợ (tiệm phải bỏ ra bao nhiêu tiền).
- **`customer_tiers`** — giá bán khách (báo với khách bao nhiêu tiền).

Hai bảng tách rời để tiệm chủ động điều chỉnh biên lợi nhuận từng khoản gia công.

Mỗi bảng có nhiều **bậc** chia theo số lượng (`max_qty`). Bậc nào có `max_qty >= qty` → áp bậc đó. Trong 1 bậc có 2 kiểu tính giá:

| `type` | Cách tính | Ý nghĩa |
|---|---|---|
| `package` | Cost = `price` (cố định) | Trọn gói: bấm lỗ ≤99 con → **cứ đưa 40.000đ** bất kể là 10 hay 99 con |
| `per_piece` | Cost = `qty × price` | Theo con: bấm lỗ >500 con → **125đ/con**, 800 con = 100.000đ |

**Ví dụ hole-punching 1 vị trí** (từ config default):

```js
'1_vi_tri': {
  cost_tiers: [
    { max_qty: 99,       price: 40000,  type: 'package' },   // 1–99 con: 40k trọn gói
    { max_qty: 500,      price: 75000,  type: 'package' },   // 100–500 con: 75k trọn gói
    { max_qty: Infinity, price: 125,    type: 'per_piece' }, // 501+ con: 125đ/con
  ],
  customer_tiers: [
    { max_qty: 99,       price: 80000,  type: 'package' },   // báo khách gấp đôi vốn
    { max_qty: 500,      price: 150000, type: 'package' },
    { max_qty: Infinity, price: 250,    type: 'per_piece' },
  ],
}
```

Vd bấm 300 con → tier `max:500 package` → vốn = **75.000đ**, báo khách = **150.000đ**.
Vd bấm 800 con → tier `max:Infinity per_piece` → vốn = 800 × 125 = **100.000đ**, báo khách = 800 × 250 = **200.000đ**.

**Các key hiện tại (mỗi loại có 1 hoặc 2 sub-type):**

| Config | Sub-type keys | Nghĩa |
|---|---|---|
| `HOLE_PUNCHING_CONFIG` | `'1_vi_tri'`, `'2_vi_tri'` | Bấm 1 lỗ / bấm 2 lỗ |
| `CREASING_CONFIG` | `'co_can'` | Có cấn (fold) |
| `MOUNTING_CONFIG` | `'yes'` | Bồi carton/formex |

**Lưu ý dev (TASK-0008.6):** engine `calculateFinishingCost` nhận **INNER config** (`config.X_CONFIG[type]`), không phải outer object. Xem [pricing.js:54](../../src/modules/small-print/engine/pricing.js#L54) comment.

### 3.9 `DIE_CUTTING_MOLD_COST_CONFIG`

Chi phí làm khuôn bế theo loại khuôn (chỉ tính 1 lần / đơn hàng):

```js
{
  simple: {
    base_size: 21,        // khuôn ≤21×21 cm = base
    base_price: 120000,   // giá base 120k
  },
  // ...>base → moldCost = base_price/(base²) × (largerW × largerH)
  envelope: { threshold_area: 960,  small_price: 160000, large_price: 220000 },
  box:      { threshold_area: 336,  small_price: 200000, large_price: 300000 },
  bag:      { threshold_area: 1376, small_price: 300000, large_price: 500000 },
  tag: {
    threshold_w: 10, threshold_h: 6,   // dưới ngưỡng = small tag → +25% labor
    price_per_cm2: 700,                 // 700đ/cm² × diện tích tổng khuôn
    hole_price: 10000,                  // +10k/lỗ khi tagHasHole
  },
}
```

Envelope/box/bag đơn giản: so `productW × productH` với `threshold_area` → chọn small hoặc large.

Tag phức tạp: khuôn dán được **nhiều tag** trên `pressW=32.2` × `numDown=3` → `numOnMold = floor((32.2+0.4)/(productW+0.4)) × 3`, moldCost = `productW × productH × numOnMold × 700`.

### 3.10 `DIE_CUTTING_LABOR_CONFIG`

Công bế (tính theo số tờ in), package tier:

```js
{
  cost_tiers: [
    { max_qty: 500,  price: 100000, type: 'package' },
    { max_qty: 1200, price: 175000, type: 'package' },
    { max_qty: Infinity, price: 225000, type: 'package' },
  ],
  customer_tiers: [ ...×2 ... ],
  decal_surcharge: 0.25,      // decal → +25% công (bế khó)
  small_tag_surcharge: 0.25,  // tag nhỏ → +25%
}
```

### 3.11 `DIGITAL_DIE_CUTTING_CONFIG`

Bế digital (máy laser cutter). Không cần khuôn → không có mold. Chỉ có labor tier:

```js
{
  cost_tiers: [
    { max_qty: 10,   price: 50000,  type: 'package' },
    { max_qty: 100,  price: 90000 },
    { max_qty: 300,  price: 125000 },
    { max_qty: 600,  price: 175000 },
    { max_qty: 1200, price: 250000 },
  ],
  customer_tiers: [ ...×2 ... ],
}
```

Note: không có bậc `max_qty: Infinity` — >1200 tờ engine trả 0 (không cover), thực tế admin phải đổi sang mold.

### 3.12 `PAPER_STOCK_DATA`

Bảng giấy — array 18 item. Mỗi item:

```js
{
  name: 'C300',                   // hiển thị
  pricePerReam: 2200000,          // 500 tờ = 2.2M
  pricingModel: 'ream',           // ream = chia 500 tờ
  description: '...',
  customerSurcharge: 0,           // phụ thu bán khách (đ/A4)
}
```

`pricingModel`:

| Model | Nghĩa | Ví dụ | Engine branch |
|---|---|---|---|
| `ream` | Giá theo ram 500 tờ, scale theo diện tích so với 65×86 | C150, C200, C300, B300, F250, F300, I300 | `calculatePaperOptions` |
| `custom` | Giấy mỹ thuật, giá 1 tờ nhập tay (`artPaperPrice`) | Giấy mỹ thuật | `calculatePaperOptions` |
| `sqm` | Giá theo m² | 8 loại Decal (nhựa/giấy/xi/7 màu…) | `calculateDecalOptions` |
| `per_sheet` | Giá theo tờ cố định | Decal xi bạc 33×48 | `calculatePerSheetOptions` |

`customerSurcharge` = phụ thu (đ/A4) cộng vào giá bán khách cho loại decal đặc biệt.

Full 18 item xem [Phụ lục](#10-phụ-lục--full-defaultconfigjs-dump).

### 3.13 `STANDARD_LARGE_SHEET_SIZES`

Giấy ream chỉ có 2 khổ chuẩn:

```js
[
  { name: 'Khổ 65 x 86 cm', w: 65, h: 86 },   // base — reference cho scaling
  { name: 'Khổ 79 x 109 cm', w: 79, h: 109 },
]
```

**Khổ 65×86 là base**: `pricePerReam / 500` = giá tờ base. Khổ 79×109 thì scale theo tỷ lệ diện tích.

### 3.14 `ART_PAPER_LARGE_SHEET_SIZES`

Giấy mỹ thuật khổ đa dạng + có tùy chọn custom:

```js
[
  { name: 'Khổ 79 x 109 cm', w: 79, h: 109 },
  { name: 'Khổ 72 x 102 cm', w: 72, h: 102 },
  { name: 'Khổ 70 x 100 cm', w: 70, h: 100 },
  { name: 'Tùy chọn', w: 'custom', h: 'custom' },  // → dùng customSheetW/H
]
```

### 3.15 `COMMON_SHEET_SIZES`

Các khổ **tờ in** (sau khi cắt từ tờ lớn) mà máy in KTS chạy được. Engine duyệt hết 13 khổ này để tìm phương án rẻ nhất:

```js
[
  { w: 32.2, h: 21.2 },   // A5
  { w: 32.2, h: 28.3 },   // A4
  { w: 32.2, h: 33.0 },
  { w: 32.2, h: 35.0 },
  { w: 32.2, h: 42.8 },   // ~A3
  { w: 32.2, h: 47.0 },
  { w: 32.2, h: 48.0 },
  { w: 33.0, h: 48.0 },
  { w: 32.2, h: 65.0 },
  { w: 33.0, h: 109.0 },  // full khổ lớn
  { w: 39.5, h: 54.5 },
  { w: 43.0, h: 65.0 },
  { w: 54.5, h: 79.0 },
]
```

### 3.16 `DECAL_SHEET_SIZES`

3 khổ dành riêng cho decal (`pricingModel='sqm'`):

```js
[
  { w: 32.2, h: 33.0 },
  { w: 32.2, h: 35.0 },
  { w: 33.0, h: 48.0 },
]
```

### 3.17 `A4_CONVERSION_RATES`

Bảng quy đổi từ chiều cao tờ in → số trang A4 tương đương (cho customer quote).

```js
{
  21.2: 1,       // A5 = 1 A4
  28.3: 1.35,    // A4
  33.0: 1.5,
  35.0: 1.5,
  42.8: 2,       // A3 = 2 A4
  47.0: 2.4,
  48.0: 2.4,
  65.0: 3.0,
  109.0: 5.2,
}
```

Ngoài bảng:
- `pressH > 48`: dùng hằng số phân đoạn (3/4/5 A4/tờ) theo range chiều cao.
- `21.2 < pressH ≤ 48` và không có key: `conversion = pressH / 21.0`.
- `pressH ≤ 21.2` mà không có key: **error** (không quote được).

### 3.18 `EP_KIM_CONFIG`

Config ép kim (foil stamping) — công thức phức tạp nhất:

```js
{
  pricePerArea: 5,           // 5đ/cm² area
  moldPerArea: 2000,         // 2000đ/cm² làm khuôn
  minPriceNormal: 400,       // min giá/dập bình thường
  minPriceSpecial: 700,      // min giá/dập nhũ đặc biệt
  minTotalSmall: 250000,     // min tổng khi SP nhỏ
  shippingSmall: 50000,      // ship khuôn nhỏ
  minTotalLarge: 300000,     // min tổng khi SP lớn
  shippingLarge: 100000,     // ship khuôn lớn
  thresholdW: 20,            // small vs large: W ≤ 20
  thresholdH: 14,            //                 H ≤ 14
  foilPadWidth: 1,           // padding chiều rộng nhũ (cm)
  foilPadLength: 0.7,        // padding chiều dài nhũ (cm)
  foilRollLengthM: 110,      // 1 cuộn nhũ = 110m
  extraImpressionRate: 0.5,  // phần công mỗi lần ép THÊM trên cùng khuôn (0.5 = 50%)
}
```

### 3.19 `CUSTOMER_PRICE_TIERS`

Bảng giá bán khách theo số **trang A4**. 14 bậc:

```js
[
  { min: 1,    max: 5,        print: 10000,   laminate: 8000,  type: 'per_page' },
  { min: 6,    max: 10,       print: 8000,    laminate: 5000,  type: 'per_page' },
  { min: 11,   max: 15,       print: 80000,   laminate: 50000, type: 'package' },
  { min: 16,   max: 50,       print: 5000,    laminate: 3000,  type: 'per_page' },
  { min: 51,   max: 79,       print: 250000,  laminate: 50000, type: 'package' },
  { min: 80,   max: 100,      print: 3000,    laminate: 1000,  type: 'per_page' },
  { min: 101,  max: 119,      print: 300000,  laminate: 60000, type: 'package' },
  { min: 120,  max: 500,      print: 2500,    laminate: 800,   type: 'per_page' },
  { min: 501,  max: 559,      print: 1250000, laminate: 250000,type: 'package' },
  { min: 560,  max: 1000,     print: 2200,    laminate: 600,   type: 'per_page' },
  { min: 1001, max: 2000,     print: 1800,    laminate: 250,   type: 'per_page' },
  { min: 2001, max: 3000,     print: 1750,    laminate: 250,   type: 'per_page' },
  { min: 3001, max: 4500,     print: 1700,    laminate: 250,   type: 'per_page' },
  { min: 4501, max: Infinity, print: 1670,    laminate: 250,   type: 'per_page' },
]
```

Xen kẽ `per_page` (số trang × price) và `package` (trọn gói) — cấu trúc lịch sử của tiệm in. Không được tự đổi thứ tự / bỏ bậc, sẽ break quote.

---

## 4. Engine functions

Toàn bộ engine ở `src/modules/small-print/engine/`. Có 5 file:

| File | Vai trò |
|---|---|
| [layout.js](../../src/modules/small-print/engine/layout.js) | Xếp hình, cắt tờ (geometric) |
| [pricing.js](../../src/modules/small-print/engine/pricing.js) | Margin, variable-data, content surcharge, tier lookup |
| [finishing.js](../../src/modules/small-print/engine/finishing.js) | Lamination, die cutting, foil |
| [options.js](../../src/modules/small-print/engine/options.js) | Duyệt phương án theo pricing model |
| [quote.js](../../src/modules/small-print/engine/quote.js) | Cost → giá bán khách (qua A4) |

Cả 5 là **pure functions** — không IO, không React state. `src/utils/calculator.js` và `src/utils/customerQuote.js` chỉ là **shim** re-export cho backward compat.

### 4.1 Xếp hình — `layout.js`

#### `getClicks(h, printer)`

Tra số clicks (nhịp máy in) theo chiều cao tờ.

```js
export function getClicks(h, printer) {
    for (const tier of printer.clickTiers) {
        if (h <= tier.maxH) return tier.clicks;
    }
    return Infinity;
}
```

Vd C2060 in tờ 21×32 → h=32 ≤ 33 → **1 click** → 750đ. Tờ 21×47 → h=47 ≤ 48 → **2 clicks** → 1.500đ.

#### `getPrintableArea(w, h, printer, isDigitalCutting, config, isCustom)`

Trừ margin ra vùng in thực. Có 4 branch:

```js
if (isCustom) {                        // custom oversized
    printableW -= cfg.custom_width_margin;   // -0.8
    printableH -= cfg.custom_height_margin;  // -1.0
} else if (isDigitalCutting) {         // bế digital
    printableH -= cfg.digital_cut_margin_total;  // -1.8
    printableW -= cfg.digital_cut_margin_total;  // -1.8
} else {                               // in thường
    if (vkPoint match h) printableH -= vk_h;       // -0.8 tại VK
    else                 printableH -= non_vk_h;   // -0.1 ngoài VK
    printableW -= regular_w;                        // -0.8
}
```

Vd tờ 32.2×48, C2060, không bế digital: h=48 = vkPoint → printableH = 48 - 0.8 = 47.2; printableW = 32.2 - 0.8 = 31.4. Vùng in **31.4 × 47.2 cm**.

#### `calculateImposition(areaW, areaH, prodW, prodH, spacing)`

Xếp SP lên vùng in, thử cả xoay 90°, chọn phương án đông SP hơn.

```
Case 1 (thẳng):        Case 2 (xoay):
┌─────────────────┐    ┌─────────────────┐
│ [prod] [prod]   │    │ [prod↺]         │
│ [prod] [prod]   │    │ [prod↺]         │
│ [prod] [prod]   │    │ [prod↺]         │
└─────────────────┘    └─────────────────┘
   fitW1 × fitH1         fitW2 × fitH2
   dùng W×H              dùng H×W (xoay)
```

Công thức:

```js
const itemW = prodW + spacing, itemH = prodH + spacing;
const fitW1 = floor((areaW + spacing) / itemW);
const fitH1 = floor((areaH + spacing) / itemH);
const total1 = fitW1 * fitH1;
// case 2 hoán vị itemW ↔ itemH
```

`+ spacing` ở tử số + `/ (item + spacing)` là trick tránh phải trừ spacing thừa cạnh cuối. Xem [layout.js:38-72](../../src/modules/small-print/engine/layout.js#L38-L72).

Kết quả: `{ total, layout: '3x4', actualPrintW, actualPrintH }`.

`actualPrintW = fitW × prodW + max(0, fitW-1) × spacing` — dùng để check với LAMINATION_CONFIG.WIDTH (kiểm tra có cán được).

#### `calculateMaxCuttableSheetsLayout(largeW, largeH, cutW, cutH)`

Số tờ in cắt được từ 1 tờ giấy lớn. Thuật toán duyệt 8 cấu hình:

```
1. Simple  (cutW × cutH) trên tờ (largeW × largeH)
2. Simple  (cutH × cutW) — xoay tờ in 90°
3. Mixed   main (cutW×cutH), remainder xoay
4. Mixed   main (cutH×cutW), remainder xoay
5-8. Same nhưng tờ lớn xoay 90°
```

"Mixed" = xếp phần lớn theo hướng chính, còn khoảng thừa thì xếp hướng xoay (tối ưu 2D packing đơn giản). Chọn max count.

Vd tờ 65×86, cắt 32.2×48 → simple 65/32.2=2 × 86/48=1 → 2 tờ. Xoay lại 65/48=1 × 86/32.2=2 → 2 tờ. Max = 2.

### 4.2 Định giá cơ bản — `pricing.js`

#### `getProfitMargin(cost, config)`

Tra margin theo bậc `PROFIT_MARGIN_TIERS`. Cost ≤200k → 75%, ...

```js
export function getProfitMargin(cost, config) {
    const tier = config.PROFIT_MARGIN_TIERS.find((t) => cost <= t.max_cost);
    return tier ? tier.margin : 0;
}
```

Chỉ dùng cho tính "giá tối thiểu để có lời" ở admin panel:
```
minPrice = costPerProduct / (1 - margin)
```

Không dùng để tính giá bán khách (khách dùng `CUSTOMER_PRICE_TIERS`).

#### `calculateVariableDataCost(quantity, config)`

3 tier: ≤500 = 200k, ≤1000 = 300k, >1000 = 500k + 100k mỗi 1000 tờ tăng.

```js
if (quantity <= 500)  return 200000;
if (quantity <= 1000) return 300000;
const additionalSteps = floor((quantity - 1001) / 1000);
return 500000 + additionalSteps * 100000;
```

Vd 3500 tờ → 500k + floor((3500-1001)/1000) × 100k = 500k + 2 × 100k = **700.000đ**.

#### `calculatePrintContentSurcharge(totalCost, quantity, contentCount, config)`

3 branch:

1. **`contentCount ≤ 1`**: không phụ thu.
2. **`quantity / contentCount ≈ 1`** (mỗi nội dung đúng 1 con): +20% flat.
3. Else: tier lookup:
    - 2-5 nội dung → +10%
    - 6-10 → +20%
    - 11-25 → +30%
    - 26+ → +35%

```js
const qtyPerContent = quantity / contentCount;
if (abs(qtyPerContent - 1) < 0.001) {
    return { surcharge: totalCost * 0.20, reason: '+20% (mỗi nội dung 1 cái)' };
}
const tier = cfg.tiers.find((t) => contentCount >= t.min && contentCount <= t.max);
if (tier) return { surcharge: totalCost * tier.surcharge, reason: '...' };
```

Vd 500 con, 3 nội dung khác nhau → tier 2-5 → +10% = 50k lên totalCost.

**Được áp cho cả giá vốn (min-price panel) và giá bán khách** — logic nằm ở [quote.js:137-138](../../src/modules/small-print/engine/quote.js#L137-L138) + [ResultPanel calc row](../../src/components/smallprint/ResultPanel.jsx).

#### `calculateFinishingCost(quantity, type, configData)`

Generic tier lookup dùng cho hole punching, creasing, mounting, dieCut labor.

```js
const costTier = configData.cost_tiers.find((t) => quantity <= t.max_qty);
const cost = costTier.type === 'package' ? costTier.price : quantity * costTier.price;
// Tương tự cho customer_tiers → customerPrice
return { cost, customerPrice };
```

**⚠ TASK-0008.6:** Trước đây caller truyền OUTER `config.HOLE_PUNCHING_CONFIG` → function không đọc `cost_tiers` đúng → luôn trả 0. Fix bằng cách chuyển sang INNER: `config.HOLE_PUNCHING_CONFIG[params.holePunchingType]`.

### 4.3 Gia công — `finishing.js`

#### `calculateLamination(pressH, actualPrintW, productsPerSheet, laminationType, config)`

```js
const sides = laminationType === 'laminate_2' ? 2 : 1;
if (actualPrintW > 32) return { cost: 0, warning: 'KHÔNG THỂ CÁN...' };
cost = (pressH / 100) * 2200 * sides;   // đ/tờ
```

Vd tờ h=48, cán 1 mặt, actualPrintW=25 → cost = 48/100 × 2200 × 1 = **1.056đ / tờ**. Cán 2 mặt → gấp đôi.

`actualPrintW == 32` (khớp cạnh) → warning cam "dễ hụt".

#### `calculateDieCuttingCosts(params, printSheetCount, isDecal, config)`

Branch theo `dieCuttingType`:

```
none    → { moldCost: 0, laborCost: 0, laborCustomerPrice: 0 }
digital → calculateFinishingCost(printSheetCount, 'digital', DIGITAL_DIE_CUTTING_CONFIG)
mold    → moldCost tùy moldType (simple/envelope/box/bag/tag)
          + laborCost = calculateFinishingCost(printSheetCount, 'labor', DIE_CUTTING_LABOR_CONFIG)
          + isDecal → labor × 1.25
          + smallTag → labor × 1.25
```

**Mold `simple`**:
- SP ≤ 21×21 → moldCost = base_price = 120k.
- SP > 21×21 → scale theo diện tích: `moldCost = (120k / 441) × (largerW × largerH)`.

**Mold `envelope`/`box`/`bag`**: so `productW × productH` với `threshold_area` → chọn `small_price` hoặc `large_price`.

**Mold `tag`**:
```js
const spacing = 0.4;
const pressW = 32.2;
const numAcross = floor((pressW + 0.4) / (productW + 0.4));
const numDown = 3;   // hardcode: khuôn tag luôn 3 hàng
const numOnMold = numAcross * numDown;
moldCost = productW * productH * numOnMold * 700;
if (tagHasHole) moldCost += 10000 * numOnMold;
```

Vd tag 3×6, có lỗ → `numAcross = floor(32.6/3.4) = 9`, `numOnMold = 9 × 3 = 27`, moldCost = 3×6×27×700 = 340.200 + 27×10.000 = **610.200đ**.

**Surcharge:**
- `isDecal` (giấy decal): labor × 1.25.
- Small tag (`productW < 10 && productH < 6`): labor × 1.25. Không cộng dồn với decal.

#### `calculateFoilStamping(params, config)` — DANH SÁCH KHUÔN

Chỉ chạy khi `params.foilStamping === 'yes'`. Đọc **`params.foilMolds`** — một **mảng khuôn**, mỗi
khuôn `{ w, h, special, impressions }` (kích thước / nhũ màu đặc biệt / số lần ép — RIÊNG mỗi khuôn).
Khuôn có `w`/`h ≤ 0` bị bỏ qua.

> ⚠️ Quan trọng: **"Số khuôn" KHÔNG phải một con số** — mỗi khuôn có kích thước & màu riêng nên phải
> là một danh sách. Không được mượn kích thước khuôn 1 để tính khuôn 2. UI có nút "＋ Thêm khuôn".

> **`impressions` (số lần ép) = số lần thay đổi VỊ TRÍ ép** (mỗi lần đặt máy dập 1 vị trí), không
> phải số mặt. VD: cùng khuôn ép 2 vị trí khác nhau (dù cùng 1 mặt) = 2; ép 2 mặt = 2; ép 2 mặt ×
> 2 vị trí/mặt = 4.

**Cho mỗi khuôn _i_** (dùng đúng công thức đơn giá cũ, theo kích thước & màu của khuôn đó):
```js
area_i    = (h_i + 1) * (w_i + 1);
isSmall_i = area_i <= thresholdW * thresholdH;              // 280 cm²

// Công ép — SÀN tối thiểu áp RIÊNG mỗi khuôn:
perLượt_i = max(area_i * pricePerArea, special_i ? minPriceSpecial : minPriceNormal);
base1_i   = max(perLượt_i * quantity, isSmall_i ? minTotalSmall : minTotalLarge);

// Số lần ép: lần đầu FULL, mỗi lần THÊM trên cùng khuôn = extraImpressionRate (0.5 = 50%):
factor_i        = 1 + (impressions_i - 1) * extraImpressionRate;
impressionPrice_i = base1_i * factor_i;

making_i  = area_i * moldPerArea;                          // CHƯA gồm ship
```

**Cộng dồn cả đơn:**
```js
Tổng công ép   = Σ impressionPrice_i;
shipping       = anyLarge ? shippingLarge : shippingSmall;  // CHỈ 1 lần cho cả đơn (khuôn lớn nhất)
moldCost       = Σ making_i + shipping;
totalCost      = Tổng công ép + moldCost;
```

Quy tắc chốt: **sàn giá tối thiểu RIÊNG mỗi khuôn**; **phí ship CHỈ 1 lần**; **hệ số 50% chỉ cho lần
ép thêm trên cùng khuôn** (2 mặt cùng khuôn = ×1.5; 2 khuôn khác nhau, mỗi khuôn 1 lần = ×2).

Trả về `{ totalCost, impressionPrice, moldCost, shipping, molds: [...] }`, mỗi phần tử `molds` gồm
`{ w, h, special, impressions, areaForCalc, isSmall, pricePerImpression, impressionFactor,
impressionPrice, makingCost, rollsInfo }`.

**Ước tính cuộn nhũ** (2 hướng nhũ, tính RIÊNG mỗi khuôn, lượng ép hiệu dụng = `quantity × impressions_i`):

```
Option 1 — trục nhũ dọc theo H:      Option 2 — trục nhũ dọc theo W:
foilWidth = H + 1                    foilWidth = W + 1
imprLen   = W + 0.7                  imprLen   = H + 0.7
perRoll   = floor(11000 / imprLen)   perRoll   = floor(11000 / imprLen)
rolls     = ceil(effQty / perRoll)   rolls     = ceil(effQty / perRoll)   // effQty = qty × số lần ép
```

App hiển thị cả 2 để admin chọn hướng nào lãng phí nhũ ít hơn (`bestRolls = min(opt1, opt2)`).

Ví dụ (SL=500, khuôn 9×5.5 → công 1 lần 250.000đ, making 130.000đ, ship nhỏ 50.000đ):
| Danh sách khuôn | Công ép | Khuôn (making+ship) | Tổng |
|---|---|---|---|
| 1 khuôn, 1 lần | 250.000 | 180.000 | 430.000 |
| 1 khuôn, 2 lần (×1.5) | 375.000 | 180.000 | 555.000 |
| 2 khuôn, mỗi khuôn 1 lần | 500.000 | 260.000+50.000 = 310.000 | 810.000 |

Xem [finishing.js:151-247](../../src/modules/small-print/engine/finishing.js#L151).

### 4.4 Duyệt phương án — `options.js`

Cả 4 function này push result vào `allResults` array truyền qua ref (mutation pattern). Mỗi function trả 1 hoặc nhiều `{ printer, cutSheet, ... costPerProduct }` record — sau đó App.jsx sort theo `costPerProduct` ASC + dedupe + chọn best.

#### `processSheet(...)`

Atom: tính 1 record cho 1 (cut sheet size × printer) combo.

```js
const printableArea = getPrintableArea(pressW, pressH, printer, ...);
const imposition = calculateImposition(printableArea.w, printableArea.h, prodBleedW, prodBleedH, spacing);
const { count: numCuttableSheets } = calculateMaxCuttableSheetsLayout(largeW, largeH, pressW, pressH);
const clicks = getClicks(pressH, printer);

const paperCostPerSheet = largeSheetPrice / numCuttableSheets;
const printCostPerSheet = clicks * clickPrice * printSides;
const lamination        = calculateLamination(pressH, imposition.actualPrintW, ...);
const totalCostPerSheet = paperCostPerSheet + printCostPerSheet + lamination.costPerSheet;

const costPerProduct = totalCostPerSheet / productsPerSheet;
```

Push vào `allResults` với debug info đầy đủ.

#### `calculatePaperOptions(...)`

Chạy khi `pricingModel = 'ream'` hoặc `'custom'`.

**Bước 1: lấy tờ lớn**
- Chọn `sheetOptions = ART_PAPER_LARGE_SHEET_SIZES` nếu art paper, else `STANDARD_LARGE_SHEET_SIZES`.
- Nếu selector = 'custom' → dùng `customSheetW/H`.

**Bước 2: tính giá tờ lớn**
```js
if (isArtPaper) {
    largeSheetPrice = params.artPaperPrice;   // user nhập tay
} else {
    const pricePerSheet65x86 = pricePerReam / 500;   // giá tờ 65×86 base
    const baseArea = 65 * 86;                          // 5590
    const targetArea = largeSheet.w * largeSheet.h;
    largeSheetPrice = (pricePerSheet65x86 / baseArea) * targetArea;   // scale
}
```

Vd C300 79×109: `(2.200.000/500) / 5590 × (79×109)` = 4.400 / 5.590 × 8.611 = **6.779đ / tờ**.

**Bước 3: SP oversized (>48cm)**

Nếu `productWithBleed W hoặc H > 48cm` và **không** phải decal / per_sheet:

Xây tờ in oversized custom bằng `printer.maxW - 0.8` (chiều rộng chuẩn) × `productH + 1.0` (chiều cao vừa đủ SP + margin).

Push 2 phương án oversized nếu SP có thể xoay 90°.

Ngược lại: duyệt hết `COMMON_SHEET_SIZES` (13 khổ) × cả 2 orientation.

**Bước 4: duyệt máy in**
- 2 máy `C2060` + `C6085`.
- Với mỗi (sheet × printer): gọi `processSheet(...)`.
- Nếu sheet không vuông (`w != h`) và không phải oversized: gọi thêm 1 lần với orientation `(h, w)`.

Kết quả: mảng `allResults` chứa nhiều phương án. Ngoài App.jsx sort + dedupe.

#### `calculatePerSheetOptions(...)`

Chạy khi `pricingModel = 'per_sheet'` (decal xi bạc). Đơn giản: dùng `selectedPaper.sheetSize` (33×48) + `selectedPaper.sheetPrice` (8000đ/tờ). Duyệt **chỉ C2060** (decal xi không chạy được C6085).

#### `calculateDecalOptions(...)`

Chạy khi `pricingModel = 'sqm'` (decal m²). Duyệt 2 chiều rộng khổ [32.2, 33.0] × `DECAL_SHEET_SIZES` (3 khổ chiều cao). Chỉ C2060.

```js
const sheetAreaM2 = (pressW * pressH) / 10000;
const paperCostPerSheet = sheetAreaM2 * pricePerSqm;
```

Vd decal nhựa mờ LH (16000đ/m²), tờ 32.2×33 → paperCost = 32.2×33/10000 × 16000 = **1.700đ / tờ**.

### 4.5 Chuyển sang giá bán — `quote.js`

`calculateCustomerQuote(bestOption, params, finishingCustomerPrices, dieCuttingCustomerPrice, foilResult, config)`.

**Bước 1: quy đổi tờ in → trang A4**

```js
const pressH = bestOption.cutSheetH;
const h_str = pressH.toFixed(1);   // "21.2", "48.0", ...
let conversionFactor;

if (config.A4_CONVERSION_RATES[h_str]) {
    conversionFactor = config.A4_CONVERSION_RATES[h_str];   // lookup bảng
} else if (pressH > 48) {
    if      (pressH <= 76) conversionFactor = 3;   // hardcode range
    else if (pressH <= 91) conversionFactor = 4;
    else                   conversionFactor = 5;
} else if (pressH > 21.2) {
    conversionFactor = pressH / 21.0;   // scale linear
} else {
    return { error: 'Không có hệ số A4' };
}
```

**Bước 2: tổng A4 pages**

```js
const totalPrintSheets = ceil(totalQuantity / productsPerSheet);
let totalA4Pages;

if (pressH > 48) {
    totalA4Pages = conversionFactor * totalPrintSheets * printSides;
    // không ceil — trực tiếp
} else {
    totalA4Pages = ceil(totalPrintSheets * conversionFactor * printSides);
    // in 2 mặt → làm tròn lên số chẵn
    if (printSides == 2 && totalA4Pages % 2 !== 0) totalA4Pages++;
}
```

**Bước 3: áp `CUSTOMER_PRICE_TIERS`**

```js
const tier = config.CUSTOMER_PRICE_TIERS.find((t) => totalA4Pages >= t.min && totalA4Pages <= t.max);
const hasLam = laminationType === 'laminate_1' || 'laminate_2';
const lamSides = laminationType === 'laminate_2' ? 2 : 1;

if (tier.type === 'per_page') {
    totalPrintCost = totalA4Pages * tier.print;
    totalLaminationCost = hasLam ? totalA4Pages * tier.laminate * lamSides : 0;
} else {   // 'package'
    totalPrintCost = tier.print;
    totalLaminationCost = hasLam ? tier.laminate * lamSides : 0;
}
```

**Bước 4: cộng dồn các phụ thu**

```js
totalPaperSurcharge      = selectedPaper.customerSurcharge × totalA4Pages;   // decal
totalArtPaperCustomerCost= (số tờ lớn cần) × artPaperPrice + 80.000;         // giấy mỹ thuật
variableDataCost         = calculateVariableDataCost(totalQuantity);         // nếu 'yes'
foilStampingCost         = foilResult.totalCost;

baseCustomerCost = totalPrintCost + totalLaminationCost
                 + totalArtPaperCustomerCost + totalPaperSurcharge
                 + finishingCustomerPrices.holePunching
                 + finishingCustomerPrices.creasing
                 + finishingCustomerPrices.mounting
                 + dieCuttingCustomerPrice.moldCost
                 + dieCuttingCustomerPrice.laborCustomerPrice
                 + variableDataCost
                 + foilStampingCost;
```

**Bước 5: phụ thu nhiều nội dung**

```js
const { surcharge } = calculatePrintContentSurcharge(baseCustomerCost, totalQuantity, printContents, config);
totalCustomerCost = baseCustomerCost + surcharge;
```

**Bước 6: return object** chứa `totalA4Pages` (string đã format), `totalA4PagesRaw` (numeric, để chia ra đơn giá/trang trong UI), `unitPriceText` ("2200đ/trang" hoặc "Trọn gói"), `totalPrintCost`, `totalLaminationCost`, `totalArtPaperCustomerCost`, `totalPaperSurcharge`, `foilStampingCost`, `customerSurcharge`, `customerSurchargeReason`, `totalCustomerCost`, `error`.

---

## 5. Kịch bản end-to-end

3 ví dụ tính bằng tay đầy đủ.

### 5.1 Ví dụ 1 — Name card 500 con, 2 mặt, cán màng bóng

**Input:**
- Giấy C300 (index 3, pricePerReam=2.200.000)
- Kích thước SP: 9 × 5.5 cm, bleed 0.15
- Số lượng: 500 con
- 2 mặt, in 4 màu
- Cán màng bóng 2 mặt (`laminate_2`)
- Không mounting, không creasing, không hole, không die-cut, không foil
- Tờ lớn: 65×86 cm (default)

**Bước 1: params → productWithBleed**
- `productWithBleedW = 9 + 0.15×2 = 9.3 cm`
- `productWithBleedH = 5.5 + 0.15×2 = 5.8 cm`
- `spacing = 0` (dieCuttingType='none')

**Bước 2: chọn engine — pricingModel='ream' → `calculatePaperOptions`**

**Bước 3: giá tờ lớn 65×86**
- `pricePerSheet65x86 = 2.200.000 / 500 = 4.400đ`

**Bước 4: duyệt COMMON_SHEET_SIZES × 2 máy.** Giả sử phương án best là:

- Tờ in `32.2 × 21.2 cm` (khổ A5 chuẩn), máy C2060.
- `numCuttableSheets = 8` (2 tờ 32.2×21.2 × 4 = 8 cắt từ tờ 65×86).
- `paperCostPerSheet = 4.400 / 8 = 550đ`.

**Bước 5: printable area, imposition**
- pressH=21.2 = vkPoint C2060 → printableH = 21.2 - 0.8 = 20.4.
- printableW = 32.2 - 0.8 = 31.4.
- imposition (thẳng): floor((31.4+0)/9.3) × floor((20.4+0)/5.8) = 3 × 3 = **9 SP/tờ**.
- imposition (xoay): floor((31.4)/5.8) × floor((20.4)/9.3) = 5 × 2 = **10 SP/tờ** → chọn xoay!
- `productsPerSheet = 10`.

**Bước 6: print cost**
- `clicks = 1` (h=21.2 ≤ 33).
- `printCostPerSheet = 1 × 750 × 2 (in 2 mặt) = 1.500đ`.

**Bước 7: lamination**
- actualPrintW = 5 × 5.8 + 4 × 0 = 29 cm (≤32 → OK, không warn).
- `costPerSheet = (21.2/100) × 2200 × 2 (2 mặt) = 933đ`.

**Bước 8: cost/SP**
- `totalCostPerSheet = 550 + 1500 + 933 = 2.983đ`.
- `costPerProduct = 2.983 / 10 = 298đ`.

**Bước 9: totalPrintSheets**
- `ceil(500 / 10) = 50 tờ in`.

**Bước 10: totalCost**
- `50 × 2.983 = 149.150đ` giá vốn tất cả 500 SP.

**Bước 11: giá bán khách**
- pressH=21.2 → `A4_CONVERSION_RATES['21.2'] = 1`.
- `totalA4Pages = ceil(50 × 1 × 2) = 100`. 2 mặt → chẵn rồi, giữ 100.
- Tier `min:80 max:100` → per_page, print=3000, laminate=1000.
- `totalPrintCost = 100 × 3.000 = 300.000đ`.
- `totalLaminationCost = 100 × 1.000 × 2 (2 mặt) = 200.000đ`.
- Không có surcharge khác.
- `totalCustomerCost = 300.000 + 200.000 = 500.000đ`.
- Không có content surcharge (`printContents=1`).

**Kết quả:**
- Giá vốn tổng: **149.150đ** (298đ/SP).
- Giá bán khách: **500.000đ** (1.000đ/SP).
- Margin ≈ 70%.

### 5.2 Ví dụ 2 — Sticker decal 100 tờ, bế mold + ép kim

**Input:**
- Decal nhựa mờ LH (index 11, pricePerSqm=16.000, customerSurcharge=1000)
- SP: 5 × 5 cm, bleed 0.15
- Số lượng: 100 tem (nhưng đây là quyết định giữ hay khai sao — thực tế các decal thường in tờ rồi bế; ở ví dụ này giả sử 100 tờ để rõ)
- 1 mặt
- Không cán màng
- Bế mold `simple`, không tag hole
- Ép kim `yes`, mặc định (không special, không custom size)

**Bước 1: params → productWithBleed = 5.3 × 5.3, spacing = 0.4 (mold)**

**Bước 2: `pricingModel='sqm'` → `calculateDecalOptions`**

**Bước 3: giả sử best = tờ 32.2 × 35 cm, C2060**
- `sheetAreaM2 = 32.2 × 35 / 10.000 = 0.1127`
- `paperCostPerSheet = 0.1127 × 16.000 = 1.803đ`
- printableH = 35 - 0.1 (non-VK) = 34.9. printableW = 31.4.
- Imposition với spacing=0.4: floor((31.4+0.4)/(5.3+0.4)) × floor((34.9+0.4)/(5.3+0.4)) = 5 × 6 = **30 SP/tờ**.
- clicks = 2 (h=35 > 33 nhưng ≤ 48). printCost = 2 × 750 × 1 = 1.500đ.
- lamination cost = 0 (none).
- Total/sheet = 1.803 + 1.500 = 3.303. Per product = 110đ. `numCuttableSheets = 1` (decal m² — tờ độc lập).

**Bước 4: totalPrintSheets = ceil(100 / 30) = 4 tờ in.**

**Bước 5: dieCutting mold simple**
- SP 5×5 ≤ 21×21 → `moldCost = 120.000đ`.
- `labor = calculateFinishingCost(4, ..., DIE_CUTTING_LABOR_CONFIG)` → tier `max:500` → laborCost = 100.000đ (package), customer = 200.000đ.
- `isDecal=true` → labor × 1.25 → **125.000đ cost, 250.000đ customer**.

**Bước 6: foil**
- H=W=5. areaForCalc = 6 × 6 = 36.
- rawPrice = 36 × 5 = 180. minPrice = 400. → 400đ/dập.
- isSmall = 36 ≤ 280 → true.
- impressionPrice = max(400 × 100, 250.000) = **250.000đ**.
- moldCost foil = 36 × 2.000 + 50.000 = 122.000đ.
- Total foil = 250.000 + 122.000 = **372.000đ**.

**Bước 7: cost tổng**
- Print + paper (4 tờ): 4 × 3.303 = 13.212đ.
- Mold: 120.000đ. Labor: 125.000đ. Foil: 372.000đ.
- **Cost tổng ≈ 630.212đ**.

**Bước 8: giá bán khách**
- pressH=35 → `A4_CONVERSION_RATES['35.0'] = 1.5`.
- `totalA4Pages = ceil(4 × 1.5 × 1) = 6`. printSides=1 → giữ 6.
- Tier `min:6 max:10` → per_page, print=8000.
- `totalPrintCost = 6 × 8.000 = 48.000đ`. lamination = 0.
- `totalPaperSurcharge = 1.000 × 6 = 6.000đ`.
- `dieCuttingCustomer.moldCost = 120.000 + 250.000 = 370.000đ`.
- foil customer = foil total = 372.000đ.
- baseCustomer = 48.000 + 6.000 + 370.000 + 372.000 = 796.000đ.
- printContents=1 → no surcharge.
- **totalCustomerCost ≈ 796.000đ**.

(Giá này bao gồm cả khuôn bế + khuôn foil — chi phí cố định ăn nặng khi số lượng nhỏ.)

### 5.3 Ví dụ 3 — In A2 khổ lớn 200 tờ

**Input:**
- Giấy C300, 200 tờ SP kích thước 42 × 59.4 cm (A2), bleed 0.15
- 1 mặt, không finishing gì
- Tờ lớn 79×109 cm

**Bước 1: `productWithBleed = 42.3 × 59.7`. spacing=0.**

**Bước 2: 59.7 > 48 → oversized branch trong `calculatePaperOptions`**
- `pressW_standard = 33.0 - 0.8 = 32.2`. printable_w = 32.2.
- productWithBleedW=42.3 > 32.2 → thử xoay: productWithBleedH=59.7 vs printable_w=32.2 → NO (59.7 > 32.2).
- Thực tế cả 2 orientation đều fail! Sẽ dùng branch `COMMON_SHEET_SIZES` (else block) — mà 42.3 vẫn > 32.2 các khổ.

→ Với A2 (42×59.4), C2060/C6085 max W = 33 cm không đủ. Engine sẽ trả `productsPerSheet=0` cho tất cả phương án → App.jsx báo "Không tìm thấy phương án tối ưu phù hợp." (xem [App.jsx:234-238](../../src/App.jsx#L234-L238)).

**Kết luận:** In KTS khổ nhỏ **không in được A2**. Đây là edge case đúng theo business — A2 phải chuyển qua module "In Khổ Lớn" (large-print, in phun).

*(Ví dụ 3 minh họa hạn chế của module small-print thay vì công thức phức tạp.)*

---

## 6. Magic numbers & edge cases

Toàn bộ constant cứng trong code (không phải config) + edge cases quan trọng.

### 6.1 Bảng magic numbers

| Constant | File:line | Ý nghĩa | Tại sao cứng |
|---|---|---|---|
| `spacing=0.4` | [App.jsx:200](../../src/App.jsx#L200) | Khe khuôn bế mold (4mm) | Chuẩn khuôn thợ thủ công |
| `spacing=0.6` | [App.jsx:201](../../src/App.jsx#L201) | Khe dao bế digital (6mm) | Chuẩn máy laser cutter |
| `cutSheetH ≤ 48` | [App.jsx:257](../../src/App.jsx#L257) | Preference chọn phương án ≤48cm khi có | Máy in KTS chạy ổn định nhất ≤48cm |
| `65 × 86` = 5.590 cm² | [options.js:373](../../src/modules/small-print/engine/options.js#L373) | Base area scale giá tờ ream | Convention tiệm in — đơn giá tờ 65×86 là "chuẩn thị trường" |
| `48 cm` oversized threshold | [options.js:378](../../src/modules/small-print/engine/options.js#L378) | Nếu SP > 48 → chuyển sang custom oversized sheet | Trên 48cm phải in 3 clicks trở lên → xây khổ tùy chỉnh có ích hơn |
| `21.0` A4 base | [quote.js:28](../../src/modules/small-print/engine/quote.js#L28) | Chuẩn quy đổi A4 fallback | Chiều cao A4 chính là 21cm |
| `21.2` A4 reference | [quote.js:27](../../src/modules/small-print/engine/quote.js#L27) | Chiều cao "chuẩn" của khổ A5 double | Con số đo thực tờ in — cân với bleed |
| `pressH>48` ⇒ 3/4/5 A4 hardcode | [quote.js:35-40](../../src/modules/small-print/engine/quote.js#L35-L40) | Range 48-76 = 3A4, 76-91 = 4A4, >91 = 5A4 | Convention tiệm — khớp cách đếm cuốn sách A4 |
| `printSides==2` ⇒ tròn lên chẵn | [quote.js:82](../../src/modules/small-print/engine/quote.js#L82) | Nếu in 2 mặt và totalA4 lẻ → +1 | Vật lý — không thể in 1 mặt lẻ trên máy 2 mặt |
| `foil (H+1)×(W+1)` | [finishing.js:169](../../src/modules/small-print/engine/finishing.js#L169) | Foil area cộng pad 1cm mỗi cạnh | Khuôn foil luôn to hơn design 1cm |
| `foil threshold 20×14 = 280 cm²` | [finishing.js:170](../../src/modules/small-print/engine/finishing.js#L170) | small vs large | Chuẩn báo giá xưởng foil |
| `tag mold pressW=32.2` | [finishing.js:106](../../src/modules/small-print/engine/finishing.js#L106) | Khuôn tag luôn khổ 32.2cm | Máy bế tag của tiệm |
| `tag numDown=3` | [finishing.js:111](../../src/modules/small-print/engine/finishing.js#L111) | Khuôn tag luôn 3 hàng dọc | Layout khuôn cố định |
| `variableDataCost placeholder = 10` | [App.jsx:319](../../src/App.jsx#L319) | Trong `calcProps` — không phải giá thực | Placeholder cũ; giá thật tính trong `calculateCustomerQuote` |
| `minPrice ≥ 300.000` gate | [ResultPanel min-price panel](../../src/components/smallprint/ResultPanel.jsx) | Chỉ show "Giá tối thiểu" khi cost đủ lớn | Đơn hàng nhỏ không cần margin cụ thể |

### 6.2 Edge cases

**E1. `pressH ≤ 21.2` và không match `A4_CONVERSION_RATES`** — [quote.js:44](../../src/modules/small-print/engine/quote.js#L44)
→ Trả `error: 'Không có hệ số A4'`. UI hiển thị lỗi cấu hình.

**E2. Cán màng khi actualPrintW > 32cm** — [finishing.js:23](../../src/modules/small-print/engine/finishing.js#L23)
→ warning đỏ "KHÔNG THỂ CÁN MÀNG", `cost = 0`. Admin phải bỏ cán hoặc chọn khổ khác.

**E3. `printsSides` disabled khi mounting='yes'** — [InputPanel](../../src/components/smallprint/InputPanel.jsx)
→ Vì bồi carton → không thể in 2 mặt.

**E4. Decal (`sqm`/`per_sheet`) chỉ chạy C2060** — [options.js:134,249](../../src/modules/small-print/engine/options.js#L134)
→ C6085 không compatible với decal.

**E5. Digital die-cutting >1200 tờ** — [defaultConfig.js:152-167](../../src/modules/small-print/config/defaultConfig.js#L152)
→ Không có tier Infinity. `find(t => qty ≤ t.max_qty)` trả undefined → cost=0. Admin phải hiểu và chuyển sang mold.

**E6. `decal_surcharge` không cộng dồn với `small_tag_surcharge`** — [finishing.js:130-144](../../src/modules/small-print/engine/finishing.js#L130-L144)
→ Nếu là decal + tag nhỏ, cả 2 branch đều chạy → labor × 1.25 × 1.25 = 1.5625 (cộng dồn). Có ý đồ hay không? Xem code (hiện tại: cộng dồn).

**E7. `printContents / quantity ≈ 1` luôn +20%** — [pricing.js:30](../../src/modules/small-print/engine/pricing.js#L30)
→ Trước tier lookup. Cả 500 SP với 500 nội dung khác nhau → +20% (không phải +35%).

**E8. Foil cuộn nhũ có thể infinity** — [finishing.js:191-197](../../src/modules/small-print/engine/finishing.js#L191-L197)
→ Nếu `imprLen > rollLength` → perRoll=0 → rolls=Infinity. UI hiển thị Infinity (edge dev-only).

---

## 7. Bảng giá bán khách

### 7.1 Sơ đồ quy đổi tờ in → A4

```
tờ in cutSheet (pressW × pressH)
                │
                ▼
     ┌──────────────────────┐
     │  A4_CONVERSION_RATES │
     │  lookup theo pressH  │
     └──────────────────────┘
        yes │           │ no (>48 hoặc miss)
            ▼           ▼
     lookup table   ┌──────────────────┐
                    │  pressH > 48?    │
                    └──────────────────┘
                    yes │           │ no
                        ▼           ▼
                  ┌───────────┐  scale linear:
                  │ ≤76 → 3   │  pressH / 21.0
                  │ ≤91 → 4   │
                  │ else → 5  │
                  └───────────┘
```

### 7.2 Cách chọn tier

```js
tier = CUSTOMER_PRICE_TIERS.find(t => totalA4Pages >= t.min && totalA4Pages <= t.max);
```

Tier có 2 loại `type`:
- `per_page`: cost = pages × unit_price (thang tuyến tính).
- `package`: cost = fixed price (trọn gói).

Chú ý: 14 bậc **xen kẽ per_page và package** để tạo "điểm break" khuyến khích khách đặt số lượng gọn:
- 11-15 trang: **80k trọn gói** (rẻ hơn 16-50 per_page 5k × 15 = 75k... suýt equal — đánh vào tâm lý "trọn gói").
- 51-79 trang: **250k trọn gói** (11-15 lên 80k, 16-50 tuyến tính 5k → 51 sẽ ≈ 255k nếu tuyến tính → 250k gói).
- 101-119: 300k gói. 501-559: 1.25M gói. Các break-point này là quy ước xưởng cũ.

### 7.3 Phụ thu quy về A4 pages

Ngoài `print` + `laminate`:

- **Giấy decal** — cộng `customerSurcharge × totalA4Pages`. Vd decal nhựa mờ LH: 1000đ × A4pages.
- **Giấy mỹ thuật** — cộng `numLargeSheets × artPaperPrice + 80.000` (phụ thu). Không cover 100% giá vật tư — thợ tính thêm.
- **Variable data** — theo tier riêng (`VARIABLE_DATA_CONFIG`), không quy A4.
- **Hole/creasing/mounting** — `customer_tiers` trực tiếp (đã tính bên ngoài, cộng vào baseCustomer).
- **Die-cutting** — `moldCost + laborCustomerPrice` cộng vào (đã tính surcharge decal/tag ở finishing).
- **Foil** — `foilResult.totalCost` toàn bộ (không tách cost/customer).
- **Content surcharge** — `calculatePrintContentSurcharge(baseCustomer, qty, contents)` cộng cuối cùng.

Xem [quote.js:120-139](../../src/modules/small-print/engine/quote.js#L120-L139).

---

## 8. Bug lịch sử đã fix

### 8.1 TASK-0008.6 — `calculateFinishingCost` mất tiền finishing

**Bug:** Trước fix, App.jsx truyền OUTER config vào engine:
```js
// BUG:
calculateFinishingCost(qty, params.holePunchingType, config.HOLE_PUNCHING_CONFIG);
```
`configData.cost_tiers` không tồn tại (nó ở sub-key `['1_vi_tri']`) → luôn trả `cost=0`. Khách bị tính thiếu tiền bấm lỗ / cấn / bồi.

**Fix:** Truyền INNER:
```js
calculateFinishingCost(qty, params.holePunchingType, config.HOLE_PUNCHING_CONFIG?.[params.holePunchingType]);
```

**Regression guard:** Comment quan trọng ở [pricing.js:52-53](../../src/modules/small-print/engine/pricing.js#L52-L53). Test golden có case này để phát hiện regress.

### 8.2 TASK-0010 — `saveConfig` không gate deep validation

**Bug:** `saveConfig(config)` luôn ghi localStorage kể cả khi config invalid (thiếu `PAPER_STOCK_DATA` hoặc `cost_tiers` bậy) → load lại app crash.

**Fix:** [configStorage.js:387-397](../../src/utils/configStorage.js#L387-L397) — gate `deepValidatePrint(config)` trước khi ghi. Nếu fail → return `false`, SettingsPanel `handleSave` hiển thị alert lỗi, không gọi `onSave`.

### 8.3 P3-LINT.1 — Case declaration leak

**Bug:** `case 'tag':` khai `const spacing = 0.4` không có braces → leak ra switch scope → conflict với `spacing` cha.

**Fix:** [finishing.js:101-118](../../src/modules/small-print/engine/finishing.js#L101-L118) — wrap `case 'tag': { ... break; }` với braces + ESLint `no-case-declarations` bật.

### 8.4 P3-LINT.2 — DecalResultPanel conditional hook

Không đụng small-print. Ghi vào lịch sử vì cùng đợt refactor.

---

## 9. Tham chiếu file

### 9.1 Source

| Purpose | File |
|---|---|
| React top-level | [src/App.jsx](../../src/App.jsx) — `SmallPrintModule` L127-406 |
| Input UI | [src/components/smallprint/InputPanel.jsx](../../src/components/smallprint/InputPanel.jsx) |
| Result UI | [src/components/smallprint/ResultPanel.jsx](../../src/components/smallprint/ResultPanel.jsx) |
| Settings UI | [src/components/smallprint/SettingsPanel.jsx](../../src/components/smallprint/SettingsPanel.jsx) |
| Engine index (barrel) | [src/modules/small-print/engine/index.js](../../src/modules/small-print/engine/index.js) |
| Layout / geometry | [src/modules/small-print/engine/layout.js](../../src/modules/small-print/engine/layout.js) |
| Base pricing | [src/modules/small-print/engine/pricing.js](../../src/modules/small-print/engine/pricing.js) |
| Finishing | [src/modules/small-print/engine/finishing.js](../../src/modules/small-print/engine/finishing.js) |
| Option pipeline | [src/modules/small-print/engine/options.js](../../src/modules/small-print/engine/options.js) |
| Customer quote | [src/modules/small-print/engine/quote.js](../../src/modules/small-print/engine/quote.js) |
| Default config | [src/modules/small-print/config/defaultConfig.js](../../src/modules/small-print/config/defaultConfig.js) |
| Config schema | [src/modules/small-print/config/schema.js](../../src/modules/small-print/config/schema.js) |
| Config version | [src/modules/small-print/config/version.js](../../src/modules/small-print/config/version.js) |

### 9.2 Backward-compat shims

Các file cũ (được giữ để không break import cũ):
- [src/utils/calculator.js](../../src/utils/calculator.js) — re-export từ engine.
- [src/utils/customerQuote.js](../../src/utils/customerQuote.js) — re-export `calculateCustomerQuote`.
- [src/config/defaultConfig.js](../../src/config/defaultConfig.js) — re-export `DEFAULT_CONFIG`.

### 9.3 Testing

- Golden tests small-print: `tests/golden/small-print/` (nếu có) — verify công thức không đổi kết quả.
- Unit engine: `tests/modules/small-print/engine/` (nếu có).

---

## 10. Phụ lục — Full `defaultConfig.js` dump

Full snapshot của config default (state 2026-06-02). **Không** copy từ đây để paste vào code — đọc trực tiếp file source. File này chỉ để archive offline.

```js
export const DEFAULT_CONFIG = {
    PROFIT_MARGIN_TIERS: [
        { max_cost: 200000, margin: 0.75 },
        { max_cost: 500000, margin: 0.7 },
        { max_cost: 1000000, margin: 0.65 },
        { max_cost: 2000000, margin: 0.6 },
        { max_cost: Infinity, margin: 0.55 },
    ],
    PRINTABLE_AREA_CONFIG: {
        digital_cut_margin_total: 1.8,
        regular_cut_width_margin_total: 0.8,
        vk_point_height_margin: 0.8,
        non_vk_point_height_margin: 0.1,
        custom_width_margin: 0.8,
        custom_height_margin: 1.0,
    },
    ART_PAPER_SURCHARGE: 80000,
    PRINTER_CONFIG: {
        C2060: {
            name: 'C2060',
            maxW: 33.0,
            maxH: 120.0,
            clickTiers: [
                { maxH: 33, clicks: 1 },
                { maxH: 48, clicks: 2 },
                { maxH: 76, clicks: 3 },
                { maxH: 92, clicks: 4 },
                { maxH: 120, clicks: 5 },
            ],
            vkPoints: [33, 48, 76, 92, 120],
            prices: { '4color': 750 },
        },
        C6085: {
            name: 'C6085',
            maxW: 33.0,
            maxH: 76.0,
            clickTiers: [
                { maxH: 35, clicks: 1 },
                { maxH: 48, clicks: 2 },
                { maxH: 76, clicks: 3 },
            ],
            vkPoints: [35, 48, 76],
            prices: { '4color': 650, '1color': 400 },
        },
    },
    LAMINATION_CONFIG: { WIDTH: 32, PRICE_PER_METER: 2200 },
    VARIABLE_DATA_CONFIG: {
        price_500: 200000,
        price_1000: 300000,
        price_over_1000_base: 500000,
        price_over_1000_progressive: 100000,
        progressive_step: 1000,
    },
    PRINT_CONTENT_CONFIG: {
        single_content_surcharge: 0.2,
        tiers: [
            { min: 4, max: 9, surcharge: 0.1 },
            { min: 10, max: 14, surcharge: 0.2 },
            { min: 15, max: 25, surcharge: 0.3 },
            { min: 26, max: Infinity, surcharge: 0.35 },
        ],
    },
    HOLE_PUNCHING_CONFIG: {
        '1_vi_tri': {
            cost_tiers: [
                { max_qty: 99, price: 40000, type: 'package' },
                { max_qty: 500, price: 75000, type: 'package' },
                { max_qty: Infinity, price: 125, type: 'per_piece' },
            ],
            customer_tiers: [
                { max_qty: 99, price: 80000, type: 'package' },
                { max_qty: 500, price: 150000, type: 'package' },
                { max_qty: Infinity, price: 250, type: 'per_piece' },
            ],
        },
        '2_vi_tri': {
            cost_tiers: [
                { max_qty: 99, price: 70000, type: 'package' },
                { max_qty: 500, price: 125000, type: 'package' },
                { max_qty: Infinity, price: 200, type: 'per_piece' },
            ],
            customer_tiers: [
                { max_qty: 99, price: 140000, type: 'package' },
                { max_qty: 500, price: 250000, type: 'package' },
                { max_qty: Infinity, price: 400, type: 'per_piece' },
            ],
        },
    },
    CREASING_CONFIG: {
        co_can: {
            cost_tiers: [
                { max_qty: 500, price: 75000, type: 'package' },
                { max_qty: Infinity, price: 100, type: 'per_piece' },
            ],
            customer_tiers: [
                { max_qty: 500, price: 150000, type: 'package' },
                { max_qty: Infinity, price: 200, type: 'per_piece' },
            ],
        },
    },
    MOUNTING_CONFIG: {
        yes: {
            cost_tiers: [
                { max_qty: 50, price: 50000, type: 'package' },
                { max_qty: 200, price: 100000, type: 'package' },
                { max_qty: 500, price: 150000, type: 'package' },
                { max_qty: Infinity, price: 225000, type: 'package' },
            ],
            customer_tiers: [
                { max_qty: 50, price: 100000, type: 'package' },
                { max_qty: 200, price: 200000, type: 'package' },
                { max_qty: 500, price: 300000, type: 'package' },
                { max_qty: Infinity, price: 450000, type: 'package' },
            ],
        },
    },
    DIE_CUTTING_MOLD_COST_CONFIG: {
        simple: { base_size: 21, base_price: 120000 },
        envelope: { threshold_area: 960, small_price: 160000, large_price: 220000 },
        box: { threshold_area: 336, small_price: 200000, large_price: 300000 },
        bag: { threshold_area: 1376, small_price: 300000, large_price: 500000 },
        tag: { threshold_w: 10, threshold_h: 6, price_per_cm2: 700, hole_price: 10000 },
    },
    DIE_CUTTING_LABOR_CONFIG: {
        cost_tiers: [
            { max_qty: 500, price: 100000, type: 'package' },
            { max_qty: 1200, price: 175000, type: 'package' },
            { max_qty: Infinity, price: 225000, type: 'package' },
        ],
        customer_tiers: [
            { max_qty: 500, price: 200000, type: 'package' },
            { max_qty: 1200, price: 350000, type: 'package' },
            { max_qty: Infinity, price: 450000, type: 'package' },
        ],
        decal_surcharge: 0.25,
        small_tag_surcharge: 0.25,
    },
    DIGITAL_DIE_CUTTING_CONFIG: {
        cost_tiers: [
            { max_qty: 10, price: 50000, type: 'package' },
            { max_qty: 100, price: 90000, type: 'package' },
            { max_qty: 300, price: 125000, type: 'package' },
            { max_qty: 600, price: 175000, type: 'package' },
            { max_qty: 1200, price: 250000, type: 'package' },
        ],
        customer_tiers: [
            { max_qty: 10, price: 100000, type: 'package' },
            { max_qty: 100, price: 180000, type: 'package' },
            { max_qty: 300, price: 250000, type: 'package' },
            { max_qty: 600, price: 350000, type: 'package' },
            { max_qty: 1200, price: 500000, type: 'package' },
        ],
    },
    PAPER_STOCK_DATA: [
        { name: 'C150', pricePerReam: 1200000, pricingModel: 'ream', description: 'Giấy Couche 150gsm', customerSurcharge: 0 },
        { name: 'C200', pricePerReam: 1600000, pricingModel: 'ream', description: 'Giấy Couche 200gsm', customerSurcharge: 0 },
        { name: 'C250', pricePerReam: 2000000, pricingModel: 'ream', description: 'Giấy Couche 250gsm', customerSurcharge: 0 },
        { name: 'C300', pricePerReam: 2200000, pricingModel: 'ream', description: 'Giấy Couche 300gsm', customerSurcharge: 0 },
        { name: 'B300', pricePerReam: 2600000, pricingModel: 'ream', description: 'Giấy Bristol 300gsm', customerSurcharge: 0 },
        { name: 'F250', pricePerReam: 2200000, pricingModel: 'ream', description: 'Giấy Ford 250gsm', customerSurcharge: 0 },
        { name: 'F300', pricePerReam: 3000000, pricingModel: 'ream', description: 'Giấy Ford 300gsm', customerSurcharge: 0 },
        { name: 'I300', pricePerReam: 2100000, pricingModel: 'ream', description: 'Giấy Ivory 300gsm', customerSurcharge: 0 },
        { name: 'Giấy mỹ thuật', pricePerReam: 'custom', pricingModel: 'custom', description: 'Giá và khổ tùy chọn', customerSurcharge: 0 },
        { name: 'Decal giấy đế mỏng (VHM)', pricePerSqm: 9000, pricingModel: 'sqm', description: 'Chỉ in cắt thành phẩm, không bế demi', supplier: 'Vũ Hoàng Minh', customerSurcharge: 500 },
        { name: 'Decal giấy đế dày (LH)', pricePerSqm: 10000, pricingModel: 'sqm', description: 'Bế demi', supplier: 'Linh Hiếu', customerSurcharge: 500 },
        { name: 'Decal nhựa mờ (LH)', pricePerSqm: 16000, pricingModel: 'sqm', description: 'Đế logo H xám', supplier: 'Linh Hiếu', customerSurcharge: 1000 },
        { name: 'Decal trong #60 mic (VHM)', pricePerSqm: 22000, pricingModel: 'sqm', description: 'Đế logo khami xám', supplier: 'Vũ Hoàng Minh', customerSurcharge: 1000 },
        { name: 'Decal nhựa bóng (VHM)', pricePerSqm: 22000, pricingModel: 'sqm', description: 'Đế logo amazon chấm bị xanh', supplier: 'Vũ Hoàng Minh', customerSurcharge: 1000 },
        { name: 'Decal nhựa mờ (VHM)', pricePerSqm: 16000, pricingModel: 'sqm', description: 'Đế logo Amazon xám', supplier: 'Vũ Hoàng Minh', customerSurcharge: 1000 },
        { name: 'Decal bể dẻo (VHM)', pricePerSqm: 50000, pricingModel: 'sqm', description: 'Decal tem vỡ, dẻo', supplier: 'Vũ Hoàng Minh', customerSurcharge: 9000 },
        { name: 'Decal 7 màu (VHM)', pricePerSqm: 25000, pricingModel: 'sqm', description: 'Khổ cuộn lớn 153cm', supplier: 'Vũ Hoàng Minh', customerSurcharge: 3500 },
        { name: 'Decal xi bạc mờ/bóng', pricingModel: 'per_sheet', sheetPrice: 8000, sheetSize: { w: 33, h: 48 }, description: 'Khổ cố định 33x48cm', supplier: 'Minh Nguyệt', customerSurcharge: 2000 },
    ],
    STANDARD_LARGE_SHEET_SIZES: [
        { name: 'Khổ 65 x 86 cm', w: 65, h: 86 },
        { name: 'Khổ 79 x 109 cm', w: 79, h: 109 },
    ],
    ART_PAPER_LARGE_SHEET_SIZES: [
        { name: 'Khổ 79 x 109 cm', w: 79, h: 109 },
        { name: 'Khổ 72 x 102 cm', w: 72, h: 102 },
        { name: 'Khổ 70 x 100 cm', w: 70, h: 100 },
        { name: 'Tùy chọn', w: 'custom', h: 'custom' },
    ],
    COMMON_SHEET_SIZES: [
        { w: 32.2, h: 21.2 }, { w: 32.2, h: 28.3 }, { w: 32.2, h: 33.0 },
        { w: 32.2, h: 35.0 }, { w: 32.2, h: 42.8 }, { w: 32.2, h: 47.0 },
        { w: 32.2, h: 48.0 }, { w: 33.0, h: 48.0 }, { w: 32.2, h: 65.0 },
        { w: 33.0, h: 109.0 }, { w: 39.5, h: 54.5 }, { w: 43.0, h: 65.0 },
        { w: 54.5, h: 79.0 },
    ],
    DECAL_SHEET_SIZES: [
        { w: 32.2, h: 33.0 }, { w: 32.2, h: 35.0 }, { w: 33.0, h: 48.0 },
    ],
    A4_CONVERSION_RATES: {
        21.2: 1, 28.3: 1.35, '33.0': 1.5, '35.0': 1.5, 42.8: 2,
        '47.0': 2.4, '48.0': 2.4, '65.0': 3.0, '109.0': 5.2,
    },
    EP_KIM_CONFIG: {
        pricePerArea: 5, moldPerArea: 2000,
        minPriceNormal: 400, minPriceSpecial: 700,
        minTotalSmall: 250000, shippingSmall: 50000,
        minTotalLarge: 300000, shippingLarge: 100000,
        thresholdW: 20, thresholdH: 14,
        foilPadWidth: 1, foilPadLength: 0.7,
        foilRollLengthM: 110,
    },
    CUSTOMER_PRICE_TIERS: [
        { min: 1,    max: 5,        print: 10000,   laminate: 8000,  type: 'per_page' },
        { min: 6,    max: 10,       print: 8000,    laminate: 5000,  type: 'per_page' },
        { min: 11,   max: 15,       print: 80000,   laminate: 50000, type: 'package' },
        { min: 16,   max: 50,       print: 5000,    laminate: 3000,  type: 'per_page' },
        { min: 51,   max: 79,       print: 250000,  laminate: 50000, type: 'package' },
        { min: 80,   max: 100,      print: 3000,    laminate: 1000,  type: 'per_page' },
        { min: 101,  max: 119,      print: 300000,  laminate: 60000, type: 'package' },
        { min: 120,  max: 500,      print: 2500,    laminate: 800,   type: 'per_page' },
        { min: 501,  max: 559,      print: 1250000, laminate: 250000,type: 'package' },
        { min: 560,  max: 1000,     print: 2200,    laminate: 600,   type: 'per_page' },
        { min: 1001, max: 2000,     print: 1800,    laminate: 250,   type: 'per_page' },
        { min: 2001, max: 3000,     print: 1750,    laminate: 250,   type: 'per_page' },
        { min: 3001, max: 4500,     print: 1700,    laminate: 250,   type: 'per_page' },
        { min: 4501, max: Infinity, print: 1670,    laminate: 250,   type: 'per_page' },
    ],
};
```

---

**Hết.** File này ~1.100 dòng markdown, cover 100% engine + config small-print state 2026-06-02.
