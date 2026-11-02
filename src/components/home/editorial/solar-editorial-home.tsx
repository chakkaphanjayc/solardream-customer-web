import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  FiArrowRight,
  FiArrowUpRight,
  FiAward,
  FiCheck,
  FiMessageCircle,
  FiShield,
  FiSun,
} from "react-icons/fi";

import type { PortfolioProjectListItem } from "@/types/portfolio";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import KlarnaProjectGrid from "../klarna/KlarnaProjectGrid";
import BiophilicCarbonCalculator from "./BiophilicCarbonCalculator";
import BiophilicEngineeringPillars from "./BiophilicEngineeringPillars";
import type { SolarEditorialHomeProps } from "./editorial-home.types";
import styles from "../klarna/klarna-home.module.css";

function isCredibleProject(project: PortfolioProjectListItem) {
  const source = project.heroImage.trim().toLowerCase();
  return Boolean(source) && !source.includes("unsplash.com") && !source.includes("images.unsplash");
}

function LeafSvg({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
      <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
    </svg>
  );
}

export default async function SolarEditorialHome({
  locale,
  websiteSettings,
  initialShowcaseProjects,
}: SolarEditorialHomeProps) {
  const t = await getTranslations({ locale, namespace: "HomeEditorial" });
  const isTh = locale === "th";
  const wizardHref = `/${locale}/wizard`;
  const buildHref = `/${locale}/build`;

  // Verified authentic projects for the showcase grid
  const projects = initialShowcaseProjects.filter(isCredibleProject).slice(0, 4);

  // LINE Official Account fallback
  const lineUrl =
    websiteSettings?.socialLinks?.find((s) => s.platform.toLowerCase().includes("line"))?.url ||
    "https://line.me/R/ti/p/@solardream";

  const faqs = isTh
    ? [
        {
          q: "ติดตั้งโซลาร์เซลล์แล้ว หลังคาจะรั่วซึมหรือไม่?",
          a: "วิธีติดตั้งที่เหมาะสมขึ้นอยู่กับวัสดุ สภาพ และโครงสร้างของหลังคา ทีมงานจะทบทวนรายละเอียดหน้างานและระบุวิธีติดตั้งกับเงื่อนไขการรับประกันไว้ในใบเสนอราคาก่อนเริ่มงาน",
        },
        {
          q: "ในหน้าฝนหรือช่วงที่ฟ้าครึ้ม แผงโซลาร์ยังผลิตไฟฟ้าได้ไหม?",
          a: "แผงยังผลิตไฟได้เมื่อมีแสง แต่ปริมาณจะแปรตามสภาพอากาศ เงาบัง ตำแหน่งติดตั้ง และอุปกรณ์ที่เลือกใช้ การประเมินหน้างานช่วยให้เห็นช่วงการผลิตที่เป็นไปได้มากขึ้น",
        },
        {
          q: "ระยะเวลาคืนทุนเฉลี่ยกี่ปี และคุ้มค่าจริงไหม?",
          a: "ระยะคืนทุนขึ้นอยู่กับราคาเสนอขาย ปริมาณไฟที่ใช้ในช่วงกลางวัน ขนาดระบบ อัตราค่าไฟ และสภาพหลังคา เครื่องคำนวณนี้เป็นเพียงตัวอย่างเบื้องต้น ส่วนตัวเลขจริงจะระบุพร้อมสมมติฐานในใบเสนอราคา",
        },
        {
          q: "ขั้นตอนการขออนุญาตขนานไฟกับการไฟฟ้า (PEA / MEA) ยุ่งยากไหม?",
          a: "ข้อกำหนดขึ้นอยู่กับประเภทระบบและพื้นที่ให้บริการ เราจะระบุขั้นตอนที่เกี่ยวข้องและขอบเขตการประสานงานไว้ในใบเสนอราคาของคุณ",
        },
        {
          q: "หากต้องการเพิ่มระบบแบตเตอรี่ (Energy Storage) ในอนาคต ทำได้หรือไม่?",
          a: "การเพิ่มแบตเตอรี่ขึ้นอยู่กับรุ่นอินเวอร์เตอร์ การออกแบบระบบ และข้อกำหนดของอุปกรณ์ ใบเสนอราคาจะระบุความเข้ากันได้และตัวเลือกที่ใช้ได้กับระบบของคุณ",
        },
      ]
    : [
        {
          q: "Will the solar installation cause roof leaks?",
          a: "The right mounting method depends on your roof material, condition, and structure. We review the site details and include the proposed installation method and warranty terms in your quotation before work begins.",
        },
        {
          q: "Does the system generate electricity during rainy or overcast days?",
          a: "Panels can generate power when light is available, but output changes with weather, shade, orientation, and the selected equipment. A site assessment gives a more useful production range.",
        },
        {
          q: "What is the typical payback period and financial return?",
          a: "Payback depends on the quoted price, daytime usage, system size, electricity tariff, and roof conditions. The calculator is an early illustration; your quotation will show the assumptions behind any estimate.",
        },
        {
          q: "Who handles the grid interconnection permits with PEA and MEA?",
          a: "Requirements vary by system type and service area. Your quotation will list the applicable steps and the coordination included in your project scope.",
        },
        {
          q: "Can I add battery energy storage later?",
          a: "Battery compatibility depends on the inverter model, system design, and equipment requirements. Your quotation will identify compatible options for the proposed system.",
        },
      ];

  const journeySteps = isTh
    ? [
        {
          step: "01",
          title: "สำรวจหลังคาและเงาบัง",
          sub: "Roof, Shade & Site Review",
          desc: "ทบทวนวัสดุหลังคา ทิศทาง พื้นที่ติดตั้ง และข้อจำกัดของหน้างานก่อนจัดทำข้อเสนอ",
        },
        {
          step: "02",
          title: "ออกแบบตามการใช้ไฟ",
          sub: "Energy Use & System Sizing",
          desc: "เปรียบเทียบการใช้ไฟ ค่าไฟ และพื้นที่หลังคา เพื่อกำหนดระบบที่เหมาะกับความต้องการของบ้าน",
        },
        {
          step: "03",
          title: "ทบทวนขอบเขตงานก่อนติดตั้ง",
          sub: "Written Scope & Utility Steps",
          desc: "ใบเสนอราคาระบุอุปกรณ์ งานติดตั้ง เงื่อนไขรับประกัน และขั้นตอนประสานงานที่เกี่ยวข้อง",
        },
        {
          step: "04",
          title: "ติดตามเอกสารและความคืบหน้า",
          sub: "Project Information & Support",
          desc: "ใช้โปรไฟล์ลูกค้าเพื่อตรวจดูใบเสนอราคา เอกสารโครงการ และข้อมูลความคืบหน้าที่มีให้กับระบบของคุณ",
        },
      ]
    : [
        {
          step: "01",
          title: "Review the roof and site",
          sub: "Roof, Shade & Site Review",
          desc: "We review roof material, orientation, available space, and site constraints before preparing a proposal.",
        },
        {
          step: "02",
          title: "Size around energy use",
          sub: "Energy Use & System Sizing",
          desc: "Compare electricity use, bills, and available roof space to plan a system around your household needs.",
        },
        {
          step: "03",
          title: "Review the written scope",
          sub: "Written Scope & Utility Steps",
          desc: "Your quotation lists selected equipment, installation work, warranty terms, and applicable utility steps.",
        },
        {
          step: "04",
          title: "Keep project information together",
          sub: "Project Information & Support",
          desc: "Use your customer profile to review the quotation, project documents, and progress information available for your system.",
        },
      ];

  return (
    <div className={styles.page} data-solar-surface="sales-journey">
      {/* ══════════════════════════════════════════════════════════════════
          1. BIOPHILIC HERO SECTION
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="hero"
        className="relative overflow-hidden bg-[var(--background)] px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-24 lg:px-8"
        aria-labelledby="biophilic-hero-title"
      >
        {/* Subtle organic light wash */}
        <div
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[38rem] w-full max-w-7xl -translate-x-1/2 rounded-[50%] bg-gradient-to-b from-[#B7D1EA]/40 via-[#E6DCCD]/30 to-transparent blur-3xl"
          aria-hidden="true"
        />

        <div className="mx-auto max-w-7xl">
          {/* Top Diurnal Irradiance & Clean Grid Pill */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
              <LeafSvg className="h-3.5 w-3.5 text-emerald-600" />
              <span>{isTh ? "พลังงานสะอาดเพื่อสิ่งแวดล้อมและความยั่งยืน" : "Clean Energy in Harmony with Nature"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-8">
            {/* Left Hero Copy */}
            <div className="lg:col-span-6">
              <h1
                id="biophilic-hero-title"
                className="text-3xl font-black tracking-tight text-[var(--sd-ink)] sm:text-5xl lg:text-[3.5rem] lg:leading-[1.12]"
              >
                {isTh ? "วางแผนโซลาร์ให้เหมาะกับบ้านของคุณ" : "Solar energy, planned for your home"}
              </h1>

              <p className="mt-6 text-base leading-relaxed text-[var(--sd-text-secondary)] sm:text-lg">
                {isTh
                  ? "เราใช้ข้อมูลการใช้ไฟ ค่าไฟ และหลังคาเป็นจุดเริ่มต้น จากนั้นยืนยันรายละเอียดหน้างานและการติดตั้งก่อนออกใบเสนอราคา"
                  : "We use your electricity needs, bill, and roof as a starting point, then confirm site and installation details before preparing a quote."}
              </p>

              {/* Action Buttons adhering strictly to Primary Pill Rule (text-[#0B051D] on bg-[#B7D1EA]) */}
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link
                  href={wizardHref}
                  className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#B7D1EA] px-8 py-3.5 text-base font-bold text-[#0B051D] shadow-sm transition-all duration-200 hover:bg-[#a2c3e2] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]"
                >
                  <span>{isTh ? "ประเมินระบบของฉัน" : "Assess My System"}</span>
                  <FiArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>

              </div>

              {/* Reassurance Microcopy */}
              <div className="mt-6 flex items-center gap-2.5 text-xs sm:text-sm font-medium text-[var(--sd-text-secondary)]">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                  <FiCheck className="h-3 w-3 stroke-[3]" />
                </span>
                <span>
                  {isTh
                    ? "เริ่มประเมินได้ฟรี • รายละเอียดหน้างานและขอบเขตงานยืนยันในใบเสนอราคา"
                    : "Start with a free estimate • Site details and project scope are confirmed in your quotation"}
                </span>
              </div>
            </div>

            {/* Right Hero Visual: Rooftop Photo + Solia Mascot + Biophilic Badges */}
            <div className="relative lg:col-span-6">
              <div className="relative overflow-hidden rounded-2xl border border-[rgba(60,86,122,0.16)] bg-white p-3 shadow-2xl">
                <div className="relative aspect-[16/11] w-full overflow-hidden rounded-xl">
                  <Image
                    src="/asset/home-editorial/hero-rooftop.webp"
                    alt={isTh ? "บ้านพักอาศัยติดตั้งแผงโซลาร์เซลล์กลมกลืนกับธรรมชาติ" : "Modern residential rooftop solar system in harmony with nature"}
                    fill
                    priority
                    sizes="(max-width: 900px) 100vw, 48vw"
                    className="object-cover"
                  />
                  {/* Subtle overlay gradient */}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                  {/* Overlaid planning note */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-2xl bg-white/95 p-3.5 backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6 sm:p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800">
                        <LeafSvg className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                          {isTh ? "ตัวอย่างสำหรับวางแผน" : "Planning Estimate"}
                        </div>
                        <div className="text-xs font-semibold text-[var(--sd-ink)] sm:text-sm">
                          {isTh ? "ผลจริงแปรตามหลังคาและการใช้ไฟ" : "Actual results vary by roof and energy use"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Solia Mascot Floating Greeting */}
              <div className="pointer-events-none absolute -bottom-6 -right-6 hidden w-44 sm:block md:w-52 lg:-bottom-8 lg:-right-8 lg:w-56">
                <Image
                  src="/asset/solia-pointing.webp"
                  alt={isTh ? "โซเลีย ผู้ช่วยวางแผนโซลาร์เซลล์" : "Solia, your clean solar advisor"}
                  width={320}
                  height={430}
                  priority
                  className="drop-shadow-2xl"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          2. ECOLOGICAL TRUST & AUTHORITY STANDARDS BAND
      ══════════════════════════════════════════════════════════════════ */}
      <section
        className="border-y border-[rgba(60,86,122,0.12)] bg-white py-6"
        aria-label={isTh ? "รายละเอียดสำหรับวางแผนระบบ" : "Solar system planning details"}
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted-foreground)]">
              {isTh ? "ข้อมูลที่ใช้พิจารณาในข้อเสนอ" : "Details Considered in Your Proposal"}
            </span>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sd-ink)]">
                <FiShield className="h-4 w-4 text-[#5089bf]" aria-hidden="true" />
                {t("authorityPea")}
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sd-ink)]">
                <FiCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                {t("authorityMea")}
              </span>
              <span className="inline-flex items-center gap-2 text-xs font-bold text-[var(--sd-ink)]">
                <FiAward className="h-4 w-4 text-amber-500" aria-hidden="true" />
                {t("authorityTier1")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          3. INTERACTIVE CARBON FOOTPRINT & BILL CALCULATOR ISLAND
      ══════════════════════════════════════════════════════════════════ */}
      <section id="calculator" className="bg-[var(--background)] py-16 sm:py-24" aria-labelledby="calculator-heading">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <BiophilicCarbonCalculator locale={locale} />
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          4. FOUR HOME-SOLAR PLANNING PRINCIPLES
      ══════════════════════════════════════════════════════════════════ */}
      <BiophilicEngineeringPillars locale={locale} />

      {/* ══════════════════════════════════════════════════════════════════
          6. SHOWCASE OF REAL ROOFTOP INSTALLATIONS
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="showcase"
        className="relative bg-[var(--background)] py-16 sm:py-24"
        aria-labelledby="showcase-heading"
      >
        <span id="proof" className="sr-only" aria-hidden="true" />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Showcase Section Heading */}
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-sky-600/20 bg-sky-50 px-3.5 py-1 text-xs font-bold text-sky-800">
                <FiSun className="h-3.5 w-3.5 text-amber-500" />
                <span>{isTh ? "05 / ผลงานติดตั้งที่เผยแพร่" : "05 / Published Project Showcase"}</span>
              </div>
              <h2 id="showcase-heading" className="mt-4 text-3xl font-black tracking-tight text-[var(--sd-ink)] sm:text-4xl lg:text-5xl">
                {isTh ? "ดูผลงานโซลาร์ที่ SolarDream เผยแพร่" : "Solar projects published by SolarDream"}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--sd-text-secondary)]">
                {isTh
                  ? "ดูภาพ รายละเอียดขนาดระบบ และข้อมูลค่าไฟหรือระบบติดตามที่เผยแพร่ไว้สำหรับแต่ละโครงการ"
                  : "Browse project photos, system capacity, and any savings or monitoring details published for each installation."}
              </p>
            </div>

            <Link
              href={`/${locale}/projects`}
              className="min-h-11 inline-flex items-center gap-2 rounded-full border border-[rgba(60,86,122,0.22)] bg-white px-6 py-2.5 text-sm font-bold text-[var(--sd-ink)] shadow-sm transition-all hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]"
            >
              <span>{t("projects.viewAll")}</span>
              <FiArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>

          {/* Render KlarnaProjectGrid with verified projects */}
          <div className="mt-12">
            {projects.length > 0 ? (
              <KlarnaProjectGrid
                locale={locale}
                projects={projects}
                viewAllLabel={t("projects.viewAll")}
                viewProjectLabel={t("projects.viewProject")}
                imageAltTemplate={t("projects.imageAlt", { title: "{title}" })}
                systemSizeLabel={t("projects.systemSize")}
                locationLabel={t("projects.location")}
                completedLabel={t("projects.completed")}
                telemetryLabel={t("projects.telemetry")}
                telemetryReadyLabel={t("projects.telemetryReady")}
                monthlySavingsLabel={t("projects.monthlySavings")}
                errorLabel={t("projects.dialog.error")}
              />
            ) : (
              <div className="rounded-2xl border border-[var(--border)] bg-white p-12 text-center">
                <p className="text-base text-[var(--sd-text-secondary)]">{t("projects.empty")}</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          7. 4-STEP SUSTAINABLE TRANSITION JOURNEY
      ══════════════════════════════════════════════════════════════════ */}
      <section
        id="journey"
        className="bg-[#0B051D] py-16 text-white sm:py-24"
        aria-labelledby="journey-heading"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-[#B7D1EA]">
              <LeafSvg className="h-3.5 w-3.5 text-[#B7D1EA]" />
              <span>{isTh ? "06 / ขั้นตอนการเปลี่ยนผ่านสู่พลังงานสะอาด" : "06 / 4-Step Transition Journey"}</span>
            </div>
            <h2 id="journey-heading" className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl">
              {isTh ? "จากบิลค่าไฟ สู่ระบบผลิตพลังงานสะอาดที่ยั่งยืน" : "From Electric Bill to Clean Energy Living"}
            </h2>
            <p className="mt-3 text-base leading-relaxed text-gray-300">
              {isTh
                ? "เราออกแบบทุกขั้นตอนให้ชัดเจน ตรวจสอบได้ และมีวิศวกรดูแลความปลอดภัยตลอดเส้นทาง"
                : "Every milestone is inspectable and coordinated by licensed engineers, ensuring complete peace of mind."}
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {journeySteps.map((step, idx) => (
              <div
                key={step.step}
                className="relative flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-7 backdrop-blur-sm transition-all hover:border-[#B7D1EA]/40 hover:bg-white/10"
              >
                <div>
                  <div className="flex items-center justify-between text-[#B7D1EA]">
                    <span className="font-mono text-xl font-black">{step.step}</span>
                    {idx < journeySteps.length - 1 ? (
                      <FiArrowRight className="hidden h-5 w-5 text-gray-500 lg:block" aria-hidden="true" />
                    ) : null}
                  </div>
                  <h3 className="mt-6 text-xl font-bold text-white">{step.title}</h3>
                  <p className="mt-1 text-xs font-medium text-[#B7D1EA]">{step.sub}</p>
                  <p className="mt-3 text-xs leading-relaxed text-gray-300 sm:text-sm">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Helpful customer pathways */}
          <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
              {isTh ? "เข้าถึงข้อมูลโครงการของคุณได้ทุกเวลา" : "Customer Portal Direct Access"}
            </span>
            <div className="flex flex-wrap items-center gap-6">
              <Link
                href={`/${locale}/proposals`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7D1EA] hover:underline"
              >
                <span>{isTh ? "ดูข้อเสนอ (Proposals)" : "Proposals"}</span>
                <FiArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/${locale}/track`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7D1EA] hover:underline"
              >
                <span>{isTh ? "ติดตามสถานะคำขอ (Track Request)" : "Track Request"}</span>
                <FiArrowUpRight className="h-3.5 w-3.5" />
              </Link>
              <Link
                href={`/${locale}/profile`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-[#B7D1EA] hover:underline"
              >
                <span>{isTh ? "โปรไฟล์ระบบ (System Profile)" : "System Profile"}</span>
                <FiArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          8. ECOLOGICAL FAQ ACCORDION
      ══════════════════════════════════════════════════════════════════ */}
      <section id="faq" className="bg-[var(--background)] py-16 sm:py-24" aria-labelledby="faq-heading">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-white px-3.5 py-1 text-xs font-bold text-[var(--accent-foreground)]">
              <span>{isTh ? "คำถามที่พบบ่อย (FAQs)" : "Frequently Asked Questions"}</span>
            </div>
            <h2 id="faq-heading" className="mt-4 text-3xl font-black tracking-tight text-[var(--sd-ink)] sm:text-4xl">
              {isTh ? "ข้อสงสัยก่อนตัดสินใจติดตั้งระบบโซลาร์เซลล์" : "Everything You Need to Know Before Installing Solar"}
            </h2>
            <p className="mt-3 text-sm sm:text-base text-[var(--sd-text-secondary)]">
              {isTh
                ? "เราสรุปประเด็นสำคัญเรื่องความปลอดภัย การป้องกันหลังคารั่ว และความคุ้มค่าไว้ให้คุณแล้ว"
                : "Key facts on roofing safety, tropical weather durability, and financial returns."}
            </p>
          </div>

          <div className="mt-12">
            <Accordion type="single" collapsible className="w-full">
              {faqs.map((faq, index) => (
                <AccordionItem value={`faq-${index}`} key={faq.q}>
                  <AccordionTrigger>{faq.q}</AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm sm:text-base leading-relaxed text-[var(--sd-text-secondary)]">{faq.a}</p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          9. BIOPHILIC CLOSING CTA ISLAND WITH SOLIA & LINE OA
      ══════════════════════════════════════════════════════════════════ */}
      <section className="bg-[var(--background)] pb-20 sm:pb-28" aria-labelledby="closing-title">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border border-[rgba(60,86,122,0.18)] bg-gradient-to-br from-white via-[#F0EEE9] to-[#E6DCCD] p-8 shadow-xl sm:p-14 lg:p-16">
            <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-600/20 bg-emerald-50 px-3.5 py-1 text-xs font-bold text-emerald-800">
                  <LeafSvg className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{isTh ? "เริ่มต้นก้าวแรกสู่พลังงานสะอาด" : "Begin Your Clean Energy Journey"}</span>
                </div>

                <h2 id="closing-title" className="mt-4 text-3xl font-black tracking-tight text-[var(--sd-ink)] sm:text-4xl lg:text-5xl">
                  {isTh ? "พร้อมเปลี่ยนหลังคาบ้านเป็นแหล่งพลังงานสะอาดแล้วหรือยัง?" : "Ready to Power Your Home with Pure Sunshine?"}
                </h2>

                <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--sd-text-secondary)] sm:text-lg">
                  {isTh
                    ? "ใช้เวลาเพียง 2 นาทีเพื่อจำลองระบบที่เหมาะสมกับบ้านและค่าไฟของคุณ หรือแชทปรึกษาวิศวกร SolarDream ทาง LINE ได้ทันที ไม่มีค่าใช้จ่าย"
                    : "Spend 2 minutes to generate a personalized solar & carbon reduction plan, or chat directly with our engineering team on LINE today."}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-4">
                  {/* Primary CTA (Primary Pill Rule: text-[#0B051D] on bg-[#B7D1EA]) */}
                  <Link
                    href={wizardHref}
                    className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#B7D1EA] px-8 py-3.5 text-base font-bold text-[#0B051D] shadow-sm transition-all duration-200 hover:bg-[#a2c3e2] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]"
                  >
                    <span>{isTh ? "ประเมินระบบฟรี (Start Free Assessment)" : "Start Free Assessment"}</span>
                    <FiArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>

                  {/* LINE Official Account CTA */}
                  <a
                    href={lineUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full bg-[#06C755] px-7 py-3.5 text-base font-bold text-[#111827] shadow-sm transition-all duration-200 hover:bg-[#05b34c] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755]"
                  >
                    <FiMessageCircle className="h-4 w-4" aria-hidden="true" />
                    <span>{isTh ? "ปรึกษาวิศวกรทาง LINE" : "Chat on LINE Official"}</span>
                  </a>

                  {/* Custom Spec Builder */}
                  <Link
                    href={buildHref}
                    className="min-h-12 inline-flex items-center justify-center gap-2 rounded-full border border-[rgba(60,86,122,0.22)] bg-white px-6 py-3.5 text-base font-semibold text-[var(--sd-ink)] shadow-sm transition-all duration-200 hover:bg-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5089bf]"
                  >
                    <span>{isTh ? "เลือกสเปกเอง (Custom Spec)" : "Custom Spec"}</span>
                  </Link>
                </div>
              </div>

              {/* Solia Mascot Visual */}
              <div className="flex justify-center lg:col-span-4 lg:justify-end">
                <div className="relative w-48 sm:w-56 md:w-64">
                  <Image
                    src="/asset/solia-greeting.webp"
                    alt={isTh ? "โซเลีย ผู้ช่วยวางแผนโซลาร์เซลล์ SolarDream" : "Solia SolarDream clean energy mascot"}
                    width={380}
                    height={500}
                    className="drop-shadow-xl"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
