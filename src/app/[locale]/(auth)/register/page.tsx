import { Suspense } from "react";
import AuthFlowPage from "@/components/auth/AuthFlowPage";
import { cookies } from "next/headers";
import { getPortalClaimPrefill, SERVICE_PORTAL_CLAIM_COOKIE } from "@/lib/servicePortal";

// Registration may receive a request-scoped service-portal claim cookie.
// Keep this auth handoff request-time rendered under Next 16 Cache Components.

export default async function RegisterPage() {
  const cookieStore = await cookies();
  const claimPrefill = await getPortalClaimPrefill(cookieStore.get(SERVICE_PORTAL_CLAIM_COOKIE)?.value).catch(() => null);
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--sd-page)]" aria-hidden="true" />}>
      <AuthFlowPage initialMode="register" claimPrefill={claimPrefill} />
    </Suspense>
  );
}
