import { getStorefrontBundles } from "@/app/actions/bundles";
import { getTranslations } from "next-intl/server";
import type { ComponentProps } from "react";
import { Gift } from "@/components/ui/icons";
import BundlesCatalogClient from "./BundlesCatalogClient";
import { PageShell, PageHeader } from "@/components/ui/page-shell";

// Bundle pricing is managed content that can change independently of the
// catalog index; keep this data-heavy feed request-time for correctness.


type StorefrontBundle = ComponentProps<typeof BundlesCatalogClient>["initialBundles"][number];

export default async function BundlesCatalogPage() {
  const navT = await getTranslations("Navigation");
  const t = await getTranslations("BundlesCatalogPage");
  const bundlesResult = await getStorefrontBundles();
  let bundles: StorefrontBundle[] = [];

  if (bundlesResult.success && bundlesResult.bundles) {
    bundles = bundlesResult.bundles.map((b) => ({
      ...b,
      items: b.items.map((item) => ({
        ...item,
        product: {
          ...item.product,
          name: `${item.product.brand} ${item.product.model}`.trim(),
        },
      })),
    }));
  }

  return (
    <PageShell className="bg-background px-4 pb-20 pt-10 text-foreground sm:px-6 lg:px-8">
      <div className="mx-auto space-y-12 lg:max-w-[85vw] xl:max-w-[90vw]">
        <PageHeader
          eyebrow={
            <span className="inline-flex items-center gap-2 rounded-pill border border-primary/45 bg-primary/25 px-3.5 py-1.5 text-sm font-black uppercase tracking-widest text-foreground">
              <Gift className="h-3.5 w-3.5" />
              {navT("bundles")}
            </span>
          }
          title={`${t("title")}.`}
          description={t("description")}
        />

        {/* Bundles Feed */}
        <BundlesCatalogClient initialBundles={bundles} />
      </div>
    </PageShell>
  );
}
