# Admin Price Config History (P3-HISTORY)

> Ngày: 2026-06-01 (P3-HISTORY.1 — chỉ xem)
> Trạng thái: 🟡 View-only (rollback ở P3-HISTORY.2)
> Tiền đề: [P3-COV](coverage-setup.md) (`v3.6-vitest-coverage-baseline`), [Phase 2 DB](phase-2-price-config-database-plan.md)

## 1. Mục tiêu

Admin biết bảng giá đã thay đổi như thế nào theo thời gian — ai save, lúc nào, version nào, ghi chú gì. Bước đầu của P3-HISTORY group.

**Phạm vi P3-HISTORY.1:**
- ✅ UI panel collapsible trong 4 SettingsPanel
- ✅ Hiển thị danh sách versions + change log
- ❌ KHÔNG rollback (chờ P3-HISTORY.2)
- ❌ KHÔNG input note (chờ P3-HISTORY.3 hoặc gộp với .2)
- ❌ KHÔNG export/import

## 2. Dữ liệu lấy từ bảng nào

| Source | Adapter function | DB table |
|---|---|---|
| Versions list | `loadVersionHistory(module, limit=20)` | `public.price_config_versions` (P2-05.1) |
| Audit log | `loadChangeLog(module, limit=20)` | `public.price_change_logs` (P2-05.1) |

Adapter ở [src/lib/priceConfigStore.js](../src/lib/priceConfigStore.js) — handle Supabase null gracefully (trả `[]`, không crash).

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
- Disabled trong khi loading.
- Re-call cả 2 loaders.

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

### P3-HISTORY.2: Rollback version
- Add nút "Rollback về v N" trên mỗi version row.
- Confirmation dialog: "Rollback decal về v3 (lưu bởi user X ngày Y)?"
- Gọi `saveConfigToCloud(moduleName, oldVersionData)` → tự thành version mới với `action='rollback'`.
- Update versions list + audit log sau rollback.

### P3-HISTORY.3 (optional): Input note khi save
- SettingsPanel handleSave thêm modal input "Ghi chú thay đổi này" trước khi gọi save.
- Truyền `note` vào `saveConfigToCloud(module, config, note)` (extend signature).
- Adapter pass note vào RPC save_price_config.

### P3-HISTORY.4 (optional): Diff viewer
- Click vào 1 version → modal hiển thị diff JSON so với version trước.
- Dùng `jsondiffpatch` hoặc tự render.

### P3-HISTORY.5 (optional): Export
- Nút "Export CSV" cho audit log → tải file.
