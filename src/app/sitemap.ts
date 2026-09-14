import type { MetadataRoute } from "next";

import { locales } from "@/i18n/locales";
import { getConfiguredPublicSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getConfiguredPublicSiteUrl();
  const lastModified = new Date();

  return locales.map((locale) => ({
    url: `${siteUrl}/${locale}`,
    lastModified,
    changeFrequency: "weekly" as const,
    priority: locale === "th" ? 1 : 0.8,
  }));
}
