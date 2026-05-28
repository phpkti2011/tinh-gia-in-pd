# Báo cáo: TASK-0002 — Add test framework

| Trường | Giá trị |
|---|---|
| Spec gốc | [tasks/TASK-0002-add-test-framework.md](../../tasks/TASK-0002-add-test-framework.md) |
| Ngày thực hiện | 2026-05-28 |
| Người thực hiện | Claude (Opus 4.7, 1M context) |
| Trạng thái | ✅ Done (sau 1 lần block & phương án A được user duyệt) |
| Loại task | Tooling setup (không refactor engine) |

---

## 1. Mục tiêu task

Thêm test framework để khoá công thức tính giá ở các task sau (golden test).

## 2. Lịch sử thực thi

| Lần | Hành động | Kết quả |
|---|---|---|
| 1 | `npm install -D vitest` (mặc định latest) → cài Vitest **4.1.7** | Cảnh báo `EBADENGINE`. `npm test` fail: `node:util.styleText` không tồn tại trên Node 20.11.1 (`rolldown` dep cần Node ≥ 20.19). |
| 2 | Dừng theo quy tắc "có lỗi thì dừng và báo cáo, không sửa lan rộng". Báo cáo 3 phương án. | User chọn **phương án A: downgrade Vitest 2.x**. |
| 3 | `npm install -D vitest@^2` → cài Vitest **2.1.9** | Không còn `EBADENGINE`. `npm test` PASS 2/2, `npm run build` PASS. |

## 3. File đã tạo mới

| File | Vai trò |
|---|---|
| [tests/sanity.test.js](../../tests/sanity.test.js) | 2 test case sanity (1+1=2; matchObject) |
| [tests/README.md](../../tests/README.md) | Convention thư mục test + ghi chú golden test |
| [docs/tasks/TASK-0002-add-test-framework.md](TASK-0002-add-test-framework.md) | Báo cáo này |

## 4. File đã chỉnh sửa

| File | Thay đổi |
|---|---|
| [package.json](../../package.json) | + scripts `test: "vitest run"`, `test:watch: "vitest"`<br>+ devDep `vitest: "^2.1.9"` |
| `package-lock.json` | Auto-updated bởi npm |

**Không file `.js` / `.jsx` nào trong `src/` bị sửa.**

## 5. Verification

```
npm test
> tinh-gia-in@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/.../tinh-gia-in
 ✓ tests/sanity.test.js (2 tests) 4ms
 Test Files  1 passed (1)
      Tests  2 passed (2)
   Duration  1.03s

npm run build
> tinh-gia-in@1.0.0 build
> vite build

vite v5.4.21 building for production...
✓ 55 modules transformed.
dist/assets/index-58SiIv15.js  319.63 kB │ gzip: 86.05 kB
✓ built in 1.94s
```

- ✅ `npm test`: 2 passed / 2 (1.03s, exit 0)
- ✅ `npm run build`: 55 modules, 1.94s, exit 0, không warning
- ✅ Bundle size không đổi so với TASK-0001 (319.63 kB JS, 32.46 kB CSS — vì không sửa source)

## 6. Vulnerabilities

`npm install` báo **6 vulnerabilities** (5 moderate, 1 high) — **tất cả thuộc dev dependencies của Vitest 2.1.9** (verified qua `npm audit --omit=dev` → 0 prod vuln). Không ảnh hưởng bundle production gửi cho người dùng cuối.

**Không chạy `npm audit fix --force`** theo yêu cầu — sẽ xử lý ở task riêng nếu cần.

## 7. Definition of Done

| DoD (theo spec gốc) | Kết quả |
|---|---|
| Cài test framework | ✅ Vitest 2.1.9 |
| Thêm script `test` | ✅ + thêm `test:watch` |
| Tạo test mẫu | ✅ [tests/sanity.test.js](../../tests/sanity.test.js) |
| Chạy `npm test` | ✅ 2/2 pass |
| Chạy `npm run build` | ✅ pass, 1.94s |
| Không refactor engine | ✅ 0 file `src/` bị sửa |
| Không đổi UI | ✅ |

## 8. Bước tiếp theo đề xuất

→ **TASK-0003**: Viết golden test cho `decalCalculator` ([tasks/TASK-0003-decal-golden-tests.md](../../tasks/TASK-0003-decal-golden-tests.md)). Module decal được khuyến nghị ưu tiên theo [docs/pricing-rules/decal.md](../pricing-rules/decal.md).

Khuyến nghị tuỳ chọn trước TASK-0003:
- Init Git repo + commit baseline (gồm cả TASK-0001 + TASK-0002) làm điểm rollback.
