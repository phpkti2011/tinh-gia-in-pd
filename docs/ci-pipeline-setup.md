# CI pipeline setup (P3-CI)

> Ngày: 2026-05-31
> Trạng thái: 🟢 Workflow file ready — kích hoạt khi push lên GitHub
> Phụ thuộc: [Phase 2 completion](phase-2-supabase-database-completion.md) (`v3.0-phase-2-complete`)

## 1. Mục tiêu CI

Sau khi Phase 1 + Phase 2 đã hoàn thành (439 tests + 136 modules), nguy cơ regression silent vào main tăng cao khi nhiều người (hoặc nhiều task) modify code. CI pipeline đảm bảo:

1. **Mọi PR phải pass tests + build trước khi merge** — block merge nếu fail.
2. **Mọi commit lên main được verify** — phát hiện regression sớm.
3. **Tương thích Node**: kiểm tra trên cả Node 20.11.1 (dev hiện tại) lẫn 22.x (LTS mới).
4. **Không cần Supabase project thật** — code đã handle missing env gracefully (P2-01) + tests dùng mock.

## 2. Workflow chạy khi nào

Định nghĩa: [.github/workflows/ci.yml](../.github/workflows/ci.yml).

| Trigger | Khi nào |
|---|---|
| `push: branches: [main]` | Mỗi commit/squash merge vào main |
| `pull_request: branches: [main]` | Mỗi PR mới mở hoặc update với target = main |

**Không chạy** trên branch feature khi chưa mở PR — tiết kiệm CI minutes.

## 3. Các lệnh CI chạy (per Node matrix)

```bash
# 1. Checkout repo
actions/checkout@v4

# 2. Setup Node + npm cache (cache node_modules qua lockfile hash)
actions/setup-node@v4 with node-version: 20.11.1 (hoặc 22.x)

# 3. Clean install — không sửa lockfile, fail nếu lock mismatch
npm ci

# 4. Run tests (28 test files, ~440 tests)
npm test

# 5. Production build (Vite, 136 modules → ~330 kB JS)
npm run build
```

Tổng thời gian dự kiến: ~1-2 phút / matrix job.

## 4. Vì sao CI không cần `.env.local`

Code đã được thiết kế ở Phase 2 để handle Supabase env missing gracefully:

| Component | Behavior khi env thiếu |
|---|---|
| `src/lib/supabaseClient.js` | `console.warn` + `supabase = null` + `isSupabaseConfigured()` = false |
| `src/auth/authService.js` | Tất cả function trả `null` / `{error}` shape |
| `src/auth/useUserRole.js` | `{role: null, isAdmin: false}` |
| `src/auth/AdminGate.jsx` | Render `<LoginPage />` (login form sẽ fail nhưng KHÔNG crash) |
| `src/lib/priceConfigStore.js` | Tất cả function trả `null` / `[]` / `{ok: false, error}` |
| `src/utils/configStorage.js` | Fallback localStorage → default config |

**Tests** dùng mock (`vi.mock`) — không phụ thuộc Supabase project thật. Per-file `// @vitest-environment jsdom` cho test cần DOM (AdminGate, configStorage).

**Build** (Vite) không đọc env tại build-time — env chỉ được inject vào bundle qua `import.meta.env.VITE_*` tại runtime (browser). Vite build chỉ cần `package.json` + `vite.config.js` (không có file này → dùng defaults).

→ CI có thể chạy trên môi trường sạch không có `.env.local`, không có Supabase access.

## 5. Cách đọc kết quả CI

### Trên GitHub UI

1. Mở PR hoặc commit trên `main` → tab "Checks" hoặc icon ●/✓/✗ bên cạnh commit hash.
2. Mỗi matrix job hiển thị status: ⏳ pending → ▶ running → ✓ success / ✗ failure.
3. Click vào job để xem log từng step.

### Branch protection (recommended setup phía Settings repo)

```
Settings → Branches → Add rule for "main":
  ☑ Require status checks to pass before merging
  ☑ Require branches to be up to date before merging
  Required checks:
    - Node 20.11.1
    - Node 22.x  (nếu coi 22.x là required; optional → bỏ tick)
```

Sau khi setup branch protection, GitHub UI sẽ disable nút "Merge pull request" khi CI fail.

## 6. Các lỗi thường gặp

### 6.1 `npm ci` fail — "package-lock.json out of sync"

**Triệu chứng:** CI dừng ngay step "Install dependencies". Log:
```
npm error code EUSAGE
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

**Nguyên nhân:** Ai đó `npm install <pkg>` cục bộ nhưng không commit `package-lock.json`, hoặc edit `package.json` manual.

**Khắc phục:**
1. Local: `npm install` (regenerate lock) → `git add package-lock.json` → commit.
2. Hoặc `rm -rf node_modules package-lock.json && npm install` rồi commit lock mới.

### 6.2 `npm test` fail

**Triệu chứng:** 1 hoặc nhiều test red.

**Khắc phục:**
1. Local: `npm test` → đọc error stack.
2. Nếu thay đổi pricing engine: kiểm tra golden tests (TASK-0003+0008+0011+0015).
3. Nếu thay đổi auth: kiểm tra tests/auth/*.
4. Nếu thay đổi configStorage: kiểm tra tests/lib/configStorage.*.
5. **Không sửa test để cho qua** nếu chưa hiểu vì sao fail — có thể đang covering bug thật.

### 6.3 `npm run build` fail

**Triệu chứng:** Vite build error.

**Khắc phục:**
1. Local: `npm run build` → đọc lỗi.
2. Thường là import path sai (vd: vừa rename file), syntax error JSX, hoặc tree-shake circular dep.
3. Test pass nhưng build fail = lỗi static (Vite không tha import undefined).

### 6.4 Node version mismatch

**Triệu chứng:** Test pass local nhưng CI fail (hoặc ngược lại).

**Nguyên nhân:**
- Local: Node 20.11.1 (theo doc).
- CI matrix: 20.11.1 + 22.x.
- Nếu 22.x fail nhưng 20.11.1 pass → có thể package mới yêu cầu Node mới hơn, hoặc breaking change Node API.

**Khắc phục:**
1. Đọc log Node version fail.
2. Nếu package cần Node mới hơn dev hiện tại → consider upgrade local Node hoặc downgrade package.
3. **KHÔNG tự thêm/sửa package lock** chỉ để fix CI — báo cáo task riêng để user quyết định.

### 6.5 EBADENGINE warnings

**Triệu chứng:** `npm WARN EBADENGINE Unsupported engine` cho `jsdom@25.x` hoặc tương tự.

**Nguyên nhân:** Package yêu cầu Node version mới hơn dev đang dùng. Đây chỉ là **warning**, không phải error — `npm ci` vẫn complete + tests vẫn chạy được.

**Khắc phục:** Bỏ qua hoặc upgrade Node version trong matrix khi đến lúc.

## 7. Cách xử lý khi CI fail

### Quy trình debug

1. **Đọc log step nào fail** (Install / Test / Build).
2. **Reproduce local**: chạy cùng lệnh CI (`npm ci && npm test && npm run build`) trên máy.
3. **Nếu reproduce được**: fix tại local, commit, push, CI sẽ chạy lại tự động.
4. **Nếu không reproduce được**: kiểm tra Node version + OS difference (CI = Ubuntu, local = Windows).
5. **Không bypass CI** — không dùng `[skip ci]` hoặc disable required check trừ khi có lý do explicit.

### Khi nào re-run CI

GitHub UI → tab "Checks" → nút "Re-run jobs" (góc trên phải). Hữu ích khi:
- Lỗi flaky (network timeout npm registry, cache miss).
- CI infrastructure issue (action down).

**Không re-run** chỉ để "hy vọng pass" — fix root cause.

## 8. Security: KHÔNG commit secret

CI hiện tại **không cần secret nào** — code chạy được hoàn toàn không có Supabase env.

Khi nào cần thêm secret (Phase 3+):
- E2E test với Supabase test project: Settings → Secrets → Add `VITE_SUPABASE_URL_TEST` + `VITE_SUPABASE_ANON_KEY_TEST` (test project riêng, KHÔNG dùng production).
- Auto-deploy Vercel: Vercel tích hợp sẵn (không cần manual secret).

**TUYỆT ĐỐI KHÔNG**:
- ❌ Commit `.env.local` vào git (gitignored sẵn).
- ❌ Paste literal secret vào workflow YAML.
- ❌ `echo $VITE_SUPABASE_ANON_KEY` trong workflow log (có thể log secret).
- ❌ Dùng production Supabase project cho CI E2E test → dùng test project riêng.

## 9. Limitations + tương lai

### Hiện tại (P3-CI)
- ✅ Tests + build trên 2 Node version.
- ❌ Không có lint step (ESLint chưa setup ở Phase 1+2).
- ❌ Không có coverage report.
- ❌ Không có E2E test (Playwright/Cypress).
- ❌ Không có auto-deploy (manual qua Vercel UI).

### Phase 3+ có thể thêm

| Task | Mô tả |
|---|---|
| **P3-LINT** | Add ESLint + Prettier config + lint step trong CI. |
| **P3-COV** | Coverage report với Vitest v8 → upload Codecov / Coveralls. |
| **P3-E2E** | Playwright E2E với Supabase test project trên CI. |
| **P3-DEPLOY** | Auto-deploy main → Vercel production qua GitHub Action. |
| **P3-MATRIX** | Thêm OS matrix (Ubuntu / Windows / macOS) nếu cần. |

## 10. Notes

- File này chỉ document — không thay đổi behavior CI.
- CI workflow chỉ hoạt động khi repo có remote `origin` push lên GitHub. Repo local hiện tại chưa push → CI chỉ "ready" khi push.
- Sau khi push lần đầu, branch protection setup ở GitHub Settings (xem mục 5).
