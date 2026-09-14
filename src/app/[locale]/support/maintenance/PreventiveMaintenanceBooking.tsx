"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";

import { createServiceOrderAction } from "@/app/actions/serviceCommerce";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CalendarCheck,
  Check,
  ShieldCheck,
  Wrench,
} from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageShell } from "@/components/ui/page-shell";
import SmartBackButton from "@/components/ui/SmartBackButton";
import { Textarea } from "@/components/ui/textarea";
import type { CreateServiceOrderInput } from "@/lib/serviceCommerceContracts";
import { cn } from "@/lib/utils";
import type {
  PreventiveMaintenanceBookingProps,
  SupportLocalizedText,
  SupportSystemSource,
} from "@/types/support";

export type { PublicOffering } from "@/types/support";

export default function PreventiveMaintenanceBooking({
  locale,
  assets,
  offerings,
  isAuthenticated,
  initialError,
}: PreventiveMaintenanceBookingProps) {
  const t = useTranslations("SupportMaintenance");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [offeringSlug, setOfferingSlug] = useState(offerings[0]?.slug || "");
  const [systemSource, setSystemSource] = useState<SupportSystemSource>(
    assets.length ? "SOLARDREAM" : "EXTERNAL",
  );
  const [assetId, setAssetId] = useState(assets[0]?.id || "");
  const [systemSizeKw, setSystemSizeKw] = useState("");
  const [inverterBrand, setInverterBrand] = useState("");
  const [roofType, setRoofType] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [contact, setContact] = useState({ name: "", phone: "", email: "" });
  const [notes, setNotes] = useState("");
  const [error, setError] = useState(initialError);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const selectedOffering = offerings.find((offering) => offering.slug === offeringSlug);
  const displayText = (value: SupportLocalizedText) => (locale === "th" ? value.th : value.en);
  const formatPrice = (value: number) =>
    new Intl.NumberFormat(locale === "th" ? "th-TH" : "en-US", {
      style: "currency",
      currency: "THB",
      maximumFractionDigits: 0,
    }).format(value);

  const submitBooking = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isAuthenticated) {
      router.push(`/${locale}/login?next=${encodeURIComponent(`/${locale}/support/maintenance`)}`);
      return;
    }
    if (!selectedOffering || !appointmentDate || !contact.name || !contact.phone || !contact.email) {
      setError(t("errors.required"));
      return;
    }
    if (systemSource === "SOLARDREAM" && !assetId) {
      setError(t("errors.asset"));
      return;
    }
    if (systemSource === "EXTERNAL" && (!systemSizeKw || !inverterBrand || !roofType)) {
      setError(t("errors.external"));
      return;
    }

    setError("");
    startTransition(async () => {
      const common = {
        idempotencyKey,
        offeringSlug: selectedOffering.slug,
        appointmentDate: `${appointmentDate}T12:00:00`,
        contact,
        customerNotes: notes || undefined,
      };
      const input: CreateServiceOrderInput =
        systemSource === "SOLARDREAM"
          ? { ...common, systemSource, assetId }
          : {
              ...common,
              systemSource,
              systemDetails: {
                systemSizeKw: Number(systemSizeKw),
                inverterBrand,
                roofType,
              },
            };
      const result = await createServiceOrderAction(input);
      if (!result.success || !("redirectPath" in result)) {
        setError(result.error || t("errors.create"));
        return;
      }
      router.push(`/${locale}${result.redirectPath}`);
    });
  };

  return (
    <PageShell className="bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <SmartBackButton
          fallbackHref={`/${locale}/support`}
          label={t("back")}
          className="layer-sticky sticky top-20 min-h-11 bg-white shadow-none backdrop-blur-none lg:static"
        />

        <header className="mt-8 max-w-3xl">
          <p className="text-sm font-semibold text-muted-foreground">{t("eyebrow")}</p>
          <h1 className="mt-3 text-balance text-3xl font-extrabold leading-tight tracking-[-0.03em] text-foreground sm:text-5xl">
            {t("title")}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-muted-foreground">
            {t("description")}
          </p>
        </header>

        {offerings.length > 0 ? (
          <section className="mt-10" aria-labelledby="service-catalog-title">
            <h2 id="service-catalog-title" className="text-2xl font-bold tracking-tight text-foreground">
              {t("catalogTitle")}
            </h2>
            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {offerings.slice(0, 4).map((offering) => {
                const selected = offering.slug === offeringSlug;
                const discount = Math.max(
                  0,
                  offering.externalPrice - offering.solarDreamCustomerPrice,
                );

                return (
                  <Card
                    asChild
                    interactive
                    key={offering.id}
                    className={cn(
                      "p-0",
                      selected ? "border-slate-950 bg-white ring-2 ring-primary ring-offset-2 ring-offset-background" : "bg-white",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOfferingSlug(offering.slug)}
                      aria-pressed={selected}
                      className="min-h-64 w-full p-5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/25 text-foreground">
                          <Wrench className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                          {offering.durationMinutes} min
                        </span>
                      </span>
                      <span className="mt-5 block text-lg font-bold text-foreground">
                        {displayText(offering.name)}
                      </span>
                      <span className="mt-2 block text-sm leading-6 text-muted-foreground">
                        {displayText(offering.description)}
                      </span>
                      <span className="mt-5 block border-t border-border pt-4 text-sm">
                        <span className="flex items-center justify-between gap-3 text-muted-foreground">
                          <span>{t("externalPrice")}</span>
                          <span className="font-semibold text-foreground">{formatPrice(offering.externalPrice)}</span>
                        </span>
                        <span className="mt-2 flex items-center justify-between gap-3 font-semibold text-foreground">
                          <span>{t("customerPrice")}</span>
                          <span>{formatPrice(offering.solarDreamCustomerPrice)}</span>
                        </span>
                        {discount > 0 ? (
                          <span className="mt-2 block text-xs font-semibold text-emerald-800">
                            {t("save", { amount: formatPrice(discount) })}
                          </span>
                        ) : null}
                      </span>
                    </button>
                  </Card>
                );
              })}
            </div>
          </section>
        ) : (
          <Card className="mt-8 border-rose-200 bg-rose-50 p-5 text-rose-800" role="alert">
            {initialError || t("errors.catalog")}
          </Card>
        )}

        {selectedOffering ? (
          <Card asChild className="mt-8 p-5 sm:p-7">
            <form onSubmit={submitBooking} aria-labelledby="booking-title" noValidate>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/25 text-foreground">
                  <CalendarCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <h2 id="booking-title" className="text-2xl font-bold tracking-tight text-foreground">
                  {t("bookingTitle")}
                </h2>
              </div>

              <div className="mt-7 grid grid-cols-1 gap-8 lg:grid-cols-2">
                <div className="space-y-5">
                  <fieldset>
                    <legend className="text-sm font-semibold text-foreground">{t("systemSource")}</legend>
                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <SourceButton
                        active={systemSource === "SOLARDREAM"}
                        disabled={!assets.length}
                        onClick={() => setSystemSource("SOLARDREAM")}
                      >
                        {t("owned")}
                      </SourceButton>
                      <SourceButton
                        active={systemSource === "EXTERNAL"}
                        onClick={() => setSystemSource("EXTERNAL")}
                      >
                        {t("external")}
                      </SourceButton>
                    </div>
                  </fieldset>

                  {systemSource === "SOLARDREAM" ? (
                    <Field id="support-asset" label={t("asset")}>
                      <select
                        id="support-asset"
                        value={assetId}
                        onChange={(event) => setAssetId(event.target.value)}
                        className={inputClass}
                      >
                        <option value="">{t("selectAsset")}</option>
                        {assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.productName} · {asset.serialNumber}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <Field id="support-system-size" label={t("size")}>
                        <Input
                          id="support-system-size"
                          type="number"
                          min="0.1"
                          step="0.1"
                          inputMode="decimal"
                          value={systemSizeKw}
                          onChange={(event) => setSystemSizeKw(event.target.value)}
                          className="min-h-12 bg-white"
                        />
                      </Field>
                      <Field id="support-inverter" label={t("inverter")}>
                        <Input
                          id="support-inverter"
                          value={inverterBrand}
                          onChange={(event) => setInverterBrand(event.target.value)}
                          className="min-h-12 bg-white"
                        />
                      </Field>
                      <Field id="support-roof" label={t("roof")}>
                        <Input
                          id="support-roof"
                          value={roofType}
                          onChange={(event) => setRoofType(event.target.value)}
                          className="min-h-12 bg-white"
                        />
                      </Field>
                    </div>
                  )}

                  <Field id="support-appointment-date" label={t("date")}>
                    <Input
                      id="support-appointment-date"
                      type="date"
                      value={appointmentDate}
                      onChange={(event) => setAppointmentDate(event.target.value)}
                      className="min-h-12 bg-white"
                    />
                  </Field>
                </div>

                <div className="space-y-5">
                  <Field id="support-contact-name" label={t("contactName")}>
                    <Input
                      id="support-contact-name"
                      autoComplete="name"
                      value={contact.name}
                      onChange={(event) => setContact((current) => ({ ...current, name: event.target.value }))}
                      className="min-h-12 bg-white"
                    />
                  </Field>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field id="support-contact-phone" label={t("phone")}>
                      <Input
                        id="support-contact-phone"
                        type="tel"
                        autoComplete="tel"
                        value={contact.phone}
                        onChange={(event) => setContact((current) => ({ ...current, phone: event.target.value }))}
                        className="min-h-12 bg-white"
                      />
                    </Field>
                    <Field id="support-contact-email" label={t("email")}>
                      <Input
                        id="support-contact-email"
                        type="email"
                        autoComplete="email"
                        value={contact.email}
                        onChange={(event) => setContact((current) => ({ ...current, email: event.target.value }))}
                        className="min-h-12 bg-white"
                      />
                    </Field>
                  </div>
                  <Field id="support-notes" label={t("notes")}>
                    <Textarea
                      id="support-notes"
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="bg-white"
                    />
                  </Field>
                </div>
              </div>

              {error ? (
                <p role="alert" className="mt-6 rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-800">
                  {error}
                </p>
              ) : null}

              <div className="mt-6 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-start gap-2 text-sm leading-6 text-muted-foreground">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{systemSource === "SOLARDREAM" ? t("discountApplied") : t("externalMessage")}</span>
                </p>
                <Button type="submit" size="lg" disabled={isPending} className="sm:min-w-48">
                  {!isPending ? <Check className="h-4 w-4" aria-hidden="true" /> : null}
                  {isPending ? t("creating") : isAuthenticated ? t("book") : t("signIn")}
                </Button>
              </div>
            </form>
          </Card>
        ) : null}
      </div>
    </PageShell>
  );
}

const inputClass =
  "min-h-12 w-full rounded-lg border border-input bg-white px-3.5 py-2.5 text-base text-foreground outline-none transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/35";

function Field({ id, label, children }: { id: string; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}

function SourceButton({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant={active ? "primary" : "outline"}
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={cn("min-h-12 rounded-lg", !active && "bg-white")}
    >
      {children}
    </Button>
  );
}
