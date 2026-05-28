import React, { useState, useEffect, useCallback } from 'react';
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
import { loadConfig, loadLargePrintConfig, loadDecalConfig, loadUvdtfConfig, loadConfigFromCloud, saveConfigToCloud } from './utils/configStorage';
import { calculatePaperOptions, calculatePerSheetOptions, calculateDecalOptions, calculateFinishingCost, calculateDieCuttingCosts, calculateFoilStamping } from './utils/calculator';
import { calculateCustomerQuote } from './utils/customerQuote';
import { calculateLargePrint } from './utils/largePrintCalculator';
import { calculateStickersPerSheet, calculateSheetsPerPrintSheet, generateSinglePriceTable, generateSheetPriceTable } from './utils/decalCalculator';
import { calculateUvDtf } from './utils/uvdtfCalculator';

function HomePage({ onSelect }) {
    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-xl">
            <header className="text-center mb-12">
                <h1 className="text-3xl md:text-4xl font-bold text-white">Công Cụ Tính Giá In Ấn</h1>
                <p className="text-gray-400 mt-2">Chọn loại hình in để bắt đầu tính giá</p>
            </header>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <button onClick={() => onSelect('small')}
                    className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-blue-500 rounded-xl p-8 text-left transition-all duration-200 group">
                    <div className="text-4xl mb-4">🖨</div>
                    <h2 className="text-2xl font-bold text-white group-hover:text-blue-400 mb-2">In KTS Khổ Nhỏ</h2>
                    <p className="text-gray-400 text-sm">In laser kỹ thuật số trên giấy couche, bristol, ford, decal... Tối ưu hóa xếp hình, tính giá vốn & báo giá khách hàng.</p>
                    <div className="mt-4 text-blue-400 text-sm font-medium group-hover:translate-x-2 transition-transform">Mở công cụ →</div>
                </button>
                <button onClick={() => onSelect('large')}
                    className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-green-500 rounded-xl p-8 text-left transition-all duration-200 group">
                    <div className="text-4xl mb-4">🖼</div>
                    <h2 className="text-2xl font-bold text-white group-hover:text-green-400 mb-2">In Khổ Lớn</h2>
                    <p className="text-gray-400 text-sm">In phun khổ lớn trên PP, decal, backlit, bạt hiflex... Tự động tối ưu khổ cuộn, cán màng, bồi formex.</p>
                    <div className="mt-4 text-green-400 text-sm font-medium group-hover:translate-x-2 transition-transform">Mở công cụ →</div>
                </button>
                <button onClick={() => onSelect('decal')}
                    className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-purple-500 rounded-xl p-8 text-left transition-all duration-200 group">
                    <div className="text-4xl mb-4">🏷</div>
                    <h2 className="text-2xl font-bold text-white group-hover:text-purple-400 mb-2">Tính Giá Decal</h2>
                    <p className="text-gray-400 text-sm">Tính giá tem lẻ & tờ sticker. Mô phỏng xếp tem, bảng giá lũy tiến, bế demi, cán màng tự động.</p>
                    <div className="mt-4 text-purple-400 text-sm font-medium group-hover:translate-x-2 transition-transform">Mở công cụ →</div>
                </button>
                <button onClick={() => onSelect('uvdtf')}
                    className="bg-gray-800 hover:bg-gray-700 border-2 border-gray-600 hover:border-orange-500 rounded-xl p-8 text-left transition-all duration-200 group">
                    <div className="text-4xl mb-4">✨</div>
                    <h2 className="text-2xl font-bold text-white group-hover:text-orange-400 mb-2">In UV DTF</h2>
                    <p className="text-gray-400 text-sm">Tính giá in UV DTF theo mét tới. Tự động xoay tối ưu, mô phỏng xếp hình trên cuộn.</p>
                    <div className="mt-4 text-orange-400 text-sm font-medium group-hover:translate-x-2 transition-transform">Mở công cụ →</div>
                </button>
            </div>
        </div>
    );
}

function SmallPrintModule({ onBack }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        paperType: '3', artPaperPrice: 10000, productW: 9, productH: 5.5, bleed: 0.15,
        productQuantity: 500, printSides: '2', printContents: 1, variableData: 'no',
        largeSheetSelector: '0', customSheetW: 70, customSheetH: 100,
        mountingType: 'none', laminationType: 'none', creasingType: 'none',
        holePunchingType: 'none', dieCuttingType: 'none', moldType: 'simple',
        tagHasHole: false, printColorMode: '4color',
        foilStamping: 'none', foilSpecialColor: false, foilCustomSize: false, foilW: 5, foilH: 5,
    });
    const [results, setResults] = useState([]);
    const [quote, setQuote] = useState(null);
    const [calcProps, setCalcProps] = useState({});
    const [isCalculating, setIsCalculating] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    useEffect(() => {
        setConfig(loadConfig()); // local trước
        loadConfigFromCloud('printConfig').then(c => { if (c) setConfig(c); });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams(prev => ({ ...prev, [name]: value }));
    }, []);

    const calculateAll = useCallback(() => {
        try {
            if (isNaN(params.productW) || isNaN(params.productH) || isNaN(params.bleed) || isNaN(params.productQuantity)) {
                setErrorMsg("Đang chờ nhập đủ thông số...");
                setResults([]);
                return;
            }
            const productWithBleedW = parseFloat(params.productW) + (parseFloat(params.bleed) * 2);
            const productWithBleedH = parseFloat(params.productH) + (parseFloat(params.bleed) * 2);
            let allResults = [];
            const selectedPaperIndex = parseInt(params.paperType, 10);
            const paperData = config.PAPER_STOCK_DATA || [];
            const selectedPaper = paperData[selectedPaperIndex];
            if (!selectedPaper) { setErrorMsg("Loại giấy không hợp lệ."); return; }
            const model = selectedPaper.pricingModel;
            const isDigitalCutting = params.dieCuttingType === 'digital';
            let spacing = 0;
            if (params.dieCuttingType === 'mold') spacing = 0.4;
            if (isDigitalCutting) spacing = 0.6;
            if (model === 'sqm') calculateDecalOptions(params, selectedPaper, productWithBleedW, productWithBleedH, allResults, spacing, isDigitalCutting, config);
            else if (model === 'per_sheet') calculatePerSheetOptions(params, selectedPaper, productWithBleedW, productWithBleedH, allResults, spacing, isDigitalCutting, config);
            else calculatePaperOptions(params, selectedPaper, productWithBleedW, productWithBleedH, allResults, spacing, isDigitalCutting, config);
            if (allResults.length === 0) { setErrorMsg("Không tìm thấy phương án tối ưu phù hợp."); setResults([]); return; }
            allResults.sort((a, b) => a.costPerProduct - b.costPerProduct);
            const uniqueResults = allResults.filter((v,i,a)=>a.findIndex(t=>(t.printer.name===v.printer.name&&t.largeSheetName===v.largeSheetName&&t.cutSheetSize===v.cutSheetSize&&t.productsPerSheet===v.productsPerSheet))===i);
            const validResults = uniqueResults.filter(r => isFinite(r.costPerProduct));
            if (validResults.length === 0) { setErrorMsg("Không tính được chi phí hợp lệ."); setResults([]); return; }
            const bestPreferredOption = validResults.find(r => r.cutSheetH <= 48);
            const mainResult = bestPreferredOption || validResults[0];
            if (!mainResult || mainResult.productsPerSheet <= 0) { setErrorMsg("Lỗi: Số sản phẩm / tờ không hợp lệ."); setResults([]); return; }
            const totalQuantity = params.productQuantity;
            const totalPrintSheets = Math.ceil(totalQuantity / mainResult.productsPerSheet);
            const { cost: holePunchingCost, customerPrice: holePunchingCustomerPrice } = calculateFinishingCost(totalQuantity, params.holePunchingType, config.HOLE_PUNCHING_CONFIG);
            const { cost: creasingCost, customerPrice: creasingCustomerPrice } = calculateFinishingCost(totalQuantity, params.creasingType, config.CREASING_CONFIG);
            const { cost: mountingCost, customerPrice: mountingCustomerPrice } = calculateFinishingCost(totalPrintSheets, params.mountingType, config.MOUNTING_CONFIG);
            const { moldCost, laborCost, laborCustomerPrice } = calculateDieCuttingCosts(params, totalPrintSheets, mainResult.isDecal, config);
            const finishingCustomerPrices = { holePunching: holePunchingCustomerPrice, creasing: creasingCustomerPrice, mounting: mountingCustomerPrice };
            const dieCuttingCustomerPrice = { moldCost, laborCustomerPrice };
            const foilResult = calculateFoilStamping(params, config);
            const quoteResult = calculateCustomerQuote(mainResult, params, finishingCustomerPrices, dieCuttingCustomerPrice, foilResult, config);
            setResults(validResults);
            setQuote(quoteResult);
            setErrorMsg('');
            setCalcProps({ holePunchingCost, creasingCost, mountingCost, moldCost, laborCost, finishingCustomerPrices, dieCuttingCustomerPrice, foilResult, variableDataCost: params.variableData === 'yes' ? 10 : 0 });
        } catch (e) {
            console.error("Calculation error", e);
            setErrorMsg("Lỗi trong quá trình tính toán.");
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => { calculateAll(); setIsCalculating(false); }, 150);
        return () => clearTimeout(timer);
    }, [calculateAll, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">← Trang chủ</button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">In KTS Khổ Nhỏ — Tính Giá & Báo Giá</h1>
                <p className="text-gray-400 mt-2">Nhập thông số - Hệ thống sẽ tự động tính toán phương án hiệu quả nhất.</p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button onClick={() => setActiveTab('main')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Công Cụ Tính Giá</button>
                    <button onClick={() => setActiveTab('settings')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-blue-500 text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Cài Đặt Bảng Giá</button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    <InputPanel config={config} params={params} onChange={handleChange} isAutoCalculating={isCalculating} />
                    <ResultPanel results={results} quote={quote} params={params} config={config} isCalculating={isCalculating} errorMsg={errorMsg} onChange={handleChange} {...calcProps} />
                </div>
            )}
            {activeTab === 'settings' && (
                <SettingsPanel config={config} onSave={(newConfig) => { setConfig(newConfig); setActiveTab('main'); saveConfigToCloud('printConfig', newConfig, 'TEMP_ADMIN_PASSWORD_PLACEHOLDER'); }} onCancel={() => setActiveTab('main')} />
            )}
        </div>
    );
}

function LargePrintModule({ onBack }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        width: 100, height: 100, quantity: 1,
        materialTypeKey: 'pp_co_keo', laminationTypeKey: 'none', formexTypeKey: 'none',
        edgeTaping: false, grommetsCheck: false, grommetsCount: 0, dieCutting: false, standeeKey: 'none',
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadLargePrintConfig());
        loadConfigFromCloud('largePrintConfig').then(c => { if (c) setConfig(c); });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams(prev => ({ ...prev, [name]: value }));
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
            console.error("Large print calc error", e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => { calculateAll(); setIsCalculating(false); }, 150);
        return () => clearTimeout(timer);
    }, [calculateAll, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">← Trang chủ</button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">In Khổ Lớn — Tư Vấn & Tính Giá</h1>
                <p className="text-gray-400 mt-2">Nhập kích thước & vật liệu - Hệ thống tự động tìm phương án tối ưu.</p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button onClick={() => setActiveTab('main')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Công Cụ Tính Giá</button>
                    <button onClick={() => setActiveTab('settings')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-green-500 text-green-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Cài Đặt Bảng Giá</button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 lg:items-stretch">
                    <div className="lg:col-span-2 flex">
                        <div className="w-full"><LPInputPanel config={config} params={params} onChange={handleChange} /></div>
                    </div>
                    <div className="lg:col-span-2 flex">
                        <div className="w-full"><LPResultPanel result={result} params={params} config={config} isCalculating={isCalculating} onChange={handleChange} /></div>
                    </div>
                </div>
            )}
            {activeTab === 'settings' && (
                <LPSettingsPanel config={config} onSave={(newConfig) => { setConfig(newConfig); setActiveTab('main'); saveConfigToCloud('largePrintConfig', newConfig, 'TEMP_ADMIN_PASSWORD_PLACEHOLDER'); }} onCancel={() => setActiveTab('main')} />
            )}
        </div>
    );
}

function DecalModule({ onBack }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({
        mode: 'single',
        printSheetW: 330, printSheetH: 330,
        stickerW: 50, stickerH: 90, customQuantity: 0,
        decalType: 'Decal giấy', shape: 'rectangle',
        sheetSizeKey: '0', customSheetW: 210, customSheetH: 297,
        sheetStickerW: 30, sheetStickerH: 20, sheetStickerCount: 20, sheetCustomQuantity: 0,
        sheetDecalType: 'Decal giấy', sheetLamination: false,
    });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadDecalConfig());
        loadConfigFromCloud('decalConfig').then(c => { if (c) setConfig(c); });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams(prev => ({ ...prev, [name]: value }));
    }, []);

    const calculateAll = useCallback(() => {
        if (!config) return;
        try {
            if (params.mode === 'single') {
                const w = params.stickerW, h = params.stickerH;
                if (!w || !h || w <= 0 || h <= 0) { setResult(null); return; }
                const layout = calculateStickersPerSheet(w, h, params.printSheetW, params.printSheetH, params.shape, config);
                if (layout.count <= 0) { setResult(null); return; }
                const priceTable = generateSinglePriceTable(layout.count, params.decalType, params.printSheetW, params.printSheetH, config, parseInt(params.customQuantity) || 0);
                setResult({ mode: 'single', layout, priceTable, sheetW: params.printSheetW, sheetH: params.printSheetH });
            } else {
                let shW, shH;
                if (params.sheetSizeKey === 'custom') { shW = params.customSheetW; shH = params.customSheetH; }
                else {
                    const idx = parseInt(params.sheetSizeKey, 10);
                    const found = config.stickerSheetSizes?.[isNaN(idx) ? 0 : idx];
                    if (found) { shW = found.w; shH = found.h; }
                    else { shW = 210; shH = 297; }
                }
                const stickerCount = parseInt(params.sheetStickerCount) || 0;
                if (!shW || !shH || stickerCount <= 0) { setResult(null); return; }
                const sheetsLayout = calculateSheetsPerPrintSheet(shW, shH, params.printSheetW, params.printSheetH, config);
                if (sheetsLayout.count <= 0) { setResult(null); return; }
                const priceTable = generateSheetPriceTable(sheetsLayout.count, stickerCount, params.sheetDecalType, params.printSheetW, params.printSheetH, config, parseInt(params.sheetCustomQuantity) || 0);
                setResult({ mode: 'sheet', layout: { ...sheetsLayout, itemW: shW, itemH: shH }, sheetsPerPrintSheet: sheetsLayout.count, priceTable, sheetW: params.printSheetW, sheetH: params.printSheetH });
            }
        } catch (e) {
            console.error("Decal calc error", e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => { calculateAll(); setIsCalculating(false); }, 150);
        return () => clearTimeout(timer);
    }, [calculateAll, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">← Trang chủ</button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Tính Giá In Decal</h1>
                <p className="text-gray-400 mt-2">Chọn loại sản phẩm và khổ in để bắt đầu báo giá.</p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button onClick={() => setActiveTab('main')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Bảng Báo Giá</button>
                    <button onClick={() => setActiveTab('settings')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-purple-500 text-purple-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Cài Đặt Bảng Giá</button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <DecalInputPanel config={config} params={params} onChange={handleChange} />
                    <DecalResultPanel result={result} params={params} config={config} isCalculating={isCalculating} />
                </div>
            )}
            {activeTab === 'settings' && (
                <DecalSettingsPanel config={config} onSave={(newConfig) => { setConfig(newConfig); setActiveTab('main'); saveConfigToCloud('decalConfig', newConfig, 'TEMP_ADMIN_PASSWORD_PLACEHOLDER'); }} onCancel={() => setActiveTab('main')} />
            )}
        </div>
    );
}

function UvdtfModule({ onBack }) {
    const [config, setConfig] = useState(null);
    const [activeTab, setActiveTab] = useState('main');
    const [params, setParams] = useState({ widthMM: 50, heightMM: 90, quantity: 1000 });
    const [result, setResult] = useState(null);
    const [isCalculating, setIsCalculating] = useState(false);

    useEffect(() => {
        setConfig(loadUvdtfConfig());
        loadConfigFromCloud('uvdtfConfig').then(c => { if (c) setConfig(c); });
    }, []);

    const handleChange = useCallback((name, value) => {
        setParams(prev => ({ ...prev, [name]: value }));
    }, []);

    const doCalc = useCallback(() => {
        if (!config) return;
        try {
            setResult(calculateUvDtf(params, config));
        } catch (e) {
            console.error("UV DTF calc error", e);
            setResult(null);
        }
    }, [params, config]);

    useEffect(() => {
        if (!config) return;
        setIsCalculating(true);
        const timer = setTimeout(() => { doCalc(); setIsCalculating(false); }, 150);
        return () => clearTimeout(timer);
    }, [doCalc, config]);

    if (!config) return <div className="p-8 text-white">Đang tải cấu hình...</div>;

    return (
        <div className="container mx-auto p-4 md:p-8 max-w-screen-2xl">
            <header className="text-center mb-8 relative">
                <button onClick={onBack} className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-sm bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg transition">← Trang chủ</button>
                <h1 className="text-3xl md:text-4xl font-bold text-white">Tính Giá In UV DTF</h1>
                <p className="text-gray-400 mt-2">Khổ vật liệu {config.materialWidthCM}cm · Vùng in {config.printableWidthCM}cm</p>
            </header>
            <div className="mb-8 border-b border-gray-700">
                <nav className="flex -mb-px space-x-8">
                    <button onClick={() => setActiveTab('main')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'main' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Tính Giá</button>
                    <button onClick={() => setActiveTab('settings')} className={`py-4 px-1 border-b-2 font-medium text-lg ${activeTab === 'settings' ? 'border-orange-500 text-orange-400' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>Cài Đặt Bảng Giá</button>
                </nav>
            </div>
            {activeTab === 'main' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <UvdtfInputPanel config={config} params={params} onChange={handleChange} />
                    <UvdtfResultPanel result={result} params={params} config={config} isCalculating={isCalculating} />
                </div>
            )}
            {activeTab === 'settings' && (
                <UvdtfSettingsPanel config={config} onSave={(newConfig) => { setConfig(newConfig); setActiveTab('main'); saveConfigToCloud('uvdtfConfig', newConfig, 'TEMP_ADMIN_PASSWORD_PLACEHOLDER'); }} onCancel={() => setActiveTab('main')} />
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
                        <button onClick={() => {
                            localStorage.removeItem('printConfig');
                            localStorage.removeItem('largePrintConfig');
                            localStorage.removeItem('decalConfig');
                            localStorage.removeItem('uvdtfConfig');
                            window.location.reload();
                        }}
                            className="block w-full max-w-xs mx-auto bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold text-lg">
                            Xóa dữ liệu cũ & Tải lại
                        </button>
                        <button onClick={() => this.setState({ hasError: false, error: null })}
                            className="block w-full max-w-xs mx-auto bg-gray-600 hover:bg-gray-500 text-white px-6 py-3 rounded-lg font-semibold">
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
            // Xóa ?reset khỏi URL rồi reload
            window.history.replaceState({}, '', window.location.pathname);
            window.location.reload();
        }
    } catch (e) {}
})();

function App() {
    const [currentModule, setCurrentModule] = useState('home');

    const content = (() => {
        if (currentModule === 'small') return <SmallPrintModule onBack={() => setCurrentModule('home')} />;
        if (currentModule === 'large') return <LargePrintModule onBack={() => setCurrentModule('home')} />;
        if (currentModule === 'decal') return <DecalModule onBack={() => setCurrentModule('home')} />;
        if (currentModule === 'uvdtf') return <UvdtfModule onBack={() => setCurrentModule('home')} />;
        return <HomePage onSelect={setCurrentModule} />;
    })();

    return <ErrorBoundary key={currentModule}>{content}</ErrorBoundary>;
}

export default App;
