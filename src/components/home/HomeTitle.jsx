import { useState } from 'react';

export default function HomeTitle({ title, isAdmin, onSave }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(title);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const save = async (event) => {
        event.preventDefault();
        if (!draft.trim() || saving) return;
        setSaving(true);
        setError('');
        try {
            if (await onSave(draft.trim())) setEditing(false);
        } catch {
            setError('Không lưu được tên. Vui lòng thử lại.');
        } finally {
            setSaving(false);
        }
    };

    if (isAdmin && editing)
        return (
            <form onSubmit={save} className="max-w-xl mx-auto space-y-3">
                <label htmlFor="home-title" className="block text-gray-300">
                    Tên công cụ tính giá
                </label>
                <input
                    id="home-title"
                    autoFocus
                    value={draft}
                    maxLength={120}
                    disabled={saving}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.nativeEvent.isComposing || e.keyCode === 229) {
                            if (e.key === 'Enter') e.preventDefault();
                            return;
                        }
                        if (e.key === 'Escape' && !saving) setEditing(false);
                    }}
                    className="w-full bg-gray-900 border border-gray-600 rounded px-3 py-2 text-white"
                />
                <div className="flex justify-center gap-3">
                    <button
                        type="submit"
                        disabled={saving || !draft.trim()}
                        className="bg-emerald-600 text-white rounded px-4 py-2 disabled:opacity-50"
                    >
                        {saving ? 'Đang lưu…' : 'Lưu tên'}
                    </button>
                    <button
                        type="button"
                        disabled={saving}
                        onClick={() => setEditing(false)}
                        className="bg-gray-600 text-white rounded px-4 py-2"
                    >
                        Hủy
                    </button>
                </div>
                {error && (
                    <p role="alert" className="text-red-400">
                        {error}
                    </p>
                )}
            </form>
        );

    return (
        <div className="flex items-center justify-center gap-3">
            <h1 className="text-4xl font-bold text-white break-words min-w-0">{title}</h1>
            {isAdmin && (
                <button
                    type="button"
                    aria-label="Đổi tên công cụ tính giá"
                    title="Đổi tên công cụ tính giá"
                    onClick={() => {
                        setDraft(title);
                        setError('');
                        setEditing(true);
                    }}
                    className="shrink-0 px-2.5 py-1 rounded bg-gray-600 hover:bg-gray-500 text-gray-100"
                >
                    ✎
                </button>
            )}
        </div>
    );
}
