"use client";

import { cn } from "@/lib/utils";
import type { SolarAddonConfig } from "@/lib/solarAddonConfig";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import { useSourceTrackingStore } from "@/store/useSourceTrackingStore";
import GsapSlider from "@/components/ui/GsapSlider";
import { motion } from "framer-motion";
import {
  forwardRef,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  MapPin,
  ArrowRight,
  ChevronRight,
  Package,
  Layers,
  Zap,
  Leaf,
  Calendar,
  LogIn,
  Info,
  Download,
  Lock,
  Save,
  Sprout,
  Car,
  Check,
  Sparkles,
  ShieldCheck,
  Plus,
  BatteryCharging,
  Snowflake,
  Droplets,
  Wrench,
  Globe,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SolarCard from "@/components/ui/SolarCard";
import { SolarDepth } from "@/components/ui/solar-depth";
import { WizardSummarySidebar } from "@/components/wizard/WizardSummarySidebar";
import ProgressiveImage from "@/components/ui/progressive-image";
import { gsap } from "gsap";
import { generatePublicProductName } from "@/lib/productUtils";
import {
  getSolarAddonDefaultSelectionId,
  getSolarAddonsForDisplay,
  getSelectedSolarAddon,
  isSolarBatteryAddon,
  parseSolarAddonSelection,
  serializeSolarAddonSelection,
} from "@/lib/solarAddonSelection";
import {
  buildRecommendedBOM,
  deriveChartSpecsFromBOM,
  type RecommendCategory,
  type RecommendProduct,
  type RecommendedLineItem,
  type ProductOverrides,
} from "@/lib/wizardRecommendation";
import {
  getBatterySizingCalculation,
  getSolarSizingCalculation,
} from "@/lib/wizardRecommendationConfig";
import {
  calculateFinancialPlan,
  type FinancialsPayload,
} from "@/lib/financialPlan";
import {
  calculateSolarProfileEcoImpact,
  getSolarProfilePrice,
  SOLAR_PROFILES,
  type SolarProfileId,
} from "@/lib/solarProfiles";
import { CONTACT_FOR_PRICING_TEXT, normalizePhase } from "@/lib/pricing";
import { useLocale, useTranslations } from "next-intl";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { trackProductEvent } from "@/lib/productAnalytics";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { EnergyMetricCard } from "@/components/wizard/SummaryMetrics";
import { SolarDecisionCard } from "@/components/wizard/solar-decision-card";
import { SolarNextSteps } from "@/components/wizard/solar-next-steps";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import type { ServiceLocation } from "@/components/services/ServiceLocationPicker";
import type {
  WizardElectricityTariff as ElectricityTariffType,
  WizardInquiryPanelState as InquiryPanelState,
  WizardRoofFacing as RoofFacing,
  WizardRoofTilt as RoofTilt,
  WizardSummaryClientProps as SummaryClientProps,
  WizardSystemPackage as SystemPackage,
  WizardSystemPackageSize as SystemPackageSize,
} from "@/types/wizard";

const ServiceLocationPicker = dynamic(
  () => import("@/components/services/ServiceLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="solar-route-skeleton h-72 rounded-[1.25rem]" />
    ),
  },
);
const EnergyFlowChart = dynamic(() => import("@/components/EnergyFlowChart"), {
  loading: () => (
    <div className="solar-route-skeleton aspect-[16/9] w-full rounded-[1.25rem]" />
  ),
});
const SolarProfileSelectorSummary = dynamic(
  () => import("@/components/wizard/SolarProfileSelectorSummary"),
);
const SolarProfileFeatureGrid = dynamic(() =>
  import("@/components/wizard/SolarProfileSelectorSummary").then((module) => ({
    default: module.SolarProfileFeatureGrid,
  })),
);
const ProductDetailModal = dynamic(
  () => import("@/components/wizard/ProductDetailModal"),
);
import { submitDesignConsultationRequest } from "@/app/actions/lead";
import { createClient } from "@/utils/supabase/client";
import {
  bridgeEstimateDraft,
  cacheEstimateDraft,
  createEstimateDraftEnvelope,
  readEstimateDraft,
  removeEstimateDraft,
  type EstimateDraftIntent,
} from "@/lib/clientEstimateDraft";
import VisxCashFlowChart from "@/components/charts/VisxCashFlowChart";
type ProposalTier = SolarProfileId;

const PROPOSAL_TIERS = SOLAR_PROFILES;

const TARIFF_OPTIONS: Record<
  ElectricityTariffType,
  { labelKey: string; rateMultiplier: number; helperKey: string }
> = {
  flat: {
    labelKey: "tariff.flatLabel",
    rateMultiplier: 1,
    helperKey: "tariff.flatHelper",
  },
  tou: {
    labelKey: "tariff.touLabel",
    rateMultiplier: 1.12,
    helperKey: "tariff.touHelper",
  },
};

const ROOF_FACING_OPTIONS: Record<
  RoofFacing,
  { labelKey: string; degrees: number; multiplier: number }
> = {
  south: { labelKey: "roofFacing.south", degrees: 180, multiplier: 1.0 },
  east: { labelKey: "roofFacing.east", degrees: 90, multiplier: 0.85 },
  west: { labelKey: "roofFacing.west", degrees: 270, multiplier: 0.85 },
  north: { labelKey: "roofFacing.north", degrees: 0, multiplier: 0.6 },
};

const ROOF_TILT_OPTIONS: Record<
  RoofTilt,
  { labelKey: string; degrees: number; multiplier: number }
> = {
  tilt_10_15: { labelKey: "roofTilt.10_15", degrees: 12, multiplier: 1.0 },
  tilt_30: { labelKey: "roofTilt.30", degrees: 30, multiplier: 0.92 },
  tilt_45: { labelKey: "roofTilt.45", degrees: 45, multiplier: 0.8 },
};

const SUMMARY_EXPORT_KEY = "solardream:wizard-summary-export";
const STANDARD_SOLAR_SIZE_OPTIONS = [3, 5, 10, 15, 20] as const;
const BASE_PEAK_SUN_HOURS = 4.2;
const PANEL_ANNUAL_DEGRADATION_RATE = 0.005;

const SYSTEM_PACKAGES: Record<SystemPackageSize, SystemPackage> = {
  3: {
    sizeKwp: 3,
    packageId: "SD-PKG-3KW",
    label: "SolarDream 3kW Starter Package",
    standardPrice: 165000,
    contents: [
      {
        title: "Approx. 6-7 Tier-1 Monocrystalline Panels",
        description:
          "High-efficiency panel set sized for compact residential daytime usage.",
      },
      {
        title: "1x 3kW Certified Grid-Tie Inverter",
        description:
          "Standard on-grid inverter profile prepared for engineering validation.",
      },
      {
        title: "Custom Roof Mounting Kit",
        description:
          "Rail, clamps, waterproofing accessories, and installation hardware.",
      },
    ],
  },
  5: {
    sizeKwp: 5,
    packageId: "SD-PKG-5KW",
    label: "SolarDream 5kW Balanced Package",
    standardPrice: 245000,
    contents: [
      {
        title: "Approx. 10-12 Tier-1 Monocrystalline Panels",
        description:
          "Balanced residential panel set for common Thai home consumption patterns.",
      },
      {
        title: "1x 5kW Grid-Tie or Hybrid-Ready Inverter",
        description:
          "Final inverter architecture confirmed by the selected system goal.",
      },
      {
        title: "Custom Roof Mounting Kit",
        description:
          "Structure and electrical installation accessories prepared as a package BOM.",
      },
    ],
  },
  10: {
    sizeKwp: 10,
    packageId: "SD-PKG-10KW",
    label: "SolarDream 10kW Family Package",
    standardPrice: 465000,
    contents: [
      {
        title: "Approx. 19-23 Tier-1 Monocrystalline Panels",
        description:
          "Larger roof coverage profile for high daytime usage or multi-zone homes.",
      },
      {
        title: "1x 10kW Certified Inverter Platform",
        description:
          "On-grid or hybrid-ready inverter package, subject to site phase review.",
      },
      {
        title: "Expanded Roof Mounting Kit",
        description:
          "Mounting, protection, and balance-of-system material package.",
      },
    ],
  },
  15: {
    sizeKwp: 15,
    packageId: "SD-PKG-15KW",
    label: "SolarDream 15kW Estate Package",
    standardPrice: 680000,
    contents: [
      {
        title: "Approx. 28-34 Tier-1 Monocrystalline Panels",
        description:
          "High-output panel package for large homes, pool systems, or EV readiness.",
      },
      {
        title: "15kW Inverter Architecture",
        description:
          "Certified inverter stack designed during engineering review.",
      },
      {
        title: "Reinforced Mounting and Protection Kit",
        description:
          "Roof structure, protection devices, cable routing, and installation hardware.",
      },
    ],
  },
  20: {
    sizeKwp: 20,
    packageId: "SD-PKG-20KW",
    label: "SolarDream 20kW Signature Package",
    standardPrice: 890000,
    contents: [
      {
        title: "Approx. 37-45 Tier-1 Monocrystalline Panels",
        description:
          "Maximum residential planning package for villas or heavy daytime loads.",
      },
      {
        title: "20kW Inverter Architecture",
        description:
          "Certified inverter platform prepared for phase and load balancing review.",
      },
      {
        title: "Premium Mounting and BOS Kit",
        description:
          "Complete package BOM for warehouse explosion after ERPNext quotation.",
      },
    ],
  },
};

function getSystemPackageForSize(sizeKwp: number): SystemPackage {
  const nearestSize = STANDARD_SOLAR_SIZE_OPTIONS.reduce<SystemPackageSize>(
    (closest, size) => {
      const currentDistance = Math.abs(sizeKwp - size);
      const closestDistance = Math.abs(sizeKwp - closest);
      return currentDistance < closestDistance ? size : closest;
    },
    5,
  );
  return SYSTEM_PACKAGES[nearestSize];
}

export default function SummaryClient({
  categories,
  recommendationConfig,
  optionScoringMap,
  recommendationRules,
  financingOptions,
  buildConfig,
}: SummaryClientProps) {
  const t = useTranslations("WizardSummary");
  const locale = useLocale();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const intlLocale = locale === "en" ? "en-US" : "th-TH";
  const { wizardAnswers, updateDynamicState } = useConfiguratorStore();
  const { user: authUser, loading: authLoading } = useSupabaseUser();
  const [mounted, setMounted] = useState(false);
  const [productOverrides, setProductOverrides] = useState<ProductOverrides>(
    {},
  );
  const [detailProduct, setDetailProduct] = useState<RecommendProduct | null>(
    null,
  );
  const [swapLine, setSwapLine] = useState<RecommendedLineItem | null>(null);
  const [selectedAddonIds, setSelectedAddonIds] = useState<string[]>(() =>
    parseSolarAddonSelection(wizardAnswers.smartAddOns),
  );
  const [selectedFinancingId, setSelectedFinancingId] = useState<string | null>(
    null,
  );
  const [downPaymentPct, setDownPaymentPct] = useState<number>(10);
  const [loanTermMonths, setLoanTermMonths] = useState<number>(60);

  // Custom states for manual size simulator and tabbed financial table.
  const [isManualSize, setIsManualSize] = useState(false);
  const [manualSolarKwp, setManualSolarKwp] = useState<number>(5.0);
  const [activeDashboardTab, setActiveDashboardTab] = useState<
    "package" | "energy" | "financial" | "impact"
  >("package");
  const [selectedTier, setSelectedTier] = useState<ProposalTier>("balanced");
  const [inquiryPanelState, setInquiryPanelState] =
    useState<InquiryPanelState>("impact-only");
  const [formFocusPulse, setFormFocusPulse] = useState(false);
  const [showChartInfo, setShowChartInfo] = useState(false);
  const [consultationFeedback, setConsultationFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [registrationIntent, setRegistrationIntent] =
    useState<EstimateDraftIntent | null>(null);
  const [registrationSubmitting, setRegistrationSubmitting] = useState(false);
  const [saveSubmitting, setSaveSubmitting] = useState(false);
  const [reportDownloading, setReportDownloading] = useState(false);
  const [guestAccountOptIn, setGuestAccountOptIn] = useState(true);
  const [guestProposalSuccess, setGuestProposalSuccess] = useState(false);
  const summaryRootRef = useRef<HTMLDivElement | null>(null);
  const pendingDraftHandledRef = useRef(false);
  const proposalFormRef = useRef<HTMLFormElement | null>(null);
  const inquiryPanelRef = useRef<HTMLDivElement | null>(null);

  const [restoredSummary, setRestoredSummary] = useState(false);
  const [hasInitializedBattery, setHasInitializedBattery] = useState(false);

  const activeAddonsCatalog = useMemo(() => {
    return getSolarAddonsForDisplay(buildConfig?.smartAddons);
  }, [buildConfig?.smartAddons]);

  useEffect(() => {
    const serializedSelection = serializeSolarAddonSelection(selectedAddonIds);
    if (wizardAnswers.smartAddOns !== serializedSelection) {
      updateDynamicState("smartAddOns", serializedSelection);
    }
  }, [selectedAddonIds, updateDynamicState, wizardAnswers.smartAddOns]);

  const batterySizes = useMemo(() => {
    const batteryAddon = activeAddonsCatalog.find(
      (a) => a.category === "BATTERY" || a.id.includes("battery"),
    );
    if (batteryAddon?.optionsList && batteryAddon.optionsList.length > 0) {
      return batteryAddon.optionsList.map((opt) => ({
        id: opt.id,
        label: opt.label.split(" ")[0] || opt.id,
        name: opt.label,
        price: opt.price,
      }));
    }
    return [
      { id: "battery5k", label: "5kWh", name: "Battery 5kWh", price: 65000 },
      {
        id: "battery10k",
        label: "10kWh",
        name: "Battery 10kWh",
        price: 115000,
      },
      {
        id: "battery16k",
        label: "16kWh",
        name: "Battery 16kWh",
        price: 175000,
      },
    ];
  }, [activeAddonsCatalog]);

  const hasZeroExportAddon = selectedAddonIds.some(
    (id) =>
      id.includes("zeroexport") ||
      id.includes("export") ||
      id.includes("meter"),
  );
  const hasEvChargerAddon = selectedAddonIds.some(
    (id) => id.includes("evcharger") || id.includes("ev"),
  );
  const batteryOptionIds = useMemo(
    () => new Set(batterySizes.map((b) => b.id)),
    [batterySizes],
  );
  const selectedBatteryAddonId = selectedAddonIds.find(
    (id) => batteryOptionIds.has(id) || id.startsWith("battery"),
  );
  const selectedBatteryObj = batterySizes.find((b) =>
    selectedAddonIds.includes(b.id),
  );
  const selectedBatteryKwh = selectedBatteryObj
    ? Number(selectedBatteryObj.label.replace(/[^\d]/g, "")) ||
      Number(selectedBatteryObj.name.replace(/[^\d]/g, "")) ||
      5
    : selectedBatteryAddonId
      ? Number(selectedBatteryAddonId.replace(/[^\d]/g, "")) || 5
      : 0;
  const [consultationName, setConsultationName] = useState("");
  const [consultationEmail, setConsultationEmail] = useState("");
  const [consultationPhone, setConsultationPhone] = useState("");
  const [consultationTaxId, setConsultationTaxId] = useState("");
  const [consultationPostalCode, setConsultationPostalCode] = useState("");
  const [consultationLocation, setConsultationLocation] =
    useState<ServiceLocation | null>(null);
  const [consultationLocationOpen, setConsultationLocationOpen] =
    useState(false);
  const [consultationDateTime, setConsultationDateTime] = useState("");
  const [consultationRemarks, setConsultationRemarks] = useState("");
  const [consultationSubmitting, setConsultationSubmitting] = useState(false);
  const isThaiLocale = locale.toLowerCase().startsWith("th");
  const authDefaults = useMemo(() => {
    const metadata = authUser?.user_metadata ?? {};
    const fullName = metadata.full_name ?? metadata.name ?? "";
    return {
      name: typeof fullName === "string" ? fullName : "",
      email: typeof authUser?.email === "string" ? authUser.email : "",
      phone: typeof authUser?.phone === "string" ? authUser.phone : "",
    };
  }, [authUser]);
  const consultationCopy = isThaiLocale
    ? {
        title: "ส่งคำขอประเมินและนัดหมายผู้เชี่ยวชาญ",
        subtitle:
          "ทีมวิศวกรจะตรวจข้อมูลและติดต่อกลับเพื่อยืนยันแบบระบบเบื้องต้น",
        name: "ชื่อ-นามสกุล หรือ ชื่อบริษัท *",
        taxId: "เลขประจำตัวผู้เสียภาษี (ไม่บังคับ)",
        email: "อีเมล *",
        phone: "เบอร์โทรศัพท์ *",
        postalCode: "รหัสไปรษณีย์ *",
        preferredDateTime: "วันและเวลาที่สะดวกให้ติดต่อ *",
        remarks:
          "ข้อความเพิ่มเติม หรือแบรนด์อุปกรณ์ที่ท่านต้องการเป็นพิเศษ (ถ้ามี)",
        submitting: "กำลังส่งคำขอ...",
        submit: "ส่งคำขอประเมินและนัดหมายสถาปนิก/วิศวกร",
      }
    : {
        title: "Request Expert Consultation & Finalization",
        subtitle:
          "Our engineering team will review your profile and confirm the preliminary system blueprint.",
        name: "Full name or company name *",
        taxId: "Tax ID (optional)",
        email: "Email *",
        phone: "Phone number *",
        postalCode: "Postal code *",
        preferredDateTime: "Preferred discussion date/time *",
        remarks: "Special requests or preferred equipment brands (if any)",
        submitting: "Submitting request...",
        submit: "Request Blueprint & Consultation",
      };

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    void trackProductEvent("wizard_summary_viewed", {
      surface: "wizard_summary",
    });
    const id = requestAnimationFrame(() => setMounted(true));
    const rawBillInit =
      wizardAnswers.monthlyBill ?? wizardAnswers.averageMonthlyBill;
    if (rawBillInit === undefined) {
      updateDynamicState("monthlyBill", 5000);
    } else if (wizardAnswers.monthlyBill === undefined) {
      updateDynamicState("monthlyBill", Number(rawBillInit));
    }
    const daytime = wizardAnswers.daytimeUsagePct ?? wizardAnswers.daytimeUsage;
    if (daytime === undefined) {
      updateDynamicState("daytimeUsagePct", 70);
    } else if (
      typeof daytime === "string" &&
      ["LOW", "MEDIUM", "HIGH"].includes(daytime.toUpperCase())
    ) {
      const mapped =
        daytime.toUpperCase() === "LOW"
          ? 30
          : daytime.toUpperCase() === "MEDIUM"
            ? 60
            : 90;
      updateDynamicState("daytimeUsagePct", mapped);
      updateDynamicState("daytimeUsage", mapped);
    }
    if (wizardAnswers.systemGoal === undefined) {
      updateDynamicState("systemGoal", "roi_max");
    }
    if (wizardAnswers.electricalPhase === undefined) {
      updateDynamicState("electricalPhase", "1-Phase");
    }
    if (wizardAnswers.electricityTariff === undefined) {
      updateDynamicState("electricityTariff", "flat");
    }
    if (wizardAnswers.futureLoad === undefined) {
      updateDynamicState("futureLoad", 0);
    }
    if (wizardAnswers.roofFacing === undefined) {
      updateDynamicState("roofFacing", "south");
    }
    return () => {
      cancelAnimationFrame(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init defaults once on mount
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const root = summaryRootRef.current;
    if (!root) return;

    const elements = Array.from(
      root.querySelectorAll<HTMLElement>("[data-solar-reveal]"),
    );
    if (elements.length === 0) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const context = gsap.context(() => {
      if (reducedMotion) {
        gsap.set(elements, { autoAlpha: 1, clearProps: "transform" });
        return;
      }

      gsap.fromTo(
        elements,
        { autoAlpha: 0, y: 12 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
          stagger: 0.07,
          ease: "power3.out",
          clearProps: "transform",
        },
      );
    }, root);

    return () => context.revert();
  }, [mounted]);

  useEffect(() => {
    if (restoredSummary || typeof window === "undefined") {
      return;
    }

    const raw = window.sessionStorage.getItem(SUMMARY_EXPORT_KEY);
    if (!raw) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time browser storage restore guard
      setRestoredSummary(true);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        wizardAnswers?: Record<string, string | number | boolean>;
        selectedAddonIds?: string[];
        productOverrides?: ProductOverrides;
        selectedFinancingId?: string | null;
        downPaymentPct?: number;
        loanTermMonths?: number;
      };

      if (parsed.wizardAnswers) {
        for (const [key, value] of Object.entries(parsed.wizardAnswers)) {
          if (
            value !== undefined &&
            value !== null &&
            wizardAnswers[key] !== value
          ) {
            updateDynamicState(key, value);
          }
        }
      }

      if (Array.isArray(parsed.selectedAddonIds)) {
        setSelectedAddonIds(parsed.selectedAddonIds);
      }
      if (parsed.productOverrides) {
        setProductOverrides(parsed.productOverrides);
      }
      if (parsed.selectedFinancingId) {
        setSelectedFinancingId(parsed.selectedFinancingId);
      }
      if (typeof parsed.downPaymentPct === "number") {
        setDownPaymentPct(parsed.downPaymentPct);
      }
      if (typeof parsed.loanTermMonths === "number") {
        setLoanTermMonths(parsed.loanTermMonths);
      }

      setRestoredSummary(true);
      window.sessionStorage.removeItem(SUMMARY_EXPORT_KEY);
    } catch (error) {
      console.warn(
        "[Summary] Failed to restore wizard summary snapshot:",
        error,
      );
      window.sessionStorage.removeItem(SUMMARY_EXPORT_KEY);
      setRestoredSummary(true);
    }
  }, [restoredSummary, updateDynamicState, wizardAnswers]);

  const rawMonthlyBill =
    wizardAnswers.monthlyBill ?? wizardAnswers.averageMonthlyBill;
  const monthlyBill = Number(rawMonthlyBill ?? 5000);
  const rawDaytime =
    wizardAnswers.daytimeUsagePct ?? wizardAnswers.daytimeUsage ?? 70;
  const daytimeUsagePct = (() => {
    const num = Number(rawDaytime);
    if (!Number.isNaN(num)) return num;
    const str = String(rawDaytime).toUpperCase();
    if (str === "LOW") return 30;
    if (str === "MEDIUM") return 60;
    if (str === "HIGH") return 90;
    return 70;
  })();
  const systemGoal = String(wizardAnswers.systemGoal ?? "roi_max");
  const electricalPhase = String(wizardAnswers.electricalPhase ?? "1-Phase");
  const pricingPhase = normalizePhase(electricalPhase);
  const roofMaterial = String(wizardAnswers.roofMaterial ?? "cpac");
  const budgetTier = String(wizardAnswers.budgetTier ?? "standard");

  const electricityTariff = (
    wizardAnswers.electricityTariff === "tou" ? "tou" : "flat"
  ) satisfies ElectricityTariffType;
  const futureLoad = Math.max(0, Number(wizardAnswers.futureLoad ?? 0));
  const roofFacing = (
    ["south", "east", "west", "north"].includes(
      String(wizardAnswers.roofFacing),
    )
      ? String(wizardAnswers.roofFacing)
      : "south"
  ) as RoofFacing;
  const roofTilt = (
    ["tilt_10_15", "tilt_30", "tilt_45"].includes(
      String(wizardAnswers.roofTilt),
    )
      ? String(wizardAnswers.roofTilt)
      : "tilt_10_15"
  ) as RoofTilt;
  const tariffOption = TARIFF_OPTIONS[electricityTariff];
  const roofFacingOption = ROOF_FACING_OPTIONS[roofFacing];
  const roofTiltOption = ROOF_TILT_OPTIONS[roofTilt];
  const effectiveTariffRate =
    recommendationConfig.tariffRate * tariffOption.rateMultiplier;
  const adjustedRecommendationConfig = {
    ...recommendationConfig,
    tariffRate: effectiveTariffRate,
    sizingDivisor:
      recommendationConfig.sizingDivisor *
      roofFacingOption.multiplier *
      roofTiltOption.multiplier,
  };

  // Future load is stored as additional monthly kWh (EV charger, larger AC, etc.).
  const evLoadOffset = hasEvChargerAddon ? 200 : 0;
  const adjustedMonthlyBill =
    monthlyBill + (futureLoad + evLoadOffset) * effectiveTariffRate;
  const solarCalculation = getSolarSizingCalculation(
    adjustedMonthlyBill,
    daytimeUsagePct,
    adjustedRecommendationConfig,
  );
  const batteryCalculation = getBatterySizingCalculation(
    solarCalculation.solarKwp,
    systemGoal,
    adjustedRecommendationConfig,
  );
  const formulaSolarKwp = solarCalculation.solarKwp;

  // Sync manualSolarKwp with formulaSolarKwp when manual mode is off
  useEffect(() => {
    if (!isManualSize && formulaSolarKwp > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps manual simulator aligned until the user opts in
      setManualSolarKwp(formulaSolarKwp);
    }
  }, [formulaSolarKwp, isManualSize]);
  const formulaBatteryKwh = batteryCalculation.batteryKwh;

  const recommendedBOM = useMemo(
    () =>
      buildRecommendedBOM(
        categories,
        {
          recommendedSolarKwp: formulaSolarKwp,
          recommendedBatteryKwh: formulaBatteryKwh,
          roofMaterial,
          systemGoal,
          budgetTier,
        },
        productOverrides,
        recommendationConfig,
        {
          answers: wizardAnswers,
          optionScoringMap,
          rules: recommendationRules,
        },
      ),
    [
      categories,
      formulaSolarKwp,
      formulaBatteryKwh,
      roofMaterial,
      systemGoal,
      budgetTier,
      productOverrides,
      recommendationConfig,
      wizardAnswers,
      optionScoringMap,
      recommendationRules,
    ],
  );

  const bomSpecs = useMemo(
    () => deriveChartSpecsFromBOM(recommendedBOM),
    [recommendedBOM],
  );

  const chartBatteryKwh = selectedBatteryKwh;
  const selectedTierConfig = PROPOSAL_TIERS[selectedTier];
  const profileProductionMultiplier = selectedTierConfig.simulatorMultiplier;

  const defaultBatteryKwh =
    bomSpecs.batteryKwh > 0 ? bomSpecs.batteryKwh : formulaBatteryKwh;

  useEffect(() => {
    if (hasInitializedBattery) return;
    if (defaultBatteryKwh <= 0) return;

    const batteryAddon = activeAddonsCatalog.find(isSolarBatteryAddon);
    const matchId = `battery${Math.round(defaultBatteryKwh)}k`.toLowerCase();
    const targetOption = batteryAddon?.optionsList?.find((option) => {
      const optionText = `${option.id} ${option.label}`
        .toLowerCase()
        .replace(/\s+/g, "");
      return optionText.includes(matchId);
    });
    const targetId =
      targetOption?.id ??
      (batteryAddon
        ? getSolarAddonDefaultSelectionId(batteryAddon)
        : "battery5k");
    const frame = window.requestAnimationFrame(() => {
      setSelectedAddonIds((current) => {
        const hasBat = batteryAddon
          ? Boolean(getSelectedSolarAddon(batteryAddon, current))
          : current.some((id) => id.startsWith("battery"));
        if (hasBat) return current;
        return [...current, targetId];
      });
      setHasInitializedBattery(true);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeAddonsCatalog, defaultBatteryKwh, hasInitializedBattery]);

  const addonPricing = useMemo(() => {
    let total = 0;
    let hasUnknownPrice = false;
    activeAddonsCatalog.forEach((addon) => {
      const allOptionIds = new Set<string>();
      allOptionIds.add(addon.id);
      addon.optionsList?.forEach((opt) => {
        allOptionIds.add(opt.id);
        allOptionIds.add(`${addon.id}_${opt.id}`);
      });

      const activeId = selectedAddonIds.find((id) => allOptionIds.has(id));
      if (!activeId) return;

      if (
        addon.inputType === "SELECT" &&
        addon.optionsList &&
        addon.optionsList.length > 0
      ) {
        const matchedOpt = addon.optionsList.find(
          (o) => o.id === activeId || activeId === `${addon.id}_${o.id}`,
        );
        const price = matchedOpt
          ? matchedOpt.price
          : addon.optionsList[0].price;
        if (typeof price === "number" && Number.isFinite(price)) {
          total += price;
        } else {
          hasUnknownPrice = true;
        }
      } else {
        if (typeof addon.price === "number" && Number.isFinite(addon.price)) {
          total += addon.price;
        } else {
          hasUnknownPrice = true;
        }
      }
    });
    return { total, hasUnknownPrice };
  }, [selectedAddonIds, activeAddonsCatalog]);

  const addonsTotalPrice = addonPricing.total;

  const baseSunHours = BASE_PEAK_SUN_HOURS;
  const adjustedSunHours =
    baseSunHours * roofFacingOption.multiplier * roofTiltOption.multiplier;
  const dailyEnergyDemandKwh = adjustedMonthlyBill / (30 * effectiveTariffRate);
  const daytimeDemandKwh = dailyEnergyDemandKwh * (daytimeUsagePct / 100);

  // 1. Recommended Sizing Calculation
  const recSolarKwp =
    bomSpecs.solarKwp > 0 ? bomSpecs.solarKwp : formulaSolarKwp;
  const recSystemPackage = getSystemPackageForSize(recSolarKwp);
  const recDailySolarKwh = recSolarKwp * adjustedSunHours;
  const recSelfConsumedKwh = Math.min(daytimeDemandKwh, recDailySolarKwh);
  const recDailyExcessKwh = Math.max(0, recDailySolarKwh - daytimeDemandKwh);
  const recDailyBatterySavingsKwh =
    chartBatteryKwh > 0 ? Math.min(recDailyExcessKwh, chartBatteryKwh) : 0;
  const recTotalDailySavingsKwh =
    recSelfConsumedKwh + recDailyBatterySavingsKwh;
  const recSavingsMonthly = Math.min(
    adjustedMonthlyBill * 0.95,
    recTotalDailySavingsKwh * 30 * effectiveTariffRate,
  );
  const recWastedKwh = Math.max(
    0,
    recDailyExcessKwh - recDailyBatterySavingsKwh,
  );

  // 2. Manual Selected Sizing Calculation
  const manSolarKwp = manualSolarKwp;
  const manSystemPackage = getSystemPackageForSize(manSolarKwp);
  const manDailySolarKwh = manSolarKwp * adjustedSunHours;
  const manSelfConsumedKwh = Math.min(daytimeDemandKwh, manDailySolarKwh);
  const manDailyExcessKwh = Math.max(0, manDailySolarKwh - daytimeDemandKwh);
  const manDailyBatterySavingsKwh =
    chartBatteryKwh > 0 ? Math.min(manDailyExcessKwh, chartBatteryKwh) : 0;
  const manTotalDailySavingsKwh =
    manSelfConsumedKwh + manDailyBatterySavingsKwh;
  const manSavingsMonthly = Math.min(
    adjustedMonthlyBill * 0.95,
    manTotalDailySavingsKwh * 30 * effectiveTariffRate,
  );
  const manWastedKwh = Math.max(
    0,
    manDailyExcessKwh - manDailyBatterySavingsKwh,
  );

  // 3. Active system states based on toggle selection
  const chartSolarKwp = isManualSize ? manSolarKwp : recSolarKwp;
  const activeSystemPackage = isManualSize
    ? manSystemPackage
    : recSystemPackage;
  const matrixSystemPrice = getSolarProfilePrice(
    selectedTier,
    chartSolarKwp,
    pricingPhase,
  );
  const isMatrixContactPrice =
    matrixSystemPrice === null || addonPricing.hasUnknownPrice;
  const totalInstallCost = isMatrixContactPrice
    ? 0
    : Math.round(matrixSystemPrice + addonsTotalPrice);

  const dailySolarKwh = isManualSize ? manDailySolarKwh : recDailySolarKwh;
  const dailyExcessSolarKwh = isManualSize
    ? manDailyExcessKwh
    : recDailyExcessKwh;
  const dailyBatterySavingsKwh = isManualSize
    ? manDailyBatterySavingsKwh
    : recDailyBatterySavingsKwh;
  const baseEstimatedSavingsMonthly = isManualSize
    ? manSavingsMonthly
    : recSavingsMonthly;
  const estimatedSavingsMonthly = Math.min(
    adjustedMonthlyBill * 0.95,
    baseEstimatedSavingsMonthly * selectedTierConfig.savingsMultiplier,
  );
  const paybackPeriodYears =
    !isMatrixContactPrice && estimatedSavingsMonthly > 0
      ? totalInstallCost / (estimatedSavingsMonthly * 12)
      : 0;
  const annualSolarProductionKwh =
    dailySolarKwh * 365 * profileProductionMultiplier;
  const estimatedSavingsPercent = Math.min(
    95,
    Math.max(
      0,
      Math.round(
        (estimatedSavingsMonthly / Math.max(adjustedMonthlyBill, 1)) * 100,
      ),
    ),
  );
  const estimatedPanelCount =
    bomSpecs.panelCount || Math.ceil((chartSolarKwp * 1000) / 550);
  const selfConsumedDailyKwh = isManualSize
    ? manSelfConsumedKwh
    : recSelfConsumedKwh;
  const baseWastedExcessDailyKwh = isManualSize ? manWastedKwh : recWastedKwh;
  const wastedExcessDailyKwh = hasZeroExportAddon
    ? isManualSize
      ? manDailyExcessKwh
      : recDailyExcessKwh
    : baseWastedExcessDailyKwh;
  const profiledSelfConsumedDailyKwh = Math.min(
    daytimeDemandKwh,
    selfConsumedDailyKwh * profileProductionMultiplier,
  );
  const profiledWastedExcessDailyKwh =
    wastedExcessDailyKwh * profileProductionMultiplier;
  const monthlySelfConsumptionSavings = Math.min(
    adjustedMonthlyBill * 0.95,
    selfConsumedDailyKwh *
      30 *
      effectiveTariffRate *
      selectedTierConfig.savingsMultiplier,
  );
  const ecoImpact = useMemo(
    () =>
      calculateSolarProfileEcoImpact(
        dailySolarKwh * 365,
        profileProductionMultiplier,
      ),
    [dailySolarKwh, profileProductionMultiplier],
  );

  const financialData = useMemo<FinancialsPayload>(
    () =>
      calculateFinancialPlan(
        totalInstallCost,
        adjustedMonthlyBill,
        estimatedSavingsMonthly,
        (wizardAnswers.propertyType as string) || "home",
        financingOptions,
      ),
    [
      totalInstallCost,
      adjustedMonthlyBill,
      estimatedSavingsMonthly,
      wizardAnswers.propertyType,
      financingOptions,
    ],
  );

  useEffect(() => {
    if (!financialData.financingOptions.length) {
      return;
    }

    if (selectedFinancingId === "cash") {
      return;
    }

    const hasSelection = selectedFinancingId
      ? financialData.financingOptions.some(
          (option) => option.id === selectedFinancingId,
        )
      : false;

    if (!hasSelection) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- selects the first configured financing option once data is ready
      setSelectedFinancingId(financialData.financingOptions[0].id);
    }
  }, [financialData.financingOptions, selectedFinancingId]);

  const { formatCurrency: formatCurrencyFromStore } = useCurrencyStore();
  const formatCurrency = (val: number) => formatCurrencyFromStore(val);

  const displayPrice = isMatrixContactPrice
    ? CONTACT_FOR_PRICING_TEXT
    : isThaiLocale
      ? `เริ่มต้น ${formatCurrency(totalInstallCost)}`
      : `Starting ${formatCurrency(totalInstallCost)}`;

  const formatCompactCurrency = (val: number) =>
    new Intl.NumberFormat(intlLocale, {
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(val);
  const formatNumber = (val: number) =>
    new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 0 }).format(val);

  const genericDesignProfile = useMemo(() => {
    const systemWatts = Math.max(0, chartSolarKwp * 1000);
    const minPanelCount = Math.max(1, Math.ceil(systemWatts / 550));
    const maxPanelCount = Math.max(minPanelCount, Math.ceil(systemWatts / 450));
    const roundedSystemSize = Math.max(1, Math.round(chartSolarKwp));
    const systemType =
      systemGoal === "hybrid" || systemGoal === "offgrid"
        ? "Hybrid"
        : "On-Grid";
    const inverterType =
      systemType === "Hybrid"
        ? `${roundedSystemSize}kW Hybrid Inverter with battery-ready profile`
        : `${roundedSystemSize}kW Grid-Tie Inverter`;

    return {
      systemWatts,
      minPanelCount,
      maxPanelCount,
      panelEstimate: `Approx. ${minPanelCount} - ${maxPanelCount} High-Efficiency Monocrystalline Panels (Generic)`,
      inverterProfile: `1x ${inverterType} (Standard/Certified TIER-1)`,
      mountingProfile:
        "Custom Roof Mounting Kit (Tailored to your roof structure during technical review)",
      systemType,
    };
  }, [chartSolarKwp, systemGoal]);

  const localizedTierLabel = t(`profileTiers.${selectedTier}`);
  const localizedTierEquipment = t(`profileTierEquipment.${selectedTier}`);
  const localizedPackageLabel = t(`systemPackages.${activeSystemPackage.sizeKwp}.label`);
  const localizedSystemType = genericDesignProfile.systemType === "Hybrid"
    ? t("systemTypes.hybrid")
    : t("systemTypes.onGrid");

  const getBatteryModeForChart = () => {
    if (chartBatteryKwh === 0) return "self-consumption";
    if (electricityTariff === "tou") return "tou";
    if (systemGoal === "offgrid") return "backup";
    return "self-consumption";
  };

  const handleTierSelect = (tier: ProposalTier) => {
    setSelectedTier(tier);
    setConsultationFeedback(null);
    void trackProductEvent("build_configuration_changed", {
      change_type: "proposal_tier",
      value: tier,
    });
  };

  const prefillConsultationFromAuth = () => {
    setConsultationName((current) => current || authDefaults.name);
    setConsultationEmail((current) => current || authDefaults.email);
    setConsultationPhone((current) => current || authDefaults.phone);
  };

  const openInquiryFlow = () => {
    if (authUser) {
      prefillConsultationFromAuth();
      setInquiryPanelState("inquiry-form");
      return;
    }
    setInquiryPanelState("auth-prompt");
  };

  const handleRequestProposalFocus = () => {
    setActiveDashboardTab("impact");
    openInquiryFlow();
    void trackProductEvent("proposal_request_started", {
      surface: "wizard_summary",
      kw_size: chartSolarKwp,
      estimated_price: isMatrixContactPrice ? null : totalInstallCost,
      proposal_tier: selectedTier,
    });
    setFormFocusPulse(true);
    window.setTimeout(() => {
      (proposalFormRef.current ?? inquiryPanelRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }, 80);
    window.setTimeout(() => setFormFocusPulse(false), 1500);
  };

  const handleAdjustEstimate = () => {
    setActiveDashboardTab("energy");
    window.setTimeout(() => {
      document.getElementById("summary-tab-energy")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "center",
      });
    }, 0);
  };

  const handleSummaryTabKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    currentTab: typeof activeDashboardTab,
  ) => {
    const tabOrder = ["package", "energy", "financial", "impact"] as const;
    const currentIndex = tabOrder.indexOf(currentTab);
    if (currentIndex < 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % tabOrder.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + tabOrder.length) % tabOrder.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = tabOrder.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const nextTab = tabOrder[nextIndex];
    setActiveDashboardTab(nextTab);
    window.requestAnimationFrame(() => {
      document.getElementById(`summary-tab-${nextTab}`)?.focus();
    });
  };

  const handleSwapSelect = (categoryId: string, productId: string) => {
    setProductOverrides((prev) => ({ ...prev, [categoryId]: productId }));
    setSwapLine(null);
  };

  const swapCategory = swapLine
    ? categories.find((c) => c.id === swapLine.categoryId)
    : null;

  const financialSnapshot = useMemo(() => {
    const activeFinancing =
      financialData.financingOptions.find(
        (opt) => opt.id === selectedFinancingId,
      ) ?? null;

    let loanInstallment = 0;
    let isBankLoan = false;
    let isPpa = false;

    if (activeFinancing) {
      if (activeFinancing.financeType === "BANK_LOAN") {
        isBankLoan = true;
        const financedPrincipal = totalInstallCost * (1 - downPaymentPct / 100);
        const annualRate = activeFinancing.interestRate
          ? parseFloat(activeFinancing.interestRate)
          : 0;
        const n = loanTermMonths;
        if (annualRate === 0) {
          loanInstallment = financedPrincipal / n;
        } else {
          const monthlyRate = annualRate / 12 / 100;
          loanInstallment =
            (financedPrincipal * monthlyRate) /
            (1 - Math.pow(1 + monthlyRate, -n));
        }
      } else if (activeFinancing.financeType === "PPA") {
        isPpa = true;
      }
    }

    const currentBill = monthlyBill;
    const remainingBill = Math.max(0, monthlyBill - estimatedSavingsMonthly);
    const combinedCost = loanInstallment + remainingBill;
    const cashflowSavings = currentBill - combinedCost;
    const maxValue = Math.max(currentBill, combinedCost, 1);
    const bar1Pct = Math.max(10, Math.min(100, (currentBill / maxValue) * 100));
    const bar2Pct = Math.max(
      10,
      Math.min(100, (combinedCost / maxValue) * 100),
    );

    return {
      activeFinancing,
      loanInstallment,
      isBankLoan,
      isPpa,
      currentBill,
      remainingBill,
      combinedCost,
      cashflowSavings,
      bar1Pct,
      bar2Pct,
    };
  }, [
    financialData.financingOptions,
    selectedFinancingId,
    totalInstallCost,
    downPaymentPct,
    loanTermMonths,
    monthlyBill,
    estimatedSavingsMonthly,
  ]);

  const totalCostWithInterest = useMemo(() => {
    const isLoanMode = selectedFinancingId !== "cash";
    const initialOutflow = isLoanMode
      ? totalInstallCost * (downPaymentPct / 100)
      : totalInstallCost;

    if (!isLoanMode) return totalInstallCost;

    const activeFinancing =
      financialData.financingOptions.find(
        (opt) => opt.id === selectedFinancingId,
      ) ?? null;

    let fixedLoanInstallment = 0;
    const loanMonths = loanTermMonths;
    if (activeFinancing) {
      const financedPrincipal = totalInstallCost * (1 - downPaymentPct / 100);
      const annualRate = activeFinancing.interestRate
        ? parseFloat(activeFinancing.interestRate)
        : 0;
      if (annualRate === 0) {
        fixedLoanInstallment = financedPrincipal / loanMonths;
      } else {
        const monthlyRate = annualRate / 12 / 100;
        fixedLoanInstallment =
          (financedPrincipal * monthlyRate) /
          (1 - Math.pow(1 + monthlyRate, -loanMonths));
      }
    }
    return initialOutflow + fixedLoanInstallment * loanMonths;
  }, [
    totalInstallCost,
    downPaymentPct,
    loanTermMonths,
    selectedFinancingId,
    financialData.financingOptions,
  ]);

  const cashFlow10Years = useMemo(() => {
    const flows = [];
    let cumulativeSavings = 0;

    // Check if the current payment mode is Loan
    const isLoanMode = selectedFinancingId !== "cash";

    // Initial cash outflow at Year 0
    const initialOutflow = isLoanMode
      ? totalInstallCost * (downPaymentPct / 100)
      : totalInstallCost;

    // Fixed monthly installment for Loan
    const activeFinancing =
      financialData.financingOptions.find(
        (opt) => opt.id === selectedFinancingId,
      ) ?? null;

    let fixedLoanInstallment = 0;
    const loanMonths = loanTermMonths;
    if (isLoanMode && activeFinancing) {
      const financedPrincipal = totalInstallCost * (1 - downPaymentPct / 100);
      const annualRate = activeFinancing.interestRate
        ? parseFloat(activeFinancing.interestRate)
        : 0;
      if (annualRate === 0) {
        fixedLoanInstallment = financedPrincipal / loanMonths;
      } else {
        const monthlyRate = annualRate / 12 / 100;
        fixedLoanInstallment =
          (financedPrincipal * monthlyRate) /
          (1 - Math.pow(1 + monthlyRate, -loanMonths));
      }
    }

    // Year 0 entry: Initial investment outflow
    flows.push({
      year: 0,
      yearSavings: 0,
      degradationFactor: 1,
      inflationFactor: 1,
      cumulativeSavings: 0,
      yearInstallment: initialOutflow,
      cumulativeInstallments: initialOutflow,
      netCashBenefit: -initialOutflow,
    });

    let cumulativeInstallments = initialOutflow;

    for (let year = 1; year <= 25; year++) {
      // 0.5% annual panel degradation
      const degradationFactor = Math.pow(
        1 - PANEL_ANNUAL_DEGRADATION_RATE,
        year - 1,
      );
      // 3.0% annual grid tariff inflation
      const inflationFactor = Math.pow(1 + 0.03, year - 1);

      // Annual savings factoring in degradation and grid inflation
      const yearSavings =
        monthlySelfConsumptionSavings *
        12 *
        degradationFactor *
        inflationFactor;
      cumulativeSavings += yearSavings;

      // Installments paid this year (Loan term is dynamically set by user slider)
      let yearInstallment = 0;
      if (isLoanMode) {
        const startMonthOfYear = (year - 1) * 12;
        const monthsPaidThisYear = Math.max(
          0,
          Math.min(12, loanMonths - startMonthOfYear),
        );
        yearInstallment = monthsPaidThisYear * fixedLoanInstallment;
      }

      cumulativeInstallments += yearInstallment;
      const netCashBenefit = cumulativeSavings - cumulativeInstallments;

      flows.push({
        year,
        yearSavings,
        degradationFactor,
        inflationFactor,
        cumulativeSavings,
        yearInstallment,
        cumulativeInstallments,
        netCashBenefit,
      });
    }

    // Payback period (first year where cumulative savings cover the total lifetime investment cost)
    const breakevenYear =
      flows.find(
        (f) => f.year > 0 && f.cumulativeSavings >= totalCostWithInterest,
      )?.year ?? null;

    return { flows, breakevenYear, fixedLoanInstallment };
  }, [
    totalInstallCost,
    downPaymentPct,
    loanTermMonths,
    selectedFinancingId,
    financialData.financingOptions,
    monthlySelfConsumptionSavings,
    totalCostWithInterest,
  ]);

  const cashFlowChartData = useMemo(
    () =>
      cashFlow10Years.flows.map((flow) => {
        const netCashBenefit = Math.round(flow.netCashBenefit);

        return {
          year: flow.year,
          cumulativeSavings: Math.round(flow.cumulativeSavings),
          cumulativeInstallments: Math.round(flow.cumulativeInstallments),
          totalCost: Math.round(totalCostWithInterest),
          netCashBenefit,
          netCashPositive: netCashBenefit >= 0 ? netCashBenefit : null,
          netCashNegative: netCashBenefit < 0 ? netCashBenefit : null,
        };
      }),
    [cashFlow10Years.flows, totalCostWithInterest],
  );
  const summaryExport = useMemo(() => {
    const activeFinancing = financialSnapshot.activeFinancing;
    const estimatedInstallment = financialSnapshot.isBankLoan
      ? financialSnapshot.loanInstallment
      : financialSnapshot.combinedCost;

    return {
      wizardAnswers,
      selectedAddonIds,
      selectedFinancingId,
      downPaymentPct,
      loanTermMonths,
      productOverrides,
      summary: {
        systemPackageId: activeSystemPackage.packageId,
        systemPackageLabel: activeSystemPackage.label,
        systemPackageSizeKwp: activeSystemPackage.sizeKwp,
        proposalTier: selectedTierConfig.label,
        proposalTierEquipment: selectedTierConfig.equipment,
        systemSizeKwp: chartSolarKwp,
        panelCount: bomSpecs.panelCount,
        totalPrice: totalInstallCost,
        monthlySavings: estimatedSavingsMonthly,
        paybackPeriod: paybackPeriodYears.toFixed(1),
        paybackPeriodYears,
        estimatedInstallment,
        roofFacing,
        roofMaterial,
        electricalPhase,
        monthlyBill,
        daytimeUsagePct,
        electricityTariff,
        futureLoad,
        isManualSize,
        adjustedSunHours,
        daytimeDemandKwh,
        selfConsumedDailyKwh,
        wastedExcessDailyKwh,
        monthlySelfConsumptionSavings,
        cashFlow10Years,
        ecoImpact,
        activeFinancing: activeFinancing
          ? {
              id: activeFinancing.id,
              providerName: activeFinancing.providerName,
              financeType: activeFinancing.financeType,
            }
          : null,
      },
      configurationData: {
        exportSource: "wizard-summary",
        pricingModel: "SYSTEM_PACKAGE",
        systemPackageId: activeSystemPackage.packageId,
        systemPackageLabel: activeSystemPackage.label,
        systemPackageSizeKwp: activeSystemPackage.sizeKwp,
        proposalTier: selectedTierConfig.label,
        proposalTierEquipment: selectedTierConfig.equipment,
        packageContents: activeSystemPackage.contents,
        wizardAnswers,
        selectedAddonIds,
        selectedFinancingId,
        downPaymentPct,
        loanTermMonths,
        roofFacing,
        roofMaterial,
        electricalPhase,
        monthlyBill,
        daytimeUsagePct,
        electricityTariff,
        futureLoad,
        items: [],
        summary: {
          systemPackageId: activeSystemPackage.packageId,
          systemPackageLabel: activeSystemPackage.label,
          proposalTier: selectedTierConfig.label,
          proposalTierEquipment: selectedTierConfig.equipment,
          systemSizeKwp: chartSolarKwp,
          panelCount: bomSpecs.panelCount,
          totalPrice: totalInstallCost,
          monthlySavings: estimatedSavingsMonthly,
          paybackPeriodYears,
          estimatedInstallment,
          adjustedSunHours,
          daytimeDemandKwh,
          selfConsumedDailyKwh,
          wastedExcessDailyKwh,
          monthlySelfConsumptionSavings,
          cashFlow10Years,
          ecoImpact,
        },
      },
    };
  }, [
    activeSystemPackage,
    adjustedSunHours,
    bomSpecs.panelCount,
    cashFlow10Years,
    chartSolarKwp,
    daytimeDemandKwh,
    estimatedSavingsMonthly,
    ecoImpact,
    financialSnapshot.activeFinancing,
    financialSnapshot.combinedCost,
    financialSnapshot.isBankLoan,
    financialSnapshot.loanInstallment,
    futureLoad,
    daytimeUsagePct,
    downPaymentPct,
    electricalPhase,
    electricityTariff,
    loanTermMonths,
    monthlyBill,
    monthlySelfConsumptionSavings,
    paybackPeriodYears,
    productOverrides,
    roofFacing,
    roofMaterial,
    selectedAddonIds,
    selectedFinancingId,
    selectedTierConfig,
    selfConsumedDailyKwh,
    totalInstallCost,
    wastedExcessDailyKwh,
    wizardAnswers,
    isManualSize,
  ]);

  const persistSummaryExport = () => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(
      SUMMARY_EXPORT_KEY,
      JSON.stringify(summaryExport),
    );
  };

  const downloadFinancialReport = async (estimate: unknown) => {
    const response = await fetch("/api/wizard/financial-report", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ version: 1, estimate }),
    });
    const contentType =
      response.headers.get("content-type")?.toLowerCase() ?? "";
    if (!response.ok || !contentType.includes("application/pdf")) {
      throw new Error(
        `Unable to generate the financial report (${response.status}).`,
      );
    }
    const blob = await response.blob();
    if (!blob.size)
      throw new Error("The generated financial report was empty.");
    const objectUrl = URL.createObjectURL(blob);
    try {
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `solardream-${chartSolarKwp.toFixed(2)}kwp-financial-report.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } finally {
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    }
  };

  const prepareRegistrationIntent = async (intent: EstimateDraftIntent) => {
    persistSummaryExport();
    const envelope = cacheEstimateDraft(intent, summaryExport);
    await bridgeEstimateDraft(envelope);
    return envelope;
  };

  const handleSaveConfiguration = async () => {
    setSaveSubmitting(true);
    try {
      if (authUser) {
        await bridgeEstimateDraft(
          createEstimateDraftEnvelope("SAVE", summaryExport),
        );
        void trackProductEvent("configuration_saved", {
          authenticated: true,
          intent: "save",
        });
        toast.success(
          isThaiLocale
            ? "บันทึกการออกแบบไว้ในบัญชีแล้ว"
            : "Configuration saved to your account.",
        );
        return;
      }
      await prepareRegistrationIntent("SAVE");
      void trackProductEvent("estimate_registration_started", {
        intent: "save",
      });
      setRegistrationIntent("SAVE");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to save this configuration.",
      );
    } finally {
      setSaveSubmitting(false);
    }
  };

  const handleFinancialReport = async () => {
    if (isMatrixContactPrice) return;

    void trackProductEvent("financial_report_requested", {
      authenticated: Boolean(authUser),
    });
    if (!authUser) {
      setReportDownloading(true);
      try {
        await prepareRegistrationIntent("REPORT");
        setRegistrationIntent("REPORT");
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to prepare the financial report.",
        );
      } finally {
        setReportDownloading(false);
      }
      return;
    }
    setReportDownloading(true);
    try {
      await downloadFinancialReport(summaryExport);
      void trackProductEvent("financial_report_downloaded", {
        authenticated: true,
        system_size_kwp: chartSolarKwp,
      });
      toast.success(
        isThaiLocale
          ? "ดาวน์โหลดรายงานการเงินแล้ว"
          : "Financial report downloaded.",
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to download the financial report.",
      );
    } finally {
      setReportDownloading(false);
    }
  };

  const handleGoogleRegistration = async (intent: EstimateDraftIntent) => {
    setRegistrationSubmitting(true);
    void trackProductEvent("auth_provider_selected", {
      method: "google",
      intent,
    });
    try {
      persistSummaryExport();
      const pending = readEstimateDraft();
      if (!pending || pending.intent !== intent) {
        await prepareRegistrationIntent(intent);
      } else {
        await bridgeEstimateDraft(pending);
      }
      const nextPath = `/${locale}/wizard/summary`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(nextPath)}`,
        },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to continue with Google.",
      );
      setRegistrationSubmitting(false);
    }
  };

  const handleProposalLogin = async () => {
    setRegistrationSubmitting(true);
    try {
      await prepareRegistrationIntent("PROPOSAL");
      router.push(
        `/${locale}/login?next=${encodeURIComponent(`/${locale}/wizard/summary`)}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to preserve this proposal before sign in.",
      );
      setRegistrationSubmitting(false);
    }
  };

  useEffect(() => {
    if (authLoading || !authUser || pendingDraftHandledRef.current) return;
    const pending = readEstimateDraft();
    if (!pending) return;
    pendingDraftHandledRef.current = true;

    void Promise.resolve().then(async () => {
      const isPendingReport = pending.intent === "REPORT";
      if (isPendingReport) setReportDownloading(true);
      try {
        await bridgeEstimateDraft(
          createEstimateDraftEnvelope(pending.intent, pending.estimate),
        );
        if (isPendingReport) {
          await downloadFinancialReport(pending.estimate);
        }
        removeEstimateDraft();
        if (pending.intent === "SAVE") {
          toast.success(
            isThaiLocale
              ? "บันทึกการออกแบบไว้ในบัญชีแล้ว"
              : "Your configuration is saved to your account.",
          );
        } else if (pending.intent === "PROPOSAL") {
          toast.success(
            isThaiLocale
              ? "เชื่อมคำขอประเมินกับบัญชีแล้ว"
              : "Your proposal request is linked to your account.",
          );
        } else {
          toast.success(
            isThaiLocale
              ? "ดาวน์โหลดรายงานการเงินแล้ว"
              : "Financial report downloaded.",
          );
        }
      } catch (error) {
        pendingDraftHandledRef.current = false;
        toast.error(
          error instanceof Error
            ? error.message
            : "Unable to finish saving the pending estimate.",
        );
      } finally {
        if (isPendingReport) setReportDownloading(false);
      }
    });
    // The pending envelope is intentionally handled only once when auth resolves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, authUser]);

  const handleConsultationSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setConsultationSubmitting(true);
    setConsultationFeedback(null);
    setGuestProposalSuccess(false);
    const pinnedLocationNote = consultationLocation
      ? `Pinned location: ${consultationLocation.displayName} (${consultationLocation.latitude.toFixed(6)}, ${consultationLocation.longitude.toFixed(6)})`
      : "";
    const combinedRemarks = [consultationRemarks.trim(), pinnedLocationNote]
      .filter(Boolean)
      .join("\n\n");
    let success = false;
    try {
      if (!authUser && guestAccountOptIn) {
        try {
          await prepareRegistrationIntent("PROPOSAL");
        } catch (bridgeError) {
          console.warn(
            "[Summary] Proposal draft bridge was unavailable; continuing guest submission:",
            bridgeError,
          );
          toast.info(
            isThaiLocale
              ? "ยังเชื่อมแบบกับบัญชีไม่ได้ แต่กำลังส่งคำขอประเมินต่อให้ค่ะ"
              : "Account linking is temporarily unavailable. Your proposal is still being submitted.",
          );
        }
      }
      const result = await submitDesignConsultationRequest({
        name: consultationName,
        email: consultationEmail || authUser?.email || "",
        phone: consultationPhone,
        taxId: consultationTaxId,
        postalCode: consultationPostalCode,
        preferredDateTime: consultationDateTime,
        remarks: combinedRemarks || undefined,
        locale,
        source: useSourceTrackingStore.getState().source || "direct",
        location:
          consultationLocation?.displayName ||
          String(wizardAnswers.location ?? wizardAnswers.province ?? ""),
        systemProfile: {
          pricingModel: "SYSTEM_PACKAGE",
          proposalTier: selectedTierConfig.label,
          systemPackageId: activeSystemPackage.packageId,
          systemPackageLabel: activeSystemPackage.label,
          systemPackageSizeKwp: activeSystemPackage.sizeKwp,
          systemPackagePrice: activeSystemPackage.standardPrice,
          packageContents: activeSystemPackage.contents,
          systemSizeKwp: chartSolarKwp,
          systemType: genericDesignProfile.systemType,
          inverterType: genericDesignProfile.inverterProfile,
          panelEstimate: genericDesignProfile.panelEstimate,
          approxPanels: {
            min: genericDesignProfile.minPanelCount,
            max: genericDesignProfile.maxPanelCount,
            label: genericDesignProfile.panelEstimate,
          },
          inverterProfile: genericDesignProfile.inverterProfile,
          smartAddOns: (() => {
            const names: string[] = [];
            activeAddonsCatalog.forEach((addon) => {
              const allOptionIds = new Set<string>([addon.id]);
              addon.optionsList?.forEach((opt) => {
                allOptionIds.add(opt.id);
                allOptionIds.add(`${addon.id}_${opt.id}`);
              });
              if (selectedAddonIds.some((id) => allOptionIds.has(id))) {
                const activeOptId = selectedAddonIds.find((id) =>
                  allOptionIds.has(id),
                );
                const subOpt = addon.optionsList?.find(
                  (o) =>
                    o.id === activeOptId ||
                    activeOptId === `${addon.id}_${o.id}`,
                );
                names.push(
                  subOpt ? `${addon.name} (${subOpt.label})` : addon.name,
                );
              }
            });
            batterySizes.forEach((b) => {
              if (selectedAddonIds.includes(b.id) && !names.includes(b.name)) {
                names.push(b.name);
              }
            });
            return names;
          })(),
          addOns: (() => {
            const names: string[] = [];
            activeAddonsCatalog.forEach((addon) => {
              const allOptionIds = new Set<string>([addon.id]);
              addon.optionsList?.forEach((opt) => {
                allOptionIds.add(opt.id);
                allOptionIds.add(`${addon.id}_${opt.id}`);
              });
              if (selectedAddonIds.some((id) => allOptionIds.has(id))) {
                const activeOptId = selectedAddonIds.find((id) =>
                  allOptionIds.has(id),
                );
                const subOpt = addon.optionsList?.find(
                  (o) =>
                    o.id === activeOptId ||
                    activeOptId === `${addon.id}_${o.id}`,
                );
                names.push(
                  subOpt ? `${addon.name} (${subOpt.label})` : addon.name,
                );
              }
            });
            batterySizes.forEach((b) => {
              if (selectedAddonIds.includes(b.id) && !names.includes(b.name)) {
                names.push(b.name);
              }
            });
            return names;
          })(),
          mountingProfile: genericDesignProfile.mountingProfile,
          batteryKwh: chartBatteryKwh,
          calculatedMonthlySavings: estimatedSavingsMonthly,
          estimatedMonthlySavings: estimatedSavingsMonthly,
          estimatedBudget: totalInstallCost,
          dailyExcessSolarKwh,
          wastedExcessDailyKwh,
          dailyBatterySavingsKwh,
          selfConsumedDailyKwh,
          daytimeDemandKwh,
          adjustedSunHours,
          monthlySelfConsumptionSavings,
          cashFlow10Years,
          ecoImpact,
          paybackPeriodYears,
          monthlyBill,
          daytimeUsagePct,
          electricityTariff,
          roofFacing,
          roofTilt,
          roofMaterial,
          siteLocation: consultationLocation
            ? {
                latitude: consultationLocation.latitude,
                longitude: consultationLocation.longitude,
                displayName: consultationLocation.displayName,
                pdpaLocationConsent: true,
              }
            : null,
        },
        wizardAnswers: {
          ...wizardAnswers,
          siteLocation: consultationLocation
            ? {
                latitude: consultationLocation.latitude,
                longitude: consultationLocation.longitude,
                displayName: consultationLocation.displayName,
                pdpaLocationConsent: true,
              }
            : null,
        },
      });

      if (!result.success) {
        setConsultationFeedback({
          type: "error",
          message: result.error || "Failed to submit consultation request.",
        });
        return;
      }

      success = true;
      setConsultationFeedback({
        type: "success",
        message: isThaiLocale
          ? "ส่งคำขอประเมินเรียบร้อยแล้ว ทีมวิศวกรจะติดต่อกลับเพื่อยืนยันรายละเอียด"
          : "Proposal request received. Our engineering team will follow up with the next review step.",
      });
      void trackProductEvent("quotation_requested", {
        kw_size: chartSolarKwp,
        estimated_price: isMatrixContactPrice ? null : totalInstallCost,
        customer_type: "residential",
        surface: "wizard_summary",
        proposal_tier: selectedTier,
      });
      if (!authUser) {
        if (guestAccountOptIn && consultationEmail) {
          const nextPath = `/${locale}/wizard/summary`;
          void supabase.auth
            .signInWithOtp({
              email: consultationEmail,
              options: {
                shouldCreateUser: true,
                emailRedirectTo: `${window.location.origin}/${locale}/auth/callback?next=${encodeURIComponent(nextPath)}`,
              },
            })
            .then(({ error: accountEmailError }) => {
              if (accountEmailError) {
                console.warn(
                  "[Summary] Proposal succeeded, but the account email could not be sent:",
                  accountEmailError,
                );
              }
            })
            .catch((accountEmailError: unknown) => {
              console.warn(
                "[Summary] Proposal succeeded, but the account email could not be sent:",
                accountEmailError,
              );
            });
        }
      }
      toast.success(
        isThaiLocale
          ? "ส่งคำขอประเมินเรียบร้อยแล้ว! กำลังนำทางไปยังหน้ายืนยันคำขอของคุณ..."
          : "Request submitted successfully! Redirecting to confirmation...",
      );
      const refParam = result.trackingNumber || "";
      setTimeout(() => {
        router.push(
          `/${locale}/consultation/confirmation?from=wizard${refParam ? `&ref=${refParam}` : ""}`,
        );
      }, 1500);
    } catch (error) {
      setConsultationFeedback({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to submit consultation request.",
      });
    } finally {
      if (!success) {
        setConsultationSubmitting(false);
      }
    }
  };

  const simulatorControls = (
    <div className="space-y-4">
      {/* Mode Switcher */}
      <div className="flex items-center gap-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-1 text-xs font-medium">
        <button
          type="button"
          onClick={() => setIsManualSize(false)}
          className={cn(
            "min-h-10 flex-1 rounded-[var(--sd-radius-sm)] py-2 font-extrabold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)] focus-visible:ring-offset-2",
            !isManualSize
              ? "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]"
              : "text-[var(--sd-muted)] hover:bg-[var(--sd-selected)] hover:text-[var(--sd-ink)]",
          )}
        >
          {t("autoLabel")}
        </button>
        <button
          type="button"
          onClick={() => setIsManualSize(true)}
          className={cn(
            "min-h-10 flex-1 rounded-[var(--sd-radius-sm)] py-2 font-extrabold transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)] focus-visible:ring-offset-2",
            isManualSize
              ? "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]"
              : "text-[var(--sd-muted)] hover:bg-[var(--sd-selected)] hover:text-[var(--sd-ink)]",
          )}
        >
          {t("manualLabel")}
        </button>
      </div>

      {/* Manual Mode: Show kWp selection at the top; Auto Mode: Hide completely */}
      {isManualSize && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          className="space-y-3 rounded-[var(--sd-radius-lg)] border border-[var(--sd-blue-600)]/20 bg-[var(--sd-selected)] p-3.5"
        >
          <LightSliderField
            label={
              t("desiredSystemSize")
            }
            display={`${manualSolarKwp.toFixed(1)} kWp`}
            min={1}
            max={100}
            step={0.5}
            value={manualSolarKwp}
            unit="kWp"
            ticks={[1, 25, 50, 75, 100]}
            onChange={(value) => {
              setManualSolarKwp(value);
              setIsManualSize(true);
            }}
            minLabel="1 kWp"
            maxLabel="100 kWp"
          />

          {/* Polished Custom kWp Input */}
          <div className="flex items-center justify-between gap-3 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 shadow-[var(--sd-shadow-1)]">
            <label
              htmlFor="manual-kwp-input"
              className="shrink-0 text-xs font-black text-[var(--sd-ink)]"
            >
              {t("customSystemSize")}
            </label>
            <div className="relative max-w-[150px] flex-1">
              <input
                id="manual-kwp-input"
                type="number"
                min={1}
                max={2000}
                step={0.5}
                value={manualSolarKwp}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (Number.isFinite(val) && val > 0) {
                    setManualSolarKwp(val);
                    setIsManualSize(true);
                  }
                }}
                className="min-h-11 w-full rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-3 py-1.5 text-xs font-black text-[var(--sd-ink)] outline-none transition-all focus:border-[var(--sd-focus)] focus:ring-2 focus:ring-[var(--sd-focus)]/20"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-[var(--sd-muted)]">
                kWp
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Auto/Manual Shared Sliders */}
      <div className="grid gap-3.5">
        <LightSliderField
          label={t("quickAdjust.monthlyBill")}
          display={formatCurrency(monthlyBill)}
          min={Math.min(100, Math.floor(monthlyBill))}
          max={50000}
          step={100}
          value={monthlyBill}
          unit="฿"
          ticks={[100, 10000, 25000, 50000]}
          onChange={(value) => updateDynamicState("monthlyBill", value)}
          minLabel={formatCurrency(100)}
          maxLabel={formatCurrency(50000)}
        />
        <LightSliderField
          label={t("quickAdjust.daytimeUsage")}
          display={`${daytimeUsagePct}%`}
          min={10}
          max={100}
          step={5}
          value={daytimeUsagePct}
          unit="%"
          ticks={[10, 30, 50, 70, 100]}
          onChange={(value) => {
            updateDynamicState("daytimeUsagePct", value);
            updateDynamicState("daytimeUsage", value);
          }}
          minLabel="10%"
          maxLabel="100%"
        />

        {/* Upgraded Intuitive Future Load Expansion */}
        <div className="space-y-2.5 rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-3.5 shadow-[var(--sd-shadow-1)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[var(--sd-ink)]">
              {t("quickAdjust.futureLoadExpansion")}
            </span>
            <span className="text-xs font-black text-[var(--sd-blue-600)]">
              {t("quickAdjust.futureLoadMonthlyDisplay", { value: formatNumber(futureLoad) })}
            </span>
          </div>

          {/* Appliance Preset Quick Chips */}
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {[
              {
                id: "none",
                label: isThaiLocale ? "ไม่เพิ่ม" : "Current Only",
                icon: <Zap className="h-4 w-4 text-amber-500" />,
                value: 0,
              },
              {
                id: "ev",
                label: isThaiLocale ? "ชาร์จรถ EV" : "EV Charger",
                icon: <Car className="h-4 w-4 text-sky-500" />,
                value: 350,
              },
              {
                id: "aircon",
                label: isThaiLocale ? "แอร์เพิ่ม" : "2x Air Con",
                icon: <Snowflake className="h-4 w-4 text-blue-400" />,
                value: 200,
              },
              {
                id: "water",
                label: isThaiLocale ? "ปั๊ม/ทำอุ่น" : "Water/Pump",
                icon: <Droplets className="h-4 w-4 text-cyan-500" />,
                value: 100,
              },
            ].map((chip) => {
              const isSelected = futureLoad === chip.value;
              return (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => updateDynamicState("futureLoad", chip.value)}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center rounded-[var(--sd-radius-md)] border p-2 text-center transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)] focus-visible:ring-offset-2",
                    isSelected
                      ? "border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]"
                      : "border-[var(--sd-line)] bg-[var(--sd-raised)] text-[var(--sd-text)] hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)]",
                  )}
                >
                  <div className="flex items-center justify-center h-5 w-5 mb-0.5">
                    {chip.icon}
                  </div>
                  <span className="text-[11px] font-black leading-tight">
                    {chip.label}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 text-[9px] font-bold",
                      isSelected ? "text-white/85" : "text-[var(--sd-muted)]",
                    )}
                  >
                    {chip.value > 0 ? `+${chip.value} kWh` : "0 kWh"}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Fine-tuning GsapSlider */}
          <div className="pt-1">
            <LightSliderField
              label={t("quickAdjust.fineTuneLoad")}
              display={`${formatNumber(futureLoad)} kWh`}
              min={0}
              max={1500}
              step={50}
              value={futureLoad}
              unit="kWh"
              ticks={[0, 500, 1000, 1500]}
              onChange={(value) => updateDynamicState("futureLoad", value)}
              minLabel="0"
              maxLabel="1,500"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
        <PremiumSelect
          label={t("quickAdjust.roofFacing")}
          value={roofFacing}
          onChange={(value) =>
            updateDynamicState("roofFacing", value as RoofFacing)
          }
        >
          {Object.entries(ROOF_FACING_OPTIONS).map(([key, option]) => (
            <option key={key} value={key}>
              {t(option.labelKey)}
            </option>
          ))}
        </PremiumSelect>
        <PremiumSelect
          label={t("quickAdjust.roofTilt")}
          value={roofTilt}
          onChange={(value) =>
            updateDynamicState("roofTilt", value as RoofTilt)
          }
        >
          {Object.entries(ROOF_TILT_OPTIONS).map(([key, option]) => (
            <option key={key} value={key}>
              {t(option.labelKey)}
            </option>
          ))}
        </PremiumSelect>
        <div>
          <p className="mb-2 text-xs font-black text-[var(--sd-ink)]">{t("systemGoalLabel")}</p>
          <div className="flex items-center gap-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-1">
            {[
              { key: "roi_max", label: t("systemGoal.roiMaxLabel") },
              { key: "hybrid", label: t("systemGoal.hybridLabel") },
              { key: "offgrid", label: t("systemGoal.offgridLabel") },
            ].map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => updateDynamicState("systemGoal", option.key)}
                className={cn(
                  "flex-1 rounded-[var(--sd-radius-sm)] px-3 py-2 text-xs font-black transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)] focus-visible:ring-offset-2",
                  systemGoal === option.key
                    ? "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]"
                    : "text-[var(--sd-muted)] hover:bg-[var(--sd-selected)] hover:text-[var(--sd-ink)]",
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[10px] font-bold leading-relaxed text-[var(--sd-muted)]">
            {systemGoal === "roi_max" &&
              t("systemGoal.roiMaxHelper")}
            {systemGoal === "hybrid" &&
              t("systemGoal.hybridHelper")}
            {systemGoal === "offgrid" &&
              t("systemGoal.offgridHelper")}
          </p>
        </div>
      </div>
    </div>
  );

  const addonControls = (
    <section className="border-t border-[var(--sd-line)] pt-4">
      <div className="mb-3 flex items-center gap-2">
        <Wrench className="size-4 text-[var(--sd-blue-600)]" aria-hidden="true" />
        <h3 className="text-sm font-black text-[var(--sd-ink)]">{t("quickAdjust.addonsTitle")}</h3>
      </div>
      <div className="space-y-2.5">
        {activeAddonsCatalog
          .filter((item) => item.isVisible !== false)
          .map((addon) => {
            const allOptionIds = new Set<string>([addon.id]);
            addon.optionsList?.forEach((option) => {
              allOptionIds.add(option.id);
              allOptionIds.add(`${addon.id}_${option.id}`);
            });

            const activeOptId = selectedAddonIds.find((id) =>
              allOptionIds.has(id),
            );
            const isSelected = Boolean(activeOptId);
            const hasSubOptions = Boolean(
              addon.inputType === "SELECT" && addon.optionsList?.length,
            );
            const activeSubOpt = hasSubOptions
              ? (addon.optionsList?.find(
                  (option) =>
                    option.id === activeOptId ||
                    activeOptId === `${addon.id}_${option.id}`,
                ) ?? addon.optionsList?.[0])
              : null;
            const addonPrice: number | null =
              isSelected && activeSubOpt
                ? activeSubOpt.price
                : hasSubOptions && addon.optionsList?.[0]
                  ? addon.optionsList[0].price
                  : typeof addon.price === "number"
                    ? addon.price
                    : null;
            const addonLabel = addon.id === "battery-storage"
              ? t("addons.batteryStorage")
              : addon.shortLabel || addon.name;

            const handleToggle = () => {
              setSelectedAddonIds((current) => {
                const filtered = current.filter((id) => !allOptionIds.has(id));
                if (isSelected) return filtered;

                const defaultId =
                  hasSubOptions && addon.optionsList?.[0]
                    ? addon.optionsList[0].id
                    : addon.id;
                return [...filtered, defaultId];
              });
            };

            return (
              <div
                key={addon.id}
                className={cn(
                  "rounded-[var(--sd-radius-md)] border bg-[var(--sd-raised)] p-3 transition-colors",
                  isSelected
                    ? "border-[var(--sd-blue-600)] bg-[var(--sd-selected)]"
                    : "border-[var(--sd-line)] hover:border-[var(--sd-blue-600)]",
                )}
              >
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={handleToggle}
                    aria-label={addonLabel}
                    className="mt-0.5 size-4 shrink-0 cursor-pointer accent-[var(--sd-blue-600)] focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-black text-[var(--sd-ink)]">
                      {addonLabel}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-bold text-[var(--sd-blue-600)]">
                      {addonPrice === null
                        ? t("addons.priceOnRequest")
                        : `+${formatCurrency(addonPrice)}`}
                    </span>
                  </span>
                </label>

                {isSelected && hasSubOptions && addon.optionsList ? (
                  <select
                    value={activeSubOpt?.id || addon.optionsList[0].id}
                    onChange={(event) => {
                      const nextId = event.target.value;
                      setSelectedAddonIds((current) => [
                        ...current.filter((id) => !allOptionIds.has(id)),
                        nextId,
                      ]);
                    }}
                    aria-label={t("quickAdjust.selectAddonOption")}
                    className="mt-3 min-h-11 w-full rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-2.5 py-2 text-xs font-black text-[var(--sd-ink)] outline-none focus-visible:border-[var(--sd-focus)] focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)]/20"
                  >
                    {addon.optionsList.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.label} ({
                          typeof option.price === "number" &&
                          Number.isFinite(option.price)
                            ? `+${formatCurrency(option.price)}`
                            : t("addons.priceOnRequest")
                        })
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            );
          })}
      </div>
    </section>
  );

  const breakdownStats = (
    <section className="border-t border-[var(--sd-line)] pt-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Leaf className="size-4 text-[var(--sd-blue-600)]" aria-hidden="true" />
        <h3 className="text-sm font-black text-[var(--sd-ink)]">
          {isThaiLocale
            ? "ข้อมูลระบบและสิ่งแวดล้อม"
            : "System + environmental stats"}
        </h3>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <BreakdownStat
          label={t("summaryStats.systemSize")}
          value={
            <AnimatedNumber value={chartSolarKwp} decimals={2} suffix=" kWp" />
          }
        />
        <BreakdownStat
          label={t("summaryStats.panels")}
          value={`${bomSpecs.panelCount || Math.ceil((chartSolarKwp * 1000) / 550)} ${t("summaryStats.panelsUnit")}`}
        />
        <BreakdownStat
          label={t("summaryStats.battery")}
          value={`${chartBatteryKwh.toFixed(1)} kWh`}
        />
        <BreakdownStat
          label={t("summaryStats.co2AvoidedPerYear")}
          value={
            <AnimatedNumber
              value={ecoImpact.co2TonsPerYear}
              decimals={2}
              suffix=" t"
            />
          }
          accent
        />
        <BreakdownStat
          label={t("summaryStats.treeEquivalentPerYear")}
          value={
            <AnimatedNumber
              value={ecoImpact.treeEquivalent}
              decimals={0}
              suffix={` ${t("summaryStats.treeUnit")}`}
            />
          }
          accent
        />
        <BreakdownStat
          label={t("summaryStats.drivingAvoided")}
          value={
            <AnimatedNumber
              value={ecoImpact.carDistanceAvoidedKm}
              decimals={0}
              suffix=" km"
            />
          }
          accent
        />
        <BreakdownStat
          label={t("summaryStats.payback")}
          value={
            paybackPeriodYears > 0 ? (
              <AnimatedNumber
                value={paybackPeriodYears}
                decimals={1}
                suffix={` ${t("summaryStats.yearsShort")}`}
              />
            ) : (
              "—"
            )
          }
        />
        <BreakdownStat
          label={t("summaryStats.monthlySavings")}
          value={formatCurrency(Math.round(estimatedSavingsMonthly))}
          accent
        />
      </div>
    </section>
  );

  const breakdownHardware = (
    <section className="border-t border-[var(--sd-line)] pt-4">
      <div className="mb-2.5 flex items-center gap-2">
        <Package className="size-4 text-[var(--sd-blue-600)]" aria-hidden="true" />
        <h3 className="text-sm font-black text-[var(--sd-ink)]">
          {isThaiLocale ? "สเปกฮาร์ดแวร์" : "Hardware specs"}
        </h3>
      </div>
      <SolarProfileFeatureGrid selectedProfileId={selectedTier} compact />
    </section>
  );

  const requestQuoteLabel = isThaiLocale ? "ขอใบเสนอราคา" : "Request Quote";
  const summaryPanelTitle = t("packageTitle", {
    size: formatNumber(chartSolarKwp),
    tier: localizedTierLabel,
  });

  if (!mounted) {
    return (
      <div className="mx-auto flex min-h-[min(70dvh,40rem)] w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 md:px-12">
      <SolarStatePanel
        kind="loading"
        headingLevel={1}
        title={
          isThaiLocale
            ? "กำลังเตรียมสรุประบบของคุณ"
              : "Preparing your solar summary"
          }
          description={
            isThaiLocale
              ? "กำลังคำนวณข้อมูลจากคำตอบและจัดลำดับตัวเลขสำคัญให้คุณตรวจสอบ"
              : "We’re calculating your recommendation and arranging the key numbers for review."
          }
          soliaAlt={
            isThaiLocale
              ? "Solia กำลังเตรียมสรุประบบโซลาร์"
              : "Solia preparing your solar system summary"
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={summaryRootRef}
      data-solar-motion="summary"
      className="wizard-manga solar-summary min-h-dvh"
    >
      <div className="grid w-full grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,30rem)] xl:items-start xl:gap-7">
        <div className="order-last min-w-0 xl:order-first">
          <div className="sd-safe-pb-46-add mx-auto flex w-full min-w-0 max-w-none flex-col p-3.5 sm:p-4 md:p-6 xl:pb-14">
            {/* Header Ribbon */}
            <div
              data-solar-reveal
              className="solar-summary-ribbon mb-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-[#DED8CF]/60 pb-3"
            >
              <button
                type="button"
                onClick={() => router.push(`/${locale}/wizard`)}
                className="group flex items-center gap-2 text-xs font-bold text-[#4E4B44] transition-colors hover:text-[#1C1C1A] cursor-pointer"
              >
                <ChevronRight className="h-4 w-4 rotate-180 transition-transform group-hover:-translate-x-0.5 stroke-[2.5]" />
                {t("backToWizard")}
              </button>
              <span className="inline-flex items-center gap-2 rounded-full border border-[#DED8CF] bg-white/80 px-3.5 py-1.5 text-xs font-bold text-[#4F7FA8] shadow-none">
                <span className="h-2.5 w-2.5 rounded-full bg-[#B7D1EA] motion-safe:animate-pulse" />
                {t("preliminarySolarDesign")}
              </span>
            </div>

            <section data-solar-reveal className="w-full min-w-0 max-w-full">
              <SolarDepth
                className="solar-depth-panel w-full"
                maxTilt={0.45}
                lift={0}
              >
                <SolarCard className="solar-summary-overview wizard-ui-section w-full min-w-0 max-w-full">
                  <div className="solar-summary-overview-header flex flex-shrink-0 flex-col gap-4 border-b border-[#DED8CF]/70 bg-[#F0EEE9]/60 p-4 sm:p-6 xl:flex-row xl:items-end xl:justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DED8CF] bg-white/80 px-3 py-0.5 text-[11px] font-bold text-[#4F7FA8] shadow-none">
                          <span className="h-2 w-2 rounded-full bg-[#B7D1EA] motion-safe:animate-pulse" />
                          {isThaiLocale ? "ประมาณการสด" : "Live Estimate"}
                        </span>
                      </div>
                      <h1 className="font-serif text-lg font-bold leading-tight tracking-tight text-[#1C1C1A] sm:text-2xl lg:text-3xl">
                        {isThaiLocale
                          ? "แผนพลังงานสำหรับบ้านของคุณพร้อมแล้ว"
                          : "Your home energy plan is ready"}
                      </h1>
                      <p className="mt-1.5 max-w-3xl text-xs font-medium leading-relaxed text-[#4E4B44] sm:text-sm">
                        {isThaiLocale
                          ? "ระบบที่แนะนำประมาณ "
                          : "Recommended system size: "}
                        <AnimatedNumber
                          value={chartSolarKwp}
                          decimals={2}
                          suffix=" kWp"
                        />
                        <span className="mx-1.5 text-slate-400">·</span>
                        {t("preliminaryDesc")}
                      </p>
                    </div>
                    <div
                      role="tablist"
                      aria-label={
                        isThaiLocale ? "มุมมองสรุประบบ" : "Summary views"
                      }
                      className="solar-summary-tablist flex w-full items-center gap-1.5 overflow-x-auto rounded-full border border-[#DED8CF] bg-white/80 p-1.5 shadow-none [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
                    >
                      {[
                        {
                          key: "package",
                          label: isThaiLocale
                            ? "รายละเอียดแพ็กเกจ"
                            : "Package Details",
                        },
                        {
                          key: "energy",
                          label: isThaiLocale
                            ? "กราฟจำลองพลังงาน"
                            : "Energy Flow & Simulator",
                        },
                        {
                          key: "financial",
                          label: isThaiLocale
                            ? "การพยากรณ์การเงิน"
                            : "Financial Forecast",
                        },
                        {
                          key: "impact",
                          label: isThaiLocale
                            ? "ผลกระทบ & สอบถาม"
                            : "Impact & Inquiry",
                        },
                      ].map((tab) => {
                        const isActive = activeDashboardTab === tab.key;
                        return (
                          <button
                            key={tab.key}
                            type="button"
                            data-bagui="tab"
                            id={`summary-tab-${tab.key}`}
                            role="tab"
                            aria-selected={isActive}
                            aria-controls={`summary-panel-${tab.key}`}
                            tabIndex={isActive ? 0 : -1}
                            onKeyDown={(event) =>
                              handleSummaryTabKeyDown(
                                event,
                                tab.key as typeof activeDashboardTab,
                              )
                            }
                            onClick={() =>
                              setActiveDashboardTab(
                                tab.key as typeof activeDashboardTab,
                              )
                            }
                            className={cn(
                              "solar-summary-tab relative flex min-h-10 sm:min-h-11 shrink-0 min-w-max items-center justify-center rounded-lg px-3.5 py-2 text-xs sm:text-sm font-black transition-all duration-150 cursor-pointer whitespace-nowrap",
                              isActive
                                ? "border-2 border-black bg-[#B7D1EA] text-black shadow-none"
                                : "border-2 border-transparent bg-transparent text-slate-600 hover:text-black hover:bg-[#F0EEE9]",
                            )}
                          >
                            <span>{tab.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="w-full min-w-0 max-w-full px-3.5 pb-8 pt-3.5 sm:px-4 sm:pb-10 sm:pt-4 xl:px-5 xl:pb-12">
                    <SolarDecisionCard
                      eyebrow={
                        isThaiLocale
                          ? "ข้อแนะนำสำหรับบ้านของคุณ"
                          : "Recommended for your home"
                      }
                      title={localizedPackageLabel}
                      description={
                        isThaiLocale
                          ? "คำนวณจากค่าไฟ พฤติกรรมการใช้ไฟ และข้อมูลหลังคาของคุณ เพื่อเป็นจุดเริ่มต้นสำหรับการตรวจสอบหน้างาน"
                          : "Matched to your bill, usage pattern, and roof profile as a clear starting point for a site-reviewed design."
                      }
                      statusLabel={
                        isThaiLocale
                          ? "พร้อมให้ทีมงานตรวจสอบ"
                          : "Ready for review"
                      }
                      priceLabel={
                        isThaiLocale
                          ? "ราคาเริ่มต้นโดยประมาณ"
                          : "Estimated investment from"
                      }
                      price={displayPrice}
                      metrics={[
                        {
                          label: isThaiLocale
                            ? "ประหยัดต่อเดือน"
                            : "Estimated savings / mo.",
                          value: formatCurrency(
                            Math.round(estimatedSavingsMonthly),
                          ),
                          detail: isThaiLocale
                            ? `ประมาณ ${estimatedSavingsPercent}% ของค่าไฟที่ปรับแล้ว`
                            : `About ${estimatedSavingsPercent}% of your adjusted bill`,
                          tone: "accent",
                        },
                        {
                          label: isThaiLocale
                            ? "คืนทุนโดยประมาณ"
                            : "Estimated payback",
                          value:
                            paybackPeriodYears > 0 ? (
                              <AnimatedNumber
                                value={paybackPeriodYears}
                                decimals={1}
                                suffix={isThaiLocale ? " ปี" : " yrs"}
                              />
                            ) : (
                              "—"
                            ),
                          detail: isThaiLocale
                            ? "ขึ้นกับการใช้ไฟจริงและการตรวจหน้างาน"
                            : "Depends on actual use and site review",
                          tone: "warm",
                        },
                        {
                          label: isThaiLocale
                            ? "ผลิตไฟฟ้าต่อปี"
                            : "Annual solar yield",
                          value: `${formatNumber(Math.round(annualSolarProductionKwh))} kWh`,
                          detail: isThaiLocale
                            ? "ประมาณการจากชั่วโมงแดดและทิศหลังคา"
                            : "Estimated from sunlight and roof orientation",
                          tone: "plain",
                        },
                      ]}
                      includedLabel={
                        isThaiLocale
                          ? "ชุดประเมินนี้ประกอบด้วย"
                          : "This estimate includes"
                      }
                      includedItems={
                        isThaiLocale
                          ? [
                              t("included.highEfficiencyPanels", { count: formatNumber(estimatedPanelCount) }),
                              t("included.inverterProfile", { type: localizedSystemType }),
                              t("included.roofMounting"),
                            ]
                          : [
                              t("included.highEfficiencyPanels", { count: formatNumber(estimatedPanelCount) }),
                              t("included.inverterProfile", { type: localizedSystemType }),
                              t("included.roofMounting"),
                            ]
                      }
                      primaryLabel={requestQuoteLabel}
                      secondaryLabel={
                        isThaiLocale ? "ปรับค่าประมาณ" : "Adjust estimate"
                      }
                      note={
                        isThaiLocale
                          ? "ประมาณการเบื้องต้นเท่านั้น อุปกรณ์ โครงสร้างหลังคา และตัวเลขสุดท้ายจะยืนยันหลังทีมงานตรวจสอบรายละเอียดหน้างาน"
                          : "Preliminary estimate only. Final equipment, roof structure, and savings are confirmed after the site review."
                      }
                      onPrimary={handleRequestProposalFocus}
                      onSecondary={handleAdjustEstimate}
                    />
                    <motion.div
                      key={activeDashboardTab}
                      id={`summary-panel-${activeDashboardTab}`}
                      role="tabpanel"
                      aria-labelledby={`summary-tab-${activeDashboardTab}`}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
                      className="w-full min-w-0 pb-6"
                    >
                      {activeDashboardTab === "package" && (
                        <div className="w-full rounded-2xl bg-[#F0EEE9] p-3 sm:p-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            {/* Module A: Tech Overview (Spans md:col-span-2) */}
                            <div className="md:col-span-2 flex flex-col justify-between rounded-xl border-2 border-black bg-white p-4 transition-colors">
                              <div>
                                <div className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-black/15 pb-3">
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-black uppercase tracking-[0.16em] text-[#4F7FA8] sm:text-xs">
                                      {locale === "th"
                                        ? "สเปกเทคโนโลยีระดับพรีเมียม"
                                        : "Technical Overview & Hardware"}
                                    </span>
                                    <h3 className="mt-1 text-2xl font-black tracking-tight text-[#000] sm:text-3xl">
                                      {localizedPackageLabel}
                                    </h3>
                                    <p className="mt-1 text-sm font-semibold leading-relaxed text-[#000]/70">
                                      {t("bentoDesc")}
                                    </p>
                                  </div>
                                  <span className="rounded-full border-2 border-black bg-white px-3 py-1 text-xs font-black text-[#000]">
                                    {t("wattProfile", { watts: formatNumber(genericDesignProfile.systemWatts) })}
                                  </span>
                                </div>

                                {/* System Capacity & Conversion Metrics Banner */}
                                <div className="mt-4 rounded-lg border-2 border-black bg-white p-3">
                                  <div className="flex items-baseline justify-between flex-wrap gap-2">
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                      {locale === "th"
                                        ? "กำลังการผลิตติดตั้งระบบสูงสุด"
                                        : "High-Yield System Capacity"}
                                    </span>
                                    <span className="text-2xl sm:text-3xl font-black text-[#000]">
                                      <AnimatedNumber
                                        value={chartSolarKwp}
                                        decimals={2}
                                        suffix=" kWp"
                                      />
                                    </span>
                                  </div>
                                </div>

                                {/* Contact Us Enterprise Callout when kW > 20 */}
                                {(isMatrixContactPrice ||
                                  chartSolarKwp > 20) && (
                                  <div className="mt-3 flex items-start gap-3 rounded-xl border-2 border-black bg-[#B7D1EA]/35 p-3 text-xs font-semibold text-[#4F7FA8] animate-in fade-in-50 duration-200">
                                    <Zap className="h-5 w-5 shrink-0 text-[#4F7FA8] mt-0.5" />
                                    <div>
                                      <span className="font-extrabold block text-sm">
                                        {t("enterpriseSystemTitle", { kwp: chartSolarKwp.toFixed(1) })}
                                      </span>
                                      <p className="mt-1 text-slate-700 leading-5">
                                        {t("enterpriseSystemDescription", { kwp: chartSolarKwp.toFixed(1) })}
                                      </p>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Technical Operating Parameters */}
                              <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                                <div className="rounded-lg border-2 border-black bg-white p-3">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                    {t("paybackLabel")}
                                  </p>
                                  <p className="mt-1 text-xl font-black text-slate-900">
                                    {paybackPeriodYears > 0 ? (
                                      <AnimatedNumber
                                        value={paybackPeriodYears}
                                        decimals={1}
                                        suffix=" ปี"
                                      />
                                    ) : (
                                      "-"
                                    )}
                                  </p>
                                </div>
                                <div className="rounded-lg border-2 border-black bg-white p-3">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                    {t("roofSetupLabel")}
                                  </p>
                                  <p className="mt-1 text-xl font-black text-slate-900">
                                    {`${roofFacingOption.degrees}° · ${roofTiltOption.degrees}°`}
                                  </p>
                                </div>
                                <div className="rounded-lg border-2 border-black bg-white p-3">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                    {t("daytimeLabel")}
                                  </p>
                                  <p className="mt-1 text-xl font-black text-slate-900">
                                    <AnimatedNumber
                                      value={daytimeDemandKwh}
                                      decimals={1}
                                      suffix=" kWh"
                                    />
                                  </p>
                                </div>
                                <div className="rounded-lg border-2 border-black bg-white p-3">
                                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                                    {t("excessLabel")}
                                  </p>
                                  <p className="mt-1 text-xl font-black text-slate-900">
                                    <AnimatedNumber
                                      value={wastedExcessDailyKwh}
                                      decimals={1}
                                      suffix=" kWh"
                                    />
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Module B: Environmental Metrics & Financial Health (Spans md:col-span-1) */}
                            <div className="md:col-span-1 flex flex-col justify-between space-y-4 rounded-xl border-2 border-black bg-white p-4 transition-colors">
                              <div>
                                <div className="flex items-center gap-2.5 border-b-2 border-black/15 pb-3">
                                  <div className="flex h-8 w-8 items-center justify-center rounded-lg border-2 border-black bg-[#B7D1EA] text-[#4F7FA8]">
                                    <Leaf className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <h4 className="text-base font-black text-[#000]">
                                      {t("environmentalImpact25")}
                                    </h4>
                                    <p className="text-xs font-semibold text-slate-500">
                                      {t("environmentalIndexes")}
                                    </p>
                                  </div>
                                </div>

                                {/* Impact Grid */}
                                <div className="mt-3 space-y-2">
                                  <div className="flex items-center justify-between rounded-lg border-2 border-black bg-white p-3">
                                    <span className="text-xs font-bold text-slate-600">
                                      {locale === "th"
                                        ? "ลดก๊าซ CO₂"
                                        : "CO₂ Reduced"}
                                    </span>
                                    <span className="text-base font-black text-[#4F7FA8]">
                                      <AnimatedNumber
                                        value={ecoImpact.co2TonsPerYear}
                                        decimals={2}
                                        suffix=" t/yr"
                                      />
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border-2 border-black bg-white p-3">
                                    <span className="text-xs font-bold text-slate-600">
                                      {locale === "th"
                                        ? "เทียบเท่าปลูกต้นไม้"
                                        : "Trees Planted"}
                                    </span>
                                    <span className="text-base font-black text-[#4F7FA8]">
                                      <AnimatedNumber
                                        value={ecoImpact.treeEquivalent}
                                        decimals={0}
                                        suffix={` ${t("summaryStats.treeUnit")}`}
                                      />
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between rounded-lg border-2 border-black bg-white p-3">
                                    <span className="text-xs font-bold text-slate-600">
                                      {locale === "th"
                                        ? "ลดระยะทางขับรถ"
                                        : "Driving Avoided"}
                                    </span>
                                    <span className="text-base font-black text-[#4F7FA8]">
                                      <AnimatedNumber
                                        value={ecoImpact.carDistanceAvoidedKm}
                                        decimals={0}
                                        suffix=" km"
                                      />
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Financial Index Highlights */}
                              <div className="rounded-lg border-2 border-black bg-[#B7D1EA]/35 p-3">
                                <p className="text-[10px] font-black uppercase tracking-wider text-[#4F7FA8]">
                                  {locale === "th"
                                    ? "ดัชนีผลตอบแทนการประหยัด"
                                    : "Financial Savings Health Index"}
                                </p>
                                <div className="mt-2 flex items-baseline justify-between">
                                  <span className="text-xs font-semibold text-[#1C1C1A]">
                                    {locale === "th"
                                      ? "ประหยัดต่อเดือน"
                                      : "Monthly Savings"}
                                  </span>
                                  <span className="text-lg font-black text-[#000]">
                                    {formatCurrency(
                                      Math.round(estimatedSavingsMonthly),
                                    )}
                                  </span>
                                </div>
                                <div className="mt-1 flex items-baseline justify-between border-t-2 border-black/10 pt-2">
                                  <span className="text-xs font-semibold text-[#1C1C1A]">
                                    {locale === "th"
                                      ? "ประหยัดสะสม 25 ปี"
                                      : "25-Yr Total Savings"}
                                  </span>
                                  <span className="text-lg font-black text-[#4F7FA8]">
                                    {formatCurrency(
                                      Math.round(
                                        estimatedSavingsMonthly * 12 * 25,
                                      ),
                                    )}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 space-y-4">
                            {breakdownHardware}
                            {breakdownStats}
                          </div>
                        </div>
                      )}

                      {activeDashboardTab === "energy" && (
                        <div className="space-y-6 pb-10 w-full min-w-0">
                          <div className="w-full space-y-4">
                            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                              <EnergyMetricCard
                                label="Total Load"
                                value={`${(dailyEnergyDemandKwh + futureLoad / 30).toFixed(1)} kWh`}
                              />
                              <EnergyMetricCard
                                label="Solar Production"
                                value={`${(dailySolarKwh * profileProductionMultiplier).toFixed(1)} kWh`}
                                accent
                              />
                              <EnergyMetricCard
                                label="Exported Elec"
                                value={`${(hasZeroExportAddon ? 0 : Math.max(0, dailyExcessSolarKwh * profileProductionMultiplier - profiledWastedExcessDailyKwh)).toFixed(1)} kWh`}
                              />
                              <EnergyMetricCard
                                label="Excess Waste"
                                value={`${(hasZeroExportAddon ? dailyExcessSolarKwh * profileProductionMultiplier : profiledWastedExcessDailyKwh).toFixed(1)} kWh`}
                                warning
                              />
                            </div>

                            <EnergyFlowChart
                              totalCalculatedSolarKwp={chartSolarKwp}
                              activeBatteryCapacityKwh={chartBatteryKwh}
                              monthlyBill={monthlyBill}
                              electricityRate={effectiveTariffRate}
                              daytimeUsagePct={daytimeUsagePct}
                              batteryMode={getBatteryModeForChart()}
                              futureMonthlyKwh={futureLoad}
                              orientationDegrees={roofFacingOption.degrees}
                              adjustedSunHours={adjustedSunHours}
                              simulatorMultiplier={profileProductionMultiplier}
                              daytimeDemandKwh={daytimeDemandKwh}
                              selfConsumedDailyKwh={
                                profiledSelfConsumedDailyKwh
                              }
                              wastedExcessDailyKwh={
                                hasZeroExportAddon
                                  ? dailyExcessSolarKwh *
                                    profileProductionMultiplier
                                  : profiledWastedExcessDailyKwh
                              }
                            />
                          </div>
                        </div>
                      )}

                      {activeDashboardTab === "financial" && (
                        <div className="space-y-4">
                          <div className="flex flex-col items-stretch gap-2 sm:items-end">
                            <button
                              type="button"
                              onClick={handleFinancialReport}
                              disabled={reportDownloading || isMatrixContactPrice}
                              aria-describedby={
                                isMatrixContactPrice
                                  ? "summary-financial-report-note"
                                  : undefined
                              }
                              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-black bg-white px-4 py-3 text-xs font-black text-slate-800 transition-colors hover:bg-[#A5C2DE] disabled:cursor-wait disabled:opacity-60 sm:w-auto"
                            >
                              <Download className="h-4 w-4" />
                              {!authUser ? (
                                <Lock className="h-3.5 w-3.5 text-slate-500" />
                              ) : null}
                              {reportDownloading
                                ? isThaiLocale
                                  ? "กำลังเตรียมรายงาน..."
                                  : "Preparing report..."
                                : isMatrixContactPrice
                                  ? isThaiLocale
                                    ? "รายงานพร้อมหลังยืนยันราคา"
                                    : "Report available after pricing review"
                                : isThaiLocale
                                  ? "ดาวน์โหลดรายงานการเงินฉบับเต็ม 25 ปี (PDF)"
                                  : "Download Complete 25-Year Financial PDF Report"}
                            </button>
                            {isMatrixContactPrice ? (
                              <p
                                id="summary-financial-report-note"
                                className="max-w-md text-right text-xs font-semibold leading-5 text-[var(--sd-muted)]"
                              >
                                {isThaiLocale
                                  ? "รายงานการเงินฉบับเต็มจะสร้างได้หลังทีมวิศวกรยืนยันราคาและเงื่อนไขหน้างาน"
                                  : "The full financial report becomes available after engineering confirms the project price and site conditions."}
                              </p>
                            ) : null}
                          </div>
                          {isMatrixContactPrice ? (
                            <SolarCard className="p-4">
                              <div className="max-w-2xl">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F7FA8]">
                                  {t("customPricingRequired")}
                                </p>
                                <h3 className="mt-3 text-xl font-black tracking-[-0.025em] text-[#000] sm:text-2xl sm:tracking-[-0.03em]">
                                  {t("customPricingTitle")}
                                </h3>
                                <p className="mt-3 text-sm font-semibold leading-7 text-[#000]/65">
                                  {t("customPricingDescription")}
                                </p>
                              </div>
                            </SolarCard>
                          ) : (
                            <>
                              <SolarCard className="wizard-ui-section space-y-6 p-5 md:p-6">
                                <div className="flex flex-col gap-1 border-b border-neutral-100 pb-3">
                                  <h3 className="text-base font-black tracking-tight text-[#000] sm:text-lg">
                                    {t("solarFinancingSimulator")}
                                  </h3>
                                  <p className="text-xs font-semibold text-[#000]/60">
                                    {t("solarFinancingDescription")}
                                  </p>
                                </div>

                                <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 items-start">
                                  {/* Left Column: Switcher, Sliders, Comparison Bar */}
                                  <div className="space-y-5">
                                    {/* Segmented Control Switcher */}
                                    <div className="space-y-2">
                                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                        {t("paymentMode")}
                                      </label>
                                      <div className="flex items-center gap-1 rounded-xl border-2 border-black bg-[#F0EEE9] p-1 text-xs font-medium">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            setSelectedFinancingId("cash")
                                          }
                                          className={cn(
                                            "flex-1 rounded-lg border-2 border-transparent py-2.5 text-center font-bold transition-all cursor-pointer",
                                            selectedFinancingId === "cash"
                                              ? "border-black bg-[#B7D1EA] text-black shadow-none"
                                              : "text-neutral-500 hover:text-neutral-700",
                                          )}
                                        >
                                          {t("cashOption")}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const bankLoanOptionId =
                                              financialData.financingOptions.find(
                                                (option) =>
                                                  option.financeType ===
                                                  "BANK_LOAN",
                                              )?.id ||
                                              financialData.financingOptions[0]
                                                ?.id ||
                                              null;
                                            setSelectedFinancingId(
                                              bankLoanOptionId,
                                            );
                                          }}
                                          className={cn(
                                            "flex-1 rounded-lg border-2 border-transparent py-2.5 text-center font-bold transition-all cursor-pointer",
                                            selectedFinancingId !== "cash"
                                              ? "border-black bg-[#B7D1EA] text-black shadow-none"
                                              : "text-neutral-500 hover:text-neutral-700",
                                          )}
                                        >
                                          {t("loanOption")}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Sliders (Only if Loan is selected) */}
                                    {selectedFinancingId !== "cash" && (
                                      <div className="space-y-4 animate-fade-in">
                                        {/* Down Payment Slider */}
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                            <span id="summary-down-payment-label">
                                              {t("downPayment")}
                                            </span>
                                            <span className="font-bold text-slate-900">
                                              {downPaymentPct}% (
                                              {formatCurrency(
                                                totalInstallCost *
                                                  (downPaymentPct / 100),
                                              )}
                                              )
                                            </span>
                                          </div>
                                          <input
                                            type="range"
                                            min={0}
                                            max={80}
                                            step={5}
                                            value={downPaymentPct}
                                            aria-labelledby="summary-down-payment-label"
                                            aria-valuetext={`${downPaymentPct}%`}
                                            onChange={(e) =>
                                              setDownPaymentPct(
                                                Number(e.target.value),
                                              )
                                            }
                                            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#E8ECEF] accent-[#B7D1EA] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:bg-[#B7D1EA] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-[#B7D1EA] [&::-webkit-slider-thumb]:shadow-none"
                                          />
                                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                            <span>0%</span>
                                            <span>80%</span>
                                          </div>
                                        </div>

                                        {/* Loan Duration Slider */}
                                        <div className="space-y-1.5">
                                          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                            <span id="summary-loan-duration-label">
                                              {t("loanDuration")}
                                            </span>
                                            <span className="font-bold text-slate-900">
                                              {Math.round(loanTermMonths / 12)}{" "}
                                              ปี ({loanTermMonths} เดือน)
                                            </span>
                                          </div>
                                          <input
                                            type="range"
                                            min={12}
                                            max={120}
                                            step={12}
                                            value={loanTermMonths}
                                            aria-labelledby="summary-loan-duration-label"
                                            aria-valuetext={`${Math.round(loanTermMonths / 12)} ปี`}
                                            onChange={(e) =>
                                              setLoanTermMonths(
                                                Number(e.target.value),
                                              )
                                            }
                                            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[#E8ECEF] accent-[#B7D1EA] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:bg-[#B7D1EA] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:bg-[#B7D1EA] [&::-webkit-slider-thumb]:shadow-none"
                                          />
                                          <div className="flex justify-between text-[9px] font-bold text-slate-400">
                                            <span>1 ปี</span>
                                            <span>10 ปี</span>
                                          </div>
                                        </div>
                                      </div>
                                    )}

                                    {/* Monthly Financial Breakdown Metrics */}
                                    {(() => {
                                      const isLoanMode =
                                        selectedFinancingId !== "cash";
                                      const loanInstallment = isLoanMode
                                        ? cashFlow10Years.fixedLoanInstallment
                                        : 0;
                                      const savingsMonthly =
                                        estimatedSavingsMonthly;
                                      const netOutofPocket =
                                        loanInstallment - savingsMonthly;
                                      const isNetBenefit = netOutofPocket < 0;

                                      return (
                                        <div className="grid grid-cols-1 gap-2.5 rounded-xl border-2 border-black bg-[#F0EEE9] p-3 lg:grid-cols-3">
                                          {/* Solar Monthly Bill Reduction */}
                                          <div className="flex w-full min-w-0 flex-col justify-between">
                                            <span className="text-[10px] font-semibold text-slate-500 leading-tight">
                                              {t("solarSavings")}
                                            </span>
                                            <span className="mt-1 text-sm sm:text-base font-black text-slate-900 leading-tight">
                                              {formatCurrency(savingsMonthly)}
                                              <span className="text-[9px] font-medium text-slate-400 block sm:inline sm:ml-0.5">
                                                {t("monthlyUnit")}
                                              </span>
                                            </span>
                                          </div>

                                          {/* Bank Loan Installment */}
                                          <div className="flex w-full min-w-0 flex-col justify-between lg:border-l lg:border-slate-200/60 lg:pl-2.5">
                                            <span className="text-[10px] font-semibold text-slate-500 leading-tight">
                                              {t("loanInstallment")}
                                            </span>
                                            <span className="mt-1 text-sm sm:text-base font-black text-slate-950 leading-tight">
                                              {formatCurrency(loanInstallment)}
                                              <span className="text-[9px] font-medium text-slate-400 block sm:inline sm:ml-0.5">
                                                {t("monthlyUnit")}
                                              </span>
                                            </span>
                                          </div>

                                          {/* Net Out-of-Pocket Expense */}
                                          <div
                                            className={cn(
                                              "flex w-full min-w-0 flex-col justify-between rounded-r-lg py-0.5 lg:border-l lg:border-slate-200/60 lg:pl-2.5",
                                              isNetBenefit
                                                ? "bg-[#B7D1EA]/35 px-2"
                                                : "bg-white px-2",
                                            )}
                                          >
                                            <span className="text-[10px] font-bold text-slate-500 leading-tight">
                                              {isNetBenefit
                                                ? t("netSaving")
                                                : t("netExpense")}
                                            </span>
                                            <span
                                              className={cn(
                                                "mt-1 text-sm sm:text-base font-black leading-tight",
                                                isNetBenefit
                                                  ? "text-[#4F7FA8]"
                                                  : "text-[#000]",
                                              )}
                                            >
                                              {formatCurrency(
                                                Math.abs(netOutofPocket),
                                              )}
                                              <span className="text-[9px] font-medium text-slate-400 block sm:inline sm:ml-0.5">
                                                {t("monthlyUnit")}
                                              </span>
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })()}

                                    {/* Visual Comparison Bar */}
                                    {(() => {
                                      const baseline = Math.max(
                                        financialSnapshot.currentBill,
                                        financialSnapshot.combinedCost,
                                        1,
                                      );
                                      const oldBillPct =
                                        (financialSnapshot.currentBill /
                                          baseline) *
                                        100;
                                      const newExpensePct =
                                        (financialSnapshot.combinedCost /
                                          baseline) *
                                        100;
                                      const savings =
                                        financialSnapshot.currentBill -
                                        financialSnapshot.combinedCost;
                                      const savingsPct =
                                        (Math.max(0, savings) / baseline) * 100;
                                      const isSaving = savings > 0;

                                      return (
                                        <div className="w-full min-w-0 max-w-full space-y-3 overflow-hidden pt-2">
                                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                                            เปรียบเทียบค่าใช้จ่ายรายเดือน
                                            (Monthly Expense Comparison)
                                          </label>
                                          <div className="space-y-2">
                                            {/* Old Bill Bar */}
                                            <div className="relative h-11 w-full min-w-0 overflow-hidden rounded-xl bg-neutral-100 p-1">
                                              <div
                                                className="flex h-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-slate-900 px-4 text-xs font-bold text-white transition-all duration-300"
                                                style={{
                                                  width: `${oldBillPct}%`,
                                                }}
                                              >
                                                <span className="min-w-0 truncate">
                                                  ค่าไฟเดิมก่อนติดตั้ง (Current
                                                  Bill)
                                                </span>
                                                <span className="shrink-0 truncate">
                                                  {formatCurrency(
                                                    financialSnapshot.currentBill,
                                                  )}
                                                </span>
                                              </div>
                                            </div>

                                            {/* New Expense & Savings Bar */}
                                            <div className="relative flex h-11 w-full min-w-0 overflow-hidden rounded-xl bg-neutral-100 p-1">
                                              {isSaving ? (
                                                <>
                                                  <div
                                                    className="flex h-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-l-lg bg-[#B7D1EA] px-4 text-xs font-bold text-slate-950 transition-all duration-300"
                                                    style={{
                                                      width: `${newExpensePct}%`,
                                                    }}
                                                  >
                                                    <span className="min-w-0 truncate">
                                                      รวมค่าใช้จ่ายใหม่ (New
                                                      Total)
                                                    </span>
                                                    <span className="shrink-0 truncate">
                                                      {formatCurrency(
                                                        financialSnapshot.combinedCost,
                                                      )}
                                                    </span>
                                                  </div>
                                                  <div
                                                    className="flex h-full min-w-0 max-w-full items-center justify-center overflow-hidden rounded-r-lg bg-[#B7D1EA] px-2 text-xs font-black text-white transition-all duration-300 animate-none"
                                                    style={{
                                                      width: `${savingsPct}%`,
                                                    }}
                                                  >
                                                    <span className="min-w-0 truncate">
                                                      ประหยัด{" "}
                                                      {formatCurrency(savings)}
                                                    </span>
                                                  </div>
                                                </>
                                              ) : (
                                                <div
                                                  className="flex h-full min-w-0 max-w-full items-center justify-between gap-2 overflow-hidden rounded-lg bg-[#D5DFD7] px-4 text-xs font-bold text-slate-900 transition-all duration-300"
                                                  style={{
                                                    width: `${newExpensePct}%`,
                                                  }}
                                                >
                                                  <span className="min-w-0 truncate">
                                                    รวมค่าใช้จ่ายใหม่ (New
                                                    Total)
                                                  </span>
                                                  <span className="shrink-0 truncate">
                                                    {formatCurrency(
                                                      financialSnapshot.combinedCost,
                                                    )}
                                                  </span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })()}
                                  </div>

                                  {/* Right Column: Calculations Grid */}
                                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                    {/* Down Payment or Total Investment */}
                                    {selectedFinancingId === "cash" ? (
                                      <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4">
                                        <p className="text-sm font-medium text-slate-500">
                                          เงินลงทุนทั้งหมด (Total Investment)
                                        </p>
                                        <p className="mt-1 font-urbanist text-[28px] font-black tracking-tight text-slate-900">
                                          <AnimatedNumber
                                            value={totalInstallCost}
                                            formatter={(amount) =>
                                              formatCurrency(Math.round(amount))
                                            }
                                          />
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4">
                                        <p className="text-sm font-medium text-slate-500">
                                          เงินดาวน์ชำระ (Down Payment)
                                        </p>
                                        <p className="mt-1 text-[28px] font-black text-slate-900 tracking-tight font-urbanist">
                                          <AnimatedNumber
                                            value={
                                              totalInstallCost *
                                              (downPaymentPct / 100)
                                            }
                                            formatter={(amount) =>
                                              formatCurrency(Math.round(amount))
                                            }
                                          />
                                        </p>
                                      </div>
                                    )}

                                    {/* Financed Amount or Payback Period */}
                                    {selectedFinancingId === "cash" ? (
                                      <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4">
                                        <p className="text-sm font-medium text-slate-500">
                                          ระยะเวลาคืนทุน (Payback Period)
                                        </p>
                                        <p className="mt-1 text-[28px] font-black text-slate-900 tracking-tight font-urbanist">
                                          {paybackPeriodYears > 0 ? (
                                            <AnimatedNumber
                                              value={paybackPeriodYears}
                                              decimals={1}
                                              suffix=" ปี"
                                            />
                                          ) : (
                                            "—"
                                          )}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4">
                                        <p className="text-sm font-medium text-slate-500">
                                          ยอดจัดไฟแนนซ์ (Financed Amount)
                                        </p>
                                        <p className="mt-1 text-[28px] font-black text-slate-900 tracking-tight font-urbanist">
                                          <AnimatedNumber
                                            value={
                                              totalInstallCost *
                                              (1 - downPaymentPct / 100)
                                            }
                                            formatter={(amount) =>
                                              formatCurrency(Math.round(amount))
                                            }
                                          />
                                        </p>
                                      </div>
                                    )}

                                    {/* Loan Payment or 25Y Lifetime Savings */}
                                    {selectedFinancingId === "cash" ? (
                                      <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4 lg:col-span-2">
                                        <p className="text-sm font-medium text-slate-500">
                                          ประหยัดสะสม 25 ปี (25Y Lifetime
                                          Savings)
                                        </p>
                                        <p className="mt-1 text-[28px] font-black text-[#4F7FA8] tracking-tight font-urbanist">
                                          {formatCurrency(
                                            financialData.lifetimeSavings25Years *
                                              (isManualSize
                                                ? manualSolarKwp /
                                                  formulaSolarKwp
                                                : 1),
                                          )}
                                        </p>
                                      </div>
                                    ) : (
                                      <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4 lg:col-span-2">
                                        <p className="text-sm font-medium text-slate-500">
                                          ค่างวดรายเดือนประมาณการ (Est. Loan
                                          Payment)
                                        </p>
                                        <p className="mt-1 text-[28px] font-black text-slate-900 tracking-tight font-urbanist">
                                          {formatCurrency(
                                            financialSnapshot.loanInstallment,
                                          )}
                                        </p>
                                      </div>
                                    )}

                                    {/* Remaining Electricity Bill */}
                                    <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4">
                                      <p className="text-sm font-medium text-slate-500">
                                        ค่าไฟคาดการณ์หลังติดตั้ง (Est. Remaining
                                        Bill)
                                      </p>
                                      <p className="mt-1 text-[28px] font-black text-slate-900 tracking-tight font-urbanist">
                                        {formatCurrency(
                                          financialSnapshot.remainingBill,
                                        )}
                                      </p>
                                    </div>

                                    {/* New Compounded Expense */}
                                    <div className="w-full min-w-0 rounded-xl border-2 border-black bg-white p-4">
                                      <p className="text-sm font-medium text-slate-500">
                                        รวมค่าใช้จ่ายใหม่ (Total New Expense)
                                      </p>
                                      <p className="mt-1 text-[28px] font-black text-slate-900 tracking-tight font-urbanist">
                                        {formatCurrency(
                                          financialSnapshot.combinedCost,
                                        )}
                                      </p>
                                    </div>

                                    {/* Net Monthly Savings (Hero Metric) */}
                                    <div className="wizard-ui-panel flex w-full min-w-0 flex-col justify-between bg-[#B7D1EA]/35 p-5 lg:col-span-2">
                                      <div>
                                        <p className="text-sm font-semibold text-[#4F7FA8]">
                                          ประหยัดรายเดือนสุทธิ (Net Savings /
                                          mo)
                                        </p>
                                        <p className="mt-0.5 text-[10px] font-bold uppercase text-[#4F7FA8]">
                                          รวมประหยัดเฉลี่ยสุทธิต่อเดือน
                                        </p>
                                      </div>
                                      <p className="mt-3 font-urbanist text-3xl font-black tracking-tight text-[#4F7FA8] md:text-4xl">
                                        {formatCurrency(
                                          Math.max(
                                            0,
                                            financialSnapshot.currentBill -
                                              financialSnapshot.combinedCost,
                                          ),
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </SolarCard>
                              <SolarCard className="p-4">
                                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                                  <div>
                                    <div className="flex items-center gap-1.5">
                                      <h3 className="text-base font-black tracking-[-0.02em] text-[#000] sm:text-lg">
                                        25-Year Cumulative Cash Flow Analysis
                                      </h3>
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="quiet"
                                        onClick={() => setShowChartInfo(true)}
                                        className="text-slate-500 hover:text-slate-900"
                                        aria-label="วิธีอ่านกราฟการเงินนี้"
                                      >
                                        <Info aria-hidden="true" />
                                      </Button>
                                    </div>
                                    <p className="mt-1 text-xs font-medium leading-5 text-[#000]/60">
                                      Simulated with self-consumption savings,
                                      panel output depreciation, grid tariff
                                      inflation, and dynamic financing interest
                                      rates.
                                    </p>
                                  </div>
                                  <span className="rounded-full border-2 border-black bg-white px-4 py-2 text-xs font-black text-[#000]">
                                    {formatCurrency(
                                      cashFlow10Years.fixedLoanInstallment,
                                    )}{" "}
                                    / mo
                                  </span>
                                </div>

                                <Dialog
                                  isOpen={showChartInfo}
                                  onClose={() => setShowChartInfo(false)}
                                  size="md"
                                  tone="light"
                                  ariaLabel="วิธีอ่านกราฟการเงินนี้"
                                  closeLabel="ปิดคำอธิบายกราฟ"
                                  className="bg-white"
                                >
                                  <DialogContent>
                                    <DialogHeader className="border-b-2 border-black bg-[#F0EEE9]">
                                      <DialogTitle className="flex items-center gap-2">
                                        <Info
                                          className="h-5 w-5 text-sky-800"
                                          aria-hidden="true"
                                        />
                                        วิธีอ่านกราฟการเงินนี้ (How to read this
                                        chart?)
                                      </DialogTitle>
                                      <DialogDescription>
                                        กราฟนี้เปรียบเทียบเงินลงทุนที่จ่ายจริงกับยอดประหยัดค่าไฟสะสมตลอดอายุระบบ
                                        25 ปี
                                      </DialogDescription>
                                    </DialogHeader>
                                    <DialogBody className="space-y-5 bg-white text-sm leading-6 text-slate-600">
                                      <section className="space-y-2">
                                        <h4 className="font-semibold text-slate-900">
                                          ภาพรวมของกราฟ (What am I looking at?)
                                        </h4>
                                        <ul className="list-disc space-y-2 pl-5">
                                          <li>
                                            <strong className="font-semibold text-slate-800">
                                              เส้นประสีเทา (Cumulative Spent):
                                            </strong>{" "}
                                            ยอดเงินลงทุนจ่ายออกจริง
                                            เริ่มต้นด้วยเงินดาวน์ (ปีที่ 0)
                                            จากนั้นเพิ่มขึ้นตามค่างวดรายปีจนผ่อนชำระธนาคารเสร็จสิ้น
                                          </li>
                                          <li>
                                            <strong className="font-semibold text-slate-800">
                                              เส้นทึบสีเขียว (Cumulative
                                              Savings):
                                            </strong>{" "}
                                            ยอดเงินประหยัดสะสม
                                            โดยคิดค่าเสื่อมแผงโซลาร์รายปี -0.5%
                                            และอัตราเงินเฟ้อค่าไฟฟ้าเฉลี่ย +3.0%
                                            ต่อปี
                                          </li>
                                        </ul>
                                      </section>

                                      <section className="space-y-2 border-t border-border pt-5">
                                        <h4 className="font-semibold text-slate-900">
                                          จุดคุ้มทุนที่แท้จริง (True Payoff
                                          Year)
                                        </h4>
                                        <p>
                                          คือปีที่ยอดเงินประหยัดสะสมตัดผ่านยอดเงินลงทุนจ่ายจริงสะสม
                                          หลังจากจุดนี้ระบบจะสร้างเงินประหยัดสุทธิให้คุณ
                                        </p>
                                      </section>

                                      <section className="space-y-2 border-t border-border pt-5">
                                        <h4 className="font-semibold text-slate-900">
                                          ทำไมตารางถึงเปลี่ยนเป็นสีเขียวตั้งแต่ปีแรกๆ?
                                        </h4>
                                        <p>
                                          ตารางเปรียบเทียบยอดประหยัดสะสมกับยอดค่างวดที่จ่ายถึงปีนั้น
                                          จึงอาจเป็นบวกก่อนสิ้นสุดระยะเวลาผ่อนกู้
                                        </p>
                                        <ul className="list-disc space-y-2 pl-5">
                                          <li>
                                            <strong className="font-semibold text-rose-700">
                                              แถวสีแดง (Net Negative):
                                            </strong>{" "}
                                            ยอดเงินดาวน์และค่างวดสะสมยังสูงกว่าเงินประหยัด
                                          </li>
                                          <li>
                                            <strong className="font-semibold text-[#4F7FA8]">
                                              แถวสีเขียว (Net Positive Cash
                                              Flow):
                                            </strong>{" "}
                                            เงินประหยัดสะสมสูงกว่ายอดค่างวดที่จ่ายแล้ว
                                          </li>
                                        </ul>
                                      </section>
                                    </DialogBody>
                                    <DialogFooter className="border-t-2 border-black bg-[#F0EEE9]">
                                      <Button
                                        type="button"
                                        onClick={() => setShowChartInfo(false)}
                                        className="wizard-ui-primary"
                                      >
                                        เข้าใจแล้ว (Got it)
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>
                                <div className="w-full min-w-0 max-w-full rounded-xl bg-[#F0EEE9] p-3">
                                  <div className="aspect-[16/8] w-full min-w-0 max-w-full">
                                    {mounted ? (
                                      <VisxCashFlowChart
                                        data={cashFlowChartData}
                                        breakevenYear={
                                          cashFlow10Years.breakevenYear
                                        }
                                        ariaLabel={
                                          isThaiLocale
                                            ? "กราฟกระแสเงินสดสะสม 25 ปี เปรียบเทียบเงินประหยัดกับยอดชำระ"
                                            : "25-year cumulative cash flow chart comparing savings and payments"
                                        }
                                        formatCurrency={formatCurrency}
                                        formatCompactCurrency={
                                          formatCompactCurrency
                                        }
                                      />
                                    ) : null}
                                  </div>
                                </div>
                                <div className="mt-4 grid grid-cols-1 gap-2.5 sm:gap-3 lg:grid-cols-3">
                                  <ForecastCard
                                    label={t("payoffYear")}
                                    value={
                                      cashFlow10Years.breakevenYear !== null
                                        ? t("yearsValue", { count: cashFlow10Years.breakevenYear })
                                        : t("over25Years")
                                    }
                                  />
                                  <ForecastCard
                                    label={t("netLifecycleBenefit")}
                                    value={formatCurrency(
                                      cashFlowChartData[
                                        cashFlowChartData.length - 1
                                      ]?.netCashBenefit ?? 0,
                                    )}
                                    accent
                                  />
                                  <ForecastCard
                                    label={t("monthlySavings")}
                                    value={formatCurrency(
                                      estimatedSavingsMonthly,
                                    )}
                                  />
                                </div>
                                <div
                                  className="mt-4 w-full min-w-0 max-w-full touch-pan-x overflow-x-auto overscroll-x-contain rounded-xl border-2 border-black [scrollbar-width:thin]"
                                  tabIndex={0}
                                  role="region"
                                  aria-label={
                                    isThaiLocale
                                      ? "เลื่อนดูตารางประมาณการกระแสเงินสด"
                                      : "Scrollable cash flow forecast table"
                                  }
                                >
                                  <table className="w-full min-w-[760px] border-collapse text-left">
                                    <caption className="sr-only">
                                      {isThaiLocale
                                        ? "ตารางประมาณการกระแสเงินสดสะสม 25 ปี"
                                        : "25-year cumulative cash flow forecast table"}
                                    </caption>
                                    <thead className="border-b-2 border-black/15 bg-[#F0EEE9] text-[#000]/60">
                                      <tr>
                                        <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wider text-left">
                                          {t("yearLabel")}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">
                                          {t("panelOutputEfficiency")}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">
                                          {t("annualSavings")}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">
                                          {t("cumulativeSavingsTable")}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">
                                          {t("cumulativePaymentsTable")}
                                        </th>
                                        <th scope="col" className="px-4 py-3 text-xs font-black uppercase tracking-wider text-right">
                                          {t("netCashBenefit")}
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#000]/5 bg-white">
                                      {cashFlow10Years.flows.map((flow) => {
                                        const isBreakeven =
                                          flow.year ===
                                          cashFlow10Years.breakevenYear;
                                        const isYear0 = flow.year === 0;

                                        return (
                                          <tr
                                            key={flow.year}
                                            className={cn(
                                              "transition-colors text-[14px]",
                                              isBreakeven
                                                ? "bg-[#B7D1EA]/35 text-[#1C1C1A] font-bold"
                                                : "even:bg-[#F0EEE9]",
                                            )}
                                          >
                                            <th scope="row" className="px-4 py-2.5 font-bold text-[#000] text-left">
                                              {isYear0
                                                ? t("yearZero")
                                                : t("yearValue", { year: flow.year })}
                                            </th>
                                            <td className="px-4 py-2.5 text-right font-medium text-slate-500">
                                              {isYear0
                                                ? "—"
                                                : `${(flow.degradationFactor * 100).toFixed(1)}%`}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-[#000]">
                                              {isYear0
                                                ? "—"
                                                : formatCurrency(
                                                    flow.yearSavings,
                                                  )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-semibold text-[#000]">
                                              {isYear0
                                                ? "—"
                                                : formatCurrency(
                                                    flow.cumulativeSavings,
                                                  )}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-medium text-slate-500">
                                              {formatCurrency(
                                                flow.cumulativeInstallments,
                                              )}
                                            </td>
                                            <td
                                              className={cn(
                                                "px-4 py-2.5 text-right font-black",
                                                flow.netCashBenefit >= 0
                                                  ? "text-[#4F7FA8]"
                                                  : "text-rose-600",
                                              )}
                                            >
                                              {formatCurrency(
                                                flow.netCashBenefit,
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                <p className="mt-3 text-[10px] font-semibold leading-5 text-[#000]/50">
                                  * Projections factor in a{" "}
                                  {(
                                    PANEL_ANNUAL_DEGRADATION_RATE * 100
                                  ).toFixed(1)}
                                  % annual solar panel degradation and an
                                  estimated 2.5% annual grid tariff inflation
                                  rate. Net Cash Flow represents cumulative
                                  savings minus cumulative payments (initial
                                  down payment and installments).
                                </p>
                              </SolarCard>
                            </>
                          )}
                        </div>
                      )}

                      {activeDashboardTab === "impact" && (
                        <div className="flex flex-col gap-6 w-full animate-fade-in">
                          {/* Top full-width "Your Green Legacy" banner */}
                          <SolarCard className="wizard-ui-section relative overflow-hidden p-5 sm:p-6">
                            {/* Background screen tone pattern */}
                            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#B7D1EA_1.5px,transparent_1.5px)] opacity-10 [background-size:16px_16px]" />
                            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex items-center gap-4">
                                <div className="flex h-14 w-14 items-center justify-center rounded-xl border-2 border-black bg-[#B7D1EA] text-[#4F7FA8]">
                                  <Leaf className="h-7 w-7" />
                                </div>
                                <div>
                                  <h3 className="text-2xl font-black text-[#000] tracking-tight">
                                    {locale === "th"
                                      ? "มรดกสีเขียวของคุณ (Your Green Legacy)"
                                      : "Your Green Legacy"}
                                  </h3>
                                  <p className="text-sm font-semibold text-[#000]/65 mt-1">
                                    {locale === "th"
                                      ? "ร่วมขับเคลื่อนพลังงานสะอาดและลดการปล่อยคาร์บอนอย่างยั่งยืน"
                                      : "Celebrate your carbon offset contribution and ecosystem footprint."}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="relative z-10 mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                              <ImpactMetricCard
                                label={
                                  locale === "th" ? "ลดก๊าซ CO₂" : "CO₂ Reduced"
                                }
                                value={ecoImpact.co2TonsPerYear}
                                unit="tons / year"
                                iconType="seedling"
                                decimals={2}
                              />
                              <ImpactMetricCard
                                label={
                                  locale === "th"
                                    ? "เทียบเท่าการปลูกต้นไม้"
                                    : "Tree Equivalent"
                                }
                                value={ecoImpact.treeEquivalent}
                                unit={t("journey.treesPerYear")}
                                iconType="earth"
                                decimals={0}
                              />
                              <ImpactMetricCard
                                label={
                                  locale === "th"
                                    ? "ลดระยะทางขับรถยนต์"
                                    : "Car Distance Avoided"
                                }
                                value={ecoImpact.carDistanceAvoidedKm}
                                unit="km / year"
                                iconType="car"
                                decimals={0}
                              />
                            </div>
                          </SolarCard>

                          <SolarNextSteps
                            icon={
                              <ShieldCheck
                                className="size-5"
                                aria-hidden="true"
                              />
                            }
                            title={
                              isThaiLocale
                                ? "หลังจากส่งคำขอ จะเกิดอะไรขึ้น"
                                : "What happens after you request a quote"
                            }
                            description={
                              isThaiLocale
                                ? "ขั้นตอนถัดไปช่วยเปลี่ยนประมาณการนี้ให้เป็นแบบระบบที่ตรวจสอบได้สำหรับบ้านของคุณ"
                                : "The next steps turn this estimate into a site-reviewed system plan for your home."
                            }
                            steps={
                              isThaiLocale
                                ? [
                                    {
                                      title: "ส่งแบบที่คุณเลือก",
                                      description:
                                        "ส่งข้อมูลระบบและช่องทางติดต่อให้ทีมงานตรวจสอบ",
                                    },
                                    {
                                      title: "ตรวจสอบรายละเอียด",
                                      description:
                                        "ทีมงานยืนยันหลังคา อุปกรณ์ และเงื่อนไขหน้างาน",
                                    },
                                    {
                                      title: "รับข้อเสนอที่เหมาะสม",
                                      description:
                                        "รับแบบและใบเสนอราคาที่พร้อมพูดคุยต่อ",
                                    },
                                  ]
                                : [
                                    {
                                      title: "Send your selected plan",
                                      description:
                                        "Share the system profile and best contact details with our team.",
                                    },
                                    {
                                      title: "Review the site details",
                                      description:
                                        "We confirm roof conditions, equipment, and installation requirements.",
                                    },
                                    {
                                      title: "Receive a reviewed proposal",
                                      description:
                                        "Get a clearer design and quotation ready for the next conversation.",
                                    },
                                  ]
                            }
                          />

                          {/* Integrated Inline Proposal Inquiry Section */}
                          <div ref={inquiryPanelRef} className="w-full">
                            <div
                              className={cn(
                                "w-full transition-all duration-500 ease-in-out bg-transparent p-0 border-0 shadow-none",
                                formFocusPulse &&
                                  "rounded-xl bg-[#B7D1EA]/20 p-4 ring-2 ring-[#B7D1EA]/40",
                              )}
                            >
                              {inquiryPanelState === "impact-only" ? (
                                <GsapReveal key="impact-only">
                                  <div className="flex flex-col items-center gap-4 rounded-2xl bg-[#F0EEE9] p-4 sm:flex-row sm:items-start sm:p-5">
                                    <Image
                                      src="/asset/solia-blueprint.webp"
                                      alt="Solia Mascot"
                                      width={96}
                                      height={112}
                                      className="h-24 w-20 shrink-0 object-contain"
                                    />
                                    <div className="text-center sm:text-left">
                                      <h3 className="text-lg font-black tracking-tight text-[#000]">
                                        {locale === "th"
                                          ? "พร้อมสำหรับแบบแปลนระบบโซลาร์ของคุณแล้วหรือยัง?"
                                          : "Ready for Your Custom Solar Blueprint?"}
                                      </h3>
                                      <p className="mt-1.5 text-xs font-semibold leading-relaxed text-[#000]/65 sm:text-sm">
                                        {locale === "th"
                                          ? "ทีมวิศวกรผู้เชี่ยวชาญของเราจะรีวิวการกำหนดค่าโครงสร้างอย่างละเอียด เพื่อรับรองความปลอดภัยและออกแบบระบบที่เหมาะสมที่สุดสำหรับบ้านคุณ"
                                          : "Our certified engineering team will review your selected configuration, verify structural compatibility, and refine the design for your specific home."}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="mt-4 grid grid-cols-1 gap-2 rounded-xl bg-[#F0EEE9] p-2.5 shadow-inner shadow-[#000]/5 sm:grid-cols-3">
                                    <ProposalContextItem
                                      label={t("journey.profile")}
                                      value={localizedTierLabel}
                                      helper={localizedTierEquipment}
                                    />
                                    <ProposalContextItem
                                      label={t("summaryStats.systemSize")}
                                      value={
                                        <AnimatedNumber
                                          value={chartSolarKwp}
                                          decimals={2}
                                          suffix=" kWp"
                                        />
                                      }
                                      helper={t("journey.liveFromSimulator")}
                                    />
                                    <ProposalContextItem
                                      label={t("journey.estimatedPrice")}
                                      value={
                                        isMatrixContactPrice ? (
                                          displayPrice
                                        ) : (
                                          <AnimatedNumber
                                            value={totalInstallCost}
                                            formatter={(amount) =>
                                              formatCurrency(Math.round(amount))
                                            }
                                          />
                                        )
                                      }
                                      helper={t("journey.beforeSiteReview")}
                                    />
                                  </div>
                                  <ProposalAddonsAdvisory
                                    activeAddonsCatalog={activeAddonsCatalog}
                                    selectedAddonIds={selectedAddonIds}
                                    setSelectedAddonIds={setSelectedAddonIds}
                                    formatCurrency={formatCurrency}
                                  />
                                </GsapReveal>
                              ) : null}

                              {inquiryPanelState === "auth-prompt" ? (
                                <GsapReveal key="auth-prompt">
                                  <div className="grid items-center gap-3 rounded-2xl bg-white p-3 sm:grid-cols-[104px_1fr] sm:gap-4 sm:p-4">
                                    <Image
                                      src="/asset/solia-greeting.webp"
                                      alt="Solia Mascot"
                                      width={132}
                                      height={132}
                                      className="mx-auto h-24 w-24 object-contain sm:h-28 sm:w-28"
                                    />
                                    <div>
                                      <h3 className="text-lg font-black tracking-tight text-[#000] sm:text-xl">
                                        {locale === "th"
                                          ? "ให้ Solia ช่วยบันทึกใบเสนอราคานะคะ!"
                                          : "Let Solia Save Your Estimate!"}
                                      </h3>
                                      <p className="mt-1.5 text-xs font-semibold leading-5 text-[#000]/65 sm:mt-2 sm:text-sm sm:leading-7">
                                        {locale === "th"
                                          ? "เข้าสู่ระบบเพื่อบันทึกข้อมูล ติดตามสถานะ และรับข่าวสารพลังงานสะอาดจากเรา"
                                          : "Sign in to save your calculations, track status updates, and download your blueprints."}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={handleProposalLogin}
                                    disabled={registrationSubmitting}
                                    className="wizard-ui-primary mt-4 w-full px-5 py-3.5 text-sm cursor-pointer"
                                  >
                                    <LogIn className="h-4 w-4" />
                                    <span className="z-10">
                                      {registrationSubmitting
                                        ? "กำลังบันทึกแบบ..."
                                        : locale === "th"
                                          ? "เข้าสู่ระบบ / สมัครสมาชิก"
                                          : "Sign In / Registration"}
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setInquiryPanelState("inquiry-form")
                                    }
                                    className="wizard-ui-secondary mt-3 w-full px-5 py-2.5 text-sm"
                                  >
                                    ดำเนินการต่อโดยไม่เข้าสู่ระบบ
                                  </button>
                                </GsapReveal>
                              ) : null}

                              {inquiryPanelState === "inquiry-form" ? (
                                <GsapRevealForm
                                  key="inquiry-form"
                                  ref={proposalFormRef}
                                  data-analytics-form="wizard_consultation"
                                  data-analytics-submit-event="quotation_requested"
                                  onSubmit={handleConsultationSubmit}
                                >
                                  <div className="mb-4 flex items-start justify-between gap-3 border-b border-gray-100 pb-3">
                                    <div>
                                      <h3 className="text-lg font-black tracking-[-0.02em] text-[#000] sm:text-xl">
                                        {consultationCopy.title}
                                      </h3>
                                      <p className="mt-1 text-xs font-medium leading-5 text-[#000]/60 sm:text-sm">
                                        {authUser
                                          ? "ข้อมูลบัญชีถูกเติมให้แล้ว ตรวจสอบและส่งคำขอได้เลยค่ะ"
                                          : consultationCopy.subtitle}
                                      </p>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setInquiryPanelState("impact-only")
                                      }
                                      className="wizard-ui-secondary px-3.5 py-2 text-xs"
                                    >
                                      {t("backLabel")}
                                    </button>
                                  </div>
                                  <div className="mb-5 grid grid-cols-1 gap-2 rounded-xl bg-[#F0EEE9] p-3 shadow-inner shadow-[#000]/5 lg:grid-cols-3">
                                    <ProposalContextItem
                                      label={t("journey.profile")}
                                      value={localizedTierLabel}
                                      helper={localizedTierEquipment}
                                    />
                                    <ProposalContextItem
                                      label={t("summaryStats.systemSize")}
                                      value={
                                        <AnimatedNumber
                                          value={chartSolarKwp}
                                          decimals={2}
                                          suffix=" kWp"
                                        />
                                      }
                                      helper={t("journey.liveFromSimulator")}
                                    />
                                    <ProposalContextItem
                                      label={t("journey.estimatedPrice")}
                                      value={
                                        isMatrixContactPrice ? (
                                          displayPrice
                                        ) : (
                                          <AnimatedNumber
                                            value={totalInstallCost}
                                            formatter={(amount) =>
                                              formatCurrency(Math.round(amount))
                                            }
                                          />
                                        )
                                      }
                                      helper={t("journey.beforeSiteReview")}
                                    />
                                  </div>
                                  <ProposalAddonsAdvisory
                                    activeAddonsCatalog={activeAddonsCatalog}
                                    selectedAddonIds={selectedAddonIds}
                                    setSelectedAddonIds={setSelectedAddonIds}
                                    formatCurrency={formatCurrency}
                                  />

                                  {/* Clean 2-Column Inline Field Format */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <ConsultationField
                                      label={consultationCopy.name}
                                    >
                                      <input
                                        value={consultationName}
                                        onChange={(event) =>
                                          setConsultationName(
                                            event.target.value,
                                          )
                                        }
                                        required
                                        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold text-[#000] outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                        placeholder={
                                          authDefaults.name ||
                                          (isThaiLocale
                                            ? "ชื่อของคุณหรือชื่อบริษัท"
                                            : "Your name or company")
                                        }
                                      />
                                    </ConsultationField>

                                    <ConsultationField
                                      label={consultationCopy.taxId}
                                    >
                                      <input
                                        value={consultationTaxId}
                                        onChange={(event) =>
                                          setConsultationTaxId(
                                            event.target.value,
                                          )
                                        }
                                        inputMode="numeric"
                                        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold text-[#000] outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                        placeholder={
                                          isThaiLocale
                                            ? "เลข 13 หลัก"
                                            : "13 digits"
                                        }
                                      />
                                    </ConsultationField>

                                    <ConsultationField
                                      label={consultationCopy.email}
                                    >
                                      <input
                                        type="email"
                                        value={consultationEmail}
                                        onChange={(event) =>
                                          setConsultationEmail(
                                            event.target.value,
                                          )
                                        }
                                        required={!authUser?.email}
                                        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold text-[#000] outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                        placeholder={
                                          authDefaults.email ||
                                          "name@example.com"
                                        }
                                      />
                                    </ConsultationField>

                                    <ConsultationField
                                      label={consultationCopy.phone}
                                    >
                                      <input
                                        value={consultationPhone}
                                        onChange={(event) =>
                                          setConsultationPhone(
                                            event.target.value,
                                          )
                                        }
                                        required
                                        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold text-[#000] outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                        placeholder={
                                          authDefaults.phone || "08x-xxx-xxxx"
                                        }
                                      />
                                    </ConsultationField>

                                    <ConsultationField
                                      label={consultationCopy.postalCode}
                                    >
                                      <input
                                        value={consultationPostalCode}
                                        onChange={(event) =>
                                          setConsultationPostalCode(
                                            event.target.value,
                                          )
                                        }
                                        required
                                        inputMode="numeric"
                                        className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold text-[#000] outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                        placeholder={
                                          isThaiLocale
                                            ? "เช่น 10110"
                                            : "e.g. 10110"
                                        }
                                      />
                                    </ConsultationField>

                                    <ConsultationField
                                      label={consultationCopy.preferredDateTime}
                                    >
                                      <div className="relative">
                                        <Calendar className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#000]/50" />
                                        <input
                                          type="datetime-local"
                                          value={consultationDateTime}
                                          onChange={(event) =>
                                            setConsultationDateTime(
                                              event.target.value,
                                            )
                                          }
                                          required
                                          className="w-full rounded-xl border border-neutral-200 bg-white py-3 pl-10 pr-3.5 text-sm font-semibold text-[#000] outline-none transition-all [color-scheme:light] focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                        />
                                      </div>
                                    </ConsultationField>

                                    <div className="md:col-span-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setConsultationLocationOpen(
                                            (open) => !open,
                                          )
                                        }
                                        className="flex min-h-12 w-full items-center justify-between rounded-xl border-2 border-black bg-white px-3.5 text-left text-sm font-black text-[#000] transition-all duration-300 ease-expo-out hover:bg-[#F0EEE9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/20"
                                        aria-expanded={consultationLocationOpen}
                                      >
                                        <span className="flex min-w-0 items-center gap-2">
                                          <MapPin className="h-4 w-4 text-[#2C486A]" />
                                          <span className="truncate">
                                            {consultationLocation?.displayName ||
                                              (isThaiLocale
                                                ? "ปักหมุดตำแหน่งติดตั้ง"
                                                : "Pin installation location")}
                                          </span>
                                        </span>
                                        <span className="shrink-0 text-xs font-bold text-slate-500">
                                          {isThaiLocale
                                            ? "ไม่บังคับ"
                                            : "Optional"}
                                        </span>
                                      </button>
                                      {consultationLocationOpen ? (
                                        <div className="mt-3">
                                          <ServiceLocationPicker
                                            locale={locale}
                                            value={consultationLocation}
                                            onChange={setConsultationLocation}
                                          />
                                        </div>
                                      ) : null}
                                    </div>

                                    <div className="md:col-span-2">
                                      <ConsultationField
                                        label={consultationCopy.remarks}
                                      >
                                        <textarea
                                          value={consultationRemarks}
                                          onChange={(event) =>
                                            setConsultationRemarks(
                                              event.target.value,
                                            )
                                          }
                                          rows={3}
                                          className="w-full resize-none rounded-xl border border-neutral-200 bg-white px-3.5 py-3 text-sm font-semibold leading-6 text-[#000] outline-none transition-all focus:border-slate-900 focus:ring-2 focus:ring-slate-900/20"
                                          placeholder={consultationCopy.remarks}
                                        />
                                      </ConsultationField>
                                    </div>
                                  </div>

                                  {!authUser ? (
                                    <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border-2 border-black bg-[#B7D1EA]/25 p-3.5 text-xs font-semibold leading-5 text-slate-700">
                                      <input
                                        type="checkbox"
                                        checked={guestAccountOptIn}
                                        onChange={(event) =>
                                          setGuestAccountOptIn(
                                            event.target.checked,
                                          )
                                        }
                                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-black accent-slate-900 focus:ring-2 focus:ring-[#B7D1EA]"
                                      />
                                      <span>
                                        {isThaiLocale
                                          ? "สร้างโปรไฟล์บัญชีของฉันโดยอัตโนมัติ เพื่อติดตามสถานะข้อเสนอจากฝ่ายวิศวกรรม การส่งมอบเอกสาร และอัปเดตแบบเรียลไทม์"
                                          : "Automatically generate my account profile to track engineering proposal status, document handovers, and live updates."}
                                      </span>
                                    </label>
                                  ) : null}

                                  {/* Native Full Width Action Button */}
                                  <button
                                    type="submit"
                                    disabled={consultationSubmitting}
                                    className="wizard-ui-primary mt-6 w-full px-6 py-4 text-base disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
                                  >
                                    {consultationSubmitting
                                      ? consultationCopy.submitting
                                      : locale === "th"
                                        ? "ส่งคำขอแบบแปลนระบบและปรึกษาฟรี"
                                        : "Request Blueprint & Consultation"}
                                  </button>

                                  {consultationFeedback ? (
                                    <div
                                      className={cn(
                                        "mt-3 rounded-xl border px-3 py-2.5 text-sm font-bold",
                                        consultationFeedback.type === "success"
                                          ? "border-[#4AA382]/25 bg-[#4AA382]/10 text-[#2F7B61]"
                                          : "border-rose-200 bg-rose-50 text-rose-700",
                                      )}
                                    >
                                      {consultationFeedback.message}
                                    </div>
                                  ) : null}
                                  {guestProposalSuccess && guestAccountOptIn ? (
                                    <div
                                      className="mt-3 rounded-xl border-2 border-black bg-[#B7D1EA]/25 p-3"
                                      role="status"
                                    >
                                      <p className="text-sm font-black text-slate-900">
                                        {isThaiLocale
                                          ? "คำขอสำเร็จแล้ว สร้างบัญชีเพื่อดูสถานะต่อได้"
                                          : "Your request is complete. Create an account to track it."}
                                      </p>
                                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600">
                                        {isThaiLocale
                                          ? "เราได้ลองส่งลิงก์เข้าสู่ระบบแบบไม่ใช้รหัสผ่านไปยังอีเมลของคุณแล้ว หรือเลือก Google เพื่อดำเนินการทันที"
                                          : "We attempted to send a passwordless sign-in link to your email. You can also continue with Google now."}
                                      </p>
                                      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            void handleGoogleRegistration(
                                              "PROPOSAL",
                                            )
                                          }
                                          disabled={registrationSubmitting}
                                          className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-black text-slate-900 ring-1 ring-slate-200 transition-colors hover:bg-neutral-50 disabled:cursor-wait disabled:opacity-60"
                                        >
                                          <GoogleIcon className="h-4 w-4" />
                                          {isThaiLocale
                                            ? "ดำเนินการต่อด้วย Google"
                                            : "Continue with Google"}
                                        </button>
                                        <Link
                                          href={`/${locale}/register?next=${encodeURIComponent(`/${locale}/wizard/summary`)}`}
                                          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl px-4 py-2.5 text-xs font-black text-slate-700 transition-colors hover:bg-white"
                                        >
                                          {isThaiLocale
                                            ? "ลงทะเบียนด้วยอีเมล"
                                            : "Register with email"}
                                        </Link>
                                      </div>
                                    </div>
                                  ) : null}
                                </GsapRevealForm>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  </div>
                </SolarCard>
              </SolarDepth>
            </section>
            {activeDashboardTab === "package" ? (
              <SummaryJourneySection
                co2TonsPerYear={ecoImpact.co2TonsPerYear}
                treeEquivalent={ecoImpact.treeEquivalent}
                carDistanceAvoidedKm={ecoImpact.carDistanceAvoidedKm}
                selectedTierLabel={localizedTierLabel}
                chartSolarKwp={chartSolarKwp}
                displayPrice={displayPrice}
                isMatrixContactPrice={isMatrixContactPrice}
                totalInstallCost={totalInstallCost}
                estimatedSavingsMonthly={estimatedSavingsMonthly}
                activeAddonsCatalog={activeAddonsCatalog}
                selectedAddonIds={selectedAddonIds}
                setSelectedAddonIds={setSelectedAddonIds}
                formatCurrency={formatCurrency}
                onRequestQuote={handleRequestProposalFocus}
              />
            ) : null}
          </div>
        </div>

        <WizardSummarySidebar
          title={summaryPanelTitle}
          description={
            isThaiLocale
              ? "ปรับแพ็กเกจและพารามิเตอร์เพื่อดูกราฟที่อัปเดตทันที"
              : "Tune the package and live parameters while the canvas updates instantly."
          }
          liveLabel={isThaiLocale ? "ปรับแบบทันที" : "Live controls"}
          detailsLabel={isThaiLocale ? "ดูรายละเอียด" : "View Breakdown"}
          closeDetailsLabel={
            isThaiLocale
              ? "\u0e1b\u0e34\u0e14\u0e2b\u0e19\u0e49\u0e32\u0e15\u0e48\u0e32\u0e07"
              : "Close details"
          }
          systemSizeLabel={
            isThaiLocale
              ? "\u0e02\u0e19\u0e32\u0e14\u0e23\u0e30\u0e1a\u0e1a"
              : "System size"
          }
          totalInvestmentLabel={
            isThaiLocale
              ? "\u0e25\u0e07\u0e17\u0e38\u0e19\u0e17\u0e31\u0e49\u0e07\u0e2b\u0e21\u0e14"
              : "Total investment"
          }
          monthlySavingsLabel={
            isThaiLocale
              ? "\u0e1b\u0e23\u0e30\u0e2b\u0e22\u0e31\u0e14\u0e15\u0e48\u0e2d\u0e40\u0e14\u0e37\u0e2d\u0e19"
              : "Monthly savings"
          }
          systemSize={
            <AnimatedNumber value={chartSolarKwp} decimals={2} suffix=" kWp" />
          }
          totalPrice={
            isMatrixContactPrice ? (
              displayPrice
            ) : (
              <AnimatedNumber
                value={totalInstallCost}
                formatter={(amount) => formatCurrency(Math.round(amount))}
              />
            )
          }
          monthlySavings={formatCurrency(Math.round(estimatedSavingsMonthly))}
          requestQuoteLabel={requestQuoteLabel}
          onRequestQuote={handleRequestProposalFocus}
          soliaAlt={
            isThaiLocale
              ? "Solia กำลังช่วยอธิบายแผนพลังงานของคุณ"
              : "Solia helping you understand your live solar plan"
          }
          soliaMessage={
            isThaiLocale
              ? "ปรับแพ็กเกจหรือค่าจำลองได้เลยค่ะ ตัวเลขด้านล่างจะอัปเดตให้เห็นผลทันที"
              : "Tune the package or simulator. I’ll keep the important numbers visible as they update."
          }
        >
          <div className="space-y-5">
            <section
              aria-labelledby="summary-package-controls"
              className="space-y-3"
            >
              <div className="flex items-center justify-between gap-3 border-b-2 border-black pb-2">
                <h3
                  id="summary-package-controls"
                  className="text-sm font-black text-black"
                >
                  {isThaiLocale ? "เลือกแพ็กเกจ" : "Package tier"}
                </h3>
                <span className="border-2 border-black bg-[#B7D1EA] px-2 py-0.5 text-[9px] font-black text-black">
                  {localizedTierLabel}
                </span>
              </div>
              <SolarProfileSelectorSummary
                selectedProfileId={selectedTier}
                onProfileChange={handleTierSelect}
                totalPriceLabel={displayPrice}
                ecoImpact={ecoImpact}
                monthlySavingsLabel={formatCurrency(estimatedSavingsMonthly)}
              />
            </section>

            {breakdownHardware}
            {breakdownStats}

            <section
              aria-labelledby="summary-simulation-controls"
              className="space-y-3 border-t-2 border-black pt-4"
            >
              <div className="flex items-center justify-between gap-3 border-b-2 border-black pb-2">
                <h3
                  id="summary-simulation-controls"
                  className="text-sm font-black text-black"
                >
                  {t("simulationControls")}
                </h3>
                <span className="text-[10px] font-bold text-slate-600">
                  {t("autoLabel")} / {t("manualLabel")}
                </span>
              </div>
              {simulatorControls}
            </section>

            {addonControls}

            <button
              type="button"
              onClick={() => void handleSaveConfiguration()}
              disabled={saveSubmitting}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 border-2 border-black bg-[#F0EEE9] px-4 py-2.5 text-xs font-black text-black transition-[background-color,transform,box-shadow] duration-200 ease-expo hover:-translate-y-0.5 hover:bg-[#A5C2DE] hover:shadow-none active:translate-x-0.5 active:translate-y-0.5 active:shadow-none disabled:cursor-wait disabled:opacity-60"
            >
              <Save className="size-4" aria-hidden="true" />
              {saveSubmitting
                ? isThaiLocale
                  ? "กำลังบันทึก..."
                  : "Saving..."
                : isThaiLocale
                  ? "บันทึกการออกแบบไว้ดูภายหลัง"
                  : "Save this design for later"}
            </button>
          </div>
        </WizardSummarySidebar>

        {detailProduct ? (
          <ProductDetailModal
            product={detailProduct}
            onClose={() => setDetailProduct(null)}
          />
        ) : null}

        {swapLine && swapCategory ? (
          <SwapProductModal
            line={swapLine}
            category={swapCategory}
            onSelect={handleSwapSelect}
            onClose={() => setSwapLine(null)}
          />
        ) : null}

        <ProgressiveRegistrationDialog
          open={registrationIntent !== null}
          intent={registrationIntent ?? "SAVE"}
          solarKwp={chartSolarKwp}
          isThaiLocale={isThaiLocale}
          emailHref={`/${locale}/register?next=${encodeURIComponent(`/${locale}/wizard/summary`)}`}
          submitting={registrationSubmitting}
          onGoogle={() =>
            void handleGoogleRegistration(registrationIntent ?? "SAVE")
          }
          onClose={() => setRegistrationIntent(null)}
        />

      </div>
    </div>
  );
}

type SummaryJourneySectionProps = Readonly<{
  co2TonsPerYear: number;
  treeEquivalent: number;
  carDistanceAvoidedKm: number;
  selectedTierLabel: string;
  chartSolarKwp: number;
  displayPrice: ReactNode;
  isMatrixContactPrice: boolean;
  totalInstallCost: number;
  estimatedSavingsMonthly: number;
  activeAddonsCatalog: SolarAddonConfig[];
  selectedAddonIds: string[];
  setSelectedAddonIds: React.Dispatch<React.SetStateAction<string[]>>;
  formatCurrency: (value: number) => string;
  onRequestQuote: () => void;
}>;

function SummaryJourneySection({
  co2TonsPerYear,
  treeEquivalent,
  carDistanceAvoidedKm,
  selectedTierLabel,
  chartSolarKwp,
  displayPrice,
  isMatrixContactPrice,
  totalInstallCost,
  estimatedSavingsMonthly,
  activeAddonsCatalog,
  selectedAddonIds,
  setSelectedAddonIds,
  formatCurrency,
  onRequestQuote,
}: SummaryJourneySectionProps) {
  const t = useTranslations("WizardSummary");
  const steps = [
    {
      title: t("journey.sendPlanTitle"),
      description: t("journey.sendPlanDescription"),
    },
    {
      title: t("journey.reviewSiteTitle"),
      description: t("journey.reviewSiteDescription"),
    },
    {
      title: t("journey.receiveProposalTitle"),
      description: t("journey.receiveProposalDescription"),
    },
  ];

  return (
    <div
      data-bagui="journey-handoff"
      data-solar-reveal
      className="solar-summary-journey mt-5 space-y-5"
    >
      <section className="solar-summary-legacy-panel rounded-[var(--sd-radius-panel)] p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="solar-summary-legacy-icon grid size-11 shrink-0 place-items-center rounded-xl">
            <Leaf className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="solar-route-kicker">{t("journey.impactEyebrow")}</p>
            <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--sd-ink)]">
              {t("journey.impactTitle")}
            </h3>
            <p className="mt-1 text-sm font-medium leading-6 text-[var(--sd-text)]">
              {t("journey.impactDescription")}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ImpactMetricCard
            label={t("journey.co2Reduced")}
            value={co2TonsPerYear}
            unit={t("journey.unitPerYear")}
            iconType="seedling"
            decimals={2}
          />
          <ImpactMetricCard
            label={t("journey.treeEquivalent")}
            value={treeEquivalent}
            unit={t("journey.treesPerYear")}
            iconType="earth"
            decimals={0}
          />
          <ImpactMetricCard
            label={t("journey.drivingAvoided")}
            value={carDistanceAvoidedKm}
            unit={t("journey.kmPerYear")}
            iconType="car"
            decimals={0}
          />
        </div>
      </section>

      <SolarNextSteps
        icon={<ShieldCheck className="size-5" aria-hidden="true" />}
        title={t("journey.nextStepsTitle")}
        description={t("journey.nextStepsDescription")}
        steps={steps}
      />

      <section className="solar-summary-blueprint-panel overflow-hidden rounded-[var(--sd-radius-panel)] p-5 sm:p-6">
        <div className="grid items-center gap-5 md:grid-cols-[6.5rem_minmax(0,1fr)]">
          <div className="solar-summary-blueprint-art relative mx-auto h-28 w-24 overflow-hidden rounded-2xl md:mx-0">
            <SoliaGuide
              pose="blueprint"
              alt={t("journey.blueprintAlt")}
              className="h-full w-full"
              imageSizes="96px"
            />
          </div>
          <div className="min-w-0">
            <p className="solar-route-kicker">{t("journey.blueprintEyebrow")}</p>
            <h3 className="mt-1 text-xl font-black tracking-[-0.03em] text-[var(--sd-ink)]">
              {t("journey.blueprintTitle")}
            </h3>
            <p className="mt-1.5 max-w-2xl text-sm font-medium leading-6 text-[var(--sd-text)]">
              {t("journey.blueprintDescription")}
            </p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <ProposalContextItem label={t("journey.profile")} value={selectedTierLabel} helper={`${chartSolarKwp.toFixed(2)} kWp`} />
          <ProposalContextItem
            label={t("journey.estimatedPrice")}
            value={isMatrixContactPrice ? displayPrice : formatCurrency(Math.round(totalInstallCost))}
            helper={t("journey.beforeSiteReview")}
          />
          <ProposalContextItem
            label={t("journey.monthlySavings")}
            value={formatCurrency(Math.round(estimatedSavingsMonthly))}
            helper={t("journey.currentEstimate")}
          />
          <ProposalContextItem label={t("journey.review")} value={t("journey.engineering")} helper={t("journey.siteValidation")} />
        </div>
        <Button
          type="button"
          data-bagui="button"
          onClick={onRequestQuote}
          className="wizard-ui-primary mt-4 w-full rounded-full px-5 py-3.5 text-sm font-black sm:w-auto"
        >
          <Zap className="size-4" aria-hidden="true" />
          {t("journey.requestEngineeringReview")}
          <ArrowRight className="size-4" aria-hidden="true" />
        </Button>
      </section>

      <ProposalAddonsAdvisory
        activeAddonsCatalog={activeAddonsCatalog}
        selectedAddonIds={selectedAddonIds}
        setSelectedAddonIds={setSelectedAddonIds}
        formatCurrency={formatCurrency}
      />
    </div>
  );
}

function ProposalAddonsAdvisory({
  activeAddonsCatalog,
  selectedAddonIds,
  setSelectedAddonIds,
  formatCurrency,
}: {
  activeAddonsCatalog: SolarAddonConfig[];
  selectedAddonIds: string[];
  setSelectedAddonIds: React.Dispatch<React.SetStateAction<string[]>>;
  formatCurrency: (val: number) => string;
}) {
  const t = useTranslations("WizardSummary");

  const visibleAddons = useMemo(() => {
    return activeAddonsCatalog.filter((item) => item.isVisible !== false);
  }, [activeAddonsCatalog]);

  if (visibleAddons.length === 0) return null;

  const selectedCount = visibleAddons.filter((addon) => {
    const allOptionIds = new Set<string>([addon.id]);
    addon.optionsList?.forEach((opt) => {
      allOptionIds.add(opt.id);
      allOptionIds.add(`${addon.id}_${opt.id}`);
    });
    return selectedAddonIds.some((id) => allOptionIds.has(id));
  }).length;

  return (
    <div className="solar-recommendation-panel my-5 rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 shadow-[var(--sd-shadow-1)] sm:p-5">
      <div className="mb-4 flex flex-col justify-between gap-2 border-b border-[var(--sd-line)] pb-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            </span>
            <h4 className="text-sm font-black text-[var(--sd-ink)]">{t("addons.title")}</h4>
          </div>
          <p className="mt-1 text-xs font-semibold leading-relaxed text-[var(--sd-muted)]">{t("addons.description")}</p>
        </div>
        {selectedCount > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--sd-blue-600)]/25 bg-[var(--sd-selected)] px-3 py-1 text-xs font-black text-[var(--sd-blue-600)]">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t("addons.selected", { count: selectedCount })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {visibleAddons.map((addon) => {
          const allOptionIds = new Set<string>();
          allOptionIds.add(addon.id);
          addon.optionsList?.forEach((opt) => {
            allOptionIds.add(opt.id);
            allOptionIds.add(`${addon.id}_${opt.id}`);
          });

          const activeOptId = selectedAddonIds.find((id) =>
            allOptionIds.has(id),
          );
          const isSelected = Boolean(activeOptId);
          const hasSubOptions =
            addon.inputType === "SELECT" &&
            addon.optionsList &&
            addon.optionsList.length > 0;
          const activeSubOpt = hasSubOptions
            ? addon.optionsList?.find(
                (o) =>
                  o.id === activeOptId || activeOptId === `${addon.id}_${o.id}`,
              ) || addon.optionsList?.[0]
            : null;

          const displayPrice: number | null =
            isSelected && activeSubOpt
              ? activeSubOpt.price
              : hasSubOptions && addon.optionsList?.[0]
                ? addon.optionsList[0].price
                : typeof addon.price === "number"
                  ? addon.price
                  : null;
          const addonLabel = addon.id === "battery-storage"
            ? t("addons.batteryStorage")
            : addon.shortLabel || addon.name;
          const addonDescription = addon.id === "battery-storage"
            ? t("addons.batteryDescription")
            : addon.description;

          const handleToggle = () => {
            setSelectedAddonIds((current) => {
              const filtered = current.filter((id) => !allOptionIds.has(id));
              if (isSelected) {
                return filtered;
              } else {
                const defaultId =
                  hasSubOptions && addon.optionsList?.[0]
                    ? addon.optionsList[0].id
                    : addon.id;
                return [...filtered, defaultId];
              }
            });
          };

          let adviceTag = t("addons.engineerRecommended");
          if (addon.category === "GRID_COMPLIANCE")
            adviceTag = t("addons.gridStandard");
          else if (addon.category === "SAFETY")
            adviceTag = t("addons.maxSafety");
          else if (addon.category === "EV_READY")
            adviceTag = t("addons.evChargerReady");
          else if (addon.category === "BATTERY")
            adviceTag = t("addons.nightAutonomy");
          else if (addon.category === "PROTECTION")
            adviceTag = t("addons.protectionPanel");

          return (
            <div
              key={addon.id}
              className={cn(
                "solar-recommendation-option group relative flex flex-col justify-between rounded-[var(--sd-radius-lg)] border p-3.5 transition-all duration-200",
                isSelected
                  ? "border-[var(--sd-blue-600)] bg-[var(--sd-selected)]"
                  : "border-[var(--sd-line)] bg-[var(--sd-raised)] hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)]",
              )}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--sd-radius-md)] text-xs font-black transition-colors",
                        isSelected
                          ? "bg-[var(--sd-blue-600)] text-white"
                          : "bg-[var(--sd-soft-solar)] text-[var(--sd-muted)] group-hover:bg-[var(--sd-selected)]",
                      )}
                    >
                      {addon.category === "EV_READY" ? (
                        <Car className="h-4 w-4" />
                      ) : addon.category === "BATTERY" ? (
                        <BatteryCharging className="h-4 w-4 text-[var(--sd-blue-600)]" />
                      ) : addon.category === "GRID_COMPLIANCE" ? (
                        <Zap className="h-4 w-4 text-amber-500" />
                      ) : (
                        <ShieldCheck className="h-4 w-4 text-[var(--sd-blue-600)]" />
                      )}
                    </span>
                    <span className="line-clamp-1 text-xs font-black text-[var(--sd-ink)]">
                      {addonLabel}
                    </span>
                  </div>
                  <span className="inline-block shrink-0 rounded-full bg-[var(--sd-soft-solar)] px-2 py-0.5 text-[10px] font-bold text-[var(--sd-muted)]">
                    {adviceTag}
                  </span>
                </div>

                <p className="mt-1.5 line-clamp-2 text-[11px] font-semibold leading-relaxed text-[var(--sd-muted)]">
                  {addonDescription}
                </p>
              </div>

              <div className="mt-3 flex items-center justify-between border-t border-[var(--sd-line)] pt-2.5">
                <span className="text-xs font-black text-[var(--sd-blue-600)]">
                  {displayPrice === null
                    ? t("addons.priceOnRequest")
                    : `+${formatCurrency(displayPrice)}`}
                </span>
                <button
                  type="button"
                  onClick={handleToggle}
                  className={cn(
                    "solar-recommendation-add inline-flex min-h-10 items-center gap-1.5 rounded-[var(--sd-radius-md)] px-3 py-1.5 text-xs font-black transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2",
                    isSelected
                      ? "border border-[var(--sd-blue-600)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)] hover:bg-[var(--sd-cyan-100)]"
                      : "bg-[var(--sd-blue-600)] text-white hover:bg-[var(--sd-blue-500)]",
                  )}
                >
                  {isSelected ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>{t("addons.selectedAction")}</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-3.5 w-3.5" />
                      <span>{t("addons.addOption")}</span>
                    </>
                  )}
                </button>
              </div>

              {isSelected && hasSubOptions && addon.optionsList && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-[var(--sd-line)] pt-2"
                >
                  <span className="text-[10px] font-black uppercase text-slate-600 tracking-wider w-full">
                    {t("addons.optionSizing")}
                  </span>
                  <div className="flex flex-wrap gap-1.5 w-full">
                    {addon.optionsList.map((opt) => {
                      const isOptActive =
                        activeOptId === opt.id ||
                        activeOptId === `${addon.id}_${opt.id}`;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => {
                            setSelectedAddonIds((current) => {
                              const filtered = current.filter(
                                (id) => !allOptionIds.has(id),
                              );
                              return [...filtered, opt.id];
                            });
                          }}
                          className={cn(
                            "solar-recommendation-option-size min-h-9 rounded-[var(--sd-radius-sm)] px-2.5 py-1 text-[11px] font-extrabold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2",
                            isOptActive
                              ? "border border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] text-white"
                              : "bg-[var(--sd-soft-solar)] text-[var(--sd-muted)] hover:bg-[var(--sd-selected)]",
                          )}
                        >
                          {opt.label} ({
                            typeof opt.price === "number" &&
                            Number.isFinite(opt.price)
                              ? `+${formatCurrency(opt.price)}`
                              : t("addons.priceOnRequest")
                          })
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProposalContextItem({
  label,
  value,
  helper,
}: {
  label: string;
  value: ReactNode;
  helper: string;
}) {
  return (
    <div className="w-full min-w-0 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-3 py-2 shadow-[var(--sd-shadow-1)] transition-colors duration-200 hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)]">
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-[var(--sd-muted)]">
        {label}
      </p>
      <p className="mt-0.5 truncate text-sm font-black text-[var(--sd-ink)]">{value}</p>
      <p className="mt-0.5 truncate text-[10px] font-semibold text-[var(--sd-muted)]">
        {helper}
      </p>
    </div>
  );
}

function PremiumSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-black text-[var(--sd-ink)]">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 w-full rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-3 text-sm font-bold text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-focus)] focus:ring-2 focus:ring-[var(--sd-focus)]/20"
      >
        {children}
      </select>
    </label>
  );
}

function ForecastCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="w-full min-w-0 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 shadow-[var(--sd-shadow-1)]">
      <p className="text-xs font-bold text-[var(--sd-muted)]">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-black",
          accent ? "text-[var(--sd-blue-600)]" : "text-[var(--sd-ink)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function BreakdownStat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="min-w-0 rounded-[var(--sd-radius-sm)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-2.5 py-2">
      <p className="truncate text-[9px] font-bold leading-tight text-[var(--sd-muted)]">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 truncate text-base font-black leading-tight",
          accent ? "text-[var(--sd-blue-600)]" : "text-[var(--sd-ink)]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AnimatedEcoCounter({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const previousValueRef = useRef(value);
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReducedMotion) {
      previousValueRef.current = value;
      return;
    }

    const obj = { val: previousValueRef.current };
    setDisplayValue(obj.val);
    const tween = gsap.to(obj, {
      val: value,
      duration: 0.85,
      ease: "expo.out",
      onUpdate: () => {
        setDisplayValue(obj.val);
      },
    });
    previousValueRef.current = value;

    return () => {
      tween.kill();
    };
  }, [prefersReducedMotion, value]);

  return (
    <span>
      {(prefersReducedMotion ? value : displayValue).toLocaleString(undefined, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
    </span>
  );
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    (onStoreChange) => {
      const media = window.matchMedia("(prefers-reduced-motion: reduce)");
      const handleChange = () => onStoreChange();
      media.addEventListener("change", handleChange);
      return () => media.removeEventListener("change", handleChange);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function ImpactMetricCard({
  label,
  value,
  unit,
  iconType,
  decimals = 0,
}: {
  label: string;
  value: number;
  unit: string;
  iconType: "seedling" | "earth" | "car";
  decimals?: number;
}) {
  const Icon =
    iconType === "seedling" ? Sprout : iconType === "earth" ? Globe : Car;

  return (
    <div className="solar-summary-impact-card group relative w-full min-w-0 overflow-hidden rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 shadow-[var(--sd-shadow-1)] transition-colors duration-200 hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)]">
      <div className="solar-summary-impact-icon mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)] transition-colors duration-200">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </div>
      <p className="text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-black text-[var(--sd-blue-600)]">
        <AnimatedEcoCounter value={value} decimals={decimals} />
      </p>
      <p className="mt-1 text-xs font-semibold text-[var(--sd-muted)]">{unit}</p>
    </div>
  );
}

function ConsultationField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-black text-[var(--sd-ink)]">{label}</span>
      {children}
    </div>
  );
}

function LightSliderField({
  label,
  display,
  min,
  max,
  step,
  value,
  onChange,
  minLabel,
  maxLabel,
  unit,
  ticks,
}: {
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  minLabel: string;
  maxLabel: string;
  unit?: string;
  ticks?: number[];
}) {
  return (
    <div className="space-y-1 rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3.5 shadow-[var(--sd-shadow-1)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-black text-[var(--sd-ink)]">{label}</span>
        <span className="rounded-full border border-[var(--sd-blue-600)]/25 bg-[var(--sd-selected)] px-2.5 py-0.5 text-xs font-black text-[var(--sd-blue-600)]">
          {display}
        </span>
      </div>
      <GsapSlider
        value={value}
        min={min}
        max={max}
        step={step}
        unit={unit}
        ariaLabel={label}
        ticks={ticks || [min, Math.round(min + (max - min) * 0.5), max]}
        onChange={onChange}
      />
      <div className="flex items-center justify-between gap-3 px-1 text-[10px] font-semibold text-[var(--sd-muted)]">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

function SwapProductModal({
  line,
  category,
  onSelect,
  onClose,
}: {
  line: RecommendedLineItem;
  category: RecommendCategory;
  onSelect: (categoryId: string, productId: string) => void;
  onClose: () => void;
}) {
  const t = useTranslations("WizardSummary");
  const locale = useLocale();
  const intlLocale = locale === "en" ? "en-US" : "th-TH";
  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(intlLocale, {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <Dialog
      isOpen
      onClose={onClose}
      size="sm"
      tone="light"
      ariaLabel={t("modal.swapProduct")}
      closeLabel={t("modal.closeAria")}
      className="bg-white"
    >
      <DialogContent>
        <DialogHeader className="border-b-2 border-black bg-[#F0EEE9]">
          <div>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="size-5 text-[#4F7FA8]" aria-hidden="true" />
              {t("modal.swapProduct")}
            </DialogTitle>
            <DialogDescription>{category.name}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogBody className="bg-white p-0 sm:p-0">
          <ul className="divide-y divide-slate-200 border-b border-slate-200">
            {category.products
              .filter((p) => p.useInRecommendation !== false)
              .map((p) => {
                const selected = p.id === line.product.id;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => onSelect(category.id, p.id)}
                      aria-pressed={selected}
                      className={`flex min-h-[72px] w-full items-center gap-3 px-6 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#B7D1EA] sm:px-8 ${
                        selected
                          ? "bg-[#B7D1EA]/35"
                          : "bg-white hover:bg-[#F0EEE9]"
                      }`}
                    >
                      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border-2 border-black bg-[#F0EEE9]">
                        <ProgressiveImage
                          src={
                            p.imageUrl && p.imageUrl.trim() !== ""
                              ? p.imageUrl
                              : "/images/placeholder.png"
                          }
                          alt=""
                          fill
                          sizes="48px"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {generatePublicProductName({
                            ...p,
                            subCategoryName: category.name,
                          })}
                        </p>
                        {(p.erpnextItemCode || p.id) && (
                          <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                            SKU: {p.erpnextItemCode || p.id}
                          </p>
                        )}
                        <p className="font-mono text-xs font-bold text-[#4F7FA8]">
                          {formatCurrency(p.price)}
                        </p>
                      </div>
                      {selected && (
                        <span className="self-center text-[10px] font-black uppercase text-[#4F7FA8]">
                          {t("modal.current")}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
          </ul>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function useGsapEntrance(
  ref: React.RefObject<HTMLElement | null>,
  options: {
    y?: number;
    duration?: number;
    fromBottom?: boolean;
  } = {},
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        {
          autoAlpha: 0,
          y: prefersReducedMotion
            ? 0
            : options.fromBottom
              ? "100%"
              : (options.y ?? 8),
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : (options.duration ?? 0.2),
          ease: "expo.out",
        },
      );
    }, element);

    return () => context.revert();
  }, [options.duration, options.fromBottom, options.y, ref]);
}

function ProgressiveRegistrationDialog({
  open,
  intent,
  solarKwp,
  isThaiLocale,
  emailHref,
  submitting,
  onGoogle,
  onClose,
}: {
  open: boolean;
  intent: EstimateDraftIntent;
  solarKwp: number;
  isThaiLocale: boolean;
  emailHref: string;
  submitting: boolean;
  onGoogle: () => void;
  onClose: () => void;
}) {
  const isReport = intent === "REPORT";
  const title = isThaiLocale
    ? isReport
      ? "ปลดล็อกการวิเคราะห์โดยละเอียด"
      : "ไม่ต้องกังวลว่าผลคำนวณจะหาย"
    : isReport
      ? "Unlock detailed analytics."
      : "Never lose your calculations.";
  const description = isThaiLocale
    ? isReport
      ? "ลงทะเบียนบัญชีฟรีเพื่อดาวน์โหลดรายงานวิศวกรรมและกระแสเงินสดฉบับสมบูรณ์สำหรับบ้านของคุณ"
      : `สร้างบัญชีฟรีได้ทันทีเพื่อบันทึกโปรไฟล์พลังงานขนาด ${solarKwp.toFixed(2)} kWp นี้`
    : isReport
      ? "Register a free account to download the complete engineering & cash flow financial report for your property."
      : `Create a free account instantly to save this ${solarKwp.toFixed(2)} kWp energy profile.`;

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      size="sm"
      tone="light"
      ariaLabel={title}
      closeLabel={isThaiLocale ? "ปิด" : "Close registration prompt"}
      className="bg-white"
    >
      <DialogContent>
        <DialogHeader className="border-b-2 border-black bg-[#F0EEE9]">
          <div className="flex items-start gap-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border-2 border-black bg-[#B7D1EA] text-slate-900">
              {isReport ? (
                <Download className="h-5 w-5" />
              ) : (
                <Save className="h-5 w-5" />
              )}
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-xl font-black tracking-[-0.025em]">
                {title}
              </DialogTitle>
              <DialogDescription className="font-semibold">
                {description}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <DialogBody className="sd-safe-pb-5-max bg-white">
          <Button
            type="button"
            onClick={onGoogle}
            disabled={submitting}
            className="wizard-ui-primary mt-5 w-full disabled:cursor-wait"
          >
            <GoogleIcon className="h-5 w-5" />
            {submitting
              ? isThaiLocale
                ? "กำลังเชื่อมต่อ..."
                : "Connecting..."
              : isThaiLocale
                ? "ดำเนินการต่อด้วย Google"
                : "Continue with Google"}
          </Button>
          <Button asChild variant="outline" className="mt-2 w-full rounded-xl">
            <Link href={emailHref}>
              {isThaiLocale ? "ลงทะเบียนด้วยอีเมล" : "Register with email"}
            </Link>
          </Button>
          <Button
            type="button"
            onClick={onClose}
            variant="quiet"
            className="mt-1 w-full rounded-xl text-xs"
          >
            {isThaiLocale
              ? "ไว้ภายหลัง กลับไปดูผลวิเคราะห์"
              : "Not now, return to the analysis"}
          </Button>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

function GoogleIcon(props: ComponentPropsWithoutRef<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09A6.9 6.9 0 0 1 5.49 12c0-.73.13-1.43.35-2.09V7.06H2.18A10.98 10.98 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
        fill="#EA4335"
      />
    </svg>
  );
}

function GsapReveal({ children }: { children: ReactNode }) {
  const revealRef = useRef<HTMLDivElement | null>(null);
  useGsapEntrance(revealRef);

  return <div ref={revealRef}>{children}</div>;
}

const GsapRevealForm = forwardRef<
  HTMLFormElement,
  ComponentPropsWithoutRef<"form">
>(function GsapRevealForm({ children, ...props }, forwardedRef) {
  const localRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (typeof forwardedRef === "function") {
      forwardedRef(localRef.current);
      return () => forwardedRef(null);
    }
    if (forwardedRef) {
      forwardedRef.current = localRef.current;
      return () => {
        forwardedRef.current = null;
      };
    }
    return undefined;
  }, [forwardedRef]);

  useGsapEntrance(localRef);

  return (
    <form ref={localRef} {...props}>
      {children}
    </form>
  );
});
