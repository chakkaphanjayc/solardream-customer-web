"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  CalendarDays,
  CircleDollarSign,
  Clipboard,
  CloudCog,
  RefreshCw,
  ShieldCheck,
  Wrench,
} from "@/components/ui/icons";

import InvisibleTurnstile, {
  type InvisibleTurnstileHandle,
} from "@/components/security/InvisibleTurnstile";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/ui/page-shell";
import Skeleton from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type TimelineItem = { eventType: string; createdAt: string };
type PortalOrder = {
  reference: string;
  status: string;
  paymentStatus: string;
  paymentRequirement: string;
  erpSyncStatus: string;
  appointmentDate: string;
  offering: { name: unknown; durationMinutes: unknown };
  contact: { fullName: string; email: string; phone: string };
  timeline: TimelineItem[];
};

export default function TrackPortalClient({
  locale,
  tokenId,
}: {
  locale: string;
  tokenId: string;
}) {
  const t = useTranslations("TrackPage");
  const router = useRouter();
  const turnstileRef = useRef<InvisibleTurnstileHandle>(null);
  const [order, setOrder] = useState<PortalOrder | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error" | "expired">(
    "loading",
  );
  const [message, setMessage] = useState("");
  const [shareState, setShareState] = useState<
    "idle" | "busy" | "copied" | "error"
  >("idle");
  const [claimBusy, setClaimBusy] = useState(false);
  const read = useCallback(
    async (response: Response) => {
      const body = await response.text();
      try {
        return JSON.parse(body) as {
          success?: boolean;
          order?: PortalOrder;
          error?: string;
        };
      } catch {
        return { error: t("portal.error") };
      }
    },
    [t],
  );
  const loadStatus = useCallback(async () => {
    try {
      const response = await fetch("/api/services/portal/status", {
        cache: "no-store",
      });
      const data = await read(response);
      if (response.status === 401) {
        setState("expired");
        return;
      }
      if (!response.ok || !data.success || !data.order)
        throw new Error(data.error || t("portal.error"));
      setOrder(data.order);
      setState("ready");
      setMessage("");
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : t("portal.error"));
      setState("error");
    }
  }, [read, t]);
  useEffect(() => {
    let active = true;
    const start = async () => {
      const access = new URLSearchParams(window.location.hash.slice(1)).get(
        "access",
      );
      if (access) {
        try {
          const turnstileToken = await turnstileRef.current?.getToken();
          const response = await fetch("/api/services/portal/session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tokenId, access, turnstileToken }),
          });
          turnstileRef.current?.reset();
          if (!response.ok) {
            if (active) setState("expired");
            return;
          }
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.pathname}${window.location.search}`,
          );
        } catch {
          if (active) setState("error");
          return;
        }
      }
      if (active) await loadStatus();
    };
    void start();
    const timer = window.setInterval(() => {
      if (active && document.visibilityState === "visible") void loadStatus();
    }, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [loadStatus, tokenId]);
  const claim = async (mode: "register" | "login") => {
    setClaimBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/services/portal/claim-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ necessaryConsent: true }),
      });
      if (!response.ok) throw new Error(t("portal.claimError"));
      const next = `/${locale}/proposals`;
      router.push(`/${locale}/${mode}?next=${encodeURIComponent(next)}`);
    } catch (caught) {
      setMessage(
        caught instanceof Error ? caught.message : t("portal.claimError"),
      );
      setClaimBusy(false);
    }
  };
  const rotateAndCopy = async () => {
    if (shareState === "busy") return;
    setShareState("busy");
    try {
      const response = await fetch("/api/services/portal/share-link", {
        method: "POST",
      });
      const raw = await response.text();
      let payload: { success?: boolean; link?: string; error?: string } = {};
      try {
        payload = JSON.parse(raw) as typeof payload;
      } catch {
        /* Localized error below. */
      }
      if (!response.ok || !payload.success || typeof payload.link !== "string")
        throw new Error(payload.error || t("portal.shareError"));
      const oneTimeLink = payload.link;
      await navigator.clipboard.writeText(oneTimeLink);
      setShareState("copied");
      window.setTimeout(() => setShareState("idle"), 2500);
    } catch {
      setShareState("error");
    }
  };
  if (state === "loading") {
    return (
      <StateShell
        soliaAlt={t("portal.loadingAlt")}
        soliaMessage={t("portal.loading")}
      >
        <div role="status" className="space-y-4">
          <p className="text-sm font-semibold text-[var(--sd-ink)]">{t("portal.loading")}</p>
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
          <InvisibleTurnstile
            ref={turnstileRef}
            action="service_magic_link"
            className="mx-auto max-w-xs"
          />
        </div>
      </StateShell>
    );
  }

  if (state === "expired") {
    return (
      <StateShell
        soliaAlt={t("portal.expiredAlt")}
        soliaMessage={t("portal.expiredDescription")}
      >
        <div className="text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-[var(--sd-radius-md)] bg-[var(--sd-soft-solar)] text-[var(--sd-navy-900)]">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-balance text-2xl font-bold text-[var(--sd-ink)]">
            {t("portal.expiredTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--sd-muted)]">
            {t("portal.expiredDescription")}
          </p>
          <Button
            type="button"
            onClick={() => router.push(`/${locale}/track`)}
            className="mt-6 min-h-12"
          >
            {t("portal.recover")}
          </Button>
        </div>
      </StateShell>
    );
  }

  if (state === "error" || !order) {
    return (
      <StateShell
        soliaAlt={t("portal.errorAlt")}
        soliaMessage={t("portal.error")}
      >
        <div role="alert" className="text-center">
          <h1 className="text-balance text-2xl font-bold text-[var(--sd-ink)]">
            {t("portal.errorTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-[var(--sd-muted)]">
            {message || t("portal.error")}
          </p>
          <Button
            type="button"
            onClick={() => void loadStatus()}
            className="mt-6 min-h-12"
          >
            <RefreshCw aria-hidden="true" />
            {t("portal.retry")}
          </Button>
        </div>
      </StateShell>
    );
  }
  const milestones = [
    {
      label: t("portal.milestones.payment"),
      complete:
        order.paymentRequirement === "NOT_REQUIRED" ||
        ["VERIFIED", "PAID"].includes(order.paymentStatus),
    },
    {
      label: t("portal.milestones.erp"),
      complete: order.erpSyncStatus === "SYNCED",
    },
    {
      label: t("portal.milestones.appointment"),
      complete: Boolean(order.appointmentDate),
    },
    {
      label: t("portal.milestones.closed"),
      complete: ["CLOSED", "COMPLETED", "DONE"].includes(
        order.status.toUpperCase(),
      ),
    },
  ];
  const serviceLabel =
    (
      {
        PENDING: t("portal.status.service.PENDING"),
        CONFIRMED: t("portal.status.service.CONFIRMED"),
        IN_PROGRESS: t("portal.status.service.IN_PROGRESS"),
        COMPLETED: t("portal.status.service.COMPLETED"),
        CLOSED: t("portal.status.service.CLOSED"),
      } as Record<string, string>
    )[order.status.toUpperCase()] || t("portal.status.service.UPDATE");
  const paymentLabel =
    (
      {
        UNPAID: t("portal.status.payment.UNPAID"),
        NOT_REQUIRED: t("portal.status.payment.NOT_REQUIRED"),
        VERIFIED: t("portal.status.payment.VERIFIED"),
        PAID: t("portal.status.payment.PAID"),
      } as Record<string, string>
    )[order.paymentStatus.toUpperCase()] || t("portal.status.payment.UPDATE");
  const erpLabel =
    (
      {
        PENDING: t("portal.status.erp.PENDING"),
        PROCESSING: t("portal.status.erp.PROCESSING"),
        SYNCED: t("portal.status.erp.SYNCED"),
        FAILED: t("portal.status.erp.FAILED"),
      } as Record<string, string>
    )[order.erpSyncStatus.toUpperCase()] || t("portal.status.erp.UPDATE");
  const name =
    localized(order.offering.name, locale) || t("portal.serviceFallback");
  const appointmentDate = new Date(order.appointmentDate);
  const appointment = order.appointmentDate && !Number.isNaN(appointmentDate.getTime())
    ? new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(appointmentDate)
    : t("portal.pending");

  return (
    <PageShell className="px-4 pb-16 pt-20 text-[var(--sd-ink)] sm:px-6 sm:pb-20 sm:pt-24 lg:px-8 lg:pt-28">
      <div className="mx-auto w-full max-w-5xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-[var(--sd-muted)]">{t("portal.eyebrow")}</p>
          <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 font-mono text-sm font-semibold text-[var(--sd-muted)]">{order.reference}</p>
        </header>

        <section className="solar-route-card solar-route-card--strong mt-7 p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 max-w-2xl">
              <h2 className="text-base font-bold">{t("portal.linkSaverTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sd-muted)]">{t("portal.linkSaverWarning")}</p>
              <p className="mt-3 break-all rounded-[var(--sd-radius-sm)] bg-[var(--sd-soft-solar)] px-3 py-2 font-mono text-xs font-semibold text-[var(--sd-navy-900)]">
                /{locale}/track/{tokenId}#access=••••
              </p>
              <p
                role={shareState === "error" ? "alert" : "status"}
                aria-live="polite"
                className={cn(
                  "mt-2 min-h-5 text-xs font-semibold",
                  shareState === "error" ? "text-[var(--sd-danger)]" : "text-[var(--sd-muted)]",
                )}
              >
                {shareState === "copied"
                  ? t("portal.shareCopied")
                  : shareState === "error"
                    ? t("portal.shareError")
                    : ""}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => void rotateAndCopy()}
              disabled={shareState === "busy"}
              className="w-full shrink-0 sm:w-auto"
            >
              <Clipboard aria-hidden="true" />
              {shareState === "busy"
                ? t("portal.shareBusy")
                : shareState === "copied"
                  ? t("portal.shareCopied")
                  : t("portal.rotateCopy")}
            </Button>
          </div>
        </section>

        <section
          className="solar-route-card solar-route-card--strong mt-5 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4"
          aria-label={t("portal.summary")}
        >
          <Tile
            icon={Wrench}
            label={t("portal.serviceStatus")}
            value={serviceLabel}
            className="border-b border-[var(--sd-line)] sm:border-r lg:border-b-0"
          />
          <Tile
            icon={CalendarDays}
            label={t("portal.appointment")}
            value={appointment}
            className="border-b border-[var(--sd-line)] lg:border-b-0 lg:border-r"
          />
          <Tile
            icon={CircleDollarSign}
            label={t("portal.paymentStatus")}
            value={paymentLabel}
            className="border-b border-[var(--sd-line)] sm:border-b-0 sm:border-r"
          />
          <Tile
            icon={CloudCog}
            label={t("portal.erpStatus")}
            value={erpLabel}
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="solar-route-card solar-route-card--strong p-5 sm:p-6">
            <h2 className="text-xl font-bold text-[var(--sd-ink)]">{t("portal.timeline")}</h2>
            <ol className="mt-4 space-y-3">
              {milestones.map((item, index) => (
                <li
                  key={item.label}
                  className="relative grid grid-cols-[1rem_minmax(0,1fr)] gap-3 py-2"
                >
                  {index < milestones.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className="absolute bottom-[-0.75rem] left-[0.34rem] top-5 w-px bg-[var(--sd-line)]"
                    />
                  ) : null}
                  <span
                    className={
                      item.complete
                        ? "relative z-[1] mt-1.5 size-3 shrink-0 rounded-full bg-[var(--sd-success)] ring-4 ring-[var(--sd-raised)]"
                        : "relative z-[1] mt-1.5 size-3 shrink-0 rounded-full border-2 border-[var(--sd-line)] bg-[var(--sd-soft-solar)] ring-4 ring-[var(--sd-raised)]"
                    }
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[var(--sd-ink)]">{item.label}</p>
                    <p
                      className={cn(
                        "mt-1 text-xs font-semibold",
                        item.complete
                          ? "text-[var(--sd-success)]"
                          : "text-[var(--sd-muted)]",
                      )}
                    >
                      {item.complete
                        ? t("portal.complete")
                        : t("portal.pending")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          <aside className="space-y-5">
            <section className="solar-route-card solar-route-card--strong p-5 sm:p-6">
              <h2 className="text-lg font-bold text-[var(--sd-ink)]">{t("portal.contact")}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Masked
                  label={t("portal.name")}
                  value={order.contact.fullName}
                />
                <Masked label={t("email")} value={order.contact.email} />
                <Masked label={t("portal.phone")} value={order.contact.phone} />
              </dl>
            </section>
            <section className="solar-route-card solar-route-card--accent p-5 sm:p-6">
              <h2 className="text-xl font-bold text-[var(--sd-ink)]">{t("portal.claimTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sd-muted)]">
                {t("portal.claimDescription")}
              </p>
              {message ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-semibold text-[var(--sd-danger)]"
                >
                  {message}
                </p>
              ) : null}
              <div className="mt-5 grid gap-3">
                <Button
                  type="button"
                  disabled={claimBusy}
                  onClick={() => void claim("register")}
                  className="min-h-12 w-full"
                >
                  {t("portal.createAccount")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={claimBusy}
                  onClick={() => void claim("login")}
                  className="w-full"
                >
                  {t("portal.signIn")}
                </Button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </PageShell>
  );
}

function StateShell({
  children,
  soliaAlt,
  soliaMessage,
}: {
  children: ReactNode;
  soliaAlt: string;
  soliaMessage: ReactNode;
}) {
  return (
    <PageShell className="grid place-items-center px-4 pb-16 pt-20 text-[var(--sd-ink)] sm:pt-24 lg:pt-28">
      <section className="solar-route-card solar-route-card--strong w-full max-w-lg p-6 sm:p-8">
        <SoliaGuide
          className="mx-auto mb-5 h-28 w-24"
          pose="thinking"
          alt={soliaAlt}
          message={soliaMessage}
          speechBubbleClassName="absolute bottom-0 left-0 max-w-[15rem] -translate-x-1/2 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-2.5 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
        />
        {children}
      </section>
    </PageShell>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: typeof Wrench;
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={cn("p-5", className)}>
      <Icon aria-hidden="true" className="text-[var(--sd-navy-900)]" />
      <p className="mt-3 text-xs font-semibold text-[var(--sd-muted)]">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-[var(--sd-ink)]">{value}</p>
    </div>
  );
}

function Masked({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-[var(--sd-muted)]">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-[var(--sd-ink)]">{value}</dd>
    </div>
  );
}
function localized(value: unknown, locale: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const row = value as Record<string, unknown>;
  return typeof row[locale] === "string"
    ? row[locale]
    : typeof row.en === "string"
      ? row.en
      : "";
}
