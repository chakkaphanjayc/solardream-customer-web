import { getArticleById } from "@/app/actions/articles";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Calendar, ChevronLeft, Clock, User } from "@/components/ui/icons";
import ProgressiveImage from "@/components/ui/progressive-image";
import { sanitizeHtml } from "@/lib/htmlSanitizer";
import SocialShareBar from "@/components/articles/SocialShareBar";
import { PageShell } from "@/components/ui/page-shell";
import { Card } from "@/components/ui/card";

// Article detail pages resolve a request locale and live publication state;
// keep the route blocking while the article payload is served from its tag
// cache in the public read action.


export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const article = await getArticleById(id);
  if (!article) return {};

  const title = article.metaTitle || `${article.title} | SolarDream`;
  const description = article.metaDescription || article.title;
  const ogImage = article.ogImage || article.coverImage;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

function getEstimatedReadingTime(contentHtml: string): number {
  const plainText = contentHtml.replace(/<[^>]+>/g, " ");
  const wordCount = plainText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(wordCount / 200));
}

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id, locale } = await params;
  const t = await getTranslations({ locale, namespace: "NewsPage" });
  const article = await getArticleById(id);
  if (!article || !article.isPublished) notFound();

  const readingTime = getEstimatedReadingTime(article.content);

  return (
    <PageShell as="div" className="bg-[#F0EEE9] px-4 py-10 text-[#1C1C1A] selection:bg-[#DCE8F5] md:px-6 md:py-16">
      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb Navigation */}
        <Link
          href={`/${locale}/news`}
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-[#4F7FA8] hover:underline transition-colors mb-8 group"
        >
          <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          <span>{t("emptyState.back")}</span>
        </Link>

        {/* Hero Meta & Title */}
        <header className="mb-8 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs font-medium text-[#4E4B44]">
            <span className="flex items-center gap-1.5 bg-[#DCE8F5] px-3.5 py-1 rounded-full text-[#2E2C27] font-medium">
              <Calendar className="w-3.5 h-3.5 text-[#4F7FA8]" />
              {new Date(article.publishedAt || article.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 bg-[#DCE8F5] px-3.5 py-1 rounded-full text-[#2E2C27] font-medium">
              <Clock className="w-3.5 h-3.5 text-[#4F7FA8]" />
              {locale === "th" ? `อ่าน ${readingTime} นาที` : `${readingTime} min read`}
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5 text-[#4E4B44]">
              <User className="w-3.5 h-3.5" />
              {article.writer || article.author.name || article.author.email}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-[#1C1C1A] tracking-tight leading-tight">
            {article.title}
          </h1>

          {/* Social Share Bar */}
          <div className="pt-2 border-t border-[#8E8B83]/15">
            <SocialShareBar title={article.title} articleId={article.id} locale={locale} />
          </div>
        </header>

        {/* Cover Image Hero Banner */}
        {article.coverImage && (
          <div className="relative w-full h-[280px] sm:h-[380px] md:h-[460px] rounded-[28px] overflow-hidden shadow-sm mb-12 border border-[#8E8B83]/20">
            <ProgressiveImage
              src={article.coverImage}
              alt={article.title}
              fill
              sizes="100vw"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Optimal Reading Column Article Body */}
        <main className="mx-auto">
          <article
            className="max-w-prose mx-auto prose prose-slate md:prose-lg prose-img:rounded-[24px] prose-headings:font-bold prose-headings:text-[#1C1C1A] prose-a:text-[#4F7FA8] prose-a:font-medium prose-blockquote:border-l-[#B7D1EA] leading-relaxed text-[#1C1C1A] tracking-normal"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(article.content) }}
          />
        </main>

        {/* Author Bio Footer & Bottom Social Share */}
        <footer className="mt-16 pt-8 border-t border-[#8E8B83]/15 max-w-prose mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {article.author.avatarUrl && article.author.avatarUrl.trim() !== "" ? (
                <div className="relative w-12 h-12 overflow-hidden rounded-full border border-[#8E8B83]/20 shadow-xs">
                  <ProgressiveImage
                    src={article.author.avatarUrl}
                    alt={article.author.name || ""}
                    fill
                    sizes="48px"
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#DCE8F5] border border-[#8E8B83]/20 flex items-center justify-center text-base font-bold text-[#4F7FA8]">
                  {(article.writer || article.author.name || article.author.email).charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-sm font-bold text-[#1C1C1A]">
                  {locale === "th" ? `เขียนโดย ${article.writer || article.author.name || article.author.email}` : `Written by ${article.writer || article.author.name || article.author.email}`}
                </p>
                <p className="text-xs text-[#4E4B44] font-normal">{t("emptyState.advisor")}</p>
              </div>
            </div>
          </div>

          <Card className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 shadow-sm">
            <SocialShareBar title={article.title} articleId={article.id} locale={locale} />
          </Card>
        </footer>
      </div>
    </PageShell>
  );
}
