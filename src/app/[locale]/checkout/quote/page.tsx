"use client";

import React, { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Phone, 
  User, 
  FileText, 
  ClipboardCheck, 
  Sparkles,
  MapPin,
  Compass,
  FileSignature
} from "@/components/ui/icons";
import dynamic from "next/dynamic";
import { submitLeadData } from "@/app/actions/lead";
import { getQuotationProfileDefaults } from "@/app/actions/quotationProfile";
import { useCartStore } from "@/store/useCartStore";
import { formatPrice } from "@/lib/utils";
import { gsap } from "gsap";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ThaiPostalAddressFields from "@/components/ui/ThaiPostalAddressFields";
import DigitalSignaturePad from "@/components/ui/DigitalSignaturePad";
import ProgressiveImage from "@/components/ui/progressive-image";
import MagneticButton from "@/components/ui/MagneticButton";
import SmartBackButton from "@/components/ui/SmartBackButton";
import DynamicSoliaChat from "@/components/DynamicSoliaChat";
import { GsapPulse } from "@/components/ui/GsapMotion";
import { trackProductEvent } from "@/lib/productAnalytics";

const InstallationMapPicker = dynamic(() => import("@/components/wizard/InstallationMapPicker"), {
  ssr: false,
});

export default function RequestQuotationPage() {
  const t = useTranslations("CartLeadCaptureModal");
  const tCart = useTranslations("CartDrawer");
  const locale = useLocale();
  const router = useRouter();
  
  const { items, getTotalPrice, clearCart, hasHydrated } = useCartStore();

  // Contact Info states
  const [name, setName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Location states
  const [addressStreet, setAddressStreet] = useState("");
  const [addressProvince, setAddressProvince] = useState("");
  const [addressDistrict, setAddressDistrict] = useState("");
  const [addressSubdistrict, setAddressSubdistrict] = useState("");
  const [addressZip, setAddressZip] = useState("");

  // Consent & Signature
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [signatureBase64, setSignatureBase64] = useState("");
  const [requiresInstallation, setRequiresInstallation] = useState(false);

  // Map coordinate states
  const [installationLatitude, setInstallationLatitude] = useState<number | null>(null);
  const [installationLongitude, setInstallationLongitude] = useState<number | null>(null);
  const [installationMapAddress, setInstallationMapAddress] = useState("");
  const [installationNotes, setInstallationNotes] = useState("");

  // Form submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const cartTotal = getTotalPrice();
  
  // Locale routing helper
  const getLocalizedPath = (path: string) => {
    const trimmed = path.trim();
    if (trimmed.startsWith(`/${locale}/`) || trimmed === `/${locale}`) return trimmed;
    if (trimmed.startsWith("/")) return `/${locale}${trimmed}`;
    return `/${locale}/${trimmed.replace(/^\/+/, "")}`;
  };

  // Rehydrate store on mount
  useEffect(() => {
    if (!hasHydrated) {
      void useCartStore.persist.rehydrate();
    }
  }, [hasHydrated]);

  useEffect(() => {
    if (!hasHydrated) return;
    void trackProductEvent("checkout_started", {
      item_count: items.length,
      quantity_total: items.reduce((totalQuantity, item) => totalQuantity + item.quantity, 0),
      checkout_type: "quote",
    });
  }, [hasHydrated]);

  // Retrieve user defaults if logged in
  useEffect(() => {
    let active = true;
    getQuotationProfileDefaults().then((result) => {
      if (!active || !result.defaults) return;
      setName((current) => current || result.defaults.fullLegalName);
      setEmail((current) => current || result.defaults.email);
      setPhone((current) => current || result.defaults.contactPhoneNumber);
      setAddressStreet((current) => current || result.defaults.primaryAddress);
    });

    return () => {
      active = false;
    };
  }, []);

  const fullAddress = [
    addressStreet,
    addressSubdistrict,
    addressDistrict,
    addressProvince,
    addressZip,
  ]
    .filter(Boolean)
    .join(", ");

  const requiredFieldsFilled = !!(
    name &&
    email &&
    phone &&
    addressStreet &&
    addressProvince &&
    addressDistrict &&
    addressSubdistrict &&
    addressZip
  );

  const handleFormSubmit = async () => {
    if (!requiredFieldsFilled) {
      setErrorMsg(t("errors.requiredFields"));
      toast.error(t("errors.requiredFields"));
      return;
    }

    if (!pdpaConsent) {
      setErrorMsg(t("errors.pdpaRequired"));
      toast.error(t("errors.pdpaRequired"));
      return;
    }

    // Determine the signature method based on selection
    const method = requiresInstallation 
      ? "EVALUATION" 
      : signatureBase64 
        ? "DIGITAL" 
        : "MANUAL";

    if (method === "DIGITAL" && !signatureBase64) {
      setErrorMsg(t("errors.signatureRequired"));
      toast.error(t("errors.signatureRequired"));
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const mappedItems = items.map((item) => ({
      categoryName: item.product.category.name,
      productName: item.product.name,
      quantity: item.quantity,
      unitPrice: item.product.price,
      totalPrice: item.product.price * item.quantity,
      productId: item.product.id,
    }));

    try {
      const res = await submitLeadData({
        name,
        taxId: taxId || undefined,
        email,
        phone,
        location: fullAddress,
        items: mappedItems,
        totalPrice: cartTotal,
        signatureBase64: method === "DIGITAL" ? signatureBase64 : undefined,
        signMethod: method,
        requiresInstallation,
        fulfillmentType: requiresInstallation ? "INSTALLATION" : "SUPPLY_ONLY",
        latitude: installationLatitude || undefined,
        longitude: installationLongitude || undefined,
        notes: requiresInstallation ? installationNotes : undefined,
      });

      if (res.error) {
        setErrorMsg(res.error);
        toast.error(res.error);
        setIsSubmitting(false);
        return;
      }

      const activeProposalId = res.proposalId;
      void trackProductEvent("checkout_submitted", {
        item_count: items.length,
        fulfillment_type: requiresInstallation ? "installation" : "supply_only",
      });
      if (activeProposalId) {
        setSuccess(true);
        clearCart();
        
        // Custom 2-second timeout before redirecting to the Customer Portal
        setTimeout(() => {
          router.push(`/${locale}/proposals?activeId=${encodeURIComponent(activeProposalId)}`);
        }, 2000);
      } else {
        // Fallback if no proposal ID (e.g. guest evaluation request)
        setSuccess(true);
        clearCart();
        setTimeout(() => {
          router.push(`/${locale}/proposals`);
        }, 2000);
      }
    } catch (error) {
      console.error("[CHECKOUT QUOTE] Submission failed:", error);
      setErrorMsg(t("errors.saveFailed"));
      toast.error(t("errors.saveFailed"));
      setIsSubmitting(false);
    }
  };

  const inputCls = cn(
    "w-full px-5 py-4 bg-slate-50 border border-transparent focus:bg-white focus:ring-2 focus:ring-[#B7D1EA] focus:outline-none transition-all rounded-2xl text-sm font-semibold text-slate-800 placeholder:text-slate-500"
  );

  // Render loading state before hydration
  if (!hasHydrated) {
    return (
      <div data-bagui="checkout-quote" className="flex min-h-dvh w-full items-center justify-center bg-background px-4">
        <DynamicSoliaChat type="loading_calc" pose="/solia-thinking.webp" />
      </div>
    );
  }

  return (
    <div data-bagui="checkout-quote" className="min-h-dvh w-full bg-background text-foreground">
      <div className="grid min-h-dvh grid-cols-1 lg:grid-cols-12">
        
        {/* Left Side: Visual Summary (span 5) */}
        <div className="relative flex flex-col justify-between overflow-hidden bg-[#B7D1EA]/20 p-5 sm:p-8 lg:col-span-5 lg:p-16">
          {/* Top navigation back link */}
          <div className="mb-8">
            <SmartBackButton
              fallbackHref={getLocalizedPath("/cart")}
              label="Back to Cart"
            />
          </div>

          {/* Central System Illustration and Details */}
          <div className="space-y-8 my-auto">
            
            {/* Animated Proposal Generation Illustration */}
            <div className="relative py-4">
              <GsapFloat className="relative mx-auto flex h-36 w-36 items-center justify-center overflow-hidden rounded-3xl bg-white/75 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.45)] backdrop-blur-md sm:h-48 sm:w-48 sm:rounded-[3rem]">
                <div className="absolute inset-0 bg-gradient-to-tr from-[#B7D1EA]/10 to-transparent" />
                
                {/* Sun burst rotating slowly in the background */}
                <GsapSpin className="absolute h-36 w-36 text-[#B7D1EA]/30 opacity-60">
                  <svg
                  className="absolute w-36 h-36 text-[#B7D1EA]/30 opacity-60"
                  viewBox="0 0 100 100"
                >
                  <circle cx="50" cy="50" r="15" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="4 6" />
                  <path d="M50 5 L50 25 M50 75 L50 95 M5 50 L25 50 M75 50 L95 50 M18 18 L32 32 M68 68 L82 82 M82 18 L68 32 M32 68 L18 82" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </GsapSpin>

                {/* Animated Floating Document */}
                <GsapWobble className="relative z-10 w-20 h-24 bg-white rounded-2xl border border-slate-200 shadow-lg p-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#B7D1EA]" />
                    <div className="w-6 h-1.5 bg-slate-200 rounded-full" />
                  </div>
                  <div className="space-y-1.5 py-2">
                    <div className="w-full h-1 bg-slate-100 rounded" />
                    <div className="w-4/5 h-1 bg-slate-100 rounded" />
                    <div className="w-2/3 h-1 bg-slate-100 rounded" />
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
                    <div className="w-8 h-2 bg-[#B7D1EA] rounded-full" />
                    <div className="w-3.5 h-3.5 rounded-full bg-[#0F172A] flex items-center justify-center text-white text-[8px] font-black">✓</div>
                  </div>
                </GsapWobble>
              </GsapFloat>
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <span className="text-[10px] font-black uppercase text-slate-600 tracking-[0.16em] block">
                {t("summary.badge")}
              </span>
              <h2 className="text-2xl font-black text-[#0F172A] tracking-tight leading-snug">
                Your Custom Solar Blueprint
              </h2>
              <p className="text-sm leading-6 text-slate-700 max-w-sm">
                A polished summary of the components selected for your official proposal.
              </p>
            </div>

            {/* List of Cart Items */}
            {items.length === 0 ? (
              <div className="p-4 bg-white/55 rounded-3xl text-center text-xs text-slate-600">
                No items selected. Return to the catalog to choose components.
              </div>
            ) : (
              <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-2">
                {items.map((item) => (
                  <div 
                    key={item.product.id} 
                    className="flex items-center gap-4 p-3 bg-white/55 rounded-2xl"
                  >
                    <div className="relative w-12 h-12 overflow-hidden rounded-xl border border-slate-200 bg-white shrink-0">
                      {item.product.imageUrl ? (
                        <ProgressiveImage
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-slate-400 font-bold bg-slate-50">
                          {tCart("item.noImage")}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-[#B7D1EA] uppercase tracking-wider">
                        {item.product.category?.name || tCart("item.defaultCategory")}
                      </p>
                      <h4 className="text-xs font-bold text-[#0F172A] truncate">{item.product.name}</h4>
                      <p className="text-[10px] text-slate-600 font-medium">x{item.quantity}</p>
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-800 shrink-0">
                      {formatPrice(item.product.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing Summary Footer */}
          <div className="border-t border-slate-200/50 pt-6 mt-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  {t("summary.grandTotal")}
                </p>
                <p className="text-[9px] text-slate-500 font-semibold uppercase mt-0.5">
                  {t("summary.taxIncluded")}
                </p>
              </div>
              <p className="text-2xl font-black text-[#0F172A] leading-none">
                {formatPrice(cartTotal)}
              </p>
            </div>
          </div>
        </div>

        {/* Right Side: Conversational Form (span 7) */}
        <div className="lg:col-span-7 p-8 lg:p-16 overflow-y-auto flex flex-col justify-start relative bg-[#F0EEE9]">
          <div className="w-full max-w-2xl mx-auto">
            
            {success ? (
                /* Success checkmark drawing animation state (2 seconds) */
                <GsapStatePanel
                  key="success-container"
                  className="flex flex-col items-center justify-center min-h-[68vh] text-center space-y-7 bg-white/55 rounded-[2rem] px-6 py-16"
                >
                  <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center shadow-[0_18px_36px_-26px_rgba(16,185,129,0.9)] relative overflow-hidden">
                    <GsapPulse className="absolute inset-0 bg-emerald-500/5" scale={1.02}>
                      <span />
                    </GsapPulse>
                    <GsapCheckmark />
                  </div>
                  
                  <GsapRevealBlock delay={0.8} className="space-y-2">
                    <h3 className="text-2xl font-black text-[#0F172A] tracking-tight">
                      Quotation Generated
                    </h3>
                    <p className="text-sm text-slate-600 font-semibold leading-relaxed max-w-sm mx-auto">
                      Your proposal document is ready. Opening your customer portal now.
                    </p>
                  </GsapRevealBlock>
                </GsapStatePanel>
              ) : isSubmitting ? (
                <GsapStatePanel
                  key="submitting-container"
                  className="flex min-h-[68vh] flex-col items-center justify-center rounded-[2rem] bg-white/55 px-6 py-16 text-center"
                >
                  <DynamicSoliaChat type="loading_calc" pose="/solia-thinking.webp" />
                  <p className="mt-5 text-sm font-bold leading-6 text-[#0369a1]">
                    Solia is calculating your optimal roof geometry... Please wait.
                  </p>
                </GsapStatePanel>
              ) : (
                /* Main Form State */
                <GsapStatePanel
                  key="form-container"
                >
                  {/* Header info */}
                  <div className="mb-10">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/55 text-slate-700 text-[9px] uppercase tracking-widest font-black mb-3">
                      <FileText className="w-3.5 h-3.5 text-slate-600" />
                      <span>{t("form.badge")}</span>
                    </span>
                    <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight">
                      {t("form.title")}
                    </h1>
                    <p className="text-sm text-slate-600 font-semibold leading-6 mt-2 max-w-xl">
                      {t("form.description")}
                    </p>
                  </div>

                  <form
                    onSubmit={(e) => e.preventDefault()}
                    data-analytics-form="catalog_quote_checkout"
                    data-analytics-submit-event="checkout_submitted"
                    className="flex flex-col gap-10"
                  >
                    {errorMsg && (
                      <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl px-5 py-4.5 text-xs font-semibold">
                        {errorMsg}
                      </div>
                    )}

                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">1</span>
                        <h3 className="text-base font-black text-[#0F172A] tracking-tight">Contact Info</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {/* Name Input */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-slate-400" />
                            {t("form.nameLabel")}
                            <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder={t("form.namePlaceholder")}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className={inputCls}
                          />
                        </div>

                        {/* Email + Phone side by side */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                              <Mail className="w-3.5 h-3.5 text-slate-400" /> 
                              {t("form.emailLabel")}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="email"
                              required
                              placeholder="somchai@gmail.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                              <Phone className="w-3.5 h-3.5 text-slate-400" /> 
                              {t("form.phoneLabel")}
                              <span className="text-rose-500">*</span>
                            </label>
                            <input
                              type="tel"
                              required
                              placeholder="0812345678"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className={inputCls}
                            />
                          </div>
                        </div>

                        {/* Tax ID */}
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2">
                            <FileText className="w-3.5 h-3.5 text-slate-400" />
                            {t("form.taxIdLabel")}
                            <span className="text-slate-400 text-[10px] font-medium lowercase">
                              {t("form.taxIdOptional")}
                            </span>
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. 0105562000000"
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            maxLength={13}
                            className={inputCls}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">2</span>
                        <h3 className="text-base font-black text-[#0F172A] tracking-tight">Project Location</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <ThaiPostalAddressFields
                          postalCode={addressZip}
                          province={addressProvince}
                          district={addressDistrict}
                          subdistrict={addressSubdistrict}
                          addressDetails={addressStreet}
                          onPostalCodeChange={setAddressZip}
                          onProvinceChange={setAddressProvince}
                          onDistrictChange={setAddressDistrict}
                          onSubdistrictChange={setAddressSubdistrict}
                          onAddressDetailsChange={setAddressStreet}
                          inputClassName={inputCls}
                          labelClassName="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-2"
                        />
                      </div>
                    </div>

                    <div className="space-y-5">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-[#0F172A] text-white flex items-center justify-center text-xs font-bold">3</span>
                        <h3 className="text-base font-black text-[#0F172A] tracking-tight">Installation Timeline</h3>
                      </div>
                      
                      <div className="space-y-6">
                        {/* Scope select */}
                        <div className="rounded-3xl bg-white/60 p-6 space-y-4">
                          <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                            <Compass className="w-4 h-4 text-slate-500" />
                            {t("installation.title")}
                            <span className="text-rose-500">*</span>
                          </label>
                          <p className="text-xs leading-relaxed text-slate-500 font-semibold">
                            {t("installation.description")}
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                            {[
                              {
                                value: false,
                                label: t("installation.purchaseOnly"),
                                hint: t("installation.purchaseOnlyHint"),
                              },
                              {
                                value: true,
                                label: t("installation.purchaseInstallation"),
                                hint: t("installation.purchaseInstallationHint"),
                              },
                            ].map((option) => {
                              const selected = requiresInstallation === option.value;
                              return (
                                <button
                                  key={option.hint}
                                  type="button"
                                  onClick={() => {
                                    setRequiresInstallation(option.value);
                                    if (option.value) {
                                      setSignatureBase64("");
                                    }
                                  }}
                                  className={cn(
                                    "p-4 text-left transition-all focus:outline-none cursor-pointer rounded-2xl flex flex-col justify-between",
                                    selected
                                      ? "bg-[#B7D1EA]/20 text-[#0F172A] shadow-sm ring-2 ring-[#B7D1EA]"
                                      : "bg-white hover:bg-slate-50 text-slate-600",
                                  )}
                                >
                                  <span className="block text-xs font-black">
                                    {option.label}
                                  </span>
                                  <span
                                    className={cn(
                                      "mt-1.5 block text-[9px] font-black uppercase tracking-wider",
                                      selected ? "text-slate-950" : "text-slate-400"
                                    )}
                                  >
                                    {option.hint}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Interactive conditional sub-components (Map or Signature) */}
                        <div className="space-y-4">
                          {requiresInstallation ? (
                            <GsapRevealBlock
                              className="rounded-3xl bg-white p-6 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.45)]"
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <MapPin className="w-4.5 h-4.5 text-[#B7D1EA]" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                  Mark Roof Coordinates
                                </h4>
                              </div>
                              <InstallationMapPicker
                                latitude={installationLatitude}
                                longitude={installationLongitude}
                                address={installationMapAddress}
                                notes={installationNotes}
                                onChange={({ latitude, longitude, address }) => {
                                  setInstallationLatitude(latitude);
                                  setInstallationLongitude(longitude);
                                  setInstallationMapAddress(address);
                                }}
                                onNotesChange={setInstallationNotes}
                              />
                            </GsapRevealBlock>
                          ) : (
                            <GsapRevealBlock
                              className="rounded-3xl bg-white p-6 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.45)]"
                            >
                              <div className="flex items-center gap-2 mb-4">
                                <FileSignature className="w-4.5 h-4.5 text-[#B7D1EA]" />
                                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                                  Electronic Signature
                                </h4>
                              </div>
                              <DigitalSignaturePad
                                required
                                label={t("form.signatureLabel")}
                                onSign={(sig) => setSignatureBase64(sig)}
                              />
                            </GsapRevealBlock>
                          )}
                        </div>

                        {/* Consent Checkbox */}
                        <div className="pt-2">
                          <label className="flex items-start gap-3.5 cursor-pointer group">
                            <div className="mt-0.5 shrink-0">
                              <input
                                type="checkbox"
                                checked={pdpaConsent}
                                onChange={(e) => setPdpaConsent(e.target.checked)}
                                className="sr-only"
                              />
                              <div
                                className={cn(
                                  "w-5.5 h-5.5 rounded-lg border-2 flex items-center justify-center transition-all",
                                  pdpaConsent
                                    ? "bg-[#0F172A] border-[#0F172A]"
                                    : "bg-white border-slate-300 group-hover:border-slate-400",
                                )}
                              >
                                {pdpaConsent && (
                                  <svg
                                    className="w-3.5 h-3.5 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3.5}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                )}
                              </div>
                            </div>
                            <span className="text-xs font-semibold text-slate-500 group-hover:text-slate-700 leading-relaxed transition-colors">
                              {t("form.pdpaConsent")}
                              <span className="text-rose-500 ml-0.5">*</span>
                            </span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Submit Button Section */}
                    <div className="pt-6 border-t border-slate-200/50">
                      <MagneticButton className="w-full p-0 -m-0" range={90} strength={0.22}>
                        <button
                          type="button"
                          disabled={isSubmitting || !pdpaConsent || !requiredFieldsFilled}
                          onClick={handleFormSubmit}
                          className="w-full min-h-14 px-6 py-4 bg-[#0F172A] hover:bg-[#1E293B] text-white font-bold text-xs uppercase tracking-widest rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 shadow-[0_18px_30px_-22px_rgba(15,23,42,0.8)] disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <ClipboardCheck className="w-4.5 h-4.5 text-white" />
                          <span>Generate Official Quote</span>
                        </button>
                      </MagneticButton>
                      
                      <p className="text-[10px] text-center text-slate-400 mt-3 font-semibold">
                        By submitting this request, your specifications will be stored in our proposal registry.
                      </p>
                    </div>

                  </form>
                </GsapStatePanel>
              )}

          </div>
        </div>

      </div>
    </div>
  );
}

function GsapFloat({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const context = gsap.context(() => {
      gsap.to(element, {
        y: -8,
        duration: 2.5,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, element);

    return () => context.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function GsapSpin({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const context = gsap.context(() => {
      gsap.to(element, {
        rotate: 360,
        duration: 35,
        repeat: -1,
        ease: "none",
      });
    }, element);

    return () => context.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function GsapWobble({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const context = gsap.context(() => {
      gsap.to(element, {
        rotate: 2,
        duration: 2,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }, element);

    return () => context.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function GsapStatePanel({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(element, { autoAlpha: 1, scale: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 10, scale: 0.98 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.34, ease: "power3.out" },
      );
    }, element);

    return () => context.revert();
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function GsapRevealBlock({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      gsap.set(element, { autoAlpha: 1, y: 0 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        element,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, delay, duration: 0.32, ease: "power2.out" },
      );
    }, element);

    return () => context.revert();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

function GsapCheckmark() {
  const circleRef = useRef<SVGCircleElement | null>(null);
  const pathRef = useRef<SVGPathElement | null>(null);

  useEffect(() => {
    const circle = circleRef.current;
    const path = pathRef.current;
    if (!circle || !path) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const elements = [circle, path];
    elements.forEach((element) => {
      const length = element.getTotalLength();
      gsap.set(element, {
        strokeDasharray: length,
        strokeDashoffset: prefersReducedMotion ? 0 : length,
      });
    });

    if (prefersReducedMotion) return;

    const context = gsap.context(() => {
      gsap.timeline()
        .to(circle, { strokeDashoffset: 0, duration: 0.6, ease: "power2.out" })
        .to(path, { strokeDashoffset: 0, duration: 0.5, ease: "power2.inOut" }, "-=0.12");
    });

    return () => context.revert();
  }, []);

  return (
    <svg className="z-10 h-12 w-12 text-emerald-500" viewBox="0 0 52 52" fill="none">
      <circle ref={circleRef} cx="26" cy="26" r="23" stroke="#10B981" strokeWidth="3.5" />
      <path
        ref={pathRef}
        d="M16 27l7 7 14-14"
        stroke="#10B981"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
