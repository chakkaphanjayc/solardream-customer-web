import { Suspense } from "react";
import { connection } from "next/server";
import SolarEditorialHome from "@/components/home/editorial/solar-editorial-home";
import OAuthCodeBridge from "@/components/auth/OAuthCodeBridge";
import {
  getCachedWebsiteSettings,
  getLocalizedWebsiteSettings,
} from "@/lib/websiteSettings";
import { isLocale } from "@/i18n/locales";
import { JsonLd, type JsonLdObject } from "@/components/seo/JsonLd";
import { getConfiguredPublicSiteUrl } from "@/lib/siteUrl";

import { getCachedPageSeo } from "@/app/actions/seo";
import { getConfiguredFeaturedPortfolioProjects } from "@/lib/portfolioShowcase";
import { toPortfolioProjectListItem } from "@/types/portfolio";
import { getCachedNavigationItems } from "@/lib/public-content-cache";
import { getDiscourseSsoStartUrl } from "@/lib/discourseConnect";
import type { Metadata } from "next";


export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedPageSeo("home");
  return {
    title: seo.seoTitle,
    description: seo.seoDescription,
    keywords: seo.seoKeywords
      ? seo.seoKeywords.split(",").map((k) => k.trim())
      : [],
    openGraph: {
      title: seo.seoTitle,
      description: seo.seoDescription,
      images: seo.seoImage ? [{ url: seo.seoImage }] : [],
    },
  };
}

type LandingPageProps = Readonly<{
  params: Promise<{ locale: string }>;
}>;

export default async function LandingPage({ params }: LandingPageProps) {
  // With Next 16 cacheComponents enabled, connection() is the supported
  // request-time boundary for this homepage instead of dynamic/revalidate.
  await connection();

  const { locale } = await params;
  const activeLocale = isLocale(locale) ? locale : "th";
  const [
    websiteSettings,
    initialShowcaseProjectsData,
    navigationItems,
  ] = await Promise.all([
    getCachedWebsiteSettings(),
    getConfiguredFeaturedPortfolioProjects(10),
    getCachedNavigationItems(activeLocale),
  ]);
  const initialShowcaseProjects = initialShowcaseProjectsData.map(
    toPortfolioProjectListItem,
  );
  const siteUrl = getConfiguredPublicSiteUrl();
  const localBusinessSchema: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: "SolarDream",
    url: `${siteUrl}/${locale}`,
    description:
      "Residential solar planning, installation, and after-sales services for modern homes in Thailand.",
    areaServed: { "@type": "Country", name: "Thailand" },
    serviceType: "Residential solar energy system installation",
  };

  return (
    <div
      data-bagui="home"
      className="bagui-page min-h-dvh"
    >
      <JsonLd data={localBusinessSchema} />
      <Suspense fallback={null}>
        <OAuthCodeBridge />
      </Suspense>
      <SolarEditorialHome
        locale={locale}
        websiteSettings={getLocalizedWebsiteSettings(
          websiteSettings,
          activeLocale,
        )}
        initialShowcaseProjects={initialShowcaseProjects}
        navigationItems={navigationItems}
        forumUrl={getDiscourseSsoStartUrl().toString()}
      />
    </div>
  );
}
