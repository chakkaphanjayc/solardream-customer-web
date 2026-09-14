"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  Activity,
  ClipboardList,
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

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(val);
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
      <div className="grid min-h-dvh place-items-center bg-[#F0EEE9] px-4 font-sans text-[#1C1C1A]">
        <section className="w-full max-w-md rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-8 text-center shadow-sm">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4F7FA8]" />
          <h1 className="mt-4 text-xl font-bold text-[#1C1C1A]">
            {t("establishingSession")}
          </h1>
          <p className="mt-2 text-sm font-medium text-[#4E4B44]">
            {t("preparingAccess")}
          </p>
          <InvisibleTurnstile
            ref={turnstileRef}
            action="guest_session_exchange"
            className="mx-auto mt-4"
          />
        </section>
      </div>
    );
  }

  // Rendering 2: Error exchange state
  if (exchangeError) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[#F0EEE9] px-4 font-sans text-[#1C1C1A]">
        <section className="w-full max-w-md space-y-4 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-8 text-center shadow-sm">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
          <h1 className="text-xl font-bold text-[#1C1C1A]">{t("accessInvalid")}</h1>
          <p className="rounded-2xl border border-rose-200/60 bg-rose-50/80 p-3.5 text-sm font-medium leading-relaxed text-rose-700">
            {exchangeError}
          </p>
          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#B7D1EA] px-6 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/90 active:scale-95"
          >
            {t("goHome")}
          </Link>
        </section>
      </div>
    );
  }

  // Rendering 3: Authenticated Dashboard list
  if (email) {
    const hasDocuments = proposals.length > 0 || serviceOrders.length > 0;

    return (
      <>
        <div className="min-h-dvh bg-[#F0EEE9] px-4 py-10 font-sans text-[#1C1C1A] sm:px-6 sm:py-12 lg:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <header className="flex flex-col items-start justify-between gap-6 border-b border-[#8E8B83]/15 pb-6 sm:flex-row sm:items-center sm:pb-8">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10px] font-bold tracking-wider text-amber-700">
                    <Clock className="h-3 w-3" />
                    {t("temporarySession")}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-bold text-[#1C1C1A] sm:text-3xl">
                  {t("documentsTitle")}
                </h1>
                <p className="mt-1 text-xs font-medium text-[#4E4B44]">
                  {t("signedInFor")}{" "}
                  <span className="font-bold text-[#1C1C1A]">{email}</span>
                </p>
              </div>

              <button
                onClick={logout}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9] px-5 text-xs font-medium text-[#1C1C1A] shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/10 hover:text-[#3E6685] active:scale-95"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>{t("signOut")}</span>
              </button>
            </header>

            {/* Account Linking CTA Banner (if they have unlinked orders) */}
            {proposals.length > 0 && (
              <section className="flex flex-col justify-between gap-4 rounded-[28px] border border-[#8E8B83]/20 bg-[#DCE8F5] p-6 text-[#2E2C27] shadow-sm md:flex-row md:items-center">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-[#2E2C27]">
                    {t("saveProposalsTitle")}
                  </h4>
                  <p className="text-xs font-medium leading-relaxed text-[#4E4B44]">
                    {t("saveProposalsDescription")}
                  </p>
                </div>
                <Link
                  href={`/${locale}/register?reference_number=${encodeURIComponent(
                    proposals[0].id,
                  )}`}
                  className="inline-flex min-h-11 shrink-0 items-center justify-center self-start rounded-full bg-[#B7D1EA] px-6 text-center text-xs font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95 md:self-center"
                >
                  {t("createAccount")}
                </Link>
              </section>
            )}

            {/* Document Lists Grid */}
            {!hasDocuments ? (
              <div className="space-y-4 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-12 text-center shadow-sm">
                <ClipboardList className="mx-auto h-12 w-12 text-[#4E4B44]" />
                <h2 className="text-lg font-bold text-[#1C1C1A]">
                  {t("noRecordsTitle")}
                </h2>
                <p className="mx-auto max-w-md text-sm text-[#4E4B44]">
                  {t("noRecordsDescription")}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {/* Proposals Block */}
                {proposals.length > 0 && (
                  <div className="space-y-3">
                    <h2 className="flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                      <FileText className="h-4 w-4 text-[#4F7FA8]" />
                      {t("proposalsTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {proposals.map((proposal) => (
                        <Link
                          key={proposal.id}
                          href={`/${locale}/proposals/${proposal.id}`}
                          className="group flex flex-col justify-between gap-4 rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:bg-[#F0EEE9] hover:shadow-md"
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <span className="rounded-full bg-[#B7D1EA]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#4F7FA8]">
                                {t("quotation")}
                              </span>
                              <span className="flex items-center gap-0.5 text-xs font-medium text-[#4E4B44] transition-colors group-hover:text-[#3E6685]">
                                {t("view")}{" "}
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </div>
                            <h3 className="pt-1 text-lg font-bold text-[#1C1C1A]">
                              {proposal.reference}
                            </h3>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-t border-[#8E8B83]/15 pt-3 text-xs">
                            <div className="font-medium text-[#4E4B44]">
                              <div>{t("systemSize")}</div>
                              <div className="mt-0.5 text-sm font-bold text-[#1C1C1A]">
                                {proposal.systemSizeKwp} kWp
                              </div>
                            </div>
                            <div className="font-medium text-[#4E4B44]">
                              <div>{t("price")}</div>
                              <div className="mt-0.5 text-sm font-bold text-[#1C1C1A]">
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
                    <h2 className="flex items-center gap-1.5 px-1 pt-4 text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                      <Activity className="h-4 w-4 text-[#4F7FA8]" />
                      {t("serviceOrdersTitle")}
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {serviceOrders.map((order) => (
                        <Link
                          key={order.id}
                          href={`/${locale}/support/orders/${order.id}`}
                          className="group flex flex-col justify-between gap-4 rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:bg-[#F0EEE9] hover:shadow-md"
                        >
                          <div className="space-y-1">
                            <div className="flex items-start justify-between">
                              <span className="rounded-full bg-amber-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                                {t("serviceOrder")}
                              </span>
                              <span className="flex items-center gap-0.5 text-xs font-medium text-[#4E4B44] transition-colors group-hover:text-[#3E6685]">
                                {t("track")}{" "}
                                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                              </span>
                            </div>
                            <h3 className="line-clamp-1 pt-1 text-base font-bold leading-tight text-[#1C1C1A]">
                              {order.offeringName}
                            </h3>
                            <div className="font-mono text-[10px] font-medium text-[#4E4B44]">
                              {order.reference}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 border-t border-[#8E8B83]/15 pt-3 text-xs">
                            <div className="font-medium text-[#4E4B44]">
                              <div>{t("appointmentDate")}</div>
                              <div className="mt-0.5 text-sm font-bold text-[#1C1C1A]">
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
        </div>
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
      <div className="grid min-h-dvh place-items-center bg-[#F0EEE9] px-4 font-sans text-[#1C1C1A]">
        <section className="w-full max-w-md space-y-5 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-8 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DCE8F5] text-[#4F7FA8]">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#1C1C1A] sm:text-2xl">
              {t("authorizationRequired")}
            </h1>
            <p className="mt-2 text-sm font-medium leading-relaxed text-[#4E4B44]">
              {t("authorizationDescription")}
            </p>
          </div>

          <Link
            href={`/${locale}`}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[#B7D1EA] px-6 text-xs font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95"
          >
            {t("goHome")}
          </Link>
        </section>
      </div>
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
