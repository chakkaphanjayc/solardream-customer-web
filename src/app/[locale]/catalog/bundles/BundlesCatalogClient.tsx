"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ProductBundlesList from "@/components/catalog/ProductBundlesList";
import { AlertCircle, ArrowLeft } from "@/components/ui/icons";
import Link from "next/link";
import { MotionReveal } from "@/components/ui/motion-reveal";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
        <Card tone="subtle" className="space-y-4 border-dashed bg-[#E6E3DC] py-24 text-center rounded-[28px] border-[#F7F6F3]">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#CBC7BE] bg-[#DCE8F5]">
            <AlertCircle className="h-5 w-5 text-[#4F7FA8]" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-[#2E2C27]">
              {t("title")}
            </h3>
            <p className="mx-auto max-w-xs text-xs font-semibold leading-relaxed text-[#4E4B44]">
              {t("description")}
            </p>
          </div>
          <div className="pt-2">
            <Button asChild className="rounded-full bg-[#B7D1EA] hover:bg-[#A5C2DE] text-white active:scale-95 shadow-md">
              <Link
                href={`/${locale}/catalog`}
                className="text-xs font-black uppercase tracking-widest"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>{t("browseCatalog")}</span>
              </Link>
            </Button>
          </div>
        </Card>
      )}
    </MotionReveal>
  );
}
