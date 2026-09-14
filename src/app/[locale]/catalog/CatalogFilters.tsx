"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition, useEffect, useRef, type ReactNode } from "react";
import { Search, SlidersHorizontal, X, ArrowUpDown, Check } from "@/components/ui/icons";
import { gsap } from "gsap";
import { cn } from "@/lib/utils";
import CustomCheckbox from "@/components/ui/CustomCheckbox";
import { GsapSpinner } from "@/components/ui/GsapMotion";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LayerPortal } from "@/components/ui/layer-portal";

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
  parent?: {
    id: string;
    name: string;
  } | null;
}

interface Brand {
  id: string;
  name: string;
}

interface CatalogFiltersProps {
  categories: Category[];
  brandsList: Brand[];
  activeSearch: string;
  activeCategoryId: string;
  activeSort: string;
  activeBrand: string;
  activeHighlightId?: string;
}

function hasSelectedDescendant(
  category: Category,
  allCategories: Category[],
  activeCategoryId: string
): boolean {
  if (!activeCategoryId) return false;
  const children = allCategories.filter((c) => c.parentId === category.id);
  for (const child of children) {
    if (child.id === activeCategoryId || hasSelectedDescendant(child, allCategories, activeCategoryId)) {
      return true;
    }
  }
  return false;
}

function CategoryTreeNode({
  category,
  allCategories,
  depth,
  activeCategoryId,
  activeHighlightId,
  onSelect,
}: {
  category: Category;
  allCategories: Category[];
  depth: number;
  activeCategoryId: string;
  activeHighlightId?: string;
  onSelect: (id: string | null) => void;
}) {
  const t = useTranslations("CatalogFilters");
  const children = allCategories.filter((c) => c.parentId === category.id);
  const hasChildren = children.length > 0;
  
  const isSelected = activeCategoryId === category.id;
  const isHighlighted = activeHighlightId === category.id;
  const isAnyDescendantSelected = hasSelectedDescendant(category, allCategories, activeCategoryId);
  
  const [isOpen, setIsOpen] = useState(isAnyDescendantSelected || isSelected);
  const effectiveOpen = isOpen || isSelected || isAnyDescendantSelected;

  return (
    <div className="flex flex-col w-full">
      <div className="flex items-center gap-1.5 w-full">
        <button
          onClick={() => onSelect(category.id)}
          className={cn(
            "flex min-h-11 flex-1 items-center justify-between rounded-full border px-4 py-2.5 text-left text-xs transition-colors",
            isSelected
              ? "bg-[#DCE8F5] border-transparent text-[#0E2336] font-bold shadow-sm"
              : isHighlighted
              ? "bg-[#DCE8F5] border-transparent text-[#2E2C27] font-semibold"
              : "bg-[#E6E3DC] border-transparent hover:bg-[#DCE8F5]/70 text-[#4E4B44] hover:text-[#1C1C1A] font-medium"
          )}
        >
          <span className="truncate">{category.name}</span>
          {isSelected && <Check className="w-3.5 h-3.5 text-[#0E2336] shrink-0" />}
        </button>
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(!isOpen);
            }}
            className="inline-flex size-11 items-center justify-center rounded-full border border-transparent bg-[#E6E3DC] text-[#4E4B44] transition-colors hover:bg-[#DCE8F5] hover:text-[#1C1C1A]"
            aria-label={isOpen ? t("collapse") : t("expand")}
          >
            <span
              className={cn(
                "inline-block text-[10px] font-bold leading-none transition-transform duration-200 ease-out",
                effectiveOpen && "rotate-90",
              )}
            >
              ▶
            </span>
          </button>
        )}
      </div>

      {hasChildren && effectiveOpen && (
          <GsapCollapse
            className="overflow-hidden flex flex-col gap-1.5 pl-3 ml-3 border-l border-slate-300/40 mt-1.5"
          >
            {children.map((child) => (
              <CategoryTreeNode
                key={child.id}
                category={child}
                allCategories={allCategories}
                depth={depth + 1}
                activeCategoryId={activeCategoryId}
                activeHighlightId={activeHighlightId}
                onSelect={onSelect}
              />
            ))}
          </GsapCollapse>
        )}
    </div>
  );
}

export default function CatalogFilters({
  categories,
  brandsList = [],
  activeSearch,
  activeCategoryId,
  activeSort,
  activeBrand,
  activeHighlightId,
}: CatalogFiltersProps) {
  const t = useTranslations("CatalogFilters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Local state for search inputs
  const [searchInput, setSearchInput] = useState(activeSearch);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Update query helper
  const updateQuery = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    
    Object.entries(updates).forEach(([key, val]) => {
      if (val === null || val === "") {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });

    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQuery({ search: searchInput });
  };

  const handleCategorySelect = (id: string | null, onAction?: () => void) => {
    updateQuery({ categoryId: id });
    if (onAction) onAction();
  };

  const handleSortChange = (sortVal: string) => {
    updateQuery({ sort: sortVal });
  };

  const selectedBrands = activeBrand
    ? activeBrand.split(",").map((b) => b.trim()).filter(Boolean)
    : [];

  const handleBrandToggle = (brandName: string) => {
    let newSelected: string[];
    if (selectedBrands.includes(brandName)) {
      newSelected = selectedBrands.filter((b) => b !== brandName);
    } else {
      newSelected = [...selectedBrands, brandName];
    }
    updateQuery({ brand: newSelected.length > 0 ? newSelected.join(",") : null });
  };

  const clearAllFilters = () => {
    setSearchInput("");
    router.push(pathname);
  };

  const hasActiveFilters = activeSearch || activeCategoryId || activeSort || activeBrand;

  const sortingOptions = [
    { label: t("sort.newest"), value: "newest" },
    { label: t("sort.lowToHigh"), value: "price_asc" },
    { label: t("sort.highToLow"), value: "price_desc" },
  ];

  // Render search form block
  const renderSearchForm = (onSubmitted?: () => void) => (
    <form
      onSubmit={(e) => {
        handleSearchSubmit(e);
        if (onSubmitted) onSubmitted();
      }}
      className="space-y-2"
    >
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
        {t("keywordSearch")}
      </label>
      <div className="relative">
        <Input
          type="text"
          placeholder={t("searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="rounded-full bg-background py-3.5 pl-4 pr-12 text-xs font-semibold"
        />
        <Button
          type="submit"
          variant="quiet"
          size="icon"
          className="absolute right-2 top-1/2 h-9 w-9 min-h-9 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={t("searchPlaceholder")}
        >
          <Search className="w-4 h-4" />
        </Button>
      </div>
    </form>
  );

  // Render sorting selector block
  const renderSortOptions = (onSelected?: () => void) => (
    <div className="space-y-2">
        <label className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-700">
        <ArrowUpDown className="w-3 h-3 text-slate-900" /> {t("sortBy")}
      </label>
      <div className="grid grid-cols-1 gap-2">
        {sortingOptions.map((opt) => {
          const isSelected = activeSort === opt.value || (opt.value === "newest" && !activeSort);
          return (
            <button
              key={opt.value}
              onClick={() => {
                handleSortChange(opt.value);
                if (onSelected) onSelected();
              }}
              className={cn(
                "w-full text-left flex items-center justify-between text-xs py-3 px-4 rounded-full border transition-all cursor-pointer",
                isSelected
                  ? "bg-[#DCE8F5] border-transparent text-[#0E2336] font-bold shadow-sm"
                  : "bg-[#E6E3DC] border-transparent hover:bg-[#DCE8F5]/70 text-[#4E4B44] hover:text-[#1C1C1A] font-medium"
              )}
            >
              <span className="font-semibold">{opt.label}</span>
              {isSelected && <Check className="w-3.5 h-3.5 text-[#0E2336]" />}
            </button>
          );
        })}
      </div>
    </div>
  );

  // Render categories tree block
  const renderCategoriesList = (onSelected?: () => void) => (
    <div className="space-y-3">
      <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
        {t("categories")}
      </label>
      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleCategorySelect(null, onSelected)}
          className={cn(
            "w-full text-left text-xs py-3 px-4 rounded-full border transition-all flex items-center justify-between cursor-pointer",
            !activeCategoryId
              ? "bg-[#DCE8F5] border-transparent text-[#0E2336] font-bold shadow-sm"
              : "bg-[#E6E3DC] border-transparent hover:bg-[#DCE8F5]/70 text-[#4E4B44] hover:text-[#1C1C1A] font-medium"
          )}
        >
          <span className="font-semibold">{t("allCategories")}</span>
          {!activeCategoryId && <Check className="w-3.5 h-3.5 text-[#0E2336]" />}
        </button>

        {categories
          .filter((cat) => !cat.parentId)
          .map((cat) => (
            <CategoryTreeNode
              key={cat.id}
              category={cat}
              allCategories={categories}
              depth={0}
              activeCategoryId={activeCategoryId}
              activeHighlightId={activeHighlightId}
              onSelect={(id) => handleCategorySelect(id, onSelected)}
            />
          ))}
      </div>
    </div>
  );

  // Render brands checklist block
  const renderBrandsList = () => {
    if (!brandsList || brandsList.length === 0) return null;
    return (
      <div className="space-y-3 border-t border-slate-200/60 pt-6">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-700">
          {t("brands")}
        </label>
        <div className="flex flex-col gap-2.5 max-h-60 overflow-y-auto pr-1">
          {brandsList.map((brandObj) => {
            const isChecked = selectedBrands.includes(brandObj.name);
            return (
              <CustomCheckbox
                key={brandObj.id}
                checked={isChecked}
                onChange={() => handleBrandToggle(brandObj.name)}
                label={brandObj.name}
                className="py-1"
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Desktop static layout
  const desktopFiltersContent = (
    <div className="space-y-8">
      {renderSearchForm()}
      {renderSortOptions()}
      {renderCategoriesList()}
      {renderBrandsList()}

      {/* Reset Action */}
      {hasActiveFilters && (
        <button
          onClick={clearAllFilters}
          className="w-full bg-[#DCE8F5] hover:bg-[#A5C2DE] text-[#0E2336] text-xs font-black uppercase tracking-widest py-3.5 rounded-full transition-all mt-4 cursor-pointer active:scale-95"
        >
          {t("resetFilters")}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* 1. Mobile Filter Toggle Button */}
      <div className="lg:hidden flex items-center gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full border border-transparent bg-[#B7D1EA] px-5 py-3 text-xs font-black uppercase tracking-widest text-white shadow-sm transition-all hover:bg-[#A5C2DE]/90 active:scale-95"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
          {t("filtersAndSort")}
        </button>
        
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="inline-flex size-11 items-center justify-center rounded-full border border-[#8E8B83]/30 bg-[#DCE8F5] text-[#2E2C27] transition-colors hover:bg-[#DCE8F5] active:scale-95"
            title={t("resetFilters")}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* 2. Desktop Filters Panel Display */}
      <div className="hidden lg:block">
        {desktopFiltersContent}
      </div>

      {/* 3. Mobile filters use the shared focus-trapped layer. */}
      <Sheet
        isOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
        tone="light"
        ariaLabel={t("filtersAndSort")}
        closeLabel={t("applyFilters")}
        className="bg-[#E6E3DC] lg:hidden"
      >
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.16em]">
              <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
              {t("filtersAndSort")}
            </SheetTitle>
          </SheetHeader>

          <SheetBody className="space-y-6 bg-[#E6E3DC] pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
            {renderSearchForm(() => setMobileOpen(false))}
            {renderSortOptions(() => setMobileOpen(false))}
            {renderCategoriesList(() => setMobileOpen(false))}
            {renderBrandsList()}
          </SheetBody>

          <SheetFooter className="gap-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            {hasActiveFilters ? (
              <button
                type="button"
                onClick={() => {
                  clearAllFilters();
                  setMobileOpen(false);
                }}
                className="min-h-11 flex-1 rounded-full border border-[#8E8B83] bg-transparent px-4 py-3 text-xs font-black uppercase tracking-widest text-[#4F7FA8] transition-colors hover:bg-[#A5C2DE]/10 active:scale-95"
              >
                {t("resetAll")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="min-h-11 flex-1 rounded-full bg-[#B7D1EA] px-4 py-3 text-xs font-black uppercase tracking-widest text-white transition-colors hover:bg-[#A5C2DE]/90 active:scale-95"
            >
              {t("applyFilters")}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Loading overlay transition status */}
      {isPending ? (
        <LayerPortal>
          <div
            role="status"
            className="layer-toast fixed right-4 top-4 flex min-h-11 items-center gap-2 rounded-full border border-slate-200 bg-[#F0EEE9] px-4 py-2"
          >
            <GsapSpinner className="h-3 w-3 text-[#7FA8CC]" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{t("updating")}</span>
          </div>
        </LayerPortal>
      ) : null}
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

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, height: prefersReducedMotion ? "auto" : 0 },
        {
          autoAlpha: 1,
          height: "auto",
          duration: prefersReducedMotion ? 0.08 : 0.2,
          ease: "power2.inOut",
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

