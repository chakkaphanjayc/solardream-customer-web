"use client";

import { Wallet } from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ClientPaymentRequest } from "@/components/proposals/portalTypes";
import { useTranslations } from "next-intl";

interface PaymentMilestoneProgressProps {
  totalProjectPrice: number | null;
  paymentRequests: ClientPaymentRequest[];
  onSelectMilestone?: (request: ClientPaymentRequest) => void;
}

function toPositiveNumber(value: string | number | null | undefined): number | null {
  const parsed = typeof value === "number" ? value : Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export default function PaymentMilestoneProgress({
  totalProjectPrice,
  paymentRequests,
  onSelectMilestone,
}: PaymentMilestoneProgressProps) {
  const t = useTranslations("PaymentMilestones");
  const paidRequests = paymentRequests.filter((req) => req.status === "PAID");
  const hasPaidRequests = paidRequests.length > 0;
  const hasUnknownPaidAmount = paidRequests.some((req) => toPositiveNumber(req.amountRequested) === null);
  const totalPaid = paidRequests.reduce((acc, req) => acc + (toPositiveNumber(req.amountRequested) ?? 0), 0);
  const hasProjectPrice = Number.isFinite(totalProjectPrice) && (totalProjectPrice ?? 0) > 0;
  const remainingBalance = hasProjectPrice && hasPaidRequests && !hasUnknownPaidAmount
    ? Math.max(0, (totalProjectPrice ?? 0) - totalPaid)
    : null;
  const paidPercent = hasProjectPrice && hasPaidRequests && !hasUnknownPaidAmount
    ? Math.min(100, Math.round((totalPaid / (totalProjectPrice ?? 1)) * 100))
    : null;

  const defaultMilestones = [
    {
      stage: 1,
      titleKey: "milestone1Title",
      percentLabel: "30%",
      descriptionKey: "milestone1Description",
    },
    {
      stage: 2,
      titleKey: "milestone2Title",
      percentLabel: "60%",
      descriptionKey: "milestone2Description",
    },
    {
      stage: 3,
      titleKey: "milestone3Title",
      percentLabel: "10%",
      descriptionKey: "milestone3Description",
    },
  ] as const;

  return (
    <div className="solar-route-card space-y-6 p-5 md:p-6">
      {/* Header Summary */}
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--sd-line)] pb-5 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--sd-muted)]">
            <Wallet className="h-4 w-4 text-[var(--sd-blue-600)]" />
            <span>{t("eyebrow")}</span>
          </div>
          <h3 className="mt-1 text-lg font-black tracking-tight text-[var(--sd-ink)]">{t("title")}</h3>
        </div>

        <div className="solar-soft-panel flex items-center gap-4 p-3">
          <div className="border-r border-[var(--sd-line)] pr-4 text-right">
            <p className="text-[10px] font-bold uppercase text-[var(--sd-muted)]">{t("paidTotal")}</p>
            <p className="font-mono text-sm font-black text-emerald-700">
              {hasUnknownPaidAmount || !hasPaidRequests ? t("noPayments") : formatPrice(totalPaid)} ({paidPercent === null ? t("progressPending") : `${paidPercent}%`})
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-[var(--sd-muted)]">{t("remaining")}</p>
            <p className="font-mono text-sm font-black text-[var(--sd-ink)]">{remainingBalance === null ? t("amountPending") : formatPrice(remainingBalance)}</p>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-bold text-[var(--sd-muted)]">
          <span>{t("paymentProgress")}</span>
          <span className="font-mono text-emerald-700">{paidPercent === null ? t("progressPending") : `${paidPercent}% ${t("completed")}`}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full border border-[var(--sd-line)] bg-[var(--sd-surface-strong)] p-0.5">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--sd-blue-600)] to-emerald-500 shadow-xs transition-all duration-500 motion-reduce:transition-none"
            style={{ width: `${paidPercent ?? 0}%` }}
          />
        </div>
      </div>

      {/* 3-Step Milestone Cards */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {defaultMilestones.map((m, idx) => {
          const title = t(m.titleKey);
          const matchedRequest = paymentRequests[idx] || paymentRequests.find((r) => r.title.includes(title));
          const isPaid = matchedRequest?.status === "PAID";
          const isAwaiting = matchedRequest?.status === "AWAITING_VERIFICATION";
          const isPending = matchedRequest?.status === "PENDING";
          const matchedAmount = matchedRequest ? toPositiveNumber(matchedRequest.amountRequested) : null;

          return (
            <button
              type="button"
              key={m.stage}
              onClick={() => matchedRequest && onSelectMilestone?.(matchedRequest)}
              disabled={!matchedRequest}
              aria-label={matchedRequest ? t("selectMilestone", { stage: m.stage, title }) : undefined}
              className={`min-h-40 w-full space-y-3 rounded-[var(--sd-radius-lg)] border p-4 text-left transition motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 ${
                matchedRequest ? "cursor-pointer hover:shadow-md" : ""
              } ${
                isPaid
                  ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400/20"
                  : isAwaiting
                  ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-400/20"
                  : isPending
                  ? "bg-[var(--sd-raised)] border-[var(--sd-blue-500)] ring-2 ring-[var(--sd-blue-500)]/20"
                  : "bg-[var(--sd-soft-solar)] border-[var(--sd-line)] opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`h-7 w-7 rounded-full text-xs font-black flex items-center justify-center ${
                  isPaid ? "bg-emerald-600 text-white" : "bg-[var(--sd-navy-950)] text-white"
                }`}>
                  {m.stage}
                </span>

                {isPaid ? (
                  <StatusBadge tone="success" className="text-[10px]">
                    {t("paid", { percent: m.percentLabel })}
                  </StatusBadge>
                ) : isAwaiting ? (
                  <StatusBadge tone="warning" className="text-[10px]">
                    {t("awaiting")}
                  </StatusBadge>
                ) : isPending ? (
                  <StatusBadge tone="info" className="text-[10px]">
                    {t("pending", { percent: m.percentLabel })}
                  </StatusBadge>
                ) : (
                  <StatusBadge tone="neutral" className="text-[10px]">
                    {t("next", { percent: m.percentLabel })}
                  </StatusBadge>
                )}
              </div>

              <div>
                <p className="text-xs font-black text-[var(--sd-ink)]">{title}</p>
                <p className="mt-1 text-[11px] font-semibold leading-relaxed text-[var(--sd-muted)]">{t(m.descriptionKey)}</p>
              </div>

              {matchedRequest && (
                <div className="flex items-center justify-between border-t border-[var(--sd-line)] pt-2 text-xs">
                  <span className="font-bold text-[var(--sd-muted)]">{t("amount")}</span>
                  <span className="font-mono font-black text-[var(--sd-ink)]">
                    {matchedAmount === null ? t("amountPending") : formatPrice(matchedAmount)}
                  </span>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
