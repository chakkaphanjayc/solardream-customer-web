import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { getOwnedServiceOrderAction } from "@/app/actions/serviceCommerce";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Contact,
  Hash,
  Sun,
} from "@/components/ui/icons";
import { PageShell } from "@/components/ui/page-shell";
import SmartBackButton from "@/components/ui/SmartBackButton";
import { isLocale } from "@/i18n/locales";
import { createClient } from "@/utils/supabase/server";

type JsonRecord = Record<string, unknown>;


export default async function ServiceOrderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: localeParam, id } = await params;
  const locale = isLocale(localeParam) ? localeParam : "th";
  const t = await getTranslations({ locale, namespace: "SupportOrder" });
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/${locale}/login?next=${encodeURIComponent(`/${locale}/support/orders/${id}`)}`);
  }

  const result = await getOwnedServiceOrderAction(id);
  if (!result.success) notFound();

  const { order } = result;
  const offering = asRecord(order.offeringSnapshot);
  const items = Array.isArray(offering.items) ? offering.items.map(asRecord) : [];
  const system = asRecord(order.systemSnapshot);
  const contact = asRecord(order.contactSnapshot);
  const localizedName =
    localized(offering.name, locale) ||
    order.offering?.name[locale] ||
    order.offering?.name.en ||
    t("serviceFallback");
  const localizedDescription =
    localized(offering.description, locale) ||
    order.offering?.description[locale] ||
    order.offering?.description.en;
  const customQuote =
    order.checkoutDisposition === "CUSTOM_QUOTE" ||
    order.paymentRequirement === "NOT_REQUIRED";
  const formatMoney = (value: unknown) => {
    if (value === null || value === undefined || value === "") {
      return t("pricePending");
    }
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return t("pricePending");
    if (numericValue === 0) return t("included");
    return new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: order.currency,
      maximumFractionDigits: 0,
    }).format(numericValue);
  };
  const money = customQuote ? "" : formatMoney(order.priceSnapshot);
  const appointment = new Intl.DateTimeFormat(locale === "th" ? "th-TH" : "en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Asia/Bangkok",
  }).format(order.appointmentDate);
  const systemDescription =
    order.systemSource === "SOLARDREAM"
      ? [stringValue(system.productName), stringValue(system.serialNumber)]
          .filter(Boolean)
          .join(" · ")
      : [
          system.systemSizeKw ? `${String(system.systemSizeKw)} kW` : "",
          stringValue(system.inverterBrandCode),
          stringValue(system.roofTypeCode),
        ]
          .filter(Boolean)
          .join(" · ");
  const contactDescription = [
    stringValue(contact.fullName) || stringValue(contact.name),
    stringValue(contact.phone),
    stringValue(contact.email),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <PageShell className="bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <SmartBackButton
          fallbackHref={`/${locale}/support`}
          label={t("back")}
          className="layer-sticky sticky top-20 min-h-11 bg-white shadow-none backdrop-blur-none lg:static"
        />

        <header className="mt-7 border-b border-border pb-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="success">
              <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              {t("confirmed")}
            </Badge>
            <Badge>{order.status}</Badge>
          </div>
          <h1 className="mt-5 text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
            {localizedName}
          </h1>
          {localizedDescription ? (
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
              {localizedDescription}
            </p>
          ) : null}
        </header>

        <Card asChild className="mt-6 overflow-hidden p-0">
          <section aria-labelledby="order-details-heading">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <h2 id="order-details-heading" className="text-lg font-bold text-foreground">
                {t("detailsLabel")}
              </h2>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2">
              <Detail icon={CalendarDays} label={t("appointment")} value={appointment} />
              {!customQuote ? (
                <Detail icon={CircleDollarSign} label={t("price")} value={money} />
              ) : null}
              <Detail icon={Sun} label={t("system")} value={systemDescription || t("systemFallback")} />
              <Detail icon={Contact} label={t("contact")} value={contactDescription} />
            </dl>
          </section>
        </Card>

        {items.length > 0 ? (
          <Card asChild className="mt-4 p-5 sm:p-6">
            <section aria-labelledby="order-services-heading">
              <h2 id="order-services-heading" className="text-lg font-bold text-foreground">
                {locale === "th" ? "บริการในคำสั่งซื้อ" : "Services in this order"}
              </h2>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {items.map((item, index) => (
                  <li
                    key={stringValue(item.slug) || index}
                    className="flex min-h-12 items-center justify-between gap-4 py-3 text-sm font-semibold"
                  >
                    <span>{localized(item.name, locale) || stringValue(item.slug)}</span>
                    {!customQuote ? (
                      <span className="shrink-0 text-foreground">
                        {formatMoney(
                          typeof item.totalSatang === "number"
                            ? item.totalSatang / 100
                            : null,
                        )}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          </Card>
        ) : null}

        <Card asChild tone="subtle" className="mt-4 p-5 sm:p-6">
          <section aria-labelledby="order-reference-heading">
            <div className="flex items-center gap-2">
              <Hash className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h2 id="order-reference-heading" className="text-sm font-bold text-foreground">
                {t("reference")}
              </h2>
            </div>
            <p className="mt-3 break-all font-mono text-sm font-semibold text-foreground">
              {order.serviceRequest?.id || order.id}
            </p>
            {order.customerNotes ? (
              <div className="mt-6 border-t border-border pt-5">
                <h3 className="text-sm font-bold text-foreground">{t("notes")}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">
                  {order.customerNotes}
                </p>
              </div>
            ) : null}
          </section>
        </Card>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button asChild>
            <Link href={`/${locale}/support/maintenance`}>{t("bookAnother")}</Link>
          </Button>
          <Button asChild variant="outline" className="bg-white">
            <Link href={`/${locale}/support`}>{t("supportHub")}</Link>
          </Button>
        </div>
      </div>
    </PageShell>
  );
}

function Detail({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-border p-5 last:border-b-0 sm:min-h-40 sm:border-r sm:p-6 sm:[&:nth-child(even)]:border-r-0 sm:[&:nth-last-child(-n+2)]:border-b-0">
      <Icon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      <dt className="mt-4 text-sm font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-2 text-base font-bold leading-6 text-foreground">{value}</dd>
    </div>
  );
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function localized(value: unknown, locale: string) {
  const record = asRecord(value);
  return stringValue(record[locale]) || stringValue(record.en) || stringValue(record.th);
}
