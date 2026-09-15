import { db } from "@/db";
import {
  wizards,
  wizardSteps,
  wizardQuestions,
  wizardOptions,
} from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import WizardClient from "./WizardClient";
import { withSolarDreamWizardPreset } from "@/lib/solarWizardPreset";
import { getCachedPageSeo } from "@/app/actions/seo";
import { getCachedPublicBuildConfig } from "@/lib/public-build-config-cache";
import type { Metadata } from "next";
import type { WizardDefinition } from "@/types/wizard";


export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedPageSeo("wizard");
  return {
    title: seo.seoTitle,
    description: seo.seoDescription,
    keywords: seo.seoKeywords
      ? seo.seoKeywords.split(",").map((k) => k.trim())
      : [],
    openGraph: {
      title: seo.seoTitle,
      description: seo.seoDescription,
      images: seo.seoImage ? [{ url: seo.seoImage }] : [],
    },
  };
}

import FeatureGuard from "@/components/features/FeatureGuard";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";

export default async function WizardPage({
  params,
}: {
  params: Promise<{ locale: "en" | "th" }>;
}) {
  const { locale } = await params;
  const wizardPromise = db.query.wizards
    .findFirst({
      where: eq(wizards.slug, "advanced-solar-engineering"),
      with: {
        steps: {
          orderBy: [asc(wizardSteps.order)],
          with: {
            questions: {
              orderBy: [asc(wizardQuestions.order)],
              with: {
                options: {
                  orderBy: [asc(wizardOptions.order)],
                },
              },
            },
          },
        },
      },
    })
    .catch((err: unknown) => {
      console.error("Error fetching wizard in WizardPage:", err);
      return null;
    });
  const [wizard, buildConfig] = await Promise.all([
    wizardPromise,
    getCachedPublicBuildConfig(locale),
  ]);

  const liveWizard = withSolarDreamWizardPreset(wizard);

  return (
    <SolarRouteShell className="solar-wizard-page px-4 pb-20 text-[#1C1C1A] sm:px-6 lg:px-8">
      <FeatureGuard featureKey="wizard_module" featureName="Wizard Engine">
        <WizardClient
          wizard={liveWizard as WizardDefinition}
          buildConfig={buildConfig}
        />
      </FeatureGuard>
    </SolarRouteShell>
  );
}
