import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";

import { getDbUser } from "@/app/actions/auth";
import { listPublicServiceCatalogAction } from "@/app/actions/serviceCommerce";
import { db } from "@/db";
import { installedAssets, proposals } from "@/db/schema";
import { isLocale } from "@/i18n/locales";
import { listServiceConfig } from "@/lib/serviceMultiCommerce";
import ServicesHubClient from "./ServicesHubClient";

import FeatureGuard from "@/components/features/FeatureGuard";
import { PageShell } from "@/components/ui/page-shell";
import { SolarStatePanel } from "@/components/ui/solar-system";



export default async function ServicesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";
  const [catalogResult, config, user, t] = await Promise.all([
    listPublicServiceCatalogAction(),
    listServiceConfig(),
    getDbUser(),
    getTranslations({ locale, namespace: "ServicesPage" }),
  ]);

  const assets = user?.isActive
    ? await db
        .select({
          id: installedAssets.id,
          productName: installedAssets.productName,
          serialNumber: installedAssets.serialNumber,
          systemSizeKw: proposals.systemSizeKwp,
        })
        .from(installedAssets)
        .innerJoin(proposals, eq(proposals.id, installedAssets.proposalId))
        .where(eq(installedAssets.customerId, user.id))
        .orderBy(desc(installedAssets.installedDate))
    : [];

  if (!catalogResult.success) {
    return (
      <PageShell className="bg-background px-4 py-16">
        <SolarStatePanel
          kind="error"
          title={t("unavailableTitle")}
          description={t("unavailableDescription")}
          soliaAlt={locale === "th" ? "Solia แจ้งว่าบริการโซลาร์ยังไม่พร้อมใช้งาน" : "Solia reporting that solar services are unavailable"}
          headingLevel={1}
          className="mx-auto max-w-3xl"
        />
      </PageShell>
    );
  }

  return (
    <FeatureGuard featureKey="services_module" featureName="Solar Services">
      <ServicesHubClient
        locale={locale}
        offerings={catalogResult.offerings}
        options={config.options}
        assets={assets}
        isMember={Boolean(user?.isActive)}
      />
    </FeatureGuard>
  );
}
