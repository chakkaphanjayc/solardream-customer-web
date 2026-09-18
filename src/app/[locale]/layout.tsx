import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
// Keep the customer-facing type system intentionally simple: Roboto carries
// the Material You rhythm while Noto Sans Thai keeps Thai copy readable.
import { Noto_Sans_Thai, Geist_Mono, Roboto } from "next/font/google";
import AuthProvider from "@/components/providers/AuthProvider";
import ClarityProvider from "@/components/providers/ClarityProvider";
import RuntimeMessageRefresh from "@/components/providers/RuntimeMessageRefresh";
import { SupportedLocalesProvider } from "@/components/providers/SupportedLocalesProvider";
import SiteChrome from "@/components/layout/SiteChrome";
import LayoutContent from "@/components/layout/LayoutContent";
import RouteAwareAnalytics from "@/components/providers/RouteAwareAnalytics";
import { getCachedComplianceSettings, getCachedGlobalBanner } from "@/lib/layout-data";
import { getCachedWebsiteSettings, getLocalizedWebsiteSettings } from "@/lib/websiteSettings";
import {
  getCachedAnalyticsConfig,
  getCachedLocalizationConfig,
  getCachedNavigationItems,
} from "@/lib/public-content-cache";
import { isLocale, type Locale } from "@/i18n/locales";
import { getDiscourseSsoStartUrl } from "@/lib/discourseConnect";

const isCloudflareBuild = process.env.SOLARDREAM_CLOUDFLARE_BUILD === "1";

// The locale shell resolves editable SEO settings and locale-aware URL metadata
// at request time. Keep that intentional runtime boundary explicit under
// Next.js Cache Components so the metadata stream is not reported as a
// blocking prerender error in development.
export const instant = false;

// Use next-intl to pass translations into nested Client Components.
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { getCachedGlobalSeo } from "@/app/actions/seo";
import {
  getConfiguredPublicSiteUrl,
} from "@/lib/siteUrl";

import SourceTrackingProvider from "@/components/providers/SourceTrackingProvider";
import LayerProvider from "@/components/providers/LayerProvider";
import LiquidGlassProvider from "@/components/providers/LiquidGlassProvider";

// Configure the primary UI typeface used across the customer journey.
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

// Configure the Thai companion font.
const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-sans-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const seo = await getCachedGlobalSeo();
  const baseUrl = getConfiguredPublicSiteUrl();

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: seo.defaultSeoTitle,
      template: `%s | ${seo.defaultSeoTitle.split("|")[0].trim()}`,
    },
    description: seo.defaultSeoDescription,
    keywords: seo.defaultKeywords ? seo.defaultKeywords.split(",").map((k) => k.trim()) : [],
    icons: {
      icon: [{ url: "/asset/sd-logo.png", type: "image/png", sizes: "1254x1254" }],
      apple: [{ url: "/asset/sd-logo.png", type: "image/png", sizes: "1254x1254" }],
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        th: "/th",
        en: "/en",
      },
    },
    openGraph: {
      title: seo.defaultSeoTitle,
      description: seo.defaultSeoDescription,
      siteName: "SolarDream",
      locale: locale === "en" ? "en_US" : "th_TH",
      type: "website",
      images: seo.defaultOgImage ? [{ url: seo.defaultOgImage, width: 1200, height: 630, alt: "SolarDream" }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.defaultSeoTitle,
      description: seo.defaultSeoDescription,
      images: seo.defaultOgImage ? [seo.defaultOgImage] : [],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

type LocaleRuntimeLayoutProps = {
  activeLocale: Locale;
  children: React.ReactNode;
};

function LocaleLayoutFallback() {
  return (
    <div className="min-h-dvh bg-[var(--sd-page)]" aria-hidden="true" />
  );
}

async function LocaleRuntimeLayout({ activeLocale, children }: LocaleRuntimeLayoutProps) {
  // next-intl can resolve the locale from this cached value without reading
  // request headers while the shared locale layout is streaming.
  setRequestLocale(activeLocale);

  const [allMessages, activeBanner, compliance, analyticsConfig, websiteSettings, localizationConfig, navigationItems] = await Promise.all([
    getMessages({ locale: activeLocale }),
    getCachedGlobalBanner(),
    getCachedComplianceSettings(),
    getCachedAnalyticsConfig(),
    getCachedWebsiteSettings(),
    getCachedLocalizationConfig(),
    getCachedNavigationItems(activeLocale),
  ]);

  // Client islands across the public site and operations console use their own
  // namespaces. Supplying the complete locale catalog prevents a translated
  // route from silently falling back because its namespace was filtered out.
  const messages = allMessages;

  return (
    <RouteAwareAnalytics config={analyticsConfig}>
      <SupportedLocalesProvider supportedLocales={localizationConfig.supportedLocales}>
        <NextIntlClientProvider messages={messages}>
          <LayerProvider>
            <Suspense fallback={<LocaleLayoutFallback />}>
              <SourceTrackingProvider />
              <SiteChrome
                initialGlobalBanner={activeBanner}
                complianceSettings={compliance ?? null}
                forumUrl={getDiscourseSsoStartUrl().toString()}
                websiteSettings={getLocalizedWebsiteSettings(websiteSettings, activeLocale)}
                navigationItems={navigationItems}
              >
                <LayoutContent>{children}</LayoutContent>
              </SiteChrome>
            </Suspense>
          </LayerProvider>
        </NextIntlClientProvider>
      </SupportedLocalesProvider>
    </RouteAwareAnalytics>
  );
}

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  // Keep locale routes request-time rendered when the Cloudflare build uses
  // the legacy Next cache model. This prevents build-time data access while
  // retaining the same runtime data boundary used by Cache Components.
  if (isCloudflareBuild) {
    await connection();
  }

  const { locale } = await params;
  const activeLocale = isLocale(locale) ? locale : "th";

  return (
    <html lang={locale} data-scroll-behavior="smooth" suppressHydrationWarning>
      <body
        data-bagui="app-shell"
        className={`${notoSansThai.variable} ${geistMono.variable} ${roboto.variable} antialiased bg-[var(--sd-page)] text-[var(--sd-ink)] selection:bg-[var(--sd-selected)] selection:text-[var(--sd-navy-900)]`}
        style={{
          fontFamily: `var(--font-roboto), var(--font-noto-sans-thai), sans-serif`,
        }}
        suppressHydrationWarning
      >
        <div className="organic-paper-grain" aria-hidden="true" />
        <ClarityProvider />
        <RuntimeMessageRefresh />
        <AuthProvider>
          <Suspense fallback={<LocaleLayoutFallback />}>
            <LiquidGlassProvider>
              <Suspense fallback={<LocaleLayoutFallback />}>
                <LocaleRuntimeLayout activeLocale={activeLocale}>
                  {children}
                </LocaleRuntimeLayout>
              </Suspense>
            </LiquidGlassProvider>
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
