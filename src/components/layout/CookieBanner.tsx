"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { ShieldCheck } from "@/components/ui/icons";
import { usePathname } from "next/navigation";
import CookiePreferencesModal from "./CookiePreferencesModal";
import { readJsonResponse } from "@/lib/readJsonResponse";
import { trackProductEvent } from "@/lib/productAnalytics";
import { buildCookieConsentPayload, buildPrivacySessionHeaders } from "@/lib/privacyConsentClient";

interface CookieBannerProps {
  initialConsentSnapshot: string;
  cookieTitle: string;
  cookieBannerText: string;
  cookieBannerEnabled: boolean;
  essentialButtonText: string;
  acceptAllButtonText: string;
  managePreferencesText: string;
  privacyPolicyText: string;
  privacyPolicyHref: string;
}

type CookiePreferences = {
  essential: true;
  necessary: true;
  analytics: boolean;
  marketing: boolean;
  policyVersion: string;
};

type ConsentApiResponse = {
  success?: boolean;
  error?: string;
  policyVersion?: string;
  reconsentRequired?: boolean;
  records?: Array<{
    consentType?: string;
    policyVersion?: string;
    granted?: boolean;
    preferences?: unknown;
  }>;
};

const defaultPreferences: CookiePreferences = {
  essential: true,
  necessary: true,
  analytics: false,
  marketing: false,
  policyVersion: "",
};

function parsePreferences(snapshot: string): CookiePreferences | null {
  if (!snapshot || snapshot === "server") return null;
  try {
    const normalizedSnapshot = snapshot.startsWith("%7B") ? decodeURIComponent(snapshot) : snapshot;
    if (!normalizedSnapshot.startsWith("{")) {
      return {
        ...defaultPreferences,
        analytics: normalizedSnapshot === "all",
        marketing: normalizedSnapshot === "all",
      };
    }

    const value = JSON.parse(normalizedSnapshot) as Partial<CookiePreferences>;
    if (typeof value.analytics !== "boolean" || typeof value.marketing !== "boolean") return null;
    return {
      essential: true,
      necessary: true,
      analytics: value.analytics,
      marketing: value.marketing,
      policyVersion: typeof value.policyVersion === "string" ? value.policyVersion : "",
    };
  } catch {
    return null;
  }
}

function getPrivacySessionId() {
  const current = localStorage.getItem("solardream_session_id");
  if (current && current.length >= 16) return current;
  const next = `${crypto.randomUUID()}:${Date.now().toString(36)}`;
  localStorage.setItem("solardream_session_id", next);
  return next;
}

function persistPreferences(preferences: CookiePreferences) {
  const newStr = JSON.stringify(preferences);
  const existingStr = localStorage.getItem("solardream_consent_preferences");
  const existingCookieSnapshot = readConsentCookieSnapshot();
  if (existingStr !== newStr) {
    localStorage.setItem("solardream_consent_preferences", newStr);
    localStorage.setItem("solardream_consent", preferences.analytics && preferences.marketing ? "all" : "essential");
    localStorage.setItem("cookie_consent", preferences.analytics && preferences.marketing ? "all" : "essential");
  }
  const expires = new Date(Date.now() + 365 * 864e5).toUTCString();
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `solardream_consent=${encodeURIComponent(newStr)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
  if (existingStr === newStr && existingCookieSnapshot === newStr) return;
  window.dispatchEvent(new Event("solardream_consent_updated"));
}

function preferencesFromRecord(value: unknown, policyVersion: string): CookiePreferences | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const preferences = value as Record<string, unknown>;
  if (typeof preferences.analytics !== "boolean" || typeof preferences.marketing !== "boolean") return null;
  return {
    essential: true,
    necessary: true,
    analytics: preferences.analytics,
    marketing: preferences.marketing,
    policyVersion,
  };
}

function readConsentCookieSnapshot() {
  if (typeof window === "undefined") return "server";
  const consentCookie = document.cookie
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("solardream_consent="))
    ?.slice("solardream_consent=".length);

  let cookieSnapshot = consentCookie || "";
  if (cookieSnapshot.startsWith("%7B")) {
    try {
      cookieSnapshot = decodeURIComponent(cookieSnapshot);
    } catch {
      cookieSnapshot = "";
    }
  }

  return cookieSnapshot;
}

function readConsentSnapshot() {
  if (typeof window === "undefined") return "server";
  return (
    localStorage.getItem("solardream_consent_preferences") ||
    localStorage.getItem("cookie_consent") ||
    localStorage.getItem("solardream_consent") ||
    readConsentCookieSnapshot()
  );
}

function subscribeConsentStore(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("solardream_consent_updated", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("solardream_consent_updated", callback);
  };
}

const subscribeMounted = () => () => undefined;
const getMountedSnapshot = () => true;
const getMountedServerSnapshot = () => false;

export default function CookieBanner({
  initialConsentSnapshot,
  cookieTitle = "Cookie Preferences",
  cookieBannerText = "We use cookies to improve your experience and analyze site traffic.",
  cookieBannerEnabled = true,
  essentialButtonText,
  acceptAllButtonText,
  managePreferencesText,
  privacyPolicyText,
  privacyPolicyHref,
}: CookieBannerProps) {
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [policyVersion, setPolicyVersion] = useState("");
  const [forceReconsent, setForceReconsent] = useState(false);
  const hasSyncedRef = useRef(false);
  const hasUserSavedConsentRef = useRef(false);
  const pathname = usePathname();
  const consentSnapshot = useSyncExternalStore(
    subscribeConsentStore,
    readConsentSnapshot,
    () => initialConsentSnapshot || "server",
  );
  const cookieConsentSnapshot = useSyncExternalStore(
    subscribeConsentStore,
    readConsentCookieSnapshot,
    () => initialConsentSnapshot || "server",
  );

  const preferences = useMemo(() => {
    return parsePreferences(consentSnapshot) || defaultPreferences;
  }, [consentSnapshot]);

  const hasExplicitConsent = Boolean(
    cookieConsentSnapshot &&
    cookieConsentSnapshot !== "server" &&
    parsePreferences(cookieConsentSnapshot) !== null
  );

  useEffect(() => {
    if (!mounted || hasSyncedRef.current) return;
    hasSyncedRef.current = true;

    let isMounted = true;
    const sessionId = getPrivacySessionId();

    async function syncRemotePreferences() {
      try {
        const response = await fetch("/api/privacy/consent", {
          headers: buildPrivacySessionHeaders(sessionId),
        });
        const payload = await readJsonResponse<ConsentApiResponse>(response);
        if (!isMounted || hasUserSavedConsentRef.current || !response.ok || !payload?.success) return;

        const serverVersion = payload.policyVersion || "";
        if (serverVersion) {
          setPolicyVersion(serverVersion);
        }

        if (payload.reconsentRequired) {
          setForceReconsent(true);
          return;
        }

        const latestRecord = payload.records?.find((record) => record.consentType === "COOKIE");
        const remotePreferences = preferencesFromRecord(
          latestRecord?.preferences,
          latestRecord?.policyVersion || serverVersion
        );

        if (remotePreferences) {
          persistPreferences(remotePreferences);
        }
      } catch {
        // Fail-open for client-side storage
      }
    }

    void syncRemotePreferences();
    return () => {
      isMounted = false;
    };
  }, [mounted]);

  const isOpen =
    cookieBannerEnabled &&
    (!hasExplicitConsent || forceReconsent) &&
    !pathname.includes("/admin");

  const saveConsent = async (
    prefs: { essential: boolean; analytics: boolean; marketing: boolean },
    source: "banner" | "settings"
  ) => {
    hasUserSavedConsentRef.current = true;
    setIsSaving(true);
    const sessionId = getPrivacySessionId();
    let savedVersion = policyVersion;

    try {
      const response = await fetch("/api/privacy/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(buildCookieConsentPayload({
          sessionId,
          source,
          analytics: prefs.analytics,
          marketing: prefs.marketing,
          policyVersion: savedVersion,
        })),
      });
      const payload = await readJsonResponse<ConsentApiResponse>(response);
      if (response.ok && payload?.success && payload.policyVersion) {
        savedVersion = payload.policyVersion;
      }
    } catch {
      // The local choice remains authoritative for client-side tracking when sync is unavailable.
    } finally {
      const nextPreferences: CookiePreferences = {
        essential: true,
        necessary: true,
        analytics: prefs.analytics,
        marketing: prefs.marketing,
        policyVersion: savedVersion || "unverified",
      };
      persistPreferences(nextPreferences);
      void trackProductEvent("consent_updated", {
        analytics_enabled: nextPreferences.analytics,
        marketing_enabled: nextPreferences.marketing,
        consent_surface: source,
      });
      setPolicyVersion(savedVersion);
      setForceReconsent(false);
      setIsSaving(false);
      setIsPreferencesOpen(false);
    }
  };

  const handleAcceptAll = () => {
    void saveConsent({ essential: true, analytics: true, marketing: true }, "banner");
  };

  const handleDeclineAll = () => {
    void saveConsent({ essential: true, analytics: false, marketing: false }, "banner");
  };

  return (
    <>
      {isOpen && (
        <div
          role="region"
          aria-label={cookieTitle}
          data-bagui="cookie-banner"
          data-solar-surface="atelier"
          className="solar-cookie-banner layer-content relative"
        >
          <div className="grid gap-3.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-6">
            <div className="flex min-w-0 items-start gap-3.5">
              <div
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#CBC7BE] bg-[#DCE8F5] text-[#4F7FA8]"
              >
                <ShieldCheck className="size-5 text-[#4F7FA8]" />
              </div>
              <div className="min-w-0 flex-1 space-y-1">
                <div className="solar-cookie-banner__heading-row flex min-w-0 items-center justify-between gap-2">
                  <h2 className="min-w-0 font-sans text-sm font-bold text-[#2E2C27]">
                    {cookieTitle}
                  </h2>
                  <div className="solar-cookie-banner__secondary-actions flex shrink-0 items-center gap-1">
                    <Link
                      href={privacyPolicyHref}
                      className="inline-flex min-h-11 shrink-0 items-center truncate px-1 font-sans text-[11px] text-[#4E4B44] underline underline-offset-4 transition-colors hover:text-[#3E6685]"
                    >
                      {privacyPolicyText}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setIsPreferencesOpen(true)}
                      className="solar-cookie-manage inline-flex min-h-11 shrink-0 cursor-pointer items-center whitespace-nowrap border-none bg-transparent px-1 py-0 text-[11px] font-sans underline underline-offset-4 transition-colors"
                    >
                      {managePreferencesText}
                    </button>
                  </div>
                </div>
                <p className="font-sans text-xs font-normal leading-relaxed text-[#4E4B44]">
                  {cookieBannerText}
                </p>
              </div>
            </div>

            <div className="solar-cookie-banner__choices flex flex-col gap-2 border-t border-[#F7F6F3] pt-3 sm:flex-row sm:items-center sm:justify-end sm:border-t-0 sm:pt-0">
              <button
                type="button"
                onClick={handleDeclineAll}
                disabled={isSaving}
                className="solar-cookie-essential inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-4 py-2 text-xs font-bold transition-colors active:scale-95 disabled:opacity-50"
              >
                {essentialButtonText}
              </button>
              <button
                type="button"
                onClick={handleAcceptAll}
                disabled={isSaving}
                className="solar-cookie-accept inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 py-2 text-xs font-bold transition-all active:scale-95 disabled:opacity-50"
              >
                {acceptAllButtonText}
              </button>
            </div>
          </div>
        </div>
      )}

      <CookiePreferencesModal
        key={`${isPreferencesOpen}:${preferences.analytics}:${preferences.marketing}`}
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        onSave={(nextPreferences) => saveConsent(nextPreferences, "settings")}
        initialPreferences={preferences}
        isSaving={isSaving}
      />
    </>
  );
}
