import Link from "next/link";
import { getTranslations } from "next-intl/server";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  ArrowUpRight,
  Gauge,
  HelpCircle,
  Play,
  ReceiptText,
  Search,
  ShieldAlert,
  SprayCan,
  Video,
  type IconType,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import SmartBackButton from "@/components/ui/SmartBackButton";
import { JsonLd, type JsonLdObject } from "@/components/seo/JsonLd";
import { isLocale } from "@/i18n/locales";
import { isYouTubeSearchResultsUrl, localizeDefaultKnowledgeBase } from "@/lib/knowledgeBasePresentation";
import { getCachedKnowledgeBaseConfig } from "@/lib/public-content-cache";
import { getConfiguredPublicSiteUrl } from "@/lib/siteUrl";


interface KnowledgePageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string | string[] }>;
}


function isIconType(value: unknown): value is IconType {
  return typeof value === "function";
}

export default async function KnowledgePage({ params, searchParams }: KnowledgePageProps) {
  const [{ locale: localeParam }, rawSearchParams] = await Promise.all([params, searchParams]);
  const locale = isLocale(localeParam) ? localeParam : "th";
  const [t, supportT, kbConfig] = await Promise.all([
    getTranslations({ locale, namespace: "SupportKnowledge" }),
    getTranslations({ locale, namespace: "SupportPage" }),
    getCachedKnowledgeBaseConfig(),
  ]);
  const rawQuery = Array.isArray(rawSearchParams.q) ? rawSearchParams.q[0] : rawSearchParams.q;
  const query = rawQuery?.trim() || "";
  const normalizedQuery = normalizeText(query);
  const localizedKnowledgeBase = localizeDefaultKnowledgeBase(kbConfig, {
    faqs: new Map([
      ["faq-inverter-1", { question: t("faqs.inverter.question"), answer: t("faqs.inverter.answer") }],
      ["faq-battery-1", { question: t("faqs.battery.question"), answer: t("faqs.battery.answer") }],
      ["faq-warranty-1", { question: t("faqs.warranty.question"), answer: t("faqs.warranty.answer") }],
      ["faq-billing-1", { question: t("faqs.bill.question"), answer: t("faqs.bill.answer") }],
      ["faq-maintenance-1", { question: t("faqs.cleaning.question"), answer: t("faqs.cleaning.answer") }],
    ]),
    tutorials: new Map([
      ["tut-1", {
        title: t("tutorials.inverter.title"),
        description: t("tutorials.inverter.description"),
        duration: t("tutorials.inverter.duration"),
        searchTerm: t("tutorials.inverter.searchTerm"),
      }],
      ["tut-2", {
        title: t("tutorials.bill.title"),
        description: t("tutorials.bill.description"),
        duration: t("tutorials.bill.duration"),
        searchTerm: t("tutorials.bill.searchTerm"),
      }],
      ["tut-3", {
        title: t("tutorials.production.title"),
        description: t("tutorials.production.description"),
        duration: t("tutorials.production.duration"),
        searchTerm: t("tutorials.production.searchTerm"),
      }],
      ["tut-4", {
        title: t("tutorials.cleaning.title"),
        description: t("tutorials.cleaning.description"),
        duration: t("tutorials.cleaning.duration"),
        searchTerm: t("tutorials.cleaning.searchTerm"),
      }],
    ]),
  });

  const faqs = localizedKnowledgeBase.faqs.length > 0
    ? localizedKnowledgeBase.faqs
    : ["inverter", "bill", "production", "cleaning", "outage"].map((id) => ({
        id,
        question: t(`faqs.${id}.question`),
        answer: t(`faqs.${id}.answer`),
      }));

  const tutorials = localizedKnowledgeBase.tutorials.length > 0
    ? localizedKnowledgeBase.tutorials.map((tutorial) => ({
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        duration: tutorial.duration,
        href: tutorial.videoUrl,
      }))
    : [
        { id: "inverter", icon: ShieldAlert, href: "https://www.youtube.com/results?search_query=solar+inverter+red+light+troubleshooting" },
        { id: "bill", icon: ReceiptText, href: "https://www.youtube.com/results?search_query=วิธีอ่านบิลค่าไฟ+PEA" },
        { id: "production", icon: Gauge, href: "https://www.youtube.com/results?search_query=how+to+read+solar+production+graph" },
        { id: "cleaning", icon: SprayCan, href: "https://www.youtube.com/results?search_query=solar+panel+cleaning+safety" },
      ].map((item) => ({
        ...item,
        title: t(`tutorials.${item.id}.title`),
        description: t(`tutorials.${item.id}.description`),
        duration: t(`tutorials.${item.id}.duration`),
      }));

  const visibleFaqs = normalizedQuery
    ? faqs.filter((faq) => matchesQuery(normalizedQuery, faq.id, faq.question, faq.answer))
    : faqs;
  const visibleTutorials = normalizedQuery
    ? tutorials.filter((tutorial) => matchesQuery(normalizedQuery, tutorial.id, tutorial.title, tutorial.description))
    : tutorials;
  const hasYouTubeSearchResults = visibleTutorials.some((tutorial) => isYouTubeSearchResultsUrl(tutorial.href));
  const resultCount = visibleFaqs.length + visibleTutorials.length;

  const faqSchema: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: `${getConfiguredPublicSiteUrl()}/${locale}/support/knowledge`,
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };

  return (
    <SolarRouteShell
      className="solar-support-page solar-support-knowledge px-4 pb-8 pt-0 text-foreground sm:px-6 sm:py-10 lg:px-8"
      contentClassName="pt-0 sm:pt-24 lg:pt-28"
    >
      <JsonLd data={faqSchema} />
      <div className="mx-auto max-w-6xl">
        <SmartBackButton
          fallbackHref={`/${locale}/support`}
          label={t("supportHub")}
          className="solar-route-control solar-support-knowledge-back layer-sticky sticky top-20 min-h-11 bg-white shadow-none backdrop-blur-none lg:static"
        />

        <header className="max-w-3xl sm:mt-8">
          <p className="text-sm font-semibold text-[#475569]">{t("badge")}</p>
          <h1 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-[#475569]">
            {t("intro")}
          </p>
        </header>

        <form action={`/${locale}/support/knowledge`} method="GET" className="mt-4 flex max-w-3xl flex-col gap-3 sm:mt-8 sm:flex-row">
          <label htmlFor="knowledge-search" className="sr-only">
            {supportT("searchPlaceholder")}
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#475569]" aria-hidden="true" />
            <Input
              id="knowledge-search"
              type="search"
              name="q"
              defaultValue={query}
              placeholder={supportT("searchPlaceholder")}
              className="solar-route-control solar-knowledge-search min-h-12 bg-white pl-12"
            />
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <Button type="submit" size="lg" className="min-w-0 flex-1">
              {locale === "th" ? "ค้นหา" : "Search"}
            </Button>
            {query ? (
              <Button asChild variant="outline" size="lg" className="min-w-0 flex-1 bg-white">
                <Link href={`/${locale}/support/knowledge`}>
                  {locale === "th" ? "ล้างคำค้น" : "Clear"}
                </Link>
              </Button>
            ) : null}
          </div>
        </form>

        {query ? (
          <p className="mt-3 text-sm text-[#475569]" role="status">
            {locale === "th"
              ? `พบ ${resultCount} รายการสำหรับ “${query}”`
              : `${resultCount} result${resultCount === 1 ? "" : "s"} for “${query}”`}
          </p>
        ) : null}

        <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.35fr)_minmax(18rem,0.65fr)] lg:items-start">
          <section aria-labelledby="faq-heading">
            <div className="flex items-center gap-3">
              <HelpCircle className="h-5 w-5 text-[#475569]" aria-hidden="true" />
              <h2 id="faq-heading" className="text-2xl font-bold tracking-tight text-foreground">
                {t("faqTitle")}
              </h2>
            </div>

            {visibleFaqs.length > 0 ? (
          <Card className="solar-route-card mt-5 overflow-hidden px-5 sm:px-6">
                <Accordion type="single" collapsible defaultValue={visibleFaqs[0]?.id}>
                  {visibleFaqs.map((faq) => (
                    <AccordionItem id={faq.id} key={faq.id} value={faq.id}>
                      <AccordionTrigger className="py-4 text-base">{faq.question}</AccordionTrigger>
                      <AccordionContent className="pr-8 text-sm leading-7 text-[#475569]">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </Card>
            ) : (
              <Card className="mt-5 p-7 text-center">
                <Search className="mx-auto h-7 w-7 text-[#475569]" aria-hidden="true" />
                <p className="mt-3 font-semibold text-foreground">
                  {locale === "th" ? "ไม่พบคำถามที่ตรงกับคำค้น" : "No questions match this search."}
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#475569]">
                  {locale === "th" ? "ลองใช้คำที่สั้นลง หรือติดต่อทีมบริการหากต้องการความช่วยเหลือ" : "Try a shorter phrase, or contact the service team if you need help."}
                </p>
              </Card>
            )}
          </section>

          <Card asChild tone="accent" className="solar-route-card solar-route-card--accent p-5 sm:p-6">
            <aside aria-labelledby="safety-heading">
              <ShieldAlert className="h-6 w-6 text-amber-900" aria-hidden="true" />
              <p className="mt-4 text-sm font-semibold text-amber-900">{t("safetyEyebrow")}</p>
              <h2 id="safety-heading" className="mt-2 text-xl font-bold tracking-tight text-foreground">
                {t("safetyTitle")}
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-700">{t("safetyDescription")}</p>
              <Button asChild className="mt-5">
                <Link href={`/${locale}/services`}>
                  {t("serviceAction")}
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </aside>
          </Card>
        </div>

        <section className="mt-14" aria-labelledby="tutorial-heading">
          <h2 id="tutorial-heading" className="text-2xl font-bold tracking-tight text-foreground">
            {t("tutorialTitle")}
          </h2>
          <p className="mt-2 text-sm text-[#475569]">
            {hasYouTubeSearchResults ? t("youtubeSearchNote") : t("tutorialEyebrow")}
          </p>

          {visibleTutorials.length > 0 ? (
            <Card asChild className="solar-route-card mt-5 overflow-hidden p-0">
              <div>
                {visibleTutorials.map((tutorial, index) => {
                  const Icon: IconType = "icon" in tutorial && isIconType(tutorial.icon)
                    ? tutorial.icon
                    : Video;
                  const isYouTubeSearch = isYouTubeSearchResultsUrl(tutorial.href);
                  return (
                    <a
                      key={tutorial.id}
                      href={tutorial.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`group flex min-h-28 items-center gap-4 p-5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6 ${index === visibleTutorials.length - 1 ? "" : "border-b border-border"}`}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-foreground">
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="text-base font-bold text-foreground">{tutorial.title}</span>
                          <span className={isYouTubeSearch
                            ? "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-foreground"
                            : "text-xs font-semibold text-muted-foreground"}
                          >
                            {isYouTubeSearch ? t("youtubeSearchResults") : tutorial.duration}
                          </span>
                        </span>
                        <span className="mt-2 block text-sm leading-6 text-[#475569]">{tutorial.description}</span>
                        <span className="sr-only">{t("opensInNewTab")}</span>
                      </span>
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-white">
                        {isYouTubeSearch
                          ? <Search className="h-4 w-4" aria-hidden="true" />
                          : <Play className="ml-0.5 h-4 w-4 fill-current" aria-hidden="true" />}
                      </span>
                    </a>
                  );
                })}
              </div>
            </Card>
          ) : (
            <Card className="mt-5 p-7 text-center">
              <Video className="mx-auto h-7 w-7 text-[#475569]" aria-hidden="true" />
              <p className="mt-3 font-semibold text-foreground">
                {locale === "th" ? "ไม่พบวิดีโอที่ตรงกับคำค้น" : "No videos match this search."}
              </p>
            </Card>
          )}
        </section>
      </div>
    </SolarRouteShell>
  );
}

function normalizeText(value: string) {
  return value.toLocaleLowerCase().normalize("NFKC");
}

function matchesQuery(query: string, ...values: string[]) {
  return values.some((value) => normalizeText(value).includes(query));
}
