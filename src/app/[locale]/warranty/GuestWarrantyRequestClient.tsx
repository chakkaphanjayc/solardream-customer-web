"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";

import { AlertTriangle, ArrowRight, CheckCircle2, LockKeyhole, ShieldCheck, Sun } from "@/components/ui/icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import { cn } from "@/lib/utils";

type ApiPayload = {
  success?: boolean;
  message?: string;
  data?: { challengeId?: string; accessPath?: string; expiresAt?: string };
  error?: { message?: string };
};

export default function GuestWarrantyRequestClient({ enabled }: { enabled: boolean }) {
  const locale = useLocale();
  const t = useTranslations("GuestWarranty");
  const router = useRouter();
  const [contact, setContact] = useState("");
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const requestCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/v2/guest/warranty/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contact }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok) throw new Error(payload.error?.message || t("requestUnavailable"));
      setChallengeId(payload.data?.challengeId || "");
      setMessage(payload.message || t("genericMessage"));
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("requestUnavailable"));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/v2/guest/warranty/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeId, code }),
      });
      const payload = await response.json() as ApiPayload;
      if (!response.ok || !payload.success || !payload.data?.accessPath) {
        throw new Error(payload.error?.message || t("invalidCode"));
      }
      router.push("/" + locale + payload.data.accessPath);
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : t("invalidCode"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SolarRouteShell
      as="div"
      className="solar-guest-warranty-page px-4 pb-8 text-[#0F172A] sm:px-6 md:pb-14"
    >
      <div className="mx-auto max-w-5xl">
        <header className="flex items-center justify-between gap-4">
          <Link href={"/" + locale} className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-[var(--sd-navy-900)]">
            <Sun className="h-4 w-4" aria-hidden="true" /> SolarDream
          </Link>
          <Link href={"/" + locale + "/login"} className="text-sm font-bold text-slate-600 hover:text-[var(--sd-navy-900)]">{t("memberSignIn")}</Link>
        </header>

        <section className="mt-10 grid overflow-hidden rounded-[2rem] border-2 border-[#0F172A]/15 bg-white shadow-[6px_6px_0_rgba(15,23,42,0.12)] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="bg-[#DCEBF7] p-7 sm:p-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[var(--sd-navy-900)] shadow-sm"><ShieldCheck className="h-6 w-6" aria-hidden="true" /></div>
            <p className="mt-8 text-xs font-black uppercase tracking-[0.16em] text-[var(--sd-navy-900)]">{t("eyebrow")}</p>
            <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">{t("title")}</h1>
            <p className="mt-4 text-sm leading-7 text-slate-700">{t("description")}</p>
            <div className="mt-8 space-y-3 text-sm font-semibold text-slate-700"><p className="flex items-center gap-2"><LockKeyhole className="h-4 w-4 text-[var(--sd-navy-900)]" aria-hidden="true" /> {t("oneTimeCode")}</p><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--sd-navy-900)]" aria-hidden="true" /> {t("scopedAccess")}</p></div>
            <SoliaGuide
              className="mt-8 h-32 w-full max-w-[17rem]"
              pose="blueprint"
              alt={t("soliaAlt")}
              message={t("soliaMessage")}
              speechBubbleClassName="absolute bottom-0 left-0 max-w-[13rem] rounded-[var(--sd-radius-md)] border border-[var(--sd-line)] bg-white/90 p-2.5 text-xs font-semibold leading-5 text-[var(--sd-ink)] shadow-[var(--sd-shadow-1)]"
            />
          </div>

          {!enabled ? (
            <div className="flex flex-col justify-center p-7 sm:p-10">
              <h2 className="text-2xl font-black">{t("disabledTitle")}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-600">{t("disabledDescription")}</p>
              <Link href={"/" + locale + "/portal/warranty"} className={cn(buttonVariants({ variant: "primary", size: "sm" }), "mt-6 self-start")}>{t("openCurrentPortal")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Link>
            </div>
          ) : (
            <div className="p-7 sm:p-10">
              <h2 className="text-2xl font-black">{t("findTitle")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{t("findDescription")}</p>
              <form onSubmit={requestCode} className="mt-7 space-y-4">
                <label className="block text-sm font-bold">{t("contactLabel")}<input value={contact} onChange={(event) => setContact(event.target.value)} required autoComplete="email tel" className="mt-2 min-h-11 w-full rounded-xl border-2 border-[#0F172A]/15 bg-[#F8FAFC] px-3 text-sm outline-none focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20" placeholder={t("contactPlaceholder")} /></label>
                <Button type="submit" variant="primary" size="sm" disabled={busy || contact.trim().length < 3}>{busy ? t("sending") : t("sendCode")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              </form>
              {message ? <p role="status" className="mt-5 flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-900"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{message}</p> : null}
              {challengeId ? <form onSubmit={verifyCode} className="mt-7 border-t-2 border-[#0F172A]/10 pt-6"><label className="block text-sm font-bold">{t("codeLabel")}<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" required pattern="\d{6}" className="mt-2 min-h-11 w-full rounded-xl border-2 border-[#0F172A]/15 bg-[#F8FAFC] px-3 font-mono text-lg tracking-[0.35em] outline-none focus:border-[var(--sd-blue-600)] focus:ring-2 focus:ring-[var(--sd-blue-600)]/20" placeholder="000000" /></label><Button type="submit" variant="secondary" size="sm" disabled={busy || code.length !== 6} className="mt-4">{t("openPortal")} <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button></form> : null}
              {error ? <p role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{error}</p> : null}
              <p className="mt-8 text-xs leading-5 text-slate-500">{t("accessNote")}</p>
            </div>
          )}
        </section>
      </div>
    </SolarRouteShell>
  );
}
