"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowLeft, CalendarDays, CheckCircle2, Circle, ClipboardCheck, LifeBuoy, MapPin, RefreshCw, ShieldCheck, Wrench } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type ProjectStatus = {
  project: {
    id: string;
    projectCode: string;
    state: string;
    systemSizeKwp: number;
    panelCount: number;
    site: { label: string; addressLine1: string; city: string; province: string; postalCode: string; country: string; accessNotes: string | null } | null;
    updatedAt: string;
  };
  tasks: Array<{ id: string; code: string; title: string; status: string; completedAt: string | null; checklist: Array<{ label: string; status: string; outcome: string | null }> }>;
  visits: Array<{ id: string; type: string; status: string; scheduledStart: string | null; scheduledEnd: string | null; timezone: string }>;
  assets: Array<{ id: string; productName: string; serialNumber: string; status: string; installedDate: string; warrantyExpiryDate: string }>;
  installationWarranty: { status: string; policyVersion: string; startsAt: string | null; endsAt: string | null } | null;
  serviceCases: Array<{ id: string; caseNumber: string; subject: string; status: string; priority: string; createdAt: string }>;
};

type ProjectPayload = { success?: boolean; data?: ProjectStatus; error?: { message?: string } };

function formatDate(value: string | null, locale: string, pendingLabel: string) {
  if (!value) return pendingLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return pendingLabel;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerProjectDetailClient({ enabled, projectId }: { enabled: boolean; projectId: string }) {
  const locale = useLocale();
  const t = useTranslations("CustomerPortal");
  const [data, setData] = useState<ProjectStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const dateLabel = (value: string | null) => formatDate(value, locale, t("common.datePending"));

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
    if (!enabled || !projectId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v2/customer/projects/" + encodeURIComponent(projectId), { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as ProjectPayload;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || t("detail.errorTitle"));
      setData(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("detail.errorTitle"));
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId, t]);

  // This effect hydrates the project status from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <OpsPortalShell enabled={enabled} title={t("detail.title")} description={t("detail.description")}>
      <Link href={"/" + locale + "/portal/projects"} className="inline-flex min-h-11 items-center gap-2 text-sm font-black text-[var(--sd-blue-600)] hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("detail.backToProjects")}
      </Link>

      {loading ? (
        <SolarStatePanel
          className="mt-5"
          kind="loading"
          title={t("detail.loadingTitle")}
          description={t("detail.loadingDescription")}
          soliaAlt={t("detail.loadingAlt")}
        />
      ) : error ? (
        <SolarStatePanel
          className="mt-5"
          kind="error"
          title={t("detail.errorTitle")}
          description={error}
          soliaAlt={t("detail.errorAlt")}
          action={
            <Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-2">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> {t("detail.tryAgain")}
            </Button>
          }
        />
      ) : !data ? (
        <SolarStatePanel
          className="mt-5"
          kind="empty"
          title={t("detail.emptyTitle")}
          description={t("detail.emptyDescription")}
          soliaAlt={t("detail.emptyAlt")}
        />
      ) : (
        <div className="mt-5 space-y-5">
          <section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-[var(--sd-navy-950)] p-6 text-white shadow-[5px_5px_0_rgba(15,23,42,0.18)] sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[var(--sd-cyan-100)]">{data.project.projectCode}</p>
                <h2 className="mt-2 text-3xl font-black">{t("detail.systemTitle", { size: data.project.systemSizeKwp })}</h2>
                <p className="mt-2 text-sm text-slate-300">{t("detail.system", { size: data.project.systemSizeKwp, panels: data.project.panelCount })} · {statusLabel(data.project.state)}</p>
              </div>
              <Link href={"/" + locale + "/portal/service?projectId=" + encodeURIComponent(data.project.id)} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "shrink-0")}>
                <LifeBuoy className="h-4 w-4" aria-hidden="true" /> {t("detail.requestSupport")}
              </Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-bold text-slate-400">{t("detail.system")}</p><p className="mt-1 font-bold">{t("detail.system", { size: data.project.systemSizeKwp, panels: data.project.panelCount })}</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-bold text-slate-400">{t("detail.lastUpdated")}</p><p className="mt-1 font-bold">{dateLabel(data.project.updatedAt)}</p></div>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm text-slate-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sd-cyan-100)]" aria-hidden="true" /><span>{data.project.site ? [data.project.site.label, data.project.site.addressLine1, data.project.site.city, data.project.site.province, data.project.site.postalCode].filter(Boolean).join(" · ") : t("common.sitePending")}</span></p>
          </section>

          <section className="solar-route-card solar-route-card--strong rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 sm:p-8" aria-labelledby="customer-project-delivery-title">
            <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /><h2 id="customer-project-delivery-title" className="text-xl font-black">{t("detail.deliveryTimeline")}</h2></div>
            {data.tasks.length === 0 ? <p className="mt-5 text-sm text-[var(--sd-muted)]">{t("detail.noTasks")}</p> : <div className="mt-6 space-y-4">{data.tasks.map((task) => {
              const complete = task.status === "COMPLETED";
              const completedChecks = task.checklist.filter((item) => item.status === "COMPLETED").length;
              return <div key={task.id} className="flex gap-3"><div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full", complete ? "bg-emerald-100 text-emerald-700" : "bg-[var(--sd-selected)] text-[var(--sd-blue-500)]")}>{complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}</div><div className="min-w-0 flex-1 border-b border-[#0F172A]/10 pb-4 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{task.title}</p><span className="text-xs font-bold text-[var(--sd-muted)]">{statusLabel(task.status)}</span></div>{task.checklist.length > 0 && <p className="mt-1 text-xs text-[var(--sd-muted)]">{t("detail.checksComplete", { completed: completedChecks, total: task.checklist.length })}</p>}</div></div>;
            })}</div>}
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="solar-route-card solar-route-card--strong rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6" aria-labelledby="customer-project-visits-title">
              <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /><h2 id="customer-project-visits-title" className="text-xl font-black">{t("detail.fieldVisits")}</h2></div>
              {data.visits.length === 0 ? <p className="mt-5 text-sm text-[var(--sd-muted)]">{t("detail.noFieldVisit")}</p> : <div className="mt-4 space-y-3">{data.visits.map((visit) => <div key={visit.id} className="solar-soft-panel rounded-2xl p-4"><div className="flex justify-between gap-3"><p className="font-bold">{titleCase(visit.type)}</p><span className="text-xs font-bold text-[var(--sd-blue-600)]">{statusLabel(visit.status)}</span></div><p className="mt-2 text-sm text-[var(--sd-text)]">{dateLabel(visit.scheduledStart)}{visit.scheduledEnd ? " – " + dateLabel(visit.scheduledEnd) : ""}</p></div>)}</div>}
            </section>

            <section className="solar-route-card solar-route-card--strong rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6" aria-labelledby="customer-project-warranty-title">
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /><h2 id="customer-project-warranty-title" className="text-xl font-black">{t("detail.warranty")}</h2></div>
              {data.installationWarranty ? <div className="mt-4 rounded-2xl bg-[var(--sd-selected)] p-4"><p className="font-bold">{statusLabel(data.installationWarranty.status)}</p><p className="mt-2 text-sm text-[var(--sd-text)]">{data.installationWarranty.policyVersion}</p><p className="mt-1 text-sm text-[var(--sd-text)]">{dateLabel(data.installationWarranty.startsAt)} – {dateLabel(data.installationWarranty.endsAt)}</p></div> : <p className="mt-5 text-sm text-[var(--sd-muted)]">{t("detail.warrantyPending")}</p>}
              <Link href={"/" + locale + "/portal/warranties"} className="mt-4 inline-flex min-h-11 items-center text-sm font-black text-[var(--sd-blue-600)] hover:underline">{t("detail.viewAllWarranties")}</Link>
            </section>
          </div>

          <section className="solar-route-card solar-route-card--strong rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 sm:p-8" aria-labelledby="customer-project-support-title">
            <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[var(--sd-blue-500)]" aria-hidden="true" /><h2 id="customer-project-support-title" className="text-xl font-black">{t("detail.equipmentSupport")}</h2></div><Link href={"/" + locale + "/portal/service?projectId=" + encodeURIComponent(data.project.id)} className="inline-flex min-h-11 items-center text-sm font-black text-[var(--sd-blue-600)] hover:underline">{t("detail.openCase")}</Link></div>
            {data.assets.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.assets.map((asset) => <div key={asset.id} className="solar-soft-panel rounded-2xl p-4"><p className="font-bold">{asset.productName}</p><p className="mt-1 font-mono text-xs text-[var(--sd-muted)]">{asset.serialNumber}</p><p className="mt-2 text-xs text-[var(--sd-text)]">{t("detail.warrantyUntil", { date: dateLabel(asset.warrantyExpiryDate) })}</p></div>)}</div>}
            {data.serviceCases.length > 0 && <div className="mt-5 border-t border-[#0F172A]/10 pt-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--sd-blue-500)]">{t("detail.recentCases")}</p><div className="mt-3 space-y-2">{data.serviceCases.slice(0, 5).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">{item.caseNumber} · {item.subject}</span><span className="text-xs font-bold text-[var(--sd-muted)]">{statusLabel(item.status)}</span></div>)}</div></div>}
          </section>
        </div>
      )}
    </OpsPortalShell>
  );
}
