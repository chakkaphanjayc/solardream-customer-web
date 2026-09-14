"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, CalendarDays, CheckCircle2, ExternalLink, MapPin, RefreshCw, ShieldCheck, Sun, Wrench } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";

type PortalData = {
  access: { id: string; expiresAt: string };
  projects: Array<{ id: string; projectCode: string; state: string; systemSizeKwp: string | null; panelCount: number | null; site: { label: string; addressLine1: string; city: string | null; province: string | null; country: string } | null; nextVisit: { status: string; scheduledStart: string | null; scheduledEnd: string | null } | null; installationWarranty: { status: string; startsAt: string | null; endsAt: string | null } | null; updatedAt: string; customerName: string }>;
  assets: Array<{ id: string; projectId: string | null; productName: string; serialNumber: string; status: string; installedDate: string; warrantyExpiryDate: string }>;
  warranties: { installation: Array<{ id: string; projectId: string; status: string; policyVersion: string; startsAt: string | null; endsAt: string | null }>; product: Array<{ id: string; provider: string; productName: string; status: string; startsAt: string | null; endsAt: string | null; asset: { id: string; serialNumber: string; productName: string } }> };
};

function dateLabel(value: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function GuestWarrantyAccessClient({ enabled, token }: { enabled: boolean; token: string }) {
  const locale = useLocale();
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const fetchPortalData = useCallback(async () => {
    const response = await fetch("/api/v2/guest/warranty/access/" + encodeURIComponent(token), { cache: "no-store", referrerPolicy: "no-referrer" });
    const payload = await response.json() as { success?: boolean; data?: PortalData; error?: { message?: string } };
    if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "This warranty access link is invalid or expired.");
    return payload.data;
  }, [token]);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      setData(await fetchPortalData());
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "This warranty access link is invalid or expired.");
    } finally {
      setLoading(false);
    }
  }, [enabled, fetchPortalData]);

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
      setError(caught instanceof Error ? caught.message : "This warranty access link is invalid or expired.");
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [enabled, fetchPortalData]);

  return (
    <main data-bagui="guest-warranty-portal" className="min-h-dvh bg-[#F0EEE9] px-4 py-8 text-[#0F172A] sm:px-6 md:py-12">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="flex items-center justify-between gap-4"><Link href={"/" + locale} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[#315E82]"><Sun className="h-4 w-4" aria-hidden="true" /> SolarDream warranty</Link><span className="inline-flex items-center gap-2 text-xs font-bold text-slate-500"><ShieldCheck className="h-4 w-4 text-[#4F7FA8]" aria-hidden="true" /> Secure guest view</span></header>
        {loading ? <div className="h-96 animate-pulse rounded-[2rem] bg-white/70" /> : error ? <section role="alert" className="rounded-[2rem] border-2 border-rose-300 bg-rose-50 p-8 text-rose-950"><AlertTriangle className="h-6 w-6" aria-hidden="true" /><h1 className="mt-4 text-2xl font-black">This link is no longer available</h1><p className="mt-2 text-sm leading-6">{error}</p><Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-6"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</Button><Link href={"/" + locale + "/warranty"} className="ml-3 inline-flex text-sm font-bold underline">Request a new link</Link></section> : !data ? null : <><section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 shadow-[5px_5px_0_rgba(15,23,42,0.12)] sm:p-8"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#315E82]">Warranty portal</p><h1 className="mt-3 text-3xl font-black">Your SolarDream systems</h1><p className="mt-2 text-sm text-slate-600">This secure link expires {dateLabel(data.access.expiresAt)}.</p></section><div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]"><section className="space-y-5">{data.projects.length === 0 ? <div className="rounded-[2rem] border-2 border-dashed border-[#4F7FA8]/35 bg-[#DCE8F5] p-7 text-sm text-slate-600">No project warranty record is available for these details yet.</div> : data.projects.map((project) => <article key={project.id} className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6 sm:p-8"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs font-bold text-[#4F7FA8]">{project.projectCode}</p><h2 className="mt-2 text-xl font-black">{titleCase(project.state)}</h2><p className="mt-1 text-sm text-slate-600">{project.systemSizeKwp || "—"} kWp · {project.panelCount || "—"} panels</p></div><span className="rounded-full bg-[#DCE8F5] px-3 py-1 text-xs font-black text-[#315E82]">{titleCase(project.installationWarranty?.status || "PENDING")}</span></div>{project.site ? <p className="mt-6 flex items-start gap-2 text-sm leading-6 text-slate-600"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4F7FA8]" aria-hidden="true" />{project.site.label} · {project.site.addressLine1}{project.site.city ? ", " + project.site.city : ""}{project.site.province ? ", " + project.site.province : ""}</p> : null}{project.nextVisit ? <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-slate-700"><CalendarDays className="h-4 w-4 text-[#4F7FA8]" aria-hidden="true" />{titleCase(project.nextVisit.status)} · {dateLabel(project.nextVisit.scheduledStart)}</p> : null}{project.installationWarranty ? <div className="mt-6 rounded-2xl bg-[#DCEBF7] p-4"><p className="flex items-center gap-2 text-sm font-black text-[#315E82]"><CheckCircle2 className="h-4 w-4" aria-hidden="true" /> Installation coverage</p><p className="mt-2 text-sm text-slate-700">{dateLabel(project.installationWarranty.startsAt)} – {dateLabel(project.installationWarranty.endsAt)}</p></div> : null}</article>)}</section><aside className="space-y-5"><section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6"><h2 className="flex items-center gap-2 text-lg font-black"><Wrench className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /> Installed equipment</h2>{data.assets.length === 0 ? <p className="mt-4 text-sm text-slate-500">No installed asset record is available yet.</p> : <div className="mt-4 space-y-3">{data.assets.map((asset) => <div key={asset.id} className="rounded-2xl bg-[#F0EEE9] p-4"><p className="font-bold">{asset.productName}</p><p className="mt-1 font-mono text-xs text-slate-500">{asset.serialNumber}</p><p className="mt-2 text-xs text-slate-600">{titleCase(asset.status)} · covered until {dateLabel(asset.warrantyExpiryDate)}</p></div>)}</div>}</section><section className="rounded-[2rem] border-2 border-[#0F172A]/15 bg-white p-6"><h2 className="text-lg font-black">Equipment warranties</h2>{data.warranties.product.length === 0 ? <p className="mt-4 text-sm text-slate-500">Product warranty records are still being matched.</p> : <div className="mt-4 space-y-3">{data.warranties.product.map((warranty) => <div key={warranty.id} className="rounded-2xl bg-[#F0EEE9] p-4"><p className="font-bold">{warranty.productName}</p><p className="mt-1 text-xs text-slate-500">{warranty.provider} · {warranty.asset.serialNumber}</p><p className="mt-2 text-xs font-semibold text-[#315E82]">{titleCase(warranty.status)} until {dateLabel(warranty.endsAt)}</p></div>)}</div>}</section><Link href={"/" + locale + "/support"} className="inline-flex items-center gap-2 text-sm font-black text-[#315E82] hover:underline">Need service help? <ExternalLink className="h-4 w-4" aria-hidden="true" /></Link></aside></div></>}
      </div>
    </main>
  );
}
