import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck, Lock, Activity } from "@/components/ui/icons";
import { eq, or, sql } from "drizzle-orm";

import { db } from "@/db";
import { consultationLeads, proposals, serviceOrders } from "@/db/schema";
import { normalizeTrackingReference } from "@/lib/trackingReference";
import { cn } from "@/lib/utils";
import PublicMagicLinkForm from "./PublicMagicLinkForm";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import { SoliaGuide } from "@/components/brand/solia-scenes";

interface PublicTrackerPageProps {
  params: Promise<{
    id: string;
    locale: string;
  }>;
}


type MilestoneStatus = "completed" | "active" | "upcoming";
type MilestoneKey =
  | "requirementCaptured"
  | "serviceApproval"
  | "serviceReview"
  | "serviceApproved"
  | "engineeringReview"
  | "quotationIssuance"
  | "projectExecution";
type PublicTrackerType = "SERVICE_ORDER" | "QUOTATION" | "CONSULTATION_LEAD";

type Milestone = {
  key: MilestoneKey;
  status: MilestoneStatus;
};

const typeTranslationKeys: Record<PublicTrackerType, string> = {
  SERVICE_ORDER: "type.serviceOrder",
  QUOTATION: "type.quotation",
  CONSULTATION_LEAD: "type.consultationLead",
};

function referenceWithoutKnownPrefix(value: string) {
  return value
    .trim()
    .replace(/^(QT|QTN|TRK|REF)-/i, "")
    .trim();
}

function proposalReferenceConditions(reference: string) {
  const cleanReference = normalizeTrackingReference(reference);
  const shortReference = referenceWithoutKnownPrefix(cleanReference);
  const conditions = [
    eq(proposals.id, cleanReference),
    eq(proposals.erpnextQuotationId, cleanReference),
    eq(proposals.magicTokenSlug, cleanReference),
    sql`${proposals.configurationData}->>'trackingRef' = ${cleanReference}`,
    sql`${proposals.configurationData}->>'trackingId' = ${cleanReference}`,
    sql`${proposals.configurationData}->>'orderReference' = ${cleanReference}`,
    sql`('SD-QT-' || upper(substr(translate(replace(${proposals.id}::text, '-', ''), '01ILO', '23444'), 1, 6))) = ${cleanReference}`,
  ];

  if (/^[a-z0-9]{6,16}$/i.test(shortReference)) {
    conditions.push(
      sql`upper(substring(${proposals.id}::text from 1 for ${shortReference.length})) = ${shortReference.toUpperCase()}`,
    );
  }

  return conditions;
}

function consultationLeadReferenceConditions(reference: string) {
  const cleanReference = normalizeTrackingReference(reference);
  const shortReference = referenceWithoutKnownPrefix(cleanReference);
  const conditions = [
    eq(consultationLeads.id, cleanReference),
    sql`${consultationLeads.rawPayload}->>'trackingRef' = ${cleanReference}`,
    sql`${consultationLeads.rawPayload}->>'trackingId' = ${cleanReference}`,
    sql`${consultationLeads.dynamicCalculations}->>'trackingRef' = ${cleanReference}`,
    sql`('SD-QT-' || upper(substr(translate(replace(${consultationLeads.id}::text, '-', ''), '01ILO', '23444'), 1, 6))) = ${cleanReference}`,
  ];

  if (/^[a-z0-9]{6,16}$/i.test(shortReference)) {
    conditions.push(
      sql`upper(substring(${consultationLeads.id}::text from 1 for ${shortReference.length})) = ${shortReference.toUpperCase()}`,
    );
  }

  return conditions;
}

export default async function PublicTrackerPage({ params }: PublicTrackerPageProps) {
  const { id: trackingId, locale } = await params;
  if (!trackingId) {
    notFound();
  }

  const activeLocale = locale === "en" ? "en" : "th";
  const t = await getTranslations({ locale: activeLocale, namespace: "PublicTracking" });
  const cleanRef = normalizeTrackingReference(trackingId);

  // 1. Try to find matching service order
  const serviceOrder = await db.query.serviceOrders.findFirst({
    where: eq(serviceOrders.trackingRef, cleanRef),
  });

  let milestones: Milestone[] = [];
  let type: PublicTrackerType = "QUOTATION";

  if (serviceOrder) {
    type = "SERVICE_ORDER";
    const isCompletedStep2 = serviceOrder.erpPaymentSyncStatus === "SYNCED" || ["CONFIRMED", "IN_PROGRESS", "COMPLETED", "CLOSED"].includes(serviceOrder.status.toUpperCase());
    const isCompletedStep3 = ["COMPLETED", "CLOSED"].includes(serviceOrder.status.toUpperCase());
    const isCompletedStep4 = ["COMPLETED", "CLOSED"].includes(serviceOrder.status.toUpperCase());

    let step1Status: "completed" | "active" | "upcoming" = "completed";
    let step2Status: "completed" | "active" | "upcoming" = "upcoming";
    let step3Status: "completed" | "active" | "upcoming" = "upcoming";
    let step4Status: "completed" | "active" | "upcoming" = "upcoming";

    if (isCompletedStep4) {
      step1Status = "completed";
      step2Status = "completed";
      step3Status = "completed";
      step4Status = "completed";
    } else if (isCompletedStep3) {
      step1Status = "completed";
      step2Status = "completed";
      step3Status = "completed";
      step4Status = "active";
    } else if (isCompletedStep2) {
      step1Status = "completed";
      step2Status = "completed";
      step3Status = "active";
      step4Status = "upcoming";
    } else {
      step1Status = "completed";
      step2Status = "active";
      step3Status = "upcoming";
      step4Status = "upcoming";
    }

    milestones = [
      {
        key: "requirementCaptured",
        status: step1Status,
      },
      {
        key: "serviceApproval",
        status: step2Status,
      },
      {
        key: "serviceReview",
        status: step3Status,
      },
      {
        key: "serviceApproved",
        status: step4Status,
      },
    ];
  } else {
    // 2. Try to find matching proposal
    const proposal = await db.query.proposals.findFirst({
      where: or(...proposalReferenceConditions(cleanRef)),
    });

    if (proposal) {
      type = "QUOTATION";
      const isCompletedStep2 = ["SIGNED", "CONFIRMED", "PAID", "COMPLETED"].includes(proposal.status.toUpperCase());
      const isCompletedStep3 = ["PAID", "COMPLETED"].includes(proposal.status.toUpperCase());
      const isCompletedStep4 = ["PAID", "COMPLETED"].includes(proposal.status.toUpperCase());

      let step1Status: "completed" | "active" | "upcoming" = "completed";
      let step2Status: "completed" | "active" | "upcoming" = "upcoming";
      let step3Status: "completed" | "active" | "upcoming" = "upcoming";
      let step4Status: "completed" | "active" | "upcoming" = "upcoming";

      if (isCompletedStep4) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "completed";
      } else if (isCompletedStep3) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "active";
      } else if (isCompletedStep2) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "active";
        step4Status = "upcoming";
      } else {
        step1Status = "completed";
        step2Status = "active";
        step3Status = "upcoming";
        step4Status = "upcoming";
      }

      milestones = [
        {
          key: "requirementCaptured",
          status: step1Status,
        },
        {
          key: "serviceApproval",
          status: step2Status,
        },
        {
          key: "serviceReview",
          status: step3Status,
        },
        {
          key: "serviceApproved",
          status: step4Status,
        },
      ];
    } else {
      // 3. Try to find matching consultation lead
      const consultationLead = await db.query.consultationLeads.findFirst({
        where: or(...consultationLeadReferenceConditions(cleanRef)),
      });

      if (!consultationLead) {
        notFound();
      }

      type = "CONSULTATION_LEAD";
      const cStatus = (consultationLead.status || "NEW_LEAD").toUpperCase();
      const isCompletedStep2 = ["IN_PROGRESS", "REVIEW", "APPROVED", "COMPLETED"].includes(cStatus);
      const isCompletedStep3 = ["APPROVED", "COMPLETED"].includes(cStatus);
      const isCompletedStep4 = ["COMPLETED"].includes(cStatus);

      let step1Status: "completed" | "active" | "upcoming" = "completed";
      let step2Status: "completed" | "active" | "upcoming" = "upcoming";
      let step3Status: "completed" | "active" | "upcoming" = "upcoming";
      let step4Status: "completed" | "active" | "upcoming" = "upcoming";

      if (isCompletedStep4) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "completed";
      } else if (isCompletedStep3) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "completed";
        step4Status = "active";
      } else if (isCompletedStep2) {
        step1Status = "completed";
        step2Status = "completed";
        step3Status = "active";
        step4Status = "upcoming";
      } else {
        step1Status = "completed";
        step2Status = "active";
        step3Status = "upcoming";
        step4Status = "upcoming";
      }

      milestones = [
        {
          key: "requirementCaptured",
          status: step1Status,
        },
        {
          key: "engineeringReview",
          status: step2Status,
        },
        {
          key: "quotationIssuance",
          status: step3Status,
        },
        {
          key: "projectExecution",
          status: step4Status,
        },
      ];
    }
  }

  const completedCount = milestones.filter((m) => m.status === "completed").length;
  const percent = Math.round((completedCount / milestones.length) * 100);
  const typeLabel = t(typeTranslationKeys[type]);

  return (
    <PageShell className="px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pt-28">
      <div className="mx-auto w-full max-w-5xl">
        <Button asChild variant="quiet" className="-ml-3 font-semibold text-[var(--sd-ink)]">
          <Link href={`/${activeLocale}`}>
            <ArrowLeft aria-hidden="true" />
            {t("backToHome")}
          </Link>
        </Button>

        <header className="mt-8 max-w-3xl">
          <p className="inline-flex items-center gap-2 rounded-full border border-[var(--sd-line)] bg-[var(--sd-raised)] px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--sd-navy-900)] shadow-[var(--sd-shadow-1)]">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--sd-blue-600)]" />
            {t("trackingKicker")}
          </p>
          <h1 className="mt-5 text-balance text-3xl font-extrabold leading-[1.12] tracking-tight text-[var(--sd-ink)] sm:text-4xl lg:text-5xl">
            {typeLabel}{" "}
            <span className="text-[var(--sd-blue-600)] sm:whitespace-nowrap">#{cleanRef}</span>
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-[var(--sd-text)] sm:text-base sm:leading-7">
            {t("privacyDescription")}
          </p>
        </header>

        <section
          aria-labelledby="public-tracking-milestones"
          className="solar-route-card solar-route-card--strong mt-8 overflow-hidden md:grid md:grid-cols-[minmax(0,1fr)_22rem]"
        >
          <div className="p-5 sm:p-8 lg:p-10">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--sd-line)] pb-5">
              <h2 id="public-tracking-milestones" className="flex items-center gap-2 text-sm font-extrabold tracking-[0.08em] text-[var(--sd-ink)] sm:text-base">
                <Activity aria-hidden="true" className="size-5 text-[var(--sd-blue-600)]" />
                {t("milestonesTitle")}
              </h2>
              <span className="shrink-0 rounded-full bg-[var(--sd-soft-solar)] px-2.5 py-1 text-xs font-extrabold text-[var(--sd-navy-900)]">
                {t("percent", { percent })}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label={t("progressLabel")}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
              className="mt-6 h-2.5 overflow-hidden rounded-full bg-[var(--sd-soft-solar)]"
            >
              <div
                className="h-full rounded-full bg-[var(--sd-blue-600)] transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${percent}%` }}
              />
            </div>

            <ol className="mt-7 space-y-4">
              {milestones.map((step, index) => {
                const isPast = step.status === "completed";
                const isCurrent = step.status === "active";
                const isFuture = step.status === "upcoming";

                return (
                  <li
                    key={step.key}
                    aria-current={isCurrent ? "step" : undefined}
                    className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] gap-3"
                  >
                    {index < milestones.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className="absolute -bottom-4 left-[1.0625rem] top-9 w-px bg-[var(--sd-line)]"
                      />
                    ) : null}
                    <span
                      className={cn(
                        "relative z-[1] mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-[var(--sd-raised)] font-bold shadow-[var(--sd-shadow-1)]",
                        isPast && "bg-[var(--sd-success)] text-white",
                        isCurrent && "bg-[var(--sd-blue-600)] text-white",
                        isFuture && "bg-[var(--sd-soft-solar)] text-[var(--sd-muted)]",
                      )}
                    >
                      {isPast ? (
                        <CheckCircle2 aria-hidden="true" className="size-4" />
                      ) : isCurrent ? (
                        <Clock aria-hidden="true" className="size-4" />
                      ) : (
                        <Lock aria-hidden="true" className="size-4" />
                      )}
                    </span>
                    <div className={cn("min-w-0 rounded-[var(--sd-radius-surface)] px-3 py-2", isCurrent && "bg-[var(--sd-selected)]")}>
                      <h3
                        className={cn(
                          "text-sm font-bold leading-5",
                          isFuture ? "text-[var(--sd-muted)]" : "text-[var(--sd-ink)]",
                        )}
                      >
                        {t(`steps.${step.key}`)}
                      </h3>
                      <p className={cn(
                        "mt-1 text-xs font-semibold",
                        isPast && "text-[var(--sd-success)]",
                        isCurrent && "text-[var(--sd-navy-900)]",
                        isFuture && "text-[var(--sd-muted)]",
                      )}>
                        {t(`status.${step.status}`)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>

          <aside className="border-t border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-5 sm:p-8 md:border-l md:border-t-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--sd-navy-900)]">
                  {t("soliaLabel")}
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-[var(--sd-text)]">
                  {t("soliaMessage")}
                </p>
              </div>
              <SoliaGuide
                alt={t("soliaAlt")}
                pose="pointing"
                className="h-28 w-24 shrink-0"
                imageSizes="96px"
                loading="lazy"
              />
            </div>
            <div className="mt-6 flex size-11 items-center justify-center rounded-[var(--sd-radius-control)] border border-[var(--sd-cyan-400)] bg-[var(--sd-cyan-100)] text-[var(--sd-navy-900)] shadow-[var(--sd-shadow-1)]">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <p className="mt-4 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[var(--sd-navy-900)]">
              {t("portal.secureLabel")}
            </p>
            <h2 className="mt-2 text-xl font-extrabold tracking-tight text-[var(--sd-ink)]">
              {t("portal.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--sd-text)]">{t("portal.description")}</p>

            <div className="mt-6 border-t border-[var(--sd-line)] pt-6">
              <PublicMagicLinkForm trackingRef={cleanRef} locale={activeLocale} />
            </div>
          </aside>
        </section>
      </div>
    </PageShell>
  );
}
