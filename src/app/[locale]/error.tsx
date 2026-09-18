"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, RefreshCcw } from "@/components/ui/icons";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import { SolarStatePanel } from "@/components/ui/solar-system";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = pathname.startsWith("/en") ? "en" : "th";

  useEffect(() => {
    // If a deployment update invalidated the client's Server Action hash, reload the browser to get the latest bundle.
    if (
      error.message?.includes("Failed to find Server Action") ||
      error.message?.includes("older or newer deployment")
    ) {
      window.location.reload();
      return;
    }
    console.error("Locale route error caught:", error);
  }, [error]);

  return (
    <SolarRouteShell className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto w-full max-w-2xl">
        <SolarStatePanel
          kind="error"
          headingLevel={1}
          title={locale === "th" ? "ไม่สามารถโหลดข้อมูลในหน้านี้ได้" : "This page could not load"}
          description={locale === "th" ? "ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งหรือกลับสู่หน้าหลักได้ทันที" : "Something interrupted this page. Try again or return to the SolarDream home page."}
          soliaAlt={locale === "th" ? "โซเลียกำลังช่วยกู้คืนหน้านี้" : "Solia helping recover this page"}
          action={(
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => reset()}
                className="solar-ui-primary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold"
              >
                <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                <span>{locale === "th" ? "ลองใหม่อีกครั้ง" : "Try again"}</span>
              </button>
              <Link
                href={`/${locale}`}
                className="solar-ui-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold"
              >
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>{locale === "th" ? "กลับหน้าหลัก" : "Go home"}</span>
              </Link>
            </div>
          )}
        />
      </div>
    </SolarRouteShell>
  );
}
