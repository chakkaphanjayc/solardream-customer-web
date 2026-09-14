"use client";

import AuthRouteError from "@/components/auth/AuthRouteError";

export default function AccountSetupError({ reset }: { reset: () => void }) {
  return <AuthRouteError reset={reset} />;
}
