"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { 
  Info, 
  Maximize2, 
  Sparkles, 
  Zap, 
  Layers, 
  Compass,
  Trash2,
  Plus,
  Edit3,
  Sun,
  Cpu,
  Menu,
  X,
  ChevronLeft,
  ChevronRight
} from "@/components/ui/icons";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import InteractiveCursor from "@/components/ui/InteractiveCursor";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { useConfiguratorStore, RoofSection, getAggregateAnalytics } from "@/store/useConfiguratorStore";
import dynamic from "next/dynamic";
import {
  calculateThailandRoi,
  calculateThailandSolarYield,
  THAILAND_SOLAR_DEFAULTS,
} from "@/lib/thailandSolar";
import {
  fallbackVisualizerPanels,
  type VisualizerPanelProduct,
} from "@/lib/visualizerProducts";
import { useLocale, useTranslations } from "next-intl";
import { GsapPulse, GsapSpinner } from "@/components/ui/GsapMotion";
import { trackProductEvent } from "@/lib/productAnalytics";
import VisxSunArc from "@/components/charts/VisxSunArc";
import { SoliaGuide } from "@/components/brand/solia-scenes";

function MapLoading() {
  const t = useTranslations("VisualizerClient");
  return (
    <GsapPulse className="h-full w-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
      {t("loading.satelliteMap")}
    </GsapPulse>
  );
}

type RoofAnalysisPayload = {
  success?: boolean;
  roofAreaSqm?: number;
  pitchDegrees?: number;
  confidence?: number;
};

const MapRoofSelector = dynamic(() => import("@/components/MapRoofSelector"), {
  ssr: false,
  loading: () => <MapLoading />,
});
const SimulatorOverlay = dynamic(() => import("./SimulatorOverlay"), {
  ssr: false,
});

type RoofPlane = RoofSection;

const getOrientationLabel = (deg: number, t: ReturnType<typeof useTranslations>): string => {
  if (deg >= 160 && deg <= 200) return t("orientation.south", { deg });
  else if ((deg >= 130 && deg < 160) || (deg > 200 && deg <= 230)) return t("orientation.southEastWest", { deg });
  else if ((deg >= 90 && deg < 130) || (deg > 230 && deg <= 270)) return t("orientation.eastWest", { deg });
  else if ((deg >= 0 && deg < 90) || (deg > 270 && deg <= 360)) return t("orientation.lowSun", { deg });
  else return t("orientation.diagonal", { deg });
};

const CompassSlider = ({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (val: number) => void;
  ariaLabel: string;
}) => {
  const ticks = [];
  for (let i = 0; i <= 360; i += 15) {
    ticks.push(i);
  }
  return (
    <div className="relative w-full bg-slate-950 border border-slate-800 rounded-xl p-3 pt-5 overflow-hidden select-none">
      {/* Tape scale */}
      <div className="relative h-8 flex items-end justify-between px-1">
        {ticks.map((tick) => {
          const isMajor = tick % 90 === 0;
          const isMedium = tick % 45 === 0 && !isMajor;
          let label = "";
          if (tick === 0 || tick === 360) label = "N";
          else if (tick === 90) label = "E";
          else if (tick === 180) label = "S";
          else if (tick === 270) label = "W";
          else if (tick === 45) label = "NE";
          else if (tick === 135) label = "SE";
          else if (tick === 225) label = "SW";
          else if (tick === 315) label = "NW";

          return (
            <div key={tick} className="flex flex-col items-center flex-1 relative">
              {/* Tick Mark */}
              <div 
                className={cn(
                  "w-[1px] bg-slate-700 transition-colors",
                  isMajor ? "h-4 bg-slate-400" : isMedium ? "h-3" : "h-1.5",
                  Math.abs(value - tick) < 7.5 ? "bg-[#1CBBBB]" : ""
                )} 
              />
              {/* Label */}
              {label && (
                <span className={cn(
                  "text-[8px] font-black absolute -top-4 font-mono transition-colors",
                  isMajor ? "text-slate-300" : "text-slate-500",
                  Math.abs(value - tick) < 7.5 ? "text-[#1CBBBB]" : ""
                )}>
                  {label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Range Input overlaid */}
      <div className="relative mt-2">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={value}
          aria-label={ariaLabel}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#1CBBBB] focus:outline-none"
        />
      </div>
      
      {/* Current Degree display */}
      <div className="absolute top-1.5 right-3 text-[9px] font-black font-mono text-[#1CBBBB]">
        {value}°
      </div>
    </div>
  );
};


export default function VisualizerClient({ initialProducts = fallbackVisualizerPanels }: { initialProducts?: VisualizerPanelProduct[] }) {
  const t = useTranslations("VisualizerClient");
  const locale = useLocale();
  const intlLocale = locale === "en" ? "en-US" : "th-TH";
  const currencyFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
  const monthFormatter = new Intl.DateTimeFormat(intlLocale, { month: "long" });
  const shortMonthFormatter = new Intl.DateTimeFormat(intlLocale, { month: "short" });
  const solarProducts = useMemo(
    () => initialProducts.length > 0 ? initialProducts : fallbackVisualizerPanels,
    [initialProducts],
  );
  const [activeRoofId, setActiveRoofId] = useState<string>("roof-1");
  const [selectedProductId, setSelectedProductId] = useState<string>(solarProducts[0]?.id ?? "mono-350");

  const [plannerMode, setPlannerMode] = useState<'2d' | 'maps'>('2d');
  const [isGenerating, setIsGenerating] = useState(false);
  const [drawnArea, setDrawnArea] = useState<number | null>(null);
  const [addressSearch, setAddressSearch] = useState("");
  const [addressQuery, setAddressQuery] = useState("");
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [setbackMargin, setSetbackMargin] = useState(0.5);
  const [shadingTimeHour, setShadingTimeHour] = useState(12);
  const [shadingMonth, setShadingMonth] = useState(5);
  const [stringingModeActive, setStringingModeActive] = useState(false);
  const [activeStringId, setActiveStringId] = useState("string-a");
  const { latitude, electricalPhase, setElectricalPhase, roofs, setRoofs, setPanelCount } = useConfiguratorStore();
  const [aiAnalysisResult, setAiAnalysisResult] = useState<{
    area: number;
    pitch: number;
    confidence: number;
  } | null>(null);
  
  const [activeTab, setActiveTab] = useState<'roof' | 'shading' | 'electrical'>('roof');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const visualizerAnalyticsInitializedRef = useRef(false);

  useEffect(() => {
    void trackProductEvent("build_started", { surface: "visualizer_page" });
  }, [locale]);

  const handleSearch = () => {
    setAddressQuery(addressSearch);
    void trackProductEvent("search_submitted", {
      surface: "visualizer",
      query_length: addressSearch.trim().length,
    });
  };

  const updateActiveRoof = <K extends keyof RoofPlane>(field: K, value: RoofPlane[K]) => {
    setRoofs(prev => prev.map(r => r.id === activeRoofId ? { ...r, [field]: value } : r));
  };

  const runAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const response = await fetch("/api/analyze-roof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: addressSearch || "Bangkok, Thailand", bounds: null })
      });
      const data = await response.json() as RoofAnalysisPayload;
      if (data.success && typeof data.roofAreaSqm === "number" && typeof data.pitchDegrees === "number" && typeof data.confidence === "number") {
        setAiAnalysisResult({ area: data.roofAreaSqm, pitch: data.pitchDegrees, confidence: data.confidence });
        const calculatedWidth = Math.round(Math.sqrt(data.roofAreaSqm) * 1.2 * 10) / 10;
        const calculatedHeight = Math.round((data.roofAreaSqm / calculatedWidth) * 10) / 10;
        updateActiveRoof("width", calculatedWidth);
        updateActiveRoof("height", calculatedHeight);
        updateActiveRoof("pitch", data.pitchDegrees);
        void trackProductEvent("build_configuration_changed", {
          change_type: "ai_roof_analysis_completed",
          area_sqm: data.roofAreaSqm,
          pitch_degrees: data.pitchDegrees,
          confidence: data.confidence,
        });
        toast.success(t("toast.aiComplete", { area: data.roofAreaSqm, pitch: data.pitchDegrees }));
      } else {
        toast.error(t("toast.aiFailed"));
      }
    } catch (e) {
      console.error(e);
      toast.error(t("toast.networkError"));
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const updateRoofName = (id: string, newName: string) => {
    setRoofs((prev) => prev.map((r) => (r.id === id ? { ...r, name: newName } : r)));
  };

  const [monthlyBill, setMonthlyBill] = useState<number>(5000);
  const [daytimeUsagePercent, setDaytimeUsagePercent] = useState<number>(70);
  const [meterType, setMeterType] = useState<'NORMAL' | 'TOU'>('NORMAL');
  const [electricityRate, setElectricityRate] = useState<number>(4.5);
  const [financialInputsReady, setFinancialInputsReady] = useState(false);

  const selectedProduct = solarProducts.find(p => p.id === selectedProductId) || solarProducts[0];
  const activeRoof = roofs.find(r => r.id === activeRoofId) || roofs[0];

  // ── Shared Aggregate Analytics ──────────────────────────────────────────
  const aggregateData = getAggregateAnalytics(
    roofs,
    selectedProduct.power,
    daytimeUsagePercent,
    electricityRate,
  );
  const totalPanelsAll = aggregateData.totalPanels;
  const totalPowerAll  = aggregateData.totalKwp * 1000; // in W for display
  const totalCostAll   = totalPanelsAll * selectedProduct.price;

  const thailandYield = calculateThailandSolarYield({
    systemKwp: aggregateData.totalKwp,
    latitude: activeRoof?.latitude ?? latitude,
    performanceRatio: THAILAND_SOLAR_DEFAULTS.performanceRatio,
  });
  const roiData = calculateThailandRoi({
    annualKwh: thailandYield.annualKwh,
    tariffRate: electricityRate,
    daytimeUsagePercent,
    installCost: totalCostAll || thailandYield.systemKwp * THAILAND_SOLAR_DEFAULTS.installedCostPerKwp,
  });
  const estimatedSavingsMonthly = financialInputsReady ? roiData.monthlySavings : 0;
  const paybackPeriodYears = financialInputsReady ? roiData.paybackYears : 0;

  useEffect(() => {
    if (!visualizerAnalyticsInitializedRef.current) {
      visualizerAnalyticsInitializedRef.current = true;
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void trackProductEvent("build_configuration_changed", {
        change_type: "visualizer_configuration",
        planner_mode: plannerMode,
        panel_product: selectedProductId,
        roof_count: roofs.length,
        panel_count: totalPanelsAll,
        roof_type: activeRoof?.roofType,
        electrical_phase: electricalPhase,
        financial_inputs_ready: financialInputsReady,
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
  }, [
    activeRoof?.roofType,
    electricalPhase,
    financialInputsReady,
    plannerMode,
    roofs.length,
    selectedProductId,
    totalPanelsAll,
  ]);

  useEffect(() => {
    setPanelCount(totalPanelsAll);
  }, [totalPanelsAll, setPanelCount]);

  const handleAddRoof = () => {
    const nextNum = roofs.length + 1;
    const newId = `roof-${Date.now()}`;
    setRoofs(prev => [...prev, {
      id: newId,
      name: t("roof.defaultName", { count: nextNum }),
      width: 10, height: 6, pitch: 15, roofOrientation: 180, panelRotation: 0,
      panels: [],
      roofType: 'concrete'
    }]);
    setActiveRoofId(newId);
  };

  const handleDeleteRoof = (idToDelete: string) => {
    if (roofs.length <= 1) return;
    const index = roofs.findIndex(r => r.id === idToDelete);
    const newRoofs = roofs.filter(r => r.id !== idToDelete);
    setRoofs(newRoofs);
    if (activeRoofId === idToDelete) {
      setActiveRoofId(newRoofs[Math.max(0, index - 1)].id);
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-[#F0EEE9]">
      {/* Sleek edge-to-edge dark slate header with top safe area spacing */}
      <header className="sd-safe-pt-3-add z-50 flex h-20 w-full shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-3 sm:px-6 sm:pt-6">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#1CBBBB] flex items-center justify-center shadow-md shadow-[#1CBBBB]/20">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-black tracking-wider text-white uppercase flex items-center gap-2">
              <span className="truncate">{t("header.title")}</span>
              <span className="hidden text-[9px] font-black bg-slate-800 text-[#1CBBBB] px-2 py-0.5 rounded border border-slate-700/60 uppercase tracking-widest min-[420px]:inline">
                {t("header.version")}
              </span>
            </h1>
            <p className="hidden text-[9px] font-bold uppercase tracking-wider text-slate-400 sm:block">
              {t("header.subtitle")}
            </p>
          </div>
        </div>

        {/* Center: Active roof display */}
        <div className="hidden md:flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2">
          <span className="text-[9px] font-black uppercase text-slate-500">{t("header.editing")}</span>
          <span className="text-xs font-black text-[#1CBBBB] font-mono">{activeRoof?.name || ""}</span>
          <span className="text-slate-600">|</span>
          <span className="text-[9px] font-black uppercase text-slate-500">{t("header.area")}</span>
          <span className="text-xs font-black text-white font-mono">{t("units.metersSize", { width: activeRoof?.width ?? 0, height: activeRoof?.height ?? 0 })}</span>
        </div>

        {/* Right Action Buttons */}
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setIsConfigOpen(!isConfigOpen)}
            className="flex min-h-11 items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2 text-xs font-black uppercase text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-900/60 lg:hidden"
          >
            {isConfigOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            <span>{t("actions.config")}</span>
          </button>
          <Link href={`/${locale}`} className="hidden rounded-xl border border-slate-850 bg-slate-950/40 px-4 py-2 text-xs font-black uppercase tracking-widest text-slate-300 transition-all hover:border-slate-700 hover:bg-slate-900/60 hover:text-white sm:inline-flex">
            {t("actions.home")}
          </Link>
          <Link href={`/${locale}/build`} className="hidden rounded-xl bg-[#1CBBBB] px-4 py-2 text-xs font-black uppercase tracking-widest text-white shadow-md shadow-[#1CBBBB]/10 transition-all hover:bg-[#159999] md:inline-flex">
            {t("actions.backToBuild")}
          </Link>
        </div>
      </header>

      {/* Main Workspace below header */}
      <div className="relative flex w-full flex-1 flex-row gap-4 overflow-hidden bg-[#F0EEE9] px-3 py-4 sm:px-6 sm:py-8 lg:gap-8 lg:px-20">

      {/* ──── LEFT COLUMN: Scrollable Tabbed Panel with mobile overlay configuration ──── */}
      <div className={cn(
        "h-full w-[min(420px,calc(100vw-1.5rem))] shrink-0 overflow-y-auto bg-white p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col transition-all duration-300 z-40",
        "fixed lg:static top-20 bottom-0 left-0",
        isConfigOpen ? "translate-x-0 shadow-2xl lg:shadow-none" : "-translate-x-full lg:translate-x-0"
      )}>

        {/* Sticky Tab Header */}
        <div className="sticky top-0 z-50 bg-white border-b border-slate-100 pb-3 flex flex-col gap-3 shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-700">{t("sections.configuration")}</h2>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#1CBBBB] border border-[#1CBBBB]/30 bg-[#1CBBBB]/5 px-2 py-0.5 rounded">{t("sections.plannerBadge")}</span>
          </div>
                  <div className="flex gap-5 overflow-x-auto" role="tablist" aria-label={locale === "th" ? "ส่วนตั้งค่าเครื่องมือวางแผง" : "Planner configuration sections"} style={{ scrollbarWidth: 'none' }}>
            {([
              { key: 'roof', label: t("tabs.roof") },
              { key: 'shading', label: t("tabs.shading") },
              { key: 'electrical', label: t("tabs.electrical") },
            ] as { key: 'roof' | 'shading' | 'electrical'; label: string }[]).map(tab => (
              <button key={tab.key} type="button"
                onClick={() => setActiveTab(tab.key)}
                role="tab"
                aria-selected={activeTab === tab.key}
                className={`pb-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.key ? 'border-[#1CBBBB] text-[#1CBBBB]' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="solar-ui-soft-panel mt-4 flex items-center gap-3 p-3">
          <SoliaGuide
            pose="blueprint"
            alt={locale === "th" ? "โซเลียกำลังแนะนำการวางแผงบนหลังคา" : "Solia guiding the roof panel layout"}
            className="h-20 w-16 shrink-0"
            imageSizes="80px"
          />
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sd-navy-900)]">
              {locale === "th" ? "Solia ช่วยวางแผน" : "Solia planning note"}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-700">
              {locale === "th"
                ? "เริ่มจากขนาดหลังคาและทิศทางรับแดด แล้วค่อยวางแผงให้พอดีกับพื้นที่จริง"
                : "Start with roof size and sun direction, then place panels inside the real usable area."}
            </p>
          </div>
        </div>

        {/* Tab Content */}
        <div className="py-5 space-y-6 flex-1">

          {/* ══ TAB 1: Roof & Sizing ══ */}
          {activeTab === 'roof' && (
            <>
              {/* Mode Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-6">
                <button onClick={() => setPlannerMode('2d')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-all ${plannerMode === '2d' ? 'bg-white text-slate-900 shadow-sm border border-slate-100 rounded-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                  2D Canvas
                </button>
                <button onClick={() => setPlannerMode('maps')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${plannerMode === 'maps' ? 'bg-white text-[#1CBBBB] shadow-sm border border-slate-100 rounded-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Layers className="w-3 h-3" /><span>{t("actions.satelliteMode")}</span>
                </button>
              </div>

              {/* Main Inputs Card */}
              {plannerMode === '2d' ? (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#1CBBBB]" />
                    {t("sections.inputs")}
                  </h3>

                  {/* Product Selection */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between">
                      <span>{t("fields.product")}</span>
                      <span className="text-[#1CBBBB] lowercase">{t("fields.specifications")}</span>
                    </label>
                    <select id="visualizer-panel-product" aria-label={t("fields.product")} value={selectedProductId} onChange={(e) => {
                      const nextProductId = e.target.value;
                      setSelectedProductId(nextProductId);
                    }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-[#1CBBBB] rounded-xl px-3 py-2.5 outline-none transition-all cursor-pointer">
                      {solarProducts.map(p => (
                        <option key={p.id} value={p.id}>{p.name} ({p.power}W) — {formatPrice(p.price)}</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-slate-600 font-semibold pl-1">
                      {selectedProduct.desc} • {t("fields.panelSize", { width: selectedProduct.width, height: selectedProduct.height })}
                      {` • ${selectedProduct.source} catalog`}
                    </p>

                    {/* Panel Rotation */}
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 shrink-0">{t("fields.rotation")}:</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input type="range" min="0" max="360" step="1" aria-label={locale === "th" ? "การหมุนแผงโซลาร์" : "Panel rotation"}
                          value={activeRoof?.panelRotation ?? 0}
                          onChange={(e) => updateActiveRoof('panelRotation', Number(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#1CBBBB]" />
                        <span className="text-xs font-black text-slate-900 font-mono w-8 text-right shrink-0">
                          {activeRoof?.panelRotation ?? 0}°
                        </span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.quantity")}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" onClick={(e) => {
                          e.stopPropagation();
                          const p = activeRoof?.panels || [];
                          if (p.length > 0)
                            updateActiveRoof("panels", p.slice(0, -1));
                        }}
                          className="w-7 h-7 rounded-lg bg-brand-surface border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-sm">-</button>
                        <input
                          type="text"
                          readOnly
                          value={activeRoof?.panels?.length ?? 0}
                          aria-label={t("fields.quantity")}
                          className="text-xs font-black text-slate-900 font-mono w-8 text-center bg-transparent border-none outline-none focus:ring-0 focus:outline-none pointer-events-none"
                        />
                        <button type="button" onClick={(e) => {
                          e.stopPropagation();
                          const p = activeRoof?.panels || [];
                          updateActiveRoof("panels", [...p, { id: `p-${Date.now()}`, x: 0, y: 0, rotation: 0 }]);
                        }}
                          className="w-7 h-7 rounded-lg bg-brand-surface border border-slate-200 flex items-center justify-center font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-sm">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Roof Tabs */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between">
                      <span>{t("fields.selectRoof")}</span>
                      <span className="text-[#1CBBBB] lowercase">{t("fields.tabsLabel")}</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {roofs.map(r => (
                        <div key={r.id} onClick={() => setActiveRoofId(r.id)}
                          className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all border cursor-pointer",
                            r.id === activeRoofId ? "bg-[#1CBBBB]/10 text-[#1CBBBB] border-[#1CBBBB]/20 shadow-sm" : "bg-brand-surface text-slate-500 border-slate-200 hover:text-slate-700")}>
                          <span>{r.name}</span>
                          {roofs.length > 1 && (
                            <button type="button" aria-label={locale === "th" ? `ลบ${r.name}` : `Delete ${r.name}`} onClick={(e) => { e.stopPropagation(); handleDeleteRoof(r.id); }}
                              className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-rose-500">
                              <Trash2 className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button onClick={handleAddRoof}
                        className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border border-dashed border-[#1CBBBB] text-[#1CBBBB] bg-[#1CBBBB]/5 hover:bg-[#1CBBBB]/10 cursor-pointer flex items-center gap-1">
                        <Plus className="w-3 h-3" /><span>{t("actions.addRoof")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Roof Name Editor */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 focus-within:border-[#1CBBBB] group/title">
                      <input type="text" aria-label={t("placeholders.roofName")} value={activeRoof.name}
                        onChange={(e) => updateRoofName(activeRoof.id, e.target.value)}
                        className="w-full text-sm font-bold text-slate-900 bg-transparent border-none outline-none"
                        placeholder={t("placeholders.roofName")} />
                      <Edit3 className="w-4 h-4 text-slate-400 group-hover/title:text-[#1CBBBB]" />
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.width")} <span className="text-[#1CBBBB] font-mono">{t("units.meters", { value: activeRoof.width })}</span></label>
                      <input type="range" min="4" max="30" step="0.5" aria-label={t("fields.width")} value={activeRoof.width} onChange={(e) => updateActiveRoof('width', Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1CBBBB]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.length")} <span className="text-[#1CBBBB] font-mono">{t("units.meters", { value: activeRoof.height })}</span></label>
                      <input type="range" min="3" max="20" step="0.5" aria-label={t("fields.length")} value={activeRoof.height} onChange={(e) => updateActiveRoof('height', Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1CBBBB]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.pitch")} <span className="text-[#D8A87B] font-mono">{activeRoof.pitch}°</span></label>
                      <input type="range" min="0" max="45" step="1" aria-label={t("fields.pitch")} value={activeRoof.pitch} onChange={(e) => updateActiveRoof('pitch', Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#D8A87B]" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.roofAzimuth")} <span className="text-[#D8A87B] font-mono">{activeRoof.roofOrientation}°</span></label>
                      <CompassSlider
                        value={activeRoof.roofOrientation}
                        ariaLabel={t("fields.roofAzimuth")}
                        onChange={(val) => updateActiveRoof('roofOrientation', val)}
                      />
                    </div>
                  </div>
                  <p className="text-[9px] text-slate-600 font-semibold pl-1 -mt-1">{getOrientationLabel(activeRoof.roofOrientation, t)}</p>

                  {/* Roof Type Selection */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{t("fields.roofType")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => updateActiveRoof('roofType', 'concrete')}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                          (activeRoof.roofType ?? 'concrete') === 'concrete'
                            ? "bg-[#1CBBBB] text-white border-[#1CBBBB] shadow-sm"
                            : "bg-brand-surface text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{t("roofTypes.concrete")}</span>
                        <span className="text-[8px] opacity-75">(Concrete Tile)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateActiveRoof('roofType', 'metal')}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                          activeRoof.roofType === 'metal'
                            ? "bg-[#1CBBBB] text-white border-[#1CBBBB] shadow-sm"
                            : "bg-brand-surface text-slate-500 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{t("roofTypes.metal")}</span>
                        <span className="text-[8px] opacity-75">(Metal Sheet)</span>
                      </button>
                    </div>
                  </div>

                  {/* Setback */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between">
                      <span>{t("fields.setback")}</span>
                      <span className="text-[#1CBBBB] font-mono">{t("units.meters", { value: setbackMargin })}</span>
                    </label>
                    <input type="range" min="0" max="2" step="0.1" aria-label={t("fields.setback")} value={setbackMargin} onChange={(e) => setSetbackMargin(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1CBBBB]" />
                  </div>

                  {/* Meter & Phase */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.meterType")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['NORMAL', 'TOU'] as const).map(m => (
                        <button key={m} onClick={() => setMeterType(m)}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all ${meterType === m ? 'bg-[#1CBBBB] text-white border-[#1CBBBB]' : 'bg-brand-surface text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                          {m === 'NORMAL' ? t("meter.normal") : t("meter.tou")}
                        </button>
                      ))}
                    </div>
                    
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{t("fields.electricalPhase")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['1-Phase', '3-Phase'] as const).map(ph => (
                        <button key={ph} onClick={() => setElectricalPhase(ph)}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center ${electricalPhase === ph ? (ph === '1-Phase' ? 'bg-slate-900 text-white border-slate-900' : 'bg-[#1CBBBB] text-white border-[#1CBBBB]') : 'bg-brand-surface text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                          <span>{ph === '1-Phase' ? '1 Phase (220V)' : '3 Phase (380V)'}</span>
                          <span className="text-[8px] opacity-70">{ph === '1-Phase' ? t("phase.oneHint") : t("phase.threeHint")}</span>
                        </button>
                      ))}
                    </div>
                    {totalPowerAll > 5000 && electricalPhase === '1-Phase' && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                        <Zap className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-red-700">{t("warnings.phaseUpgradeTitle")}</p>
                          <p className="text-[10px] text-red-600 mt-0.5">{t("warnings.phaseUpgradeDescription")}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Financial Inputs */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    {!financialInputsReady && (
                      <div className="p-3 rounded-xl border border-amber-100 bg-amber-50 text-amber-800">
                        <p className="text-[10px] font-black uppercase tracking-wider">{t("warnings.roiLockedTitle")}</p>
                        <p className="text-[9px] font-semibold mt-1">{t("warnings.roiLockedDescription")}</p>
                      </div>
                    )}
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span>{t("fields.daytimeUsage")}</span>
                        <span className="text-[#1CBBBB] font-mono">{daytimeUsagePercent}%</span>
                      </div>
                      <input type="range" min="10" max="100" step="5" aria-label={t("fields.daytimeUsage")} value={daytimeUsagePercent} onChange={(e) => setDaytimeUsagePercent(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1CBBBB]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span>{t("fields.monthlyBill")}</span>
                      <span className="text-[var(--sd-navy-900)] font-mono">{currencyFormatter.format(monthlyBill)}</span>
                      </div>
                      <input type="range" min="1000" max="50000" step="500" aria-label={t("fields.monthlyBill")} value={monthlyBill} onChange={(e) => setMonthlyBill(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#D8A87B]" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-slate-500">
                        <span>{t("fields.electricityRate")}</span>
                      <span className="text-[var(--sd-navy-900)] font-mono">{t("units.thbPerKwh", { value: electricityRate })}</span>
                      </div>
                      <input type="range" min="2" max="8" step="0.1" aria-label={t("fields.electricityRate")} value={electricityRate} onChange={(e) => setElectricityRate(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#D8A87B]" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFinancialInputsReady(true)}
                        className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors"
                      >
                      {t("actions.confirmTariff")}
                    </button>
                  </div>
                </div>
              ) : (
                /* Satellite Map Config */
                <div className="bg-brand-surface border border-slate-200 rounded-2xl p-4 space-y-3">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#1CBBBB]" />
                    {t("sections.satelliteRoofAnalysis")}
                  </h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.addressSearch")}</label>
                    <div className="flex gap-2">
                      <input type="text" aria-label={t("fields.addressSearch")} value={addressSearch} onChange={(e) => setAddressSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={t("placeholders.addressSearch")}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-[#1CBBBB] rounded-xl px-3 py-2.5 outline-none" />
                      <button type="button" onClick={handleSearch}
                        className="px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer transition-colors">{t("actions.search")}</button>
                    </div>
                  </div>
                  <ul className="text-xs text-slate-500 font-semibold space-y-1.5 list-disc pl-4 leading-relaxed">
                    <li>{t("mapInstructions.search")}</li>
                    <li>{t("mapInstructions.polygon")}</li>
                    <li>{t("mapInstructions.area")}</li>
                  </ul>
                  <button type="button" onClick={runAiAnalysis} disabled={isAiAnalyzing}
                    className="w-full py-3 bg-gradient-to-r from-[#1CBBBB] to-[#159999] text-white rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60">
                    {isAiAnalyzing ? (
                      <>
                        <GsapSpinner className="w-3.5 h-3.5" />
                        <span>{t("ai.sizing")}</span>
                      </>
                    ) : (
                      <>
                        <GsapPulse scale={1.08}>
                          <Sparkles className="w-3.5 h-3.5" />
                        </GsapPulse>
                        <span>{t("ai.analyzeRoof")}</span>
                      </>
                    )}
                  </button>
                  {(drawnArea !== null || aiAnalysisResult !== null) && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                      <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("sections.roofSizingResult")}</h4>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {drawnArea !== null && (
                          <div className="bg-brand-surface p-2.5 border border-slate-200 rounded-xl col-span-2">
                            <span className="text-[8px] font-black uppercase text-slate-400 block">{t("ai.manualPolygonArea")}</span>
                            <span className="text-sm font-black text-slate-900 font-mono">{t("units.squareMeters", { value: drawnArea })}</span>
                          </div>
                        )}
                        {aiAnalysisResult && (
                          <>
                            <div className="bg-brand-surface p-2.5 border border-slate-200 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-[#1CBBBB] block">{t("ai.area")}</span>
                              <span className="text-sm font-black text-[#1CBBBB] font-mono">{t("units.squareMeters", { value: aiAnalysisResult.area })}</span>
                            </div>
                            <div className="bg-brand-surface p-2.5 border border-slate-200 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-[#D8A87B] block">{t("ai.pitch")}</span>
                              <span className="text-sm font-black text-[#D8A87B] font-mono">{aiAnalysisResult.pitch}°</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ══ TAB 2: Shading & Sun ══ */}
          {activeTab === 'shading' && (
            <>
              {/* Sun Arc Visualization */}
              <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-4 overflow-hidden relative">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 pb-2.5 flex items-center gap-1.5">
                  <GsapPulse scale={1.08}>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                  </GsapPulse>
                  <span className="text-slate-300">{t("sections.sunArc")}</span>
                </h3>

                <VisxSunArc hour={shadingTimeHour} ariaLabel={t("sections.sunArc")} />

                {/* Status row */}
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm font-black font-mono text-amber-400">
                    {shadingTimeHour.toString().padStart(2, '0')}:00
                  </span>
                  <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                    shadingTimeHour === 12
                      ? 'bg-amber-500/20 border-amber-500/30 text-amber-400'
                      : shadingTimeHour >= 6 && shadingTimeHour <= 18
                        ? 'bg-slate-700/50 border-slate-600 text-slate-300'
                        : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}>
                    {shadingTimeHour < 9 ? t("timeOfDay.earlyMorning") : shadingTimeHour < 12 ? t("timeOfDay.morning") : shadingTimeHour === 12 ? t("timeOfDay.solarNoon") : shadingTimeHour < 15 ? t("timeOfDay.earlyAfternoon") : shadingTimeHour < 18 ? t("timeOfDay.afternoon") : t("timeOfDay.evening")}
                  </span>
                </div>
              </div>

              {/* Controls Card */}
              <div className="bg-brand-surface border border-slate-200 rounded-2xl p-4 space-y-5">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-orange-500" />
                  {t("sections.shadingControls")}
                </h3>

                {/* Time of Day Slider */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {t("fields.timeOfDay")}
                    </label>
                    <span className="text-sm font-black font-mono text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">
                      {shadingTimeHour.toString().padStart(2, '0')}:00
                    </span>
                  </div>
                  <input
                    id="shading-time-slider"
                    type="range"
                    min="6"
                    max="18"
                    step="1"
                    value={shadingTimeHour}
                    aria-label={t("fields.timeOfDay")}
                    onChange={(e) => setShadingTimeHour(Number(e.target.value))}
                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-orange-500 bg-slate-200"
                  />
                  <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 px-0.5">
                    <span>06:00<br />{t("timeLabels.morning")}</span>
                    <span className="text-center">12:00<br />{t("timeLabels.noon")}</span>
                    <span className="text-right">18:00<br />{t("timeLabels.evening")}</span>
                  </div>
                </div>

                {/* Month Selector */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      {t("fields.month")}
                    </label>
                    <span className="text-sm font-black font-mono text-orange-500 bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-lg">
                      {monthFormatter.format(new Date(2026, shadingMonth))}
                    </span>
                  </div>
                  <input
                    id="shading-month-slider"
                    type="range"
                    min="0"
                    max="11"
                    step="1"
                    value={shadingMonth}
                    aria-label={t("fields.month")}
                    onChange={(e) => setShadingMonth(Number(e.target.value))}
                    className="w-full h-2.5 rounded-full appearance-none cursor-pointer accent-orange-500 bg-slate-200"
                  />
                  {/* Month quick-select pill grid */}
                  <div className="grid grid-cols-6 gap-1 mt-1">
                    {Array.from({ length: 12 }, (_, i) => shortMonthFormatter.format(new Date(2026, i))).map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setShadingMonth(i)}
                        className={`text-[8px] font-black py-1.5 rounded-lg border transition-all cursor-pointer ${
                          shadingMonth === i
                            ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100 hover:text-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Context Info */}
                <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl">
                  <p className="text-[9px] font-bold text-amber-700 leading-relaxed">
                    <span className="font-black uppercase block mb-0.5">{t("help.title")}</span>
                    {t("help.shading")}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ══ TAB 3: Electrical ══ */}
          {activeTab === 'electrical' && (
            <div className="bg-brand-surface border border-slate-200 rounded-2xl p-4 space-y-3">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                {t("sections.electricalStringing")}
              </h3>
              <button onClick={() => setStringingModeActive(!stringingModeActive)}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${stringingModeActive ? "bg-amber-50 text-amber-600 border-amber-200 shadow-inner" : "bg-brand-surface text-slate-500 border-slate-200 hover:bg-slate-50"}`}>
                {stringingModeActive ? t("electrical.stringingOn") : t("electrical.stringingOff")}
              </button>
              {stringingModeActive && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setActiveStringId("string-a")}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border ${activeStringId === "string-a" ? "bg-indigo-500 text-white border-indigo-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {t("electrical.stringOneA")}
                  </button>
                  <button onClick={() => setActiveStringId("string-b")}
                    className={`py-2 rounded-lg text-[10px] font-black uppercase tracking-wider border ${activeStringId === "string-b" ? "bg-emerald-500 text-white border-emerald-600" : "bg-slate-50 text-slate-500 border-slate-200"}`}>
                    {t("electrical.stringOneB")}
                  </button>
                </div>
              )}
              <p className="text-[9px] text-amber-600 font-bold pt-1">
                <span className="font-black uppercase tracking-wider block">{t("electrical.maxVoltage")}</span>
                {t("help.stringing")}
              </p>
            </div>
          )}

          {/* ══ ALWAYS VISIBLE: Analytics Board ══ */}
          <div className="bg-brand-surface border border-slate-200 rounded-2xl p-4 space-y-3">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2.5">
              {t("sections.analyticsRoi")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("analytics.totalPanels")}</p>
                <p className="text-xl font-black text-slate-800 font-mono"><AnimatedNumber value={totalPanelsAll} /> <span className="text-[10px] text-slate-500">{t("units.panels")}</span></p>
              </div>
              <div className="p-3 bg-[#1CBBBB]/5 border border-[#1CBBBB]/10 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#1CBBBB]">{t("analytics.totalCapacity")}</p>
                <p className="text-xl font-black text-slate-800 font-mono"><AnimatedNumber value={totalPowerAll / 1000} decimals={2} /> <span className="text-[10px] text-slate-500">{t("units.kwp")}</span></p>
              </div>
              <div className="p-3 bg-[#1CBBBB]/5 border border-[#1CBBBB]/10 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#1CBBBB]">{t("analytics.monthlySavings")}</p>
                <p className="text-xl font-black text-[#1CBBBB] font-mono">{financialInputsReady ? <AnimatedNumber value={estimatedSavingsMonthly} formatter={(amount) => formatPrice(Math.round(amount))} /> : t("analytics.locked")}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("analytics.paybackPeriod")}</p>
                <p className="text-xl font-black text-[#D8A87B] font-mono">{financialInputsReady && paybackPeriodYears > 0 ? <AnimatedNumber value={paybackPeriodYears} decimals={1} suffix={` ${t("analytics.yearShort")}`} /> : t("analytics.notAvailable")}</p>
              </div>
              <div className="p-3 bg-brand-surface border border-slate-200 rounded-xl col-span-2 grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t("analytics.thailandPsh")}</p>
                  <p className="text-sm font-black text-slate-800 font-mono"><AnimatedNumber value={thailandYield.peakSunHours} decimals={2} suffix="h" /></p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t("analytics.qualityFactor")}</p>
                  <p className="text-sm font-black text-slate-800 font-mono"><AnimatedNumber value={thailandYield.performanceRatio * 100} suffix="%" /></p>
                </div>
                <div>
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">{t("analytics.annualYield")}</p>
                  <p className="text-sm font-black text-slate-800 font-mono"><AnimatedNumber value={thailandYield.annualKwh} suffix=" kWh" /></p>
                </div>
              </div>
              <div className="p-3 bg-brand-surface border border-slate-200 rounded-xl col-span-2">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t("analytics.panelMaterialEstimate")}</p>
                <p className="text-xl font-black text-slate-800 font-mono"><AnimatedNumber value={totalCostAll} formatter={(amount) => formatPrice(Math.round(amount))} /></p>
                <p className="text-[9px] text-slate-400 font-semibold mt-1">{t("analytics.materialEstimateNote")}</p>
              </div>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-500 font-semibold flex gap-2 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-[#1CBBBB] shrink-0 mt-0.5" />
              <span><strong className="text-slate-700 uppercase">{t("help.knowledgeLabel")}</strong> {t("help.multiRoof")}</span>
            </div>
            {!financialInputsReady && (
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl text-[10px] text-amber-700 font-bold leading-relaxed">
                {t("warnings.roiNeedsTariff")}
              </div>
            )}
          </div>

        </div>
        {/* End Tab Content */}
      </div>
      {/* End Left Column */}

      {/* ──── RIGHT COLUMN: Full-height Canvas ──── */}
      <div className="flex-1 h-full relative bg-slate-50 overflow-hidden">
        <InteractiveCursor label="Drag" className="w-full h-full">

        {plannerMode === '2d' ? (
          <div className="w-full h-full relative overflow-hidden">
            {/* Floating Header */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
              <div className="bg-brand-surface/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200/50 pointer-events-auto max-w-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-[#1CBBBB]" size={14} />
                  {t("canvas.multiRoofPlanner")}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{t("canvas.freeformPlacement")}</p>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-white bg-[#1CBBBB] px-3 py-1.5 rounded-full shadow-sm">{t("canvas.liveRenderer")}</span>
            </div>
            <SimulatorOverlay
              activeRoof={activeRoof}
              allRoofs={roofs}
              selectedProduct={selectedProduct}
              shadingMonth={shadingMonth}
              shadingTimeHour={shadingTimeHour}
              onPanelUpdate={(newPanels) => updateActiveRoof('panels', newPanels)}
              daytimeUsagePercent={daytimeUsagePercent}
              electricityRate={electricityRate}
              financialInputsReady={financialInputsReady}
              setbackMargin={setbackMargin}
            />
          </div>
        ) : (
          <div className="w-full h-full relative overflow-hidden flex flex-col">
            {/* Maps Header */}
            <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
              <div className="bg-brand-surface/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200/50 pointer-events-auto max-w-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#1CBBBB]" size={14} />
                  {t("canvas.satellitePlanner")}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{t("canvas.traceBoundary")}</p>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-white bg-[#1CBBBB] px-3 py-1.5 rounded-full shadow-sm pointer-events-auto">{t("actions.satelliteMode")}</span>
            </div>
            <div className="flex-1 w-full h-full relative z-0">
              <MapRoofSelector
                address={addressQuery}
                setbackMargin={setbackMargin}
                onPolygonCompleted={(data) => {
                  setRoofs(prev => prev.map(r => {
                    if (r.id !== activeRoofId) return r;
                    return {
                      ...r,
                      width: data.width,
                      height: data.height,
                      roofOrientation: data.orientationDegrees,
                      panelRotation: r.panelRotation ?? 0,
                      polygonPoints: data.polygonPoints,
                      setbackPolygonPoints: data.setbackPolygonPoints,
                      obstacles: data.obstacles,
                      selectedPanels: undefined
                    };
                  }));
                  setDrawnArea(data.area);
                }}
              />
            </div>
            {/* Bottom Action Bar */}
            <div className="absolute bottom-5 left-5 right-5 z-[400] bg-brand-surface/95 backdrop-blur-md border border-slate-200 shadow-xl rounded-2xl p-3.5 flex justify-between items-center pointer-events-auto">
              <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                <GsapPulse className="w-2.5 h-2.5 rounded-full bg-[#1CBBBB] shrink-0" scale={1.16}>
                  <span className="sr-only">{t("actions.ready")}</span>
                </GsapPulse>
                <span>{t("canvas.traceRoofBoundary")}</span>
              </div>
              <button type="button"
                onClick={() => { setIsGenerating(true); setTimeout(() => { setIsGenerating(false); setPlannerMode('2d'); }, 800); }}
                disabled={isGenerating}
                className="px-5 py-2.5 bg-[#1CBBBB] hover:bg-[#159999] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-80 disabled:cursor-not-allowed">
                {isGenerating ? (
                  <>
                    <GsapSpinner className="w-3.5 h-3.5" />
                    <span>{t("actions.processing")}</span>
                  </>
                ) : t("actions.generate2dRoofs")}
              </button>
            </div>
          </div>
        )}

        {/* Sidebar Toggle Button floating on the canvas */}
        <button
          type="button"
          onClick={() => setIsConfigOpen(!isConfigOpen)}
          title={isConfigOpen ? t("actions.hideSettings") : t("actions.showSettings")}
          className="absolute bottom-4 right-4 z-40 p-3 bg-[#B7D1EA] hover:bg-[#99bcdd] text-slate-900 rounded-full shadow-lg transition-all flex items-center justify-center pointer-events-auto"
        >
          {isConfigOpen ? <ChevronLeft className="w-6 h-6" /> : <ChevronRight className="w-6 h-6" />}
        </button>
        </InteractiveCursor>
      </div>
      {/* End Right Column */}

      {/* Responsive Lock Shield over Cloud Dancer backdrop */}
      <div className="fixed inset-0 z-[9999] hidden flex-col items-center justify-center bg-[#F0EEE9] p-6 text-center portrait:flex landscape:hidden lg:hidden">
        <GsapPulse className="w-20 h-20 bg-[#B7D1EA]/30 rounded-3xl flex items-center justify-center mb-6">
          <GsapSpinner className="w-10 h-10 text-slate-800" />
        </GsapPulse>
        <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-wider">{t("orientationLock.title")}</h2>
        <p className="text-xs font-black text-slate-500 max-w-sm leading-relaxed uppercase tracking-wider">
          {t("orientationLock.description")}
        </p>
      </div>

    </div>
    </div>
  );
}
