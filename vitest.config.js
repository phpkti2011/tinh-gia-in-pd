import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// P3-COV: Vitest config riêng cho test + coverage.
// Vite build config (vite.config.js) giữ riêng — không touch.
export default defineConfig({
    plugins: [react()],
    test: {
        // Default Node env. Per-file override qua `// @vitest-environment jsdom`
        // (xem tests/auth/adminGate.test.jsx + tests/lib/configStorage.supabase-*.test.js).
        environment: 'node',

        // Coverage config (chỉ active khi `vitest run --coverage`)
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html', 'json-summary'],
            reportsDirectory: './coverage',

            // Include: chỉ measure source code trong src/
            include: ['src/**/*.{js,jsx}'],

            // Exclude: bỏ qua những thứ không liên quan đến unit test
            // (UI components + render helpers — sẽ cover qua E2E ở Phase 3 sau).
            exclude: [
                'src/main.jsx', // entry point — render-only, không có logic
                'src/**/*.test.{js,jsx}', // tests trong src nếu có
                'src/config/**', // 4 compat shims re-export từ modules/
                'src/components/**', // UI components — chưa có UI tests
                'src/auth/LoginPage.jsx', // UI form
                'src/auth/AdminGate.jsx', // UI gate (đã test riêng trong tests/auth)
                'src/utils/canvasRenderer.js', // Canvas 2D rendering helper — E2E later
            ],

            // KHÔNG đặt threshold ở P3-COV — chỉ baseline.
            // Phase 3 sau có thể bật threshold gradually theo module.
        },
    },
});
