"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, LogOut, ShieldCheck, Wrench } from "@/components/ui/icons";

import type { ExternalWorkView } from "@/lib/developerAccessContracts";

type ExternalAccessClientProps = { token: string };

export default function ExternalAccessClient({ token }: ExternalAccessClientProps) {
  const [view, setView] = useState<ExternalWorkView | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function establishSession() {
      try {
        const response = await fetch("/api/external-access/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || !payload || !("view" in payload)) {
          const message = payload && typeof payload === "object" && typeof (payload as { error?: unknown }).error === "string" ? (payload as { error: string }).error : "This temporary access link is unavailable.";
          throw new Error(message);
        }
        if (!cancelled) {
          setView((payload as { view: ExternalWorkView }).view);
          window.history.replaceState({}, "", window.location.pathname);
        }
      } catch (caught: unknown) {
        if (!cancelled) setError(caught instanceof Error ? caught.message : "This temporary access link is unavailable.");
      }
    }
    void establishSession();
    return () => { cancelled = true; };
  }, [token]);

  async function signOut() {
    await fetch("/api/external-access/session", { method: "DELETE" });
    setView(null);
    setError("This temporary access session has been closed.");
  }

  if (error) return <main className="solar-external-access flex min-h-screen items-center justify-center bg-[#0d1117] px-5 text-[#c9d1d9]"><section className="w-full max-w-md rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center"><ShieldCheck className="mx-auto size-10 text-[#C58F61]" aria-hidden="true" /><h1 className="mt-5 text-xl font-semibold text-[#f0f6fc]">Temporary access unavailable</h1><p className="mt-2 text-sm leading-6 text-[#8b949e]">{error}</p></section></main>;
  if (!view) return <main className="solar-external-access flex min-h-screen items-center justify-center bg-[#0d1117] px-5 text-[#c9d1d9]"><div className="text-center"><div className="mx-auto size-8 animate-spin rounded-full border-2 border-[#30363d] border-t-[#7CA8D0]" /><p className="mt-4 text-sm text-[#8b949e]">Checking temporary access…</p></div></main>;

  return <main className="solar-external-access min-h-screen bg-[#0d1117] px-5 py-8 text-[#c9d1d9] sm:px-8"><div className="mx-auto max-w-4xl"><header className="flex flex-col gap-5 border-b border-[#30363d] pb-7 sm:flex-row sm:items-end sm:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#7CA8D0]"><Wrench className="size-4" aria-hidden="true" /> SolarDream field access</div><h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#f0f6fc]">Assigned work area</h1><p className="mt-2 text-sm text-[#8b949e]">Welcome, {view.account.displayName}. This view is limited to the work record granted to this temporary account.</p></div><button type="button" onClick={() => void signOut()} className="inline-flex h-9 items-center gap-2 self-start rounded-md border border-[#30363d] px-3 text-xs font-semibold text-[#8b949e] hover:text-[#f0f6fc]"><LogOut className="size-3.5" aria-hidden="true" /> Close session</button></header><section className="mt-7 rounded-2xl border border-[#30363d] bg-[#161b22] p-6"><div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between"><div><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8b949e]">Installation project</span><h2 className="mt-2 text-2xl font-semibold text-[#f0f6fc]">{view.project?.projectCode || "Work record"}</h2><p className="mt-1 text-sm text-[#8b949e]">{view.project?.customerName || "Customer details are unavailable."}</p></div><span className="inline-flex items-center gap-2 rounded-full border border-[#238636]/50 bg-[#238636]/10 px-3 py-1.5 text-xs font-semibold text-[#3fb950]"><CheckCircle2 className="size-3.5" aria-hidden="true" />{view.project?.status || "Assigned"}</span></div>{view.tasks.length > 0 ? <div className="mt-7 divide-y divide-[#30363d] rounded-md border border-[#30363d]">{view.tasks.map((task) => <div key={task.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-semibold text-[#f0f6fc]">{task.title}</p><p className="mt-1 font-mono text-[11px] text-[#8b949e]">{task.taskCode}</p></div><span className="inline-flex items-center gap-1.5 text-xs text-[#8b949e]"><Clock3 className="size-3.5" aria-hidden="true" />{task.status}</span></div>)}</div> : <div className="mt-7 rounded-md border border-dashed border-[#30363d] p-6 text-center text-sm text-[#8b949e]">No task details are available for this scope.</div>}<p className="mt-6 text-xs leading-5 text-[#6e7681]">Access expires {new Date(view.account.expiresAt).toLocaleString()}. SolarDream records every access session and can revoke it at any time.</p></section></div></main>;
}
