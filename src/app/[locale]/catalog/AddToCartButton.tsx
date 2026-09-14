"use client";

import React from "react";
import { useCartStore, type CartItem } from "@/store/useCartStore";
import { toast } from "sonner";
import { CheckCheck, ShoppingCart } from "@/components/ui/icons";
import { useTranslations } from "next-intl";

interface AddToCartButtonProps {
  product: {
    id: string;
    brand: string;
    model: string;
    price: number;
    imageUrl: string;
    description: string | null;
    metadata: unknown;
    isActive: boolean;
  };
  className?: string;
}

export default function AddToCartButton({
  product,
  className,
}: AddToCartButtonProps) {
  const addItem = useCartStore((state) => state.addItem);
  const quantityInCart = useCartStore((state) =>
    state.hasHydrated ? state.getItemQuantity(product.id) : 0,
  );

  const t = useTranslations("CartButton");

  const cartProduct: CartItem["product"] = {
    id: product.id,
    name: `${product.brand} ${product.model}`.trim(),
    brand: product.brand,
    model: product.model,
    price: product.price,
    imageUrl: product.imageUrl || "",
    description: product.description ?? null,
    category: {
      name: "Equipment",
    },
    metadata: product.metadata,
    isActive: product.isActive,
  };

  const handleAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(cartProduct);

    toast.success(t("addSuccess", { name: cartProduct.name }), {
      description: t("toastDesc"),
      duration: 3000,
    });
  };

  return (
    <button
      type="button"
      onClick={handleAdd}
      className={
        className ||
        "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#B7D1EA] px-5 py-2.5 text-xs font-medium text-white shadow-sm transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-[#A5C2DE]/90 hover:shadow-md active:scale-95 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
      }
    >
      {quantityInCart > 0 ? (
        <CheckCheck className="h-4 w-4" aria-hidden="true" />
      ) : (
        <ShoppingCart className="h-4 w-4" aria-hidden="true" />
      )}
      <span>
        {quantityInCart > 0
          ? `${t("buttonText")} (${quantityInCart})`
          : t("buttonText")}
      </span>
    </button>
  );
}
