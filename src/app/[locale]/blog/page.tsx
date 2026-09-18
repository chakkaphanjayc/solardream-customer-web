import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { BLOG_ARTICLE_DEFINITIONS } from "@/lib/blogArticles";

// next-intl resolves the request-scoped message catalog here. Keep this
// lightweight editorial index request-bound while data-backed public surfaces
// use explicit cache helpers.

function formatArticleDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

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

  const articles = BLOG_ARTICLE_DEFINITIONS.map((article) => ({
    ...article,
    title: t(`articles.${article.slug}.title`),
    category: t(`articles.${article.slug}.category`),
    excerpt: t(`articles.${article.slug}.excerpt`),
  }));

  return (
    <PageShell as="div" className="bg-[#F0EEE9] px-5 pb-24 pt-32 text-[#1C1C1A] sm:px-8 sm:pb-32 sm:pt-40">
      <header className="mx-auto max-w-7xl">
        <p className="text-sm font-medium text-[var(--sd-navy-900)]">{t("subtitle")}</p>
        <h1 className="mt-6 max-w-5xl text-balance text-[clamp(2.75rem,7vw,5rem)] font-bold leading-[1.02] tracking-tight text-[#1C1C1A]">
          {t("headerTitle")}
        </h1>
      </header>

      <div className="mx-auto mt-14 max-w-7xl grid grid-cols-1 gap-6">
        {articles.map((article) => (
          <Card
            key={article.slug}
            asChild
            interactive
            className="group grid gap-6 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md hover:bg-[#F0EEE9] sm:grid-cols-[11rem_1fr_3rem] sm:items-center sm:p-8"
          >
            <Link href={`/${locale}/blog/${article.slug}`}>
            <div>
              <p className="text-sm font-medium text-[#4E4B44]">{formatArticleDate(article.date, locale)}</p>
              <span className="mt-2 inline-block rounded-full bg-[#DCE8F5] px-3 py-1 text-xs font-bold text-[#2E2C27]">{article.category}</span>
            </div>

            <div>
              <h2 className="max-w-4xl text-balance text-2xl font-bold tracking-tight text-[#1C1C1A] sm:text-3xl">
                {article.title}
              </h2>
              <p className="mt-4 max-w-3xl text-sm font-normal leading-6 text-[#4E4B44]">{article.excerpt}</p>
            </div>

            <span
              aria-hidden="true"
              className="flex h-12 w-12 items-center justify-center rounded-full border border-[#8E8B83]/20 bg-[#F0EEE9] text-xl text-[#4F7FA8] shadow-sm transition-all duration-300 group-hover:bg-[#A5C2DE] group-hover:text-white sm:justify-self-end"
            >
              ↗
            </span>
            </Link>
          </Card>
        ))}
      </div>
    </PageShell>
  );
}
