"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useLocale, useTranslations } from "next-intl";

import {
  ArrowRight,
  BookOpen,
  Box,
  Calendar,
  ChevronRight,
  FileText,
  HelpCircle,
  Search,
  ShieldCheck,
  Wrench,
} from "@/components/ui/icons";
import {
  searchSupportPortalAction,
  type SearchResultItem,
} from "@/app/actions/search";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import Skeleton from "@/components/ui/skeleton";
import type {
  SupportDashboardArticle,
  SupportDashboardProps,
} from "@/types/support";

const SEARCH_RESULTS_ID = "support-dashboard-search-results";
const SEARCH_LABEL_ID = "support-dashboard-search-label";

export default function SupportDashboardClient({
  user,
  articles,
}: SupportDashboardProps) {
  const t = useTranslations("SupportDashboard");
  const locale = useLocale();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRequestRef = useRef(0);

  const displayName = user.name || user.email.split("@")[0] || "Customer";
  const popularArticles = useMemo(() => articles.slice(0, 3), [articles]);

  useEffect(() => {
    const query = searchQuery.trim();
    const requestId = ++searchRequestRef.current;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    if (!query) {
      const frame = window.requestAnimationFrame(() => {
        setSearchResults([]);
        setSearchError("");
        setIsLoading(false);
        setIsSearchOpen(false);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const loadingFrame = window.requestAnimationFrame(() => {
      setIsLoading(true);
      setSearchError("");
      setIsSearchOpen(true);
    });

    debounceTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await searchSupportPortalAction(query, locale, false);
        if (requestId !== searchRequestRef.current) return;

        if (response.success) {
          setSearchResults(response.results);
        } else {
          setSearchResults([]);
          setSearchError(response.error || localizedCopy(locale, "searchError"));
        }
      } catch {
        if (requestId !== searchRequestRef.current) return;
        setSearchResults([]);
        setSearchError(localizedCopy(locale, "searchError"));
      } finally {
        if (requestId === searchRequestRef.current) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => {
      window.cancelAnimationFrame(loadingFrame);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [locale, searchQuery]);

  const handleSearchSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const requestId = ++searchRequestRef.current;
    setIsLoading(true);
    setSearchError("");
    setIsSearchOpen(true);

    try {
      const response = await searchSupportPortalAction(query, locale, true);
      if (requestId !== searchRequestRef.current) return;

      if (response.success) {
        setSearchResults(response.results);
      } else {
        setSearchResults([]);
        setSearchError(response.error || localizedCopy(locale, "searchError"));
      }
    } catch {
      if (requestId !== searchRequestRef.current) return;
      setSearchResults([]);
      setSearchError(localizedCopy(locale, "searchError"));
    } finally {
      if (requestId === searchRequestRef.current) {
        setIsLoading(false);
      }
    }
  };

  const clearSearch = () => {
    searchRequestRef.current += 1;
    setSearchQuery("");
    setSearchResults([]);
    setSearchError("");
    setIsLoading(false);
    setIsSearchOpen(false);
  };

  const quickActions = [
    {
      title: t("requestService.title"),
      description: t("requestService.description"),
      href: `/${locale}/services`,
      icon: Wrench,
    },
    {
      title: t("myGear.title"),
      description: t("myGear.description"),
      href: `/${locale}/my-assets`,
      icon: ShieldCheck,
    },
    {
      title: t("maintenance.title"),
      description: t("maintenance.description"),
      href: `/${locale}/services`,
      icon: Calendar,
    },
    {
      title: t("knowledgeBase.title"),
      description: t("knowledgeBase.description"),
      href: `/${locale}/support/knowledge`,
      icon: BookOpen,
    },
  ];

  return (
    <div className="solar-support-dashboard mx-auto max-w-6xl py-6 sm:py-10">
      <header className="solar-support-hero overflow-hidden rounded-[24px] text-white">
        <div className="grid grid-cols-1 items-center md:grid-cols-[minmax(0,1fr)_14rem]">
          <div className="px-6 py-8 sm:px-8 sm:py-10">
            <p className="text-sm font-semibold text-[#B7D1EA]">
              {t("portalLabel")}
            </p>
            <h1 className="mt-3 max-w-2xl text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              {t("greeting", { name: displayName })}
            </h1>
            <p className="mt-4 max-w-2xl text-pretty text-sm leading-6 text-slate-300 sm:text-base sm:leading-7">
              {t("heroDescription")}
            </p>
          </div>
          <div className="relative hidden h-full min-h-52 bg-[#B7D1EA]/15 md:block" aria-hidden="true">
            <Image
              src="/asset/solia-presenting.webp"
              alt=""
              fill
              sizes="224px"
              className="object-contain object-bottom"
              priority
            />
          </div>
        </div>
      </header>

      <section className="mx-auto mt-8 max-w-3xl" aria-labelledby="support-search-heading">
        <h2 id="support-search-heading" className="text-balance text-xl font-bold text-foreground sm:text-2xl">
          {t("searchPlaceholder")}
        </h2>
        <Popover open={isSearchOpen && searchQuery.trim().length > 0} onOpenChange={setIsSearchOpen}>
          <PopoverAnchor asChild>
            <div className="mt-4">
              <form
                onSubmit={handleSearchSubmit}
                data-analytics-form="support_dashboard_search"
                data-analytics-submit-event="search_submitted"
                className="solar-route-control flex items-center gap-2 rounded-xl border border-input bg-white p-2 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30"
              >
                <label id={SEARCH_LABEL_ID} htmlFor="support-dashboard-search" className="sr-only">
                  {t("searchPlaceholder")}
                </label>
                <Search className="ml-2 h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                <Input
                  id="support-dashboard-search"
                  type="search"
                  data-analytics-field="query"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  onFocus={() => {
                    if (searchQuery.trim()) setIsSearchOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== "ArrowDown" || isLoading || searchResults.length === 0) return;
                    event.preventDefault();
                    document.querySelector<HTMLAnchorElement>(`#${SEARCH_RESULTS_ID} a[href]`)?.focus();
                  }}
                  aria-controls={searchQuery.trim() ? SEARCH_RESULTS_ID : undefined}
                  aria-expanded={isSearchOpen && searchQuery.trim().length > 0}
                  className="min-w-0 flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
                />
                {searchQuery ? (
                  <Button type="button" variant="quiet" onClick={clearSearch}>
                    {localizedCopy(locale, "clear")}
                  </Button>
                ) : null}
                <Button type="submit" disabled={!searchQuery.trim() || isLoading}>
                  {localizedCopy(locale, "search")}
                </Button>
              </form>
            </div>
          </PopoverAnchor>

          <PopoverContent
            id={SEARCH_RESULTS_ID}
            aria-labelledby={SEARCH_LABEL_ID}
            align="center"
            sideOffset={8}
            onOpenAutoFocus={(event) => event.preventDefault()}
            className="w-[calc(100vw-2rem)] max-w-3xl overflow-hidden p-0"
          >
            <div className="flex min-h-11 items-center justify-between border-b border-border bg-muted/60 px-4 py-2">
              <p className="text-sm font-semibold text-foreground">
                {localizedCopy(locale, "results")}
              </p>
              <span className="text-xs font-semibold text-muted-foreground" aria-live="polite">
                {isLoading ? localizedCopy(locale, "searching") : searchResults.length}
              </span>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-3 p-4" role="status" aria-label={localizedCopy(locale, "searching")}>
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="flex items-start gap-3 py-2">
                      <Skeleton className="h-10 w-10 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchError ? (
                <div className="p-6 text-center" role="alert">
                  <HelpCircle className="mx-auto h-7 w-7 text-rose-700" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-rose-800">{searchError}</p>
                </div>
              ) : searchResults.length > 0 ? (
                <ul className="divide-y divide-border">
                  {searchResults.map((item) => (
                    <SearchResultRow key={`${item.type}-${item.id}`} item={item} locale={locale} />
                  ))}
                </ul>
              ) : (
                <div className="p-7 text-center">
                  <HelpCircle className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-semibold text-foreground">
                    {localizedCopy(locale, "noResults")}
                  </p>
                  <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                    {localizedCopy(locale, "tryAnother")}
                  </p>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </section>

      <section className="mt-12" aria-labelledby="quick-actions-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="quick-actions-heading" className="text-2xl font-bold tracking-tight text-foreground">
            {t("quickActionsTitle")}
          </h2>
        </div>
        <Card asChild className="mt-5 overflow-hidden p-0">
          <nav aria-label={t("quickActionsTitle")}>
            <ul className="grid grid-cols-1 sm:grid-cols-2">
              {quickActions.map((action, index) => {
                const Icon = action.icon;
                return (
                  <li
                    key={action.title}
                    className={index % 2 === 0 ? "border-b border-border sm:border-r" : "border-b border-border"}
                  >
                    <Link
                      href={action.href}
                      className="group flex min-h-36 items-start gap-4 p-5 transition-colors duration-200 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6"
                    >
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/25 text-foreground">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-base font-bold text-foreground">{action.title}</span>
                        <span className="mt-2 block text-sm leading-6 text-muted-foreground">{action.description}</span>
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Card>
      </section>

      <section className="mt-12" aria-labelledby="recommended-guides-heading">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="recommended-guides-heading" className="text-2xl font-bold tracking-tight text-foreground">
            {localizedCopy(locale, "recommended")}
          </h2>
          <Button asChild variant="outline">
            <Link href={`/${locale}/news`}>
              {localizedCopy(locale, "viewAll")}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {popularArticles.length > 0 ? (
          <Card asChild className="mt-5 overflow-hidden p-0">
            <div>
              {popularArticles.map((article, index) => (
                <ArticleRow
                  key={article.id}
                  article={article}
                  locale={locale}
                  isLast={index === popularArticles.length - 1}
                />
              ))}
            </div>
          </Card>
        ) : (
          <Card className="mt-5 p-8 text-center">
            <FileText className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-semibold text-foreground">
              {localizedCopy(locale, "noGuides")}
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm leading-6 text-muted-foreground">
              {t("knowledgeBase.description")}
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

function SearchResultRow({ item, locale }: { item: SearchResultItem; locale: string }) {
  const Icon = item.type === "article" ? FileText : Box;
  const href = item.url.startsWith(`/${locale}/`)
    ? item.url
    : `/${locale}${item.url.startsWith("/") ? item.url : `/${item.url}`}`;

  return (
    <li>
      <Link
        href={href}
        className="group flex min-h-20 items-start gap-3 px-4 py-4 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">{item.title}</span>
            <Badge variant={item.type === "article" ? "info" : "success"}>
              {item.type === "article" ? localizedCopy(locale, "guide") : localizedCopy(locale, "product")}
            </Badge>
          </span>
          <span className="mt-1 line-clamp-2 block text-sm leading-6 text-muted-foreground">
            {getExcerpt(item.content)}
          </span>
        </span>
        <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
      </Link>
    </li>
  );
}

function ArticleRow({
  article,
  locale,
  isLast,
}: {
  article: SupportDashboardArticle;
  locale: string;
  isLast: boolean;
}) {
  return (
    <Link
      href={`/${locale}/news/${article.id}`}
      className={`group flex min-h-28 items-start gap-4 p-5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:p-6 ${isLast ? "" : "border-b border-border"}`}
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-foreground">
        <FileText className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-bold text-foreground">{article.title}</span>
        <span className="mt-2 line-clamp-2 block text-sm leading-6 text-muted-foreground">
          {getExcerpt(article.content, 150)}
        </span>
      </span>
      <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-x-1 motion-reduce:transition-none" aria-hidden="true" />
    </Link>
  );
}

function getExcerpt(html: string, length = 120) {
  const clean = html.replace(/<[^>]*>/g, " ").trim().replace(/\s+/g, " ");
  if (clean.length <= length) return clean;
  return `${clean.substring(0, length).trimEnd()}…`;
}

function localizedCopy(
  locale: string,
  key:
    | "clear"
    | "guide"
    | "noGuides"
    | "noResults"
    | "product"
    | "recommended"
    | "results"
    | "search"
    | "searchError"
    | "searching"
    | "tryAnother"
    | "viewAll",
) {
  const copy = {
    clear: { th: "ล้างคำค้น", en: "Clear" },
    guide: { th: "คู่มือ", en: "Guide" },
    noGuides: { th: "ยังไม่มีคู่มือแนะนำในขณะนี้", en: "No recommended guides are available right now." },
    noResults: { th: "ไม่พบข้อมูลที่ตรงกับคำค้น", en: "No results match your search." },
    product: { th: "สินค้า", en: "Product" },
    recommended: { th: "คู่มือแนะนำ", en: "Recommended guides" },
    results: { th: "ผลการค้นหา", en: "Search results" },
    search: { th: "ค้นหา", en: "Search" },
    searchError: { th: "ค้นหาไม่สำเร็จ กรุณาลองอีกครั้ง", en: "Search is unavailable. Please try again." },
    searching: { th: "กำลังค้นหา", en: "Searching" },
    tryAnother: { th: "ลองใช้คำอื่น หรือเปิดคลังความรู้เพื่อดูหัวข้อทั้งหมด", en: "Try another phrase or open the knowledge base to browse every topic." },
    viewAll: { th: "ดูทั้งหมด", en: "View all" },
  } as const;

  return locale === "th" ? copy[key].th : copy[key].en;
}
