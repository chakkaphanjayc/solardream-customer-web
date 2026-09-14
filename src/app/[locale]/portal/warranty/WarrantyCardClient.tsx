"use client";

import Link from "next/link";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  BatteryCharging,
  CalendarDays,
  ClipboardCheck,
  Download,
  ExternalLink,
  FileChartColumn,
  FileText,
  MapPin,
  PanelTop,
  ShieldCheck,
  TriangleAlert,
  Wrench,
  Zap,
} from "@/components/ui/icons";

type WarrantyEquipment = {
  id: string;
  itemName: string;
  itemCode: string | null;
  serialNumber: string;
  manufacturer: string | null;
  warrantyExpiryDate: string;
  daysRemaining: number;
  status: "UNDER_WARRANTY" | "EXPIRED";
};

type WarrantyCard = {
  customer: { id: string; name: string };
  installation: {
    systemId: string;
    systemSizeKwp: number;
    systemLabel: string;
    installedAt: string;
    address: string;
    gps: { latitude: number; longitude: number } | null;
    peaMeterId: string | null;
    roofType: string | null;
    mainDbLocation: string | null;
  };
  warranty: {
    isUnderInstallationWarranty: boolean;
    daysRemaining: number;
    status: "UNDER_WARRANTY" | "EXPIRED" | "PENDING";
    expiresAt: string | null;
  };
  equipment: WarrantyEquipment[];
  documents: {
    handoverCertificate: { label: string; url: string } | null;
    inverterDatasheets: Array<{ label: string; url: string }>;
    singleLineDiagrams: Array<{ label: string; url: string }>;
  };
  serviceRequest: {
    assetId: string | null;
    systemId: string;
    gps: { latitude: number; longitude: number } | null;
  };
};

function formatDate(value: string | null, locale: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(locale === "th" ? "th-TH" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function equipmentIcon(itemName: string) {
  const normalized = itemName.toLowerCase();
  if (normalized.includes("battery") || normalized.includes("แบต")) return BatteryCharging;
  if (normalized.includes("panel") || normalized.includes("แผง")) return PanelTop;
  return Zap;
}

export default function WarrantyCardClient() {
  const locale = useLocale();
  const t = useTranslations("WarrantyCard");
  const [card, setCard] = useState<WarrantyCard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const response = await fetch("/api/customer/warranty-card", {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = await response.json() as { success?: boolean; card?: WarrantyCard; error?: string };
        if (!response.ok || !payload.success || !payload.card) {
          throw new Error(payload.error || t("error"));
        }
        setCard(payload.card);
      } catch (caught: unknown) {
        if (caught instanceof DOMException && caught.name === "AbortError") return;
        setError(caught instanceof Error ? caught.message : t("error"));
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [t]);

  const serviceHref = useMemo(() => {
    if (!card) return `/${locale}/my-assets`;
    const params = new URLSearchParams({
      request: "maintenance",
      systemId: card.serviceRequest.systemId,
    });
    if (card.serviceRequest.assetId) params.set("assetId", card.serviceRequest.assetId);
    if (card.serviceRequest.gps) {
      params.set("latitude", String(card.serviceRequest.gps.latitude));
      params.set("longitude", String(card.serviceRequest.gps.longitude));
    }
    return `/${locale}/my-assets?${params.toString()}`;
  }, [card, locale]);

  if (loading) {
    return (
      <main
        data-bagui="page"
        data-solar-surface="atelier"
        className="solar-warranty-portal min-h-dvh px-4 py-8 md:px-8"
      >
        <div className="mx-auto max-w-5xl animate-pulse space-y-5">
          <div className="solar-warranty-skeleton h-5 w-32 rounded-full" />
          <div className="solar-warranty-skeleton h-80 rounded-[1.5rem]" />
          <div className="solar-warranty-skeleton h-56 rounded-[1.5rem]" />
        </div>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main
        data-bagui="page"
        data-solar-surface="atelier"
        className="solar-warranty-portal grid min-h-dvh place-items-center px-5 py-12"
      >
        <section className="solar-warranty-panel w-full max-w-md p-7 text-center">
          <TriangleAlert className="mx-auto h-9 w-9 text-amber-300" />
          <h1 className="mt-4 text-xl font-bold">{t("unavailableTitle")}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{error || t("unavailableDescription")}</p>
          <Link
            href={`/${locale}/my-assets`}
            className="solar-warranty-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("backToAssets")}
          </Link>
        </section>
      </main>
    );
  }

  const isCovered = card.warranty.status === "UNDER_WARRANTY";
  const progress = Math.min(100, Math.max(0, card.warranty.daysRemaining / 730 * 100));

  return (
    <main
      data-bagui="page"
      data-solar-surface="atelier"
      className="solar-warranty-portal min-h-dvh px-4 py-6 md:px-8 md:py-10"
    >
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between gap-4">
          <Link
            href={`/${locale}`}
            className="solar-warranty-brand inline-flex min-h-11 items-center gap-2 rounded-full px-2 py-1 text-sm font-semibold transition"
          >
            <Image
              src="/asset/sd-logo.png"
              alt=""
              width={48}
              height={48}
              priority
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="sr-only">{t("backToHome")}</span>
            <span className="w-[7.2rem] sm:w-[8.4rem]">
              <Image
                src="/asset/sd-text.png"
                alt="SolarDream"
                width={880}
                height={281}
                priority
                sizes="(min-width: 640px) 134px, 115px"
                className="h-auto w-full object-contain"
              />
            </span>
          </Link>
          <span className="solar-warranty-kicker text-xs font-bold uppercase tracking-[0.16em]">{t("eyebrow")}</span>
        </header>

        <section className="solar-warranty-panel overflow-hidden">
          <div className="flex flex-col gap-8 p-6 md:p-9">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8de28d]">
                  <ShieldCheck className="h-4 w-4" />
                  {t("eyebrow")}
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-white md:text-5xl">{t("title")}</h1>
                <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">{t("subtitle", { name: card.customer.name })}</p>
              </div>
              <div className={isCovered
                ? "solar-warranty-status solar-warranty-status--covered inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-bold"
                : "solar-warranty-status solar-warranty-status--expired inline-flex items-center gap-2 self-start rounded-full border px-4 py-2 text-sm font-bold"}
              >
                <span aria-hidden="true">{isCovered ? "🟢" : "🟠"}</span>
                {isCovered ? t("status.covered") : t("status.expired")}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="solar-warranty-stat rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="block text-xs font-semibold text-slate-400">{t("fields.system")}</span>
                <span className="mt-1 block text-xl font-bold text-white">{card.installation.systemSizeKwp} kW</span>
                <span className="mt-1 block text-xs text-slate-400">{card.installation.systemLabel}</span>
              </div>
              <div className="solar-warranty-stat rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="block text-xs font-semibold text-slate-400">{t("fields.installationDate")}</span>
                <span className="mt-1 block text-base font-bold text-white">{formatDate(card.installation.installedAt, locale)}</span>
                <span className="mt-1 block truncate text-xs text-slate-400" title={card.installation.systemId}>{card.installation.systemId}</span>
              </div>
              <div className="solar-warranty-stat rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <span className="block text-xs font-semibold text-slate-400">{t("fields.installationCoverage")}</span>
                <span className="mt-1 block text-xl font-bold text-white">{card.warranty.daysRemaining.toLocaleString(locale === "th" ? "th-TH" : "en-US")}</span>
                <span className="mt-1 block text-xs text-slate-400">{t("daysRemaining")}</span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-slate-300">
                <span>{t("coverageProgress")}</span>
                <span>{card.warranty.expiresAt ? formatDate(card.warranty.expiresAt, locale) : "—"}</span>
              </div>
              <div className="solar-warranty-progress-track h-2 overflow-hidden rounded-full">
                <div className={isCovered ? "solar-warranty-progress solar-warranty-progress--covered h-full rounded-full" : "solar-warranty-progress solar-warranty-progress--expired h-full rounded-full"} style={{ width: `${progress}%` }} />
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-start gap-2 text-sm text-slate-300">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#8de28d]" />
                <span className="truncate" title={card.installation.address}>{card.installation.address}</span>
              </div>
              <Link
                href={serviceHref}
                className="solar-warranty-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition focus:outline-none"
              >
                <Wrench className="h-4 w-4" />
                {t("requestService")}
              </Link>
            </div>
          </div>
        </section>

        <section className="solar-warranty-panel p-6 md:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8de28d]">
                <ClipboardCheck className="h-4 w-4" />
                {t("equipmentEyebrow")}
              </div>
              <h2 className="mt-2 text-2xl font-bold text-white">{t("equipmentTitle")}</h2>
            </div>
            <span className="text-sm font-semibold text-slate-400">{card.equipment.length} {t("components")}</span>
          </div>

          <div className="mt-5 divide-y divide-white/10">
            {card.equipment.map((item) => {
              const Icon = equipmentIcon(item.itemName);
              const covered = item.status === "UNDER_WARRANTY";
              return (
                <div key={item.id} className="flex flex-col gap-4 py-5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="solar-warranty-icon grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.05] text-[#8de28d]"><Icon className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-white">{item.itemName}</p>
                      <p className="mt-1 truncate font-mono text-xs text-slate-400">{item.serialNumber}</p>
                      {item.manufacturer && <p className="mt-1 text-xs text-slate-500">{item.manufacturer}</p>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-5 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="text-xs text-slate-400">{t("expires")}</p>
                      <p className="mt-1 text-sm font-bold text-white">{formatDate(item.warrantyExpiryDate, locale)}</p>
                    </div>
                    <span className={covered
                      ? "inline-flex items-center gap-1.5 rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1.5 text-xs font-bold text-emerald-200"
                      : "inline-flex items-center gap-1.5 rounded-full border border-rose-300/20 bg-rose-300/10 px-3 py-1.5 text-xs font-bold text-rose-200"}
                    >
                      <BadgeCheck className="h-3.5 w-3.5" />
                      {covered ? t("status.active") : t("status.expired")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
          <div className="solar-warranty-panel p-6 md:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8de28d]">
              <FileText className="h-4 w-4" />
              {t("documentsEyebrow")}
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">{t("documentsTitle")}</h2>
            <div className="mt-5 space-y-2">
              {[
                ...(card.documents.handoverCertificate ? [card.documents.handoverCertificate] : []),
                ...card.documents.inverterDatasheets,
                ...card.documents.singleLineDiagrams,
              ].map((document) => (
                <a
                  key={document.url}
                  href={document.url}
                  target="_blank"
                  rel="noreferrer"
                  className="solar-warranty-document flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-[#b7d1ea]/50 hover:bg-white/[0.08]"
                >
                  <span className="flex min-w-0 items-center gap-3"><Download className="h-4 w-4 shrink-0 text-[#8de28d]" /><span className="truncate">{document.label}</span></span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
                </a>
              ))}
              {card.documents.handoverCertificate === null && card.documents.inverterDatasheets.length === 0 && card.documents.singleLineDiagrams.length === 0 && (
                <p className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-sm text-slate-400">{t("noDocuments")}</p>
              )}
            </div>
          </div>

          <div className="solar-warranty-panel p-6 md:p-8">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[#8de28d]">
              <FileChartColumn className="h-4 w-4" />
              {t("serviceEyebrow")}
            </div>
            <h2 className="mt-2 text-2xl font-bold text-white">{t("serviceTitle")}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">{t("serviceDescription")}</p>
            {card.serviceRequest.gps && (
              <p className="mt-4 text-xs font-mono text-slate-400">GPS {card.serviceRequest.gps.latitude.toFixed(6)}, {card.serviceRequest.gps.longitude.toFixed(6)}</p>
            )}
            <Link
              href={serviceHref}
              className="solar-warranty-secondary mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition"
            >
              <Wrench className="h-4 w-4" />
              {t("openServiceRequest")}
            </Link>
            <div className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-500">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
              {t("serviceHint")}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
