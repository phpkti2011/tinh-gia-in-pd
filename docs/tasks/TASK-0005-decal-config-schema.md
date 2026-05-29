# Báo cáo: TASK-0005 — Decal config schema/version

| Trường | Giá trị |
|---|---|
| Ngày thực hiện | 2026-05-28 |
| Branch | `refactor/pricing-engine` |
| Trạng thái | ✅ Done |
| Loại task | Refactor cấu trúc config (không đổi value) |

## 1. Mục tiêu

Sau TASK-0004 (engine vào module), config decal vẫn nằm ở `src/config/decalConfig.js` còn `src/modules/decal/config/index.js` chỉ re-export ngược. Task này **đảo chiều**: đưa config vào module thật, thêm schema validation + version metadata.

## 2. Cấu trúc trước/sau

**Trước (sau TASK-0004):**
```
src/config/decalConfig.js                  ← SOURCE
src/modules/decal/config/index.js          → re-export từ src/config/decalConfig.js
```

**Sau (TASK-0005):**
```
src/modules/decal/config/
├── defaultConfig.js   ← SOURCE (DECAL_DEFAULT_CONFIG)
├── schema.js          (validateDecalConfig)
├── version.js         (metadata: name, schemaVersion, lastUpdated)
└── index.js           — barrel export 3 file trên

src/config/decalConfig.js                  → compat shim, re-export DECAL_DEFAULT_CONFIG
                                             từ ../modules/decal/config/defaultConfig.js
```

## 3. Compat & inversion

| Đường dẫn import | Trước | Sau |
|---|---|---|
| `src/config/decalConfig` | nguồn (có literal data) | shim (re-export) |
| `src/modules/decal/config` | shim (re-export ngược) | nguồn (có literal data + schema + version) |
| `src/utils/configStorage.js` line 3 | dùng đường cũ | **không sửa**, tiếp tục dùng shim |
| Golden tests cũ (3 file) | dùng đường cũ | **không sửa**, tiếp tục dùng shim |
| Module tests (TASK-0004) | dùng đường mới | tiếp tục dùng đường mới |

Bằng chứng: assertion `DECAL_OLD_PATH === DECAL_DEFAULT_CONFIG` (cùng reference) ở [tests/golden/decal.config.test.js](../../tests/golden/decal.config.test.js).

## 4. Schema validation

`validateDecalConfig(config)` ở [src/modules/decal/config/schema.js](../../src/modules/decal/config/schema.js):
- Return: `{ isValid: boolean, errors: string[] }`
- Không mutate input.
- Pure JS, không cần thư viện ngoài.

**Kiểm tra:**

| Field/group | Loại | Check |
|---|---|---|
| `basePrintWidth, basePrintHeight, areaConversionFactor, marginShortSide, marginLongSide, stickerGap, laminationCost` | required numbers | `typeof === 'number'` |
| `progressiveTiers` | required array | non-empty + mỗi item có `{upTo: number, price: number}` |
| `demiCutSurchargeTiers` | required array | non-empty + mỗi item có `{upTo: number, percent: number}` |
| `decalCosts` | required object | mỗi value phải là number |
| `null / undefined / array` | early reject | trả về `{isValid:false, errors:['Config phải là object']}` |

Cho phép `Infinity` ở các trường `upTo` vì `typeof Infinity === 'number'`.

## 5. Version metadata

[src/modules/decal/config/version.js](../../src/modules/decal/config/version.js):

```js
export const DECAL_MODULE_NAME = 'decal';
export const DECAL_CONFIG_SCHEMA_VERSION = '1.0.0';
export const DECAL_CONFIG_LAST_UPDATED = '2026-05-28';
```

Quy ước semver: MAJOR = breaking, MINOR = thêm optional, PATCH = doc fix. Khi MAJOR thay đổi, cần migration script cho config đã lưu trong localStorage + Google Sheets.

## 6. Verification

```
npm test:
  ✓ tests/sanity.test.js                       (2)
  ↓ tests/golden/decal.reference.todo.test.js  (6 skipped)
  ✓ tests/golden/decal.module.test.js          (5)
  ✓ tests/golden/decal.extra.golden.test.js    (12)
  ✓ tests/golden/decal.golden.test.js          (20)
  ✓ tests/golden/decal.config.test.js          (17 — mới ở TASK-0005)

56 passed + 6 skipped (62 total)

npm run build: 60 modules, bundle JS 319.76 kB (identical với TASK-0004 — tree-shake sạch)
```

## 7. Không làm ở task này

| | Lý do |
|---|---|
| Đổi giá trị trong DECAL_DEFAULT_CONFIG | User cấm — chỉ đổi vị trí file |
| Fix Excel gap | Task riêng sau |
| Đụng UI / SettingsPanel | Không cần |
| Wire validateDecalConfig vào configStorage.saveDecalConfig | Sẽ là task riêng nếu cần — chưa cần ngay |
| Đụng config của 3 module khác (small/large/uvdtf) | Tới lượt khi extract engine module đó |

## 8. Rủi ro & bước tiếp theo

| # | Rủi ro | Mức |
|---|---|---|
| 1 | Excel gap vẫn chưa fix | 🟡 Trung |
| 2 | 3 module config khác (defaultConfig, largePrintConfig, uvdtfConfig) chưa schema/version hóa | 🟢 Thấp |
| 3 | `configStorage.js` chưa gọi `validateDecalConfig()` khi save — schema có nhưng chưa được áp dụng | 🟢 Thấp (việc wire là task riêng) |

**Đề xuất task tiếp:**
- **A**. Task mới: "Fix decal formula khớp Excel" (un-skip reference todo + cập nhật golden Case C).
- **B**. TASK-0006: admin UI plan ([tasks/TASK-0006-admin-config-ui-plan.md](../../tasks/TASK-0006-admin-config-ui-plan.md)) — design Supabase Auth + admin chỉnh giá có schema check.
- **C**. Task mới: "Wire validateDecalConfig vào configStorage.saveDecalConfig" — fail-safe khi admin save cấu hình rác.

Khuyến nghị: **A** (giải quyết business gap đã document) hoặc **C** (low-risk hardening tiếp ngay theo mạch TASK-0005).
