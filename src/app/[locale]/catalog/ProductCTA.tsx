"use client";

import { useMemo, useState } from "react";
import type { MouseEvent } from "react";
import {
  CalendarClock,
  CheckCheck,
  MessageCircle,
  PackageSearch,
  Send,
  ShoppingCart,
} from "@/components/ui/icons";
import { toast } from "sonner";
import { useCartStore, type CartItem } from "@/store/useCartStore";
import { generatePublicProductName } from "@/lib/productUtils";
import { useTranslations } from "next-intl";
import { trackProductEvent } from "@/lib/productAnalytics";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type ProductCtaType = "REQUEST_QUOTE" | "CHECK_STOCK" | "CONTACT_SALES";

export type ProductCtaProduct = {
  id: string;
  erpnextItemCode?: string | null;
  brand: string;
  model: string;
  price: number;
  imageUrl: string;
  description: string | null;
  metadata: unknown;
  isActive: boolean;
  ctaType?: ProductCtaType | null;
  stockStatus?: string | null;
};

type ProductCTAProps = {
  product: ProductCtaProduct;
  className?: string;
  context?: "catalog-card" | "catalog-dialog" | "product-detail" | "floating-bar";
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function getSalesUrl(product: ProductCtaProduct) {
  const metadata = asRecord(product.metadata);
  const configured =
    metadata.salesUrl ||
    metadata.contactSalesUrl ||
    metadata.lineUrl ||
    metadata.whatsappUrl;

  if (typeof configured === "string" && configured.trim()) {
    return configured.trim();
  }

  return (
    process.env.NEXT_PUBLIC_LINE_CONTACT_URL ||
    "https://line.me/R/ti/p/@solardream"
  );
}

export default function ProductCTA({
  product,
  className,
  context = "catalog-card",
}: ProductCTAProps) {
  const t = useTranslations("ProductCTA");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const quantityInCart = useCartStore((state) =>
    state.hasHydrated ? state.getItemQuantity(product.id) : 0,
  );

  const productName = useMemo(
    () => generatePublicProductName(product),
    [product],
  );
  const sku = product.erpnextItemCode || product.id;
  const ctaType = product.ctaType || "REQUEST_QUOTE";

  const cartProduct: CartItem["product"] = {
    id: product.id,
    name: productName,
    brand: product.brand,
    model: product.model,
    price: product.price,
    imageUrl: product.imageUrl || "",
    description: product.description ?? null,
    category: { name: "Equipment" },
    metadata: product.metadata,
    isActive: product.isActive,
    erpnextItemCode: sku,
  };

  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    void trackProductEvent("product_cta_clicked", {
      product_sku: sku,
      cta_type: ctaType,
      context,
    });

    if (ctaType === "REQUEST_QUOTE") {
      addItem(cartProduct);
      void trackProductEvent("product_added_to_cart", {
        product_sku: sku,
        quantity: quantityInCart + 1,
        context,
      });
      toast.success(t("added", { productName }), {
        description: t("addedDescription"),
        duration: 3000,
      });
      return;
    }

    if (ctaType === "CHECK_STOCK") {
      setDrawerOpen(true);
      void trackProductEvent("product_stock_inquiry_started", {
        product_sku: sku,
        context,
      });
      return;
    }

    window.open(getSalesUrl(product), "_blank", "noopener,noreferrer");
    toast.message(t("openingSales"), {
      description: `SKU: ${sku}`,
      duration: 2500,
    });
  };

  const buttonConfig = {
    REQUEST_QUOTE: {
      label:
        quantityInCart > 0
          ? t("quoteWithCount", { count: quantityInCart })
          : t("quote"),
      icon: quantityInCart > 0 ? CheckCheck : ShoppingCart,
      classes:
        "bg-[#B7D1EA] text-white hover:bg-[#A5C2DE]/90 active:scale-95 shadow-sm hover:shadow-md",
    },
    CHECK_STOCK: {
      label: t("checkStock"),
      icon: PackageSearch,
      classes:
        "border border-[#8E8B83]/30 bg-[#F0EEE9] text-[#1C1C1A] hover:bg-[#DCE8F5]/50 active:scale-95 shadow-sm",
    },
    CONTACT_SALES: {
      label: t("contactSales"),
      icon: MessageCircle,
      classes:
        "bg-[#DCE8F5] text-[#2E2C27] hover:bg-[#DCE8F5] active:scale-95 shadow-sm",
    },
  }[ctaType];

  const Icon = buttonConfig.icon;

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={handleClick}
        data-product-cta={ctaType}
        data-product-cta-context={context}
        data-product-sku={sku}
        className={[
          "w-full rounded-full px-5 py-2.5",
          "text-xs font-medium",
          "min-h-11 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          buttonConfig.classes,
          className || "",
        ].join(" ")}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        <span>{buttonConfig.label}</span>
      </Button>

      <Sheet
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        tone="light"
        ariaLabel={t("checkStock")}
        closeLabel={t("closeStockInquiry")}
      >
        <SheetContent className="bg-[#F0EEE9] text-[#1C1C1A]">
          <SheetHeader className="border-b border-[#8E8B83]/15 bg-[#F0EEE9] px-6 py-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-[#4F7FA8]">
                {t("stockInquiry")}
              </p>
              <SheetTitle className="mt-1 text-2xl font-bold text-[#1C1C1A]">
                {t("checkStock")}
              </SheetTitle>
              <SheetDescription className="mt-1 text-sm text-[#4E4B44]">
                {productName}
              </SheetDescription>
            </div>
          </SheetHeader>

          <SheetBody className="bg-[#F0EEE9] p-6 sm:p-7">
            <Card className="rounded-[24px] border border-[#8E8B83]/15 bg-[#E6E3DC] p-5 shadow-sm">
              <p className="text-base font-bold text-[#1C1C1A]">{productName}</p>
              <p className="mt-1 font-mono text-xs text-[#4E4B44]">SKU: {sku}</p>
              {product.stockStatus && (
                <p className="mt-3 inline-flex rounded-full bg-[#DCE8F5] px-3 py-1 text-[11px] font-bold text-[#2E2C27]">
                  {product.stockStatus}
                </p>
              )}
            </Card>

            <form
              className="mt-6 space-y-4"
              data-analytics-form="product_stock_inquiry"
              data-analytics-submit-event="support_request_submitted"
              onSubmit={(event) => {
                event.preventDefault();
                void trackProductEvent("support_request_submitted", {
                  surface: "catalog_stock_inquiry",
                  product_sku: sku,
                });
                toast.success(t("requestReceived"), {
                  description: `${productName} (${sku})`,
                  duration: 3000,
                });
                setDrawerOpen(false);
              }}
            >
              <input type="hidden" name="productSku" value={sku} readOnly />
              <input
                type="hidden"
                name="productName"
                value={productName}
                readOnly
              />

              <label className="block">
                <span className="text-xs font-medium text-[#1C1C1A]">
                  {t("name")}
                </span>
                <Input
                  name="name"
                  required
                  className="mt-1.5 min-h-12 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3 text-sm font-medium text-[#1C1C1A] transition-all placeholder:text-[#4E4B44]/50 focus:border-[#7CA8D0] focus:bg-[#F0EEE9] focus:ring-0"
                  placeholder={t("namePlaceholder")}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#1C1C1A]">
                  {t("phoneLine")}
                </span>
                <Input
                  name="contact"
                  required
                  className="mt-1.5 min-h-12 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] px-4 py-3 text-sm font-medium text-[#1C1C1A] transition-all placeholder:text-[#4E4B44]/50 focus:border-[#7CA8D0] focus:bg-[#F0EEE9] focus:ring-0"
                  placeholder={t("phoneLinePlaceholder")}
                />
              </label>

              <label className="block">
                <span className="text-xs font-medium text-[#1C1C1A]">
                  {t("message")}
                </span>
                <Textarea
                  name="message"
                  rows={4}
                  className="mt-1.5 w-full rounded-t-xl rounded-b-none border-b-2 border-[#8E8B83] bg-[#F7F6F3] p-3 text-sm font-medium text-[#1C1C1A] transition-all placeholder:text-[#4E4B44]/50 focus:border-[#7CA8D0] focus:bg-[#F0EEE9] focus:ring-0"
                  defaultValue={t("messageDefault", { productName, sku })}
                />
              </label>

              <Button
                type="submit"
                size="lg"
                className="w-full rounded-full bg-[#B7D1EA] px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95"
              >
                <Send className="h-4 w-4" aria-hidden="true" />
                {t("sendRequest")}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={() =>
                  window.open(
                    getSalesUrl(product),
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="w-full rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9] px-6 py-3 text-sm font-medium text-[#4E4B44] transition-all duration-300 hover:bg-[#A5C2DE]/10 hover:text-[#3E6685] active:scale-95"
              >
                <CalendarClock className="h-4 w-4" aria-hidden="true" />
                {t("scheduleSales")}
              </Button>
            </form>
          </SheetBody>
        </SheetContent>
      </Sheet>
    </>
  );
}
