import { Suspense } from "react";
import AuthFlowPage from "@/components/auth/AuthFlowPage";

export const instant = false;

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-dvh bg-[var(--sd-page)]" aria-hidden="true" />}>
      <AuthFlowPage initialMode="login" />
    </Suspense>
  );
}
