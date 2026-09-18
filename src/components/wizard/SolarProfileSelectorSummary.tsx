"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { gsap } from "gsap";
import { useLocale, useTranslations } from "next-intl";
import { Activity, Cpu, Leaf, ShieldCheck, Sparkles, Sun } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import {
  SOLAR_PROFILE_ORDER,
  SOLAR_PROFILES,
  type SolarProfileEcoImpact,
  type SolarProfileId,
} from "@/lib/solarProfiles";

type FeatureKey = "inverter" | "panels" | "warranty";
type ChangeDirection = "upgraded" | "downgraded";

type SolarProfileSelectorSummaryProps = {
  selectedProfileId: SolarProfileId;
  onProfileChange: (profileId: SolarProfileId) => void;
  totalPriceLabel: string;
  ecoImpact: SolarProfileEcoImpact;
  monthlySavingsLabel: string;
};

const featureUpgradeIndex: Record<FeatureKey, number> = {
  panels: 1,
  inverter: 1,
  warranty: 2,
};

const featureIcons: Record<FeatureKey, ReactNode> = {
  inverter: <Cpu className="h-5 w-5" />,
  panels: <Sun className="h-5 w-5" />,
  warranty: <ShieldCheck className="h-5 w-5" />,
};

type SolarProfileCopy = {
  label: string;
  displayName: string;
  helper: string;
  tag: string;
  inverterTech: string;
  technologyFocus: string;
  panelSpec: string;
  warranty: string;
};

function useSolarProfileCopy() {
  const t = useTranslations("SolarProfileSummary");
  const profiles: Record<SolarProfileId, SolarProfileCopy> = {
    value: {
      label: t("profiles.value.label"),
      displayName: t("profiles.value.displayName"),
      helper: t("profiles.value.helper"),
      tag: t("profiles.value.tag"),
      inverterTech: t("profiles.value.inverterTech"),
      technologyFocus: t("profiles.value.technologyFocus"),
      panelSpec: t("profiles.value.panelSpec"),
      warranty: t("profiles.value.warranty"),
    },
    balanced: {
      label: t("profiles.balanced.label"),
      displayName: t("profiles.balanced.displayName"),
      helper: t("profiles.balanced.helper"),
      tag: t("profiles.balanced.tag"),
      inverterTech: t("profiles.balanced.inverterTech"),
      technologyFocus: t("profiles.balanced.technologyFocus"),
      panelSpec: t("profiles.balanced.panelSpec"),
      warranty: t("profiles.balanced.warranty"),
    },
    premium: {
      label: t("profiles.premium.label"),
      displayName: t("profiles.premium.displayName"),
      helper: t("profiles.premium.helper"),
      tag: t("profiles.premium.tag"),
      inverterTech: t("profiles.premium.inverterTech"),
      technologyFocus: t("profiles.premium.technologyFocus"),
      panelSpec: t("profiles.premium.panelSpec"),
      warranty: t("profiles.premium.warranty"),
    },
  };

  return { t, profiles };
}

export default function SolarProfileSelectorSummary({
  selectedProfileId,
  onProfileChange,
  totalPriceLabel,
  ecoImpact,
  monthlySavingsLabel,
}: SolarProfileSelectorSummaryProps) {
  const { t, profiles } = useSolarProfileCopy();
  const locale = useLocale();
  const selectedProfileCopy = profiles[selectedProfileId];

  const treesOver25Years = Math.round(ecoImpact.treeEquivalent * 25);
  const co2Over25Years = ecoImpact.co2TonsPerYear * 25;
  const numberFormatter = new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", { maximumFractionDigits: 1 });

  return (
    <div className="space-y-2">
      <SolarProfileSegmentedControl
        selectedProfileId={selectedProfileId}
        onProfileChange={onProfileChange}
      />

      <section
        key={selectedProfileId}
        data-bagui="card"
        className="solar-summary-profile-card overflow-hidden p-3 sm:p-3.5"
      >
        <div className="flex items-start justify-between gap-2.5 sm:gap-3">
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#4F7FA8] sm:text-[10px]">
              {t("profileEyebrow")}
            </p>
            <h2 className="mt-0.5 text-sm font-black leading-tight text-[#000] sm:text-base">
              {selectedProfileCopy.displayName}
            </h2>
            <p className="mt-0.5 text-[10px] font-bold leading-4 text-slate-700">
              {selectedProfileCopy.helper}
            </p>
          </div>
          <div className="solar-summary-profile-icon flex h-8 w-8 shrink-0 items-center justify-center rounded-lg">
            <Leaf className="h-4 w-4" aria-hidden="true" />
          </div>
        </div>

        <div className="mt-2.5">
          <p className="text-[10px] font-black text-slate-700">
            {t("totalInvestment")}
          </p>
          <p
            key={totalPriceLabel}
            className="mt-0.5 text-xl font-black leading-none tracking-[-0.02em] text-[#000] sm:text-2xl"
          >
            {totalPriceLabel}
          </p>
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <EcoStat
            label={t("stats.treeEquivalent")}
            value={t("units.trees", { count: numberFormatter.format(treesOver25Years) })}
          />
          <EcoStat
            label={t("stats.co2Avoided")}
            value={t("units.tons", { count: numberFormatter.format(co2Over25Years) })}
          />
          <EcoStat label={t("stats.monthlySavings")} value={monthlySavingsLabel} />
        </div>
      </section>
    </div>
  );
}

export function SolarProfileFeatureGrid({
  selectedProfileId,
  compact = false,
}: {
  selectedProfileId: SolarProfileId;
  compact?: boolean;
}) {
  const { t, profiles } = useSolarProfileCopy();
  const selectedProfile = SOLAR_PROFILES[selectedProfileId];
  const selectedProfileCopy = profiles[selectedProfileId];
  const previousProfileRef = useRef<SolarProfileId>(selectedProfileId);
  const gridRef = useRef<HTMLDivElement | null>(null);
  const [changedFeatures, setChangedFeatures] = useState<
    Partial<Record<FeatureKey, ChangeDirection>>
  >({});

  const features = useMemo(
    () =>
      [
        {
          key: "inverter" as const,
          title: t("features.inverter.title"),
          keyword: selectedProfile.id === "premium"
            ? t("features.inverter.premiumKeyword")
            : selectedProfile.id === "balanced"
              ? t("features.inverter.balancedKeyword")
              : t("features.inverter.valueKeyword"),
          value: selectedProfileCopy.inverterTech,
          description: selectedProfileCopy.technologyFocus,
          className: "sm:col-span-2 md:col-span-2",
        },
        {
          key: "panels" as const,
          title: t("features.panels.title"),
          keyword: selectedProfile.id === "premium" ? t("features.panels.premiumKeyword") : t("features.panels.standardKeyword"),
          value: selectedProfileCopy.panelSpec,
          description: t("features.panels.description"),
          className: "sm:col-span-2 md:col-span-1",
        },
        {
          key: "warranty" as const,
          title: t("features.warranty.title"),
          keyword: selectedProfile.id === "premium" ? t("features.warranty.premiumKeyword") : t("features.warranty.standardKeyword"),
          value: selectedProfileCopy.warranty,
          description: t("features.warranty.description"),
          className: "sm:col-span-2 md:col-span-1",
        },
        {
          key: "yield" as const,
          title: t("features.yield.title"),
          keyword: `${Math.round(selectedProfile.simulatorMultiplier * 100)}%`,
          value: t("features.yield.value"),
          description: t("features.yield.description"),
          className: "",
        },
        {
          key: "eco" as const,
          title: t("features.eco.title"),
          keyword: t("features.eco.keyword"),
          value: t("features.eco.value"),
          description: t("features.eco.description"),
          className: "",
        },
      ],
    [selectedProfile, selectedProfileCopy, t],
  );

  useEffect(() => {
    const previousProfileId = previousProfileRef.current;

    if (previousProfileId === selectedProfileId) {
      return;
    }

    const previousIndex = SOLAR_PROFILE_ORDER.indexOf(previousProfileId);
    const nextIndex = SOLAR_PROFILE_ORDER.indexOf(selectedProfileId);

    if (nextIndex > previousIndex) {
      const upgradedFeatures = (
        Object.keys(featureUpgradeIndex) as FeatureKey[]
      ).filter(
          (featureKey) =>
            featureUpgradeIndex[featureKey] <= nextIndex &&
            featureUpgradeIndex[featureKey] > previousIndex,
      );
      setChangedFeatures(
        Object.fromEntries(
          upgradedFeatures.map((featureKey) => [featureKey, "upgraded"]),
        ) as Partial<Record<FeatureKey, ChangeDirection>>,
      );
      previousProfileRef.current = selectedProfileId;
      return undefined;
    }

    if (nextIndex < previousIndex) {
      const downgradedFeatures = (
        Object.keys(featureUpgradeIndex) as FeatureKey[]
      ).filter(
          (featureKey) =>
            featureUpgradeIndex[featureKey] > nextIndex &&
            featureUpgradeIndex[featureKey] <= previousIndex,
      );
      setChangedFeatures(
        Object.fromEntries(
          downgradedFeatures.map((featureKey) => [featureKey, "downgraded"]),
        ) as Partial<Record<FeatureKey, ChangeDirection>>,
      );
      previousProfileRef.current = selectedProfileId;
      return undefined;
    }

    setChangedFeatures({});
    previousProfileRef.current = selectedProfileId;
    return undefined;
  }, [selectedProfileId]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = gsap.utils.toArray<HTMLElement>("[data-profile-feature-card]", grid);
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      gsap.fromTo(
        cards,
        {
          autoAlpha: prefersReducedMotion ? 1 : 0,
          y: prefersReducedMotion ? 0 : 10,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : 0.26,
          stagger: prefersReducedMotion ? 0 : 0.04,
          ease: "expo.out",
        },
      );
    }, grid);

    return () => context.revert();
  }, [selectedProfileId]);

  return (
    <div
      ref={gridRef}
      className={cn(
        "grid",
        compact
          ? "grid-cols-2 gap-2 sm:grid-cols-3"
          : "grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3",
      )}
    >
      {features.map((feature) => {
          const upgraded =
            feature.key === "inverter" ||
            feature.key === "panels" ||
            feature.key === "warranty"
              ? changedFeatures[feature.key] === "upgraded"
              : false;
          const downgraded =
            feature.key === "inverter" ||
            feature.key === "panels" ||
            feature.key === "warranty"
              ? changedFeatures[feature.key] === "downgraded"
              : false;
          const changeDirection =
            upgraded ? "upgraded" : downgraded ? "downgraded" : null;
          const icon =
            feature.key === "yield" ? (
              <Activity className="h-5 w-5" />
            ) : feature.key === "eco" ? (
              <Leaf className="h-5 w-5" />
            ) : (
              featureIcons[feature.key]
            );

          return (
            <article
              key={feature.key}
              data-profile-feature-card
              className={cn(
                compact
                  ? "solar-summary-feature-card solar-summary-feature-card--compact relative flex min-h-0 flex-col justify-between p-3 transition-[background-color,box-shadow,transform] duration-200"
                  : "solar-summary-feature-card relative flex min-h-[132px] flex-col justify-between p-4 transition-[background-color,box-shadow,transform] duration-200 sm:min-h-[156px] sm:p-5",
                upgraded && "solar-summary-feature-card--upgraded",
                downgraded && "solar-summary-feature-card--downgraded",
                !compact && feature.className,
              )}
            >
              {changeDirection ? (
                <span
                  className={cn(
                    "solar-summary-feature-change absolute right-2.5 top-2.5 inline-flex max-w-[calc(100%-1.25rem)] items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black sm:right-3 sm:top-3",
                    changeDirection === "upgraded"
                      ? "solar-summary-feature-change--upgraded"
                      : "solar-summary-feature-change--downgraded",
                  )}
                >
                  <Sparkles className="h-3 w-3" />
                  {changeDirection === "upgraded"
                    ? t("change.upgraded")
                    : t("change.downgraded")}
                </span>
              ) : null}
              <div>
                <div
                  className={cn(
                    "solar-summary-feature-icon flex items-center justify-center",
                    compact
                      ? "h-8 w-8 rounded-lg"
                      : "h-10 w-10 rounded-xl sm:h-11 sm:w-11",
                  )}
                >
                  {icon}
                </div>
                <p
                  className={cn(
                    "font-black uppercase text-slate-700",
                    compact ? "mt-2 text-[9px] leading-tight" : "mt-3 text-xs sm:mt-4",
                  )}
                >
                  {feature.title}
                </p>
                <h3
                  key={`${feature.key}-${feature.value}`}
                  className={cn(
                    "font-black leading-none tracking-[-0.02em] text-[#000]",
                    compact ? "mt-1 text-lg" : "mt-1 text-xl sm:text-2xl",
                  )}
                >
                  {feature.keyword}
                </h3>
                <p
                  className={cn(
                    "font-black text-[#4F7FA8]",
                    compact ? "mt-1 text-[11px] leading-tight" : "mt-1 text-sm",
                  )}
                >
                  {feature.value}
                </p>
              </div>
              <p
                className={cn(
                  "font-bold text-slate-800",
                  compact
                    ? "mt-1.5 text-[10px] leading-tight"
                    : "mt-2 text-[11px] leading-5 sm:text-xs",
                )}
              >
                {feature.description}
              </p>
            </article>
          );
        })}
    </div>
  );
}

function SolarProfileSegmentedControl({
  selectedProfileId,
  onProfileChange,
}: {
  selectedProfileId: SolarProfileId;
  onProfileChange: (profileId: SolarProfileId) => void;
}) {
  const { t, profiles } = useSolarProfileCopy();
  return (
    <div
      role="tablist"
      aria-label={t("profileTabsLabel")}
      className="solar-summary-profile-tabs rounded-xl p-1"
    >
      <div className="grid grid-cols-3 gap-1">
        {SOLAR_PROFILE_ORDER.map((profileId) => {
          const active = selectedProfileId === profileId;

          return (
            <button
              key={profileId}
              type="button"
              onClick={() => onProfileChange(profileId)}
              id={`eco-profile-tab-${profileId}`}
              role="tab"
              aria-selected={active}
              className={cn(
                "solar-summary-profile-tab relative z-10 min-h-10 cursor-pointer rounded-lg px-2 py-1.5 text-center text-xs transition-[background-color,box-shadow,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F7FA8] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F0EEE9]",
                active
                  ? "solar-summary-profile-tab--active font-black"
                  : "text-slate-700 font-bold hover:text-[#000]"
              )}
            >
              <span className="relative block text-xs font-black">
                {profiles[profileId].label}
              </span>
              <span className={cn("relative mt-0.5 block text-[10px] font-extrabold", active ? "text-[#000]" : "text-slate-600")}>
                {profiles[profileId].tag}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function EcoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="solar-summary-eco-stat flex items-center justify-between gap-2 rounded-xl px-3 py-1.5">
      <span className="text-[10px] font-black leading-tight text-[#000]">
        {label}
      </span>
      <span className="shrink-0 text-[11px] font-black text-[#000] sm:text-xs">{value}</span>
    </div>
  );
}
