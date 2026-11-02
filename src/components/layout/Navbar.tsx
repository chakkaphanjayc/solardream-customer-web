"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";

import { AnimatePresence, motion } from "motion/react";

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
  const isHome = pathname === `/${locale}` || pathname === `/${locale}/`;
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
  const homeSectionLinks = isHome
    ? [
        {
          id: "calculator",
          label: locale === "th" ? "คำนวณค่าไฟ" : "Calculator",
          href: `/${locale}#calculator`,
        },
        {
          id: "showcase",
          label: locale === "th" ? "ผลงานจริง" : "Showcase",
          href: `/${locale}#showcase`,
        },
        {
          id: "pillars",
          label: locale === "th" ? "มาตรฐานวิศวกรรม" : "Engineering",
          href: `/${locale}#pillars-heading`,
        },
        {
          id: "journey",
          label: locale === "th" ? "ขั้นตอนติดตั้ง" : "Process",
          href: `/${locale}#journey`,
        },
        {
          id: "faq",
          label: locale === "th" ? "คำถามที่พบบ่อย" : "FAQs",
          href: `/${locale}#faq`,
        },
      ]
    : [];
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
      <AnimatePresence mode="popLayout">
        {cartItemCount > 0 ? (
          <motion.span
            key={cartItemCount}
            initial={{ scale: 1 }}
            animate={{ scale: [1, 1.3, 1] }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className={styles.navUtilityBadge}
          >
            {cartItemCount}
          </motion.span>
        ) : null}
      </AnimatePresence>
    </button>
  );

  return (
    <>
      <FloatingNavbar
        locale={locale}
        navigationItems={navigationItems}
        forumUrl={forumUrl}
        extraActions={extraActions}
        homeSectionLinks={homeSectionLinks}
        includeHomeSections={isHome}
        languageHref={languageHref}
      />
      {cartOpen ? (
        <CartDrawer isOpen onClose={() => setCartOpen(false)} />
      ) : null}
    </>
  );
}
