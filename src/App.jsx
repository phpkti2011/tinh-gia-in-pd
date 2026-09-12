import React, { useState, useEffect, useCallback, useRef } from 'react';
import InputPanel from './components/smallprint/InputPanel';
import ResultPanel from './components/smallprint/ResultPanel';
import SettingsPanel from './components/smallprint/SettingsPanel';
import LPInputPanel from './components/largeprint/LPInputPanel';
import LPResultPanel from './components/largeprint/LPResultPanel';
import LPSettingsPanel from './components/largeprint/LPSettingsPanel';
import DecalInputPanel from './components/decal/DecalInputPanel';
import DecalResultPanel from './components/decal/DecalResultPanel';
import DecalSettingsPanel from './components/decal/DecalSettingsPanel';
import UvdtfInputPanel from './components/uvdtf/UvdtfInputPanel';
import UvdtfResultPanel from './components/uvdtf/UvdtfResultPanel';
import UvdtfSettingsPanel from './components/uvdtf/UvdtfSettingsPanel';
import CatalogueInputPanel from './components/catalogue/CatalogueInputPanel';
import CatalogueResultPanel from './components/catalogue/CatalogueResultPanel';
import CatalogueSettingsPanel from './components/catalogue/CatalogueSettingsPanel';
import SpiralInputPanel from './components/spiral/SpiralInputPanel';
import SpiralResultPanel from './components/spiral/SpiralResultPanel';
import SpiralSettingsPanel from './components/spiral/SpiralSettingsPanel';
import StickerInputPanel from './components/sticker/StickerInputPanel';
import StickerResultPanel from './components/sticker/StickerResultPanel';
import StickerSettingsPanel from './components/sticker/StickerSettingsPanel';
import CardInputPanel from './components/card/CardInputPanel';
import CardResultPanel from './components/card/CardResultPanel';
import CardSettingsPanel from './components/card/CardSettingsPanel';
import FlyerInputPanel from './components/flyer/FlyerInputPanel';
import FlyerResultPanel from './components/flyer/FlyerResultPanel';
import FlyerSettingsPanel from './components/flyer/FlyerSettingsPanel';
import CheapDecalInputPanel from './components/cheapdecal/CheapDecalInputPanel';
import CheapDecalResultPanel from './components/cheapdecal/CheapDecalResultPanel';
import CheapDecalSettingsPanel from './components/cheapdecal/CheapDecalSettingsPanel';
import {
    loadConfig,
    loadLargePrintConfig,
    loadDecalConfig,
    loadUvdtfConfig,
    loadCatalogueConfig,
    loadSpiralConfig,
    loadStickerConfig,
    loadCardConfig,
    loadFlyerConfig,
    loadCheapDecalConfig,
    loadModuleVisibilityConfig,
    loadConfigFromCloud,
    saveConfigToCloud,
} from './utils/configStorage';
import {
    calculatePaperOptions,
    calculatePerSheetOptions,
    calculateDecalOptions,
    calculateFinishingCost,
    calculateCustomFinishingCost,
    calculateDieCuttingCosts,
    calculateFoilStamping,
} from './utils/calculator';
import { calculateCustomerQuote } from './utils/customerQuote';
import { calculateLargePrint } from './utils/largePrintCalculator';
import {
    calculateStickersPerSheet,
    calculateSheetsPerPrintSheet,
    generateSinglePriceTable,
    generateSheetPriceTable,
    applyDiscount,
} from './utils/decalCalculator';
import { calculateUvDtf } from './utils/uvdtfCalculator';
import { calculateCatalogue } from './utils/catalogueCalculator';
import { calculateSpiral } from './utils/spiralCalculator';
import { calculateSticker } from './utils/stickerCalculator';
import { calculateCard } from './utils/cardCalculator';
import { calculateFlyer } from './utils/flyerCalculator';
import { calculateCheapDecal } from './utils/cheapDecalCalculator';
import AdminGate from './auth/AdminGate';
import { useAuth } from './auth/useAuth';
import { useUserRole } from './auth/useUserRole';
import ModuleTile from './components/home/ModuleTile';
import {
    MODULE_VISIBILITY_DEFAULT_CONFIG,
    MODULE_VISIBILITY_DEFAULT_LABELS,
    mergeModuleLabels,
} from './config/moduleVisibilityConfig';

// P2-05.6: Apps Script cloud sync ĐÃ ĐƯỢC REMOVE hoàn toàn:
//   - src/utils/cloudSync.js: deleted.
//   - VITE_ADMIN_PASSWORD env var: removed khỏi .env.example.
//   - APPS_SCRIPT_PASSWORD const + 4 args: gone từ App.jsx (P2-05.4).
// Cloud source duy nhất: Supabase (qua configStorage → priceConfigStore →
// Supabase RPC + Auth JWT + RLS admin check).

// Danh sách tile module (data-driven) — CHỈ phần trình bày + thứ tự hiển thị.
// Tên/mô tả/tiêu đề nằm ở MODULE_LABELS (src/config/moduleVisibilityConfig.js) vì admin sửa được.
// Vẫn lấy thứ tự lưới từ mảng này, KHÔNG suy từ Object.keys(MODULE_LABELS) — payload cũ trên cloud
// có thể thiếu id hoặc sai thứ tự. Class Tailwind giữ literal để JIT không purge.
const MODULES = [
    {
        id: 'small',
        icon: '🖨',
        border: 'hover:border-blue-500',
        titleHover: 'group-hover:text-blue-400',
        link: 'text-blue-400',
    },
    {
        id: 'large',
        icon: '🖼',
        border: 'hover:border-green-500',
        titleHover: 'group-hover:text-green-400',
        link: 'text-green-400',
    },
    {
        id: 'decal',
        icon: '🏷',
        border: 'hover:border-purple-500',
        titleHover: 'group-hover:text-purple-400',
        link: 'text-purple-400',
    },
    {
        id: 'uvdtf',
        icon: '✨',
        border: 'hover:border-orange-500',
        titleHover: 'group-hover:text-orange-400',
        link: 'text-orange-400',
    },
    {
        id: 'catalogue',
        icon: '📚',
        border: 'hover:border-red-500',
        titleHover: 'group-hover:text-red-400',
        link: 'text-red-400',
    },
    {
        id: 'spiral',
        icon: '📒',
        border: 'hover:border-teal-500',
        titleHover: 'group-hover:text-teal-400',
        link: 'text-teal-400',
    },
    {
        id: 'sticker',
        icon: '🏷️',
        border: 'hover:border-pink-500',
        titleHover: 'group-hover:text-pink-400',
        link: 'text-pink-400',
    },
    {
        id: 'card',
        icon: '💳',
        border: 'hover:border-indigo-500',
        titleHover: 'group-hover:text-indigo-400',
        link: 'text-indigo-400',
    },
    {
        id: 'flyer',
        icon: '📄',
        border: 'hover:border-amber-500',
        titleHover: 'group-hover:text-amber-400',
        link: 'text-amber-400',
    },
    {
        id: 'cheapdecal',
        icon: '🔖',
        border: 'hover:border-rose-500',
        titleHover: 'group-hover:text-rose-400',
        link: 'text-rose-400',
    },
];

function HomePage({ onSelect, isAdmin, uiConfig, onSaveUiConfig }) {
    // null | 'saving' | 'cloud' | 'local' | 'error'
    const [saveStatus, setSaveStatus] = useState(null);
    const [saveError, setSaveError] = useState(null);
    const vis = uiConfig.MODULE_VISIBILITY || {};
    const labels = uiConfig.MODULE_LABELS || MODULE_VISIBILITY_DEFAULT_LABELS;
    // Người dùng thường: chỉ tile đang hiện. Admin: thấy hết (tile ẩn để mờ + nút toggle).
    const shown = MODULES.filter((m) => isAdmin || vis[m.id] !== false);

    // Payload ui-visibility bị THAY TOÀN BỘ mỗi lần lưu, nên luôn gửi cả 2 key — nếu chỉ gửi
    // MODULE_VISIBILITY thì mỗi lần bấm Ẩn/Hiện sẽ xoá sạch tên module admin đã đặt.
    const persist = async (next) => {
        setSaveStatus('saving');
        setSaveError(null);
        try {
            const res = await onSaveUiConfig(next);
            if (res?.error || res?.local === false) {
                setSaveStatus('error');
                setSaveError(res?.error || 'Không lưu được');
                return;
            }
            setSaveStatus(res?.cloud ? 'cloud' : 'local');
        } catch (e) {
            setSaveStatus('error');
            setSaveError(e?.message || 'Không lưu được');
        }
    };

    const handleToggle = (id) =>
        persist({
            ...uiConfig,
            MODULE_VISIBILITY: { ...vis, [id]: !(vis[id] !== false) },
        });

    // patch chỉ chứa field có nội dung → field bỏ trống quay về giá trị mặc định.
    const handleSaveLabel = (id, patch) =>
        persist({
            ...uiConfig,
            MODULE_LABELS: {
                ...labels,
                [id]: { ...MODULE_VISIBILITY_DEFAULT_LABELS[id], ...patch },
            },
        });

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-xl">
            <header className="text-center mb-8">
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    Công Cụ Tính Giá In Ấn
                </h1>
                <p className="text-gray-400 mt-2">Chọn loại hình in để bắt đầu tính giá</p>
                {isAdmin && (
                    <p className="mt-3 text-xs">
                        {saveStatus === 'saving' && (
                            <span className="text-gray-400">Đang lưu…</span>
                        )}
                        {saveStatus === 'cloud' && (
                            <span className="text-emerald-400">✓ Đã lưu (đồng bộ đám mây)</span>
                        )}
                        {saveStatus === 'local' && (
                            <span className="text-yellow-400">
                                ✓ Đã lưu trên máy này — đám mây chưa đồng bộ (xem
                                docs/database/migration-ui-visibility-enum.sql)
                            </span>
                        )}
                        {saveStatus === 'error' && (
                            <span className="text-red-400">✗ Không lưu được: {saveError}</span>
                        )}
                        {!saveStatus && (
                            <span className="text-gray-500">
                                Bấm ✎ để đổi tên module, Hiện/Ẩn để bật tắt hiển thị với người dùng.
                            </span>
                        )}
                    </p>
                )}
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 max-w-7xl mx-auto">
                {shown.map((m) => (
                    <ModuleTile
                        key={m.id}
                        mod={m}
                        label={labels[m.id] || MODULE_VISIBILITY_DEFAULT_LABELS[m.id]}
                        onSelect={onSelect}
                        isAdmin={isAdmin}
                        visible={vis[m.id] !== false}
                        onToggle={handleToggle}
                        onSaveLabel={handleSaveLabel}
                    />
                ))}
            </div>
        </div>
    );
}

function SmallPrintModule({ onBack, heading }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        paperType: '3',
        artPaperPrice: 10000,
        productW: 9,
        productH: 5.5,
        bleed: 0.15,
        productQuantity: 500,
        printSides: '2',
        printContents: 1,
        variableData: 'no',
        largeSheetSelector: '0',
        customSheetW: 70,
        customSheetH: 100,
        mountingType: 'none',
        laminationType: 'none',
        creasingType: 'none',
        holePunchingType: 'none',
        customFinishingType: 'none',
        dieCuttingType: 'none',
        moldType: 'simple',
        tagHasHole: false,
        printColorMode: '4color',
        foilStamping: 'none',
        // Danh sách khuôn ép kim — mỗi khuôn có kích thước / màu / số lần ép riêng.
        // (Thay cho foilSpecialColor/foilCustomSize/foilW/foilH cũ — xem engine finishing.js.)
        foilMolds: [{ w: 9, h: 5.5, special: false, impressions: 1 }],
    });
    const [results, setResults] = useState([]);
    const [quote, setQuote] = useState(null);
    const [calcProps, setCalcProps] = useState({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        setConfig(loadConfig()); // local trước
        loadConfigFromCloud('printConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const calculateAll = useCallback(() => {
        try {
            if (
                isNaN(params.productW) ||
                isNaN(params.productH) ||
                isNaN(params.bleed) ||
                isNaN(params.productQuantity)
            ) {
                setErrorMsg('Đang chờ nhập đủ thông số...');
                setResults([]);
                return;
            }
            const productWithBleedW = parseFloat(params.productW) + parseFloat(params.bleed) * 2;
            const productWithBleedH = parseFloat(params.productH) + parseFloat(params.bleed) * 2;
            let allResults = [];
            const selectedPaperIndex = parseInt(params.paperType, 10);
            const paperData = config.PAPER_STOCK_DATA || [];
            const selectedPaper = paperData[selectedPaperIndex];
            if (!selectedPaper) {
                setErrorMsg('Loại giấy không hợp lệ.');
                return;
            }
            const model = selectedPaper.pricingModel;
            const isDigitalCutting = params.dieCuttingType === 'digital';
            let spacing = 0;
            if (params.dieCuttingType === 'mold') spacing = 0.4;
            if (isDigitalCutting) spacing = 0.6;
            if (model === 'sqm')
                calculateDecalOptions(
                    params,
                    selectedPaper,
                    productWithBleedW,
                    productWithBleedH,
                    allResults,
                    spacing,
                    isDigitalCutting,
                    config
                );
            else if (model === 'per_sheet')
                calculatePerSheetOptions(
                    params,
                    selectedPaper,
                    productWithBleedW,
                    productWithBleedH,
                    allResults,
                    spacing,
                    isDigitalCutting,
                    config
                );
            else
                calculatePaperOptions(
                    params,
                    selectedPaper,
                    productWithBleedW,
                    productWithBleedH,
                    allResults,
                    spacing,
                    isDigitalCutting,
                    config
                );
            if (allResults.length === 0) {
                setErrorMsg('Không tìm thấy phương án tối ưu phù hợp.');
                setResults([]);
                return;
            }
            allResults.sort((a, b) => a.costPerProduct - b.costPerProduct);
            const uniqueResults = allResults.filter(
                (v, i, a) =>
                    a.findIndex(
                        (t) =>
                            t.printer.name === v.printer.name &&
                            t.largeSheetName === v.largeSheetName &&
                            t.cutSheetSize === v.cutSheetSize &&
                            t.productsPerSheet === v.productsPerSheet
                    ) === i
            );
            const validResults = uniqueResults.filter((r) => isFinite(r.costPerProduct));
            if (validResults.length === 0) {
                setErrorMsg('Không tính được chi phí hợp lệ.');
                setResults([]);
                return;
            }
            const bestPreferredOption = validResults.find((r) => r.cutSheetH <= 48);
            const mainResult = bestPreferredOption || validResults[0];
            if (!mainResult || mainResult.productsPerSheet <= 0) {
                setErrorMsg('Lỗi: Số sản phẩm / tờ không hợp lệ.');
                setResults([]);
                return;
            }
            const totalQuantity = params.productQuantity;
            const totalPrintSheets = Math.ceil(totalQuantity / mainResult.productsPerSheet);
            // TASK-0008.6: calculateFinishingCost cần INNER config (object có
            // cost_tiers/customer_tiers ở top level), không phải OUTER có subkeys.
            // Trước fix: hole-punch/cấn/bồi luôn = 0 → khách bị tính thiếu phí.
            const { cost: holePunchingCost, customerPrice: holePunchingCustomerPrice } =
                calculateFinishingCost(
                    totalQuantity,
                    params.holePunchingType,
                    config.HOLE_PUNCHING_CONFIG?.[params.holePunchingType]
                );
            const { cost: creasingCost, customerPrice: creasingCustomerPrice } =
                calculateFinishingCost(
                    totalQuantity,
                    params.creasingType,
                    config.CREASING_CONFIG?.[params.creasingType]
                );
            const { cost: mountingCost, customerPrice: mountingCustomerPrice } =
                calculateFinishingCost(
                    totalPrintSheets,
                    params.mountingType,
                    config.MOUNTING_CONFIG?.[params.mountingType]
                );
            const {
                cost: customFinishingCost,
                customerPrice: customFinishingCustomerPrice,
                label: customFinishingLabel,
            } = calculateCustomFinishingCost(
                totalQuantity,
                params.customFinishingType,
                config.CUSTOM_FINISHING_TYPES
            );
            const { moldCost, laborCost, laborCustomerPrice } = calculateDieCuttingCosts(
                params,
                totalPrintSheets,
                mainResult.isDecal,
                config
            );
            const finishingCustomerPrices = {
                holePunching: holePunchingCustomerPrice,
                creasing: creasingCustomerPrice,
                mounting: mountingCustomerPrice,
                customFinishing: customFinishingCustomerPrice,
            };
            const dieCuttingCustomerPrice = { moldCost, laborCustomerPrice };
            const foilResult = calculateFoilStamping(params, config);
            const quoteResult = calculateCustomerQuote(
                mainResult,
                params,
                finishingCustomerPrices,
                dieCuttingCustomerPrice,
                foilResult,
                config
            );
            setResults(validResults);
            setQuote(quoteResult);
            setErrorMsg('');
            setCalcProps({
                holePunchingCost,
                creasingCost,
                mountingCost,
                customFinishingCost,
                customFinishingLabel,
                moldCost,
                laborCost,
                finishingCustomerPrices,
                dieCuttingCustomerPrice,
                foilResult,
                variableDataCost: params.variableData === 'yes' ? 10 : 0,
            });
        } catch (e) {
            console.error('Calculation error', e);
            setErrorMsg('Lỗi trong quá trình tính toán.');
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            calculateAll();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [calculateAll, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.small.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Nhập thông số - Hệ thống sẽ tự động tính toán phương án hiệu quả nhất.
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Công Cụ Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <InputPanel
                        config={config}
                        params={params}
                        onChange={handleChange}
                        isAutoCalculating={isCalculating}
                    />
                    <ResultPanel
                        results={results}
                        quote={quote}
                        params={params}
                        config={config}
                        isCalculating={isCalculating}
                        errorMsg={errorMsg}
                        onChange={handleChange}
                        {...calcProps}
                    />
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <SettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('printConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function LargePrintModule({ onBack, heading }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        width: 100,
        height: 100,
        quantity: 1,
        materialTypeKey: 'pp_co_keo',
        laminationTypeKey: 'none',
        formexTypeKey: 'none',
        edgeTaping: false,
        grommetsCheck: false,
        grommetsCount: 0,
        dieCutting: false,
        standeeKey: 'none',
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadLargePrintConfig());
        loadConfigFromCloud('largePrintConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const calculateAll = useCallback(() => {
        if (!config) return;
        if (!params.width || !params.height || !params.materialTypeKey) {
            setResult(null);
            return;
        }
        try {
            const r = calculateLargePrint(params, config);
            setResult(r);
        } catch (e) {
            console.error('Large print calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            calculateAll();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [calculateAll, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.large.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Nhập kích thước & vật liệu - Hệ thống tự động tìm phương án tối ưu.
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Công Cụ Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:items-stretch">
                    <div className="lg:col-span-2 flex">
                        <div className="w-full">
                            <LPInputPanel config={config} params={params} onChange={handleChange} />
                        </div>
                    </div>
                    <div className="lg:col-span-2 flex">
                        <div className="w-full">
                            <LPResultPanel
                                result={result}
                                params={params}
                                config={config}
                                isCalculating={isCalculating}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <LPSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('largePrintConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function DecalModule({ onBack, heading }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        mode: 'single',
        printSheetW: 330,
        printSheetH: 330,
        stickerW: 50,
        stickerH: 90,
        customQuantity: 0,
        decalType: 'Decal giấy',
        shape: 'rectangle',
        discountPercent: 0,
        sheetSizeKey: '0',
        customSheetW: 210,
        customSheetH: 297,
        sheetStickerW: 30,
        sheetStickerH: 20,
        sheetStickerCount: 20,
        sheetCustomQuantity: 0,
        sheetDecalType: 'Decal giấy',
        sheetLamination: false,
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadDecalConfig());
        loadConfigFromCloud('decalConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const calculateAll = useCallback(() => {
        if (!config) return;
        try {
            // Danh sách máy bế (mỗi máy lề vùng bế riêng → số con/tờ khác). Rỗng → 1 máy mặc định.
            const machines =
                Array.isArray(config.machines) && config.machines.length > 0
                    ? config.machines
                    : [
                          {
                              name: 'Mặc định',
                              marginShort: config.marginShortSide,
                              marginLong: config.marginLongSide,
                          },
                      ];

            // Chiết khấu % (báo giá). Giá sàn/tờ theo (khổ đang chọn × loại decal của dòng).
            const discountPercent = parseFloat(params.discountPercent) || 0;
            const selectedSize = (config.printSheetSizes || []).find(
                (s) => s.w === params.printSheetW && s.h === params.printSheetH
            );
            const floorByMaterial = selectedSize?.minPriceByMaterial || {};
            // Gắn finalPrice + floored vào từng dòng bảng giá (giữ price gốc để hiển thị).
            const withDiscount = (priceTable, count) =>
                priceTable.map((row) => {
                    const sheets = count > 0 ? Math.ceil(row.quantity / count) : 0;
                    const minPrice = floorByMaterial[row.decalType] || 0;
                    const { price, floored } = applyDiscount(
                        row.price,
                        sheets,
                        discountPercent,
                        minPrice
                    );
                    return { ...row, finalPrice: price, floored };
                });

            if (params.mode === 'single') {
                const w = params.stickerW,
                    h = params.stickerH;
                if (!w || !h || w <= 0 || h <= 0) {
                    setResult(null);
                    return;
                }
                const perMachine = machines
                    .map((m) => {
                        const layout = calculateStickersPerSheet(
                            w,
                            h,
                            params.printSheetW,
                            params.printSheetH,
                            params.shape,
                            config,
                            m
                        );
                        if (layout.count <= 0) return null;
                        const priceTable = generateSinglePriceTable(
                            layout.count,
                            params.decalType,
                            params.printSheetW,
                            params.printSheetH,
                            config,
                            parseInt(params.customQuantity) || 0
                        );
                        return {
                            name: m.name,
                            layout,
                            priceTable: withDiscount(priceTable, layout.count),
                        };
                    })
                    .filter(Boolean);
                if (perMachine.length === 0) {
                    setResult(null);
                    return;
                }
                setResult({
                    mode: 'single',
                    machines: perMachine,
                    discountPercent,
                    sheetW: params.printSheetW,
                    sheetH: params.printSheetH,
                });
            } else {
                let shW, shH;
                if (params.sheetSizeKey === 'custom') {
                    shW = params.customSheetW;
                    shH = params.customSheetH;
                } else {
                    const idx = parseInt(params.sheetSizeKey, 10);
                    const found = config.stickerSheetSizes?.[isNaN(idx) ? 0 : idx];
                    if (found) {
                        shW = found.w;
                        shH = found.h;
                    } else {
                        shW = 210;
                        shH = 297;
                    }
                }
                const stickerCount = parseInt(params.sheetStickerCount) || 0;
                if (!shW || !shH || stickerCount <= 0) {
                    setResult(null);
                    return;
                }
                const perMachine = machines
                    .map((m) => {
                        const sheetsLayout = calculateSheetsPerPrintSheet(
                            shW,
                            shH,
                            params.printSheetW,
                            params.printSheetH,
                            config,
                            m
                        );
                        if (sheetsLayout.count <= 0) return null;
                        const priceTable = generateSheetPriceTable(
                            sheetsLayout.count,
                            stickerCount,
                            params.sheetDecalType,
                            params.printSheetW,
                            params.printSheetH,
                            config,
                            parseInt(params.sheetCustomQuantity) || 0
                        );
                        return {
                            name: m.name,
                            layout: { ...sheetsLayout, itemW: shW, itemH: shH },
                            sheetsPerPrintSheet: sheetsLayout.count,
                            priceTable: withDiscount(priceTable, sheetsLayout.count),
                        };
                    })
                    .filter(Boolean);
                if (perMachine.length === 0) {
                    setResult(null);
                    return;
                }
                setResult({
                    mode: 'sheet',
                    machines: perMachine,
                    discountPercent,
                    sheetW: params.printSheetW,
                    sheetH: params.printSheetH,
                });
            }
        } catch (e) {
            console.error('Decal calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            calculateAll();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [calculateAll, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.decal.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Chọn loại sản phẩm và khổ in để bắt đầu báo giá.
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Bảng Báo Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <DecalInputPanel config={config} params={params} onChange={handleChange} />
                    </div>
                    <div className="lg:col-span-2">
                        <DecalResultPanel
                            result={result}
                            params={params}
                            config={config}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <DecalSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('decalConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function UvdtfModule({ onBack, heading }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({ widthMM: 50, heightMM: 90, quantity: 1000 });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadUvdtfConfig());
        loadConfigFromCloud('uvdtfConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const doCalc = useCallback(() => {
        if (!config) return;
        try {
            setResult(calculateUvDtf(params, config));
        } catch (e) {
            console.error('UV DTF calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.uvdtf.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Khổ vật liệu {config.materialWidthCM}cm · Vùng in {config.printableWidthCM}cm
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <UvdtfInputPanel config={config} params={params} onChange={handleChange} />
                    <UvdtfResultPanel
                        result={result}
                        params={params}
                        config={config}
                        isCalculating={isCalculating}
                    />
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <UvdtfSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('uvdtfConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function CatalogueModule({ onBack, heading }) {
    // Dùng chung printConfig (In KTS) cho bảng giá; catalogueConfig chỉ giữ STAPLE_CONFIG.
    const [printConfig, setPrintConfig] = useState(null);
    const [catalogueConfig, setCatalogueConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        numPages: 36,
        finishedW: 210,
        finishedH: 297,
        orientation: 'portrait',
        quantity: 100,
        coverPaperType: '3',
        innerPaperType: '0',
        laminationMode: 'cover1',
        coverSingleSide: false,
        printColorMode: '4color',
        artPaperPrice: 10000,
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setPrintConfig(loadConfig());
        setCatalogueConfig(loadCatalogueConfig());
        loadConfigFromCloud('printConfig').then((c) => {
            if (c) setPrintConfig(c);
        });
        loadConfigFromCloud('catalogueConfig').then((c) => {
            if (c) setCatalogueConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const engineConfig =
        printConfig && catalogueConfig
            ? { ...printConfig, STAPLE_CONFIG: catalogueConfig.STAPLE_CONFIG }
            : null;

    const doCalc = useCallback(() => {
        if (!printConfig || !catalogueConfig) return;
        try {
            const cfg = { ...printConfig, STAPLE_CONFIG: catalogueConfig.STAPLE_CONFIG };
            setResult(calculateCatalogue(params, cfg));
        } catch (e) {
            console.error('Catalogue calc error', e);
            setResult(null);
        }
    }, [params, printConfig, catalogueConfig]);

    useEffect(() => {
        if (!printConfig || !catalogueConfig) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, printConfig, catalogueConfig]);

    if (!engineConfig) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.catalogue.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Gấp lồng bấm kim · số trang chia hết cho 4 · dùng chung giá In KTS Khổ Nhỏ
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-red-500 text-red-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <CatalogueInputPanel
                            config={engineConfig}
                            params={params}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <CatalogueResultPanel
                            result={result}
                            config={engineConfig}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <CatalogueSettingsPanel
                        config={catalogueConfig}
                        onSave={(newConfig) => {
                            setCatalogueConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('catalogueConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function SpiralModule({ onBack, heading }) {
    // Dùng chung printConfig (In KTS); spiralConfig chỉ giữ SPIRAL_CONFIG.
    const [printConfig, setPrintConfig] = useState(null);
    const [spiralConfig, setSpiralConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        numPages: 96,
        finishedW: 148,
        finishedH: 210,
        quantity: 100,
        coverPaperType: '3',
        innerPaperType: '0',
        coverSides: '2',
        innerSides: '2',
        coverColorMode: '4color',
        innerColorMode: '4color',
        coverLam: '1',
        innerLam: '0',
        linerType: '',
        artPaperPrice: 10000,
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setPrintConfig(loadConfig());
        setSpiralConfig(loadSpiralConfig());
        loadConfigFromCloud('printConfig').then((c) => {
            if (c) setPrintConfig(c);
        });
        loadConfigFromCloud('spiralConfig').then((c) => {
            if (c) setSpiralConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const engineConfig =
        printConfig && spiralConfig
            ? { ...printConfig, SPIRAL_CONFIG: spiralConfig.SPIRAL_CONFIG }
            : null;

    const doCalc = useCallback(() => {
        if (!printConfig || !spiralConfig) return;
        try {
            const cfg = { ...printConfig, SPIRAL_CONFIG: spiralConfig.SPIRAL_CONFIG };
            setResult(calculateSpiral(params, cfg));
        } catch (e) {
            console.error('Spiral calc error', e);
            setResult(null);
        }
    }, [params, printConfig, spiralConfig]);

    useEffect(() => {
        if (!printConfig || !spiralConfig) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, printConfig, spiralConfig]);

    if (!engineConfig) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.spiral.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    In từng tờ · tách bìa/ruột · chọn 1-2 mặt · dùng chung giá In KTS Khổ Nhỏ
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-teal-500 text-teal-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <SpiralInputPanel
                            config={engineConfig}
                            params={params}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <SpiralResultPanel
                            result={result}
                            config={engineConfig}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <SpiralSettingsPanel
                        config={spiralConfig}
                        onSave={(newConfig) => {
                            setSpiralConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('spiralConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function StickerModule({ onBack, heading }) {
    // Module độc lập — bảng giá riêng (stickerConfig), không dùng chung module khác.
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        size: '10x10',
        qty: 24,
        stickers: 12,
        contents: 1,
        finish: 'normal',
        fileType: 'vector',
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadStickerConfig());
        loadConfigFromCloud('stickerConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const doCalc = useCallback(() => {
        if (!config) return;
        try {
            setResult(calculateSticker(params, config));
        } catch (e) {
            console.error('Sticker calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.sticker.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Báo giá theo khổ tờ & số lượng · phụ phí cán màng, số sticker, nội dung, vẽ cắt
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-pink-500 text-pink-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <StickerInputPanel
                            config={config}
                            params={params}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <StickerResultPanel
                            result={result}
                            config={config}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <StickerSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('stickerConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function CardModule({ onBack, heading }) {
    // Module độc lập — bảng giá riêng (cardConfig).
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        qty: 100,
        product: 'normal',
        segment: 'direct',
        addons: {},
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadCardConfig());
        loadConfigFromCloud('cardConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const doCalc = useCallback(() => {
        if (!config) return;
        try {
            setResult(calculateCard(params, config));
        } catch (e) {
            console.error('Card calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.card.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Báo giá theo loại thẻ & số lượng · chip / add-on · nhóm khách trực tiếp / đại lý
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <CardInputPanel config={config} params={params} onChange={handleChange} />
                    </div>
                    <div className="lg:col-span-2">
                        <CardResultPanel
                            result={result}
                            config={config}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <CardSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('cardConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function FlyerModule({ onBack, heading }) {
    // Module độc lập — bảng giá riêng (flyerConfig).
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        size: 'A5',
        quantity: 170,
        paper: 'C150',
        sides: '2',
        lamination: 'none',
        creasing: 'none',
        contents: '1-2',
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadFlyerConfig());
        loadConfigFromCloud('flyerConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const doCalc = useCallback(() => {
        if (!config) return;
        try {
            setResult(calculateFlyer(params, config));
        } catch (e) {
            console.error('Flyer calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.flyer.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Báo giá theo khổ & số lượng · giấy · in 1/2 mặt · cán màng · cấn gấp · nội dung
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-amber-500 text-amber-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <FlyerInputPanel config={config} params={params} onChange={handleChange} />
                    </div>
                    <div className="lg:col-span-2">
                        <FlyerResultPanel
                            result={result}
                            config={config}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <FlyerSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('flyerConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

function CheapDecalModule({ onBack, heading }) {
    // Module độc lập — bảng giá riêng (cheapDecalConfig).
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        size: '1',
        quantity: 1000,
        shape: 'round',
        material: 'paper',
        lamination: 'no',
        rush: 'no',
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadCheapDecalConfig());
        loadConfigFromCloud('cheapDecalConfig').then((c) => {
            if (c) setConfig(c);
        });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams((prev) => ({ ...prev, [name]: value }));
    }, []);

    const doCalc = useCallback(() => {
        if (!config) return;
        try {
            setResult(calculateCheapDecal(params, config));
        } catch (e) {
            console.error('CheapDecal calc error', e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => {
            doCalc();
            setIsCalculating(false);
        }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button
                    onClick={onBack}
                    className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition"
                >
                    ← Trang chủ
                </button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">
                    {heading || MODULE_VISIBILITY_DEFAULT_LABELS.cheapdecal.heading}
                </h1>
                <p className="text-gray-400 mt-2">
                    Báo giá nhanh theo cỡ & số lượng · hình · vật liệu · cán màng · lấy trong ngày
                </p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button
                        onClick={() => setActiveTab('main')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-rose-500 text-rose-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Tính Giá
                    </button>
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-rose-500 text-rose-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Cài Đặt Bảng Giá
                    </button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-1">
                        <CheapDecalInputPanel
                            config={config}
                            params={params}
                            onChange={handleChange}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <CheapDecalResultPanel
                            result={result}
                            config={config}
                            isCalculating={isCalculating}
                        />
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <AdminGate>
                    <CheapDecalSettingsPanel
                        config={config}
                        onSave={(newConfig) => {
                            setConfig(newConfig);
                            setActiveTab('main');
                            saveConfigToCloud('cheapDecalConfig', newConfig);
                        }}
                        onCancel={() => setActiveTab('main')}
                    />
                </AdminGate>
            )}
        </div>
    );
}

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 text-center">
                    <h2 className="text-2xl font-bold text-red-400 mb-4">Đã xảy ra lỗi</h2>
                    <p className="text-gray-300 mb-2">{this.state.error?.message}</p>
                    <div className="space-y-3 mt-6">
                        <button
                            onClick={() => {
                                localStorage.removeItem('printConfig');
                                localStorage.removeItem('largePrintConfig');
                                localStorage.removeItem('decalConfig');
                                localStorage.removeItem('uvdtfConfig');
                                localStorage.removeItem('catalogueConfig');
                                localStorage.removeItem('spiralConfig');
                                localStorage.removeItem('stickerConfig');
                                localStorage.removeItem('cardConfig');
                                localStorage.removeItem('flyerConfig');
                                localStorage.removeItem('cheapDecalConfig');
                                localStorage.removeItem('moduleVisibilityConfig');
                                window.location.reload();
                            }}
                            className="block w-full max-w-xs mx-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold text-lg"
                        >
                            Xóa dữ liệu cũ & Tải lại
                        </button>
                        <button
                            onClick={() => this.setState({ hasError: false, error: null })}
                            className="block w-full max-w-xs mx-auto bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold"
                        >
                            Thử lại
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}

// Auto-reset localStorage khi URL có ?reset
(function autoReset() {
    try {
        const params = new URLSearchParams(window.location.search);
        if (params.has('reset')) {
            localStorage.removeItem('printConfig');
            localStorage.removeItem('largePrintConfig');
            localStorage.removeItem('decalConfig');
            localStorage.removeItem('uvdtfConfig');
            localStorage.removeItem('catalogueConfig');
            localStorage.removeItem('spiralConfig');
            localStorage.removeItem('stickerConfig');
            localStorage.removeItem('cardConfig');
            localStorage.removeItem('flyerConfig');
            localStorage.removeItem('cheapDecalConfig');
            localStorage.removeItem('moduleVisibilityConfig');
            // Xóa ?reset khỏi URL rồi reload
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
        }
    } catch {}
})();

function App() {
    const [currentModule, setCurrentModule] = useState('home');
    const { user } = useAuth();
    const { isAdmin } = useUserRole(user);

    // Hiển thị + tên tile: default (sync) → cloud override. Default all-visible → không ẩn nhầm
    // khi tải. Giữ chung 1 state vì cả 2 nằm trong cùng payload 'ui-visibility'.
    const [uiConfig, setUiConfig] = useState(loadModuleVisibilityConfig);
    // Admin có thể bấm sửa tên trước khi cloud trả về; đừng đè mất bản nháp/vừa lưu của họ.
    const uiEditedRef = useRef(false);
    // Giá trị hiện tại cho saveUiConfig (callback stable, không muốn re-tạo mỗi lần state đổi).
    const uiConfigRef = useRef(uiConfig);
    uiConfigRef.current = uiConfig;

    useEffect(() => {
        loadConfigFromCloud('moduleVisibilityConfig').then((c) => {
            if (!c || uiEditedRef.current) return;
            setUiConfig({
                MODULE_VISIBILITY: {
                    ...MODULE_VISIBILITY_DEFAULT_CONFIG.MODULE_VISIBILITY,
                    ...c.MODULE_VISIBILITY,
                },
                MODULE_LABELS: mergeModuleLabels(c.MODULE_LABELS),
            });
        });
    }, []);

    const saveUiConfig = useCallback(async (next) => {
        uiEditedRef.current = true;
        const prev = uiConfigRef.current;
        setUiConfig(next); // optimistic
        const res = await saveConfigToCloud('moduleVisibilityConfig', next);
        // Validation fail → saveConfigToCloud trả về trước cả bước ghi localStorage, không có gì
        // được lưu cả. Rollback để UI không hiển thị tên mà thực tế đã mất khi tải lại.
        if (res?.error || res?.local === false) setUiConfig(prev);
        return res;
    }, []);

    const content = (() => {
        const home = () => setCurrentModule('home');
        // Optional chaining + default prop ở component: payload cloud cũ có thể thiếu id.
        const heading = (id) => uiConfig.MODULE_LABELS?.[id]?.heading;

        if (currentModule === 'small')
            return <SmallPrintModule onBack={home} heading={heading('small')} />;
        if (currentModule === 'large')
            return <LargePrintModule onBack={home} heading={heading('large')} />;
        if (currentModule === 'decal')
            return <DecalModule onBack={home} heading={heading('decal')} />;
        if (currentModule === 'uvdtf')
            return <UvdtfModule onBack={home} heading={heading('uvdtf')} />;
        if (currentModule === 'catalogue')
            return <CatalogueModule onBack={home} heading={heading('catalogue')} />;
        if (currentModule === 'spiral')
            return <SpiralModule onBack={home} heading={heading('spiral')} />;
        if (currentModule === 'sticker')
            return <StickerModule onBack={home} heading={heading('sticker')} />;
        if (currentModule === 'card') return <CardModule onBack={home} heading={heading('card')} />;
        if (currentModule === 'flyer')
            return <FlyerModule onBack={home} heading={heading('flyer')} />;
        if (currentModule === 'cheapdecal')
            return <CheapDecalModule onBack={home} heading={heading('cheapdecal')} />;
        return (
            <HomePage
                onSelect={setCurrentModule}
                isAdmin={isAdmin}
                uiConfig={uiConfig}
                onSaveUiConfig={saveUiConfig}
            />
        );
    })();

    return <ErrorBoundary key={currentModule}>{content}</ErrorBoundary>;
}

export default App;
