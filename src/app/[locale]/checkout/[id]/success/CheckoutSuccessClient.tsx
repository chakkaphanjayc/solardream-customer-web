"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, ArrowRight, ShieldCheck, FileText, Sparkles } from "@/components/ui/icons";
import Link from "next/link";
import { GsapPulse, GsapReveal } from "@/components/ui/GsapMotion";
import { SoliaGuide } from "@/components/brand/solia-scenes";

interface VerifiedSlip {
  id: string;
  slipImageUrl: string;
  verifiedAt: Date;
}

interface PaymentMilestone {
  id: string;
  orderId: string;
  milestoneOrder: number;
  milestoneName: string;
  percentage: string;
  amount: string;
  status: "PENDING" | "ACTIVE" | "PAID" | "OVERDUE";
  dueDate: Date | null;
  paidAt: Date | null;
  verifiedSlip?: VerifiedSlip | null;
}

interface Order {
  id: string;
  totalPrice: number;
  status: string;
}

interface CheckoutSuccessClientProps {
  order: Order;
  milestones: PaymentMilestone[];
  locale: string;
}

export default function CheckoutSuccessClient({
  order,
  milestones,
  locale,
}: CheckoutSuccessClientProps) {
  const t = useTranslations("CheckoutSuccess");

  const formatMoney = (value: number | null) => {
    if (value === null || !Number.isFinite(value) || value <= 0) {
      return t("amountPending");
    }

    return value.toLocaleString("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    });
  };

  // Find the last paid milestone
  const paidMilestones = milestones
    .filter((m) => m.status === "PAID")
    .sort((a, b) => b.milestoneOrder - a.milestoneOrder);
  const lastPaidMilestone = paidMilestones[0];

  const isFullyPaid = order.status === "FULLY_PAID" || (milestones.length > 0 && paidMilestones.length === milestones.length);

  return (
    <GsapReveal className="space-y-8 text-center">
      {/* Decorative success illustration */}
      <div className="flex flex-col items-center justify-center space-y-4 pt-6">
        <SoliaGuide
          alt={locale === "th" ? "Solia ฉลองการชำระเงินสำเร็จ" : "Solia celebrating a successful payment"}
          pose="greeting"
          className="h-28 w-24"
          imageSizes="96px"
        />
        <div className="relative">
          {/* Animated rings for premium glow */}
          <GsapPulse className="absolute inset-0 rounded-full bg-[#B7D1EA]/25 blur-xl scale-150">
            <span className="sr-only">{t("paymentComplete")}</span>
          </GsapPulse>
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-emerald-50 border border-emerald-250 shadow-sm">
            {isFullyPaid ? (
              <GsapPulse scale={1.1}>
                <Sparkles className="w-12 h-12 text-emerald-600" />
              </GsapPulse>
            ) : (
              <GsapPulse scale={1.1}>
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </GsapPulse>
            )}
          </div>
        </div>

        <div className="space-y-2 px-4">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 font-sans">
            {isFullyPaid 
              ? t("fullyPaidTitle")
              : t("title")
            }
          </h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-widest leading-relaxed">
            {isFullyPaid
              ? t("fullyPaidSubtitle")
              : t("subtitle")
            }
          </p>
        </div>
      </div>

      {/* Main Details Card */}
      <div className="solar-ui-panel rounded-[2rem] border border-slate-200 bg-[#F0EEE9]/40 p-6 sm:p-8 shadow-sm space-y-6 text-left max-w-md mx-auto">
        <div className="flex items-center gap-2.5 border-b border-slate-200/80 pb-4">
          <FileText className="w-5 h-5 text-slate-700" />
          <h2 className="text-sm font-black text-slate-950 uppercase tracking-wide">
            {t("summaryTitle")}
          </h2>
        </div>

        {lastPaidMilestone ? (
          <div className="space-y-4 font-sans">
            {/* Milestone Title */}
            <div className="flex justify-between items-start text-xs gap-4">
              <span className="font-bold text-slate-500 uppercase tracking-wider shrink-0 mt-1">{t("latestMilestone")}</span>
              <span className="font-sans font-extrabold text-slate-950 text-right">
                {lastPaidMilestone.milestoneName}
              </span>
            </div>

            {/* Amount Paid */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">{t("amount")}</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {formatMoney(Number(lastPaidMilestone.amount))}
              </span>
            </div>

            {/* Payment Status */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">{t("status")}</span>
              <span className="inline-block px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200/60 shadow-2xs">
                {t("statusPaid")}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-4 font-sans">
            {/* Total Price */}
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">{t("totalOrder")}</span>
              <span className="font-mono font-black text-slate-900 text-sm">
                {formatMoney(order.totalPrice)}
              </span>
            </div>
          </div>
        )}

        {/* Verification Info Box */}
        <div className="bg-[#B7D1EA]/15 border border-[#B7D1EA]/30 rounded-2xl p-4 flex items-start gap-3 mt-4">
          <ShieldCheck className="w-5 h-5 text-[#2C486A] shrink-0 mt-0.5" />
          <p className="text-[11px] font-semibold text-slate-700 leading-relaxed">
            {isFullyPaid 
              ? t("fullyPaidDescription")
              : t("description")
            }
          </p>
        </div>
      </div>

      {/* Primary Action Button */}
      <div className="pt-4 max-w-xs mx-auto">
        <Link
          href={`/${locale}/proposals`}
          className="solar-ui-primary w-full"
        >
          <span>{t("buttonHome")}</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </GsapReveal>
  );
}
