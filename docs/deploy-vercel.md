# Vercel Deploy Setup (P3-DEPLOY)

> Ngày: 2026-06-01
> Trạng thái: 🟡 Code config ready — chờ setup phía Vercel Dashboard
> Tiền đề: [P3-FMT](lint-prettier-setup.md) (`v3.4-prettier-formatted`), repo đã push GitHub

## 1. Mục tiêu

Auto-deploy `main` branch → Vercel production mỗi khi push. Mỗi PR → preview deployment riêng (URL `<branch>-<project>.vercel.app`).

App sẽ được host ở:
- **Production**: `https://tinh-gia-in-pd.vercel.app` (hoặc custom domain sau)
- **Preview**: `https://tinh-gia-in-pd-<git-branch>-<vercel-user>.vercel.app`

## 2. So sánh 2 approach

### Approach A: Vercel Git Integration ★ RECOMMENDED

- **Cách hoạt động**: Vercel link trực tiếp với GitHub repo qua OAuth. Mỗi push lên main → auto build + deploy.
- **Pros**:
  - Setup 1 lần qua UI, không cần code thêm.
  - Không cần GitHub secrets.
  - Preview deploy tự động cho mọi PR.
  - Vercel có UI dashboard quản lý deployments.
  - Tự revert được trên Dashboard nếu deploy hỏng.
- **Cons**:
  - Phụ thuộc Vercel platform (vendor lock-in nhẹ).
  - Vercel cần permission đọc repo GitHub (OAuth scope).

### Approach B: GitHub Action với Vercel CLI

- **Cách hoạt động**: GitHub Actions workflow chạy `vercel deploy` với token. Triggered bởi push main hoặc PR.
- **Pros**:
  - Control hơn (custom logic trước/sau deploy).
  - GitHub Actions UI track deployment cùng CI.
- **Cons**:
  - Cần GitHub Secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.
  - Workflow YAML phức tạp hơn.
  - Vẫn cần Vercel project tạo trước (cùng setup như A).

**Khuyến nghị: Approach A** cho dự án nhỏ-vừa, single-dev. Đơn giản, ít maintenance.

## 3. Setup Approach A — Vercel Git Integration

### 3.1 Tạo Vercel account (nếu chưa)

1. https://vercel.com/signup → "Continue with GitHub" (link với account `phpkti2011`).
2. Free tier (Hobby) — đủ cho dự án này (100 GB bandwidth/tháng, 100 deploys/tháng).

### 3.2 Import GitHub repo

1. https://vercel.com/new
2. "Import Git Repository" → tìm `phpkti2011/tinh-gia-in-pd` → **Import**.
3. **Configure Project**:
   - **Project Name**: `tinh-gia-in-pd` (auto-fill từ repo name)
   - **Framework Preset**: Vite (auto-detect)
   - **Root Directory**: `./` (default)
   - **Build Command**: `npm run build` (đã trong `vercel.json`)
   - **Output Directory**: `dist` (đã trong `vercel.json`)
   - **Install Command**: `npm ci` (đã trong `vercel.json`)

### 3.3 Environment Variables

Trong "Configure Project" → expand "Environment Variables" → add:

| Key | Value | Environments |
|---|---|---|
| `VITE_SUPABASE_URL` | (từ Supabase Dashboard → Project Settings → API → Project URL) | Production + Preview + Development |
| `VITE_SUPABASE_ANON_KEY` | (từ Supabase Dashboard → Project Settings → API → anon/public key) | Production + Preview + Development |

**LƯU Ý:**
- KHÔNG cần `VITE_ADMIN_PASSWORD` (đã removed ở P2-05.6).
- Nếu chưa setup Supabase project, có thể skip env này — app sẽ fallback localStorage/default. Auth không hoạt động nhưng calculator public chạy bình thường.

### 3.4 Deploy

1. Click **Deploy**.
2. Vercel build (~30-60 giây): `npm ci` → `npm run build` → upload dist/.
3. Sau khi xong → URL production hiển thị, vd `https://tinh-gia-in-pd.vercel.app`.
4. Mở URL → app load.

### 3.5 Verify

- ✅ Trang chủ load (HomePage với 4 button module).
- ✅ Click vào 1 module (vd Decal) → calculator render.
- ✅ Tab Settings → render `<LoginPage />` (cần admin login — đúng behavior).
- ✅ Try logout/login admin nếu Supabase setup → AdminGate flow work.

### 3.6 Auto-deploy trigger

Sau khi link xong:
- **Push lên `main`** → auto build + deploy production. Vercel sẽ comment trên commit phía GitHub.
- **Mở PR** → auto build preview, comment URL preview vào PR.
- **Push commit lên PR branch** → re-deploy preview.

## 4. Setup Approach B — GitHub Action (alternative)

Nếu muốn dùng GitHub Action thay vì git integration:

### 4.1 Lấy Vercel credentials

```bash
# Cài Vercel CLI
npm i -g vercel

# Login
vercel login

# Link repo local với Vercel (sẽ tạo .vercel/ folder)
vercel link

# Lấy credentials
cat .vercel/project.json
# → { "orgId": "...", "projectId": "..." }

# Tạo token: https://vercel.com/account/tokens → Create Token
```

### 4.2 Add GitHub Secrets

GitHub → Settings → Secrets and variables → Actions → "New repository secret":
- `VERCEL_TOKEN`: token vừa tạo
- `VERCEL_ORG_ID`: từ `.vercel/project.json`
- `VERCEL_PROJECT_ID`: từ `.vercel/project.json`

### 4.3 Add workflow `.github/workflows/deploy.yml`

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install Vercel CLI
        run: npm install --global vercel@latest

      - name: Pull Vercel environment
        run: vercel pull --yes --environment=${{ github.event_name == 'push' && 'production' || 'preview' }} --token=${{ secrets.VERCEL_TOKEN }}

      - name: Build
        run: vercel build ${{ github.event_name == 'push' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}

      - name: Deploy
        run: vercel deploy --prebuilt ${{ github.event_name == 'push' && '--prod' || '' }} --token=${{ secrets.VERCEL_TOKEN }}
```

### 4.4 Add `.vercel/` to .gitignore (nếu chưa)

```
.vercel
```

Đã có trong `.gitignore` từ TASK-0002.6 — verify.

## 5. `vercel.json` config (đã commit)

File [vercel.json](../vercel.json) ở root project:

```json
{
  "framework": "vite",
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "installCommand": "npm ci",
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ],
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

**Giải thích:**
- `framework: vite` — Vercel áp dụng optimizations cho Vite.
- `rewrites` — SPA fallback (mọi URL → serve `/` = `index.html`). Đảm bảo refresh URL không 404.
- `headers`:
  - Security headers cơ bản (chống MIME-sniff, clickjacking, referrer leak).
  - Cache aggressive cho `/assets/*` (Vite output có hash trong tên file, safe to cache 1 năm).

## 6. Production checklist sau khi deploy

- [ ] App load tại URL Vercel production.
- [ ] HomePage + 4 calculator tabs work (không cần login).
- [ ] Settings tab render LoginPage (admin gate).
- [ ] (Nếu Supabase setup) Login admin → Settings work + save config → Supabase row update.
- [ ] DevTools Network → request Supabase (nếu env set) → 200 OK.
- [ ] DevTools Console → no errors.
- [ ] Lighthouse audit (Vercel Dashboard → Insights) → Performance/SEO/A11y score acceptable.
- [ ] Setup custom domain (optional): Vercel Dashboard → Project → Settings → Domains.

## 7. Hậu setup — Workflow daily

```
Local dev:
  npm run dev → http://localhost:5173 (test)

Feature branch:
  git checkout -b feature/xxx
  ... code ...
  git push origin feature/xxx
  → Vercel auto-deploy preview
  → PR comment có URL preview

Open PR vào main:
  → GitHub CI chạy 5 steps (lint, format, test, build)
  → Vercel deploy preview
  → Review + Merge khi CI + Vercel xanh
  → Vercel auto-deploy production

Direct push main (sau khi merge):
  → GitHub CI chạy + branch protection check
  → Vercel auto-deploy production (nếu CI pass)
```

## 8. Limitations + tương lai

### Hiện tại (P3-DEPLOY)
- ✅ Auto-deploy main → production qua Vercel git integration.
- ✅ Preview deploys cho mọi PR.
- ✅ SPA routing fallback + security headers + asset cache.
- ❌ Chưa setup custom domain.
- ❌ Chưa monitoring (Sentry/LogRocket).
- ❌ Chưa A/B testing hoặc feature flags.

### Phase 3+ có thể thêm

| Task | Mô tả |
|---|---|
| **P3-DOMAIN** | Setup custom domain (vd `tinh-gia.<your-domain>.vn`) + HTTPS auto. |
| **P3-SENTRY** | Add `@sentry/react` để capture runtime errors. |
| **P3-ANALYTICS** | Vercel Analytics built-in hoặc Plausible/Umami self-host. |
| **P3-ROLLBACK-UI** | Vercel Dashboard rollback button đã built-in. Document procedure. |
| **P3-PREVIEW-PROTECT** | Vercel Preview Deploy Protection (password / sso) cho preview URL không public. |

## 9. Rủi ro / lưu ý

- **Vercel free tier limits**: 100 GB bandwidth/tháng, 100 deploys/tháng. Đủ cho dự án này.
- **Cold start**: Static SPA = không có cold start. Mỗi request serve từ CDN edge.
- **Env vars rotation**: khi rotate Supabase keys, phải update Vercel Env Vars + redeploy.
- **Vercel build environment**: Node version Vercel default = 20.x. Khớp với `Node 20.11.1` matrix CI.
- **Build size**: 330.40 kB JS — well under Vercel limits (50 MB serverless / 100 MB total).
