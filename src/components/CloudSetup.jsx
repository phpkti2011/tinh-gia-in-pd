import React, { useState } from 'react';
import { getAppsScriptUrl, setAppsScriptUrl, isCloudEnabled } from '../utils/cloudSync';

export default function CloudSetup() {
    const [url, setUrl] = useState(getAppsScriptUrl());
    const [status, setStatus] = useState('');

    const handleSave = async () => {
        if (!url.startsWith('https://script.google.com/')) {
            setStatus('URL không hợp lệ. Phải bắt đầu bằng https://script.google.com/');
            return;
        }
        setAppsScriptUrl(url);
        setStatus('Đang kiểm tra kết nối...');
        try {
            const res = await fetch(url);
            if (res.ok) {
                setStatus('Kết nối thành công! Config sẽ đồng bộ qua cloud.');
            } else {
                setStatus(`Lỗi kết nối: HTTP ${res.status}`);
            }
        } catch (e) {
            setStatus(`Lỗi: ${e.message}. Kiểm tra lại URL và quyền truy cập.`);
        }
    };

    const handleDisable = () => {
        setAppsScriptUrl('');
        setUrl('');
        setStatus('Đã tắt đồng bộ cloud. App sẽ dùng localStorage.');
    };

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-cyan-400 mb-4 pb-2 border-b border-gray-600">
                Đồng Bộ Cloud (Google Sheets)
            </h3>
            <p className="text-sm text-gray-400 mb-4">
                Kết nối Google Sheets để đồng bộ bảng giá cho tất cả nhân viên.
                {isCloudEnabled() && <span className="text-green-400 ml-2">● Đang kết nối</span>}
                {!isCloudEnabled() && <span className="text-gray-500 ml-2">○ Chưa kết nối</span>}
            </p>
            <div className="mb-4">
                <label className="text-gray-400 text-sm block mb-1">URL Google Apps Script</label>
                <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
            </div>
            <div className="flex gap-3">
                <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-semibold transition"
                >
                    Lưu & Kiểm Tra
                </button>
                {isCloudEnabled() && (
                    <button
                        onClick={handleDisable}
                        className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded transition"
                    >
                        Tắt Cloud
                    </button>
                )}
            </div>
            {status && (
                <p className={`text-sm mt-3 ${status.includes('thành công') ? 'text-green-400' : status.includes('Lỗi') ? 'text-red-400' : 'text-yellow-400'}`}>
                    {status}
                </p>
            )}
        </div>
    );
}
