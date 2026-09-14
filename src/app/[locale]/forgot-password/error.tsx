"use client";

import AuthRouteError from "@/components/auth/AuthRouteError";

export default function ForgotPasswordError({ reset }: { reset: () => void }) {
  return <AuthRouteError reset={reset} />;
}
