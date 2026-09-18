"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import Link from "next/link";
import {
  Trash2,
  Plus,
  Minus,
  FileText,
  AlertTriangle,
  ShoppingBag,
  ShieldCheck,
  Zap,
} from "@/components/ui/icons";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import CartLeadCaptureModal from "@/components/CartLeadCaptureModal";
import SmartBackButton from "@/components/ui/SmartBackButton";
import ProgressiveImage from "@/components/ui/progressive-image";
import { toast } from "sonner";
import { trackProductEvent } from "@/lib/productAnalytics";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { PageShell } from "@/components/ui/page-shell";
import { GsapReveal } from "@/components/ui/GsapMotion";
import { SolarStatePanel } from "@/components/ui/solar-system";

export default function CartPage() {
  const t = useTranslations("CartDrawer");
  const locale = useLocale();

  const { items, updateQuantity, removeItem, getTotalPrice, hasHydrated } =
    useCartStore();
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [availabilityStatus, setAvailabilityStatus] = useState<
    Record<string, "ACTIVE" | "ARCHIVED">
  >({});
  const [missingIds, setMissingIds] = useState<string[]>([]);

  const cartIds = useMemo(() => items.map((item) => item.product.id), [items]);

  const staleIds = useMemo(() => {
    return items
      .filter(
        (item) =>
          missingIds.includes(item.product.id) ||
          availabilityStatus[item.product.id] === "ARCHIVED",
      )
      .map((item) => item.product.id);
  }, [availabilityStatus, items, missingIds]);

  const hasStaleItems = staleIds.length > 0;
  const total = getTotalPrice();

  // Rehydrate cart store on client mount
  useEffect(() => {
    if (!hasHydrated) {
      void useCartStore.persist.rehydrate();
    }
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    void trackProductEvent("cart_viewed", {
      item_count: items.length,
      quantity_total: items.reduce(
        (totalQuantity, item) => totalQuantity + item.quantity,
        0,
      ),
    });
  }, [hasHydrated, items]);

  // Check product availability
  useEffect(() => {
    if (cartIds.length === 0) {
      return;
    }

    const controller = new AbortController();

    const checkAvailability = async () => {
      try {
        const response = await fetch("/api/catalog/cart-availability", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids: cartIds }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Unable to verify cart items");
        }

        const data: {
          success: boolean;
          products?: Array<{ id: string; status: "ACTIVE" | "ARCHIVED" }>;
          missingIds?: string[];
        } = await response.json();

        if (!data.success) {
          throw new Error("Unable to verify cart items");
        }

        const nextStatus = Object.fromEntries(
          (data.products ?? []).map((product) => [product.id, product.status]),
        ) as Record<string, "ACTIVE" | "ARCHIVED">;

        setAvailabilityStatus(nextStatus);
        setMissingIds(data.missingIds ?? []);
      } catch (error) {
        if (controller.signal.aborted) return;
        console.error("Cart availability check failed:", error);
      }
    };

    void checkAvailability();

    return () => {
      controller.abort();
    };
  }, [cartIds]);

  const handleRemoveUnavailable = () => {
    staleIds.forEach((id) => removeItem(id));
    toast.success(t("unavailable.removedToast"));
  };

  const getLocalizedPath = (path: string) => {
    const trimmed = path.trim();
    if (trimmed.startsWith(`/${locale}/`) || trimmed === `/${locale}`) {
      return trimmed;
    }
    return `/${locale}/${trimmed.replace(/^\/+/, "")}`;
  };

  // Before hydration, render a premium loading container matching the layout
  if (!hasHydrated) {
    return (
      <PageShell className="flex min-h-[70dvh] w-full items-center justify-center bg-[#F0EEE9] px-4">
        <SolarStatePanel
          kind="loading"
          title={t("header.title")}
          description={t("empty.description")}
          soliaAlt={locale === "th" ? "Solia กำลังโหลดตะกร้าของคุณ" : "Solia loading your cart"}
        />
      </PageShell>
    );
  }

  return (
    <PageShell className="w-full bg-[#F0EEE9] px-4 py-8 text-[#1C1C1A] md:py-14">
      <div className="mx-auto max-w-7xl">
        {/* Header Breadcrumbs / Title */}
        <div className="mb-8 space-y-4">
          <SmartBackButton
            fallbackHref={getLocalizedPath("/catalog")}
            label={t("footer.backToCatalog")}
            className="rounded-full bg-[#DCE8F5] px-4 py-2 text-xs font-medium text-[#2E2C27] hover:bg-[#DCE8F5]"
          />

          <div className="flex flex-col justify-between gap-4 border-b border-[#8E8B83]/15 pb-6 md:flex-row md:items-end">
            <div>
              <span className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#315e82]">
                {t("header.title")}
              </span>
              <h1 className="text-3xl font-bold tracking-tight text-[#1C1C1A] md:text-5xl">
                {t("header.title")}
              </h1>
            </div>
            <Badge
              variant="neutral"
              className="rounded-full bg-[#DCE8F5] px-4 py-1 text-xs font-bold text-[#2E2C27] shadow-xs"
            >
              {t("header.selectedCount", { count: items.length })}
            </Badge>
          </div>
        </div>

        {/* Cart Contents */}
        {items.length === 0 ? (
          <GsapReveal className="mx-auto max-w-2xl">
            <SolarStatePanel
              kind="empty"
              title={t("empty.title")}
              description={t("empty.description")}
              soliaAlt={locale === "th" ? "Solia ชวนคุณเลือกอุปกรณ์พลังงานแสงอาทิตย์" : "Solia inviting you to explore solar equipment"}
              action={
                <Link
                  href={getLocalizedPath("/catalog")}
                  className="solar-ui-primary inline-flex"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{t("empty.browseCatalog")}</span>
                </Link>
              }
              className="px-6 py-12 sm:px-10 sm:py-16"
            />
          </GsapReveal>
        ) : (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12 lg:gap-10">
            {/* Left Column: Cart items list (span 8) */}
            <div className="space-y-5 lg:col-span-8">
              {/* Unavailable Items Warning */}
              {hasStaleItems && (
                <div className="space-y-3 rounded-[24px] border border-amber-300/60 bg-amber-50/80 p-5 shadow-xs">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-200 text-amber-900">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-amber-950">
                        {t("unavailable.title")}
                      </p>
                      <p className="mt-0.5 text-xs font-medium text-amber-900/80">
                        {t("unavailable.description")}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveUnavailable}
                    className="rounded-full border-amber-300 bg-[#F0EEE9] text-xs font-bold text-amber-900 hover:bg-amber-100/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("unavailable.deleteAction")}
                  </Button>
                </div>
              )}

              {/* Items List */}
              <div className="space-y-4">
                {items.map((item) => {
                  const productStatus = availabilityStatus[item.product.id];
                  const isMissing = missingIds.includes(item.product.id);
                  const isArchived = productStatus === "ARCHIVED";
                  const isUnavailable = isMissing || isArchived;

                  return (
                    <GsapReveal
                      key={item.product.id}
                      style={{ overflow: "hidden" }}
                      className="flex flex-col items-start gap-4 rounded-[28px] border border-[#8E8B83]/15 bg-[#E6E3DC] p-5 shadow-xs transition-all duration-300 hover:shadow-md md:flex-row md:items-center md:gap-6"
                    >
                      {/* Image component container */}
                      <div className="flex w-full shrink-0 justify-center md:w-auto">
                        <div className="relative h-24 w-24 overflow-hidden rounded-[20px] border border-[#8E8B83]/15 bg-[#F0EEE9] shadow-xs sm:h-28 sm:w-28">
                          {item.product.imageUrl &&
                          item.product.imageUrl.trim() !== "" ? (
                            <ProgressiveImage
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              fill
                              sizes="(max-width: 640px) 96px, 112px"
                              className="object-contain p-2"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-[#DCE8F5]/30 text-[10px] font-bold text-[#4E4B44]">
                              {t("item.noImage")}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title & SKU details */}
                      <div className="w-full min-w-0 flex-1 space-y-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-[#DCE8F5] px-3 py-0.5 text-[10px] font-bold text-[#2E2C27]">
                              {item.product.category?.name ||
                                t("item.defaultCategory")}
                            </span>
                            {isUnavailable && (
                              <span className="rounded-full bg-rose-100 px-3 py-0.5 text-[10px] font-bold text-rose-700">
                                {isArchived
                                  ? t("item.archived")
                                  : t("item.deleted")}
                              </span>
                            )}
                          </div>
                          <h3 className="line-clamp-2 text-base font-bold text-[#1C1C1A] sm:text-lg">
                            {item.product.name}
                          </h3>
                          {item.product.erpnextItemCode && (
                            <p className="font-mono text-xs text-[#4E4B44]">
                              SKU: {item.product.erpnextItemCode}
                            </p>
                          )}
                        </div>

                        {/* Bundle specs */}
                        {item.product.isBundle && item.product.bundleItems && (
                          <div className="max-w-md space-y-1.5 rounded-2xl border border-[#8E8B83]/10 bg-[#F0EEE9] p-3 text-xs text-[#4E4B44]">
                            <p className="border-b border-[#8E8B83]/10 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#4F7FA8]">
                              {t("item.setIncludes")}
                            </p>
                            {item.product.bundleItems.map((bi) => (
                              <div
                                key={bi.productId}
                                className="flex justify-between gap-4"
                              >
                                <span className="truncate text-[#1C1C1A]">
                                  {bi.name}
                                </span>
                                <span className="shrink-0 font-mono font-bold text-[#4F7FA8]">
                                  x{bi.quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Adjuster & Price Column */}
                      <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-[#8E8B83]/15 pt-4 md:flex md:w-auto md:justify-end md:gap-6 md:border-0 md:pt-0">
                        {/* Price Display */}
                        <div className="flex min-w-0 flex-col text-left md:min-w-[120px] md:text-right">
                          <span className="text-xs font-medium text-[#4E4B44]">
                            {formatPrice(item.product.price)} / unit
                          </span>
                          <span className="mt-0.5 font-mono text-base font-bold text-[#1C1C1A]">
                            {formatPrice(item.product.price * item.quantity)}
                          </span>
                          {isUnavailable && (
                            <p className="mt-1 text-xs font-semibold text-rose-500">
                              {t("item.removeUnavailableHint")}
                            </p>
                          )}
                        </div>

                        {/* Pill-shaped Adjuster */}
                        <div className="flex items-center gap-1 rounded-full border border-[#8E8B83]/20 bg-[#F7F6F3] p-1 shadow-xs">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity - 1,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0EEE9] text-[#1C1C1A] shadow-xs transition-all hover:bg-[#A5C2DE]/10 hover:text-[#3E6685] active:scale-95"
                            aria-label={t("item.decreaseQuantityAriaLabel")}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-8 px-1 text-center font-mono text-xs font-bold text-[#1C1C1A]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(
                                item.product.id,
                                item.quantity + 1,
                              )
                            }
                            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F0EEE9] text-[#1C1C1A] shadow-xs transition-all hover:bg-[#A5C2DE]/10 hover:text-[#3E6685] active:scale-95"
                            aria-label={t("item.increaseQuantityAriaLabel")}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* Deletion Button */}
                        <button
                          type="button"
                          onClick={() => {
                            removeItem(item.product.id);
                            toast.success(t("item.removedToast", { name: item.product.name }));
                          }}
                          className="col-span-2 flex h-10 w-full cursor-pointer items-center justify-center rounded-full text-[#4E4B44] transition-all hover:bg-rose-500/10 hover:text-rose-600 active:scale-95 md:col-span-1 md:h-10 md:w-10"
                          aria-label={t("item.removeAriaLabel")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </GsapReveal>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Order Summary (span 4, sticky) */}
            <div className="lg:sticky lg:top-24 lg:col-span-4">
              <Card className="space-y-6 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-6 shadow-sm sm:p-8">
                {/* Headline Summary */}
                <div className="space-y-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#4F7FA8]">
                    {t("footer.estimated")}
                  </span>
                    <h2 className="text-2xl font-bold tracking-tight text-[#1C1C1A]">
                    {t("footer.orderSummary")}
                  </h2>
                </div>

                {/* Micro Item breakdowns */}
                <div className="max-h-48 space-y-2.5 overflow-y-auto divide-y divide-[#8E8B83]/15 pr-2">
                  {items.map((item) => (
                    <div
                      key={item.product.id}
                      className="flex items-start justify-between gap-4 pt-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-[#1C1C1A]">
                          {item.product.name}
                        </p>
                        <p className="mt-0.5 text-xs font-medium text-[#4E4B44]">
                          x{item.quantity} · {formatPrice(item.product.price)}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono font-bold text-[#1C1C1A]">
                        {formatPrice(item.product.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Dynamic Price Breakdown */}
                <div className="space-y-3 border-t border-[#8E8B83]/15 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#4E4B44]">{t("footer.subtotal")}</span>
                    <span className="font-mono font-bold text-[#1C1C1A]">
                      {formatPrice(total)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#4E4B44]">
                      {t("footer.estimatedDelivery")}
                    </span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-800">
                      {t("footer.free")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-[#4E4B44]">
                      {t("footer.vatIncluded")}
                    </span>
                    <span className="font-mono font-medium text-[#4E4B44]">
                      {formatPrice(total * 0.07)}
                    </span>
                  </div>

                  <div className="flex items-end justify-between border-t border-[#8E8B83]/15 pt-3">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                        {t("footer.total")}
                      </p>
                    </div>
                    <p className="font-mono text-2xl font-bold leading-none text-[#1C1C1A]">
                      {formatPrice(total)}
                    </p>
                  </div>
                </div>

                {/* Action Quotation Checkout Button */}
                <div className="space-y-2.5 pt-2">
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setIsLeadModalOpen(true)}
                    className="solar-ui-primary w-full"
                  >
                    <FileText className="h-4 w-4" />
                    <span>{t("footer.requestQuote")}</span>
                  </Button>
                  <p className="mx-auto max-w-xs text-center text-xs leading-normal text-[#4E4B44]">
                    {t("footer.quoteDescription")}
                  </p>
                </div>

                {/* Premium Trust Badges */}
                <div className="space-y-3 rounded-[24px] border border-[#8E8B83]/15 bg-[#F0EEE9] p-4">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE8F5] text-[#4F7FA8]">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1C1C1A]">
                        {t("footer.qualityVerified")}
                      </h4>
                      <p className="text-[11px] text-[#4E4B44]">
                        {t("footer.qualityVerifiedDescription")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#DCE8F5] text-[#4F7FA8]">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#1C1C1A]">
                        {t("footer.fastTurnaround")}
                      </h4>
                      <p className="text-[11px] text-[#4E4B44]">
                        {t("footer.fastTurnaroundDescription")}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      <CartLeadCaptureModal
        isOpen={isLeadModalOpen}
        onClose={() => setIsLeadModalOpen(false)}
        items={items}
        totalPrice={total}
      />
    </PageShell>
  );
}
