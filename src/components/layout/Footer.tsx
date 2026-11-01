"use client";

import { useState } from "react";
import Link from "next/link";
import NextImage from "next/image";
import { useLocale, useTranslations } from "next-intl";
import {
  FaCheck,
  FaFacebook,
  FaInstagram,
  FaLine,
  FaLinkedin,
  FaPaperPlane,
  FaYoutube,
} from "react-icons/fa6";
import {
  ArrowUpRight,
  Globe,
  Mail,
  Phone,
} from "@/components/ui/icons";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { WebsiteSettings } from "@/lib/websiteSettingsTypes";

const SOCIAL_ICONS: Record<
  string,
  React.ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
> = {
  facebook: FaFacebook,
  instagram: FaInstagram,
  line: FaLine,
  linkedin: FaLinkedin,
  youtube: FaYoutube,
  email: Mail,
  phone: Phone,
};

type FooterProps = {
  settings: WebsiteSettings;
  compact?: boolean;
  className?: string;
};

function localizedHref(locale: string, href: string) {
  if (/^(https?:|mailto:|tel:|#)/i.test(href)) return href;
  const clean = href.startsWith("/") ? href : `/${href}`;
  if (clean === "/") return `/${locale}`;
  if (clean.startsWith(`/${locale}/`)) return clean;
  return `/${locale}${clean}`;
}

function formattedSocialHref(platform: string, url: string) {
  const value = url.trim();
  const key = platform.toLowerCase();
  if (key === "email" && !value.startsWith("mailto:")) return `mailto:${value}`;
  if (key === "phone" && !value.startsWith("tel:")) return `tel:${value}`;
  return value;
}

function NewsletterSignup() {
  const t = useTranslations("Footer");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setSubscribed(true);
    }, 400);
  };

  return (
    <div className="mb-12 rounded-3xl border border-[rgba(60,86,122,0.14)] bg-[var(--sd-card)] p-6 shadow-xs sm:p-8 lg:p-10">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-1 rounded-full bg-[var(--primary)]" />
            <h2 className="text-lg font-extrabold tracking-tight text-[var(--sd-ink)] sm:text-xl">
              {t("newsletterTitle")}
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--sd-text-secondary)]">
            {t("newsletterDescription")}
          </p>
        </div>

        {subscribed ? (
          <div className="inline-flex items-center gap-2.5 rounded-full border border-[var(--primary)]/60 bg-[var(--primary)]/20 px-5 py-3 text-sm font-bold text-[var(--sd-ink)]">
            <FaCheck className="size-4 text-[var(--primary-foreground)]" aria-hidden="true" />
            <span>{t("newsletterSubscribed")}</span>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="flex w-full max-w-md flex-col gap-2.5 sm:flex-row sm:items-center"
          >
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("newsletterPlaceholder")}
              aria-label={t("newsletterPlaceholder")}
              className="h-12 flex-1 rounded-full border border-[rgba(60,86,122,0.2)] bg-[var(--background)] px-5 text-sm font-medium text-[var(--sd-ink)] placeholder:text-[var(--sd-text-secondary)]/60 transition focus:border-[var(--primary-foreground)] focus:bg-[var(--sd-card)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <button
              type="submit"
              disabled={loading}
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--primary)] px-6 text-sm font-bold text-[var(--sd-ink)] shadow-xs transition-all hover:bg-[var(--primary-hover)] active:scale-95 disabled:opacity-60"
            >
              <span>{t("newsletterSubmit")}</span>
              <FaPaperPlane className="size-3.5" aria-hidden="true" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function Footer({
  settings,
  compact = false,
  className,
}: FooterProps) {
  const locale = useLocale();
  const t = useTranslations("Footer");
  const activeSocials = settings.socialLinks.filter((item) => item.isActive);
  const currentYear = new Date().getFullYear();

  if (compact) {
    return (
      <footer
        data-solar-surface="atelier"
        data-bagui="footer"
        className={cn(
          "solar-site-footer relative overflow-hidden border-t border-[rgba(60,86,122,0.14)] bg-[var(--accent)] text-[var(--sd-ink)]",
          className,
        )}
      >
        <div className="relative mx-auto max-w-7xl px-5 py-4 sm:px-8 sm:py-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/${locale}`}
                className="inline-flex items-center gap-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
              >
                <NextImage
                  src="/asset/sd-logo.png"
                  alt="SolarDream logo"
                  width={1254}
                  height={1254}
                  sizes="28px"
                  className="h-7 w-7 object-contain"
                />
                <span className="text-sm font-bold tracking-tight text-[var(--sd-ink)]">
                  {settings.company.companyName}
                </span>
              </Link>
              <span className="hidden text-xs font-medium text-[var(--sd-text-secondary)] md:inline">
                • {t("tagline")}
              </span>
            </div>

            {activeSocials.length ? (
              <div className="flex items-center gap-2">
                {activeSocials.map((item) => {
                  const Icon =
                    SOCIAL_ICONS[item.platform.toLowerCase()] || Globe;
                  const href = formattedSocialHref(item.platform, item.url);
                  const isExternal = /^(https?:)?\/\//i.test(href);
                  const isLine = item.platform.toLowerCase() === "line";
                  return (
                    <a
                      key={`${item.platform}:${item.url}`}
                      href={href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      aria-label={item.label || item.platform}
                      className={cn(
                        "solar-footer-social inline-flex size-11 items-center justify-center rounded-full border border-[rgba(60,86,122,0.14)] bg-[var(--sd-card)] text-[var(--sd-ink)] transition-all duration-200 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                        isLine
                          ? "hover:bg-[#06C755] hover:border-[#06C755] hover:text-white"
                          : "hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-[var(--sd-ink)]",
                      )}
                    >
                      {item.imageUrl ? (
                        <NextImage
                          src={item.imageUrl}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      )}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-col gap-1.5 border-t border-[rgba(60,86,122,0.12)] pt-3 text-xs font-medium text-[var(--sd-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {currentYear} {settings.company.companyName}. {t("allRightsReserved")}
            </p>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link
                href={`/${locale}/privacy`}
                className="hover:text-[var(--primary-foreground)] transition-colors"
              >
                {t("privacy")}
              </Link>
              <Link
                href={`/${locale}/terms`}
                className="hover:text-[var(--primary-foreground)] transition-colors"
              >
                {t("terms")}
              </Link>
              <Link
                href={`/${locale}/support`}
                className="hover:text-[var(--primary-foreground)] transition-colors"
              >
                {t("support")}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    );
  }

  return (
    <footer
      data-solar-surface="atelier"
      data-bagui="footer"
      className="solar-site-footer relative overflow-hidden border-t border-[rgba(60,86,122,0.14)] bg-[var(--accent)] text-[var(--sd-ink)]"
    >
      <div
        className={cn(
          "relative mx-auto max-w-7xl px-5 sm:px-8",
          "py-12 lg:py-16",
        )}
      >
        <NewsletterSignup />

        <div className="grid grid-cols-1 gap-8 md:grid-cols-3 lg:grid-cols-12 lg:gap-10">
          <section className="lg:col-span-5">
            <Link
              href={`/${locale}`}
              className="inline-flex min-h-11 items-center gap-3 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
            >
              <NextImage
                src="/asset/sd-logo.png"
                alt="SolarDream logo"
                width={1254}
                height={1254}
                sizes="48px"
                className="h-12 w-12 object-contain"
              />
              <div>
                <span className="text-base font-bold tracking-tight text-[var(--sd-ink)]">
                  {settings.company.companyName}
                </span>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--primary-foreground)]">
                  {t("system")}
                </p>
              </div>
            </Link>

            <p className="mt-4 max-w-xl text-sm font-normal leading-7 text-[var(--sd-text-secondary)]">
              {settings.company.companyDescription}
            </p>

            <dl className="mt-5 grid gap-2 text-xs leading-6 text-[var(--sd-text-secondary)]">
              {[
                [t("taxId"), settings.company.taxId],
                [t("address"), settings.company.address],
                [t("tel"), settings.company.phone],
                [t("email"), settings.company.email],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="grid gap-1 sm:grid-cols-[5.5rem_minmax(0,1fr)]"
                  >
                    <dt className="text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--primary-foreground)]">
                      {label}
                    </dt>
                    <dd className="min-w-0 font-medium text-[var(--sd-ink)]">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>

            {activeSocials.length ? (
              <div className="mt-6 flex flex-wrap gap-2.5">
                {activeSocials.map((item) => {
                  const Icon =
                    SOCIAL_ICONS[item.platform.toLowerCase()] || Globe;
                  const href = formattedSocialHref(item.platform, item.url);
                  const isExternal = /^(https?:)?\/\//i.test(href);
                  const isLine = item.platform.toLowerCase() === "line";
                  return (
                    <a
                      key={`${item.platform}:${item.url}`}
                      href={href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      aria-label={item.label || item.platform}
                      className={cn(
                        "solar-footer-social inline-flex size-11 items-center justify-center rounded-full border border-[rgba(60,86,122,0.14)] bg-[var(--sd-card)] text-[var(--sd-ink)] shadow-xs transition-all duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
                        isLine
                          ? "hover:bg-[#06C755] hover:border-[#06C755] hover:text-white"
                          : "hover:bg-[var(--primary)] hover:border-[var(--primary)] hover:text-[var(--sd-ink)]",
                      )}
                    >
                      {item.imageUrl ? (
                        <NextImage
                          src={item.imageUrl}
                          alt=""
                          width={22}
                          height={22}
                          className="h-5 w-5 object-contain"
                        />
                      ) : (
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      )}
                    </a>
                  );
                })}
              </div>
            ) : null}
          </section>

          <div className="grid gap-8 md:col-span-2 md:grid-cols-2 lg:col-span-7 lg:grid-cols-3">
            {settings.footerNavigation.map((group) => (
              <nav key={group.title} aria-label={group.title}>
                <h2 className="flex items-center gap-2 text-sm font-bold text-[var(--sd-ink)]">
                  <span className="inline-block h-2.5 w-1 rounded-full bg-[var(--primary)]" />
                  {group.title}
                </h2>
                <ul className="mt-4 space-y-1">
                  {group.links.map((link) => {
                    const href = localizedHref(locale, link.href);
                    const external = /^(https?:)?\/\//i.test(href);
                    return (
                      <li key={`${group.title}:${link.label}:${link.href}`}>
                        <Link
                          href={href}
                          target={external ? "_blank" : undefined}
                          rel={external ? "noopener noreferrer" : undefined}
                          className={cn(
                            buttonVariants({ variant: "quiet", size: "sm" }),
                            "group min-h-11 items-center gap-2 text-sm font-medium text-[var(--sd-text-secondary)] hover:text-[var(--primary-foreground)] hover:bg-[var(--primary)]/15 rounded-full",
                          )}
                        >
                          <span>{link.label}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 transition-all duration-300 ease-[cubic-bezier(0.2,0,0,1)] group-hover:translate-x-0.5 group-hover:opacity-100" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[rgba(60,86,122,0.14)] pt-6 pb-24 text-xs font-medium text-[var(--sd-text-secondary)] sm:flex-row sm:items-center sm:justify-between lg:pb-6">
          <p>
            © {currentYear} {settings.company.companyName}. {t("allRightsReserved")}
          </p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link
              href={`/${locale}/privacy`}
              className="inline-flex min-h-11 items-center hover:text-[var(--primary-foreground)] transition-colors"
            >
              {t("privacy")}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="inline-flex min-h-11 items-center hover:text-[var(--primary-foreground)] transition-colors"
            >
              {t("terms")}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
