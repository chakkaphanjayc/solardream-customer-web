"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

import FloatingNavbar from "@/components/home/floating-navbar";
import styles from "@/components/home/solar-home.module.css";
import { ShoppingCart } from "@/components/ui/icons";
import { useCartStore } from "@/store/useCartStore";
import { isLocale } from "@/i18n/locales";
import type { HeaderNavigationItem } from "@/lib/header-navigation";

// The cart flow includes the lead form and its map picker. Keep it out of the
// shared navigation bundle until the cart is actually opened.
const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });

type NavbarProps = {
  forumUrl: string;
  navigationItems: readonly HeaderNavigationItem[];
};

function getAlternateLocalePath(
  pathname: string,
  currentLocale: string,
  nextLocale: string,
) {
  const segments = pathname.split("/");
  if (segments[1] === currentLocale || isLocale(segments[1])) {
    segments[1] = nextLocale;
    return segments.join("/") || `/${nextLocale}`;
  }

  return `/${nextLocale}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
}

export default function Navbar({ forumUrl, navigationItems }: NavbarProps) {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("Navbar");
  const cartItemCount = useCartStore((state) =>
    state.items.reduce((total, item) => total + item.quantity, 0),
  );
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    const secureAttribute =
      window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `solardream_forum_locale=${locale === "en" ? "en" : "th"}; Path=/; Max-Age=600; SameSite=Lax${secureAttribute}`;
  }, [locale]);

  const languageHref = getAlternateLocalePath(
    pathname,
    locale,
    locale === "th" ? "en" : "th",
  );
  const extraActions = (
    <button
      type="button"
      className={styles.navUtilityButton}
      data-header-action
      data-header-hover
      aria-label={t("cart.openAriaLabel")}
      onClick={() => setCartOpen(true)}
    >
      <ShoppingCart aria-hidden="true" />
      {cartItemCount > 0 ? (
        <span className={styles.navUtilityBadge}>{cartItemCount}</span>
      ) : null}
    </button>
  );

  return (
    <>
      <FloatingNavbar
        locale={locale}
        navigationItems={navigationItems}
        forumUrl={forumUrl}
        extraActions={extraActions}
        includeHomeSections={false}
        languageHref={languageHref}
      />
      {cartOpen ? (
        <CartDrawer isOpen onClose={() => setCartOpen(false)} />
      ) : null}
    </>
  );
}
