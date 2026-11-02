import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { PageShell } from "@/components/ui/page-shell";
import { BLOG_ARTICLE_DEFINITIONS } from "@/lib/blogArticles";
import BlogEditorialClient, { type BlogArticleItem } from "@/components/blog/BlogEditorialClient";

type BlogPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export async function generateMetadata({ params }: BlogPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BlogPage" });

  return {
    title: t("title"),
    description: t("metaDesc"),
  };
}

export default async function BlogPage({ params }: BlogPageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "BlogPage" });

  const articles: BlogArticleItem[] = BLOG_ARTICLE_DEFINITIONS.map((article) => ({
    ...article,
    title: t(`articles.${article.slug}.title`),
    category: t(`articles.${article.slug}.category`),
    excerpt: t(`articles.${article.slug}.excerpt`),
  }));

  const translations = {
    featured: t("featured"),
    minRead: t("minRead"),
    categories: {
      all: t("categories.all"),
      news: t("categories.news"),
      solarTips: t("categories.solarTips"),
      caseStudies: t("categories.caseStudies"),
    },
  };

  return (
    <PageShell as="div" className="bg-[var(--background)] px-5 pb-24 pt-28 text-[var(--sd-ink)] sm:px-8 sm:pb-32 sm:pt-36">
      <header className="mx-auto max-w-7xl mb-12 sm:mb-16">
        <div className="inline-flex items-center rounded-full bg-[var(--muted)] px-3.5 py-1.5 text-xs font-black uppercase tracking-wider text-[var(--accent-foreground)]">
          {t("subtitle")}
        </div>
        <h1 className="mt-4 max-w-5xl text-balance text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.04] tracking-tight text-[var(--sd-ink)]">
          {t("headerTitle")}
        </h1>
        <p className="mt-4 max-w-2xl text-base sm:text-lg font-normal leading-relaxed text-[var(--sd-text-secondary)]">
          {t("metaDesc")}
        </p>
      </header>

      <div className="mx-auto max-w-7xl">
        <BlogEditorialClient
          locale={locale}
          articles={articles}
          translations={translations}
        />
      </div>
    </PageShell>
  );
}
