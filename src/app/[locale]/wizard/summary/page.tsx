import { db } from "@/db";
import { financingOptions } from "@/db/schema";
import { getActiveWizardForSummary } from "@/app/actions/wizard";
import SummaryClient from "./SummaryClient";
import type { RecommendCategory } from "@/lib/wizardRecommendation";
import { parseWizardRecommendationConfig } from "@/lib/wizardRecommendationConfig";
import type {
  WizardOptionScoringMap,
  WizardRecommendationRule,
  WizardRuleAction,
  WizardRuleCondition,
  WizardScoringImpact,
} from "@/lib/wizardRules";
import { asc, eq } from "drizzle-orm";
import type { FinancingOptionSource } from "@/lib/financialPlan";
import { getCachedPublicBuildConfig } from "@/lib/public-build-config-cache";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import { getCachedWizardSummaryCatalog } from "@/lib/wizard-summary-catalog";

export const instant = false;

export default async function WizardSummaryPage({
  params,
}: {
  params: Promise<{ locale: "en" | "th" }>;
}) {
  const { locale } = await params;
  const [activeWizard, buildConfig, catalog, financeRows] = await Promise.all([
    getActiveWizardForSummary(locale),
    getCachedPublicBuildConfig(locale),
    getCachedWizardSummaryCatalog(),
    db.query.financingOptions.findMany({
      where: eq(financingOptions.isActive, true),
      orderBy: [asc(financingOptions.createdAt)],
    }).catch((error: unknown) => {
      console.warn(
        "WizardSummaryPage: financing options unavailable; continuing without financing plans.",
        error instanceof Error ? error.message : "unknown database error",
      );
      return [];
    }),
  ]);
  const recommendationConfig = parseWizardRecommendationConfig(
    activeWizard?.recommendationConfig,
  );
  const optionScoringMap: WizardOptionScoringMap = {};
  for (const step of activeWizard?.steps || []) {
    for (const question of step.questions) {
      optionScoringMap[question.stateKey] = Object.fromEntries(
        question.options.map((option) => [
          option.value,
          Array.isArray(option.scoringImpacts)
            ? (option.scoringImpacts as WizardScoringImpact[])
            : [],
        ]),
      );
    }
  }
  const recommendationRules: WizardRecommendationRule[] = (
    activeWizard?.rules || []
  ).map((rule) => ({
    id: rule.id,
    wizardId: rule.wizardId,
    ruleName: rule.ruleName,
    conditions: Array.isArray(rule.conditions)
      ? (rule.conditions as WizardRuleCondition[])
      : [],
    actions: Array.isArray(rule.actions)
      ? (rule.actions as WizardRuleAction[])
      : [],
    isActive: rule.isActive,
  }));

  const productsByCategory = new Map<string, typeof catalog.products>();
  for (const product of catalog.products) {
    const products = productsByCategory.get(product.categoryId) || [];
    products.push(product);
    productsByCategory.set(product.categoryId, products);
  }

  const categories: RecommendCategory[] = catalog.categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    slug: cat.slug,
    displayOrder: cat.displayOrder,
    isRequired: cat.isRequired,
    products: (productsByCategory.get(cat.id) || []).map((p) => {
      const metadata = { ...p.metadata };

      // Enrich solar panels metadata with default specs if not defined
      if (cat.slug === "solar-panels") {
        metadata.powerRating =
          metadata.powerRating ?? metadata.wattage ?? metadata.power ?? 550;
        metadata.efficiency = metadata.efficiency ?? "21.5%";
      }

      // Enrich inverters metadata with default specs if not defined
      if (cat.slug === "inverters") {
        metadata.capacity =
          metadata.capacity ?? metadata.powerRating ?? "5 kW";
        metadata.phase = metadata.phase ?? "Single Phase";
      }

      return {
        id: p.id,
        name: `${p.brand} ${p.model}`.trim(),
        brand: p.brand,
        model: p.model,
        erpnextItemCode: p.erpnextItemCode || p.id,
        price: p.price,
        imageUrl: p.imageUrl,
        description: p.description,
        categoryId: p.categoryId,
        metadata,
        useInRecommendation: p.useInRecommendation,
        recommendTier: p.recommendTier,
        recommendPriority: p.recommendPriority,
      };
    }),
  }));

  const financingPlanOptions: FinancingOptionSource[] = financeRows.map((option) => ({
    id: option.id,
    providerName: option.providerName,
    financeType: option.financeType,
    interestRate: option.interestRate,
    maxTermMonths: option.maxTermMonths,
    minSystemCost: option.minSystemCost,
    eligibilityRules: option.eligibilityRules,
    marketingTag: option.marketingTag,
    isActive: option.isActive,
    createdAt: option.createdAt,
  }));
  return (
    <SolarRouteShell className="solar-summary-page w-full min-w-0 max-w-full text-[#0F172A]">
      <SummaryClient
        categories={categories}
        recommendationConfig={recommendationConfig}
        optionScoringMap={optionScoringMap}
        recommendationRules={recommendationRules}
        financingOptions={financingPlanOptions}
        buildConfig={buildConfig}
      />
    </SolarRouteShell>
  );
}
