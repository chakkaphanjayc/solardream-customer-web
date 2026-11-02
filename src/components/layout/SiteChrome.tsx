"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";
import type { WebsiteSettings } from "@/lib/websiteSettingsTypes";
import { resolveCookieBannerCopy } from "@/lib/cookieConsentPresentation";
import { getCustomerRoutePolicy } from "@/lib/customerRoutePolicy";
import type { GlobalBannerData } from "../GlobalBanner";

// These components are hidden on admin, visualizer, and private access routes.
// Keep them in route-level chunks so those surfaces do not pay for customer
// navigation, banners, or consent UI.
const Navbar = dynamic(() => import("./Navbar"));
const Footer = dynamic(() => import("./Footer"));
const GlobalBanner = dynamic(() => import("../GlobalBanner"));
const CookieBanner = dynamic(() => import("./CookieBanner"));

// Keep the configurator drawer out of routes that do not expose customer
// tools. The drawer remains code-split from the shared shell.
const GlobalSummaryDrawer = dynamic(() => import("./GlobalSummaryDrawer"), {
  ssr: false,
});

type SiteChromeProps = {
  initialGlobalBanner: GlobalBannerData | null;
  forumUrl: string;
  complianceSettings: {
    cookieBannerText: string;
    cookieBannerEnabled: boolean;
  } | null;
  websiteSettings: WebsiteSettings;
  navigationItems: Array<{
    id: string;
    label: string;
    url: string;
    children?: Array<{ id: string; label: string; url: string }>;
  }>;
};

export default function SiteChrome({
  initialGlobalBanner,
  forumUrl,
  complianceSettings,
  websiteSettings,
  navigationItems,
  children,
}: SiteChromeProps & { children: React.ReactNode }) {
  const pathname = usePathname();
  const routePolicy = getCustomerRoutePolicy(pathname);
  const locale = routePolicy.locale ?? "en";
  const cookieT = useTranslations("CookiePreferences");
  const cookieBannerCopy = resolveCookieBannerCopy(
    websiteSettings.cookieConsent,
    locale,
    {
      title: cookieT("title"),
      description: cookieT("bannerDescription"),
      privacyPolicy: cookieT("bannerPrivacyPolicy"),
      essentialOnly: cookieT("essentialOnly"),
      acceptAll: cookieT("acceptAll"),
      managePreferences: cookieT("managePreferences"),
    },
  );
  useEffect(() => {
    document.body.dataset.solarUi = routePolicy.isAdmin
      ? "operations"
      : "customer";
  }, [routePolicy.isAdmin]);
  const skipToContentLabel =
    routePolicy.locale === "th"
      ? "ข้ามไปยังเนื้อหาหลัก"
      : "Skip to main content";
  const isAlwaysLocked = routePolicy.lockViewport;

  return (
    <div
      suppressHydrationWarning
      data-solar-ui={routePolicy.isAdmin ? "operations" : "customer"}
      data-customer-design={routePolicy.isAdmin ? undefined : "solar-atelier"}
      className={cn(
        "bagui-page sd-site-shell relative isolate flex w-full min-w-0 flex-col min-h-dvh",
        isAlwaysLocked && "h-dvh max-h-dvh overflow-hidden",
      )}
    >
      <a
        href="#main-content"
        className="layer-tooltip fixed left-3 top-3 -translate-y-20 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-transform duration-200 ease-expo-out focus:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        {skipToContentLabel}
      </a>
      {routePolicy.showGlobalBanner && (
        <GlobalBanner initialData={initialGlobalBanner} />
      )}
      {routePolicy.showNavigation && (
        <div
          data-site-header
          className="layer-chrome pointer-events-none relative z-[var(--layer-chrome)]"
        >
          <div className="pointer-events-auto">
            <Navbar forumUrl={forumUrl} navigationItems={navigationItems} />
          </div>
        </div>
      )}

      <main
        id="main-content"
        tabIndex={-1}
        data-solar-surface={
          !routePolicy.isAdmin &&
          !routePolicy.isHome &&
          !routePolicy.isVisualizer &&
          !routePolicy.isTechPortal &&
          routePolicy.family !== "external-access"
            ? "atelier"
            : undefined
        }
        data-solar-layout="customer-main"
        className={cn(
          "layer-content relative flex w-full min-w-0 max-w-full flex-col",
          isAlwaysLocked ? "min-h-0 flex-1" : "flex-grow",
        )}
      >
        {children}
      </main>

      {routePolicy.showFooter && (
        <div className="layer-content relative">
          <Footer settings={websiteSettings} />
        </div>
      )}
      {routePolicy.showCustomerTools && <GlobalSummaryDrawer />}
      {routePolicy.showCookieBanner && (
        <CookieBanner
          cookieTitle={cookieBannerCopy.cookieTitle}
          cookieBannerText={
            cookieBannerCopy.cookieMessage ||
            complianceSettings?.cookieBannerText ||
            "เราใช้คุกกี้เพื่อพัฒนาประสิทธิภาพ และประสบการณ์ที่ดีในการใช้เว็บไซต์ของคุณ ทั้งนี้ ท่านสามารถศึกษารายละเอียดการใช้คุกกี้ได้ที่ นโยบายความเป็นส่วนตัว"
          }
          cookieBannerEnabled={complianceSettings?.cookieBannerEnabled ?? true}
          essentialButtonText={cookieBannerCopy.essentialButtonText}
          acceptAllButtonText={cookieBannerCopy.acceptAllButtonText}
          managePreferencesText={cookieBannerCopy.managePreferencesText}
          privacyPolicyText={cookieBannerCopy.privacyPolicyText}
          privacyPolicyHref={`/${locale}/privacy`}
        />
      )}
      <Toaster position="top-center" richColors />
    </div>
  );
}
