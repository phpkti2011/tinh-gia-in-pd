import { useState, useEffect, useMemo, useRef } from 'react';
import AdminGate from '../../../auth/AdminGate';
import { useAuth } from '../../../auth/useAuth';
import { useUserRole } from '../../../auth/useUserRole';
import { loadConfig, loadConfigFromCloud } from '../../../utils/configStorage';
import { CALENDAR_DEFAULT_INPUT } from '../config/defaultConfig';
import {
    loadCalendarConfig,
    loadCalendarFromCloud,
    saveCalendarConfig,
    hasPendingCalendarConfig,
} from '../config/storage';
import { calculateCalendar } from '../engine/pricing';
import CalendarInput from './CalendarInput';
import CalendarResult from './CalendarResult';
import CalendarSettings from './CalendarSettings';

export default function CalendarModule({ onBack, heading = 'Tính Giá Lịch Bàn' }) {
    const { user, loading: authLoading } = useAuth();
    const { isAdmin, loading: roleLoading, error: roleError } = useUserRole(user);
    const canViewCost = Boolean(user && isAdmin && !authLoading && !roleLoading && !roleError);
    const [config, setConfig] = useState(loadCalendarConfig),
        [printConfig, setPrintConfig] = useState(loadConfig);
    const [input, setInput] = useState(() => structuredClone(CALENDAR_DEFAULT_INPUT)),
        [tab, setTab] = useState('main');
    const [loading, setLoading] = useState(true);
    const revision = useRef(0);
    const tabRef = useRef(tab);
    const localPending = useRef(false);
    tabRef.current = tab;
    useEffect(() => {
        let alive = true;
        const refresh = async () => {
            const request = ++revision.current;
            const [calendar, print] = await Promise.all([
                localPending.current
                    ? Promise.resolve(loadCalendarConfig())
                    : loadCalendarFromCloud(),
                loadConfigFromCloud('printConfig'),
            ]);
            if (!alive || request !== revision.current) return;
            setConfig(calendar);
            if (print) setPrintConfig(print);
            setLoading(false);
        };
        refresh();
        const focus = () => {
            if (tabRef.current !== 'settings') refresh();
        };
        window.addEventListener('focus', focus);
        return () => {
            alive = false;
            window.removeEventListener('focus', focus);
        };
    }, []);
    const calculation = useMemo(() => {
        try {
            return { result: calculateCalendar(input, config, printConfig), error: null };
        } catch (error) {
            return { result: null, error: error.message };
        }
    }, [input, config, printConfig]);
    const save = async (next) => {
        revision.current++;
        const result = await saveCalendarConfig(next);
        localPending.current = result.local && !result.cloud;
        if (result.local || result.cloud) {
            setConfig(structuredClone(next));
            setInput((prev) => ({
                ...prev,
                selected: { carton: 0, coil: 0, labor: 0, lam: 0 },
                wrapArt: 0,
                linerArt: 0,
            }));
        }
        return result;
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
                        onClick={() => setTab('settings')}
                    >
                        Cài Đặt
                    </button>
                </nav>
            </div>
            {loading && (
                <p role="status" className="text-sm text-gray-400">
                    Đang tải bảng giá mới nhất…
                </p>
            )}
            {hasPendingCalendarConfig() && (
                <p role="status" className="text-sm text-amber-300">
                    Bảng giá lịch trên máy này chưa đồng bộ. Vào cài đặt và lưu lại để các máy khác
                    nhận được giá mới.
                </p>
            )}
            {tab === 'settings' ? (
                <AdminGate>
                    {!loading && (
                        <CalendarSettings
                            config={config}
                            onSave={save}
                            onCancel={() => setTab('main')}
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
                        {calculation.error ? (
                            <div
                                role="alert"
                                className="min-h-[400px] flex items-center justify-center bg-gray-800 rounded-lg border-2 border-dashed border-red-600/50 shadow-inner text-red-400 text-center p-8"
                            >
                                {calculation.error}
                            </div>
                        ) : (
                            <CalendarResult
                                canViewCost={canViewCost}
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
