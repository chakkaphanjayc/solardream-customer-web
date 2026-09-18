"use client";

import { useEffect } from "react";
import Link from "next/link";

import { Home, RefreshCcw } from "@/components/ui/icons";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";
import { SolarStatePanel } from "@/components/ui/solar-system";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (
      error.message?.includes("Failed to find Server Action") ||
      error.message?.includes("older or newer deployment")
    ) {
      window.location.reload();
      return;
    }

    console.error("Global application error caught:", error);
  }, [error]);

  return (
    <html lang="th">
      <head>
        <title>SolarDream — เกิดข้อผิดพลาดชั่วคราว</title>
      </head>
      <body data-solar-ui="customer">
        <SolarRouteShell as="main" className="min-h-dvh px-4 py-12 sm:px-6 sm:py-20">
          <div className="mx-auto w-full max-w-2xl">
            <SolarStatePanel
              kind="error"
              headingLevel={1}
              title="เกิดข้อผิดพลาดชั่วคราวในการโหลดหน้าเว็บ"
              description="ระบบเกิดปัญหาในการโหลดข้อมูล ลองใหม่อีกครั้งหรือกลับสู่หน้าหลักเพื่อเริ่มต้นใหม่ได้ทันที"
              soliaAlt="โซเลียกำลังช่วยกู้คืน SolarDream"
              action={(
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => reset()}
                    className="solar-ui-primary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold"
                  >
                    <RefreshCcw className="h-4 w-4" aria-hidden="true" />
                    <span>ลองใหม่อีกครั้ง</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="solar-ui-secondary inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold"
                  >
                    <span>รีเฟรชหน้าเว็บ</span>
                  </button>
                  <Link
                    href="/"
                    className="solar-ui-secondary inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-5 py-3 text-xs font-bold"
                  >
                    <Home className="h-4 w-4" aria-hidden="true" />
                    <span>หน้าหลัก</span>
                  </Link>
                </div>
              )}
            />
          </div>
        </SolarRouteShell>
      </body>
    </html>
  );
}
