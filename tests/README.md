# Thư mục test

Thư mục nền tảng cho test framework (Vitest), được tạo ở TASK-0002.

## Quy ước

- File test đặt tên `*.test.js` hoặc `*.test.jsx`.
- Sanity test (kiểm tra runner) ở [sanity.test.js](sanity.test.js).
- **Golden test** cho từng module pricing engine sẽ được thêm dần ở các task sau:
  - TASK-0003: golden test cho `decalCalculator`.
  - Các task tiếp theo: golden test cho `calculator` (small-print), `largePrintCalculator`, `uvdtfCalculator`.

## Chạy test

```bash
npm test          # chạy 1 lần rồi thoát
npm run test:watch # watch mode khi phát triển
```

## Nguyên tắc

- Test **pure function** trong `src/utils/*Calculator.js` — không mount React.
- Golden test = khóa input/output hiện tại làm điểm tham chiếu, để khi refactor engine không vô tình đổi công thức.
- Không sửa engine khi chưa có golden test (theo [docs/pricing-rules/00-golden-test-cases.md](../docs/pricing-rules/00-golden-test-cases.md)).
