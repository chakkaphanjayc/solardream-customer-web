export const DEFAULT_COOKIE_CONSENT_SETTINGS = {
  cookieTitle: "Cookie preferences",
  cookieMessage:
    "We use essential cookies to keep SolarDream secure. Analytics and marketing cookies are optional and help us improve the experience.",
  essentialButtonText: "Essential only",
  acceptAllButtonText: "Accept all",
  managePreferencesText: "Manage preferences",
} as const;

export interface CookieConsentSettings {
  cookieTitle: string;
  cookieMessage: string;
  essentialButtonText: string;
  acceptAllButtonText: string;
  managePreferencesText: string;
}

export interface CookieConsentTranslationCopy {
  title: string;
  description: string;
  privacyPolicy: string;
  essentialOnly: string;
  acceptAll: string;
  managePreferences: string;
}

export interface CookieBannerDisplayCopy extends CookieConsentSettings {
  privacyPolicyText: string;
}

export function resolveCookieBannerCopy(
  settings: CookieConsentSettings,
  locale: string,
  copy: CookieConsentTranslationCopy,
): CookieBannerDisplayCopy {
  if (locale !== "th") {
    return { ...settings, privacyPolicyText: copy.privacyPolicy };
  }

  return {
    cookieTitle: settings.cookieTitle === DEFAULT_COOKIE_CONSENT_SETTINGS.cookieTitle
      ? copy.title
      : settings.cookieTitle,
    cookieMessage: settings.cookieMessage === DEFAULT_COOKIE_CONSENT_SETTINGS.cookieMessage
      ? copy.description
      : settings.cookieMessage,
    essentialButtonText: settings.essentialButtonText === DEFAULT_COOKIE_CONSENT_SETTINGS.essentialButtonText
      ? copy.essentialOnly
      : settings.essentialButtonText,
    acceptAllButtonText: settings.acceptAllButtonText === DEFAULT_COOKIE_CONSENT_SETTINGS.acceptAllButtonText
      ? copy.acceptAll
      : settings.acceptAllButtonText,
    managePreferencesText: settings.managePreferencesText === DEFAULT_COOKIE_CONSENT_SETTINGS.managePreferencesText
      ? copy.managePreferences
      : settings.managePreferencesText,
    privacyPolicyText: copy.privacyPolicy,
  };
}
