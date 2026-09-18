"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { LifeBuoy, Sun } from "@/components/ui/icons";
import { SolarStatePanel } from "@/components/ui/solar-system";

type OpsPortalShellProps = {
  title: string;
  description: string;
  enabled: boolean;
  children: ReactNode;
};

export function OpsPortalShell({ title, description, enabled, children }: OpsPortalShellProps) {
  const locale = useLocale();
  const t = useTranslations("CustomerPortal");
  const prefix = "/" + locale + "/portal";

  return (
    <div
      data-bagui="customer-operations-portal"
      data-solar-surface="atelier"
      className="solar-route-shell solar-portal-surface relative min-h-dvh overflow-hidden bg-[var(--sd-page)] px-4 pb-16 pt-20 text-[var(--sd-ink)] sm:px-6 sm:pt-24 md:pb-20 md:pt-28"
    >
      <div className="pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full bg-[var(--sd-selected)]/70 blur-3xl" aria-hidden="true" />
      <div className="pointer-events-none absolute top-1/2 -left-40 h-80 w-80 rounded-full bg-[var(--sd-anime-highlight)]/55 blur-3xl" aria-hidden="true" />

      <div className="relative mx-auto max-w-6xl space-y-6">
        <header className="solar-route-card solar-route-card--strong solar-portal-header flex flex-col gap-5 rounded-[var(--sd-radius-feature)] p-5 sm:p-7 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link href={"/" + locale} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--sd-navy-900)]">
              <Sun className="h-4 w-4" aria-hidden="true" />
              {t("shell.brand")}
            </Link>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--sd-ink)] sm:text-4xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-6 text-[var(--sd-text)]">{description}</p>
          </div>
          <nav aria-label={t("shell.navLabel")} className="flex flex-wrap gap-2">
            <Link href={prefix + "/projects"} className="solar-ui-secondary rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95">{t("shell.projects")}</Link>
            <Link href={prefix + "/warranties"} className="solar-ui-secondary rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95">{t("shell.warranties")}</Link>
            <Link href={prefix + "/service"} className="solar-ui-primary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all active:scale-95"><LifeBuoy className="h-4 w-4" aria-hidden="true" /> {t("shell.help")}</Link>
          </nav>
        </header>

        {!enabled ? (
          <SolarStatePanel
            kind="empty"
            title={t("shell.disabledTitle")}
            description={t("shell.disabledDescription")}
            soliaAlt={t("shell.disabledAlt")}
            action={
              <Link
                href={"/" + locale + "/portal/warranty"}
                className="solar-ui-primary mt-2 rounded-full"
              >
                {t("shell.disabledAction")}
              </Link>
            }
          />
        ) : children}
      </div>
    </div>
  );
}
