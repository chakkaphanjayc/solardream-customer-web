import { Suspense } from "react";
import { getArticles } from "@/app/actions/articles";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Calendar, ChevronRight, FileText, User } from "@/components/ui/icons";
import ProgressiveImage from "@/components/ui/progressive-image";
import NewsEmptyState from "./NewsEmptyState";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { getCachedPageSeo } from "@/app/actions/seo";
import type { Metadata } from "next";
import { PageShell } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";

// The listing combines the cached article feed with request-scoped localized
// copy. Keep the route blocking while the article query remains tag-cached.
export const instant = false;


export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedPageSeo("news");
  return {
    title: seo.seoTitle,
    description: seo.seoDescription,
    keywords: seo.seoKeywords ? seo.seoKeywords.split(",").map(k => k.trim()) : [],
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

function getExcerpt(html: string, length = 140) {
  const clean = html.replace(/<[^>]*>/g, " ").trim().replace(/\s+/g, " ");
  if (clean.length <= length) return clean;
  return clean.substring(0, length) + "...";
}

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function NewsPage({ params }: PageProps) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "NewsPage" });
  const articles = await getArticles();

  return (
    <PageShell className="bg-[#F0EEE9] text-[#1C1C1A]">
      <MotionReveal className="mx-auto max-w-6xl px-4 pb-12 pt-28 md:px-6 md:pb-16 md:pt-32">
        {/* Header */}
        <div className="mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-[var(--sd-navy-900)] block mb-2">
            {t("breadcrumbs.knowledge")}
          </span>
          <h1 className="text-3xl md:text-4xl font-bold text-[#1C1C1A] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm md:text-base text-[#4E4B44] mt-3 max-w-2xl font-normal leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((art) => {
            const excerpt = getExcerpt(art.content);
            return (
              <Card
                key={art.id}
                asChild
                interactive
                className="group flex flex-col overflow-hidden rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-md hover:bg-[#F0EEE9]"
              >
                <Link href={`/${locale}/news/${art.id}`}>
                {/* Cover Image */}
                <div className="aspect-video w-full bg-[#F7F6F3] relative overflow-hidden shrink-0">
                  {art.coverImage && art.coverImage.trim() !== "" ? (
                    <ProgressiveImage
                      src={art.coverImage}
                      alt={art.title}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[#4E4B44]/40">
                      <FileText className="w-12 h-12" />
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-6 flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 text-xs font-medium text-[#4E4B44] mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#4F7FA8]" />
                        {new Date(art.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}
                      </span>
                      <span>·</span>
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-[#4F7FA8]" />
                        {art.author.name || art.author.email.split("@")[0]}
                      </span>
                    </div>

                    <h2 className="text-base font-bold text-[#1C1C1A] line-clamp-2 transition-colors leading-snug">
                      {art.title}
                    </h2>

                    <p className="text-xs text-[#4E4B44] mt-2 line-clamp-3 leading-relaxed font-normal">
                      {excerpt}
                    </p>
                  </div>

                        <div className="flex items-center gap-1.5 text-xs font-medium text-[var(--sd-navy-900)] mt-5 pt-3 border-t border-[#8E8B83]/15">
                    {t("readArticle")} <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
                </Link>
              </Card>
            );
          })}

          {articles.length === 0 && (
            <Suspense fallback={<div className="col-span-full min-h-[360px]" aria-hidden="true" />}>
              <NewsEmptyState />
            </Suspense>
          )}
        </div>
      </MotionReveal>
    </PageShell>
  );
}
