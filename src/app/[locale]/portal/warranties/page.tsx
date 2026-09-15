import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import CustomerWarrantiesClient from "./CustomerWarrantiesClient";


export default async function CustomerWarrantiesPage() {
  const enabled = await isOpsV2FeatureEnabled("OPS_V2_CUSTOMER_PORTAL");
  return <CustomerWarrantiesClient enabled={enabled} />;
}
