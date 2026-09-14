"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";

import { AlertTriangle, ArrowLeft, CheckCircle2, LifeBuoy, RefreshCw } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { OpsPortalShell } from "@/components/portal/OpsPortalShell";

type ProjectOption = { id: string; projectCode: string; state: string; site: { label: string } | null };
type AssetOption = { id: string; projectId: string | null; productName: string; serialNumber: string; status: string };
type ServiceCase = { id: string; caseNumber: string; subject: string; status: string; priority: string; createdAt: string };

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerServiceClient({ enabled, afterSalesEnabled }: { enabled: boolean; afterSalesEnabled: boolean }) {
  const locale = useLocale();
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
      if (!projectResponse.ok || !projectPayload.success || !projectPayload.data) throw new Error(projectPayload.error?.message || "Projects could not be loaded.");
      if (!assetResponse.ok || !assetPayload.success || !assetPayload.data) throw new Error(assetPayload.error?.message || "Assets could not be loaded.");
      if (!caseResponse.ok || !casePayload.success || !casePayload.data) throw new Error(casePayload.error?.message || "Service cases could not be loaded.");
      setProjects(projectPayload.data);
      setAssets(assetPayload.data);
      setCases(casePayload.data);
      if (queryProjectId && projectPayload.data.some((project) => project.id === queryProjectId)) setProjectId(queryProjectId);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Support data could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [queryProjectId, serviceEnabled]);

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
      if (!response.ok || !payload.success || !payload.data?.serviceCase) throw new Error(payload.error?.message || "Your service case could not be submitted.");
      setCases((current) => [payload.data?.serviceCase as ServiceCase, ...current]);
      setSubject("");
      setDescription("");
      setSuccess("Your request was submitted. Our service team will follow up through this portal.");
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Your service case could not be submitted.");
    } finally {
      setSubmitting(false);
    }
  };

  const visibleAssets = projectId ? assets.filter((asset) => !asset.projectId || asset.projectId === projectId) : assets;

  return (
    <OpsPortalShell enabled={enabled} title="Service and support" description="Tell us what happened. We’ll keep the case, warranty context, and field follow-up together.">
      <Link href={"/" + locale + "/portal/projects"} className="inline-flex items-center gap-2 text-sm font-bold text-[#4F7FA8] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Projects</Link>
      {!afterSalesEnabled ? <section className="mt-5 rounded-[24px] border border-[#8E8B83]/20 bg-[#DCE8F5]/40 p-7 sm:p-10 shadow-sm">
        <h2 className="text-2xl font-bold text-[#1C1C1A]">After-sales support is being prepared</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-[#4E4B44] font-medium">Service cases and field follow-up will appear here once the after-sales workspace is enabled. Your current support channels remain available in the meantime.</p>
        <Link href={"/" + locale + "/portal/warranty"} className="mt-6 inline-flex items-center text-sm font-bold text-[#4F7FA8] hover:underline">Open current warranty portal</Link>
      </section> : loading ? <div className="mt-5 h-96 animate-pulse rounded-[24px] bg-[#E6E3DC]" /> : (
        <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <form onSubmit={submit} className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:p-8">
            <div className="flex items-center gap-2"><LifeBuoy className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-bold text-[#1C1C1A]">Open a service case</h2></div>
            <p className="mt-2 text-sm leading-6 text-[#4E4B44] font-medium">Include the symptoms, timing, and anything that may help the team prepare.</p>
            {error && <div role="alert" className="mt-5 flex gap-2 rounded-2xl border border-rose-300 bg-rose-50 p-3.5 text-sm text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" aria-hidden="true" />{error}</div>}
            {success && <div role="status" className="mt-5 flex gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 p-3.5 text-sm text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />{success}</div>}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-bold text-[#1C1C1A]">Project<select value={projectId} onChange={(event) => { setProjectId(event.target.value); setAssetId(""); }} className="mt-2 min-h-11 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-3 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"><option value="">General support</option>{projects.map((project) => <option key={project.id} value={project.id}>{project.projectCode}{project.site ? " · " + project.site.label : ""}</option>)}</select></label>
              <label className="text-sm font-bold text-[#1C1C1A]">Equipment<select value={assetId} onChange={(event) => setAssetId(event.target.value)} className="mt-2 min-h-11 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-3 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"><option value="">Not specified</option>{visibleAssets.map((asset) => <option key={asset.id} value={asset.id}>{asset.productName} · {asset.serialNumber}</option>)}</select></label>
              <label className="text-sm font-bold text-[#1C1C1A]">Request type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 min-h-11 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-3 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"><option value="REPAIR">Repair</option><option value="CLAIM">Warranty claim</option><option value="MAINTENANCE">Maintenance</option><option value="QUESTION">Question</option></select></label>
              <label className="text-sm font-bold text-[#1C1C1A]">Priority<select value={priority} onChange={(event) => setPriority(event.target.value)} className="mt-2 min-h-11 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-3 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]"><option value="NORMAL">Normal</option><option value="LOW">Low</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select></label>
            </div>
            <label className="mt-4 block text-sm font-bold text-[#1C1C1A]">Subject<input required maxLength={240} value={subject} onChange={(event) => setSubject(event.target.value)} className="mt-2 min-h-11 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-3 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]" /></label>
            <label className="mt-4 block text-sm font-bold text-[#1C1C1A]">What do you need help with?<textarea required maxLength={10000} rows={6} value={description} onChange={(event) => setDescription(event.target.value)} className="mt-2 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-3 py-3 text-sm font-medium text-[#1C1C1A] outline-none transition focus:border-[#7CA8D0] focus:bg-[#F0EEE9]" /></label>
            <Button type="submit" disabled={submitting} className="mt-5 w-full rounded-full bg-[#B7D1EA] text-white hover:bg-[#A5C2DE] px-6 py-3 font-bold shadow-md transition-all active:scale-95">{submitting ? "Submitting…" : "Submit service case"}</Button>
          </form>
          <section className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:p-8"><div className="flex items-center justify-between gap-3"><h2 className="text-xl font-bold text-[#1C1C1A]">Your cases</h2><Button type="button" variant="quiet" size="icon" onClick={() => void load()} aria-label="Refresh service cases" className="rounded-full bg-[#DCE8F5] text-[#2E2C27] hover:bg-[#DCE8F5]"><RefreshCw className="h-4 w-4" aria-hidden="true" /></Button></div>{cases.length === 0 ? <p className="mt-5 text-sm leading-6 text-[#4E4B44] font-medium">No service cases yet. If something needs attention, open a case and we’ll take it from there.</p> : <div className="mt-5 space-y-3">{cases.map((item) => <div key={item.id} className="rounded-2xl bg-[#DCE8F5]/40 border border-[#8E8B83]/10 p-4"><div className="flex flex-wrap justify-between gap-2"><p className="font-bold text-[#1C1C1A]">{item.caseNumber}</p><span className="rounded-full bg-[#DCE8F5] px-3 py-0.5 text-xs font-bold text-[#2E2C27] border border-[#8E8B83]/20">{titleCase(item.status)}</span></div><p className="mt-2 text-sm text-[#1C1C1A] font-medium">{item.subject}</p><p className="mt-2 text-xs text-[#4E4B44] font-medium">{titleCase(item.priority)} priority · {new Date(item.createdAt).toLocaleDateString()}</p></div>)}</div>}</section>
        </div>
      )}
    </OpsPortalShell>
  );
}
