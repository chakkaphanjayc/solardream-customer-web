"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, RefreshCw, ShieldCheck, Wrench } from "@/components/ui/icons";

type WarrantyData = {
  installation: Array<{ id: string; projectId: string; status: string; policyVersion: string; startsAt: string | null; endsAt: string | null }>;
  product: Array<{ id: string; provider: string; productName: string; status: string; startsAt: string | null; endsAt: string | null; asset: { id: string; serialNumber: string; productName: string } }>;
};

type WarrantyPayload = { success?: boolean; data?: WarrantyData; error?: { message?: string } };

function formatDate(value: string | null, locale: string, pendingLabel: string) {
  if (!value) return pendingLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return pendingLabel;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium" }).format(date);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerWarrantiesClient({ enabled }: { enabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations("CustomerPortal");
  const [data, setData] = useState<WarrantyData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const statusLabel = (value: string) => {
    const statusLabels: Record<string, string> = {
      PENDING: t("status.pending"),
      COMPLETED: t("status.completed"),
      ACTIVE: t("status.active"),
      SCHEDULED: t("status.scheduled"),
      INSTALLED: t("status.installed"),
      EXPIRED: t("status.expired"),
      CANCELLED: t("status.cancelled"),
      IN_PROGRESS: t("status.inProgress"),
      REQUESTED: t("status.requested"),
    };

    return statusLabels[value.trim().toUpperCase().replaceAll("-", "_")] ?? titleCase(value);
  };

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v2/customer/warranties", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as WarrantyPayload;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || t("warranties.errorTitle"));
      setData(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("warranties.errorTitle"));
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  // This effect hydrates warranty records from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <OpsPortalShell enabled={enabled} title={t("warranties.title")} description={t("warranties.description")}>
      {loading ? (
        <SolarStatePanel kind="loading" title={t("warranties.loadingTitle")} description={t("warranties.loadingDescription")} soliaAlt={t("warranties.loadingAlt")} />
      ) : error ? (
        <SolarStatePanel
          kind="error"
          title={t("warranties.errorTitle")}
          description={error}
          soliaAlt={t("warranties.errorAlt")}
          action={<Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-2 rounded-full"><RefreshCw className="h-4 w-4" aria-hidden="true" /> {t("warranties.tryAgain")}</Button>}
        />
      ) : !data ? (
        <SolarStatePanel kind="empty" title={t("warranties.emptyTitle")} description={t("warranties.emptyDescription")} soliaAlt={t("warranties.emptyAlt")} />
      ) : (
        <div className="space-y-5">
          <Link href={"/" + locale + "/portal/projects"} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sd-blue-500)] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("warranties.backToProjects")}</Link>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="solar-route-card solar-route-card--strong rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-1)] sm:p-8" aria-labelledby="customer-installation-coverage-title">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /><h2 id="customer-installation-coverage-title" className="text-xl font-bold text-[var(--sd-ink)]">{t("warranties.installationCoverage")}</h2></div>
              {data.installation.length === 0 ? <p className="mt-5 text-sm font-medium text-[var(--sd-muted)]">{t("warranties.noInstallation")}</p> : <div className="mt-5 space-y-3">{data.installation.map((item) => <div key={item.id} className="solar-soft-panel rounded-2xl border border-[var(--sd-line)] p-4"><div className="flex justify-between gap-3"><p className="font-bold text-[var(--sd-ink)]">{item.policyVersion}</p><span className="text-xs font-bold text-[var(--sd-blue-600)]">{statusLabel(item.status)}</span></div><p className="mt-2 flex items-center gap-2 text-sm font-medium text-[var(--sd-text)]"><CalendarDays className="h-4 w-4 text-[var(--sd-blue-500)]" aria-hidden="true" />{formatDate(item.startsAt, locale, t("common.pendingActivation"))} – {formatDate(item.endsAt, locale, t("common.pendingActivation"))}</p></div>)}</div>}
            </section>

            <section className="solar-route-card solar-route-card--strong rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-1)] sm:p-8" aria-labelledby="customer-equipment-coverage-title">
              <div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /><h2 id="customer-equipment-coverage-title" className="text-xl font-bold text-[var(--sd-ink)]">{t("warranties.equipmentCoverage")}</h2></div>
              {data.product.length === 0 ? <p className="mt-5 text-sm font-medium text-[var(--sd-muted)]">{t("warranties.noEquipment")}</p> : <div className="mt-5 space-y-3">{data.product.map((item) => <div key={item.id} className="solar-soft-panel rounded-2xl border border-[var(--sd-line)] p-4"><div className="flex justify-between gap-3"><p className="font-bold text-[var(--sd-ink)]">{item.productName}</p><span className="text-xs font-bold text-[var(--sd-blue-600)]">{statusLabel(item.status)}</span></div><p className="mt-1 font-mono text-xs text-[var(--sd-text)]">{item.asset.serialNumber}</p><p className="mt-2 text-sm font-medium text-[var(--sd-text)]">{item.provider} · {t("common.warrantyUntil", { date: formatDate(item.endsAt, locale, t("common.pendingActivation")) })}</p></div>)}</div>}
            </section>
          </div>
          <Link href={"/" + locale + "/portal/service"} className="solar-ui-primary inline-flex min-h-11 items-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold shadow-[var(--sd-shadow-1)]"><Wrench className="h-4 w-4" aria-hidden="true" /> {t("warranties.askWarranty")}</Link>
        </div>
      )}
    </OpsPortalShell>
  );
}
