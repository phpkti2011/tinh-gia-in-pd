# Admin Price Config History (P3-HISTORY)

> Ngày: 2026-06-01 (P3-HISTORY.2 — rollback)
> Trạng thái: 🟢 Done — view + rollback
> Tiền đề: [P3-COV](coverage-setup.md) (`v3.6-vitest-coverage-baseline`), [Phase 2 DB](phase-2-price-config-database-plan.md)

## 1. Mục tiêu

Admin biết bảng giá đã thay đổi như thế nào theo thời gian — ai save, lúc nào, version nào, ghi chú gì. Và có thể **rollback về version cũ** an toàn (immutable: rollback tạo version mới, không xoá version cũ).

**Phạm vi P3-HISTORY.1 (view):**
- ✅ UI panel collapsible trong 4 SettingsPanel
- ✅ Hiển thị danh sách versions + change log
- ❌ KHÔNG rollback (đã có ở P3-HISTORY.2)

**Phạm vi P3-HISTORY.2 (rollback):**
- ✅ Nút "Rollback về vN" trên mỗi version row (trừ version mới nhất)
- ✅ Confirm dialog rõ ràng (module + version + thông tin tạo)
- ✅ Gọi RPC `save_price_config` với `p_action='rollback'` → audit log ghi action='rollback'
- ✅ Reload versions + audit log sau rollback thành công
- ✅ Error banner nếu fail; loading state per-row
- ❌ KHÔNG tự update config đang mở trong SettingsPanel (admin reload trang nếu cần)
- ❌ KHÔNG input note tự do (P3-HISTORY.3)
- ❌ KHÔNG export/import

## 2. Dữ liệu lấy từ bảng nào

| Source | Adapter function | DB table |
|---|---|---|
| Versions list | `loadVersionHistory(module, limit=20)` | `public.price_config_versions` (P2-05.1) |
| Audit log | `loadChangeLog(module, limit=20)` | `public.price_change_logs` (P2-05.1) |
| Version data full (rollback) | `loadVersionData(versionId)` | `public.price_config_versions` |
| Rollback | `rollbackConfigVersion({module, versionId, note})` → RPC `save_price_config(p_action='rollback')` | `public.price_configs` + audit |

Adapter ở [src/lib/priceConfigStore.js](../src/lib/priceConfigStore.js) — handle Supabase null gracefully (trả `[]`/`null`/`ok=false`, không crash).

## 3. Module mapping

| SettingsPanel | moduleKey prop |
|---|---|
| `src/components/smallprint/SettingsPanel.jsx` | `'small-print'` |
| `src/components/decal/DecalSettingsPanel.jsx` | `'decal'` |
| `src/components/largeprint/LPSettingsPanel.jsx` | `'large-print'` |
| `src/components/uvdtf/UvdtfSettingsPanel.jsx` | `'uvdtf'` |

Khớp với CHECK enum trong `price_configs.module`.

## 4. UI behavior

### Khởi tạo
- Mặc định **collapsed** — chỉ hiển thị tiêu đề "▶ Lịch sử chỉnh giá (click để xem)".
- Tiết kiệm round-trip Supabase nếu admin chỉ vào Settings để edit.

### Khi click expand
- Toggle thành "▼ Lịch sử chỉnh giá".
- Fetch song song `loadVersionHistory()` + `loadChangeLog()` (Promise.all).
- Loading state: "Đang tải lịch sử…".
- Empty state: "Chưa có lịch sử chỉnh giá cho module này. Sau khi admin lưu lần đầu, lịch sử sẽ xuất hiện ở đây."
- Error state: red banner + "Bấm 'Tải lại' để thử lại."

### Khi data có
2 bảng theo thứ tự:

**Versions list:**
| Cột | Format |
|---|---|
| Version | `v1`, `v2`, … (yellow, monospace) |
| Schema | `1.0.0` (monospace) |
| Ghi chú | text từ `note` field hoặc `(không có ghi chú)` |
| Tạo bởi | `user_id[0..8]…` (privacy: không hiện email/uuid đầy đủ) |
| Lúc | `DD/MM/YYYY HH:mm` (local time) |

**Audit log:**
| Cột | Format |
|---|---|
| Hành động | Badge màu: `Tạo mới` (blue), `Cập nhật` (green), `Rollback` (yellow) |
| Từ → Đến | `v0 → v1`, `v1 → v2`, … |
| Ghi chú | text từ `note` |
| Admin | `user_id[0..8]…` |
| Lúc | `DD/MM/YYYY HH:mm` |

### Reload
- Nút "Tải lại" góc phải tiêu đề.
- Disabled trong khi loading hoặc đang rollback.
- Re-call cả 2 loaders.

### Rollback (P3-HISTORY.2)
- Trên mỗi row version **cũ** (không phải version mới nhất / "hiện tại"), nút "Rollback về vN".
- Click → `window.confirm()` dialog với thông tin: module, version#, người tạo (uuid-prefix), thời gian tạo, cảnh báo "version mới sẽ được tạo dựa trên dữ liệu v cũ".
- User cancel → no-op.
- User OK:
  - Disable tất cả nút rollback (1 task tại 1 lúc).
  - Nút row đó → "Đang rollback…".
  - Call `rollbackConfigVersion({ module, versionId, note: "Rollback về vN" })`:
    1. Adapter `loadVersionData(versionId)` → lấy full data version cũ.
    2. Verify `versionRow.module === module` (defensive).
    3. Adapter `saveConfigToSupabase(module, oldData, oldSchema, note, { action: 'rollback' })` → RPC tạo version mới với `action='rollback'`.
  - Success: green banner "Đã rollback thành công. Version mới: vX. Tải lại trang hoặc bấm 'Tải lại cấu hình' nếu cần áp dụng ngay." → reload history (versions + audit).
  - Fail: red banner "Rollback thất bại: \<error\>" / "Rollback exception: \<message\>". KHÔNG reload (giữ state cũ để admin debug).
  - Cả 2 banner đều có nút ✕ để đóng.

### Tại sao KHÔNG tự update config đang mở
- SettingsPanel có local state `localConfig` (copy của config khi mở modal). Update trực tiếp sẽ tạo confusion (admin đang edit, save → ghi đè rollback). Đơn giản hơn: admin reload trang sau rollback.
- UI ghi chú rõ điều này.

## 5. Privacy

- KHÔNG hiển thị full `user_id` UUID (chỉ 8 ký tự đầu) — defensive against shoulder-surfing screenshots.
- KHÔNG hiển thị email (Supabase auth user email không có trong response — chỉ uuid).
- KHÔNG hiển thị raw JSON config (chỉ metadata).

Tương lai (P3-HISTORY.X): có thể join với `auth.users` qua RPC để show email nếu cần — nhưng cần cân nhắc privacy + RLS.

## 6. Khi Supabase chưa cấu hình

- `loadConfigFromSupabase` → `null`, `loadVersionHistory` / `loadChangeLog` → `[]` (handle ở P2-05.2 adapter).
- UI hiển thị empty state "Chưa có lịch sử". Không crash.
- Admin vẫn dùng Settings local + saveXxxConfig (localStorage).

## 7. Limitations hiện tại

- **Limit cứng 20** — không có pagination. Đủ cho dự án nhỏ. Phase 3+ có thể add infinite scroll.
- **Không filter** — không filter theo admin / time range / action.
- **Không diff giữa 2 versions** — chỉ thấy metadata, chưa biết version mới khác gì version cũ.
- **Không export CSV/JSON** — admin muốn report phải tự copy.

## 8. Files

| File | Vai trò |
|---|---|
| [src/components/admin/PriceConfigHistoryPanel.jsx](../src/components/admin/PriceConfigHistoryPanel.jsx) | Component chính |
| [tests/components/PriceConfigHistoryPanel.test.jsx](../tests/components/PriceConfigHistoryPanel.test.jsx) | Unit tests (per-file `// @vitest-environment jsdom`) |
| 4 SettingsPanel | Wire `<PriceConfigHistoryPanel moduleKey="..." />` |
| [docs/admin-price-history.md](admin-price-history.md) | File này |

## 9. Task tiếp theo

### P3-HISTORY.2: Rollback version ✅ DONE (2026-06-01)
- Nút "Rollback về vN" cho mọi version cũ.
- Confirm dialog có module + version + người tạo + cảnh báo.
- RPC `save_price_config` extended với `p_action='rollback'` (backward compatible).
- Adapter functions mới: `loadVersionData`, `rollbackConfigVersion`, `saveConfigToSupabase(..., options)`.
- 12 test cases mới (5 adapter + 7 UI flow).

### P3-HISTORY.3 (optional): Input note khi save
- SettingsPanel handleSave thêm modal input "Ghi chú thay đổi này" trước khi gọi save.
- Truyền `note` vào `saveConfigToCloud(module, config, note)` (extend signature).
- Adapter pass note vào RPC save_price_config.

### P3-HISTORY.4 (optional): Diff viewer
- Click vào 1 version → modal hiển thị diff JSON so với version trước.
- Dùng `jsondiffpatch` hoặc tự render.

### P3-HISTORY.5 (optional): Export
- Nút "Export CSV" cho audit log → tải file.
