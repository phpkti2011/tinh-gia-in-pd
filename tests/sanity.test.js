// Sanity test: chỉ để xác nhận Vitest đã chạy được.
// KHÔNG test logic công thức ở đây — golden test cho từng module
// sẽ được viết ở các task riêng (TASK-0003 cho decal, v.v.).

import { describe, it, expect } from 'vitest';

describe('Test runner sanity check', () => {
    it('thực hiện phép cộng đơn giản', () => {
        expect(1 + 1).toBe(2);
    });

    it('xác nhận môi trường ES module hoạt động', () => {
        const obj = { name: 'tinh-gia-in', version: '1.0.0' };
        expect(obj).toMatchObject({ name: 'tinh-gia-in' });
    });
});
