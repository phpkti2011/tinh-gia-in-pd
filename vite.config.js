import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { RELEASE_NOTES } from './src/releaseNotes.js';

// Dấu phiên bản build, để tab đang mở biết đã có bản mới.
//
// Trên Vercel lấy mã commit; chạy máy nhà thì lấy mốc thời gian (mỗi lần build một khác,
// đúng ý: dev muốn thử băng báo thì build lại là thấy).
const buildId = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || `dev-${Date.now()}`;

// Phát ra /version.json ở GỐC dist.
//
// ⚠ TUYỆT ĐỐI không để file này dưới /assets/: vercel.json đang đặt /assets/* là
// `max-age=31536000, immutable`, client sẽ không bao giờ thấy giá trị mới. Gốc dist thì
// Vercel revalidate bình thường.
//
// Nhúng luôn nội dung bản phát hành: tab đang mở chạy CODE CŨ nên nó chỉ biết danh sách
// cũ — muốn nó nói được "bản mới có gì" thì nội dung phải đi cùng file này.
function emitVersionFile() {
    return {
        name: 'emit-version-json',
        generateBundle() {
            this.emitFile({
                type: 'asset',
                fileName: 'version.json',
                source: JSON.stringify(
                    {
                        buildId,
                        buildTime: new Date().toISOString(),
                        releases: RELEASE_NOTES.slice(0, 5),
                    },
                    null,
                    2
                ),
            });
        },
    };
}

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react(), emitVersionFile()],
    define: {
        __APP_BUILD_ID__: JSON.stringify(buildId),
    },
});
