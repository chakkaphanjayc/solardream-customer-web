"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, ArrowLeft, CalendarDays, RefreshCw, ShieldCheck, Wrench } from "@/components/ui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
import { cn } from "@/lib/utils";

type WarrantyData = {
  installation: Array<{ id: string; projectId: string; status: string; policyVersion: string; startsAt: string | null; endsAt: string | null }>;
  product: Array<{ id: string; provider: string; productName: string; status: string; startsAt: string | null; endsAt: string | null; asset: { id: string; serialNumber: string; productName: string } }>;
};

function dateLabel(value: string | null) {
  if (!value) return "Pending activation";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Pending activation" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerWarrantiesClient({ enabled }: { enabled: boolean }) {
  const locale = useLocale();
  const [data, setData] = useState<WarrantyData | null>(null);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v2/customer/warranties", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as { success?: boolean; data?: WarrantyData; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "Warranties could not be loaded.");
      setData(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Warranties could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // This effect hydrates warranty records from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <OpsPortalShell enabled={enabled} title="Warranty centre" description="Keep installation coverage and equipment warranty records in one clear place.">
      {loading ? <div className="h-80 animate-pulse rounded-[24px] bg-[#E6E3DC]" /> : error ? <section role="alert" className="rounded-[24px] border border-rose-200 bg-rose-50/90 p-7 text-rose-950"><AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden="true" /><p className="mt-3 text-sm font-semibold">{error}</p><Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-5 rounded-full"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</Button></section> : !data ? null : (
        <div className="space-y-5">
          <Link href={"/" + locale + "/portal/projects"} className="inline-flex items-center gap-2 text-sm font-bold text-[#4F7FA8] hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden="true" /> Projects</Link>
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:p-8"><div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-bold text-[#1C1C1A]">Installation coverage</h2></div>{data.installation.length === 0 ? <p className="mt-5 text-sm text-[#4E4B44] font-medium">No installation warranty record is available yet.</p> : <div className="mt-5 space-y-3">{data.installation.map((item) => <div key={item.id} className="rounded-2xl bg-[#DCE8F5]/40 border border-[#8E8B83]/10 p-4"><div className="flex justify-between gap-3"><p className="font-bold text-[#1C1C1A]">{item.policyVersion}</p><span className="text-xs font-bold text-[#4F7FA8]">{titleCase(item.status)}</span></div><p className="mt-2 flex items-center gap-2 text-sm text-[#4E4B44] font-medium"><CalendarDays className="h-4 w-4 text-[#4F7FA8]" aria-hidden="true" />{dateLabel(item.startsAt)} – {dateLabel(item.endsAt)}</p></div>)}</div>}</section>
            <section className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:p-8"><div className="flex items-center gap-2"><Wrench className="h-5 w-5 text-[#4F7FA8]" aria-hidden="true" /><h2 className="text-xl font-bold text-[#1C1C1A]">Equipment coverage</h2></div>{data.product.length === 0 ? <p className="mt-5 text-sm text-[#4E4B44] font-medium">Registered equipment warranties will appear after commissioning.</p> : <div className="mt-5 space-y-3">{data.product.map((item) => <div key={item.id} className="rounded-2xl bg-[#DCE8F5]/40 border border-[#8E8B83]/10 p-4"><div className="flex justify-between gap-3"><p className="font-bold text-[#1C1C1A]">{item.productName}</p><span className="text-xs font-bold text-[#4F7FA8]">{titleCase(item.status)}</span></div><p className="mt-1 font-mono text-xs text-[#4E4B44]">{item.asset.serialNumber}</p><p className="mt-2 text-sm text-[#4E4B44] font-medium">{item.provider} · until {dateLabel(item.endsAt)}</p></div>)}</div>}</section>
          </div>
          <Link href={"/" + locale + "/portal/service"} className="inline-flex items-center gap-2 rounded-full bg-[#B7D1EA] px-5 py-2.5 text-xs font-bold text-white shadow-md transition-all hover:bg-[#A5C2DE] active:scale-95"><Wrench className="h-4 w-4" aria-hidden="true" /> Ask about a warranty</Link>
        </div>
      )}
    </OpsPortalShell>
  );
}
