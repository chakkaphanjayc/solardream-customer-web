"use client";

import { ShieldCheck, Zap, Sparkles } from "@/components/ui/icons";
import { SoliaScene } from "@/components/brand/solia-scenes";
import type { ClientProposal } from "@/types/proposals";
import { useTranslations } from "next-intl";

interface ProposalBentoHeroProps {
  proposal: ClientProposal;
  customerName: string;
  trackRequestNumber: string;
  isSigned: boolean;
}

export function ProposalBentoHero({
  proposal,
  customerName,
  trackRequestNumber,
  isSigned,
}: ProposalBentoHeroProps) {
  const t = useTranslations("ProposalHero");
  const quotationId = proposal.erpnextQuotationId || `SD-QT-${proposal.id.slice(0, 8).toUpperCase()}`;

  return (
    <section className="solar-route-card bg-[var(--sd-raised)] p-5 sm:p-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        {/* Left: Solia Avatar & Greeting */}
        <div className="flex items-start gap-4">
          <div className="relative h-20 w-16 shrink-0 overflow-hidden rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-1.5 shadow-[var(--sd-shadow-1)] sm:h-24 sm:w-20">
            <SoliaScene
              alt={t("soliaAlt")}
              pose={isSigned ? "greeting" : "blueprint"}
              state={isSigned ? "celebrating" : "guiding"}
              position="inline"
              size="compact"
              className="h-full w-full"
              imageSizes="96px"
              loading="eager"
              priority
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sd-blue-600)] px-3.5 py-1 text-[11px] font-bold uppercase text-white shadow-[var(--sd-shadow-1)]">
                <Sparkles className="h-3.5 w-3.5 text-white stroke-[2.5]" />
                {t("officialQuotation")}
              </span>
              {isSigned && (
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3.5 py-1 text-[11px] font-bold uppercase text-emerald-800 shadow-[var(--sd-shadow-1)]">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-800 stroke-[2.5]" />
                  {t("verifiedSigned")}
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-[var(--sd-ink)] md:text-3xl">
              {customerName}
            </h1>
            <p className="max-w-2xl text-xs font-medium leading-5 text-[var(--sd-muted)]">
              {t("soliaLabel")}: {isSigned ? t("signedGreeting") : t("unsignedGreeting")}
            </p>
          </div>
        </div>

        {/* Right: Quick Stats Strip */}
        <div className="flex flex-wrap items-center gap-3 lg:justify-end">
          <div className="flex flex-col justify-center rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-4 py-2.5 shadow-[var(--sd-shadow-1)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">{t("quotationId")}</span>
            <span className="font-mono text-sm font-bold text-[var(--sd-ink)]">{quotationId}</span>
          </div>

          <div className="flex flex-col justify-center rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-4 py-2.5 shadow-[var(--sd-shadow-1)]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--sd-muted)]">{t("trackRef")}</span>
            <span className="font-mono text-sm font-bold text-[var(--sd-ink)]">{trackRequestNumber}</span>
          </div>

          <div className="flex flex-col justify-center rounded-[var(--sd-radius-md)] border border-[var(--sd-blue-600)]/20 bg-[var(--sd-selected)] px-4 py-2.5 shadow-[var(--sd-shadow-1)]">
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[var(--sd-ink)]">
              <Zap className="h-3.5 w-3.5 text-[var(--sd-blue-600)] stroke-[2.5]" />
              {t("systemCapacity")}
            </span>
            <span className="text-sm font-bold text-[var(--sd-ink)]">{proposal.systemSizeKwp.toFixed(2)} kWp</span>
          </div>
        </div>
      </div>
    </section>
  );
}
