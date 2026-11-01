"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowUpRight,
  Calendar,
  Clock,
  Star,
  SunMedium,
} from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import type { BlogCategory } from "@/lib/blogArticles";

export type BlogArticleItem = {
  slug: string;
  date: string;
  categoryKey: BlogCategory;
  coverImage: string;
  estimatedWords: number;
  isFeatured?: boolean;
  title: string;
  category: string;
  excerpt: string;
};

interface BlogEditorialClientProps {
  locale: string;
  articles: BlogArticleItem[];
  translations: {
    featured: string;
    minRead: string;
    categories: {
      all: string;
      news: string;
      solarTips: string;
      caseStudies: string;
    };
  };
}

function formatArticleDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function BrandedCoverPlaceholder({ title }: { title: string }) {
  return (
    <div
      role="img"
      aria-label={title || "SolarDream Editorial Insight"}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden bg-[#F0EBE5] p-6 text-center text-[var(--sd-ink)]"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 400 300"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="200" cy="110" r="50" stroke="#5089bf" strokeWidth="6" strokeDasharray="6 4" />
        <path d="M40 260 L140 180 L260 180 L360 260" stroke="#5089bf" strokeWidth="8" strokeLinecap="round" />
        <path d="M120 200 L280 200" stroke="#B7D1EA" strokeWidth="6" />
        <path d="M180 180 L140 260" stroke="#5089bf" strokeWidth="4" />
        <path d="M220 180 L260 260" stroke="#5089bf" strokeWidth="4" />
      </svg>
      <div className="relative z-10 flex flex-col items-center">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#DCE8F5] text-[#5089bf] shadow-xs">
          <SunMedium className="h-6 w-6 stroke-[2.2]" aria-hidden="true" />
        </div>
        <span className="mt-3 text-xs font-black tracking-wide text-[#3c567a]">SolarDream Editorial</span>
      </div>
    </div>
  );
}

function ArticleCoverImage({
  src,
  alt,
  priority,
}: {
  src: string;
  alt: string;
  priority?: boolean;
}) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return <BrandedCoverPlaceholder title={alt} />;
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 800px"
      className="object-cover transition-transform duration-700 ease-expo-out group-hover:scale-[1.04]"
      onError={() => setError(true)}
    />
  );
}

export default function BlogEditorialClient({
  locale,
  articles,
  translations,
}: BlogEditorialClientProps) {
  const isTh = locale === "th";
  const [activeCategory, setActiveCategory] = useState<BlogCategory>("all");

  const categoryFilters: Array<{ id: BlogCategory; label: string }> = [
    { id: "all", label: translations.categories.all },
    { id: "news", label: translations.categories.news },
    { id: "solar-tips", label: translations.categories.solarTips },
    { id: "case-studies", label: translations.categories.caseStudies },
  ];

  // Pick the featured article (either marked isFeatured or the most recent)
  const featuredArticle = useMemo(
    () => articles.find((a) => a.isFeatured) || articles[0],
    [articles],
  );

  // Filtered articles list for the 2-column grid
  const gridArticles = useMemo(() => {
    return articles.filter((article) => {
      if (activeCategory === "all") return true;
      return article.categoryKey === activeCategory;
    });
  }, [activeCategory, articles]);

  const calcReadTime = (words: number) => {
    const mins = Math.max(1, Math.ceil(words / 200));
    return `${mins} ${translations.minRead}`;
  };

  return (
    <div className="w-full space-y-12">
      {/* 1. Full-Width Featured Article Hero Card */}
      {featuredArticle ? (
        <section aria-labelledby="featured-article-title">
          <Link
            href={`/${locale}/blog/${featuredArticle.slug}`}
            className="group relative block overflow-hidden rounded-[32px] border border-[var(--border)] bg-[var(--sd-card)] shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
              {/* Cover Image Frame */}
              <div className="relative min-h-[18rem] sm:min-h-[22rem] lg:min-h-[28rem] overflow-hidden bg-slate-900">
                <ArticleCoverImage
                  src={featuredArticle.coverImage}
                  alt={featuredArticle.title}
                  priority
                />
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20 lg:hidden"
                />
              </div>

              {/* Content Panel */}
              <div className="flex flex-col justify-between p-6 sm:p-8 lg:p-12">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--primary)] px-3 py-1 text-xs font-black uppercase tracking-wider text-[var(--accent-foreground)] shadow-xs">
                      <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                      <span>{translations.featured}</span>
                    </span>
                    <span className="inline-flex items-center rounded-full bg-[var(--muted)] px-3 py-1 text-xs font-bold text-[var(--sd-text-secondary)]">
                      {featuredArticle.category}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--muted-foreground)]">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {calcReadTime(featuredArticle.estimatedWords)}
                    </span>
                  </div>

                  <h2
                    id="featured-article-title"
                    className="mt-5 text-2xl font-black leading-tight tracking-tight text-[var(--sd-ink)] sm:text-3xl lg:text-4xl group-hover:text-[var(--primary-foreground)] transition-colors"
                  >
                    {featuredArticle.title}
                  </h2>
                  <p className="mt-4 line-clamp-3 text-sm sm:text-base font-normal leading-relaxed text-[var(--sd-text-secondary)]">
                    {featuredArticle.excerpt}
                  </p>
                </div>

                <div className="mt-8 flex items-center justify-between border-t border-[var(--border)] pt-5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--muted-foreground)]">
                    <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                    {formatArticleDate(featuredArticle.date, locale)}
                  </span>
                  <span
                    aria-hidden="true"
                    className="grid h-10 w-10 place-items-center rounded-full bg-[var(--background)] text-[var(--sd-ink)] shadow-xs transition-all duration-300 group-hover:bg-[var(--sd-ink)] group-hover:text-white"
                  >
                    <ArrowUpRight className="h-5 w-5 stroke-[2.5]" />
                  </span>
                </div>
              </div>
            </div>
          </Link>
        </section>
      ) : null}

      {/* 2. Category Filter Pills */}
      <section
        aria-label={isTh ? "หมวดหมู่บทความ" : "Article Categories"}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-6"
      >
        <div className="flex flex-wrap items-center gap-2">
          {categoryFilters.map((filter) => {
            const isActive = activeCategory === filter.id;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => setActiveCategory(filter.id)}
                aria-pressed={isActive}
                className={cn(
                  "min-h-11 cursor-pointer rounded-full px-4 py-2.5 text-xs font-black transition-all duration-200 touch-manipulation active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]",
                  isActive
                    ? "bg-[var(--primary)] text-[var(--sd-ink)] shadow-xs"
                    : "bg-[var(--sd-card)] text-[var(--sd-text-secondary)] border border-[var(--border)] hover:bg-[var(--muted)]",
                )}
              >
                {filter.label}
              </button>
            );
          })}
        </div>

        <span className="text-xs font-bold text-[var(--muted-foreground)]">
          {isTh
            ? `แสดง ${gridArticles.length} บทความ`
            : `Showing ${gridArticles.length} articles`}
        </span>
      </section>

      {/* 3. Responsive 2-Column Grid */}
      <section aria-label={isTh ? "รายการบทความทั้งหมด" : "All Articles"}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {gridArticles.map((article) => (
            <Link
              key={article.slug}
              href={`/${locale}/blog/${article.slug}`}
              className="group flex flex-col justify-between overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--sd-card)] shadow-xs transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            >
              <div>
                {/* Card Cover Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-900">
                  <ArticleCoverImage src={article.coverImage} alt={article.title} />
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                    <span className="rounded-full bg-white/90 backdrop-blur-xs px-3 py-1 text-[11px] font-black text-[var(--accent-foreground)] shadow-xs">
                      {article.category}
                    </span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-6 sm:p-7">
                  <div className="flex items-center gap-3 text-xs font-bold text-[var(--muted-foreground)]">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                      {formatArticleDate(article.date, locale)}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {calcReadTime(article.estimatedWords)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-xl font-black leading-tight tracking-tight text-[var(--sd-ink)] group-hover:text-[var(--primary-foreground)] transition-colors">
                    {article.title}
                  </h3>
                  <p className="mt-3 line-clamp-2 text-xs sm:text-sm font-normal leading-relaxed text-[var(--sd-text-secondary)]">
                    {article.excerpt}
                  </p>
                </div>
              </div>

              {/* Card Footer Link */}
              <div className="px-6 pb-6 pt-2 sm:px-7 sm:pb-7 flex items-center justify-between border-t border-[var(--border)] mt-2">
                <span className="text-xs font-black text-[var(--primary-foreground)] group-hover:underline">
                  {isTh ? "อ่านบทความฉบับเต็ม" : "Read full insight"}
                </span>
                <span
                  aria-hidden="true"
                  className="grid h-8 w-8 place-items-center rounded-full bg-[var(--background)] text-[var(--sd-ink)] shadow-2xs transition-all duration-300 group-hover:bg-[var(--sd-ink)] group-hover:text-white"
                >
                  <ArrowUpRight className="h-4 w-4 stroke-[2.5]" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
