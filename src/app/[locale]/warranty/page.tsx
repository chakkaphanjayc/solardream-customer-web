import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import GuestWarrantyRequestClient from "./GuestWarrantyRequestClient";


export default async function GuestWarrantyPage() {
  const enabled = await isOpsV2FeatureEnabled("OPS_V2_WARRANTY");
  return <GuestWarrantyRequestClient enabled={enabled} />;
}
