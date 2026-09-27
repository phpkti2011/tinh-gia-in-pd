import { useState, useEffect, useMemo, useRef } from 'react';
import AdminGate from '../../../auth/AdminGate';
import { useAuth } from '../../../auth/useAuth';
import { useUserRole } from '../../../auth/useUserRole';
import { DEFAULT_CONFIG } from '../../small-print/config';
import { useCalendarSync } from './useCalendarSync';
import { CALENDAR_DEFAULT_INPUT } from '../config/defaultConfig';
import { loadCalendarConfig, saveCalendarConfig, loadCalendarDraft } from '../config/storage';
import { calculateCalendar } from '../engine/pricing';
import CalendarInput from './CalendarInput';
import CalendarResult from './CalendarResult';
import CalendarSettings from './CalendarSettings';

export default function CalendarModule({ onBack, heading = 'Tính Giá Lịch Bàn' }) {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: roleLoading, error: roleError } = useUserRole(user);
    const canViewCost = Boolean(user && isAdmin && !authLoading && !roleLoading && !roleError);
    const ownerId = canViewCost ? user.id : null;
    const { snapshot, refresh, invalidate } = useCalendarSync(ownerId);
    const config = snapshot.config || loadCalendarConfig();
    const printConfig = snapshot.printConfig || DEFAULT_CONFIG;
    const [input, setInput] = useState(() => structuredClone(CALENDAR_DEFAULT_INPUT));
    const [tab, setTab] = useState('main');
    const [editor, setEditor] = useState(null);
    const [notice, setNotice] = useState('');
    const inputRef = useRef(input);
    inputRef.current = input;
    const previous = useRef(null);
    const [selectionReview, setSelectionReview] = useState(false);
    useEffect(() => {
        if (!snapshot.config || !snapshot.printConfig) return;
        const old = previous.current;
        previous.current = snapshot;
        if (!old) return;
        const lists = (s) => [
            ...Object.values(s.config.materials).map((items) => items.map((x) => x.name)),
            s.config.artPapers.map((x) => x.name),
            s.printConfig.PAPER_STOCK_DATA.map((x) => x.name),
            s.printConfig.STANDARD_LARGE_SHEET_SIZES.map((x) => [x.name, x.w, x.h]),
            s.printConfig.ART_PAPER_LARGE_SHEET_SIZES.map((x) => [x.name, x.w, x.h]),
        ];
        if (JSON.stringify(lists(old)) !== JSON.stringify(lists(snapshot))) {
            setInput((prev) => ({
                ...prev,
                paper: 0,
                wrapPaper: 0,
                linerPaper: 0,
                wrapStock: 0,
                linerStock: 0,
                selected: { carton: 0, coil: 0, labor: 0, lam: 0 },
                wrapArt: 0,
                linerArt: 0,
                wrapArtInput: null,
                linerArtInput: null,
            }));
            setSelectionReview(true);
        }
    }, [snapshot]);
    const calculation = useMemo(() => {
        if (!snapshot.ready || selectionReview) return { result: null, error: null };
        try {
            const currentInput = structuredClone(input);
            if (!canViewCost)
                for (const role of ['wrap', 'liner']) {
                    if (currentInput[role + 'ArtInput'])
                        currentInput[role + 'ArtInput'].cost =
                            config.artPapers[currentInput[role + 'Art']]?.cost;
                }
            return { result: calculateCalendar(currentInput, config, printConfig), error: null };
        } catch (error) {
            return { result: null, error: error.message };
        }
    }, [input, config, printConfig, snapshot.ready, canViewCost, selectionReview]);
    const openSettings = () => {
        const pending = loadCalendarDraft();
        setEditor({
            config: pending?.data || config,
            version: pending ? (pending.baseVersion ?? 0) : snapshot.version,
            key: Date.now(),
        });
        setTab('settings');
    };
    const reloadEditor = async () => {
        const next = await refresh();
        if (next.config) setEditor({ config: next.config, version: next.version, key: Date.now() });
    };
    const save = async (next) => {
        invalidate('Đang đồng bộ bảng giá admin. Tạm dừng báo giá…');
        const result = await saveCalendarConfig(next, { ownerId, baseVersion: editor?.version });
        if (result.cloud) {
            setEditor((prev) => ({ ...prev, version: result.version }));
            await refresh();
        } else invalidate(result.error);
        return result;
    };
    const beforeCopy = async () => {
        const currentInput = inputRef.current;
        const fresh = await refresh();
        if (!fresh.ready) return false;
        if (fresh.version !== snapshot.version || fresh.printVersion !== snapshot.printVersion) {
            setNotice(
                'Bảng giá vừa được admin cập nhật. Kết quả đã tính lại; hãy kiểm tra rồi sao chép báo giá.'
            );
            return false;
        }
        return currentInput === inputRef.current;
    };
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl text-white">
            <header className="text-center mb-8 relative">
                <button
                    className="mb-4 md:mb-0 md:absolute md:left-0 md:top-1/2 md:-translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                    onClick={onBack}
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white md:px-36">{heading}</h1>
                <p className="text-gray-400 mt-2 md:px-36">
                    Tờ lịch · đế carton · áo và lót riêng · lò xo · ép kim
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8" aria-label="Chức năng lịch bàn">
                    <button
                        aria-label="Tính giá"
                        aria-current={tab === 'main' ? 'page' : undefined}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${tab === 'main' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setTab('main')}
                    >
                        Tính Giá
                    </button>
                    <button
                        aria-label="Cài đặt giá lịch"
                        aria-current={tab === 'settings' ? 'page' : undefined}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${tab === 'settings' ? 'border-cyan-500 text-cyan-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        onClick={openSettings}
                    >
                        Cài Đặt
                    </button>
                </nav>
            </div>
            {snapshot.loading && (
                <p role="status" className="text-sm text-gray-400">
                    Đang tải bảng giá mới nhất…
                </p>
            )}
            {!snapshot.loading && !snapshot.ready && (
                <p
                    role="alert"
                    className="bg-red-900/20 border border-red-600/40 text-red-200 rounded-lg p-4 mb-4"
                >
                    {snapshot.error} Không sử dụng bảng giá trên máy để báo khách.
                </p>
            )}
            {snapshot.ready && (
                <p className="text-sm text-emerald-300 mb-4">
                    Đã đồng bộ bảng giá admin · Lịch v{snapshot.version} · KTS v
                    {snapshot.printVersion}
                </p>
            )}
            {notice && (
                <p role="status" className="text-sm text-amber-300 mb-4">
                    {notice}
                </p>
            )}
            {tab === 'settings' ? (
                <AdminGate>
                    {editor && (
                        <CalendarSettings
                            key={editor.key}
                            config={editor.config}
                            syncReady={snapshot.ready}
                            onReload={reloadEditor}
                            onSave={save}
                            onCancel={() => {
                                setTab('main');
                                refresh();
                            }}
                        />
                    )}
                </AdminGate>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1 min-w-0">
                        <CalendarInput
                            canViewCost={canViewCost}
                            input={input}
                            config={config}
                            printConfig={printConfig}
                            onChange={setInput}
                        />
                    </div>
                    <div className="lg:col-span-2 min-w-0">
                        {!snapshot.ready || selectionReview ? (
                            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-300">
                                <p>Tạm dừng báo giá cho đến khi bảng giá được xác nhận.</p>
                                {selectionReview && (
                                    <>
                                        <p className="my-3">
                                            Danh mục giấy/vật tư đã thay đổi. Vui lòng chọn lại giấy
                                            và vật tư trước khi tiếp tục.
                                        </p>
                                        <button
                                            className="bg-blue-600 px-4 py-2 rounded"
                                            onClick={() => setSelectionReview(false)}
                                        >
                                            Đã kiểm tra giấy và vật tư
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : calculation.error ? (
                            <div
                                role="alert"
                                className="min-h-[400px] flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-red-600/50 shadow-inner text-red-400 text-center p-8"
                            >
                                {calculation.error}
                            </div>
                        ) : (
                            <CalendarResult
                                canViewCost={canViewCost}
                                onBeforeCopy={beforeCopy}
                                result={calculation.result}
                                input={input}
                                config={config}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
