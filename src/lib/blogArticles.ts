export const BLOG_ARTICLE_DEFINITIONS = [
  { slug: "homepage-feel-expensive", date: "2026-05-14" },
  { slug: "brand-system-vs-assets", date: "2026-04-28" },
  { slug: "pre-launch-checks", date: "2026-03-09" },
  { slug: "motion-that-clarifies", date: "2026-02-18" },
] as const;

export type BlogArticleDefinition = (typeof BLOG_ARTICLE_DEFINITIONS)[number];

export function getBlogArticleDefinition(slug: string): BlogArticleDefinition | undefined {
  return BLOG_ARTICLE_DEFINITIONS.find((article) => article.slug === slug);
}
