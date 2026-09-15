import { NextResponse, type NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/locales";
import {
  getConfiguredAdminSiteUrl,
  getHostname,
  getRequestHostHeader,
  isConfiguredPublicHost,
  isLocalHostname,
} from "@/lib/siteUrl";
import { updateSession } from "@/utils/supabase/middleware";

const intlMiddleware = createMiddleware(routing);
const disabledStorefrontRoutes = new Set(["products"]);

function requestHost(request: NextRequest) {
  return getHostname(getRequestHostHeader(request.headers, request.nextUrl.host));
}

function isLocalRequest(request: NextRequest) {
  return isLocalHostname(requestHost(request));
}

function rejectNonCustomerHost(request: NextRequest) {
  if (isLocalRequest(request) || isConfiguredPublicHost(requestHost(request))) return null;

  return new NextResponse("This host belongs to the SolarDream staff application.", {
    status: 421,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

function localeFromRequest(request: NextRequest) {
  const value = request.cookies.get("NEXT_LOCALE")?.value;
  return routing.locales.includes(value as (typeof routing.locales)[number])
    ? value as (typeof routing.locales)[number]
    : routing.defaultLocale;
}

function redirectLegacyTechPortal(request: NextRequest) {
  if (request.nextUrl.pathname !== "/tech-portal" && request.nextUrl.pathname !== "/tech-portal/") {
    return null;
  }

  const target = new URL(getConfiguredAdminSiteUrl());
  target.pathname = `/${localeFromRequest(request)}/tech-portal`;
  target.search = request.nextUrl.search;
  return NextResponse.redirect(target, 307);
}

/**
 * Older DiscourseConnect configurations may still point at the public site
 * root. Keep that signed request compatible while the callback setting is
 * migrated to the explicit Customer endpoint.
 */
function redirectLegacyDiscourseConnectRoot(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  if (pathname !== "/" || !searchParams.has("sso") || !searchParams.has("sig")) return null;

  const target = request.nextUrl.clone();
  target.pathname = "/api/auth/discourse-sso";
  const response = NextResponse.redirect(target, 307);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirectDisabledStorefrontRoute(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.includes(".")) return null;

  const segments = pathname.split("/").filter(Boolean);
  const locale = routing.locales.includes(segments[0] as (typeof routing.locales)[number]) ? segments[0] : null;
  const routeRoot = locale ? segments[1] : segments[0];
  if (!routeRoot || !disabledStorefrontRoutes.has(routeRoot)) return null;

  const target = request.nextUrl.clone();
  target.pathname = `/${locale ?? routing.defaultLocale}/wizard`;
  target.search = "";
  return NextResponse.redirect(target, 302);
}

function redirectOAuthCode(request: NextRequest) {
  const target = request.nextUrl.clone();
  const code = target.searchParams.get("code");
  if (!code || target.pathname.includes("/auth/callback")) return null;

  const segments = target.pathname.split("/").filter(Boolean);
  const locale = routing.locales.includes(segments[0] as (typeof routing.locales)[number])
    ? segments[0]
    : routing.defaultLocale;
  const isLocaleRoot = segments.length === 0 || (segments.length === 1 && segments[0] === locale);
  if (!isLocaleRoot) return null;

  target.pathname = `/${locale}/auth/callback`;
  return NextResponse.redirect(target, 307);
}

export async function proxy(request: NextRequest) {
  const hostRejection = rejectNonCustomerHost(request);
  if (hostRejection) return hostRejection;

  if (["/robots.txt", "/sitemap.xml", "/manifest.webmanifest"].includes(request.nextUrl.pathname)) {
    return NextResponse.next();
  }

  const legacyDiscourseConnectRedirect = redirectLegacyDiscourseConnectRoot(request);
  if (legacyDiscourseConnectRedirect) return legacyDiscourseConnectRedirect;

  const techRedirect = redirectLegacyTechPortal(request);
  if (techRedirect) return techRedirect;

  if (request.nextUrl.pathname.startsWith("/proposals/") || request.nextUrl.pathname.startsWith("/verify/")) {
    return NextResponse.next();
  }

  if (request.nextUrl.pathname.includes("/auth/callback")) {
    return intlMiddleware(request);
  }

  const oauthRedirect = redirectOAuthCode(request);
  if (oauthRedirect) return oauthRedirect;

  const storefrontRedirect = redirectDisabledStorefrontRoute(request);
  if (storefrontRedirect) return storefrontRedirect;

  const intlResponse = intlMiddleware(request);
  if (intlResponse.status >= 300 && intlResponse.status < 400) return intlResponse;

  const hasAuthCookie = request.cookies.getAll().some((cookie) =>
    cookie.name.includes("auth-token") || cookie.name.includes("sb-") || cookie.name.includes("supabase"),
  );

  return hasAuthCookie ? updateSession(request, intlResponse) : intlResponse;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
    "/",
    "/(th|en|ja|zh|ko|vi)/:path*",
  ],
};
