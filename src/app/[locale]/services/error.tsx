"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";

export default function ServicesError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const t = useTranslations("ServicesPage");

  useEffect(() => {
    console.error("[Services] Route error", error);
  }, [error]);

  return (
    <PageShell className="grid place-items-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-800">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-2xl font-black text-slate-950">
          {t("errorTitle")}
        </h1>
        <p className="mt-3 text-slate-600">{t("errorDescription")}</p>
        <Button type="button" onClick={retry} className="mt-6">
          {t("tryAgain")}
        </Button>
      </Card>
    </PageShell>
  );
}
