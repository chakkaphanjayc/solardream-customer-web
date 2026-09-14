"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useState } from "react";

import { AlertTriangle, ArrowRight, CalendarClock, CheckCircle2, MapPin, RefreshCw, Sun } from "@/components/ui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { OpsPortalShell } from "@/components/portal/OpsPortalShell";
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

function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Not scheduled" : date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/(^| )\w/g, (letter) => letter.toUpperCase());
}

export default function CustomerProjectsClient({ enabled }: { enabled: boolean }) {
  const locale = useLocale();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/v2/customer/projects", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json() as { success?: boolean; data?: Project[]; error?: { message?: string } };
      if (!response.ok || !payload.success || !payload.data) throw new Error(payload.error?.message || "Projects could not be loaded.");
      setProjects(payload.data);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "Projects could not be loaded.");
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  // This effect hydrates the customer project list from the API after the route loads.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <OpsPortalShell
      enabled={enabled}
      title="Your solar projects"
      description="Follow every delivery milestone from site review through commissioning, handover, and warranty activation."
    >
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1, 2].map((item) => <div key={item} className="h-64 animate-pulse rounded-[24px] bg-[#E6E3DC]" />)}
        </div>
      ) : error ? (
        <section role="alert" className="rounded-[24px] border border-rose-200 bg-rose-50/90 p-7 text-rose-950">
          <AlertTriangle className="h-6 w-6 text-rose-600" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold">{error}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => void load()} className="mt-5 rounded-full"><RefreshCw className="h-4 w-4" aria-hidden="true" /> Try again</Button>
        </section>
      ) : projects.length === 0 ? (
        <section className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-10 text-center shadow-xs">
          <Sun className="mx-auto h-9 w-9 text-[#4F7FA8]" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold text-[#1C1C1A]">No delivery projects yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#4E4B44] font-medium">Once a proposal is fully paid and converted, its installation project will appear here.</p>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2">
          {projects.map((project) => (
            <article key={project.id} className="rounded-[24px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 shadow-sm transition-all duration-300 hover:scale-[1.01] hover:shadow-md sm:p-7">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#4F7FA8]">{project.projectCode}</p>
                  <h2 className="mt-2 text-xl font-bold text-[#1C1C1A]">{project.systemSizeKwp} kW solar system</h2>
                  <p className="mt-1 text-sm text-[#4E4B44] font-medium">{project.panelCount} panels · Updated {formatDate(project.updatedAt)}</p>
                </div>
                <span className="shrink-0 rounded-full border border-[#8E8B83]/20 bg-[#DCE8F5] px-3.5 py-1 text-xs font-bold text-[#2E2C27]">{stateLabel(project.state)}</span>
              </div>
              <div className="mt-6 space-y-3 border-t border-[#8E8B83]/15 pt-5 text-sm">
                <p className="flex items-start gap-2 text-[#4E4B44] font-medium"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#4F7FA8]" aria-hidden="true" /><span>{project.site ? [project.site.label, project.site.addressLine1, project.site.city].filter(Boolean).join(" · ") : "Site details pending"}</span></p>
                <p className="flex items-center gap-2 text-[#4E4B44] font-medium"><CalendarClock className="h-4 w-4 shrink-0 text-[#4F7FA8]" aria-hidden="true" /><span>{project.nextVisit ? formatDate(project.nextVisit.scheduledStart) : "No field visit scheduled"}</span></p>
                <p className="flex items-center gap-2 text-[#4E4B44] font-medium"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#4F7FA8]" aria-hidden="true" /><span>Installation warranty: {project.installationWarranty?.status?.replaceAll("_", " ").toLowerCase() || "Pending"}</span></p>
              </div>
              <Link href={"/" + locale + "/portal/projects/" + project.id} className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#B7D1EA] px-5 py-3 text-xs font-bold text-white shadow-md transition-all hover:bg-[#A5C2DE] active:scale-95">View project status <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </article>
          ))}
        </section>
      )}
    </OpsPortalShell>
  );
}
