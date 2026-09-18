"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { SoliaGuide } from "@/components/brand/solia-scenes";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CalendarDays, CheckCircle2, ExternalLink, MapPin, RefreshCw, ShieldCheck, Sun, Wrench } from "@/components/ui/icons";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";

type PortalData = {
  access: { id: string; expiresAt: string };
  projects: Array<{
    id: string;
    projectCode: string;
    state: string;
    systemSizeKwp: string | null;
    panelCount: number | null;
    site: { label: string; addressLine1: string; city: string | null; province: string | null; country: string } | null;
    nextVisit: { status: string; scheduledStart: string | null; scheduledEnd: string | null } | null;
    installationWarranty: { status: string; startsAt: string | null; endsAt: string | null } | null;
    updatedAt: string;
    customerName: string;
  }>;
  assets: Array<{ id: string; projectId: string | null; productName: string; serialNumber: string; status: string; installedDate: string; warrantyExpiryDate: string }>;
  warranties: {
    installation: Array<{ id: string; projectId: string; status: string; policyVersion: string; startsAt: string | null; endsAt: string | null }>;
    product: Array<{ id: string; provider: string; productName: string; status: string; startsAt: string | null; endsAt: string | null; asset: { id: string; serialNumber: string; productName: string } }>;
  };
};

type PortalPayload = { success?: boolean; data?: PortalData; error?: { message?: string } };

function formatDate(value: string | null, locale: string, pendingLabel: string) {
  if (!value) return pendingLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return pendingLabel;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium" }).format(date);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function GuestWarrantyAccessClient({ enabled, token }: { enabled: boolean; token: string }) {
  const locale = useLocale();
  const t = useTranslations("GuestWarranty");
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const dateLabel = (value: string | null) => formatDate(value, locale, t("access.pendingDate"));

  const statusLabel = (value: string) => {
    const statusLabels: Record<string, string> = {
      PENDING: t("access.status.pending"),
      COMPLETED: t("access.status.completed"),
      ACTIVE: t("access.status.active"),
      SCHEDULED: t("access.status.scheduled"),
      INSTALLED: t("access.status.installed"),
      EXPIRED: t("access.status.expired"),
      CANCELLED: t("access.status.cancelled"),
      IN_PROGRESS: t("access.status.inProgress"),
      REQUESTED: t("access.status.requested"),
    };

    return statusLabels[value.trim().toUpperCase().replaceAll("-", "_")] ?? titleCase(value);
  };

  const fetchPortalData = useCallback(async () => {
    const response = await fetch("/api/v2/guest/warranty/access/" + encodeURIComponent(token), {
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    const payload = await response.json() as PortalPayload;
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(payload.error?.message || t("access.invalidLink"));
    }
    return payload.data;
  }, [t, token]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setData(await fetchPortalData());
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("access.invalidLink"));
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchPortalData, t]);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void fetchPortalData().then((portalData) => {
      if (!active) return;
      setData(portalData);
      setError("");
      setLoading(false);
    }).catch((caught: unknown) => {
      if (!active) return;
      setError(caught instanceof Error ? caught.message : t("access.invalidLink"));
      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, [enabled, fetchPortalData, t]);

  return (
    <SolarRouteShell
      as="div"
      className="solar-guest-warranty-page px-4 pb-8 text-[var(--sd-ink)] sm:px-6 md:pb-12"
    >
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link href={"/" + locale} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--sd-blue-600)]">
            <Sun className="h-4 w-4" aria-hidden="true" /> {t("access.headerLabel")}
          </Link>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sd-muted)]">
            <ShieldCheck className="h-4 w-4 text-[var(--sd-blue-500)]" aria-hidden="true" /> {t("access.secureView")}
          </span>
        </header>

        {!enabled ? (
          <section aria-labelledby="guest-warranty-disabled-title" className="solar-ui-panel solar-route-card rounded-[2rem] p-8 text-center sm:p-12">
            <SoliaGuide
              className="mx-auto h-48 w-40"
              pose="thinking"
              alt={t("access.disabledSoliaAlt")}
              message={t("access.disabledSoliaMessage")}
              speechBubbleClassName="absolute bottom-0 left-0 max-w-[14rem] rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
            />
            <h1 id="guest-warranty-disabled-title" className="mt-5 text-2xl font-black text-[var(--sd-ink)] sm:text-3xl">{t("access.disabledTitle")}</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-[var(--sd-text)]">{t("access.disabledDescription")}</p>
            <Link href={"/" + locale + "/warranty"} className="solar-ui-primary mt-7 inline-flex min-h-11">
              {t("access.disabledAction")} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </section>
        ) : loading ? (
          <div className="solar-ui-panel solar-route-card flex min-h-96 items-center justify-center rounded-[2rem]" role="status" aria-label={t("access.loadingLabel")}>
            <SoliaGuide
              className="h-40 w-36"
              pose="thinking"
              alt={t("access.loadingSoliaAlt")}
              message={t("access.loadingSoliaMessage")}
              speechBubbleClassName="absolute bottom-0 left-0 max-w-[14rem] rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
            />
          </div>
        ) : error ? (
          <section role="alert" aria-labelledby="guest-warranty-error-title" className="solar-ui-panel solar-route-card rounded-[2rem] border-2 border-rose-300 bg-rose-50 p-8 text-rose-950">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            <h1 id="guest-warranty-error-title" className="mt-4 text-2xl font-black">{t("access.errorTitle")}</h1>
            <p className="mt-2 text-sm leading-6">{error}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-6">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> {t("access.retry")}
            </Button>
            <Link href={"/" + locale + "/warranty"} className="ml-3 inline-flex min-h-11 items-center text-sm font-bold underline">{t("access.requestNew")}</Link>
          </section>
        ) : !data ? null : (
          <>
            <section className="solar-ui-panel solar-route-card--strong rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 shadow-[5px_5px_0_rgba(15,23,42,0.12)] sm:p-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sd-blue-600)]">{t("access.portalLabel")}</p>
                  <h1 className="mt-3 text-3xl font-black">{t("access.systemsTitle")}</h1>
                  <p className="mt-2 text-sm text-[var(--sd-text)]">{t("access.expires", { date: dateLabel(data.access.expiresAt) })}</p>
                </div>
                <SoliaGuide
                  className="hidden h-28 w-24 shrink-0 sm:block"
                  pose="blueprint"
                  alt={t("access.soliaAlt")}
                  message={t("access.soliaMessage")}
                  speechBubbleClassName="absolute bottom-0 right-0 max-w-[11rem] translate-x-2 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-2.5 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
                />
              </div>
            </section>

            <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
              <section className="space-y-5" aria-label={t("access.systemsTitle")}>
                {data.projects.length === 0 ? (
                  <div className="solar-ui-panel solar-soft-panel rounded-[2rem] border-2 border-dashed border-[var(--sd-blue-500)]/35 p-7 text-sm text-[var(--sd-text)]">{t("access.emptyProjects")}</div>
                ) : data.projects.map((project) => (
                  <article key={project.id} className="solar-ui-panel solar-route-card rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 sm:p-8">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="font-mono text-xs font-bold text-[var(--sd-blue-500)]">{project.projectCode}</p>
                        <h2 className="mt-2 text-xl font-black">{statusLabel(project.state)}</h2>
                        <p className="mt-1 text-sm text-[var(--sd-text)]">{t("access.systemSize", { size: project.systemSizeKwp || "—", panels: project.panelCount ?? "—" })}</p>
                      </div>
                      <span className="rounded-full bg-[var(--sd-selected)] px-3 py-1 text-xs font-black text-[var(--sd-blue-600)]">{statusLabel(project.installationWarranty?.status || "PENDING")}</span>
                    </div>

                    {project.site ? <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-[var(--sd-text)]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sd-blue-500)]" aria-hidden="true" />{[project.site.label, project.site.addressLine1, project.site.city, project.site.province].filter(Boolean).join(", ")}</p> : null}
                    {project.nextVisit ? <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-[var(--sd-text)]"><CalendarDays className="h-4 w-4 text-[var(--sd-blue-500)]" aria-hidden="true" />{t("access.nextVisit", { status: statusLabel(project.nextVisit.status), date: dateLabel(project.nextVisit.scheduledStart) })}</p> : null}
                    {project.installationWarranty ? <div className="mt-6 rounded-2xl bg-[var(--sd-cyan-100)] p-4"><p className="flex items-center gap-2 text-sm font-black text-[var(--sd-blue-600)]"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> {t("access.installationCoverage")}</p><p className="mt-2 text-sm text-[var(--sd-text)]">{dateLabel(project.installationWarranty.startsAt)} – {dateLabel(project.installationWarranty.endsAt)}</p></div> : null}
                  </article>
                ))}
              </section>

              <aside className="space-y-5">
                <section className="solar-ui-panel solar-route-card rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6" aria-labelledby="guest-installed-equipment-title">
                  <h2 id="guest-installed-equipment-title" className="flex items-center gap-2 text-lg font-black"><Wrench className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /> {t("access.installedEquipment")}</h2>
                  {data.assets.length === 0 ? <p className="mt-4 text-sm text-[var(--sd-muted)]">{t("access.emptyAssets")}</p> : <div className="mt-4 space-y-3">{data.assets.map((asset) => <div key={asset.id} className="solar-soft-panel rounded-2xl p-4"><p className="font-bold">{asset.productName}</p><p className="mt-1 font-mono text-xs text-[var(--sd-muted)]">{asset.serialNumber}</p><p className="mt-2 text-xs text-[var(--sd-text)]">{t("access.coveredUntil", { status: statusLabel(asset.status), date: dateLabel(asset.warrantyExpiryDate) })}</p></div>)}</div>}
                </section>

                <section className="solar-ui-panel solar-route-card rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6" aria-labelledby="guest-equipment-warranties-title">
                  <h2 id="guest-equipment-warranties-title" className="text-lg font-black">{t("access.equipmentWarranties")}</h2>
                  {data.warranties.product.length === 0 ? <p className="mt-4 text-sm text-[var(--sd-muted)]">{t("access.emptyWarranties")}</p> : <div className="mt-4 space-y-3">{data.warranties.product.map((warranty) => <div key={warranty.id} className="solar-soft-panel rounded-2xl p-4"><p className="font-bold">{warranty.productName}</p><p className="mt-1 text-xs text-[var(--sd-muted)]">{warranty.provider} · {warranty.asset.serialNumber}</p><p className="mt-2 text-xs font-semibold text-[var(--sd-blue-600)]">{t("access.warrantyUntil", { status: statusLabel(warranty.status), date: dateLabel(warranty.endsAt) })}</p></div>)}</div>}
                </section>

                <Link href={"/" + locale + "/support"} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--sd-blue-600)] hover:underline">{t("access.serviceHelp")} <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link>
              </aside>
            </div>
          </>
        )}
      </div>
    </SolarRouteShell>
  );
}
