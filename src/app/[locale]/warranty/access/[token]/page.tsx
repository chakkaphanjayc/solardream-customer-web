import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import GuestWarrantyAccessClient from "./GuestWarrantyAccessClient";

export const metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};


export default async function GuestWarrantyAccessPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const enabled = await isOpsV2FeatureEnabled("OPS_V2_WARRANTY");
  const { token } = await params;
  return <GuestWarrantyAccessClient enabled={enabled} token={token} />;
}
