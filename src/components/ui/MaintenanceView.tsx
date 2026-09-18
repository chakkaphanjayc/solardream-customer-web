"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { ArrowLeft, RefreshCw } from "@/components/ui/icons";
import { SolarStatePanel } from "@/components/ui/solar-system";

type MaintenanceViewProps = {
  featureName?: string;
  title?: string;
  subtext?: string;
  homeLink?: string;
  locale?: string;
};

export default function MaintenanceView({
  featureName,
  title,
  subtext,
  homeLink = "/",
  locale: propLocale,
}: MaintenanceViewProps) {
  const contextLocale = useLocale();
  let activeLocale = propLocale || contextLocale;

  if (!activeLocale && typeof window !== "undefined") {
    activeLocale = window.location.pathname.startsWith("/en") ? "en" : "th";
  }
  activeLocale = activeLocale || "th";
  const t = useTranslations("MaintenanceView");
  const displayTitle = title ?? t("title");
  const displaySubtext = subtext ?? t("description");
  const resolvedHomeLink = homeLink === "/" ? `/${activeLocale}` : homeLink;

  return (
    <SolarStatePanel
      kind="error"
      title={displayTitle}
      description={
        featureName ? (
          <>
            {displaySubtext} <span className="sr-only">{featureName}</span>
          </>
        ) : (
          displaySubtext
        )
      }
      soliaAlt={t("soliaAlt")}
      headingLevel={1}
      className="mt-20 min-h-[60vh] p-8 sm:mt-24"
      action={
        <div className="flex flex-col items-center justify-center gap-3 font-sans sm:flex-row">
          <Link href={resolvedHomeLink} className="solar-ui-primary inline-flex">
            <ArrowLeft className="h-4 w-4" />
            <span>{t("backHome")}</span>
          </Link>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="solar-ui-secondary inline-flex"
          >
            <RefreshCw className="h-4 w-4" />
            <span>{t("tryAgain")}</span>
          </button>
        </div>
      }
    />
  );
}
