import { isOpsV2FeatureEnabled } from "@/lib/featureFlags";
import CustomerProjectDetailClient from "./CustomerProjectDetailClient";


export default async function CustomerProjectDetailPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const enabled = await isOpsV2FeatureEnabled("OPS_V2_CUSTOMER_PORTAL");
  const { projectId } = await params;
  return <CustomerProjectDetailClient enabled={enabled} projectId={projectId} />;
}
