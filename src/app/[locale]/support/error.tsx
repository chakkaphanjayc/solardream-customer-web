"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "@/components/ui/icons";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";

export default function SupportError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const locale = useLocale();
  const isThai = locale === "th";

  useEffect(() => {
    console.error("[Support] Route error", error);
  }, [error]);

  return (
    <SolarRouteShell className="solar-support-page px-4 py-12 text-foreground sm:px-6 lg:px-8">
      <Card className="solar-route-card mx-auto max-w-xl p-6 text-center sm:p-8">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-800">
          <AlertCircle className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 text-balance text-2xl font-bold tracking-tight">
          {isThai ? "โหลดศูนย์ช่วยเหลือไม่สำเร็จ" : "We could not load support"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-pretty text-sm leading-6 text-muted-foreground">
          {isThai
            ? "ข้อมูลของคุณยังคงปลอดภัย ลองโหลดหน้านี้อีกครั้ง หรือกลับไปที่ศูนย์ช่วยเหลือ"
            : "Your information is safe. Try loading this page again, or return to the support hub."}
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Button type="button" onClick={retry} className="solar-route-primary">
            {isThai ? "ลองอีกครั้ง" : "Try again"}
          </Button>
          <Button asChild variant="outline" className="solar-route-secondary">
            <Link href={`/${locale}/support`}>
              {isThai ? "กลับศูนย์ช่วยเหลือ" : "Return to support"}
            </Link>
          </Button>
        </div>
      </Card>
    </SolarRouteShell>
  );
}
