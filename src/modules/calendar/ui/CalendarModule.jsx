import { useState, useEffect, useMemo, useRef } from 'react';
import AdminGate from '../../../auth/AdminGate';
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
import { buttonClass } from './Fields';

export default function CalendarModule({ onBack, heading = 'Tính Giá Lịch Bàn' }) {
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
        <div className="container mx-auto max-w-screen-2xl p-4 md:p-6 text-white space-y-5">
            <header className="flex flex-wrap justify-between items-center gap-3">
                <div>
                    <button className="text-gray-400 hover:text-white text-sm" onClick={onBack}>
                        ← Trang chủ
                    </button>
                    <h1 className="text-2xl font-bold mt-2">{heading}</h1>
                    <p className="text-sm text-gray-400">
                        Tờ lịch · đế carton · áo và lót riêng · lò xo · ép kim
                    </p>
                </div>
                <div className="flex gap-2">
                    <button className={buttonClass} onClick={() => setTab('main')}>
                        Tính giá
                    </button>
                    <button className={buttonClass} onClick={() => setTab('settings')}>
                        Cài đặt giá lịch
                    </button>
                </div>
            </header>
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
                <div className="grid lg:grid-cols-[minmax(300px,400px)_minmax(0,1fr)] gap-5 items-start">
                    <CalendarInput
                        input={input}
                        config={config}
                        printConfig={printConfig}
                        onChange={setInput}
                    />
                    {calculation.error ? (
                        <div
                            role="alert"
                            className="border border-amber-700 bg-amber-950 text-amber-200 p-5 rounded-xl"
                        >
                            {calculation.error}
                        </div>
                    ) : (
                        <CalendarResult result={calculation.result} input={input} config={config} />
                    )}
                </div>
            )}
        </div>
    );
}
