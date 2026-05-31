// AdminGate.jsx — P2-03. Bọc các màn hình chỉ admin mới được vào.
//
// Flow:
//   1. Auth đang khởi tạo session  → spinner "Đang xác thực..."
//   2. Chưa login                  → <LoginPage />
//   3. Login, đang query role      → spinner "Đang kiểm tra quyền..."
//   4. Role query lỗi              → message + nút Đăng xuất
//   5. Login nhưng role ≠ admin    → "Tài khoản này không có quyền admin" + Đăng xuất
//   6. Login, role = admin         → render children + thanh status với Đăng xuất
//
// Pattern usage:
//   <AdminGate>
//     <SettingsPanel ... />
//   </AdminGate>
//
// LƯU Ý:
//   - Không bọc toàn bộ App — chỉ bọc các tab Settings/cài đặt giá.
//   - Public calculator vẫn dùng được không cần login.
//   - Nếu Supabase chưa cấu hình env: useAuth trả {user: null}, useUserRole trả
//     {isAdmin: false} → AdminGate render <LoginPage /> (LoginPage báo lỗi
//     "Supabase chưa cấu hình" khi user thử submit). KHÔNG crash trắng màn hình.

import { useAuth } from './useAuth.js';
import { useUserRole } from './useUserRole.js';
import LoginPage from './LoginPage.jsx';

function CenteredCard({ title, body, children }) {
    return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
            <div className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 w-full max-w-md text-center">
                <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
                {body && <p className="text-gray-400 mb-4 text-sm">{body}</p>}
                {children}
            </div>
        </div>
    );
}

function LogoutButton({ signOut, variant = 'link' }) {
    const className =
        variant === 'button'
            ? 'px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded font-medium'
            : 'text-sm text-gray-400 hover:text-white underline';
    return (
        <button type="button" onClick={signOut} className={className}>
            Đăng xuất
        </button>
    );
}

export default function AdminGate({ children }) {
    const { user, loading: authLoading, signOut } = useAuth();
    const { role, isAdmin, loading: roleLoading, error: roleError } = useUserRole(user);

    // 1. Auth đang khởi tạo
    if (authLoading) {
        return <CenteredCard title="Đang xác thực..." />;
    }

    // 2. Chưa login
    if (!user) {
        return <LoginPage />;
    }

    // 3. Đã login, đang query role
    if (roleLoading) {
        return (
            <CenteredCard title="Đang kiểm tra quyền...">
                <p className="text-xs text-gray-500 mt-2">{user.email}</p>
            </CenteredCard>
        );
    }

    // 4. Role error
    if (roleError) {
        return (
            <CenteredCard title="Không kiểm tra được quyền" body={roleError}>
                <div className="mt-4">
                    <LogoutButton signOut={signOut} variant="button" />
                </div>
            </CenteredCard>
        );
    }

    // 5. Đã login nhưng không phải admin
    if (!isAdmin) {
        return (
            <CenteredCard
                title="Tài khoản này không có quyền admin"
                body={`Liên hệ quản trị viên để được cấp quyền admin cho tài khoản ${user.email || 'này'}.`}
            >
                <p className="text-xs text-gray-500 mb-4">
                    Role hiện tại: <span className="text-yellow-400">{role || '(chưa gán)'}</span>
                </p>
                <LogoutButton signOut={signOut} variant="button" />
            </CenteredCard>
        );
    }

    // 6. Admin — render children với thanh status
    return (
        <div>
            <div className="flex justify-end items-center gap-3 mb-3 text-xs">
                <span className="text-green-400">🔓 Admin: {user.email}</span>
                <LogoutButton signOut={signOut} />
            </div>
            {children}
        </div>
    );
}
