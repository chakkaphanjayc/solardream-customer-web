export type BlogCategory = "all" | "news" | "solar-tips" | "case-studies";

export type BlogArticleDefinition = {
  slug: string;
  date: string;
  categoryKey: BlogCategory;
  coverImage: string;
  estimatedWords: number;
  isFeatured?: boolean;
};

export const BLOG_ARTICLE_DEFINITIONS: readonly BlogArticleDefinition[] = [
  {
    slug: "homepage-feel-expensive",
    date: "2026-05-14",
    categoryKey: "solar-tips",
    coverImage: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&w=1200&q=80",
    estimatedWords: 850,
    isFeatured: true,
  },
  {
    slug: "brand-system-vs-assets",
    date: "2026-04-28",
    categoryKey: "case-studies",
    coverImage: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=1200&q=80",
    estimatedWords: 680,
    isFeatured: false,
  },
  {
    slug: "pre-launch-checks",
    date: "2026-03-09",
    categoryKey: "solar-tips",
    coverImage: "https://images.unsplash.com/photo-1613665813446-82a78c468a1d?auto=format&fit=crop&w=1200&q=80",
    estimatedWords: 720,
    isFeatured: false,
  },
  {
    slug: "motion-that-clarifies",
    date: "2026-02-18",
    categoryKey: "news",
    coverImage: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
    estimatedWords: 590,
    isFeatured: false,
  },
] as const;

export function getBlogArticleDefinition(slug: string): BlogArticleDefinition | undefined {
  return BLOG_ARTICLE_DEFINITIONS.find((article) => article.slug === slug);
}
