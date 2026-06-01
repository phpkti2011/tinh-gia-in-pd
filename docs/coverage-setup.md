# Vitest Coverage Setup (P3-COV)

> Ngày: 2026-06-01
> Trạng thái: 🟢 Baseline measured — KHÔNG enforce threshold (baseline-only task)
> Tiền đề: [P3-FMT](lint-prettier-setup.md) (`v3.4-prettier-formatted`)

## 1. Mục tiêu

Add coverage report cho Vitest để biết:
- Bao nhiêu code đã được test (% stmts/branch/func/lines).
- File nào cần thêm test (per-file breakdown).
- Baseline cho P3-COV.X future threshold gradually.

**KHÔNG đặt threshold** trong task này — chỉ measure để hiểu state hiện tại.

## 2. Package mới (devDep)

| Package | Version | Vai trò |
|---|---|---|
| `@vitest/coverage-v8` | `^2.1.9` | V8 native coverage provider — khớp với Vitest 2.x |

V8 provider được chọn (thay vì `istanbul`) vì:
- Native Node.js — không cần instrument code.
- Nhanh hơn istanbul đáng kể.
- Tests + build vẫn chạy bình thường (coverage off-by-default).

## 3. Script mới

```json
{
  "test:coverage": "vitest run --coverage"
}
```

Chạy local:
```bash
npm run test:coverage
```

Output:
- **Terminal**: text report + per-file breakdown
- **`coverage/index.html`**: HTML report (mở browser xem chi tiết từng file, click vào file để xem dòng nào uncovered)
- **`coverage/coverage-summary.json`**: JSON summary cho tool tích hợp (Codecov, GitHub Actions)

`coverage/` đã thêm vào `.gitignore` — không commit.

## 4. Cấu hình ở [vitest.config.js](../vitest.config.js)

```js
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'html', 'json-summary'],
    reportsDirectory: './coverage',
    include: ['src/**/*.{js,jsx}'],
    exclude: [
      'src/main.jsx',                  // entry point
      'src/**/*.test.{js,jsx}',        // tests
      'src/config/**',                 // compat shims
      'src/components/**',             // UI components (no UI tests yet)
      'src/auth/LoginPage.jsx',        // UI form
      'src/auth/AdminGate.jsx',        // UI gate (covered by tests/auth/adminGate.test.jsx)
      'src/utils/canvasRenderer.js',   // Canvas 2D rendering (E2E later)
    ],
  },
}
```

### Tại sao exclude UI components?

UI components cần jsdom + @testing-library/react để render-test. Hiện chỉ `AdminGate.jsx` có UI test (P2-03). Còn lại (`SettingsPanel`, `ResultPanel`, `InputPanel`, …) chưa có UI tests — coverage sẽ là 0% và làm baseline meaningless.

Coverage hiện tại focus vào **business logic** (engines, configs, auth services, storage) — đo đúng giá trị test golden + smoke tests đem lại.

## 5. Coverage baseline hiện tại

```
File               | % Stmts | % Branch | % Funcs | % Lines
All files          |   65.00 |    74.85 |   91.48 |   64.93
```

### Per-module breakdown

| Module / Group | Stmts | Notes |
|---|---|---|
| `src/auth/*` (services, hooks) | ~85-100% | Phase 2 smoke tests covered |
| `src/lib/priceConfigStore.js` | ~85% | P2-05.2 smoke tests |
| `src/lib/supabaseClient.js` | ~90% | P2-01 tests |
| `src/utils/configStorage.js` | 86% | Storage tests + Supabase wire tests |
| `src/utils/customerQuote.js` | 100% | Phase 1 golden |
| `src/utils/calculator.js` | 100% | Phase 1 golden |
| `src/utils/*Calculator.js` (decal, largePrint, uvdtf) | 100% | Phase 1 golden |
| `src/utils/restoreInfinity.js` | 100% | Indirect via storage tests |
| `src/modules/decal/engine` | 96-100% | Phase 1 golden |
| `src/modules/decal/config` | 100% | Phase 1 config tests |
| `src/modules/uvdtf/engine` | 100% | Phase 1 golden |
| `src/modules/uvdtf/config` | 96% | |
| `src/modules/large-print/engine` | 94% | Some branches missed |
| `src/modules/large-print/config` | 97% | |
| `src/modules/small-print/engine` | **69%** ⚠️ | Phase 1 Excel formula gap (Cases F-I) |
| `src/modules/small-print/config` | 97% | |

### Files cần thêm tests (technical debt)

| File | % | Lý do |
|---|---|---|
| `src/modules/small-print/engine/options.js` | **46%** | Phase 1 gap — golden tests chưa cover hết printer options |
| `src/modules/small-print/engine/quote.js` | 72% | Branches gap |
| `src/modules/small-print/engine/finishing.js` | 80% | Some die-cutting branches |
| `src/utils/configStorage.js` | 86% | Edge cases trong load/save chain |

## 6. Vì sao chưa đặt threshold

Per P3-COV spec — task này chỉ baseline. Đặt threshold ngay sẽ:
1. **Fail CI** khi coverage giảm dù do test refactor (vd: gộp 2 test thành 1) — false positive.
2. **Không phản ánh chất lượng test** — coverage cao không = test tốt; coverage thấp có thể là choice (UI component khó test).
3. **Gây áp lực mảng coverage** — viết test để bumb % thay vì cover edge cases thật.

Phase 3 sau có thể bật threshold **gradually per module** sau khi audit kỹ:
```js
// Future P3-COV.X (NOT in this task):
coverage: {
  thresholds: {
    'src/modules/decal/engine/**': { lines: 95 },
    'src/modules/uvdtf/engine/**': { lines: 95 },
    'src/utils/calculator.js': { lines: 100 },
    // ... gradual ratchet
  }
}
```

## 7. CI integration — chưa add

Coverage **KHÔNG** add vào CI workflow ở P3-COV task này:
- CI hiện chạy `npm test` (439 tests, ~3s). Add coverage = thêm ~5-10s + dependency overhead → chậm hơn.
- `coverage/` output không upload đi đâu (Codecov/Coveralls cần token + signup riêng).
- Chỉ cần local dev / pre-commit chạy `npm run test:coverage` khi muốn audit.

Future tasks có thể add:
- **P3-COV-CI**: Add `npm run test:coverage` vào CI workflow + upload to Codecov.
- **P3-COV-BADGE**: Add badge vào README (sau khi Codecov setup).

## 8. Cách dùng HTML report

Sau khi chạy `npm run test:coverage`:
1. Mở `coverage/index.html` trong browser.
2. Click vào module/file để xem chi tiết.
3. Dòng đỏ = uncovered, dòng vàng = partial coverage (1 trong nhiều branches), dòng xanh = covered.

Hữu ích khi:
- Audit gap test cho module.
- Tìm dead code (uncovered + không có test nào pass qua).
- Verify edge case test thực sự chạy đúng nhánh.

## 9. Việc tiếp theo (Phase 3+)

| Task | Mô tả | Priority |
|---|---|---|
| **P3-COV-CI** | Add `test:coverage` step vào CI + upload Codecov (cần Codecov account + token). | Optional |
| **P3-COV-BADGE** | Add Codecov badge vào README. Visibility cho contributors. | Optional |
| **P3-COV-THRESHOLD** | Đặt threshold gradually per module (start với engines 95%). Fail CI nếu drop. | Sau khi audit gap |
| **P3-COV-OPTIONS** | Lấp gap test cho `options.js` (46% → 90%+). Phase 1 carryover Excel reference cases. | Sau khi có Excel ref |
| **P3-COV-UI** | UI component tests với @testing-library/react cho 4 SettingsPanel. Sẽ bumb overall coverage. | Optional (Phase 3+) |

## 10. Limitations

- **V8 provider không count dynamic imports** đúng cách trong 1 số edge case (vd tests/golden config-storage dùng `await import(...)` để mock localStorage).
- **Branch coverage cho ternary chains** có thể inaccurate (V8 limitation).
- **HTML report ~5-10 MB** cho repo size hiện tại — không commit vào git.
- **No Cypress/Playwright coverage** — chỉ unit/integration. E2E coverage cần task riêng.
