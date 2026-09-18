"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowRight } from "@/components/ui/icons";
import { gsap } from "gsap";
import { useLocale, useTranslations } from "next-intl";
import { SoliaGuide } from "@/components/brand/solia-scenes";

export const SOLIA_NEWS_TIPS_TH = [
  "หน้าข่าวสารกำลังเตรียมข้อมูลเด็ดๆ อยู่ค่ะ! รู้ไหมคะว่าแผงโซลาร์เซลล์ทำงานได้ดีที่สุดตอนอุณหภูมิประมาณ 25 องศา ไม่ใช่ตอนแดดร้อนจัดนะคะ ☀️",
  "ยังไม่มีบทความในส่วนนี้ แต่คุณสามารถลองไปใช้ระบบคำนวณอัจฉริยะที่หน้าแรกก่อนได้นะคะ!",
  "Solia กำลังจัดหมวดหมู่ความรู้เรื่องหลังคา แสงแดด และแบตเตอรี่ให้อ่านง่ายขึ้นค่ะ",
  "บทความใหม่กำลังอยู่ระหว่างเตรียมเผยแพร่ค่ะ ระหว่างนี้ลองเริ่มจากการประเมินขนาดระบบที่เหมาะกับบ้านของคุณได้เลย",
];

export const SOLIA_NEWS_TIPS_EN = [
  "I am preparing some great news and guides for you! Did you know solar panels actually perform best at around 25°C, not in scorching heat? ☀️",
  "No articles here yet, but you can try our smart sizing calculator on the homepage!",
  "I'm organizing the knowledge base on roofs, solar yield, and storage to make it easy to read.",
  "New articles are on the way. Meanwhile, try estimating the system size that fits your home.",
];

export default function NewsEmptyState() {
  const locale = useLocale();
  const t = useTranslations("NewsPage");
  const [messageIndex, setMessageIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const messageRef = useRef<HTMLParagraphElement | null>(null);
  const mascotRef = useRef<HTMLDivElement | null>(null);

  const tips = locale === "th" ? SOLIA_NEWS_TIPS_TH : SOLIA_NEWS_TIPS_EN;
  const message = tips[messageIndex % tips.length];

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setMessageIndex((current) => (current + 1) % tips.length);
    }, 4200);

    return () => window.clearInterval(intervalId);
  }, [tips.length]);

  useEffect(() => {
    const root = rootRef.current;
    const mascot = mascotRef.current;
    if (!root || !mascot) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const context = gsap.context(() => {
      gsap.fromTo(
        root,
        {
          autoAlpha: 0,
          y: prefersReducedMotion ? 0 : 12,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.12 : 0.28,
          ease: "power2.out",
        },
      );

      if (!prefersReducedMotion) {
        gsap.to(mascot, {
          y: -4,
          duration: 1.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, root);

    return () => context.revert();
  }, []);

  useEffect(() => {
    const messageElement = messageRef.current;
    if (!messageElement) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        messageElement,
        {
          autoAlpha: 0,
          y: prefersReducedMotion ? 0 : 8,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : 0.24,
          ease: "power2.out",
        },
      );
    }, messageElement);

    return () => context.revert();
  }, [message]);

  return (
    <div
      ref={rootRef}
      className="col-span-full flex min-h-[360px] flex-col items-center justify-center rounded-2xl border border-neutral-100 bg-white px-6 py-12 text-center shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
    >
      <div className="relative flex flex-col items-center">
        <div className="relative max-w-xl rounded-2xl rounded-br-sm border border-[#B7D1EA]/50 bg-white p-5 text-sm font-bold leading-7 text-[#0369a1] shadow-sm">
          <span
            aria-hidden="true"
            className="absolute -bottom-1 right-12 h-4 w-4 rotate-45 border-b border-r border-[#B7D1EA]/50 bg-white"
          />
          <p ref={messageRef} key={message}>
            {message}
          </p>
        </div>

        <div
          ref={mascotRef}
          className="pointer-events-none relative mt-5 h-[150px] w-[150px] md:h-[190px] md:w-[190px]"
        >
          <SoliaGuide
            pose="greeting"
            alt={locale === "th" ? "โซเลียกำลังช่วยเตรียมข่าวสารความรู้" : "Solia preparing the next SolarDream guide"}
            className="h-full w-full"
            imageClassName="drop-shadow-[0_16px_22px_rgba(15,23,42,0.14)]"
            imageSizes="(max-width: 768px) 150px, 190px"
            loading="eager"
            priority
          />
        </div>
      </div>

      <Link
        href={`/${locale}/wizard`}
        className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#0369a1] px-5 py-3 text-sm font-black text-white transition hover:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-[#B7D1EA] focus:ring-offset-2"
      >
        {t("emptyState.cta")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
