import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getMyPurchasedProducts } from "@/app/actions/assets";
import { getMyInstalledAssets } from "@/app/actions/afterSales";
import MyAssetsClient from "./MyAssetsClient";
import { PageShell } from "@/components/ui/page-shell";


function getQueryValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function MyAssetsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [purchasedResult, installedResult] = await Promise.all([
    getMyPurchasedProducts(),
    getMyInstalledAssets(),
  ]);
  const query = searchParams ? await searchParams : {};
  const latitude = Number(getQueryValue(query.latitude));
  const longitude = Number(getQueryValue(query.longitude));
  const assetId = getQueryValue(query.assetId)?.trim() || "";
  const systemId = getQueryValue(query.systemId)?.trim() || "";

  return (
    <PageShell className="bg-background px-4 py-8 md:px-8">
      <MyAssetsClient
        initialAssets={purchasedResult.success ? purchasedResult.assets || [] : []}
        initialInstalledAssets={installedResult.success ? installedResult.assets || [] : []}
        initialError={purchasedResult.error || installedResult.error || ""}
        serviceRequestPrefill={assetId ? {
          assetId,
          type: getQueryValue(query.request) === "maintenance" ? "MAINTENANCE" : "REPAIR",
          systemId: systemId || null,
          latitude: Number.isFinite(latitude) ? latitude : null,
          longitude: Number.isFinite(longitude) ? longitude : null,
        } : undefined}
      />
    </PageShell>
  );
}
