import type { Metadata } from "next";
import { isLocale } from "@/i18n/locales";
import TrackPortalClient from "./TrackPortalClient";

export const metadata: Metadata = {
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export const instant = false;

export default async function TrackPortalPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale: value, token } = await params;
  const locale = isLocale(value) ? value : "th";
  return <TrackPortalClient locale={locale} tokenId={token} />;
}
