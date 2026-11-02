import { defaultLocale, isLocale } from "@/i18n/locales";
import { getSafeInternalPath } from "@/lib/safeRedirect";

export type LoginDestination = "profile" | "proposals";

export function getLoginRedirect(localeInput: string, destination: LoginDestination) {
  const locale = isLocale(localeInput) ? localeInput : defaultLocale;
  const nextPath = getSafeInternalPath(`/${locale}/${destination}`, `/${locale}`);
  return `/${locale}/login?next=${encodeURIComponent(nextPath)}`;
}
