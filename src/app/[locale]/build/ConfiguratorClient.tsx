"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Battery,
  Calendar,
  Check,
  Cpu,
  Gauge,
  Layers,
  Lock,
  MapPin,
  RotateCcw,
  Send,
  ShieldCheck,
  Smartphone,
  Zap,
} from "@/components/ui/icons";
import { useLocale, useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { cn, formatPrice } from "@/lib/utils";
import { SolarRouteHeader } from "@/components/ui/solar-route-header";
import { useConfiguratorStore } from "@/store/useConfiguratorStore";
import { useCurrencyStore } from "@/store/useCurrencyStore";
import {
  DEFAULT_BUILD_CONFIG,
  getCustomCapacityConfig,
} from "@/lib/buildConfig";
import {
  getSelectedSolarAddons,
  getSolarAddonPrice,
  getSolarAddonsForDisplay,
  getRecommendedSolarAddonSelection,
} from "@/lib/solarAddonSelection";
import { submitDesignConsultationRequest } from "@/app/actions/lead";
import SolarCard from "@/components/ui/SolarCard";
import MobileActionBar from "@/components/layout/MobileActionBar";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import GsapSlider from "@/components/ui/GsapSlider";
import { GsapReveal, GsapStagger, GsapCounter } from "@/components/ui/GsapMotion";
import { useSmartScroll } from "@/components/ui/ScrollAutoEngine";
import { SofiaCapsule } from "@/components/ui/LiquidModal";
import DynamicSoliaChat from "@/components/DynamicSoliaChat";
import { useSupabaseUser } from "@/hooks/useSupabaseUser";
import { trackProductEvent } from "@/lib/productAnalytics";
import {
  getSystemPriceQuote,
  type PricingTier,
  type SupportedPhase,
} from "@/lib/pricing";
import type { ServiceLocation } from "@/components/services/ServiceLocationPicker";
import ContactDetailsExpanded from "@/components/build/ContactDetailsExpanded";
import BuildStepper from "@/components/build/BuildStepper";
import { BuildLiveSummary } from "@/components/build/build-live-summary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayerPortal } from "@/components/ui/layer-portal";
import type {
  BuildArchitectureOption as ArchitectureOption,
  BuildCapacityTier as CapacityTier,
  BuildConfiguratorProps,
} from "@/types/build";

const ServiceLocationPicker = dynamic(
  () => import("@/components/services/ServiceLocationPicker"),
  {
    ssr: false,
    loading: () => (
      <div className="solar-route-skeleton h-72 rounded-[1.25rem]" />
    ),
  },
);

const CAPACITY_TIERS: CapacityTier[] = [
  { id: "5kw", label: "5kW", kwp: 5, helper: "Balanced home savings profile" },
  {
    id: "10kw",
    label: "10kW",
    kwp: 10,
    helper: "Large home or high daytime usage",
  },
  {
    id: "20kw",
    label: "20kW",
    kwp: 20,
    helper: "Villa, office, or heavy daytime load",
  },
  {
    id: "custom-review",
    label: "Custom",
    kwp: 15,
    helper: "Between steps or 20kW+ requires sales review",
  },
];

function getInitialCapacityFromKw(kwParam: string | null) {
  const kwValue = Number(kwParam);
  if (!Number.isFinite(kwValue) || kwValue <= 0) {
    return {
      capacityId: CAPACITY_TIERS[0].id,
      customKwp: null as number | null,
    };
  }

  const roundedKw = Math.round(kwValue * 10) / 10;
  const matchedTier = CAPACITY_TIERS.find((tier) => tier.kwp === roundedKw);
  if (matchedTier) {
    return {
      capacityId: matchedTier.id,
      customKwp: null as number | null,
    };
  }

  return {
    capacityId: "custom",
    customKwp: roundedKw,
  };
}

export default function ConfiguratorClient({
  initialBuildConfig,
}: BuildConfiguratorProps) {
  const t = useTranslations("ConfiguratorClient");
  const locale = useLocale();
  const activeCurrency = useCurrencyStore((state) => state.currency);
  const { scrollTo: gsapScrollTo } = useSmartScroll();

  const capacityTiers = useMemo(
    () => [
      { id: "5kw", label: "5kW", kwp: 5, helper: t("capacity.5kw.helper") },
      { id: "10kw", label: "10kW", kwp: 10, helper: t("capacity.10kw.helper") },
      { id: "20kw", label: "20kW", kwp: 20, helper: t("capacity.20kw.helper") },
      {
        id: "custom-review",
        label: t("capacity.custom.label"),
        kwp: 15,
        helper: t("capacity.custom.helper"),
      },
    ],
    [t],
  );

  const pricingTiers = useMemo(
    () => [
      {
        id: "budget" as PricingTier,
        label: t("pricing.budget.label"),
        helper: t("pricing.budget.helper"),
      },
      {
        id: "balance" as PricingTier,
        label: t("pricing.balance.label"),
        helper: t("pricing.balance.helper"),
      },
      {
        id: "premium" as PricingTier,
        label: t("pricing.premium.label"),
        helper: t("pricing.premium.helper"),
      },
    ],
    [t],
  );

  const phaseOptions = useMemo(
    () => [
      {
        id: 1 as SupportedPhase,
        label: t("phase.phase1.label"),
        helper: t("phase.phase1.helper"),
      },
      {
        id: 3 as SupportedPhase,
        label: t("phase.phase3.label"),
        helper: t("phase.phase3.helper"),
      },
    ],
    [t],
  );

  const architectures = useMemo(
    () => [
      {
        id: "on-grid" as const,
        title: t("architectures.ongrid.title"),
        description: t("architectures.ongrid.helper"),
      },
      {
        id: "hybrid" as const,
        title: t("architectures.hybrid.title"),
        description: t("architectures.hybrid.helper"),
      },
    ],
    [t],
  );

  const activeBuildConfig = useMemo(() => {
    return initialBuildConfig || DEFAULT_BUILD_CONFIG;
  }, [initialBuildConfig]);

  const customCapacityConfig = useMemo(() => {
    return getCustomCapacityConfig(activeBuildConfig);
  }, [activeBuildConfig]);

  const standardAddons = useMemo(() => {
    const list = (
      activeBuildConfig.smartAddons || DEFAULT_BUILD_CONFIG.smartAddons
    ).filter((item) => item.isVisible !== false);

    return list
      .filter((item) => item.category !== "BATTERY")
      .map((item) => {
        let icon = <Gauge className="h-5 w-5" />;
        const cat = (item.category || "").toUpperCase();
        const idLower = (item.id || "").toLowerCase();

        if (
          cat === "SAFETY" ||
          idLower.includes("shutdown") ||
          idLower.includes("rapid")
        ) {
          icon = <ShieldCheck className="h-5 w-5" />;
        } else if (
          cat === "GRID_COMPLIANCE" ||
          idLower.includes("export") ||
          idLower.includes("meter") ||
          idLower.includes("zero")
        ) {
          icon = <Smartphone className="h-5 w-5" />;
        } else if (cat === "PROTECTION" || idLower.includes("combiner")) {
          icon = <Cpu className="h-5 w-5" />;
        } else if (cat === "EV_READY" || idLower.includes("ev")) {
          icon = <Zap className="h-5 w-5" />;
        } else if (cat === "CABLING" || idLower.includes("cable")) {
          icon = <Activity className="h-5 w-5" />;
        }

        let defaultPrice = item.price ?? 0;
        if (
          item.inputType === "SELECT" &&
          item.optionsList &&
          item.optionsList.length > 0
        ) {
          defaultPrice = item.optionsList[0].price;
        }

        const priceDelta = `+ ${formatPrice(defaultPrice, activeCurrency)}`;

        return {
          id: item.id,
          title: item.name,
          description: item.description,
          category: item.category,
          inputType: item.inputType,
          optionsList: item.optionsList,
          icon,
          priceDelta,
        };
      });
  }, [activeBuildConfig, activeCurrency]);

  const batterySizes = useMemo(() => {
    const list = (
      activeBuildConfig.smartAddons || DEFAULT_BUILD_CONFIG.smartAddons
    ).filter((item) => item.isVisible !== false);
    const batteryAddon = list.find(
      (item) => item.category === "BATTERY" || item.id.includes("battery"),
    );
    if (batteryAddon?.optionsList && batteryAddon.optionsList.length > 0) {
      return batteryAddon.optionsList.map((opt) => ({
        id: opt.id,
        label: opt.label,
        priceDelta: `+ ${formatPrice(opt.price, activeCurrency)}`,
        price: opt.price,
      }));
    }
    return [
      {
        id: "battery5k",
        label: "5kWh",
        priceDelta: `+ ${formatPrice(65000, activeCurrency)}`,
        price: 65000,
      },
      {
        id: "battery10k",
        label: "10kWh",
        priceDelta: `+ ${formatPrice(115000, activeCurrency)}`,
        price: 115000,
      },
      {
        id: "battery16k",
        label: "16kWh",
        priceDelta: `+ ${formatPrice(175000, activeCurrency)}`,
        price: 175000,
      },
    ];
  }, [activeBuildConfig, activeCurrency]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSupabaseUser();
  const initialCapacity = useMemo(
    () => getInitialCapacityFromKw(searchParams.get("kw")),
    [searchParams],
  );
  const updateDynamicState = useConfiguratorStore(
    (state) => state.updateDynamicState,
  );
  const [capacityId, setCapacityId] = useState<string | null>(
    initialCapacity.capacityId,
  );
  const [customKwp, setCustomKwp] = useState<number | null>(
    initialCapacity.customKwp,
  );
  const [architectureId, setArchitectureId] =
    useState<ArchitectureOption["id"]>("on-grid");
  const [pricingTier, setPricingTier] = useState<PricingTier>("balance");
  const [electricalPhase, setElectricalPhase] = useState<SupportedPhase>(1);
  const initialAddOns = useMemo(() => {
    return getRecommendedSolarAddonSelection(
      getSolarAddonsForDisplay(
        activeBuildConfig.smartAddons || DEFAULT_BUILD_CONFIG.smartAddons,
      ),
    );
  }, [activeBuildConfig]);

  const [selectedAddOns, setSelectedAddOns] = useState<string[]>(initialAddOns);
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [siteLocation, setSiteLocation] = useState<ServiceLocation | null>(
    null,
  );
  const [siteLocationOpen, setSiteLocationOpen] = useState(false);
  const [preferredDateTime, setPreferredDateTime] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [isSubmittingLead, setIsSubmittingLead] = useState(false);
  const [builderStep, setBuilderStep] = useState<"design" | "contact">(
    "design",
  );
  const buildAnalyticsInitializedRef = useRef(false);

  useEffect(() => {
    void trackProductEvent("build_started", { surface: "build_page" });
  }, [locale]);

  const userDefaults = useMemo(() => {
    const metadata = user?.user_metadata ?? {};
    const fullName = metadata.full_name ?? metadata.name ?? "";
    return {
      name: typeof fullName === "string" ? fullName : "",
      email: typeof user?.email === "string" ? user.email : "",
      phone: typeof user?.phone === "string" ? user.phone : "",
    };
  }, [user]);

  const selectedCapacity = useMemo(() => {
    if (customKwp !== null) {
      return {
        id: "custom",
        label: `${customKwp}kW`,
        kwp: customKwp,
        helper:
          locale === "th" ? "กำหนดกำลังผลิตเอง" : "Custom capacity choice",
      };
    }
    if (!capacityId) return null;
    return capacityTiers.find((tier) => tier.id === capacityId) ?? null;
  }, [capacityId, capacityTiers, customKwp, locale]);

  // Compute maximum unlocked sub-step based on choices made in steps:
  // Step 1: System Capacity Choice
  // Step 2: Solution Tier & Electrical Phase
  // Step 3: Inverter Architecture
  // Step 4: Smart Add-ons
  const effectiveMaxUnlockedSubStep = useMemo(() => {
    if (!selectedCapacity) return 1;
    if (pricingTier === null || electricalPhase === null) return 2;
    if (architectureId === null) return 3;
    return 4;
  }, [selectedCapacity, pricingTier, electricalPhase, architectureId]);

  // Proceed to Step 2 unlocks when user reaches configured step (Step 3: Inverter Architecture)
  const canProceedToStep2 =
    selectedCapacity !== null && effectiveMaxUnlockedSubStep >= 3;

  const selectedArchitecture =
    architectures.find((option) => option.id === architectureId) ??
    architectures[0];
  const selectedAddOnOptions = useMemo(
    () =>
      getSelectedSolarAddons(
        getSolarAddonsForDisplay(
          activeBuildConfig.smartAddons || DEFAULT_BUILD_CONFIG.smartAddons,
        ),
        selectedAddOns,
      ).map(({ addon, option }) => ({
        id: addon.id,
        title: option ? `${addon.name} (${option.label})` : addon.name,
        description: addon.description,
        price: getSolarAddonPrice({ addon, option }),
      })),
    [activeBuildConfig.smartAddons, selectedAddOns],
  );
  const roughPanelMin = selectedCapacity
    ? Math.max(1, Math.ceil((selectedCapacity.kwp * 1000) / 550))
    : 0;
  const roughPanelMax = selectedCapacity
    ? Math.max(roughPanelMin, Math.ceil((selectedCapacity.kwp * 1000) / 450))
    : 0;
  const estimatedMonthlySavings = selectedCapacity
    ? Math.round(selectedCapacity.kwp * 4.2 * 30 * 4.2)
    : 0;

  const selectedAddOnsTotal = useMemo(() => {
    const addonPriceMap: Record<string, number> = {};
    const catalog =
      activeBuildConfig.smartAddons || DEFAULT_BUILD_CONFIG.smartAddons;
    catalog.forEach((addon) => {
      const basePrice = typeof addon.price === "number" ? addon.price : 0;
      if (basePrice > 0) {
        addonPriceMap[addon.id] = basePrice;
      }
      if (addon.optionsList && addon.optionsList.length > 0) {
        addon.optionsList.forEach((opt) => {
          const optPrice =
            typeof opt.price === "number" ? opt.price : basePrice;
          if (optPrice > 0) {
            addonPriceMap[opt.id] = optPrice;
            addonPriceMap[`${addon.id}_${opt.id}`] = optPrice;
          }
        });
      }
    });

    const defaultPrices: Record<string, number> = {
      "rapid-shutdown-optimizers": 12000,
      "smart-meter-zero-export": 15000,
      "combiner-box-ac-dc": 8000,
      "ev-charger-ready": 25000,
      "solar-cable": 5000,
      battery5k: 65000,
      battery10k: 115000,
      battery16k: 175000,
    };

    return selectedAddOns.reduce((total, id) => {
      if (addonPriceMap[id] !== undefined) return total + addonPriceMap[id];
      if (defaultPrices[id] !== undefined) return total + defaultPrices[id];

      const lower = id.toLowerCase();
      if (lower.includes("shutdown") || lower.includes("rapid"))
        return total + (addonPriceMap["rapid-shutdown-optimizers"] ?? 12000);
      if (
        lower.includes("export") ||
        lower.includes("meter") ||
        lower.includes("zero")
      )
        return total + (addonPriceMap["smart-meter-zero-export"] ?? 15000);
      if (lower.includes("combiner"))
        return total + (addonPriceMap["combiner-box-ac-dc"] ?? 8000);
      if (lower.includes("ev"))
        return total + (addonPriceMap["ev-charger-ready"] ?? 25000);
      if (lower.includes("cable"))
        return total + (addonPriceMap["solar-cable"] ?? 5000);
      if (lower.includes("battery5") || lower === "battery5k")
        return total + 65000;
      if (lower.includes("battery10") || lower === "battery10k")
        return total + 115000;
      if (lower.includes("battery16") || lower === "battery16k")
        return total + 175000;
      return total;
    }, 0);
  }, [selectedAddOns, activeBuildConfig.smartAddons]);

  const systemPriceQuote = useMemo(
    () =>
      selectedCapacity
        ? getSystemPriceQuote(
            selectedCapacity.kwp,
            electricalPhase,
            pricingTier,
          )
        : { amount: null, isContactRequired: false, label: "" },
    [electricalPhase, pricingTier, selectedCapacity],
  );
  const estimate = useMemo(() => {
    if (!selectedCapacity || systemPriceQuote.amount === null) return null;
    return systemPriceQuote.amount + selectedAddOnsTotal;
  }, [selectedCapacity, systemPriceQuote.amount, selectedAddOnsTotal]);
  const isContactPrice = selectedCapacity
    ? estimate === null || systemPriceQuote.isContactRequired
    : false;

  const displayPrice = !selectedCapacity
    ? locale === "th"
      ? "โปรดเลือกขนาดระบบ"
      : "Select Capacity"
    : isContactPrice
      ? systemPriceQuote.label
      : `เริ่มต้น ${formatPrice(estimate ?? 0)}`;

  useEffect(() => {
    if (!buildAnalyticsInitializedRef.current) {
      buildAnalyticsInitializedRef.current = true;
      return;
    }

    void trackProductEvent("build_configuration_changed", {
      change_type: "configuration",
      system_size_kwp: selectedCapacity?.kwp ?? null,
      pricing_tier: pricingTier,
      electrical_phase: electricalPhase,
      inverter_architecture: architectureId,
      selected_add_on_count: selectedAddOns.length,
      estimated_price: estimate,
    });
  }, [
    architectureId,
    electricalPhase,
    estimate,
    pricingTier,
    selectedAddOns,
    selectedCapacity?.kwp,
  ]);

  const syncToWizard = (showToast = true) => {
    if (selectedCapacity) {
      updateDynamicState("systemCapacityKwp", selectedCapacity.kwp);
    }
    updateDynamicState(
      "systemGoal",
      architectureId === "hybrid" ? "hybrid" : "roi_max",
    );
    updateDynamicState("inverterArchitecture", architectureId);
    updateDynamicState("budgetTier", pricingTier);
    updateDynamicState("electricalPhase", `${electricalPhase}-Phase`);
    updateDynamicState("smartAddOns", selectedAddOns.join(","));
    if (showToast) {
      toast.success("Configuration profile saved for consultation.");
    }
  };

  const scrollToBuildStep = (stepNumber: number) => {
    gsapScrollTo(`#build-step-${stepNumber}`, { delay: 150, extraOffset: 20 });
  };

  const resetConfiguration = () => {
    setCapacityId(null);
    setCustomKwp(null);
    setArchitectureId("on-grid");
    setPricingTier("balance");
    setElectricalPhase(1);
    setSelectedAddOns(initialAddOns);
    toast.success("Configuration reset to unselected state.");
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((current) => {
      const catalog =
        activeBuildConfig.smartAddons || DEFAULT_BUILD_CONFIG.smartAddons;
      const batteryAddon = catalog.find(
        (item) => item.category === "BATTERY" || item.id.includes("battery"),
      );

      const batteryOptionIds = new Set<string>();
      if (batteryAddon) {
        batteryOptionIds.add(batteryAddon.id);
        batteryAddon.optionsList?.forEach((opt) =>
          batteryOptionIds.add(opt.id),
        );
      }
      batterySizes.forEach((size) => batteryOptionIds.add(size.id));

      const isBatteryId =
        id === "battery" ||
        (batteryAddon && id === batteryAddon.id) ||
        batteryOptionIds.has(id) ||
        id.startsWith("battery");

      if (isBatteryId) {
        const activeBatteryId = current.find(
          (item) => batteryOptionIds.has(item) || item.startsWith("battery"),
        );
        const base = current.filter(
          (item) => !batteryOptionIds.has(item) && !item.startsWith("battery"),
        );

        if (id === "battery" || (batteryAddon && id === batteryAddon.id)) {
          if (activeBatteryId) {
            return base;
          } else {
            const defaultChoice = batterySizes[0]?.id || "battery5k";
            return [...base, defaultChoice];
          }
        }

        if (activeBatteryId === id) {
          return base;
        } else {
          return [...base, id];
        }
      }

      // Check if `id` belongs to a SELECT type add-on catalog item
      const parentSelectAddon = catalog.find((addon) => {
        if (
          addon.inputType !== "SELECT" ||
          !addon.optionsList ||
          addon.optionsList.length === 0
        )
          return false;
        if (addon.id === id) return true;
        return addon.optionsList.some(
          (opt) => opt.id === id || id === `${addon.id}_${opt.id}`,
        );
      });

      if (
        parentSelectAddon &&
        parentSelectAddon.optionsList &&
        parentSelectAddon.optionsList.length > 0
      ) {
        const allOptionIds = new Set<string>();
        allOptionIds.add(parentSelectAddon.id);
        parentSelectAddon.optionsList.forEach((opt) => {
          allOptionIds.add(opt.id);
          allOptionIds.add(`${parentSelectAddon.id}_${opt.id}`);
        });

        const isTargetAlreadySelected = current.includes(id);
        const filteredCurrent = current.filter(
          (item) => !allOptionIds.has(item),
        );

        // If clicking an already selected sub-option, unselect the addon completely
        if (isTargetAlreadySelected) {
          return filteredCurrent;
        }

        // If clicking the parent card (id === parentSelectAddon.id)
        if (id === parentSelectAddon.id) {
          const hasAnyChoiceActive = current.some((item) =>
            allOptionIds.has(item),
          );
          if (hasAnyChoiceActive) {
            return filteredCurrent;
          } else {
            const defaultChoice =
              parentSelectAddon.optionsList[0]?.id || parentSelectAddon.id;
            return [...filteredCurrent, defaultChoice];
          }
        }

        // Clicked a specific sub-option pill: replace existing choice with the new one
        return [...filteredCurrent, id];
      }

      // Normal TOGGLE type add-on
      return current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id];
    });
  };

  const prefillContactFromUser = () => {
    setCustomerName((current) => current || userDefaults.name);
    setCustomerEmail((current) => current || userDefaults.email);
    setCustomerPhone((current) => current || userDefaults.phone);
  };

  const handlePanelCta = () => {
    syncToWizard(false);
    void trackProductEvent("proposal_request_started", {
      surface: "build_panel",
      system_size_kwp: selectedCapacity?.kwp ?? 0,
      estimated_price: estimate,
      pricing_tier: pricingTier,
    });
    prefillContactFromUser();
    setBuilderStep("contact");
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    window.scrollTo({ top: 120, behavior: reduceMotion ? "auto" : "smooth" });
  };

  const handleConsultationSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    syncToWizard(false);
    setIsSubmittingLead(true);
    const pinnedLocationNote = siteLocation
      ? `Pinned location: ${siteLocation.displayName} (${siteLocation.latitude.toFixed(6)}, ${siteLocation.longitude.toFixed(6)})`
      : "";
    const combinedRemarks = [customerNotes.trim(), pinnedLocationNote]
      .filter(Boolean)
      .join("\n\n");

    try {
      const result = await submitDesignConsultationRequest({
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
        locale,
        postalCode,
        preferredDateTime,
        remarks: combinedRemarks || undefined,
        location: siteLocation?.displayName || postalCode,
        systemProfile: {
          source: "custom-builder-summary-card",
          systemSizeKwp: selectedCapacity?.kwp ?? 5,
          targetSystemSize: selectedCapacity?.label ?? "5kW",
          inverterArchitecture: architectureId,
          inverterType: selectedArchitecture.title,
          pricingTier,
          electricalPhase: `${electricalPhase}-Phase`,
          smartAddOns: selectedAddOnOptions.map((option) => option.title),
          addOns: selectedAddOnOptions.map((option) => option.title),
          approxPanels: {
            min: roughPanelMin,
            max: roughPanelMax,
            label: `${roughPanelMin} - ${roughPanelMax} generic mono panels`,
          },
          calculatedMonthlySavings: estimatedMonthlySavings,
          estimatedBudget: estimate ?? 0,
          estimatedBudgetDisplay: displayPrice,
          siteLocation: siteLocation
            ? {
                latitude: siteLocation.latitude,
                longitude: siteLocation.longitude,
                displayName: siteLocation.displayName,
                pdpaLocationConsent: true,
              }
            : null,
        },
        wizardAnswers: {
          systemCapacityKwp: selectedCapacity?.kwp ?? 5,
          inverterArchitecture: architectureId,
          budgetTier: pricingTier,
          electricalPhase: `${electricalPhase}-Phase`,
          smartAddOns: selectedAddOns.join(","),
          customerNotes,
          siteLocation: siteLocation
            ? {
                latitude: siteLocation.latitude,
                longitude: siteLocation.longitude,
                displayName: siteLocation.displayName,
                pdpaLocationConsent: true,
              }
            : null,
        },
      });

      if (!result.success) {
        toast.error(result.error || "Failed to submit consultation request.");
        return;
      }

      void trackProductEvent("build_quote_requested", {
        system_size_kwp: selectedCapacity?.kwp ?? 0,
        estimated_price: estimate,
        customer_type: "residential",
        surface: "build",
        pricing_tier: pricingTier,
        submission_status: "success",
      });
      toast.success(
        "ส่งคำขอประเมินเรียบร้อยแล้ว ทีมวิศวกรจะติดต่อกลับเพื่อยืนยันรายละเอียด",
      );
      const refParam = result.trackingNumber || "";
      router.push(
        `/${locale}/consultation/confirmation?from=build${refParam ? `&ref=${refParam}` : ""}`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to submit consultation request.",
      );
    } finally {
      setIsSubmittingLead(false);
    }
  };

  return (
    <div
      data-bagui="build-configurator"
      data-solar-motion="build"
      className="solar-build relative min-h-dvh px-4 pb-32 pt-10 text-foreground md:px-8 md:pt-14 lg:pb-28"
    >
      <SofiaCapsule
        visible={isSubmittingLead}
        message={
          locale === "th"
            ? "กำลังส่งคำขอและสร้างแบบแปลนเฉพาะตัวของคุณ..."
            : "Submitting request and creating your custom blueprint..."
        }
      />
      <Dialog
        isOpen={isSubmittingLead}
        onClose={() => undefined}
        dismissible={false}
        size="sm"
        tone="light"
        ariaLabel={locale === "th" ? "กำลังส่งคำขอ" : "Submitting request"}
        className="bg-white"
      >
        <DialogContent>
          <DialogHeader showClose={false} className="sr-only">
            <DialogTitle>
              {locale === "th" ? "กำลังส่งคำขอ" : "Submitting request"}
            </DialogTitle>
          </DialogHeader>
          <DialogBody className="flex min-h-64 items-center justify-center bg-white px-6 py-8">
            <div
              className="flex w-full max-w-md flex-col items-center text-center"
              role="status"
              aria-live="polite"
            >
              <DynamicSoliaChat
                type="loading_calc"
                pose="/solia-thinking.webp"
              />
              <p className="mt-6 text-base font-semibold leading-7 text-[#075985]">
                {locale === "th"
                  ? "กำลังส่งคำขอและสร้างแบบแปลนเฉพาะตัวของคุณ..."
                  : "Submitting request and creating your custom blueprint..."}
              </p>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>
      <div className="mx-auto w-full max-w-[90rem] space-y-10">
        <GsapReveal
          data-solar-reveal
          className="solar-build-header space-y-6"
          from="bottom"
        >
          <SolarRouteHeader
            eyebrow={
              <span className="inline-flex items-center gap-2 rounded-full bg-[#B7D1EA]/30 px-3.5 py-1.5">
                <Layers className="h-4 w-4" aria-hidden="true" />
                {t("title")}
              </span>
            }
            title={
              builderStep === "design"
                ? locale === "th"
                  ? "ออกแบบระบบโซลาร์เซลล์"
                  : t("subtitle")
                : locale === "th"
                  ? "ข้อมูลผู้ติดต่อ & นัดหมายวิศวกร"
                  : "Contact Details & Review"
            }
            description={
              builderStep === "design"
                ? locale === "th"
                  ? "เริ่มจากขนาดระบบที่เหมาะกับบ้าน แล้วปรับอุปกรณ์ เป้าหมาย และรายละเอียดหน้างานให้พร้อมสำหรับทีมวิศวกร"
                  : "Start with a system size that fits your home, then tune the equipment, goal, and site details for engineering review."
                : locale === "th"
                  ? "ตรวจสอบแบบร่างและส่งข้อมูลที่จำเป็น เพื่อให้ทีมวิศวกรติดต่อกลับพร้อมขั้นตอนถัดไป"
                  : "Review your plan and share the details the engineering team needs for the next step."
            }
          />

          <BuildStepper
            currentStep={builderStep}
            onStepClick={(step) => {
              setBuilderStep(step);
              gsapScrollTo(document.body, { duration: 0.6 });
            }}
            locale={locale}
          />
        </GsapReveal>

        {builderStep === "design" ? (
          <GsapReveal
            data-solar-reveal
            className="solar-build-design-layout"
            from="bottom"
          >
            <div className="solar-build-main min-w-0 space-y-8">
              <div className="w-full space-y-6">
              <ConfigSection
                step="1"
                icon={<Gauge className="h-5 w-5" />}
                title="System Capacity Choice"
                description="Choose a raw system size tier. Panel quantity is shown as a planning range using 450W to 550W modules."
                isLocked={1 > effectiveMaxUnlockedSubStep}
                locale={locale}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4 items-stretch">
                    {capacityTiers.map((tier) => {
                      const active =
                        tier.id === capacityId && customKwp === null;
                      return (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => {
                            setCapacityId(tier.id);
                            if (
                              tier.id === "custom-review" ||
                              tier.id.startsWith("custom")
                            ) {
                              if (customKwp === null) {
                                setCustomKwp(15);
                              }
                            } else {
                              setCustomKwp(null);
                              scrollToBuildStep(2);
                            }
                          }}
                          data-selected={active}
                          className={cn(
                            "solar-choice-card h-full flex flex-col justify-between min-h-[132px] rounded-[24px] border p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95",
                            "lg-tile",
                            active && "lg-tile--selected",
                            active
                              ? "border-[#7CA8D0] bg-[#DCE8F5]/50 ring-2 ring-[#B7D1EA] shadow-md"
                              : "border-[#8E8B83]/20 bg-[#E6E3DC] hover:border-[#7CA8D0]/40 hover:scale-[1.01] hover:shadow-md",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-2xl font-bold text-[#1C1C1A]">
                                {tier.label}
                              </p>
                              <p className="mt-1 text-xs font-medium leading-5 text-[#4E4B44]">
                                {tier.helper}
                              </p>
                            </div>
                            {active ? <SelectedBadge /> : null}
                          </div>
                          <p className="mt-5 text-xs font-bold text-[#4F7FA8]">
                            Approx. {Math.ceil((tier.kwp * 1000) / 550)} -{" "}
                            {Math.ceil((tier.kwp * 1000) / 450)} panels
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Capacity Range Slider & Direct Numeric Input */}
                  {customCapacityConfig.isEnabled && (
                    <SolarCard className="solar-route-card space-y-4 rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 shadow-sm">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-bold text-[#1C1C1A]">
                            {locale === "th"
                              ? `กำหนดขนาดกำลังผลิตเอง (${customCapacityConfig.unit})`
                              : `Custom System Capacity (${customCapacityConfig.unit})`}
                          </p>
                          <p className="text-xs text-[#4F7FA8] mt-0.5 font-bold">
                            {locale === "th"
                              ? `พิมพ์ระบุจำนวนกำลังผลิต kWp ที่ต้องการ หรือเลือกจากขนาดแนะนำด้านล่าง (เกิน 20 kWp ติดต่อสอบถามราคาและออกแบบพิเศษ)`
                              : `Type desired kWp capacity or pick a preset below. Above 20 kWp enters contact engineering quote mode.`}
                          </p>
                        </div>
                        {customKwp !== null && (
                          <span className="rounded-full border border-[#7CA8D0] bg-[#DCE8F5] text-[#2E2C27] px-3.5 py-1 text-xs font-bold animate-in zoom-in-95 duration-200">
                            {customKwp} {customCapacityConfig.unit}
                          </span>
                        )}
                      </div>

                      {/* Direct Numeric Input for Custom kW & Quick Presets */}
                      <div className="solar-soft-panel flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-[#F7F6F3] p-4 rounded-2xl border border-[#8E8B83]/20">
                        <div className="flex items-center gap-2 flex-1">
                          <label
                            htmlFor="custom-kwp-input"
                            className="text-xs font-bold text-[#1C1C1A] shrink-0"
                          >
                            {locale === "th"
                              ? "ระบุขนาดกำลังผลิต (kWp):"
                              : "Enter Capacity (kWp):"}
                          </label>
                          <div className="relative flex-1 max-w-[180px]">
                            <input
                              id="custom-kwp-input"
                              type="number"
                              min={1}
                              max={2000}
                              step={0.5}
                              value={customKwp ?? ""}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                if (Number.isFinite(val) && val > 0) {
                                  setCustomKwp(val);
                                  setCapacityId("custom-review");
                                } else if (e.target.value === "") {
                                  setCustomKwp(null);
                                }
                              }}
                              placeholder="e.g. 25"
                              className="w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F0EEE9] px-3.5 py-2 text-base font-bold text-[#1C1C1A] outline-none transition-all focus:border-[#7CA8D0] shadow-xs"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#4E4B44] pointer-events-none">
                              kWp
                            </span>
                          </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#4E4B44] mr-1 hidden md:inline">
                            {locale === "th" ? "ทางเลือกด่วน:" : "Quick:"}
                          </span>
                          {[15, 25, 30, 50, 100].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => {
                                setCustomKwp(preset);
                                setCapacityId("custom-review");
                              }}
                              className={cn(
                                "rounded-full px-3 py-1 text-xs font-bold transition-all border cursor-pointer active:scale-95",
                                customKwp === preset
                                  ? "bg-[#B7D1EA] text-white border-[#7CA8D0] shadow-xs"
                                  : "bg-[#F0EEE9] text-[#1C1C1A] border-[#8E8B83]/30 hover:bg-[#DCE8F5]/40",
                              )}
                            >
                              {preset} kWp
                            </button>
                          ))}
                        </div>

                        {/* Reset button */}
                        {customKwp !== null && (
                          <button
                            type="button"
                            onClick={() => {
                              setCustomKwp(null);
                              setCapacityId("5kw");
                            }}
                            className="text-xs font-bold px-3 py-1.5 rounded-full bg-[#DCE8F5] text-[#2E2C27] hover:bg-[#DCE8F5] transition-all shrink-0 cursor-pointer self-center active:scale-95"
                          >
                            {locale === "th" ? "รีเซ็ต" : "Reset"}
                          </button>
                        )}
                      </div>

                      {/* Slider Control */}
                      <div className="pt-2">
                        <GsapSlider
                          value={customKwp ?? customCapacityConfig.minKw}
                          min={customCapacityConfig.minKw}
                          max={Math.max(100, customCapacityConfig.maxKw)}
                          step={customCapacityConfig.stepKw}
                          ticks={[5, 25, 50, 75, 100]}
                          unit={customCapacityConfig.unit}
                          onChange={(newKw) => {
                            setCustomKwp(newKw);
                            setCapacityId("custom-review");
                          }}
                        />
                      </div>

                      {/* Contact Us Callout for kW > 20 */}
                      {selectedCapacity && selectedCapacity.kwp > 20 && (
                        <div className="rounded-2xl border border-[#7CA8D0] bg-[#B7D1EA]/25 p-4 text-xs font-semibold text-[#2E2C27] flex items-start gap-3 animate-in fade-in-50 duration-200">
                          <Zap className="h-5 w-5 shrink-0 text-[#4F7FA8] mt-0.5" />
                          <div>
                            <span className="font-extrabold block text-sm text-[#1C1C1A]">
                              {locale === "th"
                                ? `ระบบขนาดใหญ่พิเศษ (${selectedCapacity.kwp} kWp) — ติดต่อเราเพื่อขอใบเสนอราคาเฉพาะ`
                                : `Custom Industrial Scale System (${selectedCapacity.kwp} kWp) — Contact Us for Quote`}
                            </span>
                            <p className="mt-1 text-[#4E4B44] leading-5 font-medium">
                              {locale === "th"
                                ? `ระบบขนาด ${selectedCapacity.kwp} kWp จัดอยู่ในระดับโรงงานหรืออาคารธุรกิจขนาดใหญ่ กรุณากดปุ่มขอใบเสนอราคา ทีมวิศวกร SolarDream จะจัดทำแบบแปลนวิศวกรรมและใบเสนอราคาเฉพาะสำหรับโครงการของคุณ`
                                : `System size ${selectedCapacity.kwp} kWp is tailored for large-scale commercial or industrial facilities. Request a quote below and our engineering team will provide custom design and enterprise pricing.`}
                            </p>
                          </div>
                        </div>
                      )}
                    </SolarCard>
                  )}
                </div>
              </ConfigSection>

              <ConfigSection
                step="2"
                icon={<Layers className="h-5 w-5" />}
                title="Solution Tier & Electrical Phase"
                description="Choose the pricing profile that matches the installation phase and desired solution level."
                isLocked={2 > effectiveMaxUnlockedSubStep}
                locale={locale}
              >
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.15fr_0.85fr] items-stretch">
                  <div className="solar-soft-panel flex flex-col h-full rounded-[24px] bg-[#F7F6F3]/60 border border-[#8E8B83]/20 p-3">
                    <div className="mb-2 px-1 pt-0.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E4B44]">
                        {locale === "th"
                          ? "เลือกรุ่นโซลูชัน"
                          : "Pricing Profile"}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 flex-1 items-stretch">
                      {pricingTiers.map((tier) => {
                        const active = tier.id === pricingTier;

                        return (
                          <button
                            key={tier.id}
                            type="button"
                            onClick={() => {
                              setPricingTier(tier.id);
                            }}
                            className={cn(
                              "h-full flex flex-col justify-between rounded-2xl px-4 py-4 text-left transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95",
                              "lg-tile",
                              active && "lg-tile--selected",
                              active
                                ? "bg-[#B7D1EA] text-white shadow-md font-bold"
                                : "text-[#4E4B44] font-medium hover:text-[#1C1C1A] hover:bg-white/60",
                            )}
                          >
                            <div>
                              <span className={cn("block text-sm font-bold", active ? "text-white" : "text-[#1C1C1A]")}>
                                {tier.label}
                              </span>
                              <span className={cn("mt-1 block text-xs font-medium leading-5", active ? "text-white/80" : "text-[#4E4B44]")}>
                                {tier.helper}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="solar-soft-panel flex flex-col h-full rounded-[24px] bg-[#F7F6F3]/60 border border-[#8E8B83]/20 p-3">
                    <div className="mb-2 px-1 pt-0.5 flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-[#4E4B44]">
                        {locale === "th" ? "ระบบไฟฟ้า" : "Electrical Phase"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 flex-1 items-stretch">
                      {phaseOptions.map((phase) => {
                        const active = phase.id === electricalPhase;

                        return (
                          <button
                            key={phase.id}
                            type="button"
                            onClick={() => {
                              setElectricalPhase(phase.id);
                            }}
                            className={cn(
                              "h-full flex flex-col justify-between rounded-2xl px-4 py-4 text-left transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95",
                              "lg-tile",
                              active && "lg-tile--selected",
                              active
                                ? "bg-[#B7D1EA] text-white shadow-md font-bold"
                                : "text-[#4E4B44] font-medium hover:text-[#1C1C1A] hover:bg-white/60",
                            )}
                          >
                            <div>
                              <span className={cn("block text-sm font-bold", active ? "text-white" : "text-[#1C1C1A]")}>
                                {phase.label}
                              </span>
                              <span className={cn("mt-1 block text-xs font-medium leading-5", active ? "text-white/80" : "text-[#4E4B44]")}>
                                {phase.helper}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ConfigSection>

              <ConfigSection
                step="3"
                icon={<Zap className="h-5 w-5" />}
                title="Inverter Architecture"
                description="Choose the system behavior first. The specific certified inverter model will be confirmed in the proposal."
                isLocked={3 > effectiveMaxUnlockedSubStep}
                locale={locale}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
                  {architectures.map((option) => {
                    const active = option.id === architectureId;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => {
                          setArchitectureId(option.id);
                          scrollToBuildStep(4);
                        }}
                        data-selected={active}
                        className={cn(
                          "solar-choice-card h-full flex flex-col justify-between rounded-[24px] border p-6 text-left transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] cursor-pointer active:scale-95",
                          "lg-tile",
                          active && "lg-tile--selected",
                          active
                            ? "border-[#7CA8D0] bg-[#DCE8F5]/50 ring-2 ring-[#B7D1EA] shadow-md"
                            : "border-[#8E8B83]/20 bg-[#E6E3DC] hover:border-[#7CA8D0]/40 hover:scale-[1.01] hover:shadow-md",
                        )}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="space-y-2">
                            <h3 className="text-lg font-bold text-[#1C1C1A]">
                              {option.title}
                            </h3>
                            <p className="text-sm font-medium leading-7 text-[#4E4B44]">
                              {option.description}
                            </p>
                          </div>
                          {active ? <SelectedBadge /> : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </ConfigSection>

              <ConfigSection
                step="4"
                icon={<Smartphone className="h-5 w-5" />}
                title="Smart Add-ons"
                description="Select optional readiness modules. These are category-level features, not product SKUs."
                isLocked={4 > effectiveMaxUnlockedSubStep}
                locale={locale}
              >
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  {standardAddons.map((option) => {
                    const isSelectType =
                      option.inputType === "SELECT" &&
                      option.optionsList &&
                      option.optionsList.length > 0;
                    const selectedOptId = isSelectType
                      ? selectedAddOns.find((selId) =>
                          option.optionsList?.some(
                            (opt) =>
                              opt.id === selId ||
                              selId === `${option.id}_${opt.id}`,
                          ),
                        ) || option.optionsList?.[0]?.id
                      : null;
                    const selectedOpt =
                      isSelectType && selectedOptId
                        ? option.optionsList?.find(
                            (o) =>
                              o.id === selectedOptId ||
                              selectedOptId === `${option.id}_${o.id}`,
                          ) || option.optionsList?.[0]
                        : null;

                    const active = isSelectType
                      ? selectedAddOns.some(
                          (id) =>
                            option.optionsList?.some(
                              (opt) =>
                                opt.id === id ||
                                id === `${option.id}_${opt.id}`,
                            ) || id === option.id,
                        )
                      : selectedAddOns.includes(option.id);

                    const priceBadgeText =
                      isSelectType && selectedOpt
                        ? `+ ${formatPrice(selectedOpt.price)}`
                        : option.priceDelta;

                    return (
                      <div
                        key={option.id}
                        onClick={() => {
                          if (isSelectType && selectedOpt) {
                            toggleAddOn(selectedOpt.id);
                          } else {
                            toggleAddOn(option.id);
                          }
                        }}
                        data-selected={active}
                        className={cn(
                          "solar-choice-card flex flex-col justify-between min-h-[175px] rounded-[24px] border bg-[#E6E3DC] p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:border-[#7CA8D0] hover:scale-[1.01] hover:shadow-md active:scale-95 cursor-pointer",
                          active
                            ? "border-[#7CA8D0] bg-[#DCE8F5]/50 ring-2 ring-[#B7D1EA] shadow-md"
                            : "border-transparent",
                        )}
                      >
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCE8F5] text-[#2E2C27] shadow-xs">
                              {option.icon}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[#B7D1EA]/15 px-2.5 py-1 text-[11px] font-bold text-[#4F7FA8]">
                                {priceBadgeText}
                              </span>
                              {active ? <SelectedBadge /> : null}
                            </div>
                          </div>
                          <h3 className="text-sm font-bold text-[#1C1C1A]">
                            {option.title}
                          </h3>
                          <p className="mt-1.5 text-xs font-medium leading-5 text-[#4E4B44]">
                            {option.description}
                          </p>
                        </div>

                        {isSelectType && active && option.optionsList && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 flex items-center gap-1 rounded-full bg-[#F7F6F3] p-1 border border-[#8E8B83]/20"
                          >
                            {option.optionsList.map((opt) => {
                              const isOptActive =
                                selectedAddOns.includes(opt.id) ||
                                selectedAddOns.includes(
                                  `${option.id}_${opt.id}`,
                                );
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAddOn(opt.id);
                                  }}
                                  className={cn(
                                    "flex-1 rounded-full py-1 text-[11px] font-bold transition-all cursor-pointer active:scale-95",
                                    isOptActive
                                      ? "bg-[#B7D1EA] text-white shadow-xs"
                                      : "text-[#4E4B44] hover:text-[#1C1C1A]",
                                  )}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {(() => {
                    const list = (
                      activeBuildConfig.smartAddons ||
                      DEFAULT_BUILD_CONFIG.smartAddons
                    ).filter((item) => item.isVisible !== false);
                    const batteryAddon = list.find(
                      (item) =>
                        item.category === "BATTERY" ||
                        item.id.includes("battery"),
                    );
                    if (batteryAddon && batteryAddon.isVisible === false)
                      return null;

                    const batteryOptionIds = new Set<string>();
                    if (batteryAddon) {
                      batteryOptionIds.add(batteryAddon.id);
                      batteryAddon.optionsList?.forEach((opt) =>
                        batteryOptionIds.add(opt.id),
                      );
                    }
                    batterySizes.forEach((s) => batteryOptionIds.add(s.id));

                    const activeBatteryId = selectedAddOns.find(
                      (item) =>
                        batteryOptionIds.has(item) ||
                        item.startsWith("battery"),
                    );
                    const hasBattery = !!activeBatteryId;
                    const activeBattery =
                      batterySizes.find((s) => s.id === activeBatteryId) ||
                      batterySizes[0];
                    const batteryTitle = batteryAddon?.name || "Battery";
                    const batteryDesc =
                      batteryAddon?.description ||
                      (locale === "th"
                        ? "แบตเตอรี่กักเก็บพลังงานสำหรับระบบไฮบริด"
                        : "Optional energy storage sizing for Hybrid-ready projects.");

                    return (
                      <div
                        onClick={() =>
                          toggleAddOn(batteryAddon?.id || "battery")
                        }
                        data-selected={hasBattery}
                        className={cn(
                          "solar-choice-card flex flex-col justify-between min-h-[175px] rounded-[24px] border bg-[#E6E3DC] p-5 text-left transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:border-[#7CA8D0] cursor-pointer hover:scale-[1.01] hover:shadow-md active:scale-95",
                          hasBattery
                            ? "border-[#7CA8D0] bg-[#DCE8F5]/50 ring-2 ring-[#B7D1EA] shadow-md"
                            : "border-transparent",
                        )}
                      >
                        <div>
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#DCE8F5] text-[#2E2C27] shadow-xs">
                              <Battery className="h-5 w-5" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-[#B7D1EA]/15 px-2.5 py-1 text-[11px] font-bold text-[#4F7FA8]">
                                {hasBattery
                                  ? activeBattery.priceDelta
                                  : batterySizes[0].priceDelta}
                              </span>
                              {hasBattery ? <SelectedBadge /> : null}
                            </div>
                          </div>
                          <h3 className="text-sm font-bold text-[#1C1C1A]">
                            {batteryTitle}
                          </h3>
                          <p className="mt-1 text-xs font-medium leading-5 text-[#4E4B44]">
                            {batteryDesc}
                          </p>
                        </div>

                        {hasBattery && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            className="mt-3 flex items-center gap-1 rounded-full bg-[#F7F6F3] p-1 border border-[#8E8B83]/20"
                          >
                            {batterySizes.map((size) => (
                              <button
                                key={size.id}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleAddOn(size.id);
                                }}
                                className={cn(
                                  "flex-1 rounded-full py-1 text-center text-xs font-bold transition-all cursor-pointer active:scale-95",
                                  activeBatteryId === size.id
                                    ? "bg-[#B7D1EA] text-white shadow-xs"
                                    : "text-[#4E4B44] hover:text-[#1C1C1A] hover:bg-white/50",
                                )}
                              >
                                {size.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </ConfigSection>
              </div>
            </div>
            <BuildLiveSummary
              locale={locale}
              title={locale === "th" ? "แผนพลังงานของคุณ" : "Your solar plan"}
              description={
                locale === "th"
                  ? "ปรับตัวเลือกด้านซ้าย แล้วดูภาพรวมแผนของคุณอัปเดตทันที"
                  : "Tune the choices on the left and keep your plan in view as it updates."
              }
              systemSizeLabel={locale === "th" ? "ขนาดระบบ" : "System size"}
              systemSize={selectedCapacity?.label ?? (locale === "th" ? "เลือกขนาดระบบ" : "Select size")}
              priceLabel={locale === "th" ? "งบประมาณเริ่มต้น" : "Starting estimate"}
              price={
                isContactPrice || estimate === null ? (
                  displayPrice
                ) : (
                  <GsapCounter
                    value={Math.round(estimate)}
                    formatter={(amount) => formatPrice(Math.round(amount))}
                    duration={1}
                  />
                )
              }
              savingsLabel={locale === "th" ? "ประหยัดต่อเดือน" : "Monthly savings"}
              savings={
                <GsapCounter
                  value={Math.round(estimatedMonthlySavings)}
                  formatter={(amount) => formatPrice(Math.round(amount))}
                  duration={1}
                />
              }
              profileLabel={locale === "th" ? "โปรไฟล์ระบบ" : "System profile"}
              profile={`${pricingTier.toUpperCase()} · ${electricalPhase}-Phase`}
              architectureLabel={locale === "th" ? "รูปแบบอินเวอร์เตอร์" : "Inverter"}
              architecture={selectedArchitecture.title}
              addOnsLabel={locale === "th" ? "อุปกรณ์เสริม" : "Smart add-ons"}
              addOns={selectedAddOnOptions.length || (locale === "th" ? "ไม่มี" : "None")}
              addOnsTotalLabel={locale === "th" ? "ค่าอุปกรณ์เสริม" : "Add-on allowance"}
              addOnsTotal={formatPrice(selectedAddOnsTotal)}
              progressLabel={locale === "th" ? "ความพร้อมของแบบ" : "Design readiness"}
              completedSteps={effectiveMaxUnlockedSubStep}
              totalSteps={4}
              actionLabel={
                !selectedCapacity
                  ? locale === "th"
                    ? "เลือกขนาดระบบ"
                    : "Select capacity"
                  : effectiveMaxUnlockedSubStep < 3
                    ? locale === "th"
                      ? "เลือกอินเวอร์เตอร์"
                      : "Select inverter"
                    : locale === "th"
                      ? "ดำเนินการต่อ"
                      : "Continue to review"
              }
              actionDisabled={!canProceedToStep2}
              onAction={handlePanelCta}
            />
          </GsapReveal>
        ) : (
          <GsapReveal
            data-solar-reveal
            className="mx-auto max-w-6xl space-y-6"
            from="right"
          >
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setBuilderStep("design");
                window.scrollTo({ top: 120, behavior: "smooth" });
              }}
              className="font-black text-slate-800 hover:bg-slate-100 hover:text-slate-950"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>
                {locale === "th"
                  ? "← ย้อนกลับไปแก้ไขสเปกระบบ (ขั้นตอนที่ 1)"
                  : "← Back to System Design"}
              </span>
            </Button>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              {/* Left Column: Sticky Design Profile Card & System Specs */}
              <div className="solar-route-card lg:col-span-5 lg:sticky lg:top-24 self-start relative overflow-hidden rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm space-y-5">
                <div className="relative z-10 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#1C1C1A]">
                      {t("designProfile")}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#4E4B44]">
                      {t("readyForReview")}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="quiet"
                    size="icon"
                    onClick={resetConfiguration}
                    className="rounded-full bg-[#DCE8F5] text-[#2E2C27] hover:bg-[#DCE8F5] active:scale-95"
                    aria-label="Reset configuration"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-5 space-y-3">
                  <SummaryRow
                    label="Capacity Tier"
                    value={selectedCapacity?.label ?? "Unselected"}
                  />
                  <SummaryRow
                    label="Solution Tier"
                    value={`${pricingTier.toUpperCase()} · ${electricalPhase}-Phase`}
                  />
                  <SummaryRow
                    label="Panels Estimate"
                    value={
                      selectedCapacity
                        ? `${roughPanelMin} - ${roughPanelMax} generic mono panels`
                        : "Unselected"
                    }
                  />
                  <SummaryRow
                    label="Architecture"
                    value={selectedArchitecture.title}
                  />
                  <SummaryRow
                    label="Smart Add-ons"
                    value={
                      selectedAddOnOptions.length
                        ? `${selectedAddOnOptions.length} selected`
                        : "None"
                    }
                  />
                  <SummaryRow
                    label="Monthly Savings"
                    value={
                      <>
                        Approx.{" "}
                        <AnimatedNumber
                          value={estimatedMonthlySavings}
                          formatter={(amount) =>
                            formatPrice(Math.round(amount))
                          }
                        />
                      </>
                    }
                  />
                </div>

                <BudgetBlock
                  value={estimate}
                  displayPrice={displayPrice}
                  isContactPrice={isContactPrice}
                  locale={locale}
                />

                <ContactDetailsExpanded
                  systemKwp={selectedCapacity?.kwp ?? 5}
                  capacityLabel={selectedCapacity?.label ?? "Unselected"}
                  pricingTier={pricingTier}
                  electricalPhase={electricalPhase}
                  architectureId={architectureId}
                  architectureTitle={selectedArchitecture.title}
                  selectedAddOnsCount={selectedAddOnOptions.length}
                  addOnTitles={selectedAddOnOptions.map((o) => o.title)}
                  estimatedMonthlySavings={estimatedMonthlySavings}
                  estimate={estimate}
                  displayPrice={displayPrice}
                  isContactPrice={isContactPrice}
                  roughPanelMin={roughPanelMin}
                  roughPanelMax={roughPanelMax}
                  siteLocation={siteLocation}
                  locale={locale}
                  isExpanded={true}
                  onToggleExpand={() => {}}
                />
              </div>

              {/* Right Column: Full Contact Details Form */}
              <div className="solar-route-card lg:col-span-7 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm">
                <form
                  onSubmit={handleConsultationSubmit}
                  data-bagui="form"
                  data-analytics-form="build_consultation"
                  data-analytics-submit-event="build_quote_requested"
                  className="space-y-5"
                >
                  <div>
                    <h2 className="text-xl font-bold text-[#1C1C1A]">
                      {t("contactDetails")}
                    </h2>
                    <p className="mt-1 text-sm font-medium text-[#4E4B44]">
                      {user
                        ? "บัญชีของคุณถูกเติมข้อมูลเริ่มต้นให้แล้ว"
                        : "ส่งข้อมูลให้ทีมวิศวกรประเมินระบบจริง"}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4">
                    <LeadField label="Name">
                      <Input
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3.5 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"
                        placeholder={
                          userDefaults.name || "ชื่อ - นามสกุลของคุณ"
                        }
                      />
                    </LeadField>

                    <LeadField label="Email">
                      <Input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                        className="w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3.5 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"
                        placeholder={userDefaults.email || "name@example.com"}
                      />
                    </LeadField>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <LeadField label="Phone">
                        <Input
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          required
                          className="w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3.5 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"
                          placeholder={userDefaults.phone || "08x-xxx-xxxx"}
                        />
                      </LeadField>
                      <LeadField label="Postal Code">
                        <Input
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          required
                          inputMode="numeric"
                          className="w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3.5 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"
                          placeholder="10110"
                        />
                      </LeadField>
                    </div>

                    <div>
                      <button
                        type="button"
                        onClick={() => setSiteLocationOpen((open) => !open)}
                        className="flex min-h-12 w-full items-center justify-between rounded-xl bg-[#F7F6F3] px-4 text-left text-sm font-medium text-[#1C1C1A] transition-colors duration-300 hover:bg-[#DCE8F5]/40 cursor-pointer"
                        aria-expanded={siteLocationOpen}
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <MapPin className="h-4 w-4 text-[#4F7FA8]" />
                          <span className="truncate">
                            {siteLocation?.displayName ||
                              "ปักหมุดตำแหน่งสถานที่ติดตั้ง (เลือกบนแผนที่)"}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-[#4E4B44]">
                          Optional
                        </span>
                      </button>
                      {siteLocationOpen && (
                        <div className="mt-3">
                          <ServiceLocationPicker
                            locale={locale}
                            value={siteLocation}
                            onChange={setSiteLocation}
                          />
                        </div>
                      )}
                    </div>

                    <LeadField label="Preferred Contact Time">
                      <div className="relative">
                        <Calendar className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4E4B44]" />
                        <Input
                          type="datetime-local"
                          value={preferredDateTime}
                          onChange={(e) => setPreferredDateTime(e.target.value)}
                          required
                          className="w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] py-3.5 pl-11 pr-4 text-sm font-medium text-[#1C1C1A] outline-none transition [color-scheme:light] focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"
                        />
                      </div>
                    </LeadField>

                    <LeadField label="Vendor Notes">
                      <Textarea
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        rows={3}
                        className="w-full resize-none rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3.5 text-sm font-medium leading-6 text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"
                        placeholder="ระบุแบรนด์หรืออุปกรณ์ที่ต้องการเป็นพิเศษ (ถ้ามี)"
                      />
                    </LeadField>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    disabled={isSubmittingLead}
                    className="solar-route-primary mt-6 w-full rounded-full bg-[#B7D1EA] hover:bg-[#A5C2DE] text-white px-5 py-4 text-sm font-bold shadow-md transition-all active:scale-95"
                  >
                    <Send className="h-4 w-4" />
                    {isSubmittingLead
                      ? "กำลังส่งคำขอ..."
                      : "ยืนยันการส่งข้อมูลประเมินราคา"}
                  </Button>
                </form>
              </div>
            </div>
          </GsapReveal>
        )}
      </div>

      <LayerPortal layer="floating">
        <div className="solar-build-desktop-action-bar fixed inset-x-0 bottom-0 hidden px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 lg:block">
          <div className="solar-build-action-dock mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-5">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#4E4B44]">
                {locale === "th" ? "ประมาณการงบประมาณ" : "Estimated Budget"}
              </p>
              <div className="text-xl font-bold text-[#1C1C1A] md:text-3xl">
                {!selectedCapacity ? (
                  <span className="text-base font-medium text-[#4E4B44]/70">
                    {locale === "th"
                      ? "โปรดเลือกขนาดระบบ (ขั้นตอนที่ 1)"
                      : "Please select system capacity"}
                  </span>
                ) : isContactPrice || estimate === null ? (
                  <span className="text-xl font-bold text-[#4F7FA8]">
                    {displayPrice}
                  </span>
                ) : (
                  <AnimatedNumber
                    value={estimate ?? 0}
                    formatter={(val) => formatPrice(Math.round(val))}
                  />
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {builderStep === "design" ? (
                <Button
                  type="button"
                  size="lg"
                  variant="primary"
                  onClick={handlePanelCta}
                  disabled={!canProceedToStep2}
                  className={cn(
                    "solar-route-primary shrink-0 rounded-full px-7 py-4 text-sm font-bold active:scale-95 transition-all",
                    !canProceedToStep2
                      ? "cursor-not-allowed bg-[#F7F6F3] text-[#4E4B44] opacity-70"
                      : "cursor-pointer bg-[#B7D1EA] text-white hover:bg-[#A5C2DE] shadow-md",
                  )}
                >
                  <span>
                    {!selectedCapacity
                      ? locale === "th"
                        ? "โปรดเลือกขนาดระบบ"
                        : "Select Capacity"
                      : effectiveMaxUnlockedSubStep < 3
                        ? locale === "th"
                          ? "เลือก Inverter Architecture"
                          : "Select Inverter"
                        : locale === "th"
                          ? "ดำเนินการต่อ (ขั้นตอนที่ 2)"
                          : "Proceed to Step 2"}
                  </span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="lg"
                  onClick={() => {
                    const form = document.querySelector("form");
                    if (form) form.requestSubmit();
                  }}
                  disabled={isSubmittingLead}
                  className="solar-route-primary rounded-full bg-[#B7D1EA] px-7 py-4 text-sm font-bold text-white hover:bg-[#A5C2DE] active:scale-95 shadow-md transition-all"
                >
                  <Send className="h-4 w-4" />
                  <span>
                    {isSubmittingLead
                      ? locale === "th"
                        ? "กำลังส่งคำขอ..."
                        : "Submitting..."
                      : locale === "th"
                        ? "ยืนยันการส่งข้อมูลประเมินราคา"
                        : "Submit Consultation Request"}
                  </span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </LayerPortal>

      <MobileActionBar
        className="solar-build-action-bar"
        label={t("estimatedBudget")}
        value={
          !selectedCapacity ? (
            <span className="text-xs font-bold text-[#4E4B44]/70">
              {locale === "th" ? "โปรดเลือกขนาดระบบ" : "Select system size"}
            </span>
          ) : isContactPrice || estimate === null ? (
            displayPrice
          ) : (
            <AnimatedNumber
              value={estimate}
              formatter={(amount) => formatPrice(Math.round(amount))}
            />
          )
        }
        valueClassName={
          !selectedCapacity
            ? "text-xs text-[#4E4B44]/70"
            : isContactPrice
              ? "text-sm text-[#4F7FA8] font-bold"
              : undefined
        }
        actionLabel={
          !selectedCapacity
            ? locale === "th"
              ? "เลือกระบบ"
              : "Select size"
            : builderStep === "design" && effectiveMaxUnlockedSubStep < 3
              ? locale === "th"
                ? "เลือก Inverter"
                : "Select Inverter"
              : builderStep === "design"
                ? locale === "th"
                  ? "ดำเนินการต่อ"
                  : "Proceed"
                : locale === "th"
                  ? "ส่งข้อมูล"
                  : "Submit"
        }
        actionIcon={
          builderStep === "design" ? (
            <ArrowRight className="h-4 w-4" />
          ) : (
            <Send className="h-4 w-4" />
          )
        }
        disabled={
          (builderStep === "design" && !canProceedToStep2) ||
          (builderStep === "contact" && isSubmittingLead)
        }
        onClick={
          builderStep === "design"
            ? handlePanelCta
            : () => {
                const form = document.querySelector("form");
                if (form) form.requestSubmit();
              }
        }
        buttonClassName={cn(
          "solar-route-primary rounded-full active:scale-95 transition-all",
          builderStep === "design" && !canProceedToStep2
            ? "cursor-not-allowed bg-[#F7F6F3] text-[#4E4B44] opacity-70"
            : "bg-[#B7D1EA] text-white hover:bg-[#A5C2DE] shadow-md",
        )}
      />
    </div>
  );
}

function ConfigSection({
  step,
  icon,
  title,
  description,
  children,
  isLocked = false,
  locale = "th",
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  isLocked?: boolean;
  locale?: string;
}) {
  const t = useTranslations("ConfiguratorClient");
  return (
    <section
      id={`build-step-${step}`}
      data-bagui="section"
      data-locked={isLocked}
      className={cn(
        "solar-build-section relative scroll-mt-28 rounded-[32px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 shadow-sm transition-all duration-300 md:p-8",
        "lg-panel",
        isLocked
          ? "border-[#8E8B83]/10 bg-[#E6E3DC]/50 shadow-none opacity-60"
          : "",
      )}
    >
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start justify-between">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            className={cn(
              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all",
              isLocked
                ? "bg-[#F7F6F3] text-[#4E4B44]"
                : "bg-[#DCE8F5] text-[#2E2C27]",
            )}
          >
            {isLocked ? <Lock className="h-5 w-5" /> : icon}
          </div>
          <div className="max-w-2xl">
            <p
              className={cn(
                "text-xs font-bold uppercase tracking-wider",
                isLocked ? "text-[#4E4B44]" : "text-[#4F7FA8]",
              )}
            >
              {t("stepLabel", { step })}
            </p>
            <h2
              className={cn(
                "mt-1 text-xl font-bold md:text-2xl",
                isLocked ? "text-[#4E4B44]" : "text-[#1C1C1A]",
              )}
            >
              {title}
            </h2>
            <p
              className={cn(
                "mt-2 text-sm font-medium leading-7",
                isLocked ? "text-[#4E4B44]/70" : "text-[#4E4B44]",
              )}
            >
              {description}
            </p>
          </div>
        </div>

        {isLocked && (
          <div className="inline-flex items-center gap-2 rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9] px-3.5 py-1.5 text-xs font-bold text-[#4E4B44] shadow-xs shrink-0 self-start">
            <Lock className="h-3.5 w-3.5 text-[#4E4B44]" />
            <span>
              {locale === "th"
                ? "เลือกขั้นตอนก่อนหน้าเพื่อปลดล็อก"
                : "Complete previous step to unlock"}
            </span>
          </div>
        )}
      </div>

      <div
        className={cn(
          "transition-all duration-300",
          isLocked &&
            "opacity-40 pointer-events-none select-none filter grayscale-[30%]",
        )}
      >
        {children}
      </div>
    </section>
  );
}

function SelectedBadge() {
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#B7D1EA] text-white shadow-xs">
      <Check className="h-4 w-4 stroke-[3]" />
    </span>
  );
}

function BudgetBlock({
  value,
  displayPrice,
  isContactPrice,
  locale,
  compact = false,
}: {
  value: number | null;
  displayPrice: string;
  isContactPrice: boolean;
  locale: string;
  compact?: boolean;
}) {
  const t = useTranslations("ConfiguratorClient");
  return (
    <div
      className={cn(
        "solar-soft-panel rounded-[24px] bg-[#DCE8F5]/40 border border-[#8E8B83]/20",
        compact ? "mt-5 p-4" : "mt-5 p-5",
      )}
    >
      <p className="text-xs font-bold text-[#4E4B44]">
        {t("estimatedBudget")}
      </p>
      <p
        className={cn(
          "mt-2 font-bold text-[#1C1C1A]",
          isContactPrice
            ? "text-lg text-[#4F7FA8]"
            : compact
              ? "text-2xl"
              : "text-3xl",
        )}
      >
        {isContactPrice || value === null ? (
          displayPrice
        ) : (
          <AnimatedNumber
            value={value}
            formatter={(amount) => formatPrice(Math.round(amount))}
          />
        )}
      </p>
      <p
        className={cn(
          "mt-2 text-xs font-medium text-[#4E4B44]",
          compact ? "leading-5" : "leading-6",
        )}
      >
        {isContactPrice
          ? locale === "th"
            ? "กำลังผลิตหรือเฟสไฟนี้อยู่นอกตารางราคา กรุณาส่งข้อมูลเพื่อประเมินราคาจริง"
            : "This capacity or phase is outside the price matrix. Please submit for a custom quote."
          : locale === "th"
            ? "ราคาเริ่มต้นจากตารางราคาเดียวกับ Wizard Summary ใช้สำหรับเริ่มต้นขอรับคำปรึกษาเบื้องต้น"
            : "Starting price uses the same matrix as Wizard Summary."}
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="solar-soft-panel flex items-start justify-between gap-4 rounded-2xl bg-[#DCE8F5]/40 border border-[#8E8B83]/20 px-4 py-3">
      <span className="text-xs font-bold text-[#4E4B44]">{label}</span>
      <span className="max-w-[190px] text-right text-sm font-bold text-[#1C1C1A]">
        {value}
      </span>
    </div>
  );
}

function LeadField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[11px] font-bold text-[#4E4B44]">
        {label}
      </span>
      {children}
    </label>
  );
}
