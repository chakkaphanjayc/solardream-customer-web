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
import { Card } from "@/components/ui/card";
import { AlertCircle } from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";


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
        <Card className="mx-auto max-w-3xl p-8 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <AlertCircle className="h-6 w-6" aria-hidden="true" />
          </span>
          <h1 className="mt-5 text-2xl font-black text-slate-950">
            {t("unavailableTitle")}
          </h1>
          <p className="mt-3 text-slate-600">{t("unavailableDescription")}</p>
        </Card>
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
