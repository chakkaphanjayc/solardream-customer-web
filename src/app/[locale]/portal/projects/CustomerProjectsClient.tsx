"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { Button, buttonVariants } from "@/components/ui/button";
import { ArrowRight, CalendarClock, CheckCircle2, MapPin, RefreshCw } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

type Project = {
  id: string;
  projectCode: string;
  state: string;
  systemSizeKwp: number;
  panelCount: number;
  site: { label: string; addressLine1: string; city: string; province: string; country: string } | null;
  nextVisit: { status: string; scheduledStart: string | null; scheduledEnd: string | null } | null;
  installationWarranty: { status: string; startsAt: string | null; endsAt: string | null } | null;
  updatedAt: string;
  customerName: string;
};

type ProjectsPayload = { success?: boolean; data?: Project[]; error?: { message?: string } };

function formatDate(value: string | null, locale: string, pendingLabel: string) {
  if (!value) return pendingLabel;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return pendingLabel;

  return new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", { dateStyle: "medium" }).format(date);
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerProjectsClient({ enabled }: { enabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations("CustomerPortal");
  const [projects, setProjects] = useState<Project[]>([]);
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
      const response = await fetch("/api/v2/customer/projects", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as ProjectsPayload;
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || t("projects.errorTitle"));
      setProjects(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("projects.errorTitle"));
    } finally {
      setLoading(false);
    }
  }, [enabled, t]);

  // This effect hydrates the customer project list from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <OpsPortalShell enabled={enabled} title={t("projects.title")} description={t("projects.description")}>
      {loading ? (
        <SolarStatePanel
          kind="loading"
          title={t("projects.loadingTitle")}
          description={t("projects.loadingDescription")}
          soliaAlt={t("projects.loadingAlt")}
        />
      ) : error ? (
        <SolarStatePanel
          kind="error"
          title={t("projects.errorTitle")}
          description={error}
          soliaAlt={t("projects.errorAlt")}
          action={<Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-2 rounded-full"><RefreshCw className="h-4 w-4" aria-hidden="true" /> {t("projects.tryAgain")}</Button>}
        />
      ) : projects.length === 0 ? (
        <SolarStatePanel
          kind="empty"
          title={t("projects.emptyTitle")}
          description={t("projects.emptyDescription")}
          soliaAlt={t("projects.emptyAlt")}
          action={<Link href={`/${locale}/wizard`} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-2")}>{t("projects.startPlan")}</Link>}
        />
      ) : (
        <section className="grid gap-4 md:grid-cols-2" aria-label={t("projects.title")}>
          {projects.map((project) => (
            <article key={project.id} className="solar-route-card solar-route-card--strong rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-5 shadow-[var(--sd-shadow-1)] transition-transform duration-300 hover:-translate-y-0.5 sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--sd-blue-500)]">{project.projectCode}</p>
                  <h2 className="mt-2 text-xl font-bold text-[var(--sd-ink)]">{t("projects.systemTitle", { size: project.systemSizeKwp })}</h2>
                  <p className="mt-1 text-sm font-medium text-[var(--sd-text)]">{t("projects.updated", { panels: project.panelCount, date: formatDate(project.updatedAt, locale, t("common.datePending")) })}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[var(--sd-line)] bg-[var(--sd-selected)] px-3.5 py-1 text-xs font-bold text-[var(--sd-ink)]">{statusLabel(project.state)}</span>
              </div>
              <div className="mt-6 space-y-3 border-t border-[var(--sd-line)] pt-5 text-sm">
                <p className="flex items-start gap-2 font-medium text-[var(--sd-text)]"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sd-blue-500)]" aria-hidden="true" /><span>{project.site ? [project.site.label, project.site.addressLine1, project.site.city].filter(Boolean).join(" · ") : t("common.sitePending")}</span></p>
                <p className="flex items-center gap-2 font-medium text-[var(--sd-text)]"><CalendarClock className="h-4 w-4 shrink-0 text-[var(--sd-blue-500)]" aria-hidden="true" /><span>{project.nextVisit ? formatDate(project.nextVisit.scheduledStart, locale, t("common.datePending")) : t("projects.nextVisitPending")}</span></p>
                <p className="flex items-center gap-2 font-medium text-[var(--sd-text)]"><CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--sd-blue-500)]" aria-hidden="true" /><span>{t("projects.warrantyStatus", { status: statusLabel(project.installationWarranty?.status || "PENDING") })}</span></p>
              </div>
              <Link href={"/" + locale + "/portal/projects/" + project.id} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-6 inline-flex w-full justify-center")}>{t("projects.viewStatus")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </article>
          ))}
        </section>
      )}
    </OpsPortalShell>
  );
}
