"use client";

import { DollarSign, Zap, TrendingUp, Calendar, CreditCard, Sparkles } from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import type { ClientProposal } from "@/types/proposals";
import { useTranslations } from "next-intl";

interface ProposalFinancialsCardProps {
  proposal: ClientProposal;
}

export function ProposalFinancialsCard({ proposal }: ProposalFinancialsCardProps) {
  const t = useTranslations("ProposalFinancials");
  const financing = proposal.selectedFinancing;
  const hasPrice = Number.isFinite(proposal.totalPrice) && proposal.totalPrice > 0;
  const hasSystemSize = Number.isFinite(proposal.systemSizeKwp) && proposal.systemSizeKwp > 0;
  const hasMonthlySavings = Number.isFinite(proposal.monthlySavings) && proposal.monthlySavings > 0;
  const hasPanelCount = Number.isFinite(proposal.panelCount) && proposal.panelCount > 0;
  const hasPayback = Boolean(
    proposal.paybackPeriod?.trim() &&
      !["-", "—", "n/a", "na", "tbd", "pending", "unknown"].includes(proposal.paybackPeriod.trim().toLowerCase()),
  );

  return (
    <section className="solar-route-card space-y-5 p-5 sm:p-6">
      <div className="flex items-center justify-between border-b border-[var(--sd-line)] pb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-[var(--sd-radius-md)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)] shadow-[var(--sd-shadow-1)]">
            <DollarSign className="h-5 w-5 stroke-[2.5]" />
          </div>
          <h2 className="text-base font-bold text-[var(--sd-ink)]">{t("title")}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3.5 py-1 text-[11px] font-bold uppercase text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]">
          <Sparkles className="h-3.5 w-3.5 text-[var(--sd-blue-600)] stroke-[2.5]" />
          {hasPrice ? t("guaranteed") : t("pricingPending")}
        </span>
      </div>

      {/* Prominent Price Display */}
      <div className="solar-soft-panel space-y-1 p-5">
        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">{t("totalInvestment")}</span>
        <div className="text-3xl font-bold tracking-tight text-[var(--sd-ink)]">
          {hasPrice ? formatPrice(proposal.totalPrice) : t("pricingPending")}
        </div>
        <p className="pt-1 text-xs font-medium leading-5 text-[var(--sd-muted)]">
          {hasPrice ? t("included") : t("pricingPendingDescription")}
        </p>
      </div>

      {/* Financial Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <div className="space-y-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-3.5 shadow-[var(--sd-shadow-1)]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">
            <Zap className="h-3.5 w-3.5 text-[var(--sd-blue-600)] stroke-[2.5]" />
            {t("systemSize")}
          </span>
          <p className="text-sm font-bold text-[var(--sd-ink)]">
            {hasSystemSize ? `${proposal.systemSizeKwp.toFixed(2)} kWp` : t("systemSizePending")}
          </p>
        </div>

        <div className="space-y-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-3.5 shadow-[var(--sd-shadow-1)]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">
            <TrendingUp className="h-3.5 w-3.5 text-[var(--sd-success)] stroke-[2.5]" />
            {t("monthlySavings")}
          </span>
          <p className="text-sm font-bold text-[var(--sd-ink)]">
            {hasMonthlySavings ? formatPrice(proposal.monthlySavings) : t("monthlySavingsPending")}
          </p>
        </div>

        <div className="space-y-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-3.5 shadow-[var(--sd-shadow-1)]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">
            <Calendar className="h-3.5 w-3.5 text-[var(--sd-blue-600)] stroke-[2.5]" />
            {t("paybackPeriod")}
          </span>
          <p className="text-sm font-bold text-[var(--sd-ink)]">
            {hasPayback ? t("years", { count: proposal.paybackPeriod }) : t("paybackPending")}
          </p>
        </div>

        <div className="space-y-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-3.5 shadow-[var(--sd-shadow-1)]">
          <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">
            <CreditCard className="h-3.5 w-3.5 text-[var(--sd-blue-600)] stroke-[2.5]" />
            {t("panelUnits")}
          </span>
          <p className="text-sm font-bold text-[var(--sd-ink)]">
            {hasPanelCount ? t("panels", { count: proposal.panelCount }) : t("panelsPending")}
          </p>
        </div>
      </div>

      {/* Financing Tag */}
      {financing && (
        <div className="space-y-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-selected)] p-4 text-xs font-medium text-[var(--sd-ink)]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">{t("paymentOption")}</span>
            <span className="rounded-full bg-[var(--sd-raised)] px-3 py-0.5 text-[10px] font-bold text-[var(--sd-ink)]">
              {financing.providerName}
            </span>
          </div>
          <p className="text-sm font-bold text-[var(--sd-ink)]">
            {financing.marketingTag || financing.financeType}
          </p>
          {financing.maxTermMonths && (
            <p className="text-[11px] font-medium text-[var(--sd-muted)]">
              {t("installment", { months: financing.maxTermMonths, rate: financing.interestRate ? `${financing.interestRate}%` : t("standardRate") })}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
