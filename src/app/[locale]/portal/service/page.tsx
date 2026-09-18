import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import CustomerServiceClient from "./CustomerServiceClient";

// Feature flags are backed by request-time/runtime configuration for the
// authenticated portal and should not be forced through build-time prerender.

export default async function CustomerServicePage() {
  const [enabled, afterSalesEnabled] = await Promise.all([
    isOpsV2FeatureEnabled("OPS_V2_CUSTOMER_PORTAL"),
    isOpsV2FeatureEnabled("OPS_V2_AFTER_SALES"),
  ]);
  return <CustomerServiceClient enabled={enabled} afterSalesEnabled={afterSalesEnabled} />;
}
