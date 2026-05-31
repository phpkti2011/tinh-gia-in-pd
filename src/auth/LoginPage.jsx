// LoginPage component — form email/password tạm thời (P2-01).
//
// LƯU Ý:
//   - CHƯA wire vào App.jsx. Sẽ wire ở P2-02/P2-03.
//   - UI tối giản, không bắt buộc đẹp ở task này — sẽ polish khi tích hợp.
//   - Tailwind classes match style hiện tại của các SettingsPanel.
//   - Optional `onSuccess` callback gọi sau khi login pass.

import { useState } from 'react';
import { useAuth } from './useAuth.js';

export default function LoginPage({ onSuccess }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { signIn, loading, error } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        const ok = await signIn(email, password);
        if (ok && typeof onSuccess === 'function') onSuccess();
    };

    return (
        <div className="flex items-center justify-center min-h-[400px] p-4">
            <form
                onSubmit={handleSubmit}
                className="bg-gray-800 p-8 rounded-lg shadow-lg border border-gray-700 w-full max-w-md"
            >
                <h2 className="text-2xl font-bold text-white mb-6 text-center">Đăng nhập Admin</h2>

                <div className="mb-4">
                    <label className="block text-gray-400 text-sm mb-1">Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    />
                </div>

                <div className="mb-4 relative">
                    <label className="block text-gray-400 text-sm mb-1">Mật khẩu</label>
                    <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 pr-12 text-white focus:outline-none focus:border-blue-500"
                    />
                    <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-[34px] text-gray-400 hover:text-white text-sm"
                        tabIndex={-1}
                    >
                        {showPassword ? 'Ẩn' : 'Hiện'}
                    </button>
                </div>

                {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 px-4 rounded transition"
                >
                    {loading ? 'Đang xử lý...' : 'Đăng nhập'}
                </button>
            </form>
        </div>
    );
}
