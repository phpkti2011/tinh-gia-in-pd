# Báo cáo: TASK-0006 — Fix decal formula to match Excel reference

| Trường | Giá trị |
|---|---|
| Ngày thực hiện | 2026-05-29 |
| Branch | `refactor/pricing-engine` |
| Trạng thái | ✅ Done (sau 1 lần stop-and-ask để confirm Formula A) |
| Loại task | Bug fix (formula alignment với Excel) |

## 1. Quá trình

1. **Stop & report**: phát hiện 3 công thức ứng cử viên đều khớp Case C nhưng khác nhau ở case khác. Hỏi user để chọn.
2. **User confirm Formula A**: `base = progressive(ceil) + (ceil − raw) × priceOfTierContaining(ceil)`.
3. **D, G postpone**: user chỉ thị fix calculateSheetPrice (G) và decalExtra (D) ở task sau.
4. Áp Formula A vào `calculateSingleStickerPrice` + cập nhật 4 test file + un-skip reference.

## 2. File đã sửa

| File | Thay đổi |
|---|---|
| [src/modules/decal/engine/pricing.js](../../src/modules/decal/engine/pricing.js) | + `findTierPriceAt()` helper; rewrite `calculateSingleStickerPrice` body; update header comment. **KHÔNG động `calculateSheetPrice`.** |
| [tests/golden/decal.golden.test.js](../../tests/golden/decal.golden.test.js) | Update Cases A, B, C, D (expected values). Case E giữ nguyên. |
| [tests/golden/decal.extra.golden.test.js](../../tests/golden/decal.extra.golden.test.js) | Update Case H (đi qua calculateSingleStickerPrice). F, G, I giữ nguyên. |
| [tests/golden/decal.module.test.js](../../tests/golden/decal.module.test.js) | Update 2 assertion "behavior identical" cho Case A & C. |
| [tests/golden/decal.reference.todo.test.js](../../tests/golden/decal.reference.todo.test.js) | **UN-SKIP**: `describe.skip` → `describe`. 6 assertion target Excel hiện PASS. |
| [docs/pricing-rules/decal-reference-cases.md](../pricing-rules/decal-reference-cases.md) | Mark Excel reconciled cho Case C; ghi rõ D & G còn chờ. |

## 3. File tạo mới

| File | Vai trò |
|---|---|
| [docs/tasks/TASK-0006-fix-decal-formula-excel.md](TASK-0006-fix-decal-formula-excel.md) | Báo cáo này |

## 4. Công thức cũ vs mới

| | Cũ (trước TASK-0006) | Mới (TASK-0006, Formula A) |
|---|---|---|
| `rawSheets` | (không tách, dùng ceil trực tiếp) | `quantity / stickersPerSheet` |
| `ceilSheets` | `Math.ceil(quantity / stickersPerSheet)` | `Math.ceil(rawSheets)` |
| `base` | `progressive(ceil)` | `progressive(ceil) + (ceil − raw) × priceOfTierAt(ceil)` |
| `decalExtra` | `decalCost × ceil` | `decalCost × ceil` (GIỮ — chờ Excel ref) |
| `lam` | `laminationCost × ceil` | `laminationCost × raw` |

**`calculateSheetPrice` KHÔNG đổi** — vẫn dùng `numPrintSheets = ceil` cho cả base + lam (chờ Excel ref cho sheet mode).

## 5. Tác động lên Excel reference Case C (Target chính)

| Trường | Trước | Sau | Match Excel? |
|---|---:|---:|---|
| Base | 6.590.600 | **6.591.700** | ✅ |
| Lam | 1.219.000 | **1.218.750** | ✅ |
| Total | 7.809.600 | **7.810.450** | ✅ |
| Round unit | 400 | **401** | ✅ |

## 6. Golden test nào phải cập nhật

| Test | Case | Trước | Sau | Lý do |
|---|---|---:|---:|---|
| decal.golden | A — total | 448.000 | ≈ 451.000 | raw=33,33 fractional → +0,667 × 4500 |
| decal.golden | A — unit | 896 | ≈ 902 | total/500 |
| decal.golden | B — total | 465.000 | ≈ 467.666,67 | A + lam(raw)=16.666,67 |
| decal.golden | B — lam diff | 17.000 (= 34×500) | ≈ 16.666,67 (= raw×500) | lam giờ dùng raw |
| decal.golden | B — unit | 930 | ≈ 935,33 | |
| decal.golden | **C — base** | 6.590.600 | **6.591.700** | **Excel target** |
| decal.golden | **C — lam** | 1.219.000 | **1.218.750** | **Excel target** |
| decal.golden | **C — total** | 7.809.600 | **7.810.450** | **Excel target** |
| decal.golden | C — unit | ~400,49 | ≈ 400,536 (round = 401) | |
| decal.golden | D — Decal giấy | 448.000 | ≈ 451.000 | giống A |
| decal.golden | D — Decal nhựa | 488.800 | ≈ 491.800 | A + 40.800 |
| decal.golden | D — diff (nhựa − giấy) | 40.800 | **40.800 (KHÔNG đổi)** | decalExtra vẫn ceil → diff identical |
| decal.golden | E — 1/2/11 tờ | 100k/140k/308k | **giữ nguyên** | raw integer → frac = 0 |
| decal.extra | F — layout A6 | n/a | **giữ nguyên** | layout-only |
| decal.extra | G — calculateSheetPrice | 22.648,76 | **giữ nguyên** | `calculateSheetPrice` chưa fix |
| decal.extra | H — row[0] | 243.500 | ≈ 250.000 | qua calculateSingleStickerPrice |
| decal.extra | H — row[2] | 251.900 | ≈ 258.400 | base + decalExtra ceil |
| decal.extra | I — circle | n/a | **giữ nguyên** | layout-only |
| decal.module | re-A | 448.000 | ≈ 451.000 | giống Case A |
| decal.module | re-C | 7.809.600 | 7.810.450 | giống Case C |
| decal.reference.todo | 6 assertion | (skipped) | **UN-SKIP, all PASS** | Excel target |

## 7. Ảnh hưởng case khác ngoài Case C

**Có** — A, B, D, H bị ảnh hưởng vì Formula A là universal. Đây là **hệ quả tự nhiên & đã được user confirm** ở phần "AskUserQuestion" trước task này.

Cases KHÔNG bị ảnh hưởng (raw integer hoặc layout-only):
- E (raw = 1/2/11, integer)
- F (layout)
- G (calculateSheetPrice — KHÔNG fix ở task này)
- I (layout)

## 8. Verification

```
npm test:
  ✓ tests/sanity.test.js                       (2)
  ✓ tests/golden/decal.reference.todo.test.js  (6 — UN-SKIPPED, NOW PASSING)
  ✓ tests/golden/decal.config.test.js          (17)
  ✓ tests/golden/decal.extra.golden.test.js    (12)
  ✓ tests/golden/decal.golden.test.js          (20)
  ✓ tests/golden/decal.module.test.js          (5)
  ✓ tests/golden/decal.config.storage.test.js  (14)

76 passed (76 total — 0 skipped, 0 failed)

npm run build: 63 modules, 2.10s, bundle JS 322.04 kB
```

## 9. Không làm

| | Lý do |
|---|---|
| Đụng `calculateSheetPrice` | User: "G sửa sau" — cần Excel ref riêng cho sheet mode |
| Đổi decalExtra (Case D với Decal nhựa) | User: "D sửa sau" — cần Excel ref riêng |
| Sửa UI / SettingsPanel | Không cần |
| Sửa config / bảng giá | Không cần |
| Wire vào module khác (small/large/uvdtf) | Ngoài scope |

## 10. Rủi ro còn lại

| # | Vấn đề | Mức |
|---|---|---|
| 1 | calculateSheetPrice chưa align Excel — sheet mode (sticker sheet) có thể có lệch tương tự | 🟡 Trung — cần Excel ref |
| 2 | decalExtra Decal nhựa vẫn dùng ceil — chưa verify với Excel | 🟡 Trung — cần Excel ref |
| 3 | 3 module khác (small/large/uvdtf) chưa golden test → không biết có Excel gap không | 🟢 Thấp |
| 4 | Bundle JS tăng nhẹ 0,2 kB (do thêm `findTierPriceAt`) | 🟢 Thấp |

## 11. Bước tiếp theo đề xuất

1. **TASK-0006.5** (mới): Fix decalExtra cho Case D — cần user gửi Excel reference cho Decal nhựa với fractional ratio. Pattern tương tự TASK-0006.
2. **TASK-0006.6** (mới): Fix calculateSheetPrice (Case G) — cần Excel reference cho sheet mode.
3. Hoặc: TASK riêng nhân rộng pattern golden test + schema + wire cho 3 module còn lại (small/large/uvdtf).
