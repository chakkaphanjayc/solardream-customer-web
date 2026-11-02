export type BlogCategory = "all" | "news" | "solar-tips" | "case-studies";

export type BlogArticleDefinition = {
  slug: string;
  date: string;
  categoryKey: BlogCategory;
  coverImage: string;
  estimatedWords: number;
  isFeatured?: boolean;
};

export function getBlogArticleListing<T extends Pick<BlogArticleDefinition, "slug" | "categoryKey" | "isFeatured">>(
  articles: readonly T[],
  activeCategory: BlogCategory,
) {
  const featuredArticle = articles.find((article) => article.isFeatured) ?? articles[0];
  const matchingArticles = articles.filter((article) =>
    activeCategory === "all" || article.categoryKey === activeCategory,
  );
  const visibleFeaturedArticle = matchingArticles.find(
    (article) => article.slug === featuredArticle?.slug,
  );

  return {
    featuredArticle: visibleFeaturedArticle,
    gridArticles: matchingArticles.filter(
      (article) => article.slug !== visibleFeaturedArticle?.slug,
    ),
    articleCount: matchingArticles.length,
  };
}

export const BLOG_ARTICLE_DEFINITIONS: readonly BlogArticleDefinition[] = [
  {
    slug: "homepage-feel-expensive",
    date: "2026-05-14",
    categoryKey: "solar-tips",
    coverImage: "/asset/home-editorial/hero-rooftop.webp",
    estimatedWords: 850,
    isFeatured: true,
  },
  {
    slug: "brand-system-vs-assets",
    date: "2026-04-28",
    categoryKey: "case-studies",
    coverImage: "/asset/home-editorial/lifestyle-home.webp",
    estimatedWords: 680,
    isFeatured: false,
  },
  {
    slug: "pre-launch-checks",
    date: "2026-03-09",
    categoryKey: "solar-tips",
    coverImage: "/asset/home-editorial/roof-detail.webp",
    estimatedWords: 720,
    isFeatured: false,
  },
  {
    slug: "motion-that-clarifies",
    date: "2026-02-18",
    categoryKey: "news",
    coverImage: "/asset/home-editorial/roof-before.webp",
    estimatedWords: 590,
    isFeatured: false,
  },
] as const;

export function getBlogArticleDefinition(slug: string): BlogArticleDefinition | undefined {
  return BLOG_ARTICLE_DEFINITIONS.find((article) => article.slug === slug);
}
