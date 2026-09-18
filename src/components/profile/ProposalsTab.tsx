"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { Badge, type BadgeProps } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Download, FileText } from "@/components/ui/icons";
import { isLocale, toIntlLocale } from "@/i18n/locales";
import { formatPrice } from "@/lib/utils";

interface Proposal {
  id: string;
  systemSizeKwp: number | null;
  panelCount: number | null;
  totalPrice: number | null;
  monthlySavings: number | null;
  paybackPeriod: string | null;
  pdfUrl: string | null;
  status: string;
  createdAt: string | Date;
}

function toPositiveNumber(value: number | null | undefined): number | null {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) && numericValue > 0 ? numericValue : null;
}

function toMeaningfulText(value: string | null | undefined): string | null {
  const normalizedValue = value?.trim() ?? "";
  return normalizedValue && !["-", "—", "n/a", "na"].includes(normalizedValue.toLowerCase())
    ? normalizedValue
    : null;
}

function getSignedProposalDocumentUrl(proposalId: string, download = false) {
  return `/api/proposals/${proposalId}/signed-document${download ? "?download=1" : ""}`;
}

function getStatusVariant(status: string): BadgeProps["variant"] {
  const normalizedStatus = status.toUpperCase();
  if (normalizedStatus === "ACCEPTED" || normalizedStatus === "SIGNED") return "success";
  if (normalizedStatus === "SENT") return "info";
  return "neutral";
}

export default function ProposalsTab({ proposals }: { proposals: Proposal[] }) {
  const t = useTranslations("ProposalsTab");
  const locale = useLocale();
  const intlLocale = toIntlLocale(isLocale(locale) ? locale : "th");

  if (!proposals || proposals.length === 0) {
    return (
      <div className="solar-route-card flex min-h-[28rem] flex-col items-center justify-center px-4 py-12 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-[var(--sd-soft-solar)] text-[var(--sd-blue-600)]">
          <FileText className="h-7 w-7" aria-hidden="true" />
        </span>
        <h2 className="mt-5 text-xl font-bold tracking-tight text-[var(--sd-ink)]">{t("empty.title")}</h2>
        <p className="mt-2 max-w-sm text-pretty text-sm leading-6 text-[var(--sd-muted)]">
          {t("empty.description")}
        </p>
        <Button asChild variant="primary" className="mt-6">
          <Link href={`/${locale}/wizard`}>{t("empty.start")}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div>
      <header>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--sd-ink)]">
          {t("title")} <span className="font-normal text-[#4E4B44]">/ {t("titleSecondary")}</span>
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-sm leading-6 text-[var(--sd-muted)]">
          {t("description")}
        </p>
      </header>

      <div className="mt-7 space-y-5">
        {proposals.map((proposal) => {
          const normalizedStatus = proposal.status.toUpperCase();
          const systemSize = toPositiveNumber(proposal.systemSizeKwp);
          const panelCount = toPositiveNumber(proposal.panelCount);
          const monthlySavings = toPositiveNumber(proposal.monthlySavings);
          const totalPrice = toPositiveNumber(proposal.totalPrice);
          const paybackPeriod = toMeaningfulText(proposal.paybackPeriod);
          const isSigned = normalizedStatus === "SIGNED";
          const documentUrl = isSigned ? getSignedProposalDocumentUrl(proposal.id) : proposal.pdfUrl;
          const downloadUrl = isSigned ? getSignedProposalDocumentUrl(proposal.id, true) : proposal.pdfUrl;
          const downloadName = `Quotation_#${proposal.id.slice(0, 8).toUpperCase()}${isSigned ? "_Signed" : ""}.pdf`;

          return (
            <article
              key={proposal.id}
              className="solar-route-card group p-5 transition-[border-color,box-shadow] duration-200 sm:p-6"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-[var(--sd-muted)]">
                    <Calendar className="h-4 w-4 stroke-[2.5] text-[var(--sd-blue-600)]" aria-hidden="true" />
                    <time dateTime={new Date(proposal.createdAt).toISOString()}>
                      {new Date(proposal.createdAt).toLocaleDateString(intlLocale, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-[var(--sd-ink)]">
                    {t("proposalNumber", { id: proposal.id.slice(0, 8).toUpperCase() })}
                  </h3>
                </div>
                <Badge variant={getStatusVariant(normalizedStatus)}>{proposal.status}</Badge>
              </div>

              <dl className="mt-5 grid grid-cols-2 gap-x-5 gap-y-4 border-y border-[var(--sd-line)] py-5 sm:grid-cols-4">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--sd-muted)]">
                    {t("fields.systemSize")}
                  </dt>
                  <dd className="mt-1 text-base font-bold text-[var(--sd-ink)]">
                    {systemSize === null ? t("fields.systemSizePending") : `${systemSize.toFixed(2)} kWp`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--sd-muted)]">
                    {t("fields.panelCount")}
                  </dt>
                  <dd className="mt-1 text-base font-bold text-[var(--sd-ink)]">
                    {panelCount === null
                      ? t("fields.panelCountPending")
                      : t("fields.panelCountValue", { count: Math.round(panelCount) })}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--sd-muted)]">
                    {t("fields.monthlySavings")}
                  </dt>
                  <dd className="mt-1 text-base font-bold text-[var(--sd-blue-600)]">
                    {monthlySavings === null
                      ? t("fields.monthlySavingsPending")
                      : `~${formatPrice(Math.round(monthlySavings))}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--sd-muted)]">
                    {t("fields.paybackPeriod")}
                  </dt>
                  <dd className="mt-1 text-base font-bold text-[var(--sd-ink)]">
                    {paybackPeriod ?? t("fields.paybackPending")}
                  </dd>
                </div>
              </dl>

              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--sd-muted)]">
                    {t("fields.totalInvestment")}
                  </p>
                  <p className="mt-1 font-mono text-2xl font-black text-[var(--sd-ink)]">
                    {totalPrice === null ? t("fields.pricePending") : formatPrice(Math.round(totalPrice))}
                  </p>
                </div>

                {documentUrl ? (
                  <Button asChild variant="secondary" className="px-5 text-xs font-bold">
                    <a
                      href={downloadUrl || documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={downloadName}
                    >
                      <Download className="stroke-[2.5]" aria-hidden="true" />
                      {isSigned ? t("actions.downloadSigned") : t("actions.downloadPdf")}
                    </a>
                  </Button>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
