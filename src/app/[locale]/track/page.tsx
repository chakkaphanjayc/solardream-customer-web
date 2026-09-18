import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { isLocale } from "@/i18n/locales";
import { PageShell } from "@/components/ui/page-shell";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { Button } from "@/components/ui/button";
import {
  Activity,
  ArrowLeft,
  LockKeyhole,
  Search,
  ShieldCheck,
} from "@/components/ui/icons";
import TrackRequestFlow from "@/components/tracking/TrackRequestFlow";
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
  const t = await getTranslations({ locale, namespace: "TrackPage" });

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
        <Button asChild variant="quiet" size="sm" className="-ml-2">
          <Link href={`/${locale}`}>
            <ArrowLeft aria-hidden="true" />
            {t("landing.backHome")}
          </Link>
        </Button>

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,1.12fr)_minmax(25rem,0.88fr)] lg:gap-16">
          <header className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3.5 py-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-[var(--sd-navy-900)] shadow-none">
              <ShieldCheck aria-hidden="true" className="size-4" />
              {t("landing.eyebrow")}
            </span>
            <h1 className="mt-5 max-w-3xl text-balance text-4xl font-extrabold leading-[1.04] tracking-[-0.045em] text-[#1C1C1A] sm:text-5xl lg:text-6xl">
              {t("landing.title")}
            </h1>
            <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-[#4E4B44] sm:text-lg">
              {t("landing.description")}
            </p>
            <SoliaGuide
              className="mt-7 h-32 w-full max-w-[18rem]"
              pose="pointing"
              alt={
                locale === "th"
                  ? "โซเลียชี้ขั้นตอนติดตามคำขอของคุณ"
                  : "Solia pointing to the next step in your request tracking"
              }
              message={
                locale === "th"
                  ? "เริ่มจากหมายเลขอ้างอิงก่อน แล้วค่อยเปิดรายละเอียดส่วนตัวเมื่อพร้อมค่ะ"
                  : "Start with your reference, then unlock private details only when you need them."
              }
              speechBubbleClassName="absolute bottom-0 left-0 max-w-[15rem] rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-white/90 p-3 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
            />
          </header>

          <TrackRequestFlow surface="page" presentation="page" />
        </div>

        <section
          className="solar-ui-panel mt-12 rounded-[2rem] p-5 sm:mt-16 sm:p-8"
        >
          <div className="max-w-2xl">
            <p className={`${trackStyles.trackStepsKicker} text-xs font-extrabold uppercase tracking-[0.12em]`}>
              {t("landing.stepsTitle")}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-[-0.035em] text-[#1C1C1A] sm:text-3xl">
              {t("landing.securityTitle")}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#4E4B44]">
              {t("landing.stepsDescription")}
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <article className="solar-ui-soft-panel rounded-2xl p-5">
              <Search aria-hidden="true" className="size-5 text-[#4F7FA8]" />
              <h3 className="mt-4 text-base font-extrabold text-[#1C1C1A]">
                {t("landing.steps.reference.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4E4B44]">
                {t("landing.steps.reference.description")}
              </p>
            </article>
            <article className="solar-ui-soft-panel rounded-2xl p-5">
              <Activity aria-hidden="true" className="size-5 text-[#4F7FA8]" />
              <h3 className="mt-4 text-base font-extrabold text-[#1C1C1A]">
                {t("landing.steps.progress.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4E4B44]">
                {t("landing.steps.progress.description")}
              </p>
            </article>
            <article className="solar-ui-soft-panel rounded-2xl p-5">
              <LockKeyhole aria-hidden="true" className="size-5 text-[#4F7FA8]" />
              <h3 className="mt-4 text-base font-extrabold text-[#1C1C1A]">
                {t("landing.steps.secure.title")}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[#4E4B44]">
                {t("landing.steps.secure.description")}
              </p>
            </article>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
