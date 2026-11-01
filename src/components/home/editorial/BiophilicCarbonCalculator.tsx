"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import {
  FiArrowRight,
  FiDollarSign,
  FiGlobe,
  FiSliders,
  FiSun,
  FiZap,
} from "react-icons/fi";
import {
  BILL_IMPACT_DEFAULT_MONTHLY_BILL_THB,
  BILL_IMPACT_MAX_MONTHLY_BILL_THB,
  BILL_IMPACT_MIN_MONTHLY_BILL_THB,
  calculateBillImpactEstimate,
  clamp,
} from "../solar-estimates";
import AnimatedNumber from "@/components/ui/AnimatedNumber";
import { cn } from "@/lib/utils";

const BILL_QUICK_PICKS = [
  { label: "฿3,000", value: 3_000, descTh: "บ้านเดี่ยวขนาดเล็ก", descEn: "Compact Home" },
  { label: "฿6,000", value: 6_000, descTh: "บ้านเดี่ยว 3-4 ห้องนอน", descEn: "Family Residence" },
  { label: "฿12,000", value: 12_000, descTh: "บ้านขนาดใหญ่ / แอร์กลางวัน", descEn: "Large Home / Day AC" },
  { label: "฿25,000", value: 25_000, descTh: "โฮมออฟฟิศ / คาเฟ่", descEn: "Home Office / Café" },
  { label: "฿50,000", value: 50_000, descTh: "ธุรกิจ SME / โรงงานขนาดย่อม", descEn: "Commercial SME" },
] as const;

export interface BiophilicCarbonCalculatorProps {
  locale: string;
}

function LeafIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export default function BiophilicCarbonCalculator({ locale }: BiophilicCarbonCalculatorProps) {
  const isTh = locale === "th";
  const sliderId = useId();
  const [monthlyBill, setMonthlyBill] = useState<number>(BILL_IMPACT_DEFAULT_MONTHLY_BILL_THB);

  const estimate = useMemo(() => calculateBillImpactEstimate(monthlyBill), [monthlyBill]);

  const panelCount = Math.max(4, Math.ceil((estimate.solarSizeKwp * 1_000) / 550));

  const formatThb = (val: number) => `฿${val.toLocaleString(isTh ? "th-TH" : "en-US")}`;

  const wizardDeepLink = `/${locale}/wizard?suggestedKwp=${estimate.solarSizeKwp}&monthlyBill=${monthlyBill}`;

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[rgba(60,86,122,0.14)] bg-white p-6 shadow-xl sm:p-10 lg:p-12">
        {/* Top Header & Context */}
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
              <LeafIcon className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isTh ? "ตัวอย่างประมาณการเบื้องต้น" : "Illustrative Planning Estimate"}</span>
            </div>
            <h2 id="calculator-heading" className="mt-4 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl lg:text-4xl">
              {isTh ? "ประเมินผลกระทบต่อโลกและเงินในกระเป๋าของคุณ" : "Calculate Your Ecological & Financial Impact"}
            </h2>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-[var(--sd-text-secondary)]">
              {isTh
                ? "ปรับค่าไฟเพื่อดูตัวอย่างขนาดระบบ พลังงาน และค่าไฟที่อาจประหยัดได้ ตัวเลขนี้ใช้สมมติฐานเบื้องต้นและยังไม่ใช่ใบเสนอราคา"
                : "Adjust your monthly bill to preview a possible system size, energy output, and savings. This uses planning assumptions and is not a quotation."}
            </p>
          </div>

          <div className="lg:col-span-5 flex flex-col justify-end lg:items-end">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 text-left sm:w-80">
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {isTh ? "ค่าไฟฟ้ารายเดือนปัจจุบัน" : "Current Monthly Bill"}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-3xl font-black text-[var(--sd-ink)]">
                  {formatThb(monthlyBill)}
                </span>
                <span className="text-xs font-semibold text-[var(--muted-foreground)]">
                  {isTh ? "/ เดือน" : "/ month"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Bill Slider & Quick Picks */}
        <div className="mt-8 rounded-3xl border border-[rgba(60,86,122,0.12)] bg-[var(--background)] p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <label htmlFor={sliderId} className="flex items-center gap-2 text-sm font-bold text-[var(--sd-ink)]">
              <FiSliders className="h-4 w-4 text-[var(--primary-foreground)]" aria-hidden="true" />
              <span>{isTh ? "เลื่อนปรับค่าไฟฟ้าต่อเดือน (฿1,000 - ฿100,000)" : "Slide to adjust monthly bill"}</span>
            </label>
            <span className="text-xs font-bold text-[var(--muted-foreground)]">
              {isTh ? "ขยับทีละ ฿500" : "Step ฿500"}
            </span>
          </div>

          {/* Accessible Native Range Slider */}
          <div className="relative mt-5">
            <input
              id={sliderId}
              type="range"
              min={BILL_IMPACT_MIN_MONTHLY_BILL_THB}
              max={BILL_IMPACT_MAX_MONTHLY_BILL_THB}
              step={500}
              value={monthlyBill}
              onChange={(e) => setMonthlyBill(clamp(Number(e.target.value), BILL_IMPACT_MIN_MONTHLY_BILL_THB, BILL_IMPACT_MAX_MONTHLY_BILL_THB))}
              className="h-3 w-full cursor-pointer appearance-none rounded-full bg-[#DED8CF] accent-[#5089bf] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#B7D1EA]"
              aria-label={isTh ? "ค่าไฟฟ้าต่อเดือน" : "Monthly electric bill"}
            />
            <div className="mt-2 flex justify-between text-[11px] font-bold text-[var(--muted-foreground)]">
              <span>฿1,000</span>
              <span>฿25,000</span>
              <span>฿50,000</span>
              <span>฿75,000</span>
              <span>฿100,000</span>
            </div>
          </div>

          {/* Quick-Pick Pre-set Pills */}
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs font-bold text-[var(--muted-foreground)]">
              {isTh ? "เลือกเร็ว:" : "Quick picks:"}
            </span>
            {BILL_QUICK_PICKS.map((pick) => {
              const isSelected = monthlyBill === pick.value;
              return (
                <button
                  key={pick.value}
                  type="button"
                  onClick={() => setMonthlyBill(pick.value)}
                  className={cn(
                    "min-h-11 rounded-full px-4 py-2 text-xs font-bold transition-all duration-200 touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]",
                    isSelected
                      ? "bg-[var(--primary)] text-[var(--sd-ink)] shadow-xs font-black ring-2 ring-[#5089bf]"
                      : "bg-white text-[var(--sd-text-secondary)] border border-[rgba(60,86,122,0.14)] hover:bg-[#E8F0F7]",
                  )}
                  title={`${pick.label} (${isTh ? pick.descTh : pick.descEn})`}
                >
                  {pick.label}
                  <span className="hidden sm:inline font-normal opacity-70 ml-1.5">
                    · {isTh ? pick.descTh : pick.descEn}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Estimate output grid */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* 1. Annual Savings */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[rgba(60,86,122,0.12)] bg-[#F8F6F2] p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-800">
                <FiDollarSign className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-amber-200/50 px-2.5 py-0.5 text-[11px] font-black text-amber-900">
                {isTh ? "ประมาณการ" : "Estimate"}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {isTh ? "ประหยัดค่าไฟต่อปีโดยประมาณ" : "Estimated Annual Savings"}
              </p>
              <p className="mt-1 text-3xl font-black text-[var(--sd-ink)]">
                ฿<AnimatedNumber value={estimate.annualSavingsThb} decimals={0} />
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {isTh
                  ? `ประหยัดเฉลี่ยเดือนละ ${formatThb(estimate.monthlySavingsThb)}`
                  : `Approx. ${formatThb(estimate.monthlySavingsThb)}/mo`}
              </p>
            </div>
          </div>

          {/* 2. Estimated Annual Generation */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[rgba(60,86,122,0.12)] bg-[#EDF7F1] p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-200/60 text-emerald-900">
                <FiSun className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="rounded-full bg-emerald-300/40 px-2.5 py-0.5 text-[11px] font-black text-emerald-950">
                {isTh ? "ต่อปี" : "Per Year"}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                {isTh ? "พลังงานที่อาจผลิตได้" : "Estimated Energy Generation"}
              </p>
              <p className="mt-1 text-3xl font-black text-emerald-950">
                <AnimatedNumber value={estimate.annualKwh} decimals={0} />{" "}
                <span className="text-lg font-bold text-emerald-900">kWh</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-emerald-800">
                {isTh ? "อิงค่าแสงแดดเฉลี่ยในแบบจำลอง" : "Uses average sunlight in this model"}
              </p>
            </div>
          </div>

          {/* 3. Carbon Dioxide Avoided */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[rgba(60,86,122,0.12)] bg-[#EBF3FA] p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-200 text-sky-900">
                <FiGlobe className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-sky-300/40 px-2.5 py-0.5 text-[11px] font-black text-sky-950">
                {isTh ? "ประมาณการ" : "Estimate"}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-sky-900">
                {isTh ? "ประมาณการ CO₂ ที่เลี่ยงได้ / ปี" : "Estimated CO₂ avoided per year"}
              </p>
              <p className="mt-1 text-3xl font-black text-sky-950">
                <AnimatedNumber value={estimate.avoidedCo2Tons} decimals={1} />{" "}
                <span className="text-lg font-bold text-sky-900">{isTh ? "ตัน / ปี" : "tons/yr"}</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-sky-800">
                {isTh
                  ? "ผลจริงขึ้นอยู่กับพลังงานที่ผลิตและปัจจัยการปล่อยไฟฟ้า"
                  : "Actual results depend on generation and the grid emissions factor"}
              </p>
            </div>
          </div>

          {/* 4. Recommended System kWp & Panel Count */}
          <div className="relative flex flex-col justify-between overflow-hidden rounded-3xl border border-[rgba(60,86,122,0.12)] bg-[#F5F2EB] p-6 transition-all hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--primary)] text-[var(--sd-ink)]">
                <FiZap className="h-5 w-5" />
              </span>
              <span className="rounded-full bg-[var(--primary)]/60 px-2.5 py-0.5 text-[11px] font-black text-[var(--sd-ink)]">
                {isTh ? "ขนาดสำหรับวางแผน" : "Planning Size"}
              </span>
            </div>
            <div className="mt-6">
              <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
                {isTh ? "ขนาดระบบที่เหมาะสมกับบ้าน" : "Suggested System Size"}
              </p>
              <p className="mt-1 text-3xl font-black text-[var(--sd-ink)]">
                <AnimatedNumber value={estimate.solarSizeKwp} decimals={1} />{" "}
                <span className="text-lg font-bold text-[var(--sd-ink)]">kWp</span>
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-600">
                {isTh
                  ? `ใช้แผงประสิทธิภาพสูงประมาณ ${panelCount} แผง`
                  : `Approx. ${panelCount} high-efficiency panels`}
              </p>
            </div>
          </div>
        </div>

        {/* Assumptions note and next step */}
        <div className="mt-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 rounded-3xl border border-[rgba(60,86,122,0.14)] bg-gradient-to-r from-[var(--background)] via-[#E6DCCD] to-[#DCE8F5] p-6 sm:p-8">
          <div className="max-w-xl">
            <div className="flex items-center gap-2">
              <FiSun className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-black uppercase tracking-wider text-[var(--sd-ink)]">
                {isTh ? "อ่านผลประมาณการอย่างไร" : "How to read this estimate"}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-[var(--sd-ink)]">
              {isTh
                ? "ผลลัพธ์ใช้ค่าไฟ อัตราการใช้พลังงานเอง แสงแดดเฉลี่ย และปัจจัยการปล่อยไฟฟ้าตามแบบจำลอง การผลิตจริงและเงินที่ประหยัดได้เปลี่ยนตามหลังคา เงาบัง อุปกรณ์ พฤติกรรมการใช้ไฟ และอัตราค่าไฟ"
                : "Results use the tariff, self-consumption, average sunlight, and grid emissions assumptions in this model. Actual generation and savings vary with roof conditions, shade, equipment, energy use, and tariffs."}
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href={wizardDeepLink}
              className="inline-flex min-h-12 items-center justify-center gap-3 rounded-full bg-[var(--sd-ink)] px-8 py-3.5 text-sm font-bold text-white shadow-lg transition-all duration-200 hover:bg-[#1C1C1A] hover:scale-[1.02] active:scale-95 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#5089bf]"
            >
              <span>{isTh ? `เริ่มต้นประเมินขนาด ${estimate.solarSizeKwp} kWp นี้ต่อ` : `Proceed with ${estimate.solarSizeKwp} kWp Sizing`}</span>
              <FiArrowRight className="h-4 w-4 stroke-[3]" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
