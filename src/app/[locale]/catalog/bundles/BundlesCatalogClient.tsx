"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ProductBundlesList from "@/components/catalog/ProductBundlesList";
import { ArrowLeft } from "@/components/ui/icons";
import Link from "next/link";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { SolarStatePanel } from "@/components/ui/solar-system";

export interface BundleItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    brand: string;
    model: string;
    price: number;
    name: string;
  };
}

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  discountType: string;
  discountValue: number;
  promoText: string | null;
  labels: string[];
  validFrom: Date | string | null;
  validUntil: Date | string | null;
  items: BundleItem[];
}

interface BundlesCatalogClientProps {
  initialBundles: Bundle[];
}

export default function BundlesCatalogClient({ initialBundles }: BundlesCatalogClientProps) {
  const t = useTranslations("BundlesCatalogPage.empty");
  const locale = useLocale();
  const [bundles] = useState<Bundle[]>(initialBundles);

  return (
    <MotionReveal className="space-y-10">
      {bundles.length > 0 ? (
        <ProductBundlesList bundles={bundles} />
      ) : (
        <SolarStatePanel
          kind="empty"
          title={t("title")}
          description={t("description")}
          soliaAlt={locale === "th" ? "Solia กำลังเตรียมชุดอุปกรณ์โซลาร์" : "Solia preparing solar equipment bundles"}
          action={
            <Link href={`/${locale}/catalog`} className="solar-ui-primary inline-flex">
              <ArrowLeft className="h-4 w-4" />
              <span>{t("browseCatalog")}</span>
            </Link>
          }
        />
      )}
    </MotionReveal>
  );
}
