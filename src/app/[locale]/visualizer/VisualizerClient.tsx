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
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
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
import styles from "./visualizer.module.css";

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
    <div className="relative w-full rounded-xl border border-slate-200 bg-slate-50 p-3 pt-5 overflow-hidden select-none">
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
                  "w-[1px] bg-slate-300 transition-colors",
                  isMajor ? "h-4 bg-slate-400" : isMedium ? "h-3" : "h-1.5",
                  Math.abs(value - tick) < 7.5 ? "bg-[#315B7C]" : ""
                )}
              />
              {/* Label */}
              {label && (
                <span className={cn(
                  "text-[8px] font-black absolute -top-4 font-mono transition-colors",
                  isMajor ? "text-slate-700" : "text-slate-600",
                  Math.abs(value - tick) < 7.5 ? "text-[#315B7C]" : ""
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
          className="w-full h-1 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#315B7C] focus:outline-none"
        />
      </div>
      
      {/* Current Degree display */}
      <div className="absolute top-1.5 right-3 text-[9px] font-black font-mono text-[#315B7C]">
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
    const address = addressSearch.trim();
    if (!address) {
      toast.error(t("toast.addressRequired"));
      return;
    }

    setIsAiAnalyzing(true);
    setAiAnalysisResult(null);
    try {
      const response = await fetch("/api/analyze-roof", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, bounds: null })
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
    selectedProduct?.power ?? 0,
    daytimeUsagePercent,
    electricityRate,
  );
  const totalPanelsAll = aggregateData.totalPanels;
  const totalPowerAll  = aggregateData.totalKwp * 1000; // in W for display
  const totalCostAll   = totalPanelsAll * (selectedProduct?.price ?? 0);

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

  if (!selectedProduct) {
    return (
      <div id="visualizer-shell" className={styles.shell}>
        <header className={styles.header}>
          <Link href={`/${locale}`} className={styles.brandLink}>
            <span className={styles.brandMark} aria-hidden="true">
              <Sun className="h-5 w-5" />
            </span>
            <span className={styles.brandText}>{t("header.title")}</span>
          </Link>
          <Button asChild variant="outline" className={styles.headerAction}>
            <Link href={`/${locale}`}>{t("actions.home")}</Link>
          </Button>
        </header>

        <div className={styles.emptyMain}>
          <section className={styles.emptyCard} aria-labelledby="visualizer-empty-title">
            <div className={styles.emptyIcon} aria-hidden="true">
              <Sun className="h-7 w-7" />
            </div>
            <p className={styles.eyebrow}>{t("sections.plannerBadge")}</p>
            <h1 id="visualizer-empty-title" className={styles.emptyTitle}>{t("empty.catalogTitle")}</h1>
            <p className={styles.emptyDescription}>{t("empty.catalogDescription")}</p>
            <p className={styles.emptyStatus} role="status">{t("empty.catalogStatus")}</p>
            <div className={styles.emptyActions}>
              <Button asChild variant="outline" className={styles.primaryAction}>
                <Link href={`/${locale}/wizard`}>{t("empty.startSizing")}</Link>
              </Button>
              <Button asChild variant="outline" className={styles.secondaryAction}>
                <Link href={`/${locale}`}>{t("actions.home")}</Link>
              </Button>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div id="visualizer-shell" className={styles.shell}>
      <header className={styles.header}>
        <Link href={`/${locale}`} className={styles.brandLink}>
          <span className={styles.brandMark} aria-hidden="true">
            <Cpu className="h-5 w-5" />
          </span>
          <span className={styles.brandCopy}>
            <h1 className={styles.brandText}>{t("header.title")}</h1>
            <span className={styles.brandSubtitle}>{t("header.subtitle")}</span>
          </span>
        </Link>

        <div className={styles.headerMeta}>
          <span className={styles.metaLabel}>{t("header.editing")}</span>
          <span className={styles.metaValue}>{activeRoof?.name || ""}</span>
          <span className={styles.metaDivider} aria-hidden="true" />
          <span className={styles.metaLabel}>{t("header.area")}</span>
          <span className={styles.metaValue}>
            {t("units.metersSize", { width: activeRoof?.width ?? 0, height: activeRoof?.height ?? 0 })}
          </span>
        </div>

        <nav className={styles.headerActions} aria-label={t("header.navigationLabel")}>
          <Button asChild variant="outline" className={styles.headerAction}>
            <Link href={`/${locale}`}>{t("actions.home")}</Link>
          </Button>
          <Button asChild variant="outline" className={styles.primaryAction}>
            <Link href={`/${locale}/build`}>{t("actions.backToBuild")}</Link>
          </Button>
        </nav>
      </header>

      <div className={styles.workspace}>

      <aside id="visualizer-settings" aria-labelledby="visualizer-settings-heading" className={styles.settings}>

        {/* Sticky Tab Header */}
        <div className={styles.settingsHeader}>
          <div className="flex items-center justify-between">
            <h2 id="visualizer-settings-heading" className="text-xs font-black uppercase tracking-widest text-slate-700">{t("sections.configuration")}</h2>
            <span className="text-[8px] font-black uppercase tracking-widest text-[#315B7C] border border-[#315B7C]/30 bg-[#315B7C]/5 px-2 py-0.5 rounded">{t("sections.plannerBadge")}</span>
          </div>
          <div className={styles.tabs} role="tablist" aria-label={t("tabs.label")}>
            {([
              { key: 'roof', label: t("tabs.roof") },
              { key: 'shading', label: t("tabs.shading") },
              { key: 'electrical', label: t("tabs.electrical") },
            ] as { key: 'roof' | 'shading' | 'electrical'; label: string }[]).map(tab => (
              <button key={tab.key} id={`visualizer-tab-${tab.key}`} type="button"
                onClick={() => setActiveTab(tab.key)}
                onKeyDown={(event) => {
                  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
                  event.preventDefault();
                  const tabs = Array.from(event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]') ?? []);
                  const currentIndex = tabs.indexOf(event.currentTarget);
                  const direction = event.key === "ArrowRight" ? 1 : -1;
                  const nextTab = tabs[(currentIndex + direction + tabs.length) % tabs.length];
                  if (!nextTab) return;
                  const nextKey = nextTab.id.replace("visualizer-tab-", "") as "roof" | "shading" | "electrical";
                  setActiveTab(nextKey);
                  nextTab.focus();
                }}
                role="tab"
                aria-selected={activeTab === tab.key}
                aria-controls="visualizer-panel"
                tabIndex={activeTab === tab.key ? 0 : -1}
                className={`pb-3 text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${activeTab === tab.key ? 'border-[#315B7C] text-[#315B7C]' : 'border-transparent text-slate-600 hover:text-slate-800'}`}
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
        <div id="visualizer-panel" role="tabpanel" aria-labelledby={`visualizer-tab-${activeTab}`} tabIndex={0} className="py-5 space-y-6 flex-1 outline-none">

          {/* ══ TAB 1: Roof & Sizing ══ */}
          {activeTab === 'roof' && (
            <>
              {/* Mode Toggle */}
              <div className="flex rounded-xl overflow-hidden border border-slate-200 bg-slate-50 mb-6">
                <button type="button" aria-pressed={plannerMode === '2d'} onClick={() => setPlannerMode('2d')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest text-center transition-all ${plannerMode === '2d' ? 'bg-white text-slate-900 shadow-sm border border-slate-100 rounded-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                  2D Canvas
                </button>
                <button type="button" aria-pressed={plannerMode === 'maps'} onClick={() => setPlannerMode('maps')}
                  className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${plannerMode === 'maps' ? 'bg-white text-[#315B7C] shadow-sm border border-slate-100 rounded-lg' : 'text-slate-500 hover:text-slate-700'}`}>
                  <Layers className="w-3 h-3" /><span>{t("actions.satelliteMode")}</span>
                </button>
              </div>

              {/* Main Inputs Card */}
              {plannerMode === '2d' ? (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-100 pb-2.5 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-[#315B7C]" />
                    {t("sections.inputs")}
                  </h3>

                  {/* Product Selection */}
                  <div className="space-y-1.5">
                    <label htmlFor="visualizer-panel-product" className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between">
                      <span>{t("fields.product")}</span>
                      <span className="text-[#315B7C] lowercase">{t("fields.specifications")}</span>
                    </label>
                    <select id="visualizer-panel-product" aria-label={t("fields.product")} value={selectedProductId} onChange={(e) => {
                      const nextProductId = e.target.value;
                      setSelectedProductId(nextProductId);
                    }}
                      className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-[#315B7C] rounded-xl px-3 py-2.5 outline-none transition-all cursor-pointer">
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
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#315B7C]" />
                        <span className="text-xs font-black text-slate-900 font-mono w-8 text-right shrink-0">
                          {activeRoof?.panelRotation ?? 0}°
                        </span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.quantity")}</span>
                      <div className="flex items-center gap-2">
                        <button type="button" aria-label={t("actions.removePanel")} onClick={(e) => {
                          e.stopPropagation();
                          const p = activeRoof?.panels || [];
                          if (p.length > 0)
                            updateActiveRoof("panels", p.slice(0, -1));
                        }}
                          className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-lg">−</button>
                        <output role="status" aria-live="polite" aria-label={t("fields.quantity")} className="w-10 text-center text-sm font-black text-slate-900 font-mono">
                          {activeRoof?.panels?.length ?? 0}
                        </output>
                        <button type="button" aria-label={t("actions.addPanel")} onClick={(e) => {
                          e.stopPropagation();
                          const p = activeRoof?.panels || [];
                          updateActiveRoof("panels", [...p, { id: `p-${Date.now()}`, x: 0, y: 0, rotation: 0 }]);
                        }}
                          className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-surface border border-slate-200 font-bold text-slate-700 hover:bg-slate-100 cursor-pointer text-lg">+</button>
                      </div>
                    </div>
                  </div>

                  {/* Roof Tabs */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between">
                      <span>{t("fields.selectRoof")}</span>
                      <span className="text-[#315B7C] lowercase">{t("fields.tabsLabel")}</span>
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {roofs.map(r => (
                        <div key={r.id} className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-0.5">
                          <button type="button" aria-pressed={r.id === activeRoofId} onClick={() => setActiveRoofId(r.id)}
                            className={cn("min-h-11 rounded-lg px-3 text-[10px] font-black uppercase tracking-wider transition-all",
                              r.id === activeRoofId ? cn(styles.selectedOption, "shadow-sm") : "text-slate-600 hover:bg-slate-50")}>
                            {r.name}
                          </button>
                          {roofs.length > 1 && (
                            <button type="button" aria-label={locale === "th" ? `ลบ${r.name}` : `Delete ${r.name}`} onClick={(e) => { e.stopPropagation(); handleDeleteRoof(r.id); }}
                              className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-rose-50 hover:text-rose-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-rose-600">
                              <Trash2 className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button type="button" onClick={handleAddRoof}
                        className="min-h-11 px-3 rounded-xl text-[10px] font-black uppercase tracking-wider border border-dashed border-slate-500 text-slate-800 bg-white hover:bg-slate-100 cursor-pointer flex items-center gap-1">
                        <Plus className="w-3 h-3" /><span>{t("actions.addRoof")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Roof Name Editor */}
                  <div className="pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/60 rounded-xl px-3 py-2 focus-within:border-[#315B7C] group/title">
                      <input type="text" aria-label={t("placeholders.roofName")} value={activeRoof.name}
                        onChange={(e) => updateRoofName(activeRoof.id, e.target.value)}
                        className="w-full text-sm font-bold text-slate-900 bg-transparent border-none outline-none"
                        placeholder={t("placeholders.roofName")} />
                      <Edit3 className="w-4 h-4 text-slate-400 group-hover/title:text-[#315B7C]" />
                    </div>
                  </div>

                  {/* Dimensions */}
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.width")} <span className="text-[#315B7C] font-mono">{t("units.meters", { value: activeRoof.width })}</span></label>
                      <input type="range" min="4" max="30" step="0.5" aria-label={t("fields.width")} value={activeRoof.width} onChange={(e) => updateActiveRoof('width', Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#315B7C]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.length")} <span className="text-[#315B7C] font-mono">{t("units.meters", { value: activeRoof.height })}</span></label>
                      <input type="range" min="3" max="20" step="0.5" aria-label={t("fields.length")} value={activeRoof.height} onChange={(e) => updateActiveRoof('height', Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#315B7C]" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.pitch")} <span className="text-[#8A5731] font-mono">{activeRoof.pitch}°</span></label>
                      <input type="range" min="0" max="45" step="1" aria-label={t("fields.pitch")} value={activeRoof.pitch} onChange={(e) => updateActiveRoof('pitch', Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#D8A87B]" />
                    </div>
                    <div className="space-y-1.5 col-span-2">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.roofAzimuth")} <span className="text-[#8A5731] font-mono">{activeRoof.roofOrientation}°</span></label>
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
                        aria-pressed={(activeRoof.roofType ?? 'concrete') === 'concrete'}
                        onClick={() => updateActiveRoof('roofType', 'concrete')}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                          (activeRoof.roofType ?? 'concrete') === 'concrete'
                            ? cn(styles.selectedOption, "shadow-sm")
                            : "bg-brand-surface text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{t("roofTypes.concrete")}</span>
                      </button>
                      <button
                        type="button"
                        aria-pressed={activeRoof.roofType === 'metal'}
                        onClick={() => updateActiveRoof('roofType', 'metal')}
                        className={cn(
                          "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center justify-center gap-1 cursor-pointer",
                          activeRoof.roofType === 'metal'
                            ? cn(styles.selectedOption, "shadow-sm")
                            : "bg-brand-surface text-slate-700 border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <span>{t("roofTypes.metal")}</span>
                      </button>
                    </div>
                  </div>

                  {/* Setback */}
                  <div className="space-y-1 pt-2 border-t border-slate-100">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex justify-between">
                      <span>{t("fields.setback")}</span>
                      <span className="text-[#315B7C] font-mono">{t("units.meters", { value: setbackMargin })}</span>
                    </label>
                    <input type="range" min="0" max="2" step="0.1" aria-label={t("fields.setback")} value={setbackMargin} onChange={(e) => setSetbackMargin(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#315B7C]" />
                  </div>

                  {/* Meter & Phase */}
                  <div className="pt-2 border-t border-slate-100 space-y-3">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.meterType")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['NORMAL', 'TOU'] as const).map(m => (
                        <button key={m} type="button" aria-pressed={meterType === m} onClick={() => setMeterType(m)}
                          className={cn("min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-wider border transition-all", meterType === m ? styles.selectedOption : "bg-brand-surface text-slate-700 border-slate-200 hover:bg-slate-50")}>
                          {m === 'NORMAL' ? t("meter.normal") : t("meter.tou")}
                        </button>
                      ))}
                    </div>
                    
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">{t("fields.electricalPhase")}</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['1-Phase', '3-Phase'] as const).map(ph => (
                        <button key={ph} type="button" aria-pressed={electricalPhase === ph} onClick={() => setElectricalPhase(ph)}
                          className={cn("min-h-11 rounded-xl px-3 text-[10px] font-black uppercase tracking-wider border transition-all flex flex-col items-center justify-center", electricalPhase === ph ? (ph === '1-Phase' ? "bg-slate-900 text-white border-slate-900" : styles.selectedOption) : "bg-brand-surface text-slate-700 border-slate-200 hover:bg-slate-50")}>
                          <span>{ph === '1-Phase' ? '1 Phase (220V)' : '3 Phase (380V)'}</span>
                          <span className="text-[8px]">{ph === '1-Phase' ? t("phase.oneHint") : t("phase.threeHint")}</span>
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
                        <span className="text-[#315B7C] font-mono">{daytimeUsagePercent}%</span>
                      </div>
                      <input type="range" min="10" max="100" step="5" aria-label={t("fields.daytimeUsage")} value={daytimeUsagePercent} onChange={(e) => setDaytimeUsagePercent(Number(e.target.value))}
                        className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#315B7C]" />
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
                    <Compass className="w-3.5 h-3.5 text-[#315B7C]" />
                    {t("sections.satelliteRoofAnalysis")}
                  </h3>
                  <div className="space-y-2">
                    <label htmlFor="visualizer-address-search" className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("fields.addressSearch")}</label>
                    <div className="flex gap-2">
                      <input id="visualizer-address-search" type="text" value={addressSearch} onChange={(e) => setAddressSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder={t("placeholders.addressSearch")}
                        className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 focus:border-[#315B7C] rounded-xl px-3 py-2.5 outline-none" />
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
                    className={cn("w-full min-h-11 rounded-xl py-3 text-[10px] font-black uppercase tracking-widest cursor-pointer flex items-center justify-center gap-2 transition-colors disabled:opacity-60", styles.primaryCanvasAction)}>
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
                              <span className="text-[8px] font-black uppercase text-[#315B7C] block">{t("ai.area")}</span>
                              <span className="text-sm font-black text-[#315B7C] font-mono">{t("units.squareMeters", { value: aiAnalysisResult.area })}</span>
                            </div>
                            <div className="bg-brand-surface p-2.5 border border-slate-200 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-[#8A5731] block">{t("ai.pitch")}</span>
                              <span className="text-sm font-black text-[#8A5731] font-mono">{aiAnalysisResult.pitch}°</span>
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
          <div className={cn("bg-brand-surface border border-slate-200 rounded-2xl p-4 space-y-3", styles.summaryCard)}>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-600 border-b border-slate-100 pb-2.5">
              {t("sections.analyticsRoi")}
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t("analytics.totalPanels")}</p>
                <p className="text-xl font-black text-slate-800 font-mono"><AnimatedNumber value={totalPanelsAll} /> <span className="text-[10px] text-slate-700">{t("units.panels")}</span></p>
              </div>
              <div className="p-3 bg-[#315B7C]/5 border border-[#315B7C]/10 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#315B7C]">{t("analytics.totalCapacity")}</p>
                <p className="text-xl font-black text-slate-800 font-mono"><AnimatedNumber value={totalPowerAll / 1000} decimals={2} /> <span className="text-[10px] text-slate-700">{t("units.kwp")}</span></p>
              </div>
              <div className="p-3 bg-[#315B7C]/5 border border-[#315B7C]/10 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-[#315B7C]">{t("analytics.monthlySavings")}</p>
                <p className="text-xl font-black text-[#315B7C] font-mono">{financialInputsReady ? <AnimatedNumber value={estimatedSavingsMonthly} formatter={(amount) => formatPrice(Math.round(amount))} /> : t("analytics.locked")}</p>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-600">{t("analytics.paybackPeriod")}</p>
                <p className="text-xl font-black text-[#8A5731] font-mono">{financialInputsReady && paybackPeriodYears > 0 ? <AnimatedNumber value={paybackPeriodYears} decimals={1} suffix={` ${t("analytics.yearShort")}`} /> : t("analytics.notAvailable")}</p>
              </div>
              <details className="col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-white">
                <summary className="flex min-h-11 cursor-pointer items-center px-3 text-xs font-bold text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#315B7C]">
                  {t("analytics.moreDetails")}
                </summary>
                <div className="grid grid-cols-3 gap-2 border-t border-slate-100 p-3">
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t("analytics.thailandPsh")}</p>
                    <p className="text-sm font-black text-slate-800 font-mono"><AnimatedNumber value={thailandYield.peakSunHours} decimals={2} suffix="h" /></p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t("analytics.qualityFactor")}</p>
                    <p className="text-sm font-black text-slate-800 font-mono"><AnimatedNumber value={thailandYield.performanceRatio * 100} suffix="%" /></p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-500">{t("analytics.annualYield")}</p>
                    <p className="text-sm font-black text-slate-800 font-mono"><AnimatedNumber value={thailandYield.annualKwh} suffix=" kWh" /></p>
                  </div>
                  <div className="col-span-3 border-t border-slate-100 pt-2">
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t("analytics.panelMaterialEstimate")}</p>
                    <p className="text-lg font-black text-slate-800 font-mono"><AnimatedNumber value={totalCostAll} formatter={(amount) => formatPrice(Math.round(amount))} /></p>
                    <p className="text-[9px] text-slate-500 font-semibold mt-1">{t("analytics.materialEstimateNote")}</p>
                  </div>
                </div>
              </details>
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-[10px] text-slate-500 font-semibold flex gap-2 leading-relaxed">
              <Info className="w-3.5 h-3.5 text-[#315B7C] shrink-0 mt-0.5" />
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
      </aside>

      <section className={styles.canvas} aria-label={plannerMode === "2d" ? t("canvas.multiRoofPlanner") : t("canvas.satellitePlanner")}>
        <InteractiveCursor label={t("canvas.dragPanels")} className="w-full h-full">

        {plannerMode === '2d' ? (
          <div className="w-full h-full relative overflow-hidden">
            {/* Floating Header */}
            <div className="absolute top-4 left-4 right-4 z-10 flex justify-between items-start pointer-events-none">
              <div className="bg-brand-surface/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200/50 pointer-events-auto max-w-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-[#315B7C]" size={14} />
                  {t("canvas.multiRoofPlanner")}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{t("canvas.freeformPlacement")}</p>
              </div>
            </div>
            <SimulatorOverlay
              activeRoof={activeRoof}
              selectedProduct={selectedProduct}
              shadingMonth={shadingMonth}
              shadingTimeHour={shadingTimeHour}
              onPanelUpdate={(newPanels) => updateActiveRoof('panels', newPanels)}
              setbackMargin={setbackMargin}
            />
          </div>
        ) : (
          <div className="w-full h-full relative overflow-hidden flex flex-col">
            {/* Maps Header */}
            <div className="absolute top-4 left-4 right-4 z-[400] flex justify-between items-start pointer-events-none">
              <div className="bg-brand-surface/80 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-slate-200/50 pointer-events-auto max-w-xs">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#315B7C]" size={14} />
                  {t("canvas.satellitePlanner")}
                </h3>
                <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">{t("canvas.traceBoundary")}</p>
              </div>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-900 bg-[#B7D1EA] px-3 py-1.5 rounded-full shadow-sm pointer-events-auto">{t("actions.satelliteMode")}</span>
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
                <GsapPulse className="w-2.5 h-2.5 rounded-full bg-[#315B7C] shrink-0" scale={1.16}>
                  <span className="sr-only">{t("actions.ready")}</span>
                </GsapPulse>
                <span>{t("canvas.traceRoofBoundary")}</span>
              </div>
              <button type="button"
                onClick={() => { setIsGenerating(true); setTimeout(() => { setIsGenerating(false); setPlannerMode('2d'); }, 800); }}
                disabled={isGenerating}
                className={cn("min-h-11 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all active:scale-[0.98] flex items-center gap-1.5 disabled:opacity-80 disabled:cursor-not-allowed", styles.primaryCanvasAction)}>
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

        </InteractiveCursor>
      </section>
      </div>
    </div>
  );
}
