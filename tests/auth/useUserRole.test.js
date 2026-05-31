// Smoke test cho src/auth/useUserRole.js (P2-02).
//
// Hook React thực sự cần jsdom + @testing-library/react để render. Hai dep này
// chưa cài ở project. Task này chỉ verify module import được + export đúng shape.
// Test hành vi render sẽ làm ở P2-03 khi wire vào UI (lúc đó setup jsdom).

import { describe, it, expect } from 'vitest';

import { useUserRole } from '../../src/auth/useUserRole.js';

describe('P2-02: useUserRole (smoke export)', () => {
    it('export là function', () => {
        expect(typeof useUserRole).toBe('function');
    });

    it('có 1 parameter (user)', () => {
        // React hook nhận 1 arg `user`. useState/useEffect không tính.
        expect(useUserRole.length).toBe(1);
    });
});
