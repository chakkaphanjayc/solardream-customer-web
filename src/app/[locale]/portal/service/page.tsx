import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import CustomerServiceClient from "./CustomerServiceClient";


export default async function CustomerServicePage() {
  const [enabled, afterSalesEnabled] = await Promise.all([
    isOpsV2FeatureEnabled("OPS_V2_CUSTOMER_PORTAL"),
    isOpsV2FeatureEnabled("OPS_V2_AFTER_SALES"),
  ]);
  return <CustomerServiceClient enabled={enabled} afterSalesEnabled={afterSalesEnabled} />;
}
