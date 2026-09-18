import CatalogClient, { type CatalogProduct } from "./CatalogClient";
import Link from "next/link";
import { LayoutGrid } from "@/components/ui/icons";
import { getTranslations } from "next-intl/server";
import { getInfiniteProducts } from "@/app/actions/product";
import PageWrapper from "@/components/ui/PageWrapper";
import { Button } from "@/components/ui/button";
import { PageHeader, PageShell } from "@/components/ui/page-shell";
import { SolarStatePanel } from "@/components/ui/solar-system";
import { getCachedPageSeo } from "@/app/actions/seo";
import type { Metadata } from "next";
import {
  listCatalogBrands,
  listCatalogBundles,
  listCatalogCategories,
} from "@/lib/erpnextCatalog";
import type {
  ErpnextCatalogBundle,
} from "@/lib/erpnextCatalog";

// The catalog combines URL filters, live inventory, and editable bundles.
// Keep the filtered feed request-time; its independent public reads can be
// cached without serving stale inventory to a customer.

export async function generateMetadata(): Promise<Metadata> {
  const seo = await getCachedPageSeo("catalog");
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

type CatalogCategory = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  parentId: string | null;
  parent: {
    id: string;
    name: string;
  } | null;
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{
    search?: string;
    categoryId?: string;
    sort?: string;
    brand?: string;
  }>;
}

export default async function CatalogPage({ params, searchParams }: PageProps) {
  const t = await getTranslations("CatalogPage");
  const { locale } = await params;

  const resolvedParams = await searchParams;
  const search = resolvedParams.search || "";
  const categoryId = resolvedParams.categoryId || "";
  const sort = resolvedParams.sort || "";
  const brand = resolvedParams.brand || "";

  let categories: CatalogCategory[] = [];
  let brandsList: Array<{ id: string; name: string; logoUrl: string | null }> =
    [];
  let initialProducts: CatalogProduct[] = [];
  let initialHasMore = false;
  let initialBundles: ErpnextCatalogBundle[] = [];
  let errorOccurred = false;

  try {
    const [erpCategories, erpBrands, result, erpBundles] = await Promise.all([
      listCatalogCategories(),
      listCatalogBrands(),
      getInfiniteProducts({
        search,
        categoryId,
        sort,
        brand,
        skip: 0,
        take: 12,
      }),
      listCatalogBundles(),
    ]);

    categories = erpCategories as CatalogCategory[];
    brandsList = erpBrands;

    if (result.success && result.products) {
      initialProducts = result.products;
      initialHasMore = !!result.hasMore;
    } else {
      errorOccurred = true;
    }

    initialBundles = erpBundles;
  } catch (err) {
    console.error("ERPNext catalog connection error in CatalogPage:", err);
    errorOccurred = true;
  }

  if (errorOccurred) {
    return (
      <PageShell className="flex items-center justify-center px-6 pb-20 pt-24 lg:px-8">
        <SolarStatePanel
          kind="error"
          className="w-full max-w-lg"
          title={t("connectionIssue.title")}
          description={t("connectionIssue.description")}
          headingLevel={1}
          soliaAlt={
            locale === "th"
              ? "โซเลียกำลังช่วยกู้คืนแคตตาล็อกอุปกรณ์"
              : "Solia helping recover the SolarDream component catalog"
          }
          action={
            <Button asChild size="lg" className="mt-2">
              <Link href={`/${locale}/catalog`}>{t("connectionIssue.retryBtn")}</Link>
            </Button>
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="bg-[#F0EEE9] text-[#1C1C1A]">
      <PageWrapper className="min-h-dvh bg-transparent px-4 pb-20 pt-10 sm:px-6 lg:px-8">
        <div className="mx-auto space-y-12 lg:max-w-[85vw] xl:max-w-[90vw]">
          <PageHeader
            eyebrow={
              <span className="inline-flex items-center gap-2 rounded-full bg-[#DCE8F5] px-3.5 py-1 text-xs font-bold text-[#2E2C27]">
                <LayoutGrid className="h-3.5 w-3.5 text-[#4F7FA8]" aria-hidden="true" />
                {t("header.badge")}
              </span>
            }
            title={`${t("header.title")}.`}
            description={t("header.description")}
          />

          {/* Catalog layout container with sticky sidebar & infinite scroll feed */}
          <CatalogClient
            key={`${search}|${categoryId}|${sort}|${brand}`}
            initialProducts={initialProducts}
            initialHasMore={initialHasMore}
            categories={categories}
            brandsList={brandsList}
            search={search}
            categoryId={categoryId}
            sort={sort}
            brand={brand}
            initialBundles={initialBundles}
          />
        </div>
      </PageWrapper>
    </PageShell>
  );
}
