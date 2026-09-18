"use client";

import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { SolarLivePlanPanel } from "@/components/ui/solar-system";

type BuildLiveSummaryProps = Readonly<{
  locale: string;
  title: string;
  description: string;
  systemSizeLabel: string;
  systemSize: ReactNode;
  priceLabel: string;
  price: ReactNode;
  savingsLabel: string;
  savings: ReactNode;
  profileLabel: string;
  profile: ReactNode;
  architectureLabel: string;
  architecture: ReactNode;
  addOnsLabel: string;
  addOns: ReactNode;
  addOnsTotalLabel: string;
  addOnsTotal: ReactNode;
  progressLabel: string;
  completedSteps: number;
  totalSteps: number;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
}>;

/**
 * The builder's live plan is a thin route adapter around the canonical plan
 * surface. Pricing and configuration state stay owned by the builder.
 */
export function BuildLiveSummary({
  locale,
  title,
  description,
  systemSizeLabel,
  systemSize,
  priceLabel,
  price,
  savingsLabel,
  savings,
  profileLabel,
  profile,
  architectureLabel,
  architecture,
  addOnsLabel,
  addOns,
  addOnsTotalLabel,
  addOnsTotal,
  progressLabel,
  completedSteps,
  totalSteps,
  actionLabel,
  onAction,
  actionDisabled = false,
}: BuildLiveSummaryProps) {
  const isThai = locale.toLowerCase().startsWith("th");

  return (
    <SolarLivePlanPanel
      className="solar-build-live-sidebar"
      labels={{
        live: isThai ? "อัปเดตสด" : "Live",
        systemSize: systemSizeLabel,
        investment: priceLabel,
        monthlySaving: savingsLabel,
        profile: profileLabel,
        solution: isThai ? "โปรไฟล์ระบบ" : "System profile",
        architecture: architectureLabel,
        addOns: addOnsLabel,
        addOnsTotal: addOnsTotalLabel,
        engineeringNote: isThai
          ? "อุปกรณ์เสริมจะถูกรวมในการตรวจสอบแบบและใบเสนอราคาขั้นสุดท้าย"
          : "Selected additions are included for engineering review and the final quote.",
        progress: progressLabel,
        stepsReady: isThai ? "ขั้นตอนพร้อมแล้ว" : "steps ready",
      }}
      title={title}
      systemSize={systemSize}
      investment={price}
      monthlySaving={savings}
      profile={profile}
      architecture={architecture}
      addOns={addOns}
      addOnsTotal={addOnsTotal}
      description={description}
      progress={{ completedSteps, totalSteps }}
      soliaAlt={isThai ? "Solia กำลังช่วยดูแผนพลังงานของคุณ" : "Solia guiding your live solar plan"}
      soliaPose="energyStudio"
      action={
        <Button
          type="button"
          data-bagui="button"
          size="lg"
          disabled={actionDisabled}
          onClick={onAction}
          className="solar-ui-primary w-full justify-between px-5 py-3.5 text-sm"
        >
          <span>{actionLabel}</span>
          <span aria-hidden="true">→</span>
        </Button>
      }
    />
  );
}
