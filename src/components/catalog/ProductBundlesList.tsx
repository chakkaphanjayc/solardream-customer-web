"use client";

import { useCartStore } from "@/store/useCartStore";
import { toast } from "sonner";
import { useLocale, useTranslations } from "next-intl";
import { Check, ShoppingBag, Percent, Gift } from "@/components/ui/icons";
import { isLocale, toIntlLocale } from "@/i18n/locales";
import AskInChatButton from "@/components/chat/AskInChatButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { SoliaGuide } from "@/components/brand/solia-scenes";

interface BundleItem {
  id: string;
  productId: string;
  quantity: number;
  product: {
    id: string;
    brand: string;
    model: string;
    price: number;
    name: string;
  };
}

export interface Bundle {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  isActive: boolean;
  discountType: string;
  discountValue: number;
  promoText: string | null;
  labels: string[];
  validFrom: Date | string | null;
  validUntil: Date | string | null;
  items: BundleItem[];
}

interface ProductBundlesListProps {
  bundles: Bundle[];
}

export default function ProductBundlesList({ bundles }: ProductBundlesListProps) {
  const t = useTranslations("ProductBundlesList");
  const locale = useLocale();
  const intlLocale = toIntlLocale(isLocale(locale) ? locale : "th");
  const currencyFormatter = new Intl.NumberFormat(intlLocale, {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0,
  });
  const addItem = useCartStore((state) => state.addItem);

  if (!bundles || bundles.length === 0) return null;

  const handleAddBundleToCart = (bundle: Bundle) => {
    // Add the bundle itself as a cart item
    addItem({
      id: bundle.id,
      name: bundle.name,
      price: bundle.price,
      imageUrl: bundle.imageUrl || "/images/bundle-placeholder.jpg",
      description: bundle.description,
      category: { name: t("cartCategory") },
      isBundle: true,
      bundleItems: bundle.items.map((item) => ({
        productId: item.productId,
        name: item.product?.name || `${item.product?.brand} ${item.product?.model}` || t("fallbackComponent"),
        quantity: item.quantity,
      })),
    });

    toast.success(t("toast.added", { name: bundle.name }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <SoliaGuide
          alt={locale === "th" ? "Solia แนะนำชุดอุปกรณ์โซลาร์" : "Solia presenting solar equipment bundles"}
          pose="presenting"
          className="h-20 w-16 shrink-0"
          imageSizes="64px"
        />
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--sd-selected)] text-[var(--sd-blue-600)]">
          <Gift className="w-5 h-5 stroke-[1.5]" />
        </div>
        <div>
          <h2 className="font-sans text-xl font-black uppercase tracking-wider text-[var(--sd-ink)]">
            {t("header.title")} <span className="text-[var(--sd-navy-900)]">{t("header.titleAccent")}</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--sd-text)]">
            {t("header.description")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {bundles.map((bundle) => {
          const originalSum = bundle.items.reduce(
            (sum, item) => sum + (item.product?.price || 0) * item.quantity,
            0
          );
          const savedAmount = originalSum - bundle.price;

          return (
            <Card
              key={bundle.id}
              tone="subtle"
              interactive
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-[var(--sd-raised)] p-6 lg:p-8"
            >
              {/* Promo Badge */}
              <Badge variant="dark" className="absolute right-6 top-6 z-10 border-0 text-[9px] tracking-widest">
                <Percent className="w-3 h-3 text-[#B7D1EA]" />
                <span>{t("saveAmount", { amount: currencyFormatter.format(Math.round(savedAmount)) })}</span>
              </Badge>

              <div className="space-y-4">
                <div className="space-y-2">
                  {/* Labels List */}
                  {bundle.labels && bundle.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {bundle.labels.map((l) => (
                        <Badge key={l} variant="primary" className="rounded-md px-2 py-0.5 text-[8px] tracking-wider">
                          {l}
                        </Badge>
                      ))}
                    </div>
                  )}

                  <h3 className="font-sans text-lg font-black text-[var(--sd-ink)] transition-colors group-hover:text-[var(--sd-navy-900)]">
                    {bundle.name}
                  </h3>
                  
                  {bundle.promoText && (
                    <p className="text-xs font-extrabold uppercase tracking-wider text-[var(--sd-navy-900)]">
                      ✨ {bundle.promoText}
                    </p>
                  )}

                  {bundle.description && (
                    <p className="mt-1 text-xs leading-relaxed text-[var(--sd-text)]">
                      {bundle.description}
                    </p>
                  )}

                  {bundle.validUntil && (
                    <p className="mt-1 font-mono text-[9px] text-[var(--sd-text)]">
                      {t("validUntil", { date: new Date(bundle.validUntil).toLocaleDateString(intlLocale) })}
                    </p>
                  )}
                </div>

                {/* Included items */}
                <div className="space-y-2 rounded-2xl bg-[var(--sd-soft-solar)] p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[var(--sd-text)]">
                    {t("includedTitle")}
                  </p>
                  <ul className="space-y-2.5">
                    {bundle.items.map((item) => (
                      <li key={item.id} className="flex items-start gap-2.5 text-xs text-[var(--sd-text)]">
                        <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[var(--sd-selected)] text-[var(--sd-navy-900)]">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                        <div className="flex-1 flex justify-between gap-2">
                          <span className="font-semibold text-[var(--sd-ink)]">
                            {item.product?.name || `${item.product?.brand} ${item.product?.model}`}
                          </span>
                            <span className="shrink-0 font-mono text-[var(--sd-text)]">
                              x{item.quantity}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Pricing & Checkout Area */}
              <div className="mt-6 flex items-center justify-between gap-4 border-t border-[var(--sd-line)] pt-5">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-[var(--sd-text)]">{t("specialPrice")}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono text-lg font-black text-[var(--sd-ink)]">
                      {currencyFormatter.format(bundle.price)}
                    </span>
                    <span className="font-mono text-xs text-[var(--sd-text)] line-through">
                      {currencyFormatter.format(originalSum)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <AskInChatButton
                    variant="icon"
                    tooltip="สอบถามชุดสินค้านี้ (Ask about this)"
                    reference={{
                      type: "BUNDLE",
                      id: bundle.id,
                      title: bundle.name,
                      subtitle: currencyFormatter.format(bundle.price),
                    }}
                    className="rounded-xl"
                  />
                  <Button
                    type="button"
                    onClick={() => handleAddBundleToCart(bundle)}
                    variant="secondary"
                    size="sm"
                    className="rounded-xl bg-[var(--sd-technical)] px-5 text-[10px] font-black uppercase tracking-widest text-[var(--sd-white)] hover:bg-[var(--sd-navy-900)]"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    {t("orderBundle")}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
