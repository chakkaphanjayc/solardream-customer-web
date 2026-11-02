import assert from "node:assert/strict";
import test from "node:test";

import { getBlogArticleListing } from "./blogArticles";

const articles = [
  { slug: "featured-tip", categoryKey: "solar-tips" as const, isFeatured: true },
  { slug: "another-tip", categoryKey: "solar-tips" as const, isFeatured: false },
  { slug: "case-study", categoryKey: "case-studies" as const, isFeatured: false },
  { slug: "news", categoryKey: "news" as const, isFeatured: false },
];

test("shows a featured article once and counts each matching story once", () => {
  const listing = getBlogArticleListing(articles, "all");

  assert.equal(listing.featuredArticle?.slug, "featured-tip");
  assert.deepEqual(listing.gridArticles.map((article) => article.slug), [
    "another-tip",
    "case-study",
    "news",
  ]);
  assert.equal(listing.articleCount, 4);
});

test("keeps the featured article within its category and hides it outside its category", () => {
  const solarTips = getBlogArticleListing(articles, "solar-tips");
  const caseStudies = getBlogArticleListing(articles, "case-studies");

  assert.equal(solarTips.featuredArticle?.slug, "featured-tip");
  assert.deepEqual(solarTips.gridArticles.map((article) => article.slug), ["another-tip"]);
  assert.equal(solarTips.articleCount, 2);
  assert.equal(caseStudies.featuredArticle, undefined);
  assert.deepEqual(caseStudies.gridArticles.map((article) => article.slug), ["case-study"]);
  assert.equal(caseStudies.articleCount, 1);
});

test("falls back to the first article when none is marked as featured", () => {
  const unfeaturedArticles = articles.map(({ slug, categoryKey }) => ({
    slug,
    categoryKey,
  }));
  const listing = getBlogArticleListing(unfeaturedArticles, "all");

  assert.equal(listing.featuredArticle?.slug, "featured-tip");
  assert.equal(listing.gridArticles.length, 3);
  assert.equal(listing.articleCount, 4);
});
