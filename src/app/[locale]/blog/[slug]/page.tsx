import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";

import { SoliaGuide } from "@/components/brand/solia-scenes";
import { EnergyLine } from "@/components/brand/energy-line";
import { ArrowRight, Check, ChevronLeft } from "@/components/ui/icons";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import {
  BLOG_ARTICLE_DEFINITIONS,
  getBlogArticleDefinition,
} from "@/lib/blogArticles";

type BlogArticlePageProps = Readonly<{
  params: Promise<{ locale: string; slug: string }>;
}>;


function formatArticleDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function generateStaticParams() {
  return ["th", "en"].flatMap((locale) =>
    BLOG_ARTICLE_DEFINITIONS.map(({ slug }) => ({ locale, slug })),
  );
}

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = getBlogArticleDefinition(slug);

  if (!article) return {};

  const t = await getTranslations({ locale, namespace: "BlogPage" });
  const title = t(`articles.${article.slug}.title`);
  const description = t(`articles.${article.slug}.excerpt`);

  return {
    title: `${title} | SolarDream`,
    description,
  };
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { locale, slug } = await params;
  const article = getBlogArticleDefinition(slug);

  if (!article) notFound();

  const t = await getTranslations({ locale, namespace: "BlogPage" });
  const articleKey = `articles.${article.slug}`;
  const detailKey = `${articleKey}-detail`;

  return (
    <PageShell
      as="div"
      className="overflow-hidden bg-[var(--sd-page)] px-4 pb-24 pt-28 text-[var(--sd-ink)] sm:px-8 sm:pb-32 sm:pt-36"
    >
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/${locale}/blog`}
          className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-bold text-[var(--sd-navy-900)] underline-offset-4 transition-colors hover:text-[var(--sd-blue-600)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-focus)] focus-visible:ring-offset-2"
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
          {t("detail.back")}
        </Link>

        <div className="mt-8 grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-16">
          <article aria-labelledby="blog-article-title" className="min-w-0">
            <header className="max-w-4xl">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-[var(--sd-muted)]">
                <span className="rounded-full bg-[var(--sd-selected)] px-3 py-1.5 text-[var(--sd-navy-900)]">
                  {t(`${articleKey}.category`)}
                </span>
                <span aria-hidden="true" className="text-[var(--sd-line)]">•</span>
                <time className="text-[var(--sd-navy-900)]" dateTime={article.date}>{formatArticleDate(article.date, locale)}</time>
              </div>

              <h1
                id="blog-article-title"
                className="mt-6 max-w-4xl text-balance text-[clamp(2.6rem,7vw,5.8rem)] font-black leading-[0.98] tracking-[-0.045em] text-[var(--sd-ink)]"
              >
                {t(`${articleKey}.title`)}
              </h1>
              <p className="mt-7 max-w-3xl text-pretty text-lg font-semibold leading-8 text-[var(--sd-text)] sm:text-xl">
                {t(`${articleKey}.excerpt`)}
              </p>
              <EnergyLine
                aria-hidden="true"
                className="mt-8 h-6 w-48 text-[var(--sd-blue-600)] [&_[data-energy-line-track]]:stroke-[var(--sd-line)] [&_[data-energy-line-track]]:stroke-2 [&_[data-energy-line-progress]]:stroke-[var(--sd-blue-600)] [&_[data-energy-line-progress]]:stroke-2 [&_[data-energy-line-node]]:fill-[var(--sd-cyan-400)]"
              />
            </header>

            <div className="mt-12 max-w-3xl space-y-8">
              <section className="solar-ui-panel rounded-[var(--sd-radius-panel)] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-1)] sm:p-9">
                <p className="text-lg font-bold leading-8 text-[var(--sd-navy-900)] sm:text-xl">
                  {t(`${detailKey}.lead`)}
                </p>
                <div className="mt-8 space-y-6 border-t border-[var(--sd-line)] pt-7 text-base leading-8 text-[var(--sd-text)]">
                  <h2 className="text-2xl font-black leading-tight tracking-tight text-[var(--sd-ink)] sm:text-3xl">
                    {t(`${detailKey}.bodyTitle`)}
                  </h2>
                  <p>{t(`${detailKey}.bodyOne`)}</p>
                  <p>{t(`${detailKey}.bodyTwo`)}</p>
                  <p>{t(`${detailKey}.bodyThree`)}</p>
                </div>
              </section>

              <section
                aria-labelledby="article-evidence-title"
                className="solar-ui-soft-panel rounded-[var(--sd-radius-panel)] p-6 sm:p-9"
              >
                <h2 id="article-evidence-title" className="text-2xl font-black leading-tight tracking-tight text-[var(--sd-ink)] sm:text-3xl">
                  {t("detail.evidenceTitle")}
                </h2>
                <p className="mt-3 max-w-2xl text-base leading-7 text-[var(--sd-text)]">
                  {t("detail.evidenceBody")}
                </p>
                <ul className="mt-6 space-y-3">
                  {(["bill", "roof", "questions"] as const).map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm font-bold leading-6 text-[var(--sd-ink)]">
                      <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[var(--sd-navy-900)] text-[var(--sd-white)]">
                        <Check aria-hidden="true" className="h-3.5 w-3.5" />
                      </span>
                      {t(`detail.evidenceItems.${item}`)}
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </article>

          <aside className="space-y-5 lg:sticky lg:top-28" aria-label={t("detail.related")}>
            <section className="solar-ui-technical-panel overflow-hidden rounded-[var(--sd-radius-panel)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[0.68rem] font-black uppercase tracking-[0.16em] text-[var(--sd-cyan-100)]">
                  {t("detail.guide")}
                </p>
                <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[var(--sd-cyan-400)] shadow-[0_0_0_5px_rgb(77_220_255_/_0.14)]" />
              </div>
              <SoliaGuide
                className="mx-auto mt-4 h-64 w-full max-w-[15rem]"
                pose="blueprint"
                alt={t("detail.guideAlt")}
                message={t("detail.guideBody")}
                speechBubbleClassName="absolute bottom-1 left-0 max-w-[13rem] rounded-[var(--sd-radius-md)] border border-white/20 bg-[var(--sd-white)] p-3 text-xs font-bold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-2)]"
              />
            </section>

            <Card className="rounded-[var(--sd-radius-panel)] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-2)]">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sd-navy-900)]">{t("detail.related")}</p>
              <h2 className="mt-3 text-2xl font-black leading-tight tracking-tight text-[var(--sd-ink)]">{t("detail.ctaTitle")}</h2>
              <p className="mt-3 text-sm leading-6 text-[var(--sd-text)]">{t("detail.ctaBody")}</p>
              <Link
                href={`/${locale}/wizard`}
                className="solar-ui-primary mt-6 w-full justify-between"
              >
                {t("detail.cta")}
                <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </Card>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}
