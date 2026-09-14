"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, ArrowLeft, CalendarDays, CheckCircle2, Circle, ClipboardCheck, LifeBuoy, MapPin, RefreshCw, ShieldCheck, Wrench } from "@/components/ui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
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

function dateLabel(value: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending" : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerProjectDetailClient({ enabled, projectId }: { enabled: boolean; projectId: string }) {
  const locale = useLocale();
  const [data, setData] = useState<ProjectStatus | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled || !projectId) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v2/customer/projects/" + encodeURIComponent(projectId), { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as { success?: boolean; data?: ProjectStatus; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "Project status could not be loaded.");
      setData(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Project status could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [enabled, projectId]);

  // This effect hydrates the project status from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <OpsPortalShell enabled={enabled} title="Project status" description="A clear, customer-safe view of the delivery record and the next action.">
      <Link href={"/" + locale + "/portal/projects"} className="inline-flex items-center gap-2 text-sm font-black text-[#315E82] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> All projects</Link>
      {loading ? <div className="mt-5 h-96 animate-pulse rounded-[2rem] bg-white/70" /> : error ? (
        <section role="alert" className="mt-5 rounded-[2rem] border-2 border-rose-300 bg-rose-50 p-7 text-rose-950"><AlertTriangle className="h-6 w-6" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{error}</p><Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-5"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</Button></section>
      ) : !data ? null : (
        <div className="mt-5 space-y-5">
          <section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-[#0F172A] p-6 text-white shadow-[5px_5px_0_rgba(15,23,42,0.18)] sm:p-8">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#B7D1EA]">{data.project.projectCode}</p><h2 className="mt-2 text-3xl font-black">{data.project.systemSizeKwp} kW solar system</h2><p className="mt-2 text-sm text-slate-300">{data.project.panelCount} panels · {titleCase(data.project.state)}</p></div>
              <Link href={"/" + locale + "/portal/service?projectId=" + encodeURIComponent(data.project.id)} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "shrink-0")}><LifeBuoy className="h-4 w-4" aria-hidden="true" /> Request support</Link>
            </div>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-bold text-slate-400">System</p><p className="mt-1 font-bold">{data.project.systemSizeKwp} kW · {data.project.panelCount} panels</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"><p className="text-xs font-bold text-slate-400">Last updated</p><p className="mt-1 font-bold">{dateLabel(data.project.updatedAt)}</p></div>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm text-slate-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#B7D1EA]" aria-hidden="true" /><span>{data.project.site ? [data.project.site.label, data.project.site.addressLine1, data.project.site.city, data.project.site.province, data.project.site.postalCode].filter(Boolean).join(" · ") : "Site details pending"}</span></p>
          </section>

          <section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 sm:p-8">
            <div className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-black">Delivery timeline</h2></div>
            <div className="mt-6 space-y-4">
              {data.tasks.map((task) => {
                const complete = task.status === "COMPLETED";
                return <div key={task.id} className="flex gap-3"><div className={cn("mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full", complete ? "bg-emerald-100 text-emerald-700" : "bg-[#DCE8F5] text-[#4F7FA8]")}>{complete ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}</div><div className="min-w-0 flex-1 border-b border-[#0F172A]/10 pb-4 last:border-0"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-bold">{task.title}</p><span className="text-xs font-bold text-slate-500">{titleCase(task.status)}</span></div>{task.checklist.length > 0 && <p className="mt-1 text-xs text-slate-500">{task.checklist.filter((item) => item.status === "COMPLETED").length}/{task.checklist.length} checks complete</p>}</div></div>;
              })}
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6"><div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-black">Field visits</h2></div>{data.visits.length === 0 ? <p className="mt-5 text-sm text-slate-500">No field visit has been scheduled yet.</p> : <div className="mt-4 space-y-3">{data.visits.map((visit) => <div key={visit.id} className="rounded-2xl bg-[#F0EEE9] p-4"><div className="flex justify-between gap-3"><p className="font-bold">{titleCase(visit.type)}</p><span className="text-xs font-bold text-[#315E82]">{titleCase(visit.status)}</span></div><p className="mt-2 text-sm text-slate-600">{dateLabel(visit.scheduledStart)}{visit.scheduledEnd ? " – " + dateLabel(visit.scheduledEnd) : ""}</p></div>)}</div>}</section>
            <section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-black">Warranty</h2></div>{data.installationWarranty ? <div className="mt-4 rounded-2xl bg-[#DCE8F5] p-4"><p className="font-bold">{titleCase(data.installationWarranty.status)}</p><p className="mt-2 text-sm text-slate-600">{data.installationWarranty.policyVersion}</p><p className="mt-1 text-sm text-slate-600">{dateLabel(data.installationWarranty.startsAt)} – {dateLabel(data.installationWarranty.endsAt)}</p></div> : <p className="mt-5 text-sm text-slate-500">Installation warranty details will appear after handover.</p>}<Link href={"/" + locale + "/portal/warranties"} className="mt-4 inline-flex text-sm font-black text-[#315E82] hover:underline">View all warranties</Link></section>
          </div>

          <section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 sm:p-8"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-black">Equipment and support</h2></div><Link href={"/" + locale + "/portal/service?projectId=" + encodeURIComponent(data.project.id)} className="text-sm font-black text-[#315E82] hover:underline">Open a case</Link></div>{data.assets.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.assets.map((asset) => <div key={asset.id} className="rounded-2xl bg-[#F0EEE9] p-4"><p className="font-bold">{asset.productName}</p><p className="mt-1 font-mono text-xs text-slate-500">{asset.serialNumber}</p><p className="mt-2 text-xs text-slate-600">Warranty until {dateLabel(asset.warrantyExpiryDate)}</p></div>)}</div>}{data.serviceCases.length > 0 && <div className="mt-5 border-t border-[#0F172A]/10 pt-5"><p className="text-xs font-black uppercase tracking-[0.14em] text-[#4F7FA8]">Recent cases</p><div className="mt-3 space-y-2">{data.serviceCases.slice(0, 5).map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-bold">{item.caseNumber} · {item.subject}</span><span className="text-xs font-bold text-slate-500">{titleCase(item.status)}</span></div>)}</div></div>}</section>
        </div>
      )}
    </OpsPortalShell>
  );
}
