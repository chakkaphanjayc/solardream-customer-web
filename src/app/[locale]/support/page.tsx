import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { getCachedPageSeo } from "@/app/actions/seo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarCheck,
  CircleHelp,
  FileCheck2,
  FileText,
  Mail,
  MessageSquare,
  Search,
  ShieldCheck,
  Wrench,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { SolarRouteHeader } from "@/components/ui/solar-route-header";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { isLocale } from "@/i18n/locales";
import { getCachedSupportConfig } from "@/lib/public-content-cache";
import { DEFAULT_SUPPORT_CONFIG } from "@/schemas/support";
import { cn } from "@/lib/utils";

// Support copy combines request-scoped messages with editable admin content.
// Keep the route blocking while the editable config is served from its tag
// cache.

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedPageSeo("support");
  return {
    title: seo.seoTitle,
    description: seo.seoDescription,
    keywords: seo.seoKeywords
      ? seo.seoKeywords.split(",").map((keyword) => keyword.trim())
      : [],
    openGraph: {
      title: seo.seoTitle,
      description: seo.seoDescription,
      images: seo.seoImage ? [{ url: seo.seoImage }] : [],
    },
  };
}

export function generateStaticParams() {
  return [{ locale: "th" }, { locale: "en" }];
}

interface SupportPageProps {
  params: Promise<{ locale: string }>;
}

export default async function SupportPage({ params }: SupportPageProps) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";
  const t = await getTranslations({ locale, namespace: "SupportPage" });
  const supportConfig = await getCachedSupportConfig();
  const { contact, hero, featureToggles: toggles } = supportConfig;

  // The support hero is editable through admin settings. Localize only the
  // shipped/default copy so an intentional admin-authored message remains
  // intact on every locale.
  const supportHero = {
    badgeText:
      hero.badgeText === DEFAULT_SUPPORT_CONFIG.hero.badgeText
        ? t("supportTitle")
        : hero.badgeText,
    headerTitle:
      hero.headerTitle === DEFAULT_SUPPORT_CONFIG.hero.headerTitle
        ? t("headerTitle")
        : hero.headerTitle,
    headerDesc:
      hero.headerDesc === DEFAULT_SUPPORT_CONFIG.hero.headerDesc
        ? t("headerDesc")
        : hero.headerDesc,
  };

  const popularGuides = [
    { query: "diagnostics", label: t("quickLink1") },
    { query: "battery", label: t("quickLink2") },
    { query: "warranty", label: t("quickLink3") },
  ];

  const supportPrinciples = [
    {
      icon: CircleHelp,
      title: t("features.answers.title"),
      description: t("features.answers.desc"),
    },
    {
      icon: ShieldCheck,
      title: t("features.assets.title"),
      description: t("features.assets.desc"),
    },
    {
      icon: CalendarCheck,
      title: t("features.periodic.title"),
      description: t("features.periodic.desc"),
    },
  ];

  return (
    <SolarRouteShell className="solar-support-page text-foreground">
      {hero.isBannerActive && hero.announcementBanner ? (
        <div className="solar-support-announcement px-4 py-3" role="status">
          <div className="mx-auto flex max-w-7xl items-start justify-center gap-2 text-sm font-semibold">
            <AlertCircle
              className="mt-0.5 h-4 w-4 shrink-0"
              aria-hidden="true"
            />
            <span>{hero.announcementBanner}</span>
          </div>
        </div>
      ) : null}

      <div className="solar-support-hero px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
        <SolarRouteHeader
          eyebrow={supportHero.badgeText || t("supportTitle")}
          title={supportHero.headerTitle || t("headerTitle")}
          description={supportHero.headerDesc || t("headerDesc")}
          actions={
            <>
              <Button asChild size="lg" className="solar-route-primary">
                <Link href={`/${locale}/support/knowledge`}>
                  <BookOpen className="h-5 w-5" aria-hidden="true" />
                  {t("kbAction")}
                </Link>
              </Button>
              {toggles.enableMaintenanceBookingLink ? (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="solar-route-secondary"
                >
                  <Link href={`/${locale}/services`}>
                    <Wrench className="h-5 w-5" aria-hidden="true" />
                    {t("maintAction")}
                  </Link>
                </Button>
              ) : null}
            </>
          }
        />
        <div className="mx-auto mt-8 flex max-w-7xl items-center gap-4">
          <SoliaGuide
            pose="presenting"
            alt={locale === "th" ? "โซเลียกำลังแนะนำศูนย์ช่วยเหลือ SolarDream" : "Solia guiding you through SolarDream support"}
            className="h-28 w-24 shrink-0 sm:h-32 sm:w-28"
            imageSizes="128px"
            message={locale === "th" ? "เริ่มจากคำถามที่ใกล้ตัวที่สุด แล้วค่อยดูวิธีดูแลระบบที่เหมาะกับบ้านคุณค่ะ" : "Start with the question closest to your home, then choose the care path that fits."}
            speechBubbleClassName="absolute bottom-0 left-0 max-w-[18rem] rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-white/95 p-3 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
          />
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(19rem,0.65fr)] lg:items-start">
          <Card asChild className="solar-route-card card-organic-1 p-6 sm:p-10 shadow-organic-soft">
            <section aria-labelledby="knowledge-heading">
              <div className="flex items-start gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#B7D1EA]/30 text-[#2E2C27] transition-colors duration-300">
                  <BookOpen className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2
                    id="knowledge-heading"
                    className="font-serif text-2xl font-bold tracking-tight text-[#1C1C1A] sm:text-3xl"
                  >
                    {t("kbTitle")}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#4E4B44] sm:text-base sm:leading-7">
                    {t("kbDesc")}
                  </p>
                </div>
              </div>

              {toggles.enableKbSearch ? (
                <form
                  action={`/${locale}/support/knowledge`}
                  method="GET"
                  data-analytics-form="support_search"
                  data-analytics-submit-event="search_submitted"
                  className="mt-8 flex flex-col gap-3 sm:flex-row"
                >
                  <label htmlFor="support-hub-search" className="sr-only">
                    {t("searchPlaceholder")}
                  </label>
                  <div className="relative min-w-0 flex-1">
                    <Search
                      className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#4E4B44]"
                      aria-hidden="true"
                    />
                    <Input
                      id="support-hub-search"
                      type="search"
                      name="q"
                      data-analytics-field="query"
                      placeholder={t("searchPlaceholder")}
                      className="solar-route-control min-h-12 bg-white/80 pl-12"
                    />
                  </div>
                  <Button type="submit" size="lg" className="sm:min-w-28">
                    {locale === "th" ? "ค้นหา" : "Search"}
                  </Button>
                </form>
              ) : null}

              <div className="mt-9">
                <h3 className="font-serif text-lg font-bold text-[#1C1C1A]">
                  {t("popularGuides")}
                </h3>
                <ul className="mt-4 divide-y divide-[#8E8B83]/60 border-y border-[#8E8B83]/60">
                  {popularGuides.map((guide) => (
                    <li key={guide.query}>
                      <Link
                        href={`/${locale}/support/knowledge?q=${guide.query}`}
                        className="group flex min-h-14 items-center justify-between gap-4 py-3 text-sm font-semibold text-[#1C1C1A] transition-colors hover:text-[#3E6685] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <span className="flex min-w-0 items-center gap-3">
                          <FileText
                            className="h-4 w-4 shrink-0 text-[#4E4B44] transition-colors group-hover:text-[#3E6685]"
                            aria-hidden="true"
                          />
                          <span>{guide.label}</span>
                        </span>
                        <ArrowRight
                          className="h-4 w-4 shrink-0 text-[#4E4B44] transition-transform duration-200 group-hover:translate-x-1 group-hover:text-[#3E6685] motion-reduce:transition-none"
                          aria-hidden="true"
                        />
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <Button asChild variant="outline" className="mt-8">
                <Link href={`/${locale}/support/knowledge`}>
                  {t("kbAction")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </section>
          </Card>

          <div className="space-y-6">
            {toggles.enableMaintenanceBookingLink ? (
              <Card
                asChild
                tone="accent"
                className="solar-route-card card-organic-2 p-6 sm:p-7 shadow-organic-soft"
              >
                <section aria-labelledby="maintenance-heading">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#D8A87B]/15 text-[#D8A87B]">
                      <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2
                      id="maintenance-heading"
                      className="font-serif text-xl font-bold tracking-tight text-[#1C1C1A]"
                    >
                      {t("maintTitle")}
                    </h2>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#4E4B44]">
                    {t("maintDesc")}
                  </p>
                  <dl className="mt-5 divide-y divide-[#8E8B83]/60 border-y border-[#8E8B83]/60 text-sm">
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="font-semibold text-[#1C1C1A]">
                        SolarDream
                      </dt>
                      <dd className="font-bold text-[var(--sd-navy-900)]">
                        {locale === "th" ? "ไม่มีค่าบริการ SolarDream" : "No SolarDream service fee"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-4 py-3">
                      <dt className="text-[#4E4B44]">
                        {locale === "th" ? "ระบบภายนอก" : "External system"}
                      </dt>
                      <dd className="font-semibold text-[#1C1C1A]">
                        THB 900–1,200
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button asChild>
                      <Link href={`/${locale}/services`}>
                        <Wrench className="h-4 w-4" aria-hidden="true" />
                        {t("maintAction")}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="bg-white/80">
                      <Link href={`/${locale}/my-assets`}>
                        {locale === "th"
                          ? "เลือกอุปกรณ์ที่ติดตั้ง"
                          : "Select installed asset"}
                      </Link>
                    </Button>
                  </div>
                </section>
              </Card>
            ) : null}

            {toggles.enableDirectContactCard ? (
              <Card asChild className="solar-route-card card-organic-3 p-6 sm:p-7 shadow-organic-soft">
                <section aria-labelledby="direct-support-heading">
                  <div className="flex items-center gap-3">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B7D1EA]/30 text-[#2E2C27]">
                      <MessageSquare className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <h2
                      id="direct-support-heading"
                      className="font-serif text-xl font-bold tracking-tight text-[#1C1C1A]"
                    >
                      {t("directTitle")}
                    </h2>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-[#4E4B44]">
                    {t("directDesc")}
                  </p>
                  <div className="mt-6 flex flex-col gap-3">
                    <Button
                      asChild
                      className="bg-[#06C755] text-white hover:bg-[#05B94F]"
                    >
                      <a
                        href={contact.lineUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 fill-current"
                          viewBox="0 0 24 24"
                        >
                          <path d="M24 10.3c0-4.7-5.4-8.5-12-8.5S0 5.6 0 10.3c0 4.2 4.3 7.7 10.1 8.4.4.1.9.3 1 .7.1.3.1.8 0 1.2 0 0-.2 1.3-.3 1.5-.1.4-.4 1.7 1.6.9 2-.8 11.1-6.5 11.1-12.2.5-.2.5-.5.5-.5z" />
                        </svg>
                        {t("lineAction")}
                      </a>
                    </Button>
                    <Button asChild variant="outline">
                      <a href={`mailto:${contact.email}`}>
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        {t("emailAction")}
                      </a>
                    </Button>
                  </div>
                </section>
              </Card>
            ) : null}

            {toggles.enableDocumentVerifyLink ? (
              <Card asChild interactive className="solar-route-card card-organic-4 p-0 shadow-organic-soft">
                <Link
                  href={`/${locale}/verify-document`}
                  className="group flex min-h-28 items-center gap-4 p-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-7"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B7D1EA]/30 text-[#2E2C27]">
                    <FileCheck2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-serif text-base font-bold text-[#1C1C1A]">
                      {t("verifyTitle")}
                    </span>
                    <span className="mt-1 block text-sm leading-6 text-[#4E4B44]">
                      {t("verifyDesc")}
                    </span>
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-[#4E4B44] transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none"
                    aria-hidden="true"
                  />
                </Link>
              </Card>
            ) : null}
          </div>
        </div>

        <section
          className="mt-16"
          aria-label={t("supportTitle")}
        >
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {supportPrinciples.map(({ icon: Icon, title, description }, idx) => (
              <div
                key={title}
                className={cn(
                  "flex flex-col gap-4 rounded-[2rem] border border-[#8E8B83]/60 bg-[#E6E3DC]/90 p-6 shadow-organic-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-organic-hover",
                  idx === 0 && "card-organic-1",
                  idx === 1 && "card-organic-2",
                  idx === 2 && "card-organic-3",
                )}
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#B7D1EA]/30 text-[#2E2C27]">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="font-serif text-lg font-bold text-[#1C1C1A]">{title}</h2>
                  <p className="mt-2 text-sm leading-6 text-[#4E4B44]">
                    {description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SolarRouteShell>
  );
}
