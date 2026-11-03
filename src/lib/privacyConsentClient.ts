export type CookieConsentSource = "banner" | "settings";

export type CookieConsentPayload = {
  sessionId: string;
  consentType: "COOKIE";
  granted: true;
  policyVersion?: string;
  source: CookieConsentSource;
  preferences: {
    necessary: true;
    functional: false;
    analytics: boolean;
    marketing: boolean;
  };
};

export function buildCookieConsentPayload(input: {
  sessionId: string;
  source: CookieConsentSource;
  analytics: boolean;
  marketing: boolean;
  policyVersion?: string;
}): CookieConsentPayload {
  const policyVersion = input.policyVersion?.trim();

  return {
    sessionId: input.sessionId,
    consentType: "COOKIE",
    granted: true,
    ...(policyVersion ? { policyVersion } : {}),
    source: input.source,
    preferences: {
      necessary: true,
      functional: false,
      analytics: input.analytics,
      marketing: input.marketing,
    },
  };
}

export function buildPrivacySessionHeaders(sessionId: string): HeadersInit {
  return {
    Accept: "application/json",
    "x-privacy-session": sessionId,
  };
}
