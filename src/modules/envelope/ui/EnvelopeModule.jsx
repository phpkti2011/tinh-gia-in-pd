import { useState, useEffect, useMemo, useRef } from 'react';
import AdminGate from '../../../auth/AdminGate';
import { useAuth } from '../../../auth/useAuth';
import { useUserRole } from '../../../auth/useUserRole';
import { DEFAULT_CONFIG } from '../../small-print/config';
import { useEnvelopeSync } from './useEnvelopeSync';
import { ENVELOPE_DEFAULT_INPUT, inputFromConfig } from '../config/defaultConfig';
import { loadEnvelopeConfig, saveEnvelopeConfig, loadEnvelopeDraft } from '../config/storage';
import { allowedPapers } from '../config/schema';
import { calculateEnvelopeQuote, envelopeInputKey } from '../engine/pricing';
import {
    validateEnvelopeInput,
    computeEnvelopeLayout,
    describeEnvelopePanels,
} from '../engine/layout';
import EnvelopeInput from './EnvelopeInput';
import EnvelopeDiagram from './EnvelopeDiagram';
import EnvelopeResult from './EnvelopeResult';
import EnvelopeSettings from './EnvelopeSettings';

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

export default function EnvelopeModule({ onBack, heading = 'Tính Giá Bao Thư' }) {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: roleLoading, error: roleError } = useUserRole(user);
    const canViewCost = Boolean(user && isAdmin && !authLoading && !roleLoading && !roleError);
    const ownerId = canViewCost ? user.id : null;
    const { snapshot, refresh, invalidate } = useEnvelopeSync(ownerId);
    const config = snapshot.config || loadEnvelopeConfig();
    const printConfig = snapshot.printConfig || DEFAULT_CONFIG;
    const [input, setInput] = useState(() => structuredClone(ENVELOPE_DEFAULT_INPUT));
    const [tab, setTab] = useState('main');
    const [editor, setEditor] = useState(null);
    const [notice, setNotice] = useState('');
    const inputRef = useRef(input);
    inputRef.current = input;
    const previous = useRef(null);
    const seeded = useRef(false);
    const [selectionReview, setSelectionReview] = useState(false);
    // Điền sẵn từ cài đặt admin đúng một lần, chỉ khi người dùng chưa gõ gì.
    useEffect(() => {
        if (seeded.current || !snapshot.config) return;
        seeded.current = true;
        setInput((current) =>
            same(current, ENVELOPE_DEFAULT_INPUT) ? inputFromConfig(snapshot.config) : current
        );
    }, [snapshot.config]);
    // Danh mục giấy/khổ đổi thứ tự → chỉ số cũ có thể trỏ giấy khác: bắt chọn lại.
    useEffect(() => {
        if (!snapshot.config || !snapshot.printConfig) return;
        const old = previous.current;
        previous.current = snapshot;
        if (!old) return;
        const lists = (s) => [
            s.printConfig.PAPER_STOCK_DATA.map((x) => [x.name, x.pricingModel, x.hidden]),
            s.printConfig.STANDARD_LARGE_SHEET_SIZES.map((x) => [x.name, x.w, x.h]),
            s.config.papers.allowed,
        ];
        if (!same(lists(old), lists(snapshot))) {
            setInput((prev) => ({
                ...prev,
                paper: snapshot.config.papers.defaultPaper,
                stock: snapshot.config.papers.defaultStock,
            }));
            setSelectionReview(true);
        }
    }, [snapshot]);
    const errors = useMemo(() => {
        const e = { ...validateEnvelopeInput(input).errors };
        if (!allowedPapers(config, printConfig).some((p) => p.index === input.paper))
            e.paper = 'Chọn loại giấy trong danh sách cho phép.';
        return e;
    }, [input, config, printConfig]);
    const inputValid = Object.keys(errors).length === 0;
    // Khổ trải + hình mô tả hiện ngay khi thông số hợp lệ, không chờ bảng giá.
    const geometry = useMemo(() => {
        if (validateEnvelopeInput(input).ok) {
            const layout = computeEnvelopeLayout(input);
            return { layout, panels: describeEnvelopePanels(layout) };
        }
        return null;
    }, [input]);
    const calculation = useMemo(() => {
        if (!snapshot.ready || selectionReview || !inputValid) return { result: null, error: null };
        try {
            return { result: calculateEnvelopeQuote(input, config, printConfig), error: null };
        } catch (error) {
            return { result: null, error: error.message };
        }
    }, [input, config, printConfig, snapshot.ready, selectionReview, inputValid]);
    // Không bao giờ hiện kết quả của đầu vào cũ (I10).
    const result =
        calculation.result && calculation.result.inputKey === envelopeInputKey(input)
            ? calculation.result
            : null;
    const openSettings = () => {
        const pending = loadEnvelopeDraft();
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
        const r = await saveEnvelopeConfig(next, { ownerId, baseVersion: editor?.version });
        if (r.cloud) {
            setEditor((prev) => ({ ...prev, version: r.version }));
            await refresh();
        } else invalidate(r.error);
        return r;
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
    const tabClass = (id) =>
        `py-4 px-1 border-b-2 font-medium text-lg ${tab === id ? 'border-lime-500 text-lime-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`;
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
                    Khổ trải khuôn · giấy + in KTS · bế · dán · ép nhũ
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8" aria-label="Chức năng bao thư">
                    <button
                        aria-label="Tính giá"
                        aria-current={tab === 'main' ? 'page' : undefined}
                        className={tabClass('main')}
                        onClick={() => setTab('main')}
                    >
                        Tính Giá
                    </button>
                    <button
                        aria-label="Cài đặt giá bao thư"
                        aria-current={tab === 'settings' ? 'page' : undefined}
                        className={tabClass('settings')}
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
                    Đã đồng bộ bảng giá admin · Bao thư v{snapshot.version} · KTS v
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
                        <EnvelopeSettings
                            key={editor.key}
                            config={editor.config}
                            printConfig={printConfig}
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
                        <EnvelopeInput
                            input={input}
                            config={config}
                            printConfig={printConfig}
                            errors={errors}
                            onChange={setInput}
                        />
                    </div>
                    <div className="lg:col-span-2 min-w-0 space-y-6">
                        {geometry ? (
                            <EnvelopeDiagram
                                layout={geometry.layout}
                                panels={geometry.panels}
                                unit={input.unit}
                            />
                        ) : (
                            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-300">
                                Nhập đủ kích thước, số lượng và kiểu khuôn để xem khổ trải.
                            </div>
                        )}
                        {!inputValid ? (
                            geometry && (
                                <div
                                    role="alert"
                                    className="bg-gray-800 rounded-lg border-2 border-dashed border-red-600/50 text-red-400 text-center p-6"
                                >
                                    {Object.values(errors).join(' ')}
                                </div>
                            )
                        ) : !snapshot.ready || selectionReview ? (
                            <div className="bg-gray-800 rounded-lg p-8 text-center text-gray-300">
                                <p>Tạm dừng báo giá cho đến khi bảng giá được xác nhận.</p>
                                {selectionReview && (
                                    <>
                                        <p className="my-3">
                                            Danh mục giấy đã thay đổi. Vui lòng chọn lại giấy trước
                                            khi tiếp tục.
                                        </p>
                                        <button
                                            className="bg-blue-600 px-4 py-2 rounded"
                                            onClick={() => setSelectionReview(false)}
                                        >
                                            Đã kiểm tra giấy
                                        </button>
                                    </>
                                )}
                            </div>
                        ) : calculation.error ? (
                            <div
                                role="alert"
                                className="min-h-[200px] flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-red-600/50 shadow-inner text-red-400 text-center p-8"
                            >
                                {calculation.error}
                            </div>
                        ) : (
                            result && (
                                <EnvelopeResult
                                    canViewCost={canViewCost}
                                    onBeforeCopy={beforeCopy}
                                    result={result}
                                    input={input}
                                />
                            )
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
