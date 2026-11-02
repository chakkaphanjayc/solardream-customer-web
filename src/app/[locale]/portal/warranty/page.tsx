import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { WarrantyCardSkeleton } from "@/components/portal/WarrantyCardSkeleton";
import WarrantyCardClient from "./WarrantyCardClient";

export default async function WarrantyCardPage() {
  const t = await getTranslations("WarrantyCard");

  return (
    <Suspense fallback={<WarrantyCardSkeleton loadingLabel={t("loading")} />}>
      <WarrantyCardClient />
    </Suspense>
  );
}
