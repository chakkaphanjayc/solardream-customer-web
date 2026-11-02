"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiChevronDown, FiChevronRight } from "react-icons/fi";
import {
  resolveHeaderNavigationUrl,
  type HeaderNavigationItem,
} from "@/lib/header-navigation";
import styles from "./solar-home.module.css";

type DesktopHeaderNavigationProps = Readonly<{
  items: readonly HeaderNavigationItem[];
  homeSectionLinks?: readonly (Readonly<{ id: string; label: string; href: string }>)[];
  locale: string;
  forumUrl: string;
  isThai: boolean;
  openMenuId: string | null;
  onOpenMenu: (id: string) => void;
  onToggleMenu: (id: string) => void;
  onCloseMenu: () => void;
  onScheduleMenuClose: () => void;
}>;

function navigationDomId(id: string) {
  return `solar-navigation-${id.replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
}

export default function DesktopHeaderNavigation({
  items,
  homeSectionLinks = [],
  locale,
  forumUrl,
  isThai,
  openMenuId,
  onOpenMenu,
  onToggleMenu,
  onCloseMenu,
  onScheduleMenuClose,
}: DesktopHeaderNavigationProps) {
  const pathname = usePathname();
  const hasProductItem = items.some((item) =>
    /product|ผลิตภัณฑ์|สินค้า/i.test(`${item.id} ${item.label} ${item.url}`),
  );
  const visibleHomeSectionLinks = homeSectionLinks.filter(
    (item) => item.id !== "product" || !hasProductItem,
  );

  const isLinkActive = (href: string) => {
    if (!pathname) return false;
    if (href.includes("#")) {
      return false;
    }
    const cleanHref = href.split("#")[0].split("?")[0];
    const cleanPath = pathname.split("#")[0].split("?")[0];
    if (cleanHref === `/${locale}` || cleanHref === `/${locale}/`) {
      return cleanPath === `/${locale}` || cleanPath === `/${locale}/`;
    }
    return cleanPath === cleanHref || cleanPath.startsWith(`${cleanHref}/`);
  };

  const handleTriggerKeyDown = (
    e: React.KeyboardEvent,
    itemId: string,
    panelId: string,
    isOpen: boolean,
  ) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onToggleMenu(itemId);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        onOpenMenu(itemId);
      }
      setTimeout(() => {
        const panel = document.getElementById(panelId);
        const firstItem = panel?.querySelector<HTMLElement>("[data-nav-subitem]");
        firstItem?.focus();
      }, 50);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCloseMenu();
    }
  };

  const handleSubmenuKeyDown = (
    e: React.KeyboardEvent,
    triggerId: string,
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCloseMenu();
      const trigger = document.getElementById(triggerId);
      trigger?.focus();
      return;
    }

    const current = document.activeElement;
    const subitems = Array.from(
      e.currentTarget.querySelectorAll<HTMLElement>("[data-nav-subitem]"),
    );
    if (!subitems.length) return;

    const currentIndex = subitems.indexOf(current as HTMLElement);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % subitems.length : 0;
      subitems[nextIndex]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIndex =
        currentIndex >= 0
          ? (currentIndex - 1 + subitems.length) % subitems.length
          : subitems.length - 1;
      subitems[prevIndex]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      subitems[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      subitems[subitems.length - 1]?.focus();
    }
  };

  return (
    <nav
      className={styles.navLinks}
      aria-label={isThai ? "เมนูหลัก" : "Primary navigation"}
      onPointerLeave={(event) => {
        const relatedTarget = event.relatedTarget;
        if (
          relatedTarget instanceof Node &&
          event.currentTarget.contains(relatedTarget)
        ) {
          return;
        }
        onScheduleMenuClose();
      }}
      onBlur={(event) => {
        const relatedTarget = event.relatedTarget;
        if (
          !(relatedTarget instanceof Node) ||
          !event.currentTarget.contains(relatedTarget)
        ) {
          onCloseMenu();
        }
      }}
    >
      {visibleHomeSectionLinks.map((item) => {
        const active = isLinkActive(item.href);
        return (
          <Link
            key={item.id}
            href={item.href}
            className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
            data-header-link
            data-header-hover
            aria-current={active ? "page" : undefined}
          >
            {item.label}
          </Link>
        );
      })}

      {items.map((item) => {
        const children = item.children ?? [];
        const itemHref = resolveHeaderNavigationUrl(
          item.url,
          locale,
          item.id === "forum" ? forumUrl : undefined,
        );

        if (children.length === 0) {
          const active = isLinkActive(itemHref);
          return (
            <Link
              key={item.id}
              href={itemHref}
              className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
              data-header-link
              data-header-hover
              aria-current={active ? "page" : undefined}
            >
              {item.label}
            </Link>
          );
        }

        const isOpen = openMenuId === item.id;
        const panelId = navigationDomId(item.id);
        const triggerId = `${panelId}-trigger`;

        const hasActiveChild = children.some((child) =>
          isLinkActive(
            resolveHeaderNavigationUrl(
              child.url,
              locale,
              child.id === "forum" ? forumUrl : undefined,
            ),
          ),
        );
        const isParentActive = isLinkActive(itemHref) || hasActiveChild;

        return (
          <div
            key={item.id}
            className={`${styles.navMenu} ${isOpen ? styles.navMenuOpen : ""}`}
            onPointerEnter={() => onOpenMenu(item.id)}
            onFocus={() => onOpenMenu(item.id)}
            onPointerLeave={(event) => {
              const relatedTarget = event.relatedTarget;
              if (
                relatedTarget instanceof Node &&
                event.currentTarget.contains(relatedTarget)
              ) {
                return;
              }
              onScheduleMenuClose();
            }}
          >
            {item.url !== "#" ? (
              <div
                className={`${styles.navMenuTriggerRow} ${isParentActive ? styles.navMenuTriggerRowActive : ""}`}
              >
                <Link
                  href={itemHref}
                  className={`${styles.navMenuLink} ${isParentActive ? styles.navLinkActive : ""}`}
                  data-header-link
                  data-header-hover
                  aria-current={isParentActive ? "page" : undefined}
                >
                  {item.label}
                </Link>
                <button
                  id={triggerId}
                  type="button"
                  className={styles.navMenuToggle}
                  aria-expanded={isOpen}
                  aria-haspopup="menu"
                  aria-controls={panelId}
                  aria-label={
                    isThai
                      ? `เปิดเมนู ${item.label}`
                      : `Open ${item.label} menu`
                  }
                  data-header-action
                  data-header-hover
                  onFocus={() => onOpenMenu(item.id)}
                  onClick={() => onToggleMenu(item.id)}
                  onKeyDown={(e) => handleTriggerKeyDown(e, item.id, panelId, isOpen)}
                >
                  <FiChevronDown
                    className={styles.navMenuChevron}
                    aria-hidden="true"
                  />
                </button>
              </div>
            ) : (
              <button
                id={triggerId}
                type="button"
                className={`${styles.navMenuTrigger} ${isParentActive ? styles.navLinkActive : ""}`}
                aria-expanded={isOpen}
                aria-haspopup="menu"
                aria-controls={panelId}
                data-header-link
                data-header-hover
                onFocus={() => onOpenMenu(item.id)}
                onClick={() => onToggleMenu(item.id)}
                onKeyDown={(e) => handleTriggerKeyDown(e, item.id, panelId, isOpen)}
              >
                <span>{item.label}</span>
                <FiChevronDown
                  className={styles.navMenuChevron}
                  aria-hidden="true"
                />
              </button>
            )}

            <div
              id={panelId}
              role="menu"
              aria-orientation="vertical"
              aria-labelledby={triggerId}
              className={styles.navSubmenu}
              data-nav-panel
              data-open={isOpen}
              aria-hidden={!isOpen}
              onPointerEnter={() => onOpenMenu(item.id)}
              onPointerMove={() => onOpenMenu(item.id)}
              onPointerLeave={(event) => {
                const relatedTarget = event.relatedTarget;
                if (
                  relatedTarget instanceof Node &&
                  event.currentTarget.contains(relatedTarget)
                ) {
                  return;
                }
                onScheduleMenuClose();
              }}
              onKeyDown={(e) => handleSubmenuKeyDown(e, triggerId)}
            >
              <span className={styles.navSubmenuEyebrow} role="presentation">
                {isThai ? "เลือกเส้นทาง" : "Choose a path"}
              </span>
              {children.map((child) => {
                const childHref = resolveHeaderNavigationUrl(
                  child.url,
                  locale,
                  child.id === "forum" ? forumUrl : undefined,
                );
                const active = isLinkActive(childHref);
                return (
                  <Link
                    key={child.id}
                    href={childHref}
                    role="menuitem"
                    className={`${styles.navSubmenuItem} ${active ? styles.navSubmenuItemActive : ""}`}
                    data-nav-subitem
                    data-header-hover
                    onClick={onCloseMenu}
                    aria-current={active ? "page" : undefined}
                  >
                    <span>{child.label}</span>
                    <FiChevronRight aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
