"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import InvisibleTurnstile, {
  type InvisibleTurnstileHandle,
} from "@/components/security/InvisibleTurnstile";
import { GsapSpinner } from "@/components/ui/GsapMotion";
import { readJsonResponse } from "@/lib/readJsonResponse";
import { useTranslations } from "next-intl";

export default function PortalSessionExchange({
  locale,
  proposalId,
}: {
  locale: string;
  proposalId: string;
}) {
  const t = useTranslations("PortalSessionExchange");
  const router = useRouter();
  const [error, setError] = useState("");
  const [isMissingToken, setIsMissingToken] = useState(false);
  const [isExpiredLink, setIsExpiredLink] = useState(false);
  const [trackingReference, setTrackingReference] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryComplete, setRecoveryComplete] = useState(false);
  const [recoveryError, setRecoveryError] = useState("");
  const [trackPassword, setTrackPassword] = useState("");
  const [trackPasswordBusy, setTrackPasswordBusy] = useState(false);
  const [trackPasswordError, setTrackPasswordError] = useState("");
  const turnstileRef = useRef<InvisibleTurnstileHandle>(null);
  const recoveryTurnstileRef = useRef<InvisibleTurnstileHandle>(null);

  // The browser URL is unavailable during SSR; hydrate this URL-derived state on the client.
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isExpired = new URLSearchParams(window.location.search).get("access") === "expired";
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsExpiredLink(isExpired);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token =
      new URLSearchParams(window.location.search).get("token") ||
      new URLSearchParams(window.location.hash.slice(1)).get("token") ||
      "";
    if (!token) {
      queueMicrotask(() => {
        setIsMissingToken(true);
        setError(isExpiredLink ? "This secure portal link has expired." : t("missingToken"));
      });
      return;
    }

    const abortController = new AbortController();
    const exchangeSession = async () => {
      try {
        const getTurnstileTokenWithTimeout = async (): Promise<string | undefined> => {
          if (!turnstileRef.current) return undefined;
          return Promise.race([
            turnstileRef.current.getToken().catch((err) => {
              console.warn("[Portal Session Exchange] Turnstile getToken error:", err);
              return undefined;
            }),
            new Promise<undefined>((resolve) =>
              setTimeout(() => {
                console.warn("[Portal Session Exchange] Turnstile load timeout. Falling back.");
                resolve(undefined);
              }, 5000)
            ),
          ]);
        };

        const turnstileToken = await getTurnstileTokenWithTimeout();
        const response = await fetch("/api/proposals/portal-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ proposalId, token, turnstileToken }),
          signal: abortController.signal,
        });
        turnstileRef.current?.reset();
        const payload = await readJsonResponse<{ success?: boolean; error?: string }>(response);
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || t("accessError"));
        }
        window.history.replaceState(null, "", window.location.pathname);
        router.replace(`/${locale}/proposals/${proposalId}`);
        router.refresh();
      } catch (reason) {
        if (abortController.signal.aborted) return;
        setError(reason instanceof Error ? reason.message : t("accessError"));
      }
    };

    void exchangeSession();
    return () => abortController.abort();
  }, [isExpiredLink, locale, proposalId, router, t]);

  const handleTrackPasswordAccess = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trackPassword.trim()) return;
    setTrackPasswordBusy(true);
    setTrackPasswordError("");
    try {
      const turnstileToken = await turnstileRef.current?.getToken().catch(() => undefined);
      const response = await fetch("/api/proposals/portal-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId, trackNumber: trackPassword.trim(), turnstileToken }),
      });
      const payload = await readJsonResponse<{ success?: boolean; error?: string }>(response);
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || "Invalid Track Request Number or Access Key.");
      }
      router.replace(`/${locale}/proposals/${proposalId}`);
      router.refresh();
    } catch (reason) {
      setTrackPasswordError(reason instanceof Error ? reason.message : "Access denied. Please check your Track Request Number.");
    } finally {
      setTrackPasswordBusy(false);
    }
  };

  const requestReplacementLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trackingReference.trim() || !email.trim()) return;
    setRecoveryBusy(true);
    setRecoveryError("");
    try {
      const turnstileToken = await recoveryTurnstileRef.current?.getToken();
      if (!turnstileToken) throw new Error("Complete the security check before requesting access.");
      const response = await fetch("/api/track/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingRef: trackingReference.trim(),
          email: email.trim(),
          locale,
          turnstileToken,
        }),
      });
      if (!response.ok) throw new Error("Unable to request a replacement link. Please try again.");
      setRecoveryComplete(true);
      recoveryTurnstileRef.current?.reset();
    } catch (reason) {
      setRecoveryError(reason instanceof Error ? reason.message : "Unable to request a replacement link.");
    } finally {
      setRecoveryBusy(false);
    }
  };

  return (
    <main className="grid min-h-dvh place-items-center bg-solar-light px-4 text-slate-950">
      <section className="w-full max-w-lg rounded-xl border border-slate-200/70 bg-white p-6 text-center shadow-sm" aria-live="polite">
        {error ? (
          <>
            <h1 className="text-xl font-black">{t("unavailable")}</h1>
            <p className="mt-3 text-sm font-semibold leading-6 text-rose-700">{error}</p>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-left shadow-2xs">
              <h2 className="text-sm font-extrabold text-slate-900">Access with Track Request Number</h2>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                Enter your Track Request Number or Reference to access your proposal portal directly.
              </p>
              <form onSubmit={(event) => void handleTrackPasswordAccess(event)} className="mt-4 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Track Request Number / Password
                  </label>
                  <input
                    type="text"
                    value={trackPassword}
                    onChange={(e) => setTrackPassword(e.target.value)}
                    placeholder="e.g. TRK-10023 or SD-QT-XXXXXX"
                    required
                    className="w-full min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-900 shadow-2xs focus:border-slate-800 focus:outline-none"
                  />
                </div>
                {trackPasswordError ? (
                  <p className="text-xs font-semibold text-rose-600" role="alert">
                    {trackPasswordError}
                  </p>
                ) : null}
                <button
                  type="submit"
                  disabled={trackPasswordBusy}
                  className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white shadow-xs transition hover:bg-slate-800 disabled:opacity-60 cursor-pointer"
                >
                  {trackPasswordBusy ? "Verifying..." : "Access Customer Portal"}
                </button>
              </form>
            </div>

            {isExpiredLink ? (
              <form onSubmit={(event) => void requestReplacementLink(event)} className="mt-5 space-y-3 text-left">
                <p className="text-sm font-semibold leading-6 text-slate-600">Request a new link with the quotation track number and the email used for this request.</p>
                <label className="block text-xs font-bold text-slate-700">
                  Request track no.
                  <input value={trackingReference} onChange={(event) => setTrackingReference(event.target.value)} required className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950" />
                </label>
                <label className="block text-xs font-bold text-slate-700">
                  Email address
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" className="mt-1.5 min-h-11 w-full rounded-lg border border-slate-300 px-3 text-sm text-slate-950" />
                </label>
                <InvisibleTurnstile ref={recoveryTurnstileRef} action="track_request" className="max-w-xs" />
                {recoveryError ? <p role="alert" className="text-xs font-semibold text-rose-700">{recoveryError}</p> : null}
                {recoveryComplete ? <p role="status" className="rounded-lg bg-emerald-50 p-3 text-xs font-semibold leading-5 text-emerald-800">If the details match our records, a replacement secure link has been sent to your email.</p> : null}
                <button type="submit" disabled={recoveryBusy || recoveryComplete} className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60">{recoveryBusy ? "Requesting link…" : "Request new access link"}</button>
              </form>
            ) : null}
            {isMissingToken ? (
              <div className="mt-4 text-center">
                <Link
                  href={`/${locale}/proposals/${encodeURIComponent(proposalId)}`}
                  className="inline-flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
                >
                  {t("openWithAccount")}
                </Link>
              </div>
            ) : null}
          </>
        ) : (
          <>
            <GsapSpinner className="mx-auto h-6 w-6 text-[#0369a1]" />
            <h1 className="mt-4 text-xl font-black">{t("opening")}</h1>
            <p className="mt-2 text-sm font-semibold text-slate-600">{t("openingDescription")}</p>
            <InvisibleTurnstile
              ref={turnstileRef}
              action="proposal_magic_link"
              className="mx-auto max-w-xs"
            />
          </>
        )}
      </section>
    </main>
  );
}
