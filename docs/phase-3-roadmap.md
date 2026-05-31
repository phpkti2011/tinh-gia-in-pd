# Phase 3 — Roadmap

> Ngày bắt đầu: 2026-05-31
> Tiền đề: [Phase 2 completion](phase-2-supabase-database-completion.md) (`v3.0-phase-2-complete`)
> Trạng thái: 🟡 Mới bắt đầu — P3-CI đang trong branch `chore/setup-ci-pipeline`

## 1. Tóm tắt

Sau khi Phase 1 (pricing engine + golden tests) và Phase 2 (Supabase Auth + database + remove Apps Script) đã đóng, Phase 3 tập trung vào **Operations & DevX** trước, sau đó là feature UI và security hardening.

Roadmap chi tiết trong [phase-2-supabase-database-completion.md mục 9](phase-2-supabase-database-completion.md#9-phase-3--đề-xuất).

## 2. Sub-task tracker

### Operations & DevX (nhóm 1 — bắt đầu)

| Sub-task | Mục tiêu | Trạng thái |
|---|---|---|
| **P3-CI** | GitHub Actions: `npm ci && npm test && npm run build` trên push main + PR. Matrix Node 20.11.1 + 22.x. | 🟡 In progress (`chore/setup-ci-pipeline`) |
| P3-LINT | ESLint + Prettier + lint step trong CI. | ⏸ |
| P3-COV | Coverage report (Vitest v8 → Codecov). | ⏸ |
| P3-E2E | Playwright E2E với Supabase test project. | ⏸ |
| P3-DEPLOY | Auto-deploy Vercel main qua GitHub Action. | ⏸ |

### UI feature (nhóm 2 — sau Ops)

| Sub-task | Mục tiêu | Trạng thái |
|---|---|---|
| P3-HISTORY | Tab "Lịch sử" trong SettingsPanel: list `loadVersionHistory()` + `loadChangeLog()` + nút Rollback. (Carryover P2-05.5 optional) | ⏸ |
| P3-TOAST | Toast notification cho cloud save result. Đóng R6 (save fail silent). | ⏸ |
| P3-NOTE | Input "Ghi chú thay đổi" khi admin save (truyền vào RPC). | ⏸ |

### Security hardening

| Sub-task | Mục tiêu | Trạng thái |
|---|---|---|
| P3-REWRITE | (Nếu push public) `git filter-repo --replace-text` xoá literal password + URL Apps Script khỏi history. Destructive. | ⏸ (optional) |
| P3-RATELIMIT | Rate limit Supabase RPC. | ⏸ |
| P3-AUDIT-UI | Admin UI xem `price_change_logs`. | ⏸ (subset của P3-HISTORY) |
| P3-2FA | 2FA cho admin login qua Supabase Auth TOTP. | ⏸ |

### Data integrity

| Sub-task | Mục tiêu | Trạng thái |
|---|---|---|
| P3-SCHEMA-MIGRATE | Migration script khi bump schema_version. | ⏸ |
| P3-PUBLIC-ADMIN-SPLIT | Tách `data` jsonb thành `public_data` + `admin_data`. | ⏸ |
| P3-DECAL-CASE-G | Fix Excel formula gap decal Case G + D (Phase 1 carryover). | ⏸ (cần Excel reference) |

### Performance & UX

| Sub-task | Mục tiêu | Trạng thái |
|---|---|---|
| P3-REALTIME | Supabase Realtime sub: admin A save → admin B UI auto-refresh. | ⏸ |
| P3-CACHE | TanStack Query / SWR cho roleService + priceConfigStore. | ⏸ |
| P3-MOBILE | Responsive cho 4 SettingsPanel. | ⏸ |

## 3. Manual work (ngoài code)

Việc còn cần admin thực hiện thủ công, không phụ thuộc Phase 3 code:

| Việc | Đóng rủi ro | Trạng thái |
|---|---|---|
| Tạo Supabase project + chạy 2 SQL files | R2-R4 (Phase 2 production setup) | ⏸ |
| Decommission Apps Script endpoint cũ phía Google | R1 (Phase 2 endpoint cũ vẫn alive) | ⏸ |
| Xoá `google-apps-script.js` khỏi máy dev cũ | R9 | ⏸ |

## 4. Tag plan dự kiến Phase 3

Tag milestone Phase 3 sẽ dùng pattern `v3.X-task-name`:
- `v3.1-ci-pipeline` (sau P3-CI)
- `v3.2-deploy-automation` (sau P3-DEPLOY)
- `v3.3-history-rollback-ui` (sau P3-HISTORY)
- ... (tuỳ thứ tự thực hiện)
- `v4.0-phase-3-complete` (Phase 3 sealed)
