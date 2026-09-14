"use client";

import React, { useEffect, useState, useMemo, useRef, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  ChevronLeft,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Cpu,
  PackageOpen,
} from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import ProductCTA, { type ProductCtaType } from "../ProductCTA";
import AskInChatButton from "@/components/chat/AskInChatButton";
import { generatePublicProductName } from "@/lib/productUtils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LayerPortal } from "@/components/ui/layer-portal";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

type Category = {
  id: string;
  name: string;
  description: string | null;
  slug: string;
  displayOrder: number;
  isRequired: boolean;
  allowMultiple: boolean;
  dependsOnCategoryId: string | null;
  dependsOnProductId: string | null;
  blueprintId: string | null;
  parentId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProductDetail = {
  id: string;
  erpnextItemCode: string;
  brand: string;
  model: string;
  price: number;
  imageUrl: string;
  description: string | null;
  stock: number;
  stockStatus: string;
  ctaType: ProductCtaType;
  isAvailable: boolean;
  isActive: boolean;
  categoryId: string;
  metadata: unknown;
  createdAt: Date;
  updatedAt: Date;
  seoTitle: string | null;
  seoDescription: string | null;
  seoKeywords: string | null;
  seoImage: string | null;
  physicalWidth: number | null;
  physicalLength: number | null;
  wattageCapacity: number | null;
  useInRecommendation: boolean;
  recommendTier: string | null;
  recommendPriority: number;
  category: Category;
};

interface ProductDetailClientProps {
  product: ProductDetail;
  specs: Record<string, unknown>;
}

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0,
    );
  }
  if (typeof value === "string" && value.trim()) {
    return [value];
  }
  return [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value) return {};
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function buildFeatureBullets(product: ProductDetail, fallback: string[]) {
  const meta = asRecord(product.metadata);
  const bulletSources = [
    ...toStringArray(meta.features),
    ...toStringArray(meta.highlights),
    ...toStringArray(meta.bullets),
    ...toStringArray(meta.bulletPoints),
  ];

  return uniqueStrings([...bulletSources, ...fallback]).slice(0, 4);
}

function AccordionItem({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="mb-3 rounded-[20px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-4 transition-colors hover:bg-[#DCE8F5]/20">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between text-left text-sm font-bold text-[#1C1C1A] focus:outline-none"
      >
        <span>{title}</span>
        <span
          className={`font-mono text-xs text-[#4F7FA8] transition-transform duration-200 ease-out ${
            isOpen ? "rotate-180" : ""
          }`}
        >
          {isOpen ? "▲" : "▼"}
        </span>
      </button>

      {isOpen && (
        <GsapCollapse className="overflow-hidden">
          <div className="whitespace-pre-line pt-3 text-xs leading-relaxed text-[#4E4B44] md:text-sm">
            {children}
          </div>
        </GsapCollapse>
      )}
    </div>
  );
}

function GsapCollapse({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const collapseRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = collapseRef.current;
    if (!element) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, height: prefersReducedMotion ? "auto" : 0 },
        {
          autoAlpha: 1,
          height: "auto",
          duration: prefersReducedMotion ? 0.08 : 0.24,
          ease: "power2.out",
        },
      );
    }, element);

    return () => context.revert();
  }, []);

  return (
    <div ref={collapseRef} className={className}>
      {children}
    </div>
  );
}

function GsapRevealSection({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        section,
        {
          autoAlpha: prefersReducedMotion ? 1 : 0.3,
          y: prefersReducedMotion ? 0 : 20,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            end: "bottom 20%",
            toggleActions: "play none none reverse",
          },
        },
      );
    }, section);

    return () => context.revert();
  }, []);

  return (
    <section ref={sectionRef} className={className}>
      {children}
    </section>
  );
}

function GsapFloatingBar({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const barRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        bar,
        {
          autoAlpha: 0,
          y: prefersReducedMotion ? 0 : 40,
        },
        {
          autoAlpha: 1,
          y: 0,
          duration: prefersReducedMotion ? 0.08 : 0.4,
          ease: "power3.out",
        },
      );
    }, bar);

    return () => context.revert();
  }, []);

  return (
    <div ref={barRef} className={className}>
      {children}
    </div>
  );
}

export default function ProductDetailClient({
  product,
  specs,
}: ProductDetailClientProps) {
  const t = useTranslations("ProductDetailPage");
  const locale = useLocale();

  const [imageBroken, setImageBroken] = useState(false);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  const heroRef = useRef<HTMLDivElement | null>(null);
  const heroContentRef = useRef<HTMLDivElement | null>(null);

  const fallbackFeatures = [
    t("features.highEfficiency"),
    t("features.durable"),
    t("features.certified"),
    t("features.tier1"),
  ];

  const features = useMemo(
    () => buildFeatureBullets(product, fallbackFeatures),
    [product, fallbackFeatures],
  );

  useEffect(() => {
    const hero = heroRef.current;
    const content = heroContentRef.current;
    if (!hero || !content) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const context = gsap.context(() => {
      if (!prefersReducedMotion) {
        gsap.to(content, {
          yPercent: -20,
          opacity: 0.2,
          ease: "none",
          scrollTrigger: {
            trigger: hero,
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        });
      }

      ScrollTrigger.create({
        trigger: hero,
        start: "bottom top+=8%",
        end: "bottom top",
        onEnter: () => setShowFloatingBar(true),
        onLeaveBack: () => setShowFloatingBar(false),
      });
    }, hero);

    return () => context.revert();
  }, []);

  // Extract specification summaries
  const maxPower = useMemo(() => {
    return product.wattageCapacity
      ? `${product.wattageCapacity} W`
      : specs.maximum_power ||
          specs.wattage ||
          specs.power ||
          specs.capacity ||
          "450 W";
  }, [product.wattageCapacity, specs]);

  const efficiency = useMemo(() => {
    return (
      specs.efficiency ||
      specs.panel_efficiency ||
      specs.module_efficiency ||
      specs.conversion_efficiency ||
      "21.8%"
    );
  }, [specs]);

  const warranty = useMemo(() => {
    return (
      specs.warranty ||
      specs.product_warranty ||
      specs.warranty_years ||
      specs.warranty_period ||
      "15 Years"
    );
  }, [specs]);

  return (
    <div
      data-bagui="product-detail"
      className="relative min-h-dvh bg-[#F0EEE9] px-4 pb-20 pt-10 text-[#1C1C1A] sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Back Link Breadcrumb */}
        <Link
          href={`/${locale}/catalog`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium text-[#4E4B44] transition-colors hover:bg-[#A5C2DE]/10 hover:text-[#3E6685]"
        >
          <ChevronLeft className="h-4 w-4" /> {t("backToCatalog")}
        </Link>

        {/* Cinematic Hero Section */}
        <div
          ref={heroRef}
          className="relative mb-10 flex min-h-[58dvh] w-full flex-col items-center justify-center overflow-hidden rounded-[32px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:mb-12 sm:rounded-[48px] sm:p-10 lg:min-h-[75dvh]"
        >
          {/* Atmospheric ambient blur circles */}
          <div className="pointer-events-none absolute -left-16 -top-16 h-72 w-72 rounded-full bg-[#B7D1EA]/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-[#DCE8F5]/40 blur-3xl" />

          <div
            ref={heroContentRef}
            className="relative z-10 flex w-full max-w-4xl flex-col items-center justify-center gap-6 text-center"
          >
            <span className="rounded-full bg-[#DCE8F5] px-4 py-1 text-xs font-bold text-[#2E2C27] shadow-xs">
              {product.category.name}
            </span>
            <h1 className="max-w-3xl text-3xl font-bold tracking-tight text-[#1C1C1A] sm:text-5xl md:text-6xl">
              {generatePublicProductName(product)}
            </h1>

            <div className="relative mt-4 aspect-square w-full max-w-md">
              {product.imageUrl &&
              product.imageUrl.trim() !== "" &&
              !imageBroken ? (
                <Image
                  src={product.imageUrl}
                  alt={generatePublicProductName(product)}
                  className="max-h-full max-w-full object-contain"
                  fill
                  unoptimized
                  onError={() => setImageBroken(true)}
                  priority
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(103,80,164,0.15),transparent_55%)]">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#8E8B83]/20 bg-[#DCE8F5] text-[#4F7FA8]">
                      <PackageOpen className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-[#4E4B44]">
                      {t("previewUnavailable")}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Dynamic Split Screen View Layout */}
        <div className="relative grid grid-cols-1 items-start gap-10 rounded-[32px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm md:p-10 lg:grid-cols-2">
          {/* Left Column (Sticky Visuals) */}
          <div className="flex w-full flex-col justify-center gap-6 py-4 lg:sticky lg:top-24 lg:h-[75vh]">
            <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-[28px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-5 shadow-xs">
              {product.imageUrl &&
              product.imageUrl.trim() !== "" &&
              !imageBroken ? (
                <Image
                  src={product.imageUrl}
                  alt={generatePublicProductName(product)}
                  className="max-h-full max-w-full object-contain"
                  fill
                  unoptimized
                  onError={() => setImageBroken(true)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(103,80,164,0.12),transparent_55%)]">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#8E8B83]/20 bg-[#DCE8F5] text-[#4F7FA8]">
                      <PackageOpen className="h-6 w-6" />
                    </div>
                    <p className="text-xs font-medium text-[#4E4B44]">
                      {t("previewUnavailable")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Tech Compliance Box */}
            <div className="flex items-center gap-3.5 rounded-[24px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-4 shadow-xs">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#DCE8F5] text-[#4F7FA8]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#1C1C1A]">
                  {t("certifiedTitle")}
                </h4>
                <p className="mt-0.5 text-xs font-medium text-[#4E4B44]">
                  {t("certifiedDescription")}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column (Scrolling Storytelling Sections) */}
          <div className="w-full space-y-10">
            {/* Block 1: Overview */}
            <GsapRevealSection className="flex min-h-[50vh] flex-col justify-center border-b border-[#8E8B83]/15 pb-10">
              <div className="space-y-4">
                <span className="rounded-full bg-[#DCE8F5] px-3 py-1 text-xs font-bold text-[#2E2C27]">
                  {product.category.name}
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-[#1C1C1A] sm:text-3xl lg:text-4xl">
                  {generatePublicProductName(product)}
                </h1>
                <div className="font-mono text-xs text-[#4E4B44]">
                  {t("sku", { code: product.erpnextItemCode })}
                </div>

                <div className="flex items-center gap-4 pt-2">
                  <span className="font-mono text-3xl font-bold tracking-tight text-[#1C1C1A]">
                    {formatPrice(product.price)}
                  </span>

                  {/* Availability Flag */}
                  <div className="flex items-center gap-1.5">
                    {product.isAvailable && product.stock > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t("activeStock")}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                        <AlertTriangle className="h-3.5 w-3.5" /> {t("outOfStock")}
                      </span>
                    )}
                  </div>
                </div>

                {product.description && (
                  <p className="pt-3 text-sm leading-relaxed text-[#4E4B44] md:text-base">
                    {product.description}
                  </p>
                )}
              </div>
            </GsapRevealSection>

            {/* Block 2: Premium Features / Highlights */}
            <GsapRevealSection className="flex min-h-[45vh] flex-col justify-center border-b border-[#8E8B83]/15 pb-10">
              <div className="space-y-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F7FA8]">
                  {t("premiumIntegrity")}
                </h3>
                <div className="space-y-3">
                  {features.map((feature, idx) => (
                    <div
                      key={feature}
                      className="flex items-start gap-3.5 rounded-[20px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-4 shadow-xs"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE8F5] font-mono text-xs font-bold text-[#4F7FA8]">
                        0{idx + 1}
                      </div>
                      <p className="pt-1 text-sm font-medium leading-snug text-[#1C1C1A]">
                        {feature}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </GsapRevealSection>

            {/* Block 3: Technical Specifications & Accordions */}
            <GsapRevealSection className="flex min-h-[50vh] w-full flex-col justify-center border-b border-[#8E8B83]/15 pb-10">
              <div className="w-full space-y-6">
                <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#4F7FA8]">
                  <Cpu className="h-4 w-4" />
                  {t("technicalSpecifications")}
                </h3>

                {/* Bento Specs Grid */}
                <div className="grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex min-h-[120px] flex-col justify-between rounded-[24px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                      {t("maximumPower")}
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#1C1C1A]">
                      {String(maxPower)}
                    </span>
                  </div>
                  <div className="flex min-h-[120px] flex-col justify-between rounded-[24px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                      {t("moduleEfficiency")}
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#1C1C1A]">
                      {String(efficiency)}
                    </span>
                  </div>
                  <div className="flex min-h-[120px] flex-col justify-between rounded-[24px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-5 shadow-xs">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                      {t("warrantyPeriod")}
                    </span>
                    <span className="font-mono text-2xl font-bold text-[#1C1C1A]">
                      {String(warranty)}
                    </span>
                  </div>
                </div>

                {/* Additional Spec Table if dynamic specs are present */}
                {Object.keys(specs).length > 3 && (
                  <div className="mt-6 overflow-hidden rounded-[24px] border border-[#8E8B83]/15 bg-[#F0EEE9] shadow-xs">
                    <table className="w-full border-collapse text-left">
                      <tbody>
                        {Object.entries(specs)
                          .filter(
                            ([k]) =>
                              ![
                                "efficiency",
                                "panel_efficiency",
                                "module_efficiency",
                                "warranty",
                                "product_warranty",
                                "warranty_years",
                                "maximum_power",
                                "wattage",
                                "power",
                              ].includes(k.toLowerCase()),
                          )
                          .map(([key, val], idx) => (
                            <tr
                              key={key}
                              className={`border-b border-[#8E8B83]/10 text-xs ${
                                idx % 2 === 0
                                  ? "bg-[#E6E3DC]/40"
                                  : "bg-transparent"
                              }`}
                            >
                              <td className="w-1/3 px-4 py-3 font-bold uppercase tracking-wider text-[#4E4B44]">
                                {key.replace(/_/g, " ")}
                              </td>
                              <td className="break-all px-4 py-3 font-mono font-medium text-[#1C1C1A]">
                                {String(val)}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Accordions for Details */}
                <div className="mt-6 pt-2">
                  <AccordionItem title={t("installationGuide.title")}>
                    {t("installationGuide.content")}
                  </AccordionItem>

                  <AccordionItem title={t("certifications.title")}>
                    {t("certifications.content")}
                  </AccordionItem>

                  <AccordionItem title={t("environmentalImpact.title")}>
                    {t("environmentalImpact.content")}
                  </AccordionItem>
                </div>
              </div>
            </GsapRevealSection>

            {/* Block 4: Action Hub */}
            <GsapRevealSection className="flex min-h-[45vh] flex-col justify-center">
              <div className="space-y-6">
                <div className="space-y-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#4F7FA8]">
                    {t("configureDeploy")}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-[#4E4B44]">
                    {t("configureDescription")}
                  </p>
                </div>

                <div className="flex flex-col gap-4">
                  <ProductCTA
                    product={product}
                    context="product-detail"
                    className="w-full px-6 py-3.5 text-sm"
                  />
                  <AskInChatButton
                    reference={{
                      type: "PRODUCT",
                      id: product.id,
                      title: generatePublicProductName(product),
                      subtitle: formatPrice(product.price),
                    }}
                    tooltip={t("askAbout")}
                    label={t("askAbout")}
                    className="min-h-11 w-full rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9] px-6 py-3 text-xs font-medium text-[#1C1C1A] shadow-sm transition-all hover:bg-[#A5C2DE]/10 hover:text-[#3E6685] active:scale-95"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      asChild
                      className="min-h-11 w-full rounded-full bg-[#B7D1EA] px-4 py-2.5 text-xs font-medium text-white shadow-sm transition-all hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95"
                    >
                      <Link href={`/${locale}/build`}>
                        {t("useBuilder")}
                        <ArrowRight className="inline h-3.5 w-3.5" />
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      className="min-h-11 w-full rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9] px-4 py-2.5 text-xs font-medium text-[#1C1C1A] shadow-sm transition-all hover:bg-[#DCE8F5]/50 active:scale-95"
                    >
                      <Link href={`/${locale}/wizard`}>{t("estimator")}</Link>
                    </Button>
                  </div>
                </div>
              </div>
            </GsapRevealSection>
          </div>
        </div>
      </div>

      {/* Smart Floating CTA Bar */}
      {showFloatingBar ? (
        <LayerPortal>
          <GsapFloatingBar className="layer-floating fixed bottom-6 left-1/2 flex w-full max-w-[92vw] -translate-x-1/2 items-center justify-between gap-4 rounded-full border border-[#8E8B83]/20 bg-[#E6E3DC]/95 px-5 py-3 shadow-xl backdrop-blur-md md:max-w-2xl md:gap-6 md:px-7">
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-xs font-bold text-[#1C1C1A]">
                {generatePublicProductName(product)}
              </span>
              <span className="font-mono text-sm font-bold text-[#4F7FA8]">
                {formatPrice(product.price)}
              </span>
            </div>

            <ProductCTA
              product={product}
              context="floating-bar"
              className="w-auto shrink-0 px-5 py-2 text-xs"
            />
          </GsapFloatingBar>
        </LayerPortal>
      ) : null}
    </div>
  );
}
