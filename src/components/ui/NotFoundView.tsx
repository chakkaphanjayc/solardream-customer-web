"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "@/components/ui/icons";
import { SoliaGuide } from "@/components/brand/solia-scenes";
import { SolarRouteShell } from "@/components/ui/solar-route-shell";

type NotFoundViewProps = {
  homeUrl?: string;
  autoRedirectSeconds?: number;
  as?: "div" | "main";
};

export default function NotFoundView({
  homeUrl = "/",
  autoRedirectSeconds = 5,
  as = "div",
}: NotFoundViewProps) {
  const pathname = usePathname();
  const isEnglish = pathname.startsWith("/en");
  const [seconds, setSeconds] = useState(autoRedirectSeconds);
  const resolvedHomeUrl = homeUrl === "/" ? `/${isEnglish ? "en" : "th"}` : homeUrl;

  useEffect(() => {
    const countdownInterval = setInterval(() => {
      setSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    const redirectTimer = setTimeout(() => {
      window.location.href = resolvedHomeUrl;
    }, autoRedirectSeconds * 1000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(redirectTimer);
    };
  }, [autoRedirectSeconds, resolvedHomeUrl]);

  return (
    <SolarRouteShell
      as={as}
      className="solar-global-not-found min-h-dvh px-4 py-12 sm:px-6 sm:py-20"
    >
      <section
        aria-labelledby="not-found-title"
        className="solar-ui-panel mx-auto flex w-full max-w-2xl flex-col items-center rounded-[2rem] p-6 text-center sm:p-10"
      >
        <SoliaGuide
          alt={isEnglish ? "Solia helping you find your way back" : "โซเลียกำลังช่วยพาคุณกลับไปยังหน้าที่ถูกต้อง"}
          pose="miffed"
          className="h-52 w-44 sm:h-60 sm:w-52"
          imageSizes="240px"
          loading="eager"
          priority
        />

        <p className="mt-3 font-mono text-6xl font-black tracking-[-0.08em] text-[var(--sd-navy-900)] sm:text-8xl">
          404
        </p>
        <h1 id="not-found-title" className="mt-3 text-2xl font-black tracking-tight text-[var(--sd-ink)] sm:text-3xl">
          {isEnglish ? "This page is not in the map" : "ขออภัย ไม่พบหน้านี้"}
        </h1>
        <p className="mt-4 max-w-md text-sm font-medium leading-7 text-[var(--sd-text)] sm:text-base">
          {isEnglish
            ? "Solia is taking you back to the SolarDream home page in"
            : "เส้นทางนี้ไม่มีอยู่ในระบบ Solia จะพาคุณกลับหน้าหลักใน"}{" "}
          <span
            aria-live="polite"
            className="mx-1 inline-flex min-w-8 justify-center rounded-full bg-[var(--sd-soft-solar)] px-2 py-0.5 font-mono font-black text-[var(--sd-navy-900)]"
          >
            {seconds}
          </span>{" "}
          {isEnglish ? "seconds." : "วินาที"}
        </p>

        <a
          href={resolvedHomeUrl}
          className="solar-ui-primary group mt-8 inline-flex min-h-12 items-center gap-2 rounded-full px-6 py-3 text-sm font-bold active:scale-95"
        >
          <ArrowLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" aria-hidden="true" />
          <span>{isEnglish ? "Go to homepage" : "กลับสู่หน้าหลัก"}</span>
        </a>
      </section>
    </SolarRouteShell>
  );
}
