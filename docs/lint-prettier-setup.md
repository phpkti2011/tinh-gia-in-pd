# ESLint + Prettier setup (P3-LINT.1 + P3-LINT.2)

> Ngày: 2026-05-31 (P3-LINT.2 update: fix DecalResultPanel useMemo + enable lint CI)
> Trạng thái: 🟢 **Lint enforced trong CI** (0 errors, 83 warnings technical debt acceptable). Prettier `format:check` vẫn chưa enforce (100 files chưa auto-format).
> Tiền đề: [P3-CI](ci-pipeline-setup.md) (`v3.1-ci-pipeline`)

## 1. Mục tiêu

Thiết lập **baseline** ESLint v9 (flat config) + Prettier v3 để:
- Bắt lỗi static cơ bản (no-undef, hook rules, syntax).
- Chuẩn hoá code style cho task tương lai.

**Triết lý**: nhẹ, không strict. Mục tiêu task này là **đặt nền** chứ không phải sửa hàng loạt 50+ source files.

## 2. Package mới (devDeps)

| Package | Version | Vai trò |
|---|---|---|
| `eslint` | `^9` | Pinned v9 (v10 mới ra conflict với eslint-plugin-react peer dep) |
| `@eslint/js` | `^9` | js.configs.recommended |
| `eslint-plugin-react` | `^7` | React JSX rules |
| `eslint-plugin-react-hooks` | `^5` | rules-of-hooks + exhaustive-deps |
| `eslint-plugin-react-refresh` | `^0.4` | Vite HMR safety (chưa enable rule cụ thể) |
| `globals` | `^15` | Pre-defined globals (browser, node, …) |
| `prettier` | `^3` | Code formatter |

## 3. Files mới

- [eslint.config.js](../eslint.config.js) — flat config (3 sections: ignores, src, tests)
- [.prettierrc](../.prettierrc) — singleQuote, semi, printWidth 100, tabWidth 4
- [.prettierignore](../.prettierignore) — node_modules, dist, docs, SQL, markdown root

## 4. Scripts mới trong `package.json`

```json
"scripts": {
  "lint": "eslint .",
  "format:check": "prettier --check ."
}
```

**KHÔNG thêm** `"format": "prettier --write ."` — đề phòng dev chạy nhầm format hàng loạt mà chưa review. Khi cần format, gọi trực tiếp `npx prettier --write <file>`.

## 5. ESLint rules baseline

### Errors (fail CI khi add vào)
- `no-undef`: error (variable không khai báo)
- `react-hooks/rules-of-hooks`: error (invariant — hooks phải gọi same order mỗi render)
- `react/jsx-key`: error (list rendering bắt buộc key)

### Warnings (không fail, audit only)
- `no-unused-vars`: warn (ignore vars/args start với `_`)
- `no-empty`: warn (cho phép empty catch)
- `react-hooks/exhaustive-deps`: warn (missing dep useEffect/useMemo)

### Disabled (project-specific)
- `react/jsx-uses-react` + `react/react-in-jsx-scope`: off (React 18 auto JSX transform)
- `react/prop-types`: off (no PropTypes, no TypeScript)
- `react/no-unescaped-entities`: off (nhiều chỗ đã dùng)

## 6. Kết quả lint hiện tại

### ✅ Errors: 0 (sau P3-LINT.2)

P3-LINT.1 còn 1 error trong `DecalResultPanel.jsx:22` (useMemo conditional). P3-LINT.2 đã fix bằng pattern wrapper guard + inner content component:

```jsx
// Trước (vi phạm rules-of-hooks):
function LayoutVisualization({ result, params }) {
    if (!layout) return null;  // early return
    const stickers = useMemo(...);  // <-- conditional hook!
}

// Sau (Option B per spec):
function LayoutVisualization({ result, params }) {
    if (!layout) return null;  // outer guard — KHÔNG có hook ở đây
    return <LayoutVisualizationContent ... />;
}
function LayoutVisualizationContent({ result, params }) {
    // useMemo luôn được gọi same order — đáp ứng rules-of-hooks
    const stickers = useMemo(...);
}
```

**Behavior identical** — chỉ thêm 1 layer wrapper, không thay đổi guards, useMemo deps, hay render output.

P3-LINT.1 đã fix 5 errors `no-case-declarations` ở `finishing.js` (wrap `case 'tag'` với `{}`).

### Warnings: 82 (không fail lint)

Phân loại:
- ~15 unused `React` import (React 18 JSX transform — không cần import nữa, có thể safe-remove dần)
- ~10 unused vars/args trong source legacy
- ~9 unused `eslint-disable-next-line no-console` directives (tôi thêm ở Phase 2 — rule `no-console` không enabled nên directive thừa)
- ~5 unused functions/components (LargePrintModule, DecalModule, … định nghĩa nhưng không export)
- ~3 missing dep useMemo/useEffect

Tất cả là **technical debt cũ** — không phá tests, không phá runtime.

### Errors đã fix trong task này (5)

`src/modules/small-print/engine/finishing.js` lines 75-79 — `no-case-declarations`:
- Wrap `case 'tag':` block với `{}` để `const spacing/pressW/numAcross/numDown/numOnMold` không leak ra ngoài scope.
- Fix nhỏ + an toàn + 0 thay đổi behavior (chỉ thêm scope braces).

## 7. Kết quả format:check hiện tại

**100 files** có style không match Prettier config (chủ yếu tab width, line length, trailing comma). Bao gồm:
- src/ (~30 files)
- tests/ (~25 files)
- Configs (vite.config.js, postcss.config.js, tailwind.config.js)
- 1 SQL config (tailwind.config.js)
- package-lock.json (1 file lớn — đã trong .prettierignore, nhưng vẫn warn)

**KHÔNG chạy `prettier --write`** ở task này per spec yêu cầu.

## 8. CI integration (sau P3-LINT.2)

`.github/workflows/ci.yml` giờ chạy 4 steps theo thứ tự:
```
npm ci → npm run lint → npm test → npm run build
```

- ✅ **`npm run lint` enforced** — exit 0 hiện tại (0 errors, 83 warnings OK).
- ❌ **`npm run format:check` chưa enforce** — 100 files chưa auto-format theo Prettier. Sẽ add ở **P3-FMT** sau khi `prettier --write` toàn repo (task riêng, pre-announce vì diff lớn).

Mỗi PR/push vào main giờ phải pass lint trước khi merge (sau khi setup branch protection phía GitHub Settings).

## 9. Cách xử lý khi lint fail

### Dev local
```bash
npm run lint        # xem danh sách lỗi
npm run lint -- --fix    # auto-fix những lỗi có thể (~12 cái fixable)
```

Lỗi không auto-fixable → đọc message ESLint + fix manual. **KHÔNG dùng `// eslint-disable`** trừ khi có lý do explicit (document trong comment).

### Code review
- Lint warnings: acceptable nếu có lý do (nhưng nên audit dần).
- Lint errors: phải fix trước khi merge (sau khi P3-LINT.2 enable CI).

## 10. Kế hoạch task tiếp theo

### ✅ P3-LINT.2 — Fix DecalResultPanel useMemo + enable lint CI — DONE

Đã làm:
1. ✅ Refactor `LayoutVisualization`: tách inner `LayoutVisualizationContent` component (Option B per spec).
2. ✅ Verify `npm run lint` → 0 errors (83 warnings remain — technical debt).
3. ✅ Add step `npm run lint` vào `.github/workflows/ci.yml` (giữa `npm ci` và `npm test`).
4. ⏸ Test bằng push commit + verify CI step lint pass — chờ user push lên GitHub.

### P3-LINT.3 — Reduce warnings (optional, gradual)

1. Remove unused `React` imports (~15 file, safe — React 18 auto JSX).
2. Remove unused `eslint-disable-next-line no-console` directives (~9 dòng).
3. Audit + fix unused vars / missing deps case-by-case.

Mục tiêu: warnings < 20.

### P3-FMT — Auto-format toàn repo (separate task)

1. `npx prettier --write src/ tests/` — format tất cả source + tests cùng lúc.
2. Commit dạng "chore: prettier --write src + tests" — KHÔNG kèm code change khác (dễ review diff).
3. Add `npm run format:check` vào CI.
4. **Lưu ý**: 100+ files thay đổi → diff cực lớn. Phải pre-announce + freeze nhánh khác trước khi merge.

### P3-LINT.4 — Stricter rules (optional, future)

- Add: `import/no-cycle`, `react/no-array-index-key`, `prefer-const`, `eqeqeq`.
- Add: `eslint-plugin-jsx-a11y` cho accessibility.
- Có thể tách rules per environment (browser vs node).

## 11. Limitations / lưu ý

- ESLint v10 mới ra (10.4.x) — `eslint-plugin-react` chưa support → phải pin v9. Khi v7+ react plugin update sang v10, bump cả 2 cùng lúc.
- Prettier ignore `*.md` (docs) và `*.sql` — có thể bật lại sau khi review.
- `tailwind.config.js` có format issue nhỏ — không quan trọng.
- Lint + format:check chạy chậm hơn build (~3-5s) — chấp nhận được.
