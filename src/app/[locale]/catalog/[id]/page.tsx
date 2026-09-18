import { db } from "@/db";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { generatePublicProductName } from "@/lib/productUtils";
import PageWrapper from "@/components/ui/PageWrapper";
import { PageShell } from "@/components/ui/page-shell";
import ProductDetailClient from "./ProductDetailClient";
import { JsonLd, type JsonLdObject } from "@/components/seo/JsonLd";
import { getConfiguredPublicSiteUrl } from "@/lib/siteUrl";
import { getCatalogProduct, type ErpnextCatalogProduct } from "@/lib/erpnextCatalog";

// Product details are backed by live inventory and pricing, so this route
// remains request-time even though the catalog index uses public caching.

interface PageProps {
  params: Promise<{ id: string; locale: string }>;
}

export const instant = false;

type ProductDetail = ErpnextCatalogProduct;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;

  try {
    const product = await getCatalogProduct(id);
    const globalSeo = await db.query.globalSeo.findFirst({
      where: (globalSeo, { eq }) => eq(globalSeo.id, "default"),
    });

    if (!product || !product.isActive) {
      return {
        title: "Product Not Found | Crafted Solar",
      };
    }

    const productName = generatePublicProductName(product);
    const title =
      product.seoTitle ||
      `${productName} | Premium Solar Component` ||
      globalSeo?.defaultSeoTitle ||
      "CRAFTED | Ultra-Premium Product Configurator";

    const description =
      product.seoDescription ||
      product.description ||
      globalSeo?.defaultSeoDescription ||
      "Explore high-performance components custom-tailored to your architectural plans.";

    const images = product.seoImage
      ? [{ url: product.seoImage }]
      : globalSeo?.defaultOgImage
      ? [{ url: globalSeo.defaultOgImage }]
      : product.imageUrl
      ? [{ url: product.imageUrl }]
      : [];

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        images,
        type: "music.song",
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: images.map(img => img.url),
      },
    };
  } catch (error) {
    console.error("Error generating product metadata:", error);
    return {
      title: "Premium Solar Component | Crafted Solar",
    };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id, locale } = await params;

  let product: ProductDetail | null = null;
  try {
    product = await getCatalogProduct(id);
  } catch (error) {
    console.error("ERPNext connection error in ProductDetailPage:", error);
  }

  if (!product || !product.isActive) {
    notFound();
  }

  const productName = generatePublicProductName(product);
  const siteUrl = getConfiguredPublicSiteUrl();
  const productSchema: JsonLdObject = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: productName,
    sku: product.erpnextItemCode,
    description: product.seoDescription || product.description || productName,
    url: `${siteUrl}/${locale}/catalog/${product.id}`,
    ...(product.imageUrl ? { image: product.imageUrl } : {}),
    brand: { "@type": "Brand", name: product.brand },
    offers: {
      "@type": "Offer",
      priceCurrency: "THB",
      price: product.price,
      availability: product.isAvailable
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: `${siteUrl}/${locale}/catalog/${product.id}`,
    },
  };

  // Parse specifications from JSON metadata
  let specs: Record<string, unknown> = {};
  if (product.metadata) {
    try {
      specs = typeof product.metadata === "string" 
        ? JSON.parse(product.metadata) 
        : (product.metadata as Record<string, unknown>);
    } catch (e) {
      console.error("Failed to parse product specs JSON:", e);
    }
  }

  return (
    <PageShell>
      <PageWrapper>
        <JsonLd data={productSchema} />
        <ProductDetailClient product={product} specs={specs} />
      </PageWrapper>
    </PageShell>
  );
}
