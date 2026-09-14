import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import CustomerProjectsClient from "./CustomerProjectsClient";

export const instant = false;

export default async function CustomerProjectsPage() {
  const enabled = await isOpsV2FeatureEnabled("OPS_V2_CUSTOMER_PORTAL");
  return <CustomerProjectsClient enabled={enabled} />;
}
