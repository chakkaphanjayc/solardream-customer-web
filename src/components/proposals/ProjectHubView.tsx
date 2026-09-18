"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import {
  CalendarDays,
  Check,
  Eye,
  ExternalLink,
  FileCheck2,
  FileText,
  HardHat,
  Package,
  ReceiptText,
  UserRound,
  WalletCards,
} from "@/components/ui/icons";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import Skeleton from "@/components/ui/skeleton";
import { SoliaScene } from "@/components/brand/solia-scenes";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import type {
  ProposalProjectHubContract,
  ProposalProjectHubDocumentDto,
  ProposalProjectHubItemDto,
} from "@/types/proposals";

const PROJECT_STEPS = [
  "approval",
  "payment",
  "engineering",
  "installation",
  "finish",
] as const;

export type ProjectHubItem = ProposalProjectHubItemDto;
export type ProjectHubDocument = ProposalProjectHubDocumentDto;
type ProjectHubViewProps = ProposalProjectHubContract;

type ProjectHubTab = "tracking" | "items" | "documents";

function getActiveStep(status: string, currentMilestoneStep: number) {
  const normalized = status.toUpperCase();
  if (["COMPLETED", "COMPLETE"].includes(normalized)) return 4;
  if (normalized === "INSTALLING" || currentMilestoneStep >= 3) return 3;
  if (["PAID", "FULLY_PAID", "VERIFIED_IN_PROGRESS"].includes(normalized)) {
    return 2;
  }
  if (normalized === "SIGNED") return 1;
  return 0;
}

function formatDocumentUrl(url: string) {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://drive.google.com/file/d/${encodeURIComponent(url)}/view`;
}

function formatDocumentEmbedUrl(url: string) {
  const formattedUrl = formatDocumentUrl(url);
  if (formattedUrl.startsWith("/")) return formattedUrl;
  try {
    const parsed = new URL(formattedUrl);
    const driveId =
      parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1] ||
      parsed.searchParams.get("id");
    return driveId
      ? `https://drive.google.com/file/d/${driveId}/preview`
      : formattedUrl;
  } catch {
    return formattedUrl;
  }
}

function toPositiveAmount(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? value
    : null;
}

function formatCurrency(amount: number | null, locale: string, pendingLabel: string) {
  if (amount === null) return pendingLabel;

  return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
    style: "currency",
    currency: "THB",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function ProjectHubView({
  locale,
  proposalId,
  status,
  currentMilestoneStep,
  engineerName,
  estimatedDate,
  items,
  documents,
  totalPrice,
  paidAmount,
}: ProjectHubViewProps) {
  const t = useTranslations("ProjectHubView");
  const isThai = locale === "th";
  const [activeTab, setActiveTab] = useState<ProjectHubTab>("tracking");
  const [isDocumentDialogOpen, setIsDocumentDialogOpen] = useState(false);
  const [isDocumentLoading, setIsDocumentLoading] = useState(false);
  const activeStep = getActiveStep(status, currentMilestoneStep);
  const isFinished = activeStep === PROJECT_STEPS.length - 1;
  const signedContract = documents.find((document) => document.kind === "CONTRACT");
  const verifiedSlips = documents.filter((document) => document.kind === "PAYMENT");
  const verifiedSlipAmounts = verifiedSlips.map((slip) => toPositiveAmount(slip.amount));
  const hasUnknownVerifiedAmount = verifiedSlipAmounts.some((amount) => amount === null);
  const resolvedPaidAmount = paidAmount !== null && paidAmount !== undefined && Number.isFinite(paidAmount) && paidAmount >= 0
    ? paidAmount
    : hasUnknownVerifiedAmount
      ? null
      : verifiedSlipAmounts.reduce<number>((sum, amount) => sum + (amount ?? 0), 0);
  const resolvedTotalPrice = toPositiveAmount(totalPrice);
  const remainingBalance = resolvedTotalPrice !== null && resolvedPaidAmount !== null
    ? Math.max(0, resolvedTotalPrice - resolvedPaidAmount)
    : null;

  const openDocumentDialog = () => {
    setIsDocumentLoading(true);
    setIsDocumentDialogOpen(true);
  };

  const tabs: Array<{ id: ProjectHubTab; label: string }> = [
    { id: "tracking", label: t("tabs.tracking") },
    { id: "items", label: t("tabs.items") },
    { id: "documents", label: t("tabs.documents") },
  ];
  const milestoneTitle = isFinished
    ? t("milestone.completed")
    : activeStep === 3
      ? t("milestone.installation")
      : t("milestone.preparing");

  const formatProjectAmount = (amount: number | null) =>
    formatCurrency(amount, locale, t("amountPending"));

  return (
    <div className="solar-project-hub flex flex-1 flex-col gap-8 bg-[var(--sd-page)] p-4 text-[var(--sd-ink)] sm:p-6 lg:p-8">
      {/* Step Progress Tracker */}
      <section aria-labelledby="project-hub-progress-title">
        <h2 id="project-hub-progress-title" className="sr-only">
          {t("progressTitle")}
        </h2>
        <ol className="grid grid-cols-5">
          {PROJECT_STEPS.map((step, index) => {
            const completed = index < activeStep || isFinished;
            const active = index === activeStep && !isFinished;

            return (
            <li key={step} className="relative flex min-w-0 flex-col items-center">
                {index > 0 && (
                  <span
                    className={cn(
                      "absolute right-1/2 top-5 h-1 w-full",
                      index <= activeStep ? "bg-[var(--sd-blue-600)]" : "bg-[var(--sd-line)]",
                    )}
                    aria-hidden="true"
                  />
                )}
                <span
                  className={cn(
                    "relative z-10 flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold transition-all",
                    completed && "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]",
                    active && "scale-110 border-2 border-[var(--sd-blue-600)] bg-[var(--sd-selected)] text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]",
                    !completed && !active && "border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-muted)]",
                  )}
                >
                  {completed ? <Check className="h-4 w-4 stroke-[2.5]" /> : index + 1}
                </span>
                <span
                  className={cn(
                    "mt-2 truncate text-center text-[10px] font-bold uppercase tracking-wide sm:text-xs",
                    index <= activeStep ? "text-[var(--sd-ink)]" : "text-[var(--sd-muted)]",
                  )}
                >
                  {t(`steps.${step}`)}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <div>
        {/* Section tabs */}
        <div
          role="tablist"
          aria-label={t("tabs.label")}
          className="flex gap-2 overflow-x-auto border-b border-[var(--sd-line)] px-1 pb-2"
        >
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`project-hub-tab-${tab.id}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`project-hub-panel-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-[var(--sd-radius-control)] px-5 py-2 text-xs font-bold transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2",
                  isActive
                    ? "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]"
                    : "border border-[var(--sd-line)] bg-[var(--sd-raised)] text-[var(--sd-text)] hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)]",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content Container */}
        <div className="solar-project-hub-panel solar-route-card relative z-0 mt-4 rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 shadow-[var(--sd-shadow-2)] sm:p-7">
          <GsapTabPanel
            key={activeTab}
            id={`project-hub-panel-${activeTab}`}
            labelledBy={`project-hub-tab-${activeTab}`}
            className="p-0"
          >
            {activeTab === "tracking" && (
              <section className="solar-project-hub-feature solar-route-card rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-5 shadow-[var(--sd-shadow-1)] sm:p-6">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-[var(--sd-blue-600)]">
                      <HardHat className="h-5 w-5 stroke-[2.5]" />
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {t("milestone.active")}
                      </span>
                    </div>
                    <h2 className="mt-2 text-xl font-bold leading-snug text-[var(--sd-ink)] sm:text-2xl">
                      {milestoneTitle}
                    </h2>
                    <dl className="mt-5 flex flex-col gap-3 text-sm font-medium sm:flex-row sm:gap-8">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-[var(--sd-blue-600)] stroke-[2.5]" />
                        <div>
                          <dt className="text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">
                            {t("labels.engineer")}
                          </dt>
                          <dd className="font-bold text-[var(--sd-ink)]">
                            {engineerName || t("labels.assignmentPending")}
                          </dd>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-[var(--sd-blue-600)] stroke-[2.5]" />
                        <div>
                          <dt className="text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">
                            {t("labels.estimatedDate")}
                          </dt>
                          <dd className="font-bold text-[var(--sd-ink)]">
                            {estimatedDate
                              ? new Intl.DateTimeFormat(isThai ? "th-TH" : "en-US", {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                }).format(new Date(estimatedDate))
                              : t("labels.schedulePending")}
                          </dd>
                        </div>
                      </div>
                    </dl>
                  </div>
                  <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
                    <Link
                      href={`/${locale}/project-tracker/${proposalId}`}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-5 py-2.5 text-xs font-bold text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)] transition-all hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2"
                    >
                      {t("actions.installationPlan")}
                      <ExternalLink className="h-4 w-4 stroke-[2.5]" />
                    </Link>
                    <Link
                      href={`/${locale}/my-proposal/${proposalId}/tracking`}
                      className="inline-flex min-h-11 items-center justify-center rounded-[var(--sd-radius-control)] bg-[var(--sd-blue-600)] px-5 py-2.5 text-xs font-bold text-white shadow-[var(--sd-shadow-1)] transition-all hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2"
                    >
                      {t("actions.fullActivity")}
                    </Link>
                  </div>
                </div>
                <div className="mt-6 flex items-center gap-4 border-t border-[var(--sd-line)] pt-4">
                  <div className="relative h-24 w-20 shrink-0 sm:h-28 sm:w-24">
                    <SoliaScene
                      alt={t("soliaAlt")}
                      pose="blueprint"
                      state="guiding"
                      position="inline"
                      size="compact"
                      className="h-full w-full"
                      imageSizes="96px"
                    />
                  </div>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--sd-text)]">
                    {t("guidance")}
                  </p>
                </div>
              </section>
            )}

            {activeTab === "items" && (
              <section>
                <div className="mb-4 flex items-center gap-2 text-[var(--sd-ink)]">
                  <Package className="h-5 w-5 text-[var(--sd-blue-600)] stroke-[2.5]" />
                  <h2 className="text-base font-bold text-[var(--sd-ink)]">
                    {t("items.title")}
                  </h2>
                </div>
                {items.length > 0 ? (
                  <ul className="mt-4 divide-y divide-[var(--sd-line)]">
                    {items.map((item, index) => (
                      <li
                        key={item.id || `${item.name}-${index}`}
                        className="flex items-start justify-between gap-4 py-4 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[var(--sd-ink)]">{item.name}</p>
                          {item.model && (
                            <p className="mt-1 text-xs font-medium text-[var(--sd-muted)]">{item.model}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-selected)] px-3.5 py-1 text-xs font-bold text-[var(--sd-ink)]">
                          x{item.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-4 text-sm font-medium text-[var(--sd-muted)]">
                    {t("items.empty")}
                  </p>
                )}
              </section>
            )}

            {activeTab === "documents" && (
              <section className="solar-project-hub-feature solar-route-card rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-5 shadow-[var(--sd-shadow-1)] sm:p-6">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sd-radius-control)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
                    <FileCheck2 className="h-5 w-5 stroke-[2.5]" />
                  </span>
                  <h2 className="text-base font-bold text-[var(--sd-ink)]">
                    {t("documents.title")}
                  </h2>
                </div>

                <div className="mt-5">
                  {signedContract ? (
                    <div className="flex flex-col gap-4 rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4 shadow-[var(--sd-shadow-1)] sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[var(--sd-radius-control)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
                          <FileText className="h-5 w-5 stroke-[2.5]" />
                        </span>
                        <p className="text-sm font-bold leading-relaxed text-[var(--sd-ink)]">
                          {t("documents.quotationContract")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={openDocumentDialog}
                        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[var(--sd-radius-control)] bg-[var(--sd-blue-600)] px-5 py-2 text-xs font-bold text-white shadow-[var(--sd-shadow-1)] transition-all hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2"
                      >
                        <Eye className="h-4 w-4 stroke-[2.5]" />
                        {t("actions.viewDocument")}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-4">
                      <FileText className="h-5 w-5 shrink-0 text-[var(--sd-muted)]" />
                      <p className="text-sm font-medium text-[var(--sd-muted)]">
                        {t("documents.empty")}
                      </p>
                    </div>
                  )}
                </div>

                <div className="my-6 h-px bg-[var(--sd-line)]" />

                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sd-radius-control)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
                    <ReceiptText className="h-5 w-5 stroke-[2.5]" />
                  </span>
                  <h3 className="text-base font-bold text-[var(--sd-ink)]">
                    {t("documents.paymentHistory")}
                  </h3>
                </div>

                {verifiedSlips.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {verifiedSlips.map((slip, index) => (
                      <div
                        key={slip.id || index}
                        className="flex items-center gap-3 rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-4 py-2 shadow-[var(--sd-shadow-1)]"
                      >
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                          {t("documents.verified")}
                        </span>
                        <span className="text-xs font-bold text-[var(--sd-ink)]">
                          {formatProjectAmount(toPositiveAmount(slip.amount))}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs font-medium text-[var(--sd-muted)]">
                    {t("documents.noPayments")}
                  </p>
                )}

                {/* Financial Summary Box */}
                <dl className="mt-6 divide-y divide-[var(--sd-line)] rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-5 py-2 shadow-[var(--sd-shadow-1)]">
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">
                      {t("documents.totalAmount")}
                    </dt>
                    <dd className="text-sm font-bold tabular-nums text-[var(--sd-ink)]">
                      {formatProjectAmount(resolvedTotalPrice)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">
                      {t("documents.paidAmount")}
                    </dt>
                    <dd className="text-sm font-bold tabular-nums text-[var(--sd-success)]">
                      {formatProjectAmount(resolvedPaidAmount)}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-4 py-3">
                    <dt className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[var(--sd-ink)]">
                      <WalletCards className="h-4 w-4 text-[var(--sd-blue-600)] stroke-[2.5]" />
                      {t("documents.remainingBalance")}
                    </dt>
                    <dd className="text-base font-bold tabular-nums text-[var(--sd-blue-600)]">
                      {formatProjectAmount(remainingBalance)}
                    </dd>
                  </div>
                </dl>
              </section>
            )}
          </GsapTabPanel>
        </div>
      </div>

      <Dialog
        isOpen={isDocumentDialogOpen}
        onClose={() => setIsDocumentDialogOpen(false)}
        className="overflow-hidden rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] shadow-[var(--sd-shadow-3)]"
      >
        <DialogContent>
          <DialogHeader className="border-b border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--sd-radius-control)] bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
                <FileText className="h-5 w-5 stroke-[2.5]" />
              </span>
              <div>
                <h2 className="text-base font-bold text-[var(--sd-ink)]">
                  {t("documentDialog.title")}
                </h2>
                <p className="mt-0.5 text-xs font-medium text-[var(--sd-muted)]">
                  {t("documentDialog.subtitle")}
                </p>
              </div>
            </div>
          </DialogHeader>
          <DialogBody className="relative bg-[var(--sd-page)] p-0">
            {signedContract && isDocumentDialogOpen && (
              <>
                {isDocumentLoading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--sd-page)] p-6">
                    <div className="w-full max-w-sm space-y-3">
                      <Skeleton className="h-4 w-2/3 bg-[var(--sd-soft-solar)]" />
                      <Skeleton className="h-3 w-full bg-[var(--sd-soft-solar)]" />
                      <Skeleton className="h-3 w-5/6 bg-[var(--sd-soft-solar)]" />
                    </div>
                  </div>
                )}
                <iframe
                  src={formatDocumentEmbedUrl(signedContract.url)}
                  title={t("documentDialog.frameTitle")}
                  onLoad={() => setIsDocumentLoading(false)}
                  className="h-full min-h-[70dvh] w-full bg-[var(--sd-page)]"
                />
              </>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GsapTabPanel({
  children,
  className,
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  id: string;
  labelledBy: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        panel,
        { autoAlpha: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 8 },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : 0.18,
          ease: "power2.out",
        },
      );
    }, panel);

    return () => context.revert();
  }, []);

  return (
    <div ref={panelRef} id={id} role="tabpanel" aria-labelledby={labelledBy} className={className}>
      {children}
    </div>
  );
}
