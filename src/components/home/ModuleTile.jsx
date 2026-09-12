import { useState } from 'react';
import { LABEL_MAX_LEN } from '../../config/moduleVisibilityConfig';

// Tile module ở trang chủ. Admin có 2 nút góc phải: ✎ đổi tên, Hiện/Ẩn bật tắt hiển thị.
//
// LƯU Ý CẤU TRÚC: chế độ xem render thẻ <button> bọc cả tile, nên KHÔNG được nhét <input> vào
// trong đó (HTML không hợp lệ — <input> là interactive content; click/focus sẽ chui lên button
// và mở module giữa lúc đang gõ). Vì vậy chế độ sửa render một nhánh <div> riêng, không có
// <button> tile nào cả, và dùng lại đúng bộ class nền/viền/padding để ô lưới không nhảy chiều cao.

const TILE_BASE = 'bg-gray-800 border-2 border-gray-600 rounded-xl p-8 h-full';

function LabelField({ id, field, label, value, onChange, onKeyDown, multiline }) {
    const common = {
        id: `label-${id}-${field}`,
        value,
        maxLength: LABEL_MAX_LEN[field],
        onChange: (e) => onChange(field, e.target.value),
        className:
            'w-full bg-gray-900 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500',
    };
    return (
        <div className="mb-2">
            <label htmlFor={common.id} className="block text-[11px] text-gray-400 mb-1">
                {label}
            </label>
            {multiline ? (
                <textarea {...common} rows={3} />
            ) : (
                <input {...common} type="text" onKeyDown={onKeyDown} />
            )}
        </div>
    );
}

export default function ModuleTile({
    mod,
    label,
    onSelect,
    isAdmin,
    visible,
    onToggle,
    onSaveLabel,
}) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(null);

    const startEdit = () => {
        setDraft({ title: label.title, desc: label.desc, heading: label.heading });
        setEditing(true);
    };

    const cancelEdit = () => {
        setEditing(false);
        setDraft(null);
    };

    const updateDraft = (field, value) => setDraft((prev) => ({ ...prev, [field]: value }));

    // Chỉ gửi field có nội dung. Field để trống → parent lấy lại giá trị mặc định của field đó.
    const commitEdit = () => {
        const patch = {};
        for (const field of ['title', 'desc', 'heading']) {
            const trimmed = (draft[field] || '').trim();
            if (trimmed) patch[field] = trimmed;
        }
        onSaveLabel(mod.id, patch);
        cancelEdit();
    };

    // patch rỗng → parent merge trên default → về nguyên bản.
    const resetToDefault = () => {
        onSaveLabel(mod.id, {});
        cancelEdit();
    };

    const handleKeyDown = (e) => {
        // Bỏ qua Enter khi bộ gõ tiếng Việt (Telex/VNI) đang ghép ký tự, nếu không sẽ lưu giữa chừng.
        if (e.nativeEvent?.isComposing || e.keyCode === 229) return;
        if (e.key === 'Enter') {
            e.preventDefault();
            commitEdit();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            cancelEdit();
        }
    };

    if (editing) {
        return (
            <div className="relative h-full">
                <div className={TILE_BASE}>
                    <div className="text-2xl mb-3">{mod.icon}</div>
                    <LabelField
                        id={mod.id}
                        field="title"
                        label="Tên module"
                        value={draft.title}
                        onChange={updateDraft}
                        onKeyDown={handleKeyDown}
                    />
                    <LabelField
                        id={mod.id}
                        field="desc"
                        label="Mô tả ngắn"
                        value={draft.desc}
                        onChange={updateDraft}
                        multiline
                    />
                    <LabelField
                        id={mod.id}
                        field="heading"
                        label="Tiêu đề trong trang"
                        value={draft.heading}
                        onChange={updateDraft}
                        onKeyDown={handleKeyDown}
                    />
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            type="button"
                            onClick={commitEdit}
                            className="px-3 py-1 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            ✓ Lưu
                        </button>
                        <button
                            type="button"
                            onClick={cancelEdit}
                            className="px-3 py-1 rounded text-xs font-semibold bg-gray-600 hover:bg-gray-500 text-gray-100"
                        >
                            ✗ Huỷ
                        </button>
                        <button
                            type="button"
                            onClick={resetToDefault}
                            className="ml-auto text-xs text-gray-400 hover:text-gray-200 underline"
                        >
                            Khôi phục mặc định
                        </button>
                    </div>
                    <p className="mt-2 text-[11px] text-gray-500">
                        Để trống một ô = dùng lại tên mặc định. Enter để lưu, Esc để huỷ.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="relative h-full">
            <button
                onClick={() => onSelect(mod.id)}
                className={`w-full h-full bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 ${mod.border} rounded-xl p-8 text-left transition-all duration-200 group ${isAdmin && !visible ? 'opacity-60' : ''}`}
            >
                <div className="text-4xl mb-4">{mod.icon}</div>
                <h2 className={`text-2xl font-bold text-white ${mod.titleHover} mb-2`}>
                    {label.title}
                </h2>
                <p className="text-gray-400 text-sm">{label.desc}</p>
                <div
                    className={`mt-4 ${mod.link} text-sm font-medium group-hover:translate-x-2 transition-transform`}
                >
                    Mở công cụ →
                </div>
            </button>
            {isAdmin && (
                <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={startEdit}
                        title="Đổi tên / mô tả / tiêu đề module"
                        aria-label={`Đổi tên ${label.title}`}
                        className="px-2.5 py-1 rounded text-xs font-semibold bg-gray-600 hover:bg-gray-500 text-gray-100"
                    >
                        ✎
                    </button>
                    <button
                        type="button"
                        onClick={() => onToggle(mod.id)}
                        title={visible ? 'Đang hiện — bấm để ẩn' : 'Đang ẩn — bấm để hiện'}
                        className={`px-2.5 py-1 rounded text-xs font-semibold ${
                            visible
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-500 text-gray-200'
                        }`}
                    >
                        {visible ? 'Hiện' : 'Ẩn'}
                    </button>
                </div>
            )}
        </div>
    );
}
