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
      <StateShell>
        <div role="status" className="space-y-4">
          <p className="text-sm font-semibold text-foreground">{t("portal.loading")}</p>
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
      <StateShell>
        <div className="text-center">
          <span className="mx-auto flex size-11 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            <ShieldCheck aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-balance text-2xl font-bold text-foreground">
            {t("portal.expiredTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
      <StateShell>
        <div role="alert" className="text-center">
          <h1 className="text-balance text-2xl font-bold text-foreground">
            {t("portal.errorTitle")}
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
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
    <PageShell className="bg-background px-4 py-10 text-foreground sm:px-6 sm:py-14 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="max-w-3xl">
          <p className="text-sm font-semibold text-muted-foreground">{t("portal.eyebrow")}</p>
          <h1 className="mt-2 text-balance text-3xl font-extrabold tracking-[-0.03em] sm:text-4xl">
            {name}
          </h1>
          <p className="mt-2 font-mono text-sm font-semibold text-slate-600">{order.reference}</p>
        </header>

        <section className="mt-7 rounded-xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0 max-w-2xl">
              <h2 className="text-base font-bold">{t("portal.linkSaverTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("portal.linkSaverWarning")}</p>
              <p className="mt-3 break-all rounded-lg bg-muted px-3 py-2 font-mono text-xs font-semibold text-slate-700">
                /{locale}/track/{tokenId}#access=••••
              </p>
              <p
                role={shareState === "error" ? "alert" : "status"}
                aria-live="polite"
                className={cn(
                  "mt-2 min-h-5 text-xs font-semibold",
                  shareState === "error" ? "text-rose-700" : "text-muted-foreground",
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
          className="mt-5 grid overflow-hidden rounded-xl border border-border bg-card sm:grid-cols-2 lg:grid-cols-4"
          aria-label={t("portal.summary")}
        >
          <Tile
            icon={Wrench}
            label={t("portal.serviceStatus")}
            value={serviceLabel}
            className="border-b border-border sm:border-r lg:border-b-0"
          />
          <Tile
            icon={CalendarDays}
            label={t("portal.appointment")}
            value={appointment}
            className="border-b border-border lg:border-b-0 lg:border-r"
          />
          <Tile
            icon={CircleDollarSign}
            label={t("portal.paymentStatus")}
            value={paymentLabel}
            className="border-b border-border sm:border-b-0 sm:border-r"
          />
          <Tile
            icon={CloudCog}
            label={t("portal.erpStatus")}
            value={erpLabel}
          />
        </section>

        <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 className="text-xl font-bold">{t("portal.timeline")}</h2>
            <ol className="mt-4 divide-y divide-border">
              {milestones.map((item) => (
                <li key={item.label} className="flex items-start gap-3 py-4 first:pt-2 last:pb-1">
                  <span
                    className={
                      item.complete
                        ? "mt-1.5 size-3 shrink-0 rounded-full bg-primary"
                        : "mt-1.5 size-3 shrink-0 rounded-full border-2 border-slate-300 bg-card"
                    }
                    aria-hidden="true"
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
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
            <section className="rounded-xl border border-border bg-card p-5 sm:p-6">
              <h2 className="text-lg font-bold">{t("portal.contact")}</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <Masked
                  label={t("portal.name")}
                  value={order.contact.fullName}
                />
                <Masked label={t("email")} value={order.contact.email} />
                <Masked label={t("portal.phone")} value={order.contact.phone} />
              </dl>
            </section>
            <section className="rounded-xl border border-primary/45 bg-primary/15 p-5 sm:p-6">
              <h2 className="text-xl font-bold">{t("portal.claimTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {t("portal.claimDescription")}
              </p>
              {message ? (
                <p
                  role="alert"
                  className="mt-3 text-sm font-semibold text-rose-700"
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
                  className="w-full bg-card"
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

function StateShell({ children }: { children: ReactNode }) {
  return (
    <PageShell className="grid place-items-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-xl border border-border bg-card p-6 sm:p-8">
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
      <Icon aria-hidden="true" className="text-slate-600" />
      <p className="mt-3 text-xs font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-bold text-foreground">{value}</p>
    </div>
  );
}

function Masked({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words text-right font-semibold text-foreground">{value}</dd>
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
