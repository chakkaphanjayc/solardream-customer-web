"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertTriangle, ArrowLeft, CheckCircle2, LifeBuoy, RefreshCw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
import { SolarStatePanel } from "@/components/ui/solar-system";

type ProjectOption = { id: string; projectCode: string; state: string; site: { label: string } | null };
type AssetOption = { id: string; projectId: string | null; productName: string; serialNumber: string; status: string };
type ServiceCase = { id: string; caseNumber: string; subject: string; status: string; priority: string; createdAt: string };

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerServiceClient({ enabled, afterSalesEnabled }: { enabled: boolean; afterSalesEnabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations("CustomerPortal");
  const serviceEnabled = enabled && afterSalesEnabled;
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [cases, setCases] = useState<ServiceCase[]>([]);
  const [projectId, setProjectId] = useState("");
  const [assetId, setAssetId] = useState("");
  const [type, setType] = useState("REPAIR");
  const [priority, setPriority] = useState("NORMAL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(serviceEnabled);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const statusLabel = (value: string) => {
    const key = value.trim().toUpperCase().replaceAll("-", "_");
    const labels: Record<string, string> = {
      OPEN: t("service.status.OPEN"),
      PENDING: t("service.status.PENDING"),
      IN_PROGRESS: t("service.status.IN_PROGRESS"),
      RESOLVED: t("service.status.RESOLVED"),
      CLOSED: t("service.status.CLOSED"),
    };
    return labels[key] ?? titleCase(value);
  };

  const priorityLabel = (value: string) => {
    const key = value.trim().toUpperCase().replaceAll("-", "_");
    const labels: Record<string, string> = {
      NORMAL: t("service.priorityValues.NORMAL"),
      LOW: t("service.priorityValues.LOW"),
      HIGH: t("service.priorityValues.HIGH"),
      URGENT: t("service.priorityValues.URGENT"),
    };
    return labels[key] ?? titleCase(value);
  };

  const queryProjectId = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("projectId") || "";
  }, []);

  const load = useCallback(async () => {
    if (!serviceEnabled) return;
    setLoading(true);
    setError("");
    try {
      const [projectResponse, assetResponse, caseResponse] = await Promise.all([
        fetch("/api/v2/customer/projects", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/v2/customer/assets", { cache: "no-store", credentials: "same-origin" }),
        fetch("/api/v2/customer/service-cases", { cache: "no-store", credentials: "same-origin" }),
      ]);
      const projectPayload = await projectResponse.json() as { success?: boolean; data?: ProjectOption[]; error?: { message?: string } };
      const assetPayload = await assetResponse.json() as { success?: boolean; data?: AssetOption[]; error?: { message?: string } };
      const casePayload = await caseResponse.json() as { success?: boolean; data?: ServiceCase[]; error?: { message?: string } };
      if (!projectResponse.ok || !projectPayload.success || !projectPayload.data) throw new Error(projectPayload.error?.message || t("service.errors.projects"));
      if (!assetResponse.ok || !assetPayload.success || !assetPayload.data) throw new Error(assetPayload.error?.message || t("service.errors.assets"));
      if (!caseResponse.ok || !casePayload.success || !casePayload.data) throw new Error(casePayload.error?.message || t("service.errors.cases"));
      setProjects(projectPayload.data);
      setAssets(assetPayload.data);
      setCases(casePayload.data);
      if (queryProjectId && projectPayload.data.some((project) => project.id === queryProjectId)) setProjectId(queryProjectId);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("service.errors.load"));
    } finally {
      setLoading(false);
    }
  }, [queryProjectId, serviceEnabled, t]);

  // This effect hydrates customer support context from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!serviceEnabled) return;
    setSubmitting(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/v2/customer/service-cases", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json", "Idempotency-Key": crypto.randomUUID() },
        body: JSON.stringify({ projectId: projectId || null, assetId: assetId || null, type, priority, subject, description }),
      });
      const payload = await response.json() as { success?: boolean; data?: { serviceCase?: ServiceCase }; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data?.serviceCase) throw new Error(payload.error?.message || t("service.errors.submit"));
      setCases((current) => [payload.data?.serviceCase as ServiceCase, ...current]);
      setSubject("");
      setDescription("");
      setSuccess(t("service.submitted"));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("service.errors.submit"));
    } finally {
      setSubmitting(false);
    }
  };

  const visibleAssets = projectId ? assets.filter((asset) => !asset.projectId || asset.projectId === projectId) : assets;

  return (
    <OpsPortalShell enabled={enabled} title={t("service.title")} description={t("service.description")}>
      <Link href={"/" + locale + "/portal/projects"} className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[var(--sd-navy-900)] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> {t("service.backProjects")}</Link>
      {!afterSalesEnabled ? <SolarStatePanel
        className="mt-5"
        kind="empty"
        title={t("service.disabledTitle")}
        description={t("service.disabledDescription")}
        soliaAlt={t("service.disabledAlt")}
        action={<Link href={"/" + locale + "/portal/warranty"} className="solar-ui-primary inline-flex min-h-11 items-center justify-center rounded-full px-5 py-3 text-sm font-bold">{t("service.openWarranty")}</Link>}
      /> : loading ? <SolarStatePanel
        className="mt-5 min-h-96"
        kind="loading"
        title={t("service.loadingTitle")}
        description={t("service.loadingDescription")}
        soliaAlt={t("service.loadingAlt")}
      /> : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submit} aria-busy={submitting} className="solar-route-card solar-route-card--strong rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-1)] sm:p-8">
            <div className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-[var(--sd-blue-600)]" aria-hidden="true" /><h2 className="text-xl font-bold text-[var(--sd-ink)]">{t("service.openCase")}</h2></div>
            <p className="mt-2 text-sm font-medium leading-6 text-[var(--sd-text)]">{t("service.formHint")}</p>
            {error && <div role="alert" className="mt-5 flex items-start gap-2 rounded-[var(--sd-radius-surface)] border border-rose-300 bg-rose-50 p-3.5 text-sm text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" /><span className="min-w-0 flex-1">{error}</span><Button type="button" variant="quiet" size="sm" onClick={() => void load()} className="min-h-9 shrink-0 rounded-full px-3 text-xs font-bold text-rose-900">{t("service.tryAgain")}</Button></div>}
            {success && <div role="status" className="mt-5 flex gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{success}</div>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-[var(--sd-ink)]">{t("service.projects")}<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setAssetId(""); }} className="mt-2 min-h-11 w-full rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-blue-600)] focus:bg-[var(--sd-raised)]"><option value="">{t("service.generalSupport")}</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.projectCode}{project.site ? " · " + project.site.label : ""}</option>)}</select></label>
              <label className="text-sm font-bold text-[var(--sd-ink)]">{t("service.equipment")}<select value={assetId} onChange={(event) => setAssetId(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-blue-600)] focus:bg-[var(--sd-raised)]"><option value="">{t("service.unspecified")}</option>{visibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.productName} · {asset.serialNumber}</option>)}</select></label>
              <label className="text-sm font-bold text-[var(--sd-ink)]">{t("service.requestType")}<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-blue-600)] focus:bg-[var(--sd-raised)]"><option value="REPAIR">{t("service.repair")}</option><option value="CLAIM">{t("service.claim")}</option><option value="MAINTENANCE">{t("service.maintenance")}</option><option value="QUESTION">{t("service.question")}</option></select></label>
              <label className="text-sm font-bold text-[var(--sd-ink)]">{t("service.priority")}<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-blue-600)] focus:bg-[var(--sd-raised)]"><option value="NORMAL">{t("service.normal")}</option><option value="LOW">{t("service.low")}</option><option value="HIGH">{t("service.high")}</option><option value="URGENT">{t("service.urgent")}</option></select></label>
            </div>
            <label className="mt-4 block text-sm font-bold text-[var(--sd-ink)]">{t("service.subject")}<input required maxLength={240} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 min-h-11 w-full rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-blue-600)] focus:bg-[var(--sd-raised)]" /></label>
            <label className="mt-4 block text-sm font-bold text-[var(--sd-ink)]">{t("service.descriptionLabel")}<textarea required maxLength={10000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-[var(--sd-radius-control)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-3 py-3 text-sm font-medium text-[var(--sd-ink)] outline-none transition focus:border-[var(--sd-blue-600)] focus:bg-[var(--sd-raised)]" /></label>
            <Button type="submit" disabled={submitting} className="solar-ui-primary mt-5 w-full rounded-full px-6 py-3 font-bold shadow-md transition-all active:scale-95">{submitting ? t("service.submitting") : t("service.submit")}</Button>
          </form>
          <section className="solar-route-card solar-route-card--strong rounded-[var(--sd-radius-panel)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-6 shadow-[var(--sd-shadow-1)] sm:p-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-[var(--sd-ink)]">{t("service.cases")}</h2><Button type="button" variant="quiet" size="icon" onClick={() => void load()} aria-label={t("service.refresh")} className="min-h-11 min-w-11 rounded-full bg-[var(--sd-soft-solar)] text-[var(--sd-ink)] hover:bg-[var(--sd-selected)]"><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button></div>{cases.length === 0 ? <SolarStatePanel kind="empty" className="mt-5" title={t("service.emptyTitle")} description={t("service.noCases")} soliaAlt={t("service.emptyAlt")} /> : <div className="mt-5 space-y-3">{cases.map((item) => <div key={item.id} className="solar-soft-panel rounded-[var(--sd-radius-surface)] border border-[var(--sd-line)] p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-[var(--sd-ink)]">{item.caseNumber}</p><span className="solar-ui-status" data-tone={item.status === "RESOLVED" ? "success" : item.priority === "URGENT" ? "danger" : undefined}>{statusLabel(item.status)}</span></div><p className="mt-2 text-sm font-medium text-[var(--sd-ink)]">{item.subject}</p><p className="mt-2 text-xs font-medium text-[var(--sd-muted)]">{priorityLabel(item.priority)} {t("service.prioritySuffix")} · {new Date(item.createdAt).toLocaleDateString(locale === "th" ? "th-TH" : "en-US")}</p></div>)}</div>}</section>
        </div>
      )}
    </OpsPortalShell>
  );
}
