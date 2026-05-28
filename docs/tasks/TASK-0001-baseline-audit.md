# Báo cáo: TASK-0001 — Baseline audit source hiện tại

| Trường | Giá trị |
|---|---|
| Spec gốc | [tasks/TASK-0001-baseline-audit.md](../../tasks/TASK-0001-baseline-audit.md) |
| Ngày thực hiện | 2026-05-28 |
| Người thực hiện | Claude (Opus 4.7, 1M context) |
| Trạng thái | ✅ Done |
| Loại task | Audit & Documentation (read-only) |

---

## 1. Mục tiêu task

Theo spec gốc: tạo tài liệu hiện trạng trước khi sửa code, gồm 5 đầu việc:
1. Liệt kê cấu trúc thư mục hiện tại.
2. Liệt kê các module tính giá.
3. Liệt kê file đang chứa logic chính.
4. Ghi vấn đề kiến trúc.
5. Chạy `npm run build`.

---

## 2. File đã đọc (read-only)

**Source code chính:**
- [src/App.jsx](../../src/App.jsx) — 467 dòng
- [src/main.jsx](../../src/main.jsx), [index.html](../../index.html), [package.json](../../package.json)
- [src/utils/calculator.js](../../src/utils/calculator.js) — 516 dòng
- [src/utils/largePrintCalculator.js](../../src/utils/largePrintCalculator.js) — 186 dòng
- [src/utils/decalCalculator.js](../../src/utils/decalCalculator.js) — 173 dòng
- [src/utils/uvdtfCalculator.js](../../src/utils/uvdtfCalculator.js) — 57 dòng
- [src/utils/customerQuote.js](../../src/utils/customerQuote.js) — 118 dòng
- [src/utils/configStorage.js](../../src/utils/configStorage.js) — 223 dòng
- [src/utils/cloudSync.js](../../src/utils/cloudSync.js) — 94 dòng
- [src/config/defaultConfig.js](../../src/config/defaultConfig.js) — 223 dòng
- [src/config/largePrintConfig.js](../../src/config/largePrintConfig.js) — 44 dòng
- [src/config/decalConfig.js](../../src/config/decalConfig.js) — 53 dòng
- [src/config/uvdtfConfig.js](../../src/config/uvdtfConfig.js) — 12 dòng

**Documentation đã đọc:**
- [docs/architecture/{01-target-architecture, 02-module-boundaries}.md](../architecture/)
- [docs/workflow/00-how-to-start.md](../workflow/00-how-to-start.md)
- [docs/security/admin-price-management.md](../security/admin-price-management.md)
- [docs/database/supabase-schema-draft.md](../database/supabase-schema-draft.md)
- [docs/pricing-rules/{00-golden-test-cases, decal}.md](../pricing-rules/)
- [rules/AI_WORKFLOW_RULES.md](../../rules/AI_WORKFLOW_RULES.md)
- [rules/CODING_RULES.md](../../rules/CODING_RULES.md)
- [README.md](../../README.md), [prompts/START_WITH_CLAUDE.md](../../prompts/START_WITH_CLAUDE.md)
- [tasks/TASK-0001-baseline-audit.md](../../tasks/TASK-0001-baseline-audit.md) (spec gốc)

**Grep đã chạy** (read-only, không sửa):
- `grep <admin-password-redacted>` trong `src/` → 9 vị trí (4 file SettingsPanel + 1 ResultPanel + 4 lần ở App.jsx). Password thật đã được sanitize ở TASK-0002.6, xem [docs/security/SECURITY_NOTES.md](../security/SECURITY_NOTES.md).

---

## 3. File đã tạo

| File | Mục đích | Dung lượng |
|---|---|---|
| [docs/02-current-audit.md](../02-current-audit.md) | Audit chi tiết 9 mục | ~17 KB |
| [docs/tasks/TASK-0001-baseline-audit.md](TASK-0001-baseline-audit.md) | Báo cáo này | ~5 KB |

Thư mục `docs/tasks/` được tạo mới (chưa tồn tại trước task này).

---

## 4. File đã sửa

**Không có.** Toàn bộ task là read-only + tạo 2 file Markdown mới trong `docs/`.

---

## 5. Công thức tính giá đã đổi

**Không có.** Toàn bộ engine (`calculator.js`, `decalCalculator.js`, `largePrintCalculator.js`, `uvdtfCalculator.js`, `customerQuote.js`) giữ nguyên 100%. Bảng giá (`config/*.js`) giữ nguyên.

---

## 6. UI đã đổi

**Không có.** Không sửa component nào trong `src/components/`. Không sửa `App.jsx`, `main.jsx`, `index.html`, `index.css`.

---

## 7. Build verification

Lệnh: `npm run build` (chạy bằng `npm` qua PowerShell, project gốc đã có `node_modules`).

```
> tinh-gia-in@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 55 modules transformed.
dist/index.html                 0.46 kB │ gzip: 0.33 kB
dist/assets/index-CGXBtwM9.css  32.46 kB │ gzip: 6.22 kB
dist/assets/index-58SiIv15.js   319.63 kB │ gzip: 86.05 kB
✓ built in 3.21s
```

- ✅ Exit code: 0
- ✅ Không warning
- ⏱ Thời gian: 3.21 giây
- 📦 Bundle: 319.63 kB JS (gzip 86.05 kB) — chưa code-split, sẽ tối ưu ở task sau

---

## 8. Definition of Done — checklist (theo spec gốc)

| DoD | Kết quả |
|---|---|
| Có audit rõ ràng | ✅ [docs/02-current-audit.md](../02-current-audit.md) — 9 mục, bảng đối chiếu, line-link rõ ràng |
| Build pass | ✅ exit 0, 3.21s, không warning |
| Không sửa logic | ✅ Zero file `.js` / `.jsx` / `.json` / `.html` trong `src/` bị thay đổi |

---

## 9. Vấn đề phát sinh & quyết định

| Vấn đề | Quyết định |
|---|---|
| Project chưa init Git, không thể `git diff` để verify "không sửa code" | Verify bằng cách: chỉ dùng `Write` cho 2 file mới trong `docs/` + `Read`/`Glob`/`Grep` cho mọi thứ khác. Đề xuất init Git ở task riêng. |
| `node_modules` đã có sẵn | Bỏ `npm install` — chạy thẳng `npm run build`. |
| Spec gốc ghi output `docs/tasks/TASK-0001-baseline-audit.md` nhưng thư mục `docs/tasks/` chưa tồn tại | Tạo mới qua `Write` (tự tạo thư mục cha). |
| Audit phát hiện password hardcoded ở 9 vị trí (không phải 5 như estimate ban đầu) | Liệt kê đầy đủ trong mục 6.1 của audit doc — chỉ ghi nhận, không sửa. |
| Audit phát hiện `calculator.js` và `largePrintCalculator.js` cùng có hàm tên `calculateFinishingCost` nhưng signature khác | Ghi nhận trong mục 6.3 — không phải bug runtime nhưng smell cần xử lý khi extract module. |
| Audit phát hiện `customerQuote.js` chứa hằng số A4 (`21.2`, `21.0`) nhúng cứng trong code thay vì config | Ghi nhận trong mục 6.2 — phải có golden test trước khi move. |
| Vite version thực tế (5.4.21) khác package.json declared (`^5.2.0`) | Caret hợp lệ, không phải vấn đề. Ghi chú trong mục 1 của audit. |

---

## 10. Bước tiếp theo đề xuất

Theo thứ tự đã định nghĩa ở [docs/02-current-audit.md mục 9](../02-current-audit.md#9-khuy%E1%BA%BFn-ngh%E1%BB%8B-th%E1%BB%A9-t%E1%BB%B1-task-ti%E1%BA%BFp-theo):

→ **TASK-0002**: Thêm test framework (Vitest). Spec đã có ở [tasks/TASK-0002-add-test-framework.md](../../tasks/TASK-0002-add-test-framework.md).

Trước khi chạy TASK-0002 nên (đề xuất, không bắt buộc trong scope):
- Init Git repo + tạo branch `refactor/software-company-architecture`.
- Commit baseline (toàn bộ source hiện tại + 2 file audit mới này) làm điểm rollback.
