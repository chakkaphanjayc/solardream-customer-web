import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { desc, eq } from "drizzle-orm";

import { isLocale } from "@/i18n/locales";
import { getDbUser } from "@/app/actions/auth";
import { db } from "@/db";
import { proposals } from "@/db/schema";
import { PageShell } from "@/components/ui/page-shell";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  ChevronRight,
  LockKeyhole,
  Search,
  ShieldCheck,
  User,
} from "@/components/ui/icons";
import TrackRequestFlow from "@/components/tracking/TrackRequestFlow";
import StatusPipeline from "@/components/ui/StatusPipeline";
import trackStyles from "@/components/tracking/track-request-flow.module.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

// The tracking form can read request-time/session data through its client
// island. This route intentionally opts out of instant prerender validation.

export default async function TrackPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: value } = await params;
  const locale = isLocale(value) ? value : "th";
  const isTh = locale === "th";

  const [t, user] = await Promise.all([
    getTranslations({ locale, namespace: "TrackPage" }),
    getDbUser(),
  ]);

  const activeProposal = user?.isActive
    ? await db.query.proposals.findFirst({
        where: eq(proposals.userId, user.id),
        orderBy: desc(proposals.createdAt),
      })
    : null;

  return (
    <PageShell className="solar-track-page relative isolate min-h-dvh overflow-hidden bg-[var(--sd-page)] px-4 pb-20 pt-28 text-[var(--sd-ink)] sm:px-6 sm:pb-24 lg:px-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="absolute -left-24 top-12 h-80 w-80 rounded-full bg-[#DCE8F5]/45 blur-3xl" />
        <div className="absolute -right-16 top-32 h-96 w-96 rounded-full bg-[#D5DFD7]/35 blur-3xl" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-white/40 to-transparent" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl">
        {/* Top Breadcrumb: Home > Track Request */}
        <nav aria-label="Breadcrumb" className="mb-4 flex items-center gap-2 text-xs font-bold text-[var(--muted-foreground)]">
          <Link href={`/${locale}`} className="hover:text-[var(--sd-ink)] transition-colors">
            {isTh ? "หน้าหลัก" : "Home"}
          </Link>
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          <span aria-current="page" className="text-[var(--sd-ink)]">
            {isTh ? "ติดตามสถานะคำขอ" : "Track Request"}
          </span>
        </nav>

        {/* Top Actions: Back to Home + Authenticated "View in My Portal" Button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="quiet" size="sm" className="-ml-2">
            <Link href={`/${locale}`}>
              <ArrowLeft aria-hidden="true" />
              {t("landing.backHome")}
            </Link>
          </Button>

          {user?.isActive ? (
            <Button asChild className="rounded-full bg-[var(--primary)] text-[var(--sd-ink)] font-bold px-4 py-2 hover:bg-[var(--primary)]/80 shadow-xs">
              <Link href={`/${locale}/profile`}>
                <User className="h-4 w-4" aria-hidden="true" />
                <span>{isTh ? "ดูในศูนย์บัญชีของฉัน" : "View in My Portal"}</span>
              </Link>
            </Button>
          ) : null}
        </div>

        {/* Status Pipeline for Active Installation or General Tracking */}
        <section
          aria-labelledby="active-status-pipeline-heading"
          className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--sd-card)] p-6 shadow-xs sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border)] pb-4 mb-6">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--primary-foreground)]">
                <Activity className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{isTh ? "ขั้นตอนสถานะคำขอ & การติดตั้ง" : "Installation Status Pipeline"}</span>
              </span>
              <h2 id="active-status-pipeline-heading" className="mt-1 text-lg font-black text-[var(--sd-ink)]">
                {isTh
                  ? activeProposal ? "สถานะการดำเนินงานโครงการของคุณ" : "วงจรการดำเนินงานตั้งแต่เริ่มขอจนถึงเปิดระบบ"
                  : activeProposal ? "Your Active Installation Progress" : "End-to-End Installation Lifecycle"}
              </h2>
            </div>
            {activeProposal ? (
              <span className="inline-flex items-center rounded-full bg-[var(--primary)]/30 px-3 py-1 text-xs font-black text-[var(--accent-foreground)]">
                Status: {activeProposal.status}
              </span>
            ) : null}
          </div>

          <StatusPipeline currentStatus={activeProposal?.status || "ACTIVE"} />
        </section>

        {/* Main Tracking Section with Mobile-Prioritized Stacking */}
        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(25rem,0.88fr)] lg:gap-16">
          <header className="order-1 max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--sd-navy-900)] shadow-none">
              <ShieldCheck aria-hidden="true" className="size-4" />
              {t("landing.eyebrow")}
            </span>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] text-[var(--sd-ink)] sm:text-5xl lg:text-6xl">
              {t("landing.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[var(--sd-text-secondary)] sm:text-lg">
              {t("landing.description")}
            </p>
            <SoliaGuide
              className="mt-7 h-32 w-full max-w-[18rem]"
              pose="pointing"
              alt={t("landing.soliaAlt")}
              message={t("landing.soliaMessage")}
              speechBubbleClassName="absolute bottom-0 left-0 max-w-[15rem] rounded-[var(--sd-radius-md)] border border-[var(--border)] bg-white/90 p-3 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-md"
            />
          </header>

          <div className="order-2">
            <TrackRequestFlow surface="page" presentation="page" />
          </div>
        </div>

        {/* Security & Verification Explainer (Stacked below the tracking flow) */}
        <section
          className="solar-ui-panel order-3 mt-12 rounded-[2rem] p-5 sm:mt-16 sm:p-8"
        >
          <div className="max-w-2xl">
            <p className={`${trackStyles.trackStepsKicker} text-xs font-extrabold uppercase tracking-[0.12em]`}>
              {t("landing.stepsTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[var(--sd-ink)] sm:text-3xl">
              {t("landing.securityTitle")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--sd-text-secondary)]">
              {t("landing.stepsDescription")}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="solar-ui-soft-panel rounded-2xl p-5">
              <Search aria-hidden="true" className="size-5 text-[var(--primary-foreground)]" />
              <h3 className="mt-4 text-base font-extrabold text-[var(--sd-ink)]">
                {t("landing.steps.reference.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--sd-text-secondary)]">
                {t("landing.steps.reference.description")}
              </p>
            </article>
            <article className="solar-ui-soft-panel rounded-2xl p-5">
              <Activity aria-hidden="true" className="size-5 text-[var(--primary-foreground)]" />
              <h3 className="mt-4 text-base font-extrabold text-[var(--sd-ink)]">
                {t("landing.steps.progress.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--sd-text-secondary)]">
                {t("landing.steps.progress.description")}
              </p>
            </article>
            <article className="solar-ui-soft-panel rounded-2xl p-5">
              <LockKeyhole aria-hidden="true" className="size-5 text-[var(--primary-foreground)]" />
              <h3 className="mt-4 text-base font-extrabold text-[var(--sd-ink)]">
                {t("landing.steps.secure.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--sd-text-secondary)]">
                {t("landing.steps.secure.description")}
              </p>
            </article>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
