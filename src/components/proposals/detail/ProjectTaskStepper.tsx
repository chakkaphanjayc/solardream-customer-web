"use client";

import { Check, CheckCircle2, Circle, Clock3, ImageIcon, LockKeyhole, Upload } from "@/components/ui/icons";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";

import { cn } from "@/lib/utils";
import type { ClientInstallationChecklistItem, ClientInstallationSnapshot, ClientInstallationTask } from "@/types/proposals";
import { INSTALLATION_FIELD_STAGES } from "@/types/techPortal";

function idempotencyKey(scope: string) {
  return `${scope}:${crypto.randomUUID()}`;
}

async function responseError(response: Response, fallback: string) {
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return body?.error || fallback;
}

function uploadEvidence(file: File, itemId: string, coordinate: GeolocationCoordinates | null, onProgress: (value: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const form = new FormData();
    form.set("itemId", itemId);
    form.set("file", file);
    form.set("idempotencyKey", idempotencyKey("evidence"));
    form.set("capturedAt", new Date().toISOString());
    if (coordinate) {
      form.set("latitude", String(coordinate.latitude));
      form.set("longitude", String(coordinate.longitude));
    }
    const request = new XMLHttpRequest();
    request.open("POST", "/api/installations/evidence");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () => reject(new Error("Evidence upload failed."));
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else {
        try { reject(new Error((JSON.parse(request.responseText) as { error?: string }).error || "Evidence upload failed.")); }
        catch { reject(new Error("Evidence upload failed.")); }
      }
    };
    request.send(form);
  });
}

function optionalPosition() {
  return new Promise<GeolocationCoordinates | null>((resolve) => {
    if (!("geolocation" in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition((position) => resolve(position.coords), () => resolve(null), { enableHighAccuracy: true, timeout: 5_000, maximumAge: 30_000 });
  });
}

function TaskChecklistPanel({ task, refresh }: { task: ClientInstallationTask; refresh: () => Promise<void> }) {
  const t = useTranslations("ProjectTaskStepper");
  const locale = useLocale();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState<Record<string, string>>({});
  const [amendLabel, setAmendLabel] = useState<Record<string, string>>({});
  const [amendReason, setAmendReason] = useState<Record<string, string>>({});
  const [outcome, setOutcome] = useState<Record<string, "PASS" | "FAIL" | "NA">>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const run = async (key: string, action: () => Promise<Response>) => {
    setBusyKey(key);
    setError(null);
    try {
      const response = await action();
      if (!response.ok) throw new Error(await responseError(response, t("errorUpdate")));
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errorUpdate"));
      await refresh();
    } finally {
      setBusyKey(null);
    }
  };

  const upload = async (item: ClientInstallationChecklistItem, file: File | null) => {
    if (!file) return;
    setBusyKey(`upload:${item.id}`);
    setProgress(0);
    setError(null);
    try {
      await uploadEvidence(file, item.id, await optionalPosition(), setProgress);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("errorEvidence"));
      await refresh();
    } finally {
      setBusyKey(null);
      setProgress(0);
    }
  };

  return (
    <div className="mt-4 border-t border-[var(--sd-line)] pt-4">
      {error ? <p role="alert" className="mb-3 rounded-[16px] border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800">{error}</p> : null}
      <ul className="space-y-3">
        {task.checklist.map((item) => {
          const verified = item.status.toUpperCase() === "VERIFIED";
          const readyEvidence = item.evidence.filter((evidence) => evidence.status === "READY");
          const canExecute = task.capabilities.canExecute && !verified;
          const canSetOutcome = !verified && (canExecute || task.capabilities.canReview);
          const selectedOutcome = outcome[item.id] || (canExecute ? "PASS" : "NA");
          const itemRemarks = remarks[item.id] || "";
          const needsEvidence = selectedOutcome !== "NA" && item.evidenceRequired;
          const remarksRequired = selectedOutcome === "NA" || selectedOutcome === "FAIL";
          return (
            <li key={item.id} className="rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-4 shadow-[var(--sd-shadow-1)]">
              <div className="flex min-h-11 items-center gap-3 text-xs font-bold text-[var(--sd-ink)]">
                {verified ? <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--sd-success)] stroke-[2.5]" aria-hidden /> : <LockKeyhole className="h-4 w-4 shrink-0 text-[var(--sd-muted)] stroke-[2]" aria-hidden />}
                <span className="min-w-0 flex-1">{item.label}</span>
                {item.evidenceRequired && item.outcome !== "NA" ? <span className="inline-flex items-center gap-1 rounded-full bg-[var(--sd-selected)] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[var(--sd-blue-600)]"><ImageIcon className="h-3.5 w-3.5" aria-hidden /> {readyEvidence.length > 0 ? t("status.ready") : t("status.required")}</span> : null}
              </div>

              {verified ? (
                <div className={cn("mt-2 rounded-[var(--sd-radius-md)] border p-3 text-xs", item.outcome === "FAIL" ? "border-rose-200 bg-rose-50 text-rose-900" : "border-[var(--sd-line)] bg-[var(--sd-raised)] text-[var(--sd-ink)]")}>
                  <p className="font-bold">{t("outcome")}: {item.outcome || "VERIFIED"}</p>
                  {item.remarks ? <p className="mt-1 font-medium">{t("remarks")}: {item.remarks}</p> : null}
                  <p className="mt-1 font-mono text-[10px] opacity-80">{t("verified")} {item.verifiedAt ? new Date(item.verifiedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US") : ""}{item.verifiedByUserId ? ` ${t("by", { id: item.verifiedByUserId })}` : ""}</p>
                </div>
              ) : null}

              {canSetOutcome ? (
                <fieldset className="mt-3">
                  <legend className="text-xs font-bold uppercase tracking-wider text-[var(--sd-muted)]">{t("checklistOutcome")}</legend>
                  <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {(canExecute ? ["PASS", "FAIL"] as const : []).map((value) => (
                      <label key={value} className={cn("flex min-h-10 cursor-pointer items-center justify-center rounded-[var(--sd-radius-md)] border px-4 text-xs font-bold uppercase transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--sd-blue-600)]", selectedOutcome === value ? "border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]" : "border-[var(--sd-line)] bg-[var(--sd-raised)] text-[var(--sd-muted)] hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] hover:text-[var(--sd-ink)]")}>
                        <input className="sr-only" type="radio" name={`outcome-${item.id}`} value={value} checked={selectedOutcome === value} onChange={() => setOutcome((current) => ({ ...current, [item.id]: value }))} />
                        {value}
                      </label>
                    ))}
                    {(item.allowsNa || task.capabilities.canReview) ? (
                      <label className={cn("flex min-h-10 cursor-pointer items-center justify-center rounded-[var(--sd-radius-md)] border px-4 text-xs font-bold uppercase transition-all focus-within:outline-none focus-within:ring-2 focus-within:ring-[var(--sd-blue-600)]", selectedOutcome === "NA" ? "border-[var(--sd-blue-600)] bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]" : "border-[var(--sd-line)] bg-[var(--sd-raised)] text-[var(--sd-muted)] hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] hover:text-[var(--sd-ink)]")}>
                        <input className="sr-only" type="radio" name={`outcome-${item.id}`} value="NA" checked={selectedOutcome === "NA"} onChange={() => setOutcome((current) => ({ ...current, [item.id]: "NA" }))} />
                        {t("status.notApplicable")}
                      </label>
                    ) : null}
                  </div>
                  <label className="mt-3 block text-xs font-bold uppercase text-[var(--sd-muted)]">
                    {t("remarks")} {remarksRequired ? `(${t("required")})` : `(${t("optional")})`}
                    <textarea value={itemRemarks} onChange={(event) => setRemarks((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 text-xs font-semibold text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-muted)] focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20" required={remarksRequired} />
                  </label>
                </fieldset>
              ) : null}

              {canExecute && task.capabilities.canUploadEvidence && needsEvidence ? (
                <label className="mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-5 text-xs font-bold text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)] transition hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] active:scale-[0.98]">
                  <Upload className="h-4 w-4 text-[var(--sd-blue-600)]" aria-hidden />
                  {busyKey === `upload:${item.id}` ? t("uploading", { progress }) : readyEvidence.length > 0 ? t("replaceEvidence") : t("captureEvidence")}
                  <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" disabled={busyKey !== null} onChange={(event) => void upload(item, event.currentTarget.files?.[0] || null)} />
                </label>
              ) : null}

              {canSetOutcome ? (
                <button type="button" disabled={busyKey !== null || (needsEvidence && readyEvidence.length === 0) || (remarksRequired && itemRemarks.trim().length < 3)} onClick={() => void run(`verify:${item.id}`, () => fetch(`/api/installations/checklist/${item.id}/complete`, { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": idempotencyKey("checklist") }, body: JSON.stringify({ outcome: selectedOutcome, remarks: itemRemarks.trim() || undefined }) }))} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-5 text-xs font-bold uppercase text-white shadow-[var(--sd-shadow-1)] transition hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
                  {busyKey === `verify:${item.id}` ? t("save") : t("submit", { outcome: selectedOutcome })}
                </button>
              ) : null}

              {task.capabilities.canReview && item.evidence.map((evidence) => (
                <div key={evidence.id} className="mt-3 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 shadow-[var(--sd-shadow-1)]">
                  <p className="text-xs font-bold uppercase text-[var(--sd-ink)]">{t("evidence", { status: evidence.status })}</p>
                  <label className="mt-2 block text-xs font-medium text-[var(--sd-muted)]">{t("reviewReason")}
                    <textarea value={reviewReason[evidence.id] || ""} onChange={(event) => setReviewReason((current) => ({ ...current, [evidence.id]: event.target.value }))} className="mt-1 min-h-20 w-full rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-2 text-xs font-semibold text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-muted)] focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20" required />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" disabled={busyKey !== null || !(reviewReason[evidence.id] || "").trim()} onClick={() => void run(`review:${evidence.id}`, () => fetch("/api/installations/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidenceId: evidence.id, decision: "READY", reason: reviewReason[evidence.id], idempotencyKey: idempotencyKey("review") }) }))} className="min-h-10 rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-4 text-xs font-bold text-white shadow-[var(--sd-shadow-1)] transition-colors hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50">{t("approve")}</button>
                    {task.capabilities.canReject ? <button type="button" disabled={busyKey !== null || !(reviewReason[evidence.id] || "").trim()} onClick={() => void run(`reject:${evidence.id}`, () => fetch("/api/installations/review", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evidenceId: evidence.id, decision: "REJECTED", reason: reviewReason[evidence.id], idempotencyKey: idempotencyKey("review") }) }))} className="min-h-10 rounded-[var(--sd-radius-md)] bg-[var(--sd-danger)] px-4 text-xs font-bold text-white shadow-[var(--sd-shadow-1)] hover:bg-[var(--sd-danger)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-danger)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:opacity-50">{t("reject")}</button> : null}
                  </div>
                </div>
              ))}

              {task.capabilities.canAmend && verified ? (
                <div className="mt-3 grid gap-2">
                  <input aria-label={t("correctedLabel")} value={amendLabel[item.id] || ""} onChange={(event) => setAmendLabel((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={t("correctedPlaceholder")} className="min-h-10 flex-1 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-3.5 text-xs font-semibold text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-muted)] focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20" />
                  <textarea aria-label={t("amendmentReason")} value={amendReason[item.id] || ""} onChange={(event) => setAmendReason((current) => ({ ...current, [item.id]: event.target.value }))} placeholder={t("amendmentPlaceholder")} className="min-h-20 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-3 text-xs font-semibold text-[var(--sd-ink)] outline-none transition placeholder:text-[var(--sd-muted)] focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20" required />
                  <button type="button" disabled={busyKey !== null || (amendLabel[item.id] || "").trim().length < 3 || (amendReason[item.id] || "").trim().length < 3} onClick={() => void run(`amend:${item.id}`, () => fetch("/api/installations/amend", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: item.id, label: amendLabel[item.id], evidenceRequired: item.evidenceRequired, allowsNa: item.allowsNa, reason: amendReason[item.id], idempotencyKey: idempotencyKey("amend") }) }))} className="min-h-10 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] px-4 text-xs font-bold text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)] hover:border-[var(--sd-blue-600)] hover:bg-[var(--sd-selected)] active:scale-[0.98] disabled:opacity-50">{t("amend")}</button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {task.capabilities.canExecute ? (
        <button type="button" disabled={busyKey !== null} onClick={() => void run(`task:${task.id}`, () => fetch(`/api/installations/tasks/${task.id}/complete`, { method: "POST", headers: { "Content-Type": "application/json", "idempotency-key": idempotencyKey("task") } }))} className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-[var(--sd-radius-md)] bg-[var(--sd-blue-600)] px-4 text-xs font-bold uppercase text-white shadow-[var(--sd-shadow-1)] transition hover:bg-[var(--sd-blue-500)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sd-blue-600)] focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
          {busyKey === `task:${task.id}` ? t("submittingTask") : t("completeTask")}
        </button>
      ) : null}
    </div>
  );
}

export function ProjectTaskStepper({ installation, refresh }: { installation: ClientInstallationSnapshot | null; refresh: () => Promise<void> }) {
  const t = useTranslations("ProjectTaskStepper");
  const locale = useLocale();

  if (!installation) {
    return (
      <div className="rounded-[var(--sd-radius-lg)] border border-dashed border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-6 text-center text-sm font-medium text-[var(--sd-muted)]">
        {t("noSnapshot")}
      </div>
    );
  }

  const completed = installation.tasks.filter((task) => task.status.toUpperCase() === "COMPLETED").length;
  const total = installation.tasks.length;
  const progress = total === 0 ? 0 : Math.round((completed / total) * 100);
  const canonicalItems = installation.tasks.flatMap((task) => task.checklist);
  const isCanonicalWorkflow = canonicalItems.length > 0;
  const legacyPizzaTrackerStages = [
    { stage: 1, label: t("legacyStages.contract.label"), desc: t("legacyStages.contract.description"), isDone: true },
    { stage: 2, label: t("legacyStages.permit.label"), desc: t("legacyStages.permit.description"), isDone: completed >= 1 },
    { stage: 3, label: t("legacyStages.equipment.label"), desc: t("legacyStages.equipment.description"), isDone: completed >= 2 },
    { stage: 4, label: t("legacyStages.installation.label"), desc: t("legacyStages.installation.description"), isDone: completed >= 3 },
    { stage: 5, label: t("legacyStages.handover.label"), desc: t("legacyStages.handover.description"), isDone: completed >= installation.tasks.length },
  ];
  const pizzaTrackerStages = isCanonicalWorkflow
    ? INSTALLATION_FIELD_STAGES.map((stage) => ({
      stage: stage.sequence,
      label: locale === "th" ? stage.titleTh : t(`stages.${stage.code}`),
      desc: stage.code.replaceAll("_", " "),
      isDone: canonicalItems.some((item) => (item.itemCode === stage.itemCode || stage.aliases.includes(item.itemCode)) && item.status.toUpperCase() === "VERIFIED"),
    }))
    : legacyPizzaTrackerStages;
  const currentStage = pizzaTrackerStages.find((stage) => !stage.isDone)?.stage ?? null;
  const permitStatus = installation.project.permitStatus.toUpperCase();
  const permitLabel = permitStatus === "APPROVED"
    ? t("permitStatus.approved")
    : permitStatus === "SUBMITTED"
      ? t("permitStatus.submitted")
      : t("permitStatus.pending");
  const progressValue = total > 0 ? t("progressComplete", { percent: progress }) : t("progressPending");

  return (
    <section aria-labelledby="installation-progress-title" className="mt-6 space-y-6 rounded-[var(--sd-radius-lg)] border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] p-5 shadow-[var(--sd-shadow-1)] sm:p-6">
      {/* 5-Stage Solar Horizontal Panel Tracker UI */}
      <div className="space-y-4 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-5 shadow-[var(--sd-shadow-1)] sm:p-6">
        <div className="flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--sd-ink)]">
            {t("lifecycle")}
          </p>
          <span className="rounded-full border border-[var(--sd-line)] bg-[var(--sd-selected)] px-3.5 py-1 font-mono text-xs font-bold text-[var(--sd-ink)]">
            {progressValue}
          </span>
        </div>

        {/* Horizontal Progress Line */}
        <div className="relative pt-2 pb-1">
          <div className="absolute left-0 top-6 h-2.5 w-full overflow-hidden rounded-full bg-[var(--sd-line)]">
            <div
              className="h-full bg-[var(--sd-blue-500)] transition-all duration-500 ease-expo motion-reduce:transition-none"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className={cn("relative z-10 gap-1 text-center", isCanonicalWorkflow ? "grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7" : "grid grid-cols-5")}>
            {pizzaTrackerStages.map((st) => (
              <div key={st.stage} aria-current={st.stage === currentStage ? "step" : undefined} className="flex flex-col items-center space-y-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-all",
                    st.isDone
                      ? "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]"
                      : st.stage === currentStage
                        ? "border-2 border-[var(--sd-blue-600)] bg-[var(--sd-selected)] text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
                        : "border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-muted)]",
                  )}
                >
                  {st.isDone ? <Check className="h-4 w-4 stroke-[2.5]" /> : st.stage}
                </div>
                <p className={cn("max-w-full truncate px-1 text-[11px] leading-tight", st.isDone ? "font-bold text-[var(--sd-ink)]" : st.stage === currentStage ? "font-bold text-[var(--sd-ink)]" : "font-medium text-[var(--sd-muted)]")}>
                  {st.label}
                </p>
                <p className="hidden text-[9px] font-medium text-[var(--sd-muted)] sm:block">
                  {st.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] px-4 py-3 text-xs font-medium text-[var(--sd-muted)] shadow-[var(--sd-shadow-1)]">
        <span className="font-bold text-[var(--sd-ink)]">{t("permit")}</span>
        <span className={cn("rounded-full px-3 py-0.5 text-xs font-bold uppercase", permitStatus === "APPROVED" ? "bg-emerald-100 text-emerald-800" : permitStatus === "SUBMITTED" ? "bg-amber-100 text-amber-800" : "border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-muted)]")}>{permitLabel}</span>
        {installation.project.permitAuthority ? <span>{installation.project.permitAuthority}</span> : null}
        {installation.project.permitApplicationNumber ? <span>{installation.project.permitApplicationNumber}</span> : null}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--sd-blue-600)]">{t("projectEyebrow", { role: installation.actor.role })}</p>
          <h2 id="installation-progress-title" className="mt-1 text-lg font-bold uppercase text-[var(--sd-ink)]">{t("title")}</h2>
          <p className="mt-1 text-xs font-medium text-[var(--sd-muted)]">{t("description")}</p>
        </div>
        <p className="rounded-full border border-[var(--sd-line)] bg-[var(--sd-selected)] px-3.5 py-1 font-mono text-xs font-bold text-[var(--sd-ink)]">{total > 0 ? t("taskCount", { completed, total }) : t("progressPending")}</p>
      </div>

      <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--sd-line)]" aria-label={progressValue} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-valuetext={progressValue}>
        <div className="h-full bg-[var(--sd-blue-500)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>

      <ol className="mt-6 space-y-0">
        {installation.tasks.map((task, index) => {
          const status = task.status.toUpperCase();
          const isComplete = status === "COMPLETED";
          const isActive = !isComplete && task.capabilities.dependencyReady;
          const expands = task.capabilities.canExecute || task.capabilities.canReview || task.capabilities.canAmend;
          return (
            <li key={task.id} className="relative grid grid-cols-[44px_minmax(0,1fr)] gap-3 pb-6 last:pb-0">
              {index < installation.tasks.length - 1 ? <span aria-hidden className={cn("absolute left-[21px] top-10 h-[calc(100%-1rem)] w-0.5", isComplete ? "bg-[var(--sd-blue-500)]" : "bg-[var(--sd-line)]")} /> : null}
              <span className={cn("relative z-10 flex h-11 w-11 items-center justify-center rounded-full transition-all", isComplete ? "bg-[var(--sd-blue-600)] text-white shadow-[var(--sd-shadow-1)]" : isActive ? "border-2 border-[var(--sd-blue-600)] bg-[var(--sd-selected)] text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]" : "border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-muted)]")}>
                {isComplete ? <Check className="h-5 w-5 stroke-[2.5]" aria-hidden /> : isActive ? <Clock3 className="h-5 w-5 stroke-[2.5] text-[var(--sd-blue-600)]" aria-hidden /> : <Circle className="h-4 w-4 stroke-[2]" aria-hidden />}
              </span>
              <div className="min-w-0 rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-[var(--sd-raised)] p-5 shadow-[var(--sd-shadow-1)]">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold uppercase text-[var(--sd-ink)]">{task.title}</p>
                    <p className="mt-1 font-mono text-xs font-medium text-[var(--sd-muted)]">{task.taskCode.replaceAll("_", " ")}</p>
                  </div>
                  <span className={cn("rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wide", isComplete ? "bg-emerald-100 text-emerald-800" : isActive ? "bg-[var(--sd-selected)] text-[var(--sd-blue-600)]" : "border border-[var(--sd-line)] bg-[var(--sd-soft-solar)] text-[var(--sd-muted)]")}>
                    {isComplete ? t("status.completed") : isActive ? t("status.inProgress") : t("status.locked")}
                  </span>
                </div>
                {expands ? <TaskChecklistPanel task={task} refresh={refresh} /> : task.checklist.length > 0 ? (
                  <ul className="mt-4 space-y-2 border-t border-[var(--sd-line)] pt-3">
                    {task.checklist.map((item) => (
                      <li key={item.id} className="flex min-h-11 items-start gap-3 text-xs font-medium text-[var(--sd-ink)]">
                        {item.status === "VERIFIED" ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sd-success)] stroke-[2.5]" /> : <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-[var(--sd-muted)]" />}
                        <span className="min-w-0 flex-1">
                          {item.label}
                          {item.outcome ? <span className={cn("ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase", item.outcome === "FAIL" ? "bg-rose-100 text-rose-800" : "bg-emerald-100 text-emerald-800")}>{item.outcome}</span> : null}
                          {item.remarks ? <span className="mt-1 block text-xs text-[var(--sd-muted)]">{item.remarks}</span> : null}
                          {item.verifiedAt ? <span className="mt-1 block font-mono text-[10px] text-[var(--sd-muted)]">{t("verified")} {new Date(item.verifiedAt).toLocaleString(locale === "th" ? "th-TH" : "en-US")}{item.verifiedByUserId ? ` ${t("by", { id: item.verifiedByUserId })}` : ""}</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
