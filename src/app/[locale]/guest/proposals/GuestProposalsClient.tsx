"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Activity,
  Clock,
  FileText,
  Loader2,
  LogOut,
  ShieldAlert,
  ArrowRight,
  Lock,
} from "@/components/ui/icons";

import InvisibleTurnstile, {
  type InvisibleTurnstileHandle,
} from "@/components/security/InvisibleTurnstile";
import CustomerFeedbackModal from "@/components/feedback/CustomerFeedbackModal";
import type { GuestProposalsDashboardContract } from "@/types/proposals";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";

export default function GuestProposalsClient({
  locale,
  email,
  proposals,
  serviceOrders,
}: GuestProposalsDashboardContract) {
  const t = useTranslations("GuestProposals");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [exchangeError, setExchangeError] = useState("");
  const turnstileRef = useRef<InvisibleTurnstileHandle>(null);

  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackRef, setFeedbackRef] = useState("");

  // Parse rating and reference params from the URL (CSAT flow)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const searchParams = new URLSearchParams(window.location.search);
    const ratingVal = searchParams.get("rating");
    const refVal = searchParams.get("ref");

    if (ratingVal && refVal) {
      const parsed = parseInt(ratingVal, 10);
      if (parsed >= 1 && parsed <= 5) {
        setTimeout(() => {
          setFeedbackRating(parsed);
          setFeedbackRef(refVal);
          setFeedbackOpen(true);
        }, 0);

        // Clean URL to prevent re-opening on manual refreshes
        const cleanUrl = window.location.pathname + window.location.hash;
        window.history.replaceState(null, "", cleanUrl);
      }
    }
  }, []);

  // Check URL hash for token exchange
  useEffect(() => {
    if (typeof window === "undefined") return;

    const hash = window.location.hash.slice(1);
    const hashParams = new URLSearchParams(hash);
    const searchParams = new URLSearchParams(window.location.search);
    const token = searchParams.get("token") || hashParams.get("token") || "";

    if (!token) return;

    const exchangeToken = async () => {
      setLoading(true);
      setExchangeError("");
      try {
        const turnstileToken = await turnstileRef.current?.getToken();
        const response = await fetch("/api/guest/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, turnstileToken }),
        });
        turnstileRef.current?.reset();

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(payload.error || t("authenticationFailed"));
        }

        // Clean token from URL after exchange
        window.history.replaceState(null, "", window.location.pathname);
        router.refresh();
      } catch (err: unknown) {
        setExchangeError(
          err instanceof Error ? err.message : t("authenticationError"),
        );
      } finally {
        setLoading(false);
      }
    };

    void exchangeToken();
  }, [router, t]);

  const logout = async () => {
    setLoading(true);
    try {
      await fetch("/api/guest/session", { method: "DELETE" });
      router.replace(`/${locale}`);
      router.refresh();
    } catch {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number | null) => {
    const numericValue = Number(val);
    if (!Number.isFinite(numericValue) || numericValue <= 0) {
      return t("pricePending");
    }

    return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(numericValue);
  };

  const formatSystemSize = (value: number | null) => {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) && numericValue > 0
      ? `${numericValue} kWp`
      : t("systemSizePending");
  };

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "-";
    const date = new Date(isoString);
    return date.toLocaleDateString(locale === "th" ? "th-TH" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  // Rendering 1: Loading exchange state
  if (loading) {
    return (
      <SolarRouteShell className="px-4 pb-16 font-sans sm:px-6">
        <div className="grid min-h-[calc(100dvh-7rem)] place-items-center">
        <section className="solar-route-card w-full max-w-md p-8 text-center">
          <SoliaGuide
            alt={locale === "th" ? "Solia กำลังตรวจสอบสิทธิ์การเข้าถึง" : "Solia establishing your secure access"}
            pose="blueprint"
            className="mx-auto h-28 w-24"
            imageSizes="96px"
          />
          <Loader2 className="mx-auto size-8 animate-spin text-[var(--sd-blue-600)]" />
          <h1 className="mt-4 text-xl font-black tracking-tight text-[var(--sd-ink)]">
            {t("establishingSession")}
          </h1>
          <p className="mt-2 text-sm font-medium text-[var(--sd-muted)]">
            {t("preparingAccess")}
          </p>
          <InvisibleTurnstile
            ref={turnstileRef}
            action="guest_session_exchange"
            className="mx-auto mt-4"
          />
        </section>
        </div>
      </SolarRouteShell>
    );
  }

  // Rendering 2: Error exchange state
  if (exchangeError) {
    return (
      <SolarRouteShell className="px-4 pb-16 font-sans sm:px-6">
        <div className="grid min-h-[calc(100dvh-7rem)] place-items-center">
        <section className="solar-route-card w-full max-w-md space-y-4 p-8 text-center">
          <SoliaGuide
            alt={locale === "th" ? "Solia แจ้งว่าลิงก์เข้าถึงไม่ถูกต้อง" : "Solia reporting that the access link is invalid"}
            pose="miffed"
            className="mx-auto h-28 w-24"
            imageSizes="96px"
          />
          <ShieldAlert className="mx-auto size-12 text-[var(--sd-danger)]" />
          <h1 className="text-xl font-black tracking-tight text-[var(--sd-ink)]">{t("accessInvalid")}</h1>
          <p className="rounded-[var(--sd-radius-md)] border border-rose-200 bg-rose-50 p-3.5 text-sm font-medium leading-relaxed text-rose-700">
            {exchangeError}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] px-6 text-sm font-bold text-white shadow-[var(--sd-shadow-1)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#0B5BE0] hover:shadow-[var(--sd-shadow-2)] active:scale-[0.99]"
          >
            {t("goHome")}
          </Link>
        </section>
        </div>
      </SolarRouteShell>
    );
  }

  // Rendering 3: Authenticated Dashboard list
  if (email) {
    const hasDocuments = proposals.length > 0 || serviceOrders.length > 0;

    return (
      <>
        <SolarRouteShell className="px-4 pb-16 font-sans sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-5xl space-y-7">
            <header className="flex flex-col items-start justify-between gap-6 border-b border-[var(--sd-line)] pb-6 sm:flex-row sm:items-center sm:pb-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="solar-ui-status" data-tone="warning">
                    <Clock className="size-3" />
                    {t("temporarySession")}
                  </span>
                </div>
                <h1 className="mt-3 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl">
                  {t("documentsTitle")}
                </h1>
                <p className="mt-2 text-sm font-medium text-[var(--sd-muted)]">
                  {t("signedInFor")}{" "}
                  <span className="font-bold text-[var(--sd-ink)]">{email}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[var(--sd-line)] bg-[var(--sd-raised)] px-5 text-sm font-bold text-[var(--sd-text)] shadow-[var(--sd-shadow-1)] transition-[background-color,border-color,box-shadow,transform] duration-200 hover:border-[var(--sd-blue-500)] hover:bg-[var(--sd-soft-solar)] hover:text-[var(--sd-blue-600)] active:scale-[0.99]"
              >
                <LogOut className="size-3.5" />
                <span>{t("signOut")}</span>
              </button>
            </header>

            {/* Account Linking CTA Banner (if they have unlinked orders) */}
            {proposals.length > 0 && (
              <section className="solar-soft-panel flex flex-col justify-between gap-4 border-[var(--sd-blue-500)]/25 bg-[var(--sd-selected)] p-6 text-[var(--sd-ink)] md:flex-row md:items-center">
                <div className="space-y-1">
                  <h2 className="text-base font-black text-[var(--sd-ink)]">
                    {t("saveProposalsTitle")}
                  </h2>
                  <p className="text-sm font-medium leading-relaxed text-[var(--sd-muted)]">
                    {t("saveProposalsDescription")}
                  </p>
                </div>
                <Link
                  href={`/${locale}/register?reference_number=${encodeURIComponent(
                    proposals[0].id,
                  )}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-full border border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] px-6 text-center text-sm font-bold text-white shadow-[var(--sd-shadow-1)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#0B5BE0] hover:shadow-[var(--sd-shadow-2)] active:scale-[0.99] md:self-center"
                >
                  {t("createAccount")}
                </Link>
              </section>
            )}

            {/* Document Lists Grid */}
            {!hasDocuments ? (
              <SolarStatePanel
                kind="empty"
                title={t("noRecordsTitle")}
                description={t("noRecordsDescription")}
                soliaAlt={locale === "th" ? "Solia กำลังรอเอกสารโครงการของคุณ" : "Solia waiting for your project documents"}
                className="solar-route-card"
              />
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {/* Proposals Block */}
                {proposals.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="solar-route-kicker flex items-center gap-1.5 px-1">
                      <FileText className="size-4" />
                      {t("proposalsTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {proposals.map((proposal) => (
                        <Link
                          key={proposal.id}
                          href={`/${locale}/proposals/${proposal.id}`}
                          className="solar-route-card group flex flex-col justify-between gap-5 p-6"
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <span className="solar-ui-status" data-tone="success">
                                {t("quotation")}
                              </span>
                              <span className="flex items-center gap-0.5 text-sm font-bold text-[var(--sd-muted)] transition-colors group-hover:text-[var(--sd-blue-600)]">
                                {t("view")}{" "}
                                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </div>
                            <h3 className="pt-2 text-lg font-black tracking-tight text-[var(--sd-ink)]">
                              {proposal.reference}
                            </h3>
                          </div>

                          <div className="grid grid-cols-2 gap-3 border-t border-[var(--sd-line)] pt-4 text-xs">
                            <div className="font-medium text-[var(--sd-muted)]">
                              <div>{t("systemSize")}</div>
                              <div className="mt-1 text-sm font-bold text-[var(--sd-ink)]">
                                {formatSystemSize(proposal.systemSizeKwp)}
                              </div>
                            </div>
                            <div className="font-medium text-[var(--sd-muted)]">
                              <div>{t("price")}</div>
                              <div className="mt-1 text-sm font-bold text-[var(--sd-ink)]">
                                {formatCurrency(proposal.totalPrice)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                {/* Service Orders Block */}
                {serviceOrders.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="solar-route-kicker flex items-center gap-1.5 px-1 pt-4">
                      <Activity className="size-4" />
                      {t("serviceOrdersTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {serviceOrders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/${locale}/support/orders/${order.id}`}
                          className="solar-route-card group flex flex-col justify-between gap-5 p-6"
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <span className="solar-ui-status" data-tone="warning">
                                {t("serviceOrder")}
                              </span>
                              <span className="flex items-center gap-0.5 text-sm font-bold text-[var(--sd-muted)] transition-colors group-hover:text-[var(--sd-blue-600)]">
                                {t("track")}{" "}
                                <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </div>
                            <h3 className="line-clamp-1 pt-2 text-base font-black leading-tight text-[var(--sd-ink)]">
                              {order.offeringName}
                            </h3>
                            <div className="font-mono text-[10px] font-medium text-[var(--sd-muted)]">
                              {order.reference}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 border-t border-[var(--sd-line)] pt-4 text-xs">
                            <div className="font-medium text-[var(--sd-muted)]">
                              <div>{t("appointmentDate")}</div>
                              <div className="mt-1 text-sm font-bold text-[var(--sd-ink)]">
                                {formatDate(order.appointmentDate)}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </SolarRouteShell>
        <CustomerFeedbackModal
          isOpen={feedbackOpen}
          onClose={() => setFeedbackOpen(false)}
          initialRating={feedbackRating}
          referenceId={feedbackRef}
          locale={locale}
        />
      </>
    );
  }

  // Rendering 4: Prompt authentication view (if user directly visited /guest/proposals with no session/hash)
  return (
    <>
      <SolarRouteShell className="px-4 pb-16 font-sans sm:px-6">
        <div className="grid min-h-[calc(100dvh-7rem)] place-items-center">
        <section className="solar-route-card w-full max-w-md space-y-5 p-8 text-center">
          <SoliaGuide
            alt={locale === "th" ? "Solia ช่วยปกป้องเอกสารโครงการของคุณ" : "Solia protecting your project documents"}
            pose="blueprint"
            className="mx-auto h-28 w-24"
            imageSizes="96px"
          />
          <div className="mx-auto grid size-12 place-items-center rounded-[var(--sd-radius-md)] bg-[var(--sd-soft-solar)] text-[var(--sd-blue-600)]">
            <Lock className="size-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-[var(--sd-ink)] sm:text-2xl">
              {t("authorizationRequired")}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[var(--sd-muted)]">
              {t("authorizationDescription")}
            </p>
          </div>

          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] px-6 text-sm font-bold text-white shadow-[var(--sd-shadow-1)] transition-[background-color,box-shadow,transform] duration-200 hover:bg-[#0B5BE0] hover:shadow-[var(--sd-shadow-2)] active:scale-[0.99]"
          >
            {t("goHome")}
          </Link>
        </section>
        </div>
      </SolarRouteShell>
      <CustomerFeedbackModal
        isOpen={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        initialRating={feedbackRating}
        referenceId={feedbackRef}
        locale={locale}
      />
    </>
  );
}
