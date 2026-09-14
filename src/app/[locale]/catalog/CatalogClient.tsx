"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Circle,
  Dot,
  PackageOpen,
  ArrowUp,
} from "@/components/ui/icons";
import { formatPrice } from "@/lib/utils";
import { getInfiniteProducts } from "@/app/actions/product";
import CatalogFilters from "./CatalogFilters";
import ProductCTA, { type ProductCtaType } from "./ProductCTA";
import ProductBundlesList, { type Bundle } from "@/components/catalog/ProductBundlesList";
import AskInChatButton from "@/components/chat/AskInChatButton";
import { generatePublicProductName } from "@/lib/productUtils";
import FadeUp from "@/components/ui/FadeUp";
import { GsapPulse, GsapSpinner } from "@/components/ui/GsapMotion";
import { trackProductEvent } from "@/lib/productAnalytics";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LayerPortal } from "@/components/ui/layer-portal";

export type CatalogProduct = {
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
  category: {
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
    parent: {
      id: string;
      name: string;
    } | null;
  };
};

interface CategoryRecord {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
}

interface BrandRecord {
  id: string;
  name: string;
  logoUrl?: string | null;
}

interface CatalogClientProps {
  initialProducts: CatalogProduct[];
  initialHasMore: boolean;
  categories: CategoryRecord[];
  brandsList: BrandRecord[];
  search: string;
  categoryId: string;
  sort: string;
  brand: string;
  initialBundles: Bundle[];
}

type ProductMedia = {
  url: string;
  label: string;
};

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

function toStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof value === "string" && value.trim()) {
    return [value];
  }

  return [];
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function buildProductMedia(product: CatalogProduct): ProductMedia[] {
  const meta = asRecord(product.metadata);
  const mediaCandidates = [
    product.imageUrl,
    product.seoImage || "",
    ...toStringArray(meta.gallery),
    ...toStringArray(meta.images),
    ...toStringArray(meta.imageUrls),
    ...toStringArray(meta.additionalImages),
  ];

  const media = uniqueStrings(mediaCandidates).filter((url) => url.length > 0);

  if (media.length === 0) {
    return [{ url: "", label: generatePublicProductName(product) }];
  }

  return media.map((url, index) => ({
    url,
    label: `${generatePublicProductName(product)} image ${index + 1}`,
  }));
}

function buildFeatureBullets(product: CatalogProduct) {
  const meta = asRecord(product.metadata);
  const bulletSources = [
    ...toStringArray(meta.features),
    ...toStringArray(meta.highlights),
    ...toStringArray(meta.bullets),
    ...toStringArray(meta.bulletPoints),
  ];

  const fallback = [
    `${product.category.name} ready for quote planning`,
    generatePublicProductName(product),
    product.description || "Cloud Dancer catalog presentation",
  ];

  return uniqueStrings([...bulletSources, ...fallback]).slice(0, 5);
}

function buildSpecTags(product: CatalogProduct) {
  const meta = asRecord(product.metadata);
  const tags = [
    product.category.parent?.name ? `${product.category.parent.name} / ${product.category.name}` : product.category.name,
    product.brand,
    product.model,
    product.wattageCapacity ? `${product.wattageCapacity} W` : null,
    product.physicalWidth ? `${product.physicalWidth} m` : null,
    product.physicalLength ? `${product.physicalLength} m` : null,
    product.stock ? `Stock ${product.stock}` : null,
    product.useInRecommendation ? "Recommended" : null,
    typeof meta.warranty === "string" ? meta.warranty : null,
    typeof meta.efficiency === "string" ? meta.efficiency : null,
  ]
    .filter((value): value is string => Boolean(value))
    .map((value) => value.trim());

  return uniqueStrings(tags).slice(0, 5);
}

function ProductImageGallery({
  media,
  activeIndex,
  onChangeIndex,
  imageError,
  onImageError,
}: {
  media: ProductMedia[];
  activeIndex: number;
  onChangeIndex: (nextIndex: number) => void;
  imageError: Record<string, boolean>;
  onImageError: (url: string) => void;
}) {
  const t = useTranslations("CatalogPage");
  const activeMedia = media[activeIndex] || media[0];
  const hasMedia = media.some((item) => item.url.trim().length > 0);
  const canSlide = media.length > 1;

  return (
    <div className="flex w-full min-w-0 flex-col gap-4 lg:h-full">
      <div className="relative flex aspect-[4/3] min-h-[240px] w-full items-center justify-center overflow-hidden rounded-[24px] border border-[#8E8B83]/20 bg-[#F0EEE9] lg:min-h-0 lg:flex-1 lg:aspect-auto">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(103,80,164,0.12),transparent_40%),linear-gradient(180deg,#E6E3DC,#F0EEE9)]" />

        <div className="relative h-full min-h-[240px] w-full lg:min-h-0">
          {hasMedia && activeMedia?.url && !imageError[activeMedia.url] ? (
            <Image
              src={activeMedia.url}
              alt={activeMedia.label}
              fill
              unoptimized
              className="object-contain"
              onError={() => onImageError(activeMedia.url)}
              priority={false}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-8 text-center">
              <div className="max-w-sm space-y-3">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[#8E8B83]/30 bg-[#DCE8F5]">
                  <Dot className="h-8 w-8 text-[#4F7FA8]" />
                </div>
                <p className="text-sm font-bold text-[#1C1C1A]">{t("detail.previewImageUnavailable")}</p>
                <p className="text-xs leading-6 text-[#4E4B44]">
                  {t("detail.previewImageUnavailableDescription")}
                </p>
              </div>
            </div>
          )}
        </div>

        {canSlide && (
          <>
            <button
              type="button"
              onClick={() => onChangeIndex((activeIndex - 1 + media.length) % media.length)}
              className="absolute left-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9]/90 text-[#1C1C1A] shadow-sm backdrop-blur transition hover:bg-[#DCE8F5] active:scale-95"
              aria-label={t("detail.previousImage")}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onChangeIndex((activeIndex + 1) % media.length)}
              className="absolute right-3 top-1/2 z-10 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[#8E8B83]/30 bg-[#F0EEE9]/90 text-[#1C1C1A] shadow-sm backdrop-blur transition hover:bg-[#DCE8F5] active:scale-95"
              aria-label={t("detail.nextImage")}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
        {media.map((item, index) => {
          const isActive = index === activeIndex;
          const previewBroken = item.url && imageError[item.url];

          return (
            <button
              key={`${item.url || "fallback"}-${index}`}
              type="button"
              onClick={() => onChangeIndex(index)}
              className={[
                "relative h-16 w-20 shrink-0 overflow-hidden rounded-[16px] border transition-all active:scale-95",
                isActive ? "border-[#7CA8D0] ring-2 ring-[#B7D1EA]/40 bg-[#DCE8F5]" : "border-[#8E8B83]/25 hover:border-[#7CA8D0]/50 bg-[#F0EEE9]",
              ].join(" ")}
              aria-label={t("detail.showImage", { index: index + 1 })}
            >
              {item.url && !previewBroken ? (
                <Image
                  src={item.url}
                  alt={item.label}
                  fill
                  unoptimized
                  className="object-contain"
                  onError={() => onImageError(item.url)}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#E6E3DC]">
                  <Circle className="h-4 w-4 text-[#8E8B83]" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProductDetailDialog({
  product,
  open,
  onClose,
  onImageError,
  imageError,
}: {
  product: CatalogProduct | null;
  open: boolean;
  onClose: () => void;
  onImageError: (url: string) => void;
  imageError: Record<string, boolean>;
}) {
  const t = useTranslations("CatalogFilters");
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [product?.id]);

  if (!product) return null;

  const media = buildProductMedia(product);
  const tags = buildSpecTags(product);
  const features = buildFeatureBullets(product);

  return (
    <Dialog
      isOpen={open}
      onClose={onClose}
      size="full"
      tone="light"
      ariaLabel={generatePublicProductName(product)}
      closeLabel={t("detail.continueBrowsing")}
      className="h-[calc(100dvh-2rem)] max-w-6xl rounded-[28px] border border-[#8E8B83]/20 bg-[#F0EEE9] sm:h-[85dvh]"
    >
      <DialogContent>
            <DialogHeader className="border-b border-[#8E8B83]/20 bg-[#E6E3DC] px-5 py-5 sm:px-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4E4B44]">
                  {product.category.parent?.name ? `${product.category.parent.name} / ${product.category.name}` : product.category.name}
                </p>
                <DialogTitle className="text-2xl font-bold tracking-tight text-[#1C1C1A] sm:text-3xl">
                  {generatePublicProductName(product)}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-[#4E4B44]">
                  SKU: {product.erpnextItemCode || product.id}
                </DialogDescription>
                <div className="flex flex-wrap items-center gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-[#DCE8F5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#2E2C27]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </DialogHeader>

            <DialogBody className="p-5 sm:p-8 lg:overflow-hidden">
              <div className="grid min-h-full grid-cols-1 gap-8 lg:h-full lg:min-h-0 lg:grid-cols-12">
                <div className="flex min-h-0 flex-col lg:col-span-5 lg:h-full">
                  <div className="flex w-full min-w-0 items-center justify-center rounded-[24px] bg-[#E6E3DC] lg:h-full">
                    <ProductImageGallery
                      media={media}
                      activeIndex={activeIndex}
                      onChangeIndex={setActiveIndex}
                      imageError={imageError}
                      onImageError={onImageError}
                    />
                  </div>
                </div>

                <div className="flex min-h-0 flex-col lg:col-span-7 lg:h-full lg:overflow-y-auto lg:pr-2 lg:[scrollbar-gutter:stable]">
                  <div className="space-y-6 pb-1">
                    <div className="space-y-3 rounded-[24px] bg-[#E6E3DC] p-5 shadow-sm">
                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center rounded-full bg-[#DCE8F5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#0E2336]">
                          {t("header.badge")}
                        </span>
                        {product.stock > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-[#C4EED0] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#07522C]">
                            {t("detail.inStock")}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-[#FFE2A4] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.22em] text-[#633B00]">
                            {t("detail.limited")}
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-bold text-[#1C1C1A]">{formatPrice(product.price)}</p>

                      {product.description && (
                        <p className="text-sm leading-7 text-[#4E4B44]">
                          {product.description}
                        </p>
                      )}
                    </div>

                    <div className="rounded-[24px] bg-[#E6E3DC] p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4E4B44]">{t("detail.featureHighlights")}</p>
                      <ul className="mt-4 space-y-3">
                        {features.map((feature) => (
                          <li key={feature} className="flex items-start gap-3 text-sm leading-6 text-[#1C1C1A]">
                            <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[#4F7FA8]" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="rounded-[24px] bg-[#E6E3DC] p-5 shadow-sm">
                      <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#4E4B44]">{t("detail.quickSpecs")}</p>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {[
                          { label: t("detail.brand"), value: product.brand },
                          { label: t("detail.model"), value: product.model },
                          { label: t("detail.category"), value: product.category.name },
                          { label: t("detail.stock"), value: String(product.stock) },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-[16px] border border-[#8E8B83]/15 bg-[#F0EEE9] px-4 py-3"
                          >
                            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#4E4B44]">{item.label}</p>
                            <p className="mt-1 text-sm font-semibold text-[#1C1C1A]">{item.value}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row">
                      <ProductCTA
                        product={product}
                        context="catalog-dialog"
                        className="py-3.5 text-sm tracking-[0.2em]"
                      />
                      <AskInChatButton
                        reference={{
                          type: "PRODUCT",
                          id: product.id,
                          title: generatePublicProductName(product),
                          subtitle: formatPrice(product.price),
                        }}
                        tooltip={t("detail.askAboutProduct")}
                        label={t("detail.askAboutProduct")}
                        className="inline-flex w-full px-5 py-3.5 text-sm font-black uppercase tracking-[0.2em]"
                      />
                      <button
                        type="button"
                        onClick={onClose}
                        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#8E8B83] bg-transparent px-5 py-3.5 text-sm font-black uppercase tracking-[0.2em] text-[#4F7FA8] transition-colors hover:bg-[#A5C2DE]/10 active:scale-95"
                      >
                        {t("detail.continueBrowsing")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

export default function CatalogClient({
  initialProducts,
  initialHasMore,
  categories,
  brandsList,
  search,
  categoryId,
  sort,
  brand,
  initialBundles,
}: CatalogClientProps) {
  const t = useTranslations("CatalogPage");

  const [products, setProducts] = useState<CatalogProduct[]>(initialProducts);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [activeHighlightId, setActiveHighlightId] = useState<string>(categoryId || "");
  const [showFloatingUtility, setShowFloatingUtility] = useState(false);
  const [passedMilestones, setPassedMilestones] = useState<{ id: string; name: string }[]>([]);
  const [activeProductId, setActiveProductId] = useState<string | null>(null);
  const [imageError, setImageError] = useState<Record<string, boolean>>({});

  const loaderRef = useRef<HTMLDivElement | null>(null);

  const activeProduct = useMemo(
    () => products.find((product) => product.id === activeProductId) || null,
    [activeProductId, products]
  );

  useEffect(() => {
    void trackProductEvent("catalog_viewed", {
      category: categoryId || "all",
      result_count: initialProducts.length,
    });
  }, [categoryId, initialProducts.length]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToCategory = useCallback((catId: string) => {
    const element = document.getElementById(`category-divider-${catId}`);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  }, []);

  const openProduct = useCallback((productId: string) => {
    setActiveProductId(productId);
    void trackProductEvent("product_viewed", {
      product_sku: productId,
      context: "catalog",
    });
  }, []);

  const closeProduct = useCallback(() => {
    setActiveProductId(null);
  }, []);

  const loadMoreProducts = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);

    try {
      const skipCount = products.length;
      const result = await getInfiniteProducts({
        search,
        categoryId,
        sort,
        brand,
        skip: skipCount,
        take: 12,
      });

      if (result.success && result.products) {
        setProducts((prev) => {
          const existingIds = new Set(prev.map((product) => product.id));
          const newProducts = (result.products as CatalogProduct[]).filter(
            (product) => !existingIds.has(product.id)
          );
          return [...prev, ...newProducts];
        });
        setHasMore(Boolean(result.hasMore));
      }
    } catch (error) {
      console.error("Failed to load more products:", error);
    } finally {
      setLoading(false);
    }
  }, [brand, categoryId, hasMore, loading, products.length, search, sort]);

  useEffect(() => {
    if (categoryId) return;

    const handleScroll = () => {
      const isScrolledDown = window.scrollY > 300;
      setShowFloatingUtility(isScrolledDown);

      if (isScrolledDown) {
        const scrollPosition = window.scrollY + 120;
        const passed: { id: string; name: string }[] = [];

        const dividers = document.querySelectorAll(".category-section-marker");
        dividers.forEach((divider) => {
          const rect = divider.getBoundingClientRect();
          const topPosition = rect.top + window.pageYOffset;

          if (topPosition < scrollPosition) {
            const id = divider.getAttribute("data-category-id");
            const name = divider.getAttribute("data-category-name");
            if (id && name) {
              passed.push({ id, name });
            }
          }
        });

        setPassedMilestones(passed.slice(-2));
      } else {
        setPassedMilestones([]);
      }
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [categoryId, products]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first && first.isIntersecting && hasMore && !loading) {
          void loadMoreProducts();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    const currentLoader = loaderRef.current;
    if (currentLoader) {
      observer.observe(currentLoader);
    }

    return () => {
      if (currentLoader) {
        observer.unobserve(currentLoader);
      }
    };
  }, [hasMore, loadMoreProducts, loading]);

  useEffect(() => {
    if (categoryId) return;

    const observerOptions = {
      root: null,
      rootMargin: "-25% 0px -45% 0px",
      threshold: 0,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const catId = entry.target.getAttribute("data-category-id");
          if (catId) {
            setActiveHighlightId(catId);
          }
        }
      });
    }, observerOptions);

    const targets = document.querySelectorAll(".category-scroll-target");
    targets.forEach((target) => observer.observe(target));

    return () => {
      observer.disconnect();
    };
  }, [categoryId, products]);

  const renderedGridItems = useMemo(() => {
    const items: React.ReactNode[] = [];
    let lastCategoryId = "";

    products.forEach((product, index) => {
      const cat = product.category;

      if (!categoryId && cat.id !== lastCategoryId) {
        lastCategoryId = cat.id;
        const parentName = cat.parent?.name;
        const dividerLabel = parentName ? `${parentName} / ${cat.name}` : cat.name;

        items.push(
          <FadeUp
            key={`divider-${cat.id}-${index}`}
            className="col-span-full category-section-marker category-scroll-target"
          >
            <div
              id={`category-divider-${cat.id}`}
              data-category-id={cat.id}
              data-category-name={cat.name}
            >
              <span className="block w-full bg-transparent py-8 text-left text-[11px] font-bold uppercase tracking-widest text-[#4F7FA8]">
                [ {dividerLabel} ]
              </span>
            </div>
          </FadeUp>
        );
      }

      const imageBroken = product.imageUrl ? imageError[product.imageUrl] : false;
      const isRecommended = product.useInRecommendation === true || index === 0;
      const isOnSale = !isRecommended && (product.recommendPriority > 5 || index === 3);

      let gridSpanClass = "col-span-1 row-span-1";
      let cardBgAndBorder = "border border-[#8E8B83]/20 bg-[#E6E3DC] rounded-[24px] hover:scale-[1.01] hover:shadow-md transition-all duration-300";
      let cardFlexLayout = "flex flex-col justify-between h-full";
      let imageFrameClass = "w-full aspect-video mb-4 rounded-[20px] bg-[#F0EEE9] animate-none";
      let titleClass = "text-lg font-bold leading-tight text-[#1C1C1A]";

      if (isRecommended) {
        gridSpanClass = "col-span-1 md:col-span-2 row-span-1 md:row-span-2";
        cardBgAndBorder = "border-2 border-[#7CA8D0]/40 bg-[#DCE8F5] rounded-[28px] hover:scale-[1.01] hover:shadow-lg transition-all duration-300";
        cardFlexLayout = "flex flex-col justify-between h-full";
        imageFrameClass = "w-full aspect-square mb-4 rounded-[24px] bg-[#F0EEE9] animate-none";
        titleClass = "text-2xl font-bold leading-tight text-[#1C1C1A]";
      } else if (isOnSale) {
        gridSpanClass = "col-span-1 md:col-span-2 row-span-1";
        cardBgAndBorder = "border border-[#D8A87B]/30 bg-[#E6E3DC] rounded-[24px] hover:scale-[1.01] hover:shadow-md transition-all duration-300";
        cardFlexLayout = "flex flex-col md:flex-row gap-6 items-center h-full";
        imageFrameClass = "w-full md:w-2/5 aspect-square mb-0 rounded-[20px] bg-[#F0EEE9] animate-none";
        titleClass = "text-lg font-bold leading-tight text-[#1C1C1A]";
      }

      items.push(
        <FadeUp
          key={product.id}
          className={gridSpanClass}
        >
          <article
            data-bagui="card"
            data-category-id={cat.id}
            className={[
              "group h-full w-full overflow-hidden p-6 transition-all duration-300",
              cardBgAndBorder,
              cardFlexLayout
            ].join(" ")}
            style={{ contentVisibility: "auto", containIntrinsicSize: "0 320px" }}
          >
            {/* ── Image Frame ─────────────────────────── */}
            <div className={[
              "relative flex shrink-0 items-center justify-center overflow-hidden p-2",
              imageFrameClass
            ].join(" ")}>
              {product.imageUrl && product.imageUrl.trim() !== "" && !imageBroken ? (
                <Image
                  src={product.imageUrl}
                  alt={`${product.brand} ${product.model}`}
                  className="object-contain"
                  loading="lazy"
                  fill
                  unoptimized
                  onError={() => setImageError((prev) => ({ ...prev, [product.imageUrl]: true }))}
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(103,80,164,0.12),transparent_55%)]">
                  <div className="space-y-2 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[#8E8B83]/30 bg-[#DCE8F5]">
                      <PackageOpen className="h-5 w-5 text-[#4F7FA8]" />
                    </div>
                    <p className="text-xs font-bold text-[#4E4B44]">{t("detail.previewUnavailable")}</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Metadata Stack ──────────────────────── */}
            <div className={[
              "flex flex-col w-full h-full justify-between",
              isRecommended ? "flex-1 py-2" : ""
            ].join(" ")}>
              <div>
                {/* 1. Category Tag */}
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#4F7FA8] mb-1 truncate">
                  {cat.parent?.name ? `${cat.parent.name} / ${cat.name}` : cat.name}
                </p>

                {/* 2. Product Name — line-clamped to prevent height misalignment */}
                <h2 className={[titleClass, "mb-0.5 min-h-[24px] truncate"].join(" ")}>
                  {generatePublicProductName(product)}
                </h2>
                <div className="text-[10px] text-[#4E4B44] font-mono mb-2">
                  SKU: {product.erpnextItemCode || product.id}
                </div>

                {/* 3. Stock Status + Sale status pill */}
                <div className="flex flex-wrap items-center gap-1.5 mb-3">
                  <Badge
                    variant={product.stock > 0 ? "success" : "warning"}
                    className="px-2.5 py-0.5 text-[10px] font-bold"
                  >
                    {product.stock > 0 ? t("detail.inStock") : t("detail.limited")}
                  </Badge>
                  {isOnSale && (
                    <Badge variant="warning" className="bg-[#FFE2A4] text-[#633B00] px-2.5 py-0.5 text-[10px] font-bold">
                      {t("detail.onSale")}
                    </Badge>
                  )}
                </div>
              </div>

              {/* 4. Price + CTA */}
              <div className="flex flex-col gap-2 mt-4">
                <span className="text-base font-bold text-[#1C1C1A]">
                  {formatPrice(product.price)}
                </span>
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => openProduct(product.id)}
                    className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[#8E8B83] bg-transparent px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-[#4F7FA8] transition-all hover:bg-[#A5C2DE]/10 active:scale-95"
                  >
                    {t("productCard.details")}
                  </button>
                  <ProductCTA product={product} context="catalog-card" className="py-2.5 tracking-widest" />
                  <AskInChatButton
                    variant="icon"
                    tooltip="สอบถามสินค้านี้ (Ask about this)"
                    reference={{
                      type: "PRODUCT",
                      id: product.id,
                      title: generatePublicProductName(product),
                      subtitle: formatPrice(product.price),
                    }}
                    className="min-h-11 w-full rounded-full animate-none active:scale-95"
                  />
                </div>
              </div>
            </div>
          </article>
        </FadeUp>
      );
    });

    return items;
  }, [categoryId, imageError, openProduct, products, t]);

  const floatingUtilityVisible = !categoryId && showFloatingUtility;
  const visibleMilestones = categoryId ? [] : passedMilestones;

  return (
    <div className="flex w-full flex-col items-start gap-8 md:flex-row">
      <aside className="layer-sticky w-full shrink-0 md:sticky md:top-24 md:w-64 lg:w-72">
        <div className="space-y-6 rounded-[28px] border border-[#8E8B83]/20 bg-[#E6E3DC] p-5 md:p-6 shadow-sm">
          <CatalogFilters
            categories={categories}
            brandsList={brandsList}
            activeSearch={search}
            activeCategoryId={categoryId}
            activeSort={sort}
            activeBrand={brand}
            activeHighlightId={activeHighlightId}
          />
        </div>
      </aside>

      <div className="w-full flex-1 space-y-6">
        {!categoryId && !search && (
          <div className="pb-6">
            <ProductBundlesList bundles={initialBundles} />
          </div>
        )}

        <div className="flex items-center justify-between border-b border-[#8E8B83]/20 pb-4">
          <span className="text-sm font-bold uppercase tracking-widest text-[#4E4B44]">
            {t("status.showing", { count: products.length })}
          </span>
        </div>

        {products.length > 0 ? (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 grid-flow-row-dense">
              {renderedGridItems}
            </div>

            {hasMore && (
              <div ref={loaderRef} className="flex w-full items-center justify-center py-12">
                {loading && (
                  <GsapPulse className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#4E4B44]">
                    <GsapSpinner className="h-5 w-5 text-[#4F7FA8]" />
                    <span>{t("loadingMore")}</span>
                  </GsapPulse>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4 rounded-[28px] border border-dashed border-[#8E8B83]/30 bg-[#E6E3DC]/70 py-24 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-[#8E8B83]/30 bg-[#DCE8F5]">
              <ArrowLeft className="h-5 w-5 text-[#4F7FA8]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#1C1C1A]">
                {t("emptyState.title")}
              </h3>
              <p className="mx-auto max-w-xs text-xs font-medium leading-relaxed text-[#4E4B44]">
                {t("emptyState.description")}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Floating Scroll Utility & Milestone Tracker at Bottom-Right */}
      {floatingUtilityVisible ? (
        <LayerPortal>
            <div className="layer-floating fixed bottom-6 right-4 flex items-center gap-2.5 sm:bottom-8 sm:right-8">
              {/* Milestone Bookmark Tracker pills trail */}
              <div className="hidden items-center gap-2 sm:flex">
                {visibleMilestones.map((milestone) => (
                  <button
                    key={milestone.id}
                    type="button"
                    onClick={() => scrollToCategory(milestone.id)}
                    className="min-h-11 rounded-full border border-[#8E8B83]/30 bg-[#E6E3DC] px-3.5 py-2 text-[10px] font-bold text-[#1C1C1A] shadow-sm transition-all hover:bg-[#DCE8F5] active:scale-95"
                    title={`Scroll to ${milestone.name}`}
                  >
                    {milestone.name}
                  </button>
                ))}
              </div>

              {/* Back to Top button */}
              <button
                type="button"
                onClick={scrollToTop}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#B7D1EA] text-white shadow-md transition-all hover:bg-[#A5C2DE]/90 active:scale-95"
                title="Scroll to Top"
                aria-label="Scroll to top"
              >
                <ArrowUp className="h-5 w-5 text-white" />
              </button>
            </div>
        </LayerPortal>
      ) : null}

      <ProductDetailDialog
        key={activeProduct?.id ?? "no-product"}
        product={activeProduct}
        open={Boolean(activeProduct)}
        onClose={closeProduct}
        onImageError={(url) => setImageError((prev) => ({ ...prev, [url]: true }))}
        imageError={imageError}
      />
    </div>
  );
}
